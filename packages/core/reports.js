// Read-only report engine migrated from the reviewed preview; never transacts.
import { sha256 } from './digest.js';
import { recordText, journalText } from './records.js';
import { addDays, validDate, hongKong, DIMENSIONS, LABELS } from './index.js';
import { feedbackGroups } from './weekly-feedback.js';
import { reminderCopy } from './reminder-copy.js';

export const DESIGN_VERSION = 'weekly.1';
const mean = values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
const inRange = (date, start, end) => date >= start && date <= end;
const hash = text => sha256(text);
const stable = value => value === null || typeof value !== 'object' ? JSON.stringify(value)
  : Array.isArray(value) ? `[${value.map(stable).join(',')}]`
    : `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;

export function mondayFor(date) {
  validDate(date);
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  return addDays(date, -((weekday + 6) % 7));
}

export function previousWeek(now) {
  const start = addDays(mondayFor(hongKong(now).date), -7);
  return { start, end: addDays(start, 6) };
}

function star(record) {
  if (record === undefined || record === null) return null;
  if (!Number.isInteger(record.stars) || record.stars < 0 || record.stars > 5) throw Error('评分必须为0～5整数');
  return record.stars;
}

function select(list, seed, previousId = '') {
  if (!list?.length) throw Error('缺少适用评价模板');
  const index = Number.parseInt(hash(seed).slice(0, 8), 16) % list.length;
  const candidate = list[index];
  return candidate.id === previousId && list.length > 1 ? list[(index + 1) % list.length] : candidate;
}

function choices(list, prefix) { return list.map((text, i) => ({ id: `${prefix}.${i + 1}`, text })); }

export function summarizeWeek(state, start) {
  validDate(start);
  if (mondayFor(start) !== start) throw Error('周报起始日必须为周一');
  const end = addDays(start, 6);
  const dates = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const dimensions = Object.fromEntries(DIMENSIONS.map(dimension => {
    const values = [], pairs = [];
    for (const date of dates) {
      const current = star(state.ratings?.[date]?.[dimension]);
      const prior = star(state.ratings?.[addDays(date, -7)]?.[dimension]);
      if (current !== null) values.push(current);
      if (current !== null && prior !== null) pairs.push({ date, current, prior });
    }
    const currentMean = mean(values), pairedCurrent = mean(pairs.map(p => p.current)), pairedPrior = mean(pairs.map(p => p.prior));
    const delta = pairs.length >= 4 ? pairedCurrent - pairedPrior : null;
    const stateName = values.length < 4 ? 'sparse' : delta !== null && delta >= .5 ? 'rising'
      : delta !== null && delta <= -.5 ? 'falling' : currentMean >= 4 ? 'high' : 'steady';
    return [dimension, { dimension, label: LABELS[dimension], count: values.length, mean: currentMean,
      min: values.length ? Math.min(...values) : null, max: values.length ? Math.max(...values) : null,
      zeroDays: values.filter(n => n === 0).length, pairs: pairs.length, delta, state: stateName,
      evidence: { recordedDates: dates.filter(date => star(state.ratings?.[date]?.[dimension]) !== null), pairedDates: pairs.map(p => p.date) } }];
  }));
  const taskEntries = Object.values(state.tasks ?? {}).filter(task => !task.deleted);
  const days = dates.map(date => {
    const scores = Object.fromEntries(DIMENSIONS.map(d => [d, star(state.ratings?.[date]?.[d])]));
    const notes = Object.fromEntries(DIMENSIONS.map(d => [d, recordText(state, date, d)]));
    // Retired overall stars are deliberately not used. Existing journal text survives.
    const journal = journalText(state,date);
    const progress = taskEntries.flatMap(task => (task.progress ?? []).filter(p => p.active && p.date === date)
      .map(p => ({ id: p.id, taskId: task.id, title: task.title, note: p.note ?? '', date: p.date })));
    const completed = taskEntries.filter(task => task.completion?.active && task.completion.date === date)
      .map(task => ({ taskId: task.id, title: task.title, note: task.completion.note ?? '', date }));
    return { date, scores, notes, journal, progress, completed };
  });
  const recordedDays = days.filter(day => DIMENSIONS.some(d => day.scores[d] !== null)).length;
  const completeDays = days.filter(day => DIMENSIONS.every(d => day.scores[d] !== null)).length;
  const ratedCount = Object.values(dimensions).reduce((n, d) => n + d.count, 0);
  const sufficient = Object.values(dimensions).every(d => d.count >= 4);
  const rising = Object.values(dimensions).filter(d => d.state === 'rising').length;
  const falling = Object.values(dimensions).filter(d => d.state === 'falling').length;
  const means = Object.values(dimensions).map(d => d.mean).filter(n => n !== null);
  const spread = means.length ? Math.max(...means) - Math.min(...means) : null;
  const overallState = ratedCount === 0 ? 'empty' : !sufficient ? 'sparse'
    : rising >= 2 && falling === 0 ? 'rising' : falling >= 2 && rising === 0 ? 'falling'
      : rising > 0 && falling > 0 || spread >= 1.5 ? 'uneven' : 'steady';
  const quality = ratedCount === 0 ? 'empty' : !sufficient ? 'sparse'
    : Object.values(dimensions).every(d => d.pairs >= 4) ? 'sufficient' : 'unpaired';
  const validLedger = (state.ledger ?? []).filter(e => e.active && inRange(e.date, start, end));
  return { start, end, dimensions, days, recordedDays, completeDays, ratedCount, capacity: 28,
    journalDays: days.filter(d => d.journal.trim()).length, overallState, quality,
    taskProgress: days.reduce((n, d) => n + d.progress.length, 0), completedTasks: days.reduce((n, d) => n + d.completed.length, 0),
    createdTasks: taskEntries.filter(t => t.createdAt && inRange(hongKong(t.createdAt).date, start, end)).length,
    effectiveXPUnits: validLedger.reduce((sum, e) => sum + e.actual, 0) };
}

export function buildWeeklyReport(state, start, { accountScope = 'guest', previousTemplateIds = [], generatedAt = null } = {}) {
  const summary = summarizeWeek(state, start), oldIds = new Set(previousTemplateIds);
  const used = [], choose = (list, prefix, seed) => {
    const pool = choices(list, prefix), filtered = pool.filter(row => !oldIds.has(row.id));
    const selected = select(filtered.length ? filtered : pool, `${accountScope}/${start}/${seed}`);
    used.push(selected.id); return selected;
  };
  const overall = choose(feedbackGroups.overall[summary.overallState], `overall.${summary.overallState}`, 'overall');
  const quality = choose(feedbackGroups.quality[summary.quality], `quality.${summary.quality}`, 'quality');
  const sections = DIMENSIONS.map(d => {
    const data = summary.dimensions[d], name = data.state;
    return { ...data, assessment: choose(feedbackGroups.dimension[d][name], `dimension.${d}.${name}`, d+'/assessment'),
      advice: choose(feedbackGroups.advice[d][name], `advice.${d}.${name}`, d+'/advice') };
  });
  const closingState = ['empty', 'sparse'].includes(summary.overallState) ? 'restart'
    : summary.overallState === 'falling' ? 'protect' : summary.overallState === 'uneven' ? 'adjust' : 'continue';
  const closing = choose(feedbackGroups.closing[closingState], `closing.${closingState}`, 'closing');
  const fingerprint = hash(stable({ version: DESIGN_VERSION, summary }));
  const priorities = { sparse: 0, falling: 1, steady: 2, high: 3, rising: 4 };
  const nextSteps = [...sections].sort((a,b)=>priorities[a.state]-priorities[b.state])
    .slice(0,2).map(section=>({ dimension:section.dimension, label:section.label, reason:section.state, advice:section.advice }));
  return { version: DESIGN_VERSION, key: `${accountScope}/${start}`, generatedAt, fingerprint,
    ...summary, overall, qualityText: quality, sections, nextSteps, closing, templateIds: used };
}

// Copy rotation is global across morning/follow-up slots on this installation.
// Caller commits nextState only with the notification receipt; this function is pure.
export function takeReminder(previous = null, seed = 'design-installation') {
  const allowed = new Set(reminderCopy.map(row => row.id));
  let cycle = previous?.cycle ?? 0;
  let remaining = (previous?.remaining ?? []).filter(id => allowed.has(id));
  if (new Set(remaining).size !== remaining.length) throw Error('提醒轮换队列重复');
  if (!remaining.length) {
    if (previous) cycle++;
    remaining = [...allowed].sort((a, b) => hash(`${seed}/${cycle}/${a}`).localeCompare(hash(`${seed}/${cycle}/${b}`)));
    if (remaining[0] === previous?.lastId) remaining.push(remaining.shift());
  }
  const id = remaining.shift();
  return { copy: reminderCopy.find(row => row.id === id), nextState: { cycle, remaining, lastId: id } };
}

export function reminderDecision({ now, notificationsAllowed = true, enabled = true, dailyEnabled = true,
  followupEnabled = true, weeklyEnabled = true, accountScope = 'guest',
  hasTodayBusinessUpdate = false, sent = [] }) {
  const hk = hongKong(now), minute = Number(new Date(Date.parse(now) + 8*3600000).toISOString().slice(14, 16));
  if (!enabled || !notificationsAllowed || ![10, 11].includes(hk.hour) || minute > 15) return null;
  const monday = mondayFor(hk.date) === hk.date;
  const slot = hk.hour === 10 ? 'morning' : 'followup';
  const key = `${accountScope}/${hk.date}/${slot}`;
  const weekly = slot === 'morning' && monday && weeklyEnabled;
  if (sent.includes(key) || slot === 'followup' && (!dailyEnabled || !followupEnabled || hasTodayBusinessUpdate)
    || slot === 'morning' && !dailyEnabled && !weekly) return null;
  return { key, date: hk.date, slot, kind: weekly ? dailyEnabled ? 'weekly-and-daily' : 'weekly' : 'daily',
    weeklyStart: slot === 'morning' && monday && weeklyEnabled ? previousWeek(now).start : null,
    route: slot === 'morning' && monday && weeklyEnabled ? 'weekly-report' : 'today' };
}
