import { validateState } from './storage.js';
export class SyncEngine {
  constructor(store, remote, onChange = () => {}) { this.store = store; this.remote = remote; this.onChange = onChange; this.running = null; }
  run() { if (!this.running) this.running = this.perform().finally(() => { this.running = null; }); return this.running; }
  async perform() {
    let local = await this.store.readSync();
    if (local.meta.conflict !== null) return this.onChange('conflict');
    try {
      if (local.meta.dirty || local.meta.inFlight) {
        const flight = await this.store.beginPush();
        const result = await this.remote({ type: 'push', ...flight });
        if (result.conflict) { await this.store.markConflict(result.version); return this.onChange('conflict'); }
        if (!result.accepted || !Number.isSafeInteger(result.version)) throw new Error('云端确认无效');
        await this.store.ackPush(flight.requestId, result.version);
        local = await this.store.readSync();
        if (local.meta.dirty) return this.onChange('pending');
      }
      const result = await this.remote({ type: 'pull' });
      if (result.state) {
        validateState(result.state);
        await this.store.acceptPull(result.state, result.version, local.state.revision);
      }
      this.onChange('synced');
    } catch (error) { this.onChange('offline', error.message); }
  }
}
