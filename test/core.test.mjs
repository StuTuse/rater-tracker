import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, transact, totalUnits, xp, SCALE, factor, taskPlan, windowFor, nextCoefficient, allocatedProgress, stats, levelAt, addDays } from '../src/core.js';
import { parseBackup, backupText, validateState } from '../src/storage.js';
import { BADGES } from '../src/badges.js';
const stamp = (date, time = '12:00') => `${date}T${time}:00+08:00`;
const setup = () => {
  let s = createState(), n = 0;
  return { get state() { return s; }, act(action, date = '2026-10-12', time) { s = transact(s, { id: `op-${++n}`, ...action }, stamp(date, time)); return s; } };
};
const create = (h, id = 't', start = '2026-10-01', target = '2026-10-15', importance = 'important', record = '2026-10-01') => h.act({ type: 'createTask', id, title: id, start, target, importance }, record);
const progress = (h, date, note = date, record = date, taskId = 't') => h.act({ type: 'progress', taskId, date, note }, record);
const complete = (h, date, record = date, taskId = 't') => h.act({ type: 'complete', taskId, date }, record);
const near = (units, value) => assert.ok(Math.abs(xp(units) - value) <= .000001, `${xp(units)} != ${value}`);

test('空白与 0 星不同，基础只发一次，清空撤回', () => {
  const h = setup(); assert.equal(stats(h.state).recorded, 0);
  h.act({ type: 'rate', dimension: 'study', stars: 0 });
  assert.equal(totalUnits(h.state), 5 * SCALE); assert.equal(stats(h.state).recorded, 1);
  h.act({ type: 'rate', dimension: 'study', stars: 0 }); assert.equal(totalUnits(h.state), 5 * SCALE);
  h.act({ type: 'rate', dimension: 'study', stars: null }); assert.equal(totalUnits(h.state), 0);
  assert.equal(stats(h.state).recorded, 0);
});
test('四项满星 60 XP、完整天数；当天 5 改 3 只扣 4', () => {
  const h = setup(); for (const dimension of ['study', 'work', 'health', 'life']) h.act({ type: 'rate', dimension, stars: 5 });
  assert.equal(totalUnits(h.state), 60 * SCALE); assert.equal(stats(h.state).completeDays, 1);
  h.act({ type: 'rate', dimension: 'study', stars: 3 }); assert.equal(totalUnits(h.state), 56 * SCALE);
});
test('历史增星批次折扣，减星 LIFO；文字不改变奖励；删后新补记重新打折', () => {
  const h = setup(); h.act({ type: 'rate', dimension: 'study', stars: 3 }, '2026-10-01');
  h.act({ type: 'rate', date: '2026-10-01', dimension: 'study', stars: 5 }, '2026-10-08'); near(totalUnits(h.state), 12.25);
  h.act({ type: 'rate', date: '2026-10-01', dimension: 'study', stars: 4 }, '2026-10-09'); near(totalUnits(h.state), 11.625);
  h.act({ type: 'note', date: '2026-10-01', dimension: 'study', note: '真实成果' }, '2026-10-10'); near(totalUnits(h.state), 11.625);
  h.act({ type: 'rate', date: '2026-10-01', dimension: 'study', stars: null }, '2026-10-10'); near(totalUnits(h.state), 0);
  h.act({ type: 'rate', date: '2026-10-01', dimension: 'study', stars: 0 }, '2026-10-11'); near(totalUnits(h.state), 1.315789);
});
test('03:59/04:00 香港评分宽限；任务自然日不适用', () => {
  assert.deepEqual(factor('2026-10-31', stamp('2026-11-01', '03:59'), true), { numerator: 1, denominator: 1, delay: 0 });
  assert.deepEqual(factor('2026-10-31', stamp('2026-11-01', '04:00'), true), { numerator: 5, denominator: 10, delay: 1 });
  assert.equal(factor('2026-10-31', stamp('2026-11-01', '02:00')).denominator, 10);
  const h = setup(); create(h, 't', '2026-10-31', '2026-11-01', 'normal', '2026-10-31');
  h.act({ type: 'complete', taskId: 't', date: '2026-11-01' }, '2026-11-01', '02:00');
  assert.equal(h.state.tasks.t.completion.window, '2026-11/short');
});
test('日期校验、未来记录、推进早于开始、阶段不发奖', () => {
  const h = setup(); create(h, 't', '2026-10-15', '2026-10-15', 'normal');
  assert.equal(totalUnits(h.state), 2 * SCALE);
  assert.throws(() => progress(h, '2026-10-16', '未来', '2026-10-12'), /未来/);
  assert.throws(() => progress(h, '2026-10-12', '太早'), /开始日期/);
  assert.throws(() => h.act({ type: 'rate', date: '2026-02-30', dimension: 'study', stars: 2 }), /日期/);
  assert.throws(() => complete(h, '2026-10-14'), /开始/);
});
test('D 日历差、量级边界、365 天封顶', () => {
  const p = (days, importance = 'normal') => taskPlan({ start: '2026-01-01', target: addDays('2026-01-01', days), importance });
  assert.equal(p(0).days, 1); assert.equal(p(7).tier, 'short'); assert.equal(p(8).tier, 'medium');
  assert.equal(p(30).tier, 'medium'); assert.equal(p(31).tier, 'long'); assert.equal(p(90).tier, 'long'); assert.equal(p(91).tier, 'extended');
  near(p(365, 'core').e, 4810); assert.equal(p(1000, 'core').e, p(365, 'core').e);
  const h = setup(); create(h); progress(h, '2026-10-01');
  const e = h.state.tasks.t.frozen.e;
  h.act({ type: 'editTask', taskId: 't', deadline: '2027-10-01' }); assert.equal(h.state.tasks.t.frozen.e, e);
  assert.throws(() => h.act({ type: 'editTask', taskId: 't', importance: 'core' }), /锁定/);
});
test('14 天重要任务定稿示例与同窗口第二次 C', () => {
  const h = setup(); create(h); for (const date of ['2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05']) progress(h, date);
  complete(h, '2026-10-15'); near(totalUnits(h.state), 200.07); near(allocatedProgress(h.state, h.state.tasks.t), 37.05);
  near(h.state.ledger.find(e => e.id === h.state.tasks.t.completion.base).actual, 146.2);
  create(h, 'second'); complete(h, '2026-10-15', '2026-10-15', 'second');
  assert.equal(h.state.tasks.second.completion.c, 108);
});
test('预付上限 50%，重复成果拒绝，同日多条不叠持续日，完成日不计 P', () => {
  const h = setup(); create(h, 't', '2026-10-01', '2026-10-08', 'normal');
  for (let i = 0; i < 8; i++) progress(h, '2026-10-02', `成果 ${i}`);
  const t = h.state.tasks.t; near(allocatedProgress(h.state, t), xp(t.frozen.e) * .5);
  assert.throws(() => progress(h, '2026-10-02', '成果 0'), /已经记录/);
  progress(h, '2026-10-03', '完成日成果'); complete(h, '2026-10-03'); near(totalUnits(h.state), xp(t.frozen.e) * 1.02);
});
test('延迟推进扣正常分配，及时完成不补回折扣', () => {
  const h = setup(); create(h, 't', '2026-10-01', '2026-10-08', 'normal');
  progress(h, '2026-10-02', '成果', '2026-10-03'); complete(h, '2026-10-08');
  const e = xp(h.state.tasks.t.frozen.e); near(totalUnits(h.state), e * 1.02 - e * .1 * .5);
});
test('固定月/双月/季度/半年边界，历史数值保持', () => {
  assert.equal(windowFor('2026-02-28', 'medium').key, '2026-01/medium');
  assert.equal(windowFor('2026-03-01', 'medium').key, '2026-03/medium');
  assert.equal(windowFor('2026-03-31', 'long').end, '2026-04-01');
  assert.equal(windowFor('2026-06-30', 'extended').end, '2026-07-01');
  const h = setup(); create(h, 't', '2026-10-01', '2026-10-02', 'normal'); complete(h, '2026-10-31');
  const before = totalUnits(h.state); assert.equal(nextCoefficient(h.state, 'short', '2026-10-31').c, 105);
  assert.equal(nextCoefficient(h.state, 'short', '2026-11-01').c, 100); assert.equal(totalUnits(h.state), before);
});
test('补记历史完成按结算时计数；撤销不追溯其他冻结 C', () => {
  const h = setup(); create(h, 'first'); complete(h, '2026-10-10', '2026-10-10', 'first');
  create(h, 'second'); complete(h, '2026-10-05', '2026-10-11', 'second'); assert.equal(h.state.tasks.second.completion.c, 108);
  const secondAmount = h.state.ledger.filter(e => e.owner === 'second' && e.active).reduce((a, e) => a + e.actual, 0);
  h.act({ type: 'undoComplete', taskId: 'first' });
  assert.equal(h.state.tasks.second.completion.c, 108);
  assert.equal(h.state.ledger.filter(e => e.owner === 'second' && e.active).reduce((a, e) => a + e.actual, 0), secondAmount);
  assert.equal(nextCoefficient(h.state, 'medium', '2026-10-12').count, 1);
});
test('同日撤销恢复原 C/混合持续折扣，跨日完成新窗口仅一份有效奖', () => {
  const h = setup(); create(h); progress(h, '2026-10-02'); complete(h, '2026-10-05');
  progress(h, '2026-10-03', '补录', '2026-10-10');
  const before = totalUnits(h.state), originalC = h.state.tasks.t.completion.c;
  h.act({ type: 'undoComplete', taskId: 't' }, '2026-10-10');
  complete(h, '2026-10-05', '2026-10-10'); assert.equal(h.state.tasks.t.completion.c, originalC); assert.equal(totalUnits(h.state), before);
  h.act({ type: 'undoComplete', taskId: 't' }, '2026-10-10'); complete(h, '2026-11-01');
  assert.equal(h.state.tasks.t.completion.window, '2026-11/medium');
  assert.equal(h.state.ledger.filter(e => e.owner === 't' && e.active && e.kind === '完成任务').length, 1);
  validateState(h.state);
});
test('已完成删除推进撤所得与持续份额，历史额度不回流，其他 C 不变', () => {
  const h = setup(); create(h); progress(h, '2026-10-02'); complete(h, '2026-10-05');
  const t = h.state.tasks.t, before = totalUnits(h.state), normal = h.state.ledger.find(e => e.id === t.progress[0].entry).normal;
  h.act({ type: 'deleteProgress', taskId: 't', progressId: t.progress[0].id }, '2026-10-06');
  near(before - totalUnits(h.state), xp(normal) + xp(t.frozen.e) * .02);
  assert.equal(allocatedProgress(h.state, h.state.tasks.t), normal);
  h.act({ type: 'undoComplete', taskId: 't' }, '2026-10-07'); complete(h, '2026-10-08');
  near(totalUnits(h.state), xp(t.frozen.e) - xp(normal));
});
test('尚未完成当日误推进可释放额度；历史推进不可释放', () => {
  const h = setup(); create(h); progress(h, '2026-10-02'); const id = h.state.tasks.t.progress[0].id;
  h.act({ type: 'deleteProgress', taskId: 't', progressId: id }, '2026-10-02'); assert.equal(allocatedProgress(h.state, h.state.tasks.t), 0);
  progress(h, '2026-10-03'); h.act({ type: 'deleteProgress', taskId: 't', progressId: h.state.tasks.t.progress[1].id }, '2026-10-04');
  assert.ok(allocatedProgress(h.state, h.state.tasks.t) > 0);
});
test('完成后补录只发持续增量；同日补充与上限不发奖', () => {
  const h = setup(); create(h); complete(h, '2026-10-15'); const before = totalUnits(h.state);
  progress(h, '2026-10-08', '补录', '2026-10-15'); const e = h.state.tasks.t.frozen.e;
  near(totalUnits(h.state) - before, xp(e) * .02 * .3125); assert.equal(allocatedProgress(h.state, h.state.tasks.t), 0);
  const next = totalUnits(h.state); progress(h, '2026-10-08', '同日另一成果', '2026-10-15'); assert.equal(totalUnits(h.state), next);
  assert.throws(() => progress(h, '2026-10-15', '完成当天', '2026-10-15'), /之前/);
  for (let day = 1; day <= 11; day++) progress(h, `2026-10-${String(day).padStart(2, '0')}`, `补录 ${day}`, '2026-10-16');
  const slices = h.state.tasks.t.completion.slices.filter(id => h.state.ledger.find(e => e.id === id).active); assert.equal(slices.length, 10);
});
test('超10持续日删除仍满不扣；真正减少优先撤最近的混合折扣份额', () => {
  const h = setup(); create(h, 't', '2026-10-01', '2026-10-21');
  for (let i = 1; i <= 10; i++) progress(h, `2026-10-${String(i).padStart(2, '0')}`);
  complete(h, '2026-10-12'); progress(h, '2026-10-11', '超上限', '2026-10-13');
  const t = h.state.tasks.t, base = totalUnits(h.state), cancelledAdvance = h.state.ledger.find(e => e.id === t.progress[0].entry).actual;
  h.act({ type: 'deleteProgress', taskId: 't', progressId: t.progress[0].id }, '2026-10-13'); assert.equal(base - totalUnits(h.state), cancelledAdvance);
  h.act({ type: 'deleteProgress', taskId: 't', progressId: t.progress[1].id }, '2026-10-13');
  assert.equal(h.state.tasks.t.completion.slices.filter(id => h.state.ledger.find(e => e.id === id).active).length, 9);
  progress(h, '2026-10-02', '恢复真实第二天', '2026-10-14');
  const last = h.state.ledger.find(e => e.id === h.state.tasks.t.completion.slices.at(-1));
  assert.equal(last.factor.delay, 12);
  const before = totalUnits(h.state); h.act({ type: 'deleteProgress', taskId: 't', progressId: h.state.tasks.t.progress.at(-1).id }, '2026-10-14');
  assert.equal(before - totalUnits(h.state), last.actual);
});
test('撤销后删除当日原完成推进仍保留额度，恢复不返奖', () => {
  const h = setup(); create(h); progress(h, '2026-10-05'); complete(h, '2026-10-05');
  h.act({ type: 'undoComplete', taskId: 't' }, '2026-10-05'); const normal = allocatedProgress(h.state, h.state.tasks.t);
  h.act({ type: 'deleteProgress', taskId: 't', progressId: h.state.tasks.t.progress[0].id }, '2026-10-05');
  assert.equal(allocatedProgress(h.state, h.state.tasks.t), normal); complete(h, '2026-10-05'); near(totalUnits(h.state), xp(h.state.tasks.t.frozen.e) - xp(normal));
});
test('归档恢复无奖、隐藏保留完成、删除整项准确撤全部且不双扣', () => {
  const h = setup(); create(h); progress(h, '2026-10-02'); const before = totalUnits(h.state);
  h.act({ type: 'archive', taskId: 't' }); h.act({ type: 'restore', taskId: 't' }); assert.equal(totalUnits(h.state), before);
  complete(h, '2026-10-12'); const after = totalUnits(h.state); h.act({ type: 'hide', taskId: 't' }); assert.equal(totalUnits(h.state), after); assert.equal(stats(h.state).tasks, 1);
  h.act({ type: 'deleteTask', taskId: 't' }); assert.equal(totalUnits(h.state), 0); assert.equal(stats(h.state).tasks, 0); validateState(h.state);
});
test('重复操作 ID 与重复完成只结算一次，原输入快照不变', () => {
  const original = createState(), action = { id: 'one', type: 'rate', dimension: 'study', stars: 3 };
  const next = transact(original, action, stamp('2026-10-12'));
  assert.equal(totalUnits(original), 0); assert.strictEqual(transact(next, action), next);
  const h = setup(); create(h); complete(h, '2026-10-12'); const before = totalUnits(h.state); complete(h, '2026-10-12'); assert.equal(totalUnits(h.state), before);
});
test('完整 JSON 恢复保留冻结参数、取消痕迹、混合折扣；重复恢复一致', () => {
  const h = setup(); create(h); progress(h, '2026-10-02', '推进', '2026-10-03'); complete(h, '2026-10-08');
  progress(h, '2026-10-04', '补录', '2026-10-12');
  h.act({ type: 'deleteProgress', taskId: 't', progressId: h.state.tasks.t.progress[0].id });
  h.act({ type: 'rate', date: '2026-10-01', dimension: 'study', stars: 5 });
  const restored = parseBackup(backupText(h.state)); assert.deepEqual(restored, h.state);
  assert.deepEqual(parseBackup(backupText(restored)), restored);
  assert.equal(totalUnits(restored), totalUnits(h.state)); assert.deepEqual(stats(restored), stats(h.state));
});
test('损坏备份拒绝：实际额、缺失关联、重复标识、未来格式、孤立奖励', () => {
  const h = setup(); h.act({ type: 'rate', dimension: 'study', stars: 2 });
  for (const edit of [s => s.ledger[0].actual++, s => s.ledger.shift(), s => s.ledger.push(s.ledger[0]), s => s.format++, s => { delete s.ratings['2026-10-12'].study; }, s => s.settings.motion = 'bad']) {
    const damaged = structuredClone(h.state); edit(damaged); assert.throws(() => parseBackup(backupText(damaged)));
  }
});
test('等级所有阈值、下降重算与 MAX 前后', () => {
  assert.equal(levelAt(0).level, 1); assert.equal(levelAt(30*SCALE).level, 2);
  assert.equal(levelAt(26705*SCALE).level, 99); assert.equal(levelAt(27225*SCALE).level, 'MAX');
  assert.equal(levelAt(27225*SCALE - 1).level, 99); assert.equal(levelAt(27225*SCALE - 1).need, 520);
  assert.equal(levelAt(450*SCALE).level, 10); assert.equal(levelAt(2900*SCALE).level, 30);
  assert.equal(levelAt(7350*SCALE).level, 50); assert.equal(levelAt(13800*SCALE).level, 70); assert.equal(levelAt(22250*SCALE).level, 90);
});
test('48 徽章六组八级、门槛递增，星数不受 XP 折扣影响且可撤回', () => {
  assert.equal(BADGES.length, 48); assert.equal(new Set(BADGES.map(b=>b.id)).size,48); assert.equal(new Set(BADGES.map(b=>b.subject)).size,48);
  for(const series of ['stars','study','work','health','life','tasks']) { const group=BADGES.filter(b=>b.series===series); assert.equal(group.length,8); group.forEach((b,i)=>{if(i)assert.ok(b.threshold>group[i-1].threshold);}); }
  const h = setup(); for(let i=1;i<=10;i++) h.act({type:'rate',dimension:'study',stars:5,date:`2026-09-${String(i).padStart(2,'0')}`});
  assert.equal(stats(h.state).study,50); assert.ok(totalUnits(h.state)<150*SCALE);
  h.act({type:'rate',dimension:'study',stars:null,date:'2026-09-01'}); assert.equal(stats(h.state).study,45);
});
test('四档系数上限、互不影响与完成顺序', () => {
  const h=setup();
  for(const [index,days] of [7,14,60,120].entries()) {
    const tier=['short','medium','long','extended'][index];
    for(let i=0;i<12;i++) {
      const id=`${tier}-${i}`;create(h,id,'2026-01-01',addDays('2026-01-01',days),'normal','2026-01-01');complete(h,'2026-10-12','2026-10-12',id);
      assert.equal(h.state.tasks[id].completion.c,Math.min([130,140,150,160][index],100+i*[5,8,10,15][index]));
    }
    assert.equal(nextCoefficient(h.state,tier,'2026-10-12').c,[130,140,150,160][index]);
  }
  validateState(h.state);
});
test('首次推进前可改原计划，创建仅一次，阶段勾选无经验', () => {
  const h=setup();h.act({type:'createTask',id:'staged',title:'成果',start:'2026-10-12',target:'2026-10-15',importance:'normal',stages:'准备\n交付'});
  h.act({type:'editTask',taskId:'staged',start:'2026-10-10',target:'2026-10-24',importance:'important'});
  h.act({type:'stage',taskId:'staged',stageId:'staged:stage:0',done:true});assert.equal(totalUnits(h.state),2*SCALE);
  progress(h,'2026-10-12','首次推进','2026-10-12','staged');assert.equal(h.state.tasks.staged.frozen.days,14);near(h.state.tasks.staged.frozen.e,185.25);
  validateState(h.state);
});
