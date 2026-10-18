import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, SCALE } from '../packages/core/index.js';
import { reminderCopy } from '../packages/core/reminder-copy.js';
import { flattenFeedback, feedbackGroups } from '../packages/core/weekly-feedback.js';
import { previousWeek, mondayFor, summarizeWeek, buildWeeklyReport, takeReminder, reminderDecision } from '../packages/core/reports.js';

const full = (current = 3, prior = 2) => {
  const state = createState();
  for(let day=5;day<=18;day++){
    const date=`2026-10-${String(day).padStart(2,'0')}`;
    state.ratings[date]=Object.fromEntries(['study','work','health','life'].map(d=>[d,{stars:day>=12?current:prior,note:`${date} 的${d}原文`} ]));
  }
  return state;
};

test('50 unique title/body reminders and 180 distinct feedback templates',()=>{
  const rows=flattenFeedback();
  assert.equal(reminderCopy.length,50); assert.equal(rows.length,180);
  assert.equal(new Set(reminderCopy.map(x=>x.title)).size,50);
  assert.equal(new Set(reminderCopy.map(x=>x.body)).size,50);
  assert.equal(new Set(rows.map(x=>x.id)).size,180); assert.equal(new Set(rows.map(x=>x.text)).size,180);
  assert.equal(Object.values(feedbackGroups.dimension).length,4);
});
test('reminder bag survives roundtrip and avoids duplicates in cycles and across boundaries',()=>{
  let state=null;const ids=[];
  for(let i=0;i<150;i++){const next=takeReminder(state,'fake-install');ids.push(next.copy.id);state=JSON.parse(JSON.stringify(next.nextState));}
  for(let cycle=0;cycle<3;cycle++)assert.equal(new Set(ids.slice(cycle*50,(cycle+1)*50)).size,50);
  ids.slice(1).forEach((id,i)=>assert.notEqual(id,ids[i]));
});
test('Hong Kong weeks handle Sunday, year and leap-day boundaries',()=>{
  assert.deepEqual(previousWeek('2026-10-18T15:59:59Z'),{start:'2026-10-05',end:'2026-10-11'});
  assert.deepEqual(previousWeek('2026-10-18T16:00:00Z'),{start:'2026-10-12',end:'2026-10-18'});
  assert.equal(mondayFor('2027-01-01'),'2026-12-28');
  assert.equal(mondayFor('2024-02-29'),'2024-02-26');
});
test('empty, explicit zero and sparse data are distinguished',()=>{
  const state=createState();assert.equal(summarizeWeek(state,'2026-10-12').overallState,'empty');
  state.ratings['2026-10-12']={health:{stars:0,note:'休息日'}};
  const summary=summarizeWeek(state,'2026-10-12');
  assert.equal(summary.dimensions.health.mean,0);assert.equal(summary.dimensions.health.count,1);
  assert.equal(summary.dimensions.study.mean,null);assert.equal(summary.overallState,'sparse');
});
test('paired same-weekday comparisons require four pairs and use only paired dates',()=>{
  const state=full();delete state.ratings['2026-10-05'].study;delete state.ratings['2026-10-06'].study;
  state.ratings['2026-10-12'].study.stars=0;
  let d=summarizeWeek(state,'2026-10-12').dimensions.study;
  assert.equal(d.pairs,5);assert.equal(d.delta,1);
  delete state.ratings['2026-10-07'].study;delete state.ratings['2026-10-08'].study;
  d=summarizeWeek(state,'2026-10-12').dimensions.study;assert.equal(d.delta,null);
});
test('rising, falling, high, steady, uneven branches use explicit thresholds',()=>{
  assert.equal(summarizeWeek(full(4,3),'2026-10-12').overallState,'rising');
  assert.equal(summarizeWeek(full(2,3),'2026-10-12').overallState,'falling');
  assert.equal(summarizeWeek(full(4,4),'2026-10-12').dimensions.study.state,'high');
  assert.equal(summarizeWeek(full(3,3),'2026-10-12').overallState,'steady');
  const state=full(3,3);for(let d=12;d<=18;d++)state.ratings[`2026-10-${d}`].health.stars=0;
  assert.equal(summarizeWeek(state,'2026-10-12').overallState,'uneven');
});
test('raw reasons, journals and task results remain inspectable; retired overall star is ignored',()=>{
  const state=full();state.dailyReviews={'2026-10-12':{stars:5,note:'原小结'}};
  state.tasks.a={id:'a',title:'虚构任务',createdAt:'2026-10-11T16:30:00Z',progress:[{id:'p1',active:true,date:'2026-10-13',note:'原成果'},{id:'p2',active:false,date:'2026-10-14',note:'已取消'}],completion:{active:true,date:'2026-10-15',note:'交付原文'}};
  state.ledger=[{date:'2026-10-12',actual:11*SCALE,active:true},{date:'2026-10-13',actual:8*SCALE,active:false}];
  const report=buildWeeklyReport(state,'2026-10-12');
  assert.equal(report.days[0].journal,'原小结');assert.equal(report.days[0].notes.study,'2026-10-12 的study原文');
  assert.equal(report.taskProgress,1);assert.equal(report.completedTasks,1);assert.equal(report.createdTasks,1);
  assert.equal(report.effectiveXPUnits,11*SCALE);assert.equal(report.days[1].progress[0].note,'原成果');
  assert.equal(report.dimensions.overall,undefined);
});
test('reports are deterministic, do not mutate state or rewards, and change fingerprint on correction',()=>{
  const state=full(),before=JSON.stringify(state);
  const first=buildWeeklyReport(state,'2026-10-12'),same=buildWeeklyReport(state,'2026-10-12');
  assert.deepEqual(first,same);assert.equal(JSON.stringify(state),before);
  const alternate=buildWeeklyReport(state,'2026-10-12',{previousTemplateIds:first.templateIds});
  assert(alternate.templateIds.every(id=>!first.templateIds.includes(id)));
  state.ratings['2026-10-13'].study.note='更正后的原文';
  assert.notEqual(buildWeeklyReport(state,'2026-10-12').fingerprint,first.fingerprint);
});
test('10am always reminds, Monday combines weekly, 11am checks meaningful business update, receipts deduplicate',()=>{
  const mon='2026-10-19T02:00:00Z',ten=reminderDecision({now:mon,hasTodayBusinessUpdate:true});
  assert.equal(ten.kind,'weekly-and-daily');assert.equal(ten.weeklyStart,'2026-10-12');
  assert.equal(reminderDecision({now:'2026-10-19T03:00:00Z',hasTodayBusinessUpdate:true}),null);
  assert.equal(reminderDecision({now:'2026-10-19T03:00:00Z'}).slot,'followup');
  assert.equal(reminderDecision({now:mon,sent:[ten.key]}),null);
  assert.equal(reminderDecision({now:mon,notificationsAllowed:false}),null);
  assert.equal(reminderDecision({now:'2026-10-19T03:16:00Z'}),null);
  assert.equal(reminderDecision({now:'2026-10-20T02:00:00Z'}).kind,'daily');
});
test('invalid stars and non-Monday report starts are rejected',()=>{
  const state=full();state.ratings['2026-10-12'].study.stars=6;
  assert.throws(()=>summarizeWeek(state,'2026-10-12'));
  assert.throws(()=>summarizeWeek(createState(),'2026-10-13'));
});
test('independent switches and account scopes do not suppress or leak other reminders',()=>{
  const now='2026-10-19T02:00:00Z';
  assert.equal(reminderDecision({now,dailyEnabled:false}).kind,'weekly');
  assert.equal(reminderDecision({now,dailyEnabled:false,weeklyEnabled:false}),null);
  assert.equal(reminderDecision({now:'2026-10-19T03:00:00Z',followupEnabled:false}),null);
  const a=reminderDecision({now,accountScope:'fake-a'});
  assert(reminderDecision({now,accountScope:'fake-b',sent:[a.key]}));
  assert.equal(reminderDecision({now,accountScope:'fake-a',sent:[a.key]}),null);
});
