import test from 'node:test';
import assert from 'node:assert/strict';
import { LAUNCH_LINES, chooseLaunchLine, BadgeNoticeQueue } from '../src/notices.js';

test('launch always avoids the previous line, including both random boundaries', () => {
  for(const previous of LAUNCH_LINES) for(const random of [0,.2,.5,.999999,1]) {
    const next=chooseLaunchLine(previous,random);assert.ok(LAUNCH_LINES.includes(next));assert.notEqual(next,previous);
  }
});
test('pending and visible badge notices withdraw invalid badges and do not duplicate a batch', () => {
  const q=new BadgeNoticeQueue();q.add(['study-01','work-01']);q.add(['study-01']);
  q.reconcile(['study-01']);assert.deepEqual(q.take(),['study-01']);assert.deepEqual(q.take(),[]);
  q.add(['study-01','tasks-01']);assert.deepEqual(q.pending,['tasks-01']);
  q.reconcile(['tasks-01']);assert.deepEqual(q.current,[]);q.dismiss();assert.deepEqual(q.take(),['tasks-01']);
  q.clear();assert.deepEqual(q.current,[]);assert.deepEqual(q.pending,[]);
});
