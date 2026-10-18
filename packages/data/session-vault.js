import { sessionIdentity } from './session-identity.js';

const IDLE = 30 * 86400000;
const unwrap = result => { if (result?.error) throw new Error(result.error.message || '账号操作失败'); return result?.data ?? result; };
const unavailable = error => /credentials not found|no session|unauthenticated|unauthorized|invalid.*token|refresh.*expired|invalid_grant|token.*expired/i.test(error.message ?? '');

// The SDK owns token renewal; the vault owns encrypted durable snapshots.
// Serialize both renewal and disk writes so an older token cannot win a race.
export function createSessionVault({ auth, read, write, clear, memory, now = () => Date.now() }) {
  let saved, restoring, serial = Promise.resolve(), disk = Promise.resolve(), expired = false;
  const enqueue = fn => { const task = serial.then(fn); serial = task.catch(() => {}); return task; };
  const persist = async (session, label = saved?.label ?? '') => {
    const identity = sessionIdentity({ session }, saved?.identity, label);
    if (!session?.access_token || !identity) return null;
    const row = { session, label, identity, lastActive:now(), storage:memory?.snapshot() };
    saved = row;
    const pending = disk.then(() => write(row)); disk = pending.catch(() => {}); await pending;
    return identity;
  };
  function restore() {
    if (!restoring) restoring = (async () => {
      saved = await read(); if (!saved) return;
      // Also accepts the previous Windows and Android encrypted shapes.
      if (!saved.session) saved = { session:saved, label:saved._raterLabel ?? '', identity:saved._raterIdentity ?? null, lastActive:saved._raterLastActive };
      saved.lastActive = saved.lastActive ?? saved.lastActiveAt;
      if (saved.needsLogin || Number.isFinite(saved.lastActive) && now() - saved.lastActive >= IDLE) { expired = true; await clear(); return; }
      saved.identity = sessionIdentity({session:saved.session},saved.identity,saved.label);
      if(saved.deviceId && memory)memory.setItemSync('device_id',saved.deviceId);
      if (saved.storage && memory) memory.replace(saved.storage);
      try { unwrap(await auth.setSession({ access_token:saved.session.access_token, refresh_token:saved.session.refresh_token })); }
      catch (error) { if (unavailable(error)) expired = true; /* Network failure keeps the offline identity and encrypted record. */ }
    })();
    return restoring;
  }
  async function session() {
    await restore();
    if (expired) throw new Error('登录已过期，请重新登录；本机记录仍保留');
    let data;
    try { data=unwrap(await auth.getSession()); }
    catch(error){if(!unavailable(error)||!saved?.session?.refresh_token)throw error;data=unwrap(await auth.refreshSession(saved.session.refresh_token));}
    if(!data?.session && saved?.session?.refresh_token)data=unwrap(await auth.refreshSession(saved.session.refresh_token));
    const token=data?.session;
    const expires=typeof token?.expires_at==='number' ? token.expires_at>1e12?token.expires_at:token.expires_at*1000 : Date.parse(token?.expires_at??'');
    if (Number.isFinite(expires) && expires <= now() + 60000 && token.refresh_token) data = unwrap(await auth.refreshSession(token.refresh_token));
    if (!data?.session) throw new Error('当前未登录，请登录后同步');
    await persist(data.session); return data;
  }
  // SDK rotation callbacks can run inside setSession/getSession; never await
  // this queue from the callback itself (that would deadlock renewal).
  auth.onAuthStateChange?.((_event, next) => {
    if (!expired && next?.access_token && saved?.identity?.id === next.sub) enqueue(async()=>{if(expired)return;const latest=unwrap(await auth.getSession());await persist(latest?.session);}).catch(()=>{});
  });
  return {
    current: () => enqueue(async () => {
      await restore(); if (expired) return null;
      try { const data = await session(); return sessionIdentity(data,saved?.identity,saved?.label); }
      catch (error) { if (unavailable(error) || expired) return null; if (saved?.identity) { saved.lastActive=now(); const row=structuredClone(saved); const pending=disk.then(()=>write(row));disk=pending.catch(()=>{});await pending;return saved.identity; } throw error; }
    }),
    login: (username,password,label=username) => enqueue(async () => { await restore(); expired=false; const data=unwrap(await auth.signInWithPassword({username,password})); const identity=sessionIdentity(data,null); if(!identity)throw new Error('未获得已验证账号身份');saved={identity,label,lastActive:now()};await persist(data.session,label);return saved.identity; }),
    verified: label => enqueue(async () => { expired=false;const data=unwrap(await auth.getSession());const identity=sessionIdentity(data,null,label);if(!identity)throw new Error('未获得已验证账号身份');saved={identity,label,lastActive:now()};await persist(data.session,label);return saved.identity; }),
    withSession: operation => enqueue(async () => {
      let data=await session(), identity=sessionIdentity(data,saved?.identity,saved?.label), result;
      try{result=await operation(identity);}
      catch(error){
        if(!unavailable(error)||!saved?.session?.refresh_token)throw error;
        data=unwrap(await auth.refreshSession(saved.session.refresh_token));const renewed=sessionIdentity(data,saved.identity,saved.label);
        if(!renewed || renewed.id!==identity?.id)throw new Error('账号身份已变化，请重新登录后同步');
        await persist(data.session);result=await operation(renewed);
      }
      const latest=unwrap(await auth.getSession());await persist(latest?.session);return result;
    }),
    logout: () => enqueue(async () => { await restore(); try { unwrap(await auth.signOut()); } catch(error) { if(!unavailable(error)) throw error; } expired=true;await disk;await clear();saved=null;memory?.clear(); }),
    get identity() { return !expired ? saved?.identity ?? null : null; }
  };
}
