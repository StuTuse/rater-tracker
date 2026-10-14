import test from 'node:test';
import assert from 'node:assert/strict';
import { indexedDB } from 'fake-indexeddb';
import { openStore } from '../src/storage.js';
import { createState, transact, totalUnits } from '../src/core.js';
import { SyncEngine } from '../src/sync.js';
globalThis.indexedDB = indexedDB;
const rating = (state, stars = 3) => transact(state, { id: crypto.randomUUID(), type: 'rate', dimension: 'study', date: '2026-10-13', stars }, '2026-10-13T10:00:00+08:00');

test('guest and two accounts never share records or pending uploads', async () => {
  const a = await openStore('isolation-a'), b = await openStore('isolation-b'), guest = await openStore();
  await a.write(rating(await a.read()), 0);
  assert.equal(totalUnits(await b.read()), 0); assert.equal(totalUnits(await guest.read()), 0);
  assert.equal((await a.readSync()).meta.dirty, true); assert.equal((await b.readSync()).meta.dirty, false);
  a.close(); b.close(); guest.close();
});
test('lost response preserves stable upload through restart and retries once', async () => {
  let a = await openStore('retry'); await a.write(rating(await a.read()), 0);
  const sent = await a.beginPush(); a.close(); a = await openStore('retry');
  assert.deepEqual(await a.beginPush(), sent);
  let calls = 0;
  const engine = new SyncEngine(a, async data => {
    calls++;
    if (calls === 1) throw new Error('network lost');
    if (data.type === 'push') { assert.equal(data.requestId, sent.requestId); return { accepted: true, version: 1 }; }
    return { state: null, version: 0 };
  });
  await engine.run(); assert.ok((await a.readSync()).meta.inFlight);
  await engine.run(); assert.equal((await a.readSync()).meta.dirty, false); assert.equal(totalUnits(await a.read()), 11e6);
  a.close();
});
test('input saved during upload stays pending after acknowledging older snapshot', async () => {
  const a = await openStore('during-upload'); await a.write(rating(await a.read()), 0);
  const sent = await a.beginPush(), before = await a.read();
  await a.write(rating(before, 5), before.revision);
  await a.ackPush(sent.requestId, 1);
  const pair = await a.readSync(); assert.equal(pair.meta.dirty, true); assert.equal(pair.meta.baseVersion, 1);
  assert.equal(totalUnits(pair.state), 15e6); assert.equal((await a.beginPush()).baseVersion, 1);
  a.close();
});
test('a change during an automatic upload is pushed before the sync run completes', async () => {
  const a = await openStore('sync-drain');
  await a.write(rating(await a.read()), 0);
  let finishFirstPush, pushCount = 0, cloudState;
  const firstPush = new Promise(resolve => { finishFirstPush = resolve; });
  const engine = new SyncEngine(a, async request => {
    if (request.type === 'pull') return cloudState ? { state: cloudState, version: pushCount } : { state: null, version: 0 };
    if (request.type === 'push') {
      pushCount++;
      if (pushCount === 1) await firstPush;
      cloudState = request.state;
      return { accepted: true, version: pushCount };
    }
  });
  const firstRun = engine.run();
  while (pushCount === 0) await new Promise(resolve => setTimeout(resolve, 0));
  const before = await a.read();
  await a.write(rating(before, 5), before.revision);
  assert.equal(engine.run(), firstRun);
  finishFirstPush();
  await firstRun;
  const pair = await a.readSync();
  assert.equal(pushCount, 2);
  assert.equal(pair.meta.dirty, false);
  assert.equal(pair.meta.inFlight, null);
  assert.equal(pair.meta.baseVersion, 2);
  assert.equal(totalUnits(pair.state), 15e6);
  a.close();
});
test('a cloud revision committed during upload is reread and newer cloud data wins automatically', async () => {
  const a = await openStore('conflict'); await a.write(rating(await a.read()), 0);
  const cloud = rating(createState(), 5); cloud.modifiedAt = new Date(Date.now() + 60_000).toISOString();
  let pushes = 0, pulls = 0;
  const engine = new SyncEngine(a, async request => {
    if (request.type === 'pull') { pulls++; return pulls === 1 ? { state:null, version:0 } : { state:cloud, version:2 }; }
    pushes++; return { conflict:true, version:2 };
  });
  await engine.run();
  assert.equal(pushes, 1); assert.equal(pulls, 2);
  assert.equal(totalUnits(await a.read()), 15e6); assert.equal((await a.readSync()).meta.conflict, null);
  a.close();
});

