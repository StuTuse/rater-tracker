import { validateState, ConflictError } from './storage.js';

const time = value => {
  const parsed = Date.parse(value ?? '');
  return Number.isFinite(parsed) ? parsed : null;
};

export class SyncEngine {
  constructor(store, remote, onChange = () => {}) { this.store = store; this.remote = remote; this.onChange = onChange; this.running = null; this.rerun = false; }
  run() {
    if (this.running) { this.rerun = true; return this.running; }
    this.conflictRetries = 0;
    this.running = this.drain().finally(() => { this.running = null; });
    return this.running;
  }
  async drain() {
    do {
      this.rerun = false;
      await this.perform();
    } while (this.rerun);
  }
  async perform() {
    try {
      // Always read the cloud first. A stale local pending upload must never hide a newer cloud snapshot.
      const cloud = await this.remote({ type: 'pull' });
      if (!Number.isSafeInteger(cloud.version) || cloud.version < 0) throw new Error('云端版本无效');
      let local = await this.store.readSync();
      if (cloud.version < local.meta.baseVersion) throw new Error('云端版本回退');
      let localIsNewer = false;
      if (cloud.state) {
        validateState(cloud.state);
        const localTime = time(local.state.modifiedAt);
        const cloudTime = time(cloud.state.modifiedAt ?? cloud.modifiedAt ?? cloud.updatedAt ?? cloud.updated_at);
        localIsNewer = localTime !== null && cloudTime !== null && localTime > cloudTime;
        // Legacy snapshots have no timestamp. In that case the cloud version decides whether
        // an unseen cloud revision should be adopted; otherwise keep and upload local work.
        const cloudIsNewer = cloudTime !== null && (localTime === null || cloudTime > localTime)
          || cloudTime !== null && localTime === cloudTime && cloud.version > local.meta.baseVersion
          || cloudTime === null && cloud.version > local.meta.baseVersion;
        if (cloudIsNewer) {
          const incoming = structuredClone(cloud.state);
          if (cloudTime !== null) incoming.modifiedAt = new Date(cloudTime).toISOString();
          await this.store.acceptCloud(incoming, cloud.version, local.state.revision);
          await this.onChange('synced');
          return;
        }
      }
      const hasLocalData = local.state.revision > 0;
      if (localIsNewer || local.meta.dirty || local.meta.inFlight || (hasLocalData && !cloud.state)) {
        await this.store.preparePush(cloud.version, local.state.revision);
        const flight = await this.store.beginPush();
        const result = await this.remote({ type: 'push', ...flight });
        if (result.conflict) {
          // Another device may have committed while this snapshot was in flight. Read it first
          // on the next pass and resolve by timestamp instead of leaving a permanent conflict.
          this.rerun = ++this.conflictRetries < 3;
          return this.onChange('pending', this.rerun ? undefined : '云端持续更新，稍后自动重试');
        }
        if (!result.accepted || !Number.isSafeInteger(result.version)) throw new Error('云端确认无效');
        await this.store.ackPush(flight.requestId, result.version);
        local = await this.store.readSync();
        if (local.meta.dirty) { this.rerun = true; return this.onChange('pending'); }
      } else await this.store.noteSync(cloud.version, local.state.revision);
      await this.onChange('synced');
    } catch (error) {
      if (error instanceof ConflictError) { this.rerun = true; return this.onChange('pending'); }
      await this.onChange('offline', error.message);
    }
  }
}
