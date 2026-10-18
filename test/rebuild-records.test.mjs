import { recoverRecordDrafts } from '../packages/data/record-drafts.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { indexedDB } from 'fake-indexeddb';
import { createState, transact, totalUnits } from '../packages/core/index.js';
import { recordText } from '../packages/core/records.js';
import { sha256 } from '../packages/core/digest.js';
import { openStore, validateState, parseBackup, backupText } from '../packages/data/storage.js';
import { SyncEngine } from '../packages/data/sync.js';
globalThis.indexedDB=indexedDB;
const now='2026-10-19T10:30:00+08:00';
const act=(s,a,time=now)=>transact(s,{id:crypto.randomUUID(),...a},time);

test('portable report SHA256 matches standard vectors, Chinese and block boundaries',()=>{
  for(const text of ['', 'abc', '中文依据🌱', 'x'.repeat(55), 'x'.repeat(56), 'x'.repeat(64), 'x'.repeat(10000)])assert.equal(sha256(text),createHash('sha256').update(text).digest('hex'));
});
test('unrated writing, rating, clearing, backup and later rerating keep exact text without manufacturing stars',()=>{
  let s=act(createState(),{type:'note',date:'2026-10-19',dimension:'study',note:'  原文\n依据 <script>  '});
  assert.equal(totalUnits(s),0);assert.deepEqual(s.ratings,{});
  s=act(s,{type:'rate',date:'2026-10-19',dimension:'study',stars:0});assert.equal(totalUnits(s),5e6);assert.equal(recordText(s,'2026-10-19','study'),'  原文\n依据 <script>  ');
  s=act(s,{type:'rate',date:'2026-10-19',dimension:'study',stars:null});assert.equal(totalUnits(s),0);assert.ok(recordText(s,'2026-10-19','study').includes('原文'));
  s=act(parseBackup(backupText(s)),{type:'rate',date:'2026-10-19',dimension:'study',stars:3});assert.equal(totalUnits(s),11e6);validateState(s);
});
test('old preview backup and discarded 1.0 optional fields roundtrip without deleting candidate data',()=>{
  const old=createState();assert.deepEqual(parseBackup(backupText(old)),old);
  const s=act(old,{type:'journal',date:'2026-10-19',note:'每日小结'});s.dailyReviews={'2026-10-18':{stars:4,note:'候选旧小结'}};s.dailyReviews['2026-10-17']={stars:0,summary:'旧候选summary原文'};s.futureCandidate={opaque:['保留']};
  const restored=parseBackup(backupText(s));assert.deepEqual(restored,s);assert.equal(totalUnits(restored),0);
  assert.throws(()=>act(s,{type:'note',date:'2026-10-20',dimension:'study',note:'未来'}),/未来/);
  assert.throws(()=>act(s,{type:'journal',date:'2026-10-19',note:'x'.repeat(4001)}),/4000/);
});
test('bulk deletion matches sequential frozen cancellation, including another task coefficient',()=>{
  let s=createState();
  for(const id of ['task-a','task-b'])s=transact(s,{id,type:'createTask',title:id,start:'2026-10-01',target:'2026-10-20',importance:'normal'},'2026-10-01T10:00:00+08:00');
  for(const date of ['2026-10-05','2026-10-06'])s=act(s,{type:'progress',taskId:'task-a',date,note:date},date+'T10:00:00+08:00');
  s=act(s,{type:'complete',taskId:'task-a',date:'2026-10-18'});s=act(s,{type:'complete',taskId:'task-b',date:'2026-10-18'});
  const before=structuredClone(s), next=transact(s,{id:'bulk',type:'clearProgress',taskId:'task-a'},now);
  let sequential=s;for(const p of s.tasks['task-a'].progress)sequential=transact(sequential,{id:`bulk/${p.id}`,type:'deleteProgress',taskId:'task-a',progressId:p.id},now);
  assert.equal(totalUnits(next),totalUnits(sequential));assert.deepEqual(next.tasks,sequential.tasks);assert.deepEqual(next.ledger,sequential.ledger);assert.deepEqual(s,before);assert.equal(next.tasks['task-b'].completion.c,before.tasks['task-b'].completion.c);validateState(next);assert.equal(transact(next,{id:'bulk',type:'clearProgress',taskId:'task-a'},now),next);
});
test('guest inheritance requires empty local and empty cloud, retains guest and prior recovery copy',async()=>{
  const guest=await openStore();let g=await guest.read();g=act(g,{type:'note',date:'2026-10-19',dimension:'health',note:'离线记录'});await guest.write(g,0);
  const target=await openStore('new-empty');const calls=[];
  const engine=new SyncEngine(target,async value=>{calls.push(value);return value.type==='pull'?{version:0,state:null}:{accepted:true,version:1};});await engine.run();
  assert.equal(recordText(await target.read(),'2026-10-19','health'),'离线记录');assert.deepEqual(await guest.read(),g);assert.equal((await target.readAux('before-inherit')).revision,0);assert.equal(calls.filter(c=>c.type==='push').length,1);
  const occupied=await openStore('existing-cloud');const cloud=act(createState(),{type:'journal',date:'2026-10-19',note:'已有云端'});
  await new SyncEngine(occupied,async()=>({version:1,state:cloud})).run();assert.equal((await occupied.read()).dailyNotes['2026-10-19'].note,'已有云端');assert.equal((await occupied.read()).ratingNotes,undefined);
  guest.close();target.close();occupied.close();
});

test('unchanged text, settings and past backfill do not suppress the current-day followup',()=>{
 let s=createState();s=act(s,{type:'note',date:'2026-10-18',dimension:'study',note:'历史'});assert.equal(s.businessUpdates?.['2026-10-19'],undefined);
 s=act(s,{type:'journal',date:'2026-10-19',note:''});assert.equal(s.businessUpdates?.['2026-10-19'],undefined);
 s=act(s,{type:'settings',motion:'gentle'});assert.equal(s.businessUpdates?.['2026-10-19'],undefined);
 s=act(s,{type:'rate',date:'2026-10-19',dimension:'study',stars:0});assert.ok(s.businessUpdates['2026-10-19']);const marker=s.businessUpdates['2026-10-19'];
 s=act(s,{type:'rate',date:'2026-10-19',dimension:'study',stars:0},'2026-10-19T10:45:00+08:00');assert.equal(s.businessUpdates['2026-10-19'],marker);
});

test('old pending drafts survive upgrade, newer successful clearing beats stale caches, broken caches fall back safely',()=>{
 const key='2026-10-19/work',old={[key]:'旧版本未完成的文字'};
 assert.equal(recoverRecordDrafts(old).entries.get(key),old[key]);
 assert.equal(recoverRecordDrafts(old,JSON.stringify({version:1,at:5,entries:{}})).entries.size,0);
 assert.equal(recoverRecordDrafts({version:1,at:6,entries:old},JSON.stringify({version:1,at:5,entries:{}})).entries.get(key),old[key]);
 assert.equal(recoverRecordDrafts(old,'broken json').entries.get(key),old[key]);
 assert.equal(recoverRecordDrafts({...old,invalid:'wrong','2026-10-19/health':'x'.repeat(4001)}).entries.size,1);
});