test('startup pulls newer cloud data before considering a dirty local upload', async () => {
  const a = await openStore('startup-cloud-newer'); await a.write(rating(await a.read()), 0);
  const cloud = rating(createState(), 5); cloud.modifiedAt = new Date(Date.now() + 60_000).toISOString();
  const calls = [];
  const engine = new SyncEngine(a, async request => {
    calls.push(request.type);
    return request.type === 'pull' ? { state:cloud, version:4 } : { accepted:true, version:5 };
  });
  await engine.run();
  assert.deepEqual(calls, ['pull']);
  const pair = await a.readSync();
  assert.equal(totalUnits(pair.state), 15e6); assert.equal(pair.meta.dirty, false); assert.equal(pair.meta.baseVersion, 4);
  a.close();
});

test('newer local timestamp uploads against the latest pulled cloud version', async () => {
  const a = await openStore('startup-local-newer'); await a.write(rating(await a.read()), 0);
  const localTime = (await a.read()).modifiedAt;
  const cloud = rating(createState()); cloud.modifiedAt = new Date(Date.parse(localTime) - 60_000).toISOString();
  const calls = [];
  const engine = new SyncEngine(a, async request => {
    calls.push(request.type);
    if (request.type === 'pull') return { state:cloud, version:4 };
    assert.equal(request.baseVersion, 4);
    return { accepted:true, version:5 };
  });
  await engine.run();
  assert.deepEqual(calls, ['pull', 'push']);
  const pair = await a.readSync();
  assert.equal(totalUnits(pair.state), 11e6); assert.equal(pair.meta.dirty, false); assert.equal(pair.meta.baseVersion, 5);
  a.close();
});

test('legacy cloud snapshots without timestamps use cloud version as a safe migration fallback', async () => {
  const a = await openStore('legacy-cloud'); await a.write(rating(await a.read()), 0);
  const cloud = rating(createState(), 5); delete cloud.modifiedAt;
  const engine = new SyncEngine(a, async () => ({ state:cloud, version:2 }));
  await engine.run();
  assert.equal(totalUnits(await a.read()), 15e6); assert.equal((await a.readSync()).meta.baseVersion, 2);
  a.close();
});

test('a clean local snapshot with a later timestamp is uploaded and equal polling does not change revision', async () => {
  const a = await openStore('clean-newer'); await a.write(rating(await a.read()), 0);
  const flight = await a.beginPush(); await a.ackPush(flight.requestId, 1);
  let cloud = structuredClone(flight.state); cloud.modifiedAt = new Date(Date.parse(cloud.modifiedAt) - 1000).toISOString();
  let version = 1, pushes = 0;
  const engine = new SyncEngine(a, async request => {
    if (request.type === 'pull') return { state: cloud, version };
    pushes++; cloud = structuredClone(request.state); return { accepted: true, version: ++version };
  });
  await engine.run(); assert.equal(pushes, 1);
  const revision = (await a.read()).revision;
  await engine.run(); await engine.run();
  assert.equal(pushes, 1); assert.equal((await a.read()).revision, revision);
  a.close();
});

