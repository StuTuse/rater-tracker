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
    if (++calls === 1) throw new Error('network lost');
    if (data.type === 'push') { assert.equal(data.requestId, sent.requestId); return { accepted: true, version: 1 }; }
    return { state: sent.state, version: 1 };
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
    if (request.type === 'push') {
      pushCount++;
      if (pushCount === 1) await firstPush;
      cloudState = request.state;
      return { accepted: true, version: pushCount };
    }
    return cloudState ? { state: cloudState, version: pushCount } : { state: null, version: pushCount };
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
test('cloud conflicts keep local rewards and stop automatic overwrites', async () => {
  const a = await openStore('conflict'); await a.write(rating(await a.read()), 0);
  let calls = 0;
  const engine = new SyncEngine(a, async () => { calls++; return { conflict:true, version:2 }; });
  await engine.run(); await engine.run(); assert.equal(calls, 1);
  assert.equal(totalUnits(await a.read()), 11e6); assert.equal((await a.readSync()).meta.conflict, 2);
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
