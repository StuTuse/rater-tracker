import { sessionIdentity } from './session-identity.js';
export const SESSION_IDLE_MS=30*24*60*60*1000;
export const shouldRestoreAccountSession=initial=>!!(initial&&typeof initial==='object'&&(initial.identity?.id||initial.session?.access_token||initial.session?.sub||initial.access_token||initial.sub));
export const checkedAuth=result=>{if(result?.error)throw new Error(result.error.message||'认证操作失败');return result?.data??result;};
const authError=e=>/credentials not found|no session|unauthenticated|unauthorized|expired|invalid.*token|登录已过期/i.test(e.message??'');
export function createSessionKeeper({auth,storage,initial=null,write,clear,now=Date.now,foreground=()=>true}) {
  let label=initial?.label??initial?._raterLabel??'',verified=initial?.identity??null,lastActiveAt=Number(initial?.lastActiveAt)||now();
  const legacy=initial?.session??initial;
  if(!verified&&legacy?.sub)verified=sessionIdentity({session:legacy},{id:legacy.sub,name:label||'我的账号'},label);
  if(verified&&legacy?.sub!==verified.id)verified=null;
  let needsLogin=initial?.needsLogin===true||now()-lastActiveAt>=SESSION_IDLE_MS,restoring,refreshing,writes=Promise.resolve(),epoch=0;
  const requireLogin=()=>{const error=new Error('登录已过期，请重新登录后同步；本机记录已保留');error.code='AUTH_REQUIRED';return error;};
  function serializedWrite() {
    const generation=epoch;
    writes=writes.catch(()=>{}).then(async()=>{
      if(generation!==epoch)return;
      const data=checkedAuth(await auth.getSession()),identity=sessionIdentity(data,verified,label);
      if(!data?.session||!identity)return;
      verified=identity;
      await write({session:data.session,label,identity,storage:storage.snapshot(),deviceId:storage.getItemSync('device_id'),lastActiveAt,needsLogin});
    });
    return writes;
  }
  async function restore() {
    if(!restoring)restoring=(async()=>{if(initial&&!initial.storage&&legacy?.access_token&&!needsLogin){try{const data=checkedAuth(await auth.setSession({access_token:legacy.access_token,refresh_token:legacy.refresh_token}));verified=sessionIdentity(data,verified,label)??verified;}catch(e){if(authError(e))needsLogin=true;}}})();
    await restoring;
  }
  async function refresh() {
    if(!refreshing)refreshing=(async()=>{try{checkedAuth(await auth.refreshSession());await serializedWrite();}catch(e){if(authError(e))needsLogin=true;throw e;}})().finally(()=>{refreshing=null;});
    return refreshing;
  }
  const current=async()=>{
    await restore();if(now()-lastActiveAt>=SESSION_IDLE_MS)needsLogin=true;
    if(needsLogin)return verified?{...verified,needsLogin:true}:null;
    try{const data=checkedAuth(await auth.getSession());const identity=sessionIdentity(data,verified,label);if(!identity){if(verified){needsLogin=true;return{...verified,needsLogin:true};}return null;}verified=identity;await serializedWrite();return identity;}
    catch(e){
      if(authError(e)){
        try{await refresh();const data=checkedAuth(await auth.getSession()),identity=sessionIdentity(data,verified,label);if(identity&&(!verified||identity.id===verified.id)){verified=identity;needsLogin=false;await serializedWrite();return identity;}needsLogin=true;}
        catch(refreshError){if(authError(refreshError))needsLogin=true;else if(!verified)throw refreshError;}
      }
      if(verified)return{...verified,...(needsLogin?{needsLogin:true}:{offline:true})};throw e;
    }
  };
  if(auth.onAuthStateChange)auth.onAuthStateChange((event,session)=>{
    if(session?.sub===verified?.id&&session?.access_token&&!needsLogin)queueMicrotask(()=>serializedWrite().catch(()=>{}));
  });
  return {
    restore,current,
    async accept(name){await restore();label=name;const data=checkedAuth(await auth.getSession());const sub=data?.session?.sub;const identity=sessionIdentity(data,sub?{id:sub,name}:null,name);if(!identity)throw new Error('未获得有效账号身份');verified=identity;needsLogin=false;lastActiveAt=now();await serializedWrite();return identity;},
    async touch(){if(!foreground()||needsLogin||!verified||now()-lastActiveAt<60000)return;lastActiveAt=now();await serializedWrite();},
    async run(operation,expectedId){
      await restore();
      if(needsLogin||now()-lastActiveAt>=SESSION_IDLE_MS)throw requireLogin();
      let identity=verified;
      try {
        const data=checkedAuth(await auth.getSession());
        identity=sessionIdentity(data,verified,label);
        if(!identity||expectedId&&identity.id!==expectedId)throw requireLogin();
        const result=checkedAuth(await operation());
        verified=identity;await serializedWrite();return result;
      } catch(error) {
        if(error?.code==='AUTH_REQUIRED'||!authError(error))throw error;
        await refresh();
        const next=sessionIdentity(checkedAuth(await auth.getSession()),verified,label);
        if(!next||identity?.id&&next.id!==identity.id||expectedId&&next.id!==expectedId)throw requireLogin();
        const result=checkedAuth(await operation());
        verified=next;await serializedWrite();return result;
      }
    },
    async logout(){await restore();try{checkedAuth(await auth.signOut());}catch(e){if(!authError(e))throw e;}epoch++;await writes.catch(()=>{});await clear();storage.clear();verified=null;needsLogin=false;initial=null;},
    async settled(){await writes.catch(()=>{});},
  };
}
