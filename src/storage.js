import { createState, FORMAT_VERSION, RULE_VERSION, DIMENSIONS, validDate, taskPlan, SCALE, mul } from './core.js';

export class ConflictError extends Error { constructor() { super('其他窗口已保存更新。已载入最新数据，请重新执行本次操作。'); } }
export async function openStore(accountId = null) {
  const key = accountId ? `account:${accountId}` : 'current';
  const metaKey = `${key}:sync`;
  const defaults = () => ({ baseVersion: 0, dirty: false, inFlight: null, conflict: null, lastSync: null });
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('rater-tracker', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('snapshots');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('数据升级被另一窗口阻止，请关闭旧窗口后重试。'));
  });
  db.onversionchange = () => db.close();
  const read = () => new Promise((resolve, reject) => {
    const request = db.transaction('snapshots').objectStore('snapshots').get(key);
    request.onsuccess = () => resolve(request.result ?? createState());
    request.onerror = () => reject(request.error);
  });
  const write = (state, expectedRevision) => new Promise((resolve, reject) => {
    const tx = db.transaction('snapshots', 'readwrite'), store = tx.objectStore('snapshots');
    let conflict = false, writeError;
    const request = store.get(key);
    request.onsuccess = () => {
      if ((request.result?.revision ?? 0) !== expectedRevision) { conflict = true; tx.abort(); }
      else { try {
        store.put(state, key);
        if (accountId) { const meta = store.get(metaKey); meta.onsuccess = () => store.put({ ...(meta.result ?? defaults()), dirty: true }, metaKey); }
      } catch (error) { writeError = error; tx.abort(); } }
    };
    tx.oncomplete = () => resolve(state);
    tx.onabort = () => reject(conflict ? new ConflictError() : writeError ?? tx.error ?? new Error('本次尚未保存，请重试。'));
    tx.onerror = () => {}; // abort owns the single rejection.
  });
  const mutateSync = callback => new Promise((resolve, reject) => {
    const tx = db.transaction('snapshots', 'readwrite'), records = tx.objectStore('snapshots');
    let result, failure;
    const stateRequest = records.get(key);
    stateRequest.onsuccess = () => {
      const metaRequest = records.get(metaKey);
      metaRequest.onsuccess = () => {
        try {
          const pair = { state: stateRequest.result ?? createState(), meta: metaRequest.result ?? defaults() };
          result = callback(pair);
          records.put(pair.state, key); records.put(pair.meta, metaKey);
        } catch (error) { failure = error; tx.abort(); }
      };
    };
    tx.oncomplete = () => resolve(result);
    tx.onabort = () => reject(failure ?? tx.error ?? new Error('同步保存失败'));
    tx.onerror = () => {};
  });
  return {
    read, write, close: () => db.close(),
    readSync: () => mutateSync(pair => structuredClone(pair)),
    beginPush: () => mutateSync(pair => {
      if (!pair.meta.inFlight) pair.meta.inFlight = { requestId: crypto.randomUUID(), baseVersion: pair.meta.baseVersion, state: structuredClone(pair.state) };
      return structuredClone(pair.meta.inFlight);
    }),
    ackPush: (requestId, version) => mutateSync(pair => {
      if (pair.meta.inFlight?.requestId !== requestId) throw new Error('同步确认不匹配');
      pair.meta.dirty = pair.state.revision !== pair.meta.inFlight.state.revision;
      pair.meta.baseVersion = version; pair.meta.inFlight = null; pair.meta.lastSync = new Date().toISOString();
    }),
    markConflict: version => mutateSync(pair => { pair.meta.conflict = version; }),
    acceptPull: (incoming, version, expectedRevision) => mutateSync(pair => {
      if (pair.meta.dirty || pair.meta.inFlight || pair.state.revision !== expectedRevision) throw new ConflictError();
      if (version < pair.meta.baseVersion) throw new Error('云端版本回退');
      if (version > pair.meta.baseVersion) { pair.state = structuredClone(incoming); pair.state.revision = expectedRevision + 1; }
      pair.meta.baseVersion = version; pair.meta.lastSync = new Date().toISOString();
    }),
    useCloud: (incoming, version, expectedRevision) => mutateSync(pair => {
      if (pair.state.revision !== expectedRevision) throw new ConflictError();
      pair.state = structuredClone(incoming); pair.state.revision = expectedRevision + 1;
      pair.meta = { ...defaults(), baseVersion: version, lastSync: new Date().toISOString() };
    })
  };
}
const check = (condition, message) => { if (!condition) throw new Error(`备份校验失败：${message}`); };
const plain = value => value && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
const str = (value, max = 4000) => typeof value === 'string' && value.length <= max;
const safeId = value => typeof value === 'string' && /^[A-Za-z0-9:_/-]{1,300}$/.test(value) && !['__proto__', 'constructor', 'prototype'].includes(value);
const integer = value => Number.isSafeInteger(value) && value >= 0 && value <= 1e14;
const timestamp = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
export function validateState(s) {
  check(plain(s) && s.format === FORMAT_VERSION && s.rule === RULE_VERSION, '不支持的数据格式或规则版本');
  check(integer(s.revision) && integer(s.sequence), '版本序号无效');
  check(plain(s.ratings) && plain(s.tasks) && Array.isArray(s.ledger) && Array.isArray(s.processed), '记录结构无效');
  check(s.ledger.length <= 500000 && Object.keys(s.tasks).length <= 50000 && Object.keys(s.ratings).length <= 50000, '记录数量超过本版本支持范围');
  const ids = new Set(), ledger = new Map();
  let total = 0;
  for (const e of s.ledger) {
    check(plain(e) && safeId(e.id) && !ids.has(e.id) && safeId(e.owner) && str(e.kind, 100), '结算标识重复或无效');
    ids.add(e.id); ledger.set(e.id, e);
    validDate(e.date);
    check(timestamp(e.recordedAt) && integer(e.normal) && integer(e.actual) && typeof e.active === 'boolean' && e.rule === RULE_VERSION && integer(e.sequence) && e.sequence <= s.sequence, '结算金额或元数据无效');
    check(plain(e.factor) && integer(e.factor.numerator) && e.factor.numerator > 0 && integer(e.factor.denominator) && e.factor.denominator > 0 && e.factor.numerator <= e.factor.denominator && integer(e.factor.delay), '折扣无效');
    check(e.actual === mul(e.normal, e.factor.numerator, e.factor.denominator), '实际金额与冻结分配不一致');
    if (e.active) total += e.actual;
  }
  check(Number.isSafeInteger(total), '总经验超出精度范围');
  const referenced = new Set();
  const ref = (id, owner, active) => { const e = ledger.get(id); check(e && e.owner === owner && (active === undefined || e.active === active), '缺少关联结算或有效状态不一致'); referenced.add(id); return e; };
  for (const [date, day] of Object.entries(s.ratings)) {
    validDate(date); check(plain(day), '每日评分格式无效');
    for (const [dimension, r] of Object.entries(day)) {
      check(DIMENSIONS.includes(dimension) && plain(r) && Number.isInteger(r.stars) && r.stars >= 0 && r.stars <= 5 && str(r.note) && Array.isArray(r.batches) && r.batches.length === r.stars, '评分批次无效');
      const owner = `${date}/${dimension}`;
      check(ref(r.base, owner, true).normal === 5 * SCALE, '评分基础额度无效');
      check(new Set(r.batches).size === r.batches.length, '评分批次重复');
      for (const id of r.batches) check(ref(id, owner, true).normal === 2 * SCALE, '星数额度无效');
    }
  }
  for (const [id, t] of Object.entries(s.tasks)) {
    check(plain(t) && t.id === id && safeId(id) && str(t.title, 160) && t.title.length > 0 && str(t.goal) && (DIMENSIONS.includes(t.dimension) || t.dimension === '') && timestamp(t.createdAt), '任务信息无效');
    validDate(t.start); validDate(t.target); validDate(t.deadline); taskPlan(t);
    check(['archived', 'hidden', 'deleted'].every(k => typeof t[k] === 'boolean') && Array.isArray(t.progress) && Array.isArray(t.stages), '任务状态无效');
    check(ref(t.creation, id, t.deleted ? false : true).normal === 2 * SCALE, '创建额度无效');
    check(t.stages.every(stage => plain(stage) && safeId(stage.id) && str(stage.name) && typeof stage.done === 'boolean'), '阶段格式无效');
    if (t.frozen) {
      const p = taskPlan({ ...t, ...t.frozen });
      check(t.frozen.rule === RULE_VERSION && p.e === t.frozen.e && p.days === t.frozen.days && p.tier === t.frozen.tier, '冻结计划无效');
    }
    const progressIds = new Set();
    for (const p of t.progress) {
      check(plain(p) && safeId(p.id) && !progressIds.has(p.id) && str(p.note) && timestamp(p.recordedAt) && typeof p.active === 'boolean' && typeof p.retained === 'boolean' && t.frozen, '推进格式无效');
      progressIds.add(p.id); validDate(p.date);
      check(p.date >= t.frozen.start, '推进早于冻结开始日期');
      ref(p.entry, id, p.active && !t.deleted);
    }
    const completions = [...(t.completionHistory ?? []), ...(t.completion ? [t.completion] : [])];
    for (const c of completions) {
      check(plain(c) && t.frozen && safeId(c.id) && str(c.note) && typeof c.active === 'boolean' && Number.isInteger(c.c) && c.c >= 100 && c.c <= 160 && str(c.window, 100) && timestamp(c.recordedAt) && integer(c.sequence) && Array.isArray(c.slices), '完成冻结信息无效');
      validDate(c.date); ref(c.base, id, c.active && !t.deleted);
      for (const slice of c.slices) ref(slice, id, c.active && !t.deleted ? undefined : false);
      check(!(c.active && c !== t.completion), '历史完成不能仍然有效');
    }
    if (t.deleted) check(s.ledger.filter(e => e.owner === id).every(e => !e.active), '已删除任务仍有有效所得');
  }
  for (const e of s.ledger) check(!e.active || referenced.has(e.id), '孤立的有效结算');
  check(s.processed.every(id => safeId(id)) && new Set(s.processed).size === s.processed.length, '幂等操作标识无效');
  check(plain(s.settings) && ['full', 'gentle', 'off'].includes(s.settings.motion) && plain(s.settings.references) && DIMENSIONS.every(d => str(s.settings.references[d])) && (s.settings.lastExport === null || timestamp(s.settings.lastExport)), '设置格式无效');
  return s;
}
export function backupText(state, now = new Date().toISOString()) {
  return JSON.stringify({ application: 'rater-tracker', format: FORMAT_VERSION, exportedAt: now, state }, null, 2);
}
export function parseBackup(text) {
  check(typeof text === 'string' && text.length <= 64 * 1024 * 1024, '文件过大');
  const backup = JSON.parse(text);
  check(backup.application === 'rater-tracker' && backup.format === FORMAT_VERSION && timestamp(backup.exportedAt), '不是本应用的完整备份');
  return validateState(backup.state);
}
