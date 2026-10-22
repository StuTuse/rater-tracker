import { sessionIdentity } from './session-identity.js';

const IDLE = 30 * 86400000;
const unwrap = result => { if (result?.error) { const error=new Error(result.error.message || '账号操作失败');error.code=result.error.code??result.error.error;throw error; } return result?.data ?? result; };
const unavailable = error => /credentials not found|no session|unauthenticated|unauthorized|invalid.*token|refresh.*expired|invalid_grant|token.*expired|登录已过期/i.test(error.message ?? '');
// Only an explicit rejection of the long-lived grant requires a password.
// A missing SDK cache, short-lived access token or generic 401 is recoverable.
const revoked = error => /invalid_grant|refresh[_ -]?token.*(?:expired|revoked|invalid)|(?:expired|revoked|invalid).*refresh[_ -]?token/i.test(`${error.code??''} ${error.message??''}`);

// The SDK owns token renewal; the vault owns encrypted durable snapshots.
// Serialize both renewal and disk writes so an older token cannot win a race.
export function createSessionVault({ auth, read, write, clear, memory, now = () => Date.now() }) {
  let saved, loading, restoring, serial = Promise.resolve(), disk = Promise.resolve(), expired = false;
  const enqueue = fn => { const task = serial.then(fn); serial = task.catch(() => {}); return task; };
  const renew = async () => {
    try {return unwrap(await auth.refreshSession(saved.session.refresh_token));}
    catch(error){
      if(revoked(error)||!(/credentials not found|no session|no refresh token|cannot set properties of null|cannot read properties of null/i.test(error.message??'')))throw error;
      return unwrap(await auth.setSession({access_token:saved.session.access_token,refresh_token:saved.session.refresh_token}));
    }
  };
  const persist = async (session, label = saved?.label ?? '') => {
    const identity = sessionIdentity({ session }, saved?.identity, label);
    if (expired || !session?.access_token || !identity) return null;
    const row = { session, label, identity, lastActive:saved?.lastActive ?? now(), storage:memory?.snapshot() };
    saved = row;
    const pending = disk.then(() => write(row)); disk = pending.catch(() => {}); await pending;
    return identity;
  };
  function load() {
    if (!loading) loading = (async () => {
      saved = await read(); if (!saved) return;
      // Also accepts the previous Windows and Android encrypted shapes.
      if (!saved.session) saved = { session:saved, label:saved._raterLabel ?? '', identity:saved._raterIdentity ?? null, lastActive:saved._raterLastActive };
      saved.lastActive = saved.lastActive ?? saved.lastActiveAt;
      if (saved.needsLogin || Number.isFinite(saved.lastActive) && now() - saved.lastActive >= IDLE) { expired = true; await clear(); return; }
      saved.identity = sessionIdentity({session:saved.session},saved.identity,saved.label);
      if (saved.storage && memory) memory.replace(saved.storage);
      if(saved.deviceId && memory)memory.setItemSync('device_id',saved.deviceId);
      saved.lastActive ??= now();
    })();
    return loading;
  }
  function restore() {
    if (!restoring) restoring = (async () => {
      await load();if(!saved || expired)return;
      try {
        // setSession rotates credentials in the bundled SDK. Reuse its encrypted
        // cache first, then persist any renewal before continuing startup.
        let data=saved.storage&&memory ? unwrap(await auth.getSession()) : null;
        if(!data?.session)data=unwrap(await auth.setSession({ access_token:saved.session.access_token, refresh_token:saved.session.refresh_token }));
        await persist(data.session);
      }
      catch (error) {
        // An expired access token does not expire the remembered login. The SDK
        // must be allowed to rotate the durable refresh token first.
        if (!unavailable(error)) {restoring=null;return;}
        if(saved.session.refresh_token) {
          // refreshSession in this SDK requires a cache entry; setSession can
          // recover it after credentials_error cleared that entry.
          try { const data=await renew();await persist(data.session); }
          catch(next) { if(revoked(next))saved.needsLogin=true;else restoring=null; }
        } else saved.needsLogin=true;
      }
    })();
    return restoring;
  }
  const checkIdle = async () => {
    if(saved && now()-saved.lastActive>=IDLE && !expired) {expired=true;await disk;await clear();}
    return expired;
  };
  const activity = async () => {
    if(await checkIdle() || !saved?.identity || saved.needsLogin)return false;
    const row={...saved,lastActive:now()};saved=row;
    const pending=disk.then(()=>write(row));disk=pending.catch(()=>{});await pending;return true;
  };
  async function session() {
    await restore();
    if (await checkIdle() || saved?.needsLogin) throw new Error('登录已过期，请重新登录；本机记录仍保留');
    let data;
    try { data=unwrap(await auth.getSession()); }
    catch(error){if(!unavailable(error)||!saved?.session?.refresh_token)throw error;data=await renew();}
    if(!data?.session && saved?.session?.refresh_token)data=await renew();
    const token=data?.session;
    const expires=typeof token?.expires_at==='number' ? token.expires_at>1e12?token.expires_at:token.expires_at*1000 : Date.parse(token?.expires_at??'');
    if (Number.isFinite(expires) && expires <= now() + 60000 && token.refresh_token) data = unwrap(await auth.refreshSession(token.refresh_token));
    if (!data?.session) throw new Error('当前未登录，请登录后同步');
    const identity=sessionIdentity(data,saved?.identity,saved?.label);
    if(!identity || saved?.identity && identity.id!==saved.identity.id)throw new Error('账号身份已变化，请重新登录后同步');
    await persist(data.session); return data;
  }
  // SDK rotation callbacks can run inside setSession/getSession; never await
  // this queue from the callback itself (that would deadlock renewal).
  auth.onAuthStateChange?.((_event, next) => {
    if (!expired && next?.access_token && saved?.identity?.id === next.sub) enqueue(async()=>{if(expired)return;const latest=unwrap(await auth.getSession());await persist(latest?.session);}).catch(()=>{});
  });
  return {
    current: () => enqueue(async () => {
      await load(); if (await checkIdle()) return null;
      if(saved?.needsLogin)return {...saved.identity,needsLogin:true};
      await activity();
      try { const data = await session(); return sessionIdentity(data,saved?.identity,saved?.label); }
      catch (error) { if(expired)return null;if(saved?.identity)return {...saved.identity,...(saved.needsLogin||revoked(error)?{needsLogin:true}:{})};if(unavailable(error))return null;throw error; }
    }),
    login: (username,password,label=username) => enqueue(async () => { await restore(); const data=unwrap(await auth.signInWithPassword({username,password})); const identity=sessionIdentity(data,null); if(!identity)throw new Error('未获得已验证账号身份');expired=false;saved={identity,label,lastActive:now()};await persist(data.session,label);return saved.identity; }),
    verified: label => enqueue(async () => {const data=unwrap(await auth.getSession());const identity=sessionIdentity(data,null,label);if(!identity)throw new Error('未获得已验证账号身份');expired=false;saved={identity,label,lastActive:now()};await persist(data.session,label);return saved.identity; }),
    // Local activity must reach disk even if the SDK's network request hangs.
    // Token mutations still serialize above; activity only copies the latest row.
    touch: async () => {await load();return activity();},
    withSession: operation => enqueue(async () => {
      let data=await session(), identity=sessionIdentity(data,saved?.identity,saved?.label), result;
      try{result=await operation(identity);}
      catch(error){
        if(!unavailable(error)||!saved?.session?.refresh_token)throw error;
        data=await renew();const renewed=sessionIdentity(data,saved.identity,saved.label);
        if(!renewed || renewed.id!==identity?.id)throw new Error('账号身份已变化，请重新登录后同步');
        await persist(data.session);result=await operation(renewed);
      }
      const latest=unwrap(await auth.getSession());await persist(latest?.session);return result;
    }),
    logout: () => enqueue(async () => { await restore(); try { unwrap(await auth.signOut()); } catch(error) { if(!unavailable(error)) throw error; } expired=true;await disk;await clear();saved=null;memory?.clear(); }),
    get identity() { return !expired ? saved?.identity ?? null : null; }
  };
}
