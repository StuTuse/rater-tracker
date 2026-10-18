import { changeRecord, recordText, markBusinessUpdate } from './records.js';
// Rules v1.3. Amounts are integer micro-XP; every allocation rounds half-up once.
export const RULE_VERSION = '1.3';
export const FORMAT_VERSION = 1;
export const SCALE = 1_000_000;
export const DIMENSIONS = ['study', 'work', 'health', 'life'];
export const LABELS = { study: '学习', work: '作品', health: '健康', life: '生活' };
export const TIERS = [
  { id: 'short', name: '短任务', max: 7, rate: 10, months: 1, step: 5, cap: 130 },
  { id: 'medium', name: '中任务', max: 30, rate: 5, months: 2, step: 8, cap: 140 },
  { id: 'long', name: '长任务', max: 90, rate: 2.5, months: 3, step: 10, cap: 150 },
  { id: 'extended', name: '超长任务', max: Infinity, rate: 1, months: 6, step: 15, cap: 160 }
];
export const xp = units => units / SCALE;
export function mul(units, numerator, denominator = 100) {
  const n = BigInt(units) * BigInt(numerator), d = BigInt(denominator);
  return Number((n + d / 2n) / d);
}
export function hongKong(now = new Date().toISOString()) {
  const ms = Date.parse(now);
  if (!Number.isFinite(ms)) throw new Error('记录时间无效');
  const s = new Date(ms + 8 * 3600000).toISOString();
  return { date: s.slice(0, 10), hour: Number(s.slice(11, 13)) };
}
export function validDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('日期格式无效');
  const ms = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 10) !== date || date < '1900-01-01' || date > '9999-12-31') throw new Error('日期无效');
  return date;
}
export const daysBetween = (from, to) => (Date.parse(`${validDate(to)}T00:00:00Z`) - Date.parse(`${validDate(from)}T00:00:00Z`)) / 86400000;
export function addDays(date, days) { return new Date(Date.parse(`${validDate(date)}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10); }
export function factor(date, now, rating = false) {
  const hk = hongKong(now), d = daysBetween(date, hk.date);
  if (d < 0) throw new Error('不能记录未来日期');
  if (d === 0 || (rating && d === 1 && hk.hour < 4)) return { numerator: 1, denominator: 1, delay: 0 };
  return { numerator: 5, denominator: d + 9, delay: d };
}
export function taskPlan(task) {
  const days = Math.max(1, daysBetween(task.start, task.target));
  if (task.target < task.start) throw new Error('原目标日期不能早于开始日期');
  const tier = TIERS.find(t => days <= t.max);
  const importance = { normal: 100, important: 150, core: 200 }[task.importance];
  if (!importance) throw new Error('重要性无效');
  const e = mul((30 + 5 * (Math.min(days, 365) - 1)) * SCALE, importance * 130, 10000);
  return { days, e, tier: tier.id, importance: task.importance, start: task.start, target: task.target, rule: RULE_VERSION };
}
export function windowFor(date, tierId) {
  validDate(date);
  const tier = TIERS.find(t => t.id === tierId);
  if (!tier) throw new Error('任务量级无效');
  const year = Number(date.slice(0, 4)), month = Number(date.slice(5, 7));
  const startMonth = Math.floor((month - 1) / tier.months) * tier.months + 1;
  const end = new Date(Date.UTC(year, startMonth - 1 + tier.months, 1)).toISOString().slice(0, 10);
  return { key: `${year}-${String(startMonth).padStart(2, '0')}/${tier.id}`, start: `${year}-${String(startMonth).padStart(2, '0')}-01`, end };
}
export function createState() {
  return { format: FORMAT_VERSION, rule: RULE_VERSION, revision: 0, sequence: 0, ratings: {}, tasks: {}, ledger: [], processed: [], settings: { motion: 'full', references: Object.fromEntries(DIMENSIONS.map(d => [d, '0 星：没有投入；1–2 星：部分投入；3 星：达到合理目标；4–5 星：超出预期。'])), lastExport: null } };
}
const text = (value, max = 4000) => String(value ?? '').trim().slice(0, max);
const assert = (condition, message) => { if (!condition) throw new Error(message); };
function allocate(state, id, owner, kind, date, now, normal, f, extra = {}) {
  assert(Number.isSafeInteger(normal) && normal >= 0, '奖励额度无效');
  const entry = { id, owner, kind, date, recordedAt: now, normal, factor: f, actual: mul(normal, f.numerator, f.denominator), active: true, rule: RULE_VERSION, sequence: ++state.sequence, ...extra };
  state.ledger.push(entry);
  return id;
}
const entryById = (state, id) => state.ledger.find(e => e.id === id);
function cancel(state, id, now) { const e = entryById(state, id); if (e?.active) { e.active = false; e.cancelledAt = now; } }
const validProgress = task => task.progress.filter(p => p.active);
export const progressDays = (task, date) => [...new Set(validProgress(task).filter(p => p.date < date).map(p => p.date))].length;
export function allocatedProgress(state, task) { return task.progress.reduce((sum, p) => sum + (p.retained ? entryById(state, p.entry)?.normal ?? 0 : 0), 0); }
export function completionCount(state, tier, window, except) { return Object.values(state.tasks).filter(t => !t.deleted && t.id !== except && t.completion?.active && t.frozen.tier === tier && t.completion.window === window).length; }
export function nextCoefficient(state, tierId, date, except) {
  const tier = TIERS.find(t => t.id === tierId), w = windowFor(date, tierId);
  const count = completionCount(state, tierId, w.key, except);
  return { ...w, count, c: Math.min(tier.cap, 100 + count * tier.step) };
}
function syncSlices(state, task, now, f, opId) {
  const c = task.completion;
  if (!c?.active) return;
  const target = Math.min(10, progressDays(task, c.date));
  const live = c.slices.filter(id => entryById(state, id).active);
  if (target < live.length) live.slice(target).reverse().forEach(id => cancel(state, id, now));
  for (let i = live.length; i < target; i++) {
    const id = `${opId}:slice:${i}`;
    allocate(state, id, task.id, '持续奖励', c.date, now, mul(task.frozen.e, c.c * 2, 10000), f, { completion: c.id });
    c.slices.push(id);
  }
}
export function totalUnits(state) { return state.ledger.reduce((sum, e) => sum + (e.active ? e.actual : 0), 0); }
export function levelAt(units) {
  const total = xp(units);
  let level = 1, floor = 0, need = 30;
  while (level < 99 && total >= floor + need) { floor += need; level++; need = 30 + 5 * (level - 1); }
  if (total >= 27225) return { level: 'MAX', floor: 27225, need: 0, current: total - 27225, ratio: 1, total };
  return { level, floor, need, current: total - floor, ratio: (total - floor) / need, total };
}
export function stats(state) {
  const stars = Object.fromEntries(DIMENSIONS.map(d => [d, 0]));
  let recorded = 0, completeDays = 0;
  for (const day of Object.values(state.ratings)) {
    let count = 0;
    for (const d of DIMENSIONS) if (day[d]) { stars[d] += day[d].stars; count++; }
    if (count) recorded++;
    if (count === 4) completeDays++;
  }
  return { ...stars, stars: Object.values(stars).reduce((a, b) => a + b, 0), tasks: Object.values(state.tasks).filter(t => !t.deleted && t.completion?.active).length, recorded, completeDays };
}
export function estimate(state, task, date) {
  const plan = task.frozen ?? taskPlan(task), next = nextCoefficient(state, plan.tier, date, task.id);
  const p = Math.min(20, progressDays(task, date) * 2), total = mul(plan.e, next.c * (100 + p), 10000);
  return { ...plan, ...next, p, total, allocation: total - 2 * SCALE - allocatedProgress(state, task) };
}
// Pure transaction: caller persists the returned snapshot before any visible reward.
export function transact(original, action, now = new Date().toISOString()) {
  assert(typeof action.id === 'string' && /^[A-Za-z0-9:_/-]{1,300}$/.test(action.id) && !['__proto__', 'constructor', 'prototype'].includes(action.id), '操作缺少有效唯一标识');
  if (original.processed.includes(action.id)) return original;
  const state = structuredClone(original), today = hongKong(now).date;
  const date = action.date ?? today;
  let task;
  if (action.taskId) { task = state.tasks[action.taskId]; assert(task && !task.deleted, '任务不存在'); }
  const lock = () => { if (!task.frozen) task.frozen = taskPlan(task); };
  switch (action.type) {
    case 'rate': {
      const previousText = recordText(state, date, action.dimension);
      assert(DIMENSIONS.includes(action.dimension), '评分项目无效');
      assert(action.stars === null || Number.isInteger(action.stars) && action.stars >= 0 && action.stars <= 5, '请使用 0～5 整数星');
      const f = factor(date, now, true), d = action.dimension;
      const day = state.ratings[date] ??= {}, prev = day[d];
      if (action.stars === null) {
        if (prev) [prev.base, ...prev.batches].forEach(id => cancel(state, id, now));
        if (prev?.note) ((state.ratingNotes ??= {})[date] ??= {})[d] = { note: prev.note, updatedAt: now };
        delete day[d];
      } else {
        const rating = day[d] ??= { stars: 0, note: previousText, base: allocate(state, `${action.id}:base`, `${date}/${d}`, '评分基础', date, now, 5 * SCALE, f), batches: [] };
        while (rating.batches.length > action.stars) cancel(state, rating.batches.pop(), now);
        while (rating.batches.length < action.stars) {
          const id = `${action.id}:star:${rating.batches.length}`;
          allocate(state, id, `${date}/${d}`, '评分星数', date, now, 2 * SCALE, f);
          rating.batches.push(id);
        }
        rating.stars = action.stars;
        if (action.note !== undefined) { assert(typeof action.note==='string' && action.note.length<=4000,'记录最多4000个字符');rating.note=action.note; }
      }
      break;
    }
    case 'note': case 'journal': { changeRecord(state, action, now); break; }
    case 'clearProgress': {
      let next = original;
      for (const p of task.progress.filter(p => p.active)) next = transact(next, { type: 'deleteProgress', taskId: task.id, progressId: p.id, id: `${action.id}/${p.id}` }, now);
      if (next === original) return original;
      next.processed.push(action.id); return next;
    }
    case 'createTask': {
      assert(!state.tasks[action.id], '任务标识重复');
      const title = text(action.title, 160);
      assert(title, '请填写任务名称');
      const t = { id: action.id, title, goal: text(action.goal), dimension: DIMENSIONS.includes(action.dimension) ? action.dimension : '', start: validDate(action.start), target: validDate(action.target), deadline: validDate(action.target), importance: action.importance ?? 'normal', stages: text(action.stages).split('\n').map(s => s.trim()).filter(Boolean).map((name, i) => ({ id: `${action.id}:stage:${i}`, name, done: false })), progress: [], frozen: null, completion: null, archived: false, hidden: false, deleted: false, createdAt: now };
      taskPlan(t);
      t.creation = allocate(state, `${action.id}:create`, action.id, '创建任务', today, now, 2 * SCALE, factor(today, now));
      state.tasks[t.id] = t;
      break;
    }
    case 'editTask': {
      if (action.title !== undefined) { assert(text(action.title), '任务名称不能为空'); task.title = text(action.title, 160); }
      if (action.goal !== undefined) task.goal = text(action.goal);
      if (action.deadline !== undefined) { validDate(action.deadline); assert(action.deadline >= task.start, '截止日期不能早于开始日期'); task.deadline = action.deadline; }
      if (!task.frozen) {
        for (const field of ['start', 'target', 'importance']) if (action[field] !== undefined) task[field] = action[field];
        taskPlan(task);
      } else assert(!['start', 'target', 'importance'].some(field => action[field] !== undefined && action[field] !== task[field]), '首次推进后原计划与重要性已锁定');
      break;
    }
    case 'stage': {
      const stage = task.stages.find(s => s.id === action.stageId); assert(stage, '阶段不存在'); stage.done = !!action.done; break;
    }
    case 'progress': {
      assert(!task.archived, '请先恢复归档任务');
      const f = factor(date, now);
      assert(date >= task.start, '推进不能早于计划开始日期');
      const note = text(action.note); assert(note, '请描述本次不同的成果');
      assert(!validProgress(task).some(p => p.date === date && p.note === note), '同日相同成果已经记录');
      if (task.completion?.active) assert(date < task.completion.date, '已完成后只能补录完成日期之前的成果；新推进请先撤销完成');
      lock();
      const normal = task.completion?.active ? 0 : Math.min(mul(task.frozen.e, TIERS.find(t => t.id === task.frozen.tier).rate * 10, 1000), Math.max(0, mul(task.frozen.e, 50) - allocatedProgress(state, task)));
      const entry = allocate(state, `${action.id}:progress`, task.id, '推进任务', date, now, normal, f);
      task.progress.push({ id: action.id, date, note, recordedAt: now, entry, active: true, retained: true });
      syncSlices(state, task, now, f, action.id);
      break;
    }
    case 'deleteProgress': {
      const p = task.progress.find(p => p.id === action.progressId);
      assert(p?.active, '推进记录已删除');
      p.active = false;
      cancel(state, p.entry, now);
      if (!task.completion && p.date === today && hongKong(p.recordedAt).date === today) p.retained = false;
      syncSlices(state, task, now, factor(today, now), action.id);
      break;
    }
    case 'complete': {
      if (task.completion?.active) break;
      assert(!task.archived, '请先恢复归档任务');
      const f = factor(date, now);
      assert(date >= task.start, '完成不能早于计划开始日期');
      assert(validProgress(task).every(p => p.date <= date), '完成日期不能早于已有有效推进');
      lock();
      const old = task.completion;
      const restoring = old && old.undoneOn === today && old.date === date;
      const coefficient = restoring ? old.c : nextCoefficient(state, task.frozen.tier, date, task.id).c;
      const completion = { id: action.id, date, recordedAt: now, c: coefficient, window: windowFor(date, task.frozen.tier).key, active: true, base: null, slices: [], note: text(action.note), sequence: state.sequence + 1 };
      const completionFactor = restoring ? entryById(state, old.base).factor : f;
      const normal = mul(task.frozen.e, coefficient) - 2 * SCALE - allocatedProgress(state, task);
      completion.base = allocate(state, `${action.id}:complete`, task.id, '完成任务', date, now, normal, completionFactor, { completion: action.id, c: coefficient, window: completion.window });
      task.completionHistory ??= [];
      if (old) task.completionHistory.push(old);
      task.completion = completion;
      if (restoring) {
        // Original mixed-discount portions survive a same-day restoration; cancelled portions stay cancelled.
        const count = Math.min(10, progressDays(task, date));
        const restorable = old.slices.filter(id => entryById(state, id).undoCancelled).slice(0, count);
        for (const id of restorable) {
          const e = entryById(state, id), restoredId = `${action.id}:restore:${completion.slices.length}`;
          allocate(state, restoredId, task.id, '持续奖励恢复', date, now, e.normal, e.factor, { completion: action.id });
          completion.slices.push(restoredId);
        }
      }
      syncSlices(state, task, now, completionFactor, action.id);
      break;
    }
    case 'undoComplete': {
      const c = task.completion; assert(c?.active, '任务尚未完成');
      for (const id of [c.base, ...c.slices]) {
        const e = entryById(state, id);
        if (e.active) { e.undoCancelled = true; cancel(state, id, now); }
      }
      c.active = false; c.undoneOn = today; break;
    }
    case 'archive': assert(!task.completion?.active, '已完成任务请使用隐藏'); task.archived = true; break;
    case 'restore': task.archived = false; task.hidden = false; break;
    case 'hide': assert(task.completion?.active, '只有已完成任务可以隐藏'); task.hidden = true; break;
    case 'deleteTask': {
      state.ledger.filter(e => e.owner === task.id).forEach(e => cancel(state, e.id, now));
      task.deleted = true; if (task.completion) task.completion.active = false; break;
    }
    case 'settings': {
      if (action.motion) { assert(['full', 'gentle', 'off'].includes(action.motion), '动效设置无效'); state.settings.motion = action.motion; }
      if (action.references) for (const d of DIMENSIONS) if (action.references[d] !== undefined) state.settings.references[d] = text(action.references[d]);
      if (action.lastExport) state.settings.lastExport = now;
      break;
    }
    default: throw new Error('未知操作');
  }
  const changed = action.type==='note' ? recordText(original,date,action.dimension)!==recordText(state,date,action.dimension)
    : action.type==='journal' ? (original.dailyNotes?.[date]?.note??original.dailyReviews?.[date]?.note??'')!==action.note
    : action.type==='rate' ? JSON.stringify(original.ratings[date]?.[action.dimension])!==JSON.stringify(state.ratings[date]?.[action.dimension])
    : ['createTask','progress'].includes(action.type) || ['editTask','stage','complete'].includes(action.type) && JSON.stringify(original.tasks[action.taskId])!==JSON.stringify(state.tasks[action.taskId]);
  if (changed) markBusinessUpdate(state, ['createTask','editTask','stage'].includes(action.type) ? today : date, now);
  state.processed.push(action.id);
  state.revision++;
  return state;
}
