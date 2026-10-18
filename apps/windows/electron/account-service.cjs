const cloudbase=require('./cloudbase.cjs').default;
const fs=require('node:fs/promises'),path=require('node:path');
module.exports=function createAccountService(directory,safeStorage){
 const sessionPath=path.join(directory,'account-session.bin');
 const service=(async()=>{
  const {createSessionKeeper,checkedAuth,SESSION_IDLE_MS,shouldRestoreAccountSession}=await import('../../../packages/data/auth-session.js');
  const {memoryAuthStorage}=await import('../../../packages/data/memory-auth-storage.js');
  const {usernameForAuth}=await import('../../../packages/core/username.js');
  let initial=null;try{if(safeStorage.isEncryptionAvailable())initial=JSON.parse(safeStorage.decryptString(await fs.readFile(sessionPath)));}catch{}
  const idle=initial?.lastActiveAt&&Date.now()-initial.lastActiveAt>=SESSION_IDLE_MS;
  let hasLocalSession=shouldRestoreAccountSession(initial);
  const storage=memoryAuthStorage(idle?{}:{...initial?.storage,...(initial?.deviceId?{device_id:initial.deviceId}:{})});
  const app=cloudbase.init({env:'rater-tracker-sync-d3cx88f64aea2',region:'ap-shanghai',persistence:'none'});
  const auth=app.auth({persistence:'none',storage});
  const keeper=createSessionKeeper({auth,storage,initial,write:async data=>{if(!safeStorage.isEncryptionAvailable())return;await fs.mkdir(directory,{recursive:true});const temp=sessionPath+'.tmp';await fs.writeFile(temp,safeStorage.encryptString(JSON.stringify(data)));await fs.rename(temp,sessionPath);},clear:()=>fs.rm(sessionPath,{force:true})});
  const registration=require('./registration.cjs')(auth,name=>keeper.accept(name));
  return{
   current:()=>hasLocalSession?keeper.current():Promise.resolve(null),touch:()=>keeper.touch(),
   register:async values=>{await keeper.restore();return registration.begin(values);},
   verifyRegistration:async(id,code)=>{const identity=await registration.confirm(id,code);hasLocalSession=true;return identity;},
   login:async(username,password)=>{if(typeof username!=='string'||typeof password!=='string'||username.length>25||password.length>128)throw Error('账号输入无效');await keeper.restore();checkedAuth(await auth.signInWithPassword({username:usernameForAuth(username),password}));const identity=await keeper.accept(username);hasLocalSession=true;return identity;},
   logout:async()=>{registration.clear();await keeper.logout();hasLocalSession=false;},
   sync:async data=>{if(!['pull','push'].includes(data?.type))throw Error('同步请求无效');return keeper.run(()=>app.rdb().rpc('rater_sync',{p_type:data.type,p_base_version:data.baseVersion??0,p_request_id:data.requestId??null,p_state:data.state??null}),data.accountId);}
  };
 })();
 return Object.fromEntries(['current','touch','register','verifyRegistration','login','logout','sync'].map(name=>[name,async(...args)=>(await service)[name](...args)]));
};