test('a stale pending flight is replaced with newer local work after cloud inspection', async () => {
  const a = await openStore('stale-flight'); await a.write(rating(await a.read()), 0);
  const stale = await a.beginPush(), before = await a.read();
  await a.write(rating(before, 5), before.revision);
  const cloud = structuredClone(stale.state); cloud.modifiedAt = new Date(Date.parse(cloud.modifiedAt) - 1000).toISOString();
  const engine = new SyncEngine(a, async request => {
    if (request.type === 'pull') return { state: cloud, version: 0 };
    assert.notEqual(request.requestId, stale.requestId);
    assert.equal(totalUnits(request.state), 15e6);
    return { accepted: true, version: 1 };
  });
  await engine.run(); assert.equal((await a.readSync()).meta.dirty, false);
  a.close();
});

test('persistently racing cloud revisions stop immediate retries and retain local pending data', async () => {
  const a = await openStore('bounded-race'); await a.write(rating(await a.read()), 0);
  let pushes = 0;
  const engine = new SyncEngine(a, async request => request.type === 'pull' ? {state:null,version:0} : (++pushes, {conflict:true,version:1}));
  await engine.run(); assert.equal(pushes, 3); assert.equal((await a.readSync()).meta.dirty, true);
  a.close();
});

test('input saved during the startup cloud read participates in the comparison before any replacement', async () => {
  const a = await openStore('during-pull'); await a.write(rating(await a.read()), 0);
  const original = await a.read(), cloud = rating(createState(), 1); cloud.modifiedAt = original.modifiedAt;
  let finishPull, startedPull;
  const started = new Promise(resolve => { startedPull = resolve; });
  const waiting = new Promise(resolve => { finishPull = resolve; });
  const engine = new SyncEngine(a, async request => {
    if (request.type === 'pull') { startedPull(); await waiting; return {state:cloud,version:2}; }
    assert.equal(totalUnits(request.state),15e6); return {accepted:true,version:3};
  });
  const run = engine.run(); await started;
  await a.write(rating(original,5),original.revision); finishPull(); await run;
  assert.equal(totalUnits(await a.read()),15e6); assert.equal((await a.readSync()).meta.dirty,false);
  a.close();
});
test('download cannot overwrite newer input; explicit restore does not grant rewards', async () => {
  const a = await openStore('download'), incoming = rating(createState());
  await a.acceptPull(incoming, 1, 0); assert.equal(totalUnits(await a.read()), 11e6);
  const state = await a.read(); await a.write(rating(state, 5), state.revision);
  await assert.rejects(a.acceptPull(incoming, 2, state.revision));
  assert.equal(totalUnits(await a.read()), 15e6);
  await a.useCloud(incoming, 2, (await a.read()).revision);
  const result = await a.readSync(); assert.equal(totalUnits(result.state), 11e6);
  assert.equal(result.meta.dirty, false); assert.equal(result.meta.inFlight, null);
  a.close();
});

test('clearing one local account is revision guarded and preserves guest and other accounts', async () => {
  const a = await openStore('clear-target'), other = await openStore('clear-other'), guest = await openStore();
  await a.write(rating(await a.read()), 0); await other.write(rating(await other.read(), 5), 0);
  const guestBefore = await guest.read(), otherBefore = await other.read();
  await a.beginPush(); await a.markConflict(2);
  await assert.rejects(a.clearAccount(0)); assert.equal(totalUnits(await a.read()), 11e6);
  await a.clearAccount((await a.read()).revision);
  assert.equal(totalUnits(await a.read()), 0);
  const cleared = await a.readSync(); assert.equal(cleared.meta.dirty, false); assert.equal(cleared.meta.inFlight, null); assert.equal(cleared.meta.conflict, null);
  assert.deepEqual(await guest.read(), guestBefore); assert.deepEqual(await other.read(), otherBefore);
  await assert.rejects(guest.clearAccount(guestBefore.revision));
  const incoming = rating(createState()); await a.acceptPull(incoming, 2, 0); assert.equal(totalUnits(await a.read()), 11e6);
  a.close(); other.close(); guest.close();
});
