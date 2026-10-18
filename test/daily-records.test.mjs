import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, transact, totalUnits, SCALE } from '../packages/core/index.js';
import { backupText, parseBackup, validateState } from '../packages/data/storage.js';
import { buildWeeklyReport } from '../packages/core/weekly-report.js';
import { sha256 } from '../packages/core/hash.js';
import { reminderDecision } from '../packages/core/weekly-report.js';
import { reminderCopy } from '../packages/core/reminder-copy.js';
import { getWeeklyReport } from '../packages/ui/history.js';

const now='2026-10-18T10:00:00+08:00', date='2026-10-18';
const act=(state,action,stamp=now)=>transact(state,{id:crypto.randomUUID(),...action},stamp);

test('unscored dimension notes and daily journal persist without score, XP, or reminder suppression',()=>{
 let s=createState();const units=totalUnits(s);
 s=act(s,{type:'note',date,dimension:'study',note:'先写记录'});
 s=act(s,{type:'journal',date,note:'今日小结'});
 assert.equal(totalUnits(s),units);assert.equal(s.ratingNotes[date].study.note,'先写记录');assert.equal(s.dailyNotes[date].note,'今日小结');assert.equal(s.businessUpdates,undefined);
 s=act(s,{type:'rate',date,dimension:'study',stars:0});
 assert.equal(s.ratings[date].study.note,'先写记录');assert.equal(s.ratingNotes[date].study,undefined);assert.equal(s.businessUpdates[date],now);
 s=validateState(parseBackup(backupText(s)));
 assert.equal(s.ratings[date].study.stars,0);assert.equal(s.dailyNotes[date].note,'今日小结');
});

test('clearing a star keeps its reason available for history and weekly reports',()=>{
 let s=act(createState(),{type:'rate',date:'2026-10-12',dimension:'work',stars:3});
 s=act(s,{type:'note',date:'2026-10-12',dimension:'work',note:'原因依据'});
 const units=totalUnits(s);s=act(s,{type:'rate',date:'2026-10-12',dimension:'work',stars:null});
 assert.equal(totalUnits(s),0);assert.equal(s.ratingNotes['2026-10-12'].work.note,'原因依据');
 const report=buildWeeklyReport(s,'2026-10-12');assert.equal(report.days[0].notes.work,'原因依据');assert.equal(report.days[0].scores.work,null);
});

test('new optional top-level records survive a legacy-shaped JSON save cycle',()=>{
 let s=act(createState(),{type:'note',date,dimension:'life',note:'new field'});
 s=act(s,{type:'journal',date,note:'compat'});
 s.dailyReviews={[date]:{overall:5,summary:'旧候选记录'}};
 const oldReader=JSON.parse(JSON.stringify(s));
 const oldWriter=structuredClone(oldReader);oldWriter.revision++;
 const reopened=validateState(JSON.parse(JSON.stringify(oldWriter)));
 assert.equal(reopened.ratingNotes[date].life.note,'new field');assert.equal(reopened.dailyNotes[date].note,'compat');assert.deepEqual(reopened.dailyReviews[date],{overall:5,summary:'旧候选记录'});
});

test('weekly reports preserve zero-star days and original notes; report hashing is stable',()=>{
 let s=act(createState(),{type:'rate',date:'2026-10-12',dimension:'study',stars:0});
 s=act(s,{type:'note',date:'2026-10-12',dimension:'study',note:'当天依据'});
 s=act(s,{type:'journal',date:'2026-10-12',note:'周一小结'});
 const a=buildWeeklyReport(s,'2026-10-12'),b=buildWeeklyReport(s,'2026-10-12');
 assert.equal(a.days[0].scores.study,0);assert.equal(a.days[0].notes.study,'当天依据');assert.equal(a.days[0].journal,'周一小结');assert.equal(a.fingerprint,b.fingerprint);
 assert.equal(sha256('abc'),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('production reminder rules merge Monday report and suppress only 11am after a real update',()=>{
 assert.equal(reminderCopy.length,50);
 const week=reminderDecision({now:'2026-10-19T10:00:00+08:00',accountScope:'u'});assert.equal(week.kind,'weekly-and-daily');assert.equal(week.weeklyStart,'2026-10-12');
 const skip=reminderDecision({now:'2026-10-18T11:00:00+08:00',hasTodayBusinessUpdate:true});assert.equal(skip,null);
 const follow=reminderDecision({now:'2026-10-18T11:00:00+08:00'});assert.equal(follow.slot,'followup');
});

test('weekly evaluation templates do not repeat from one week to the next',()=>{
 const s=createState();const previous=getWeeklyReport(s,'2026-10-05','repeat-test'),current=getWeeklyReport(s,'2026-10-12','repeat-test');
 assert.equal(current.templateIds.some(id=>previous.templateIds.includes(id)),false);
});
