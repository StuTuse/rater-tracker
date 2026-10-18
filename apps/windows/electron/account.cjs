const cloudbase = require('./cloudbase.cjs').default;
const fs = require('node:fs/promises');
const path = require('node:path');
module.exports = function createAccountService(directory, safeStorage) {
  const ready = (async()=>{
    const { createSessionVault } = await import('../../../packages/data/session-vault.js');
    const { memoryAuthStorage } = await import('../../../packages/data/memory-auth-storage.js');
    const { usernameForAuth } = await import('../../../packages/core/username.js');
    const memory=memoryAuthStorage();
    const app=cloudbase.init({env:'rater-tracker-sync-d3cx88f64aea2',region:'ap-shanghai',persistence:'none'});
    const auth=app.auth({persistence:'none',storage:memory});
    const file=path.join(directory,'account-session.bin');
    const vault=createSessionVault({auth,memory,
      read:async()=>{try{if(!safeStorage.isEncryptionAvailable())return null;return JSON.parse(safeStorage.decryptString(await fs.readFile(file)));}catch{return null;}},
      write:async row=>{if(!safeStorage.isEncryptionAvailable())return;await fs.mkdir(directory,{recursive:true});const temp=file+'.tmp';await fs.writeFile(temp,safeStorage.encryptString(JSON.stringify(row)));await fs.rename(temp,file);},
      clear:()=>fs.rm(file,{force:true})
    });
    const checked=r=>{if(r?.error)throw new Error(r.error.message||'账号操作失败');return r?.data??r;};
    const registration=require('./registration.cjs')(auth,label=>vault.verified(label));
    return {current:()=>vault.current(),
      login:(name,password)=>vault.login(usernameForAuth(name),password,name),
      register:values=>registration.begin(values),verifyRegistration:(id,code)=>registration.confirm(id,code),
      logout:async()=>{registration.clear();await vault.logout();},
      sync:data=>vault.withSession(async identity=>{
        if(!identity || data.accountId && data.accountId!==identity.id)throw new Error('账号身份已变化，请重新登录后同步');
        if(!['pull','push'].includes(data?.type))throw new Error('同步请求无效');
        return checked(await app.rdb().rpc('rater_sync',{p_type:data.type,p_base_version:data.baseVersion??0,p_request_id:data.requestId??null,p_state:data.state??null}));
      })};
  })();
  return Object.fromEntries(['current','login','register','verifyRegistration','logout','sync'].map(method=>[method,async(...args)=>(await ready)[method](...args)]));
};
