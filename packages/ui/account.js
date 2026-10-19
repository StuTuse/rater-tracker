import { createRegistration } from '../data/registration.js';
import { createSessionVault } from '../data/session-vault.js';
import { memoryAuthStorage } from '../data/memory-auth-storage.js';
import { usernameForAuth } from './username.js';
import cloudbase from './vendor/cloudbase.js';
export const CLOUD_ENV='rater-tracker-sync-d3cx88f64aea2';
const native=window.raterNative, desktop=window.desktop;
const memory=memoryAuthStorage();
const app=desktop ? null : cloudbase.init({env:CLOUD_ENV,region:'ap-shanghai',persistence:'none',auth:{detectSessionInUrl:false}});
const auth=app?.auth({persistence:'none',storage:memory});
const checked=result=>{if(result?.error)throw new Error(result.error.message||'账号操作失败');return result?.data??result;};
const vault=desktop ? null : createSessionVault({auth,memory,
 read:async()=>native ? native.sessionRead() : JSON.parse(localStorage.getItem('rater-web-session')??'null'),
 write:row=>native ? native.sessionWrite(row) : Promise.resolve(localStorage.setItem('rater-web-session',JSON.stringify(row))),
 clear:()=>native ? native.sessionClear() : Promise.resolve(localStorage.removeItem('rater-web-session'))
});
const registration=desktop ? null : createRegistration({signUp:async value=>checked(await auth.signUp(value)),signOut:async()=>checked(await auth.signOut())},label=>vault.verified(label));
export const touchAccount=()=>desktop ? desktop.accountTouch() : vault.touch();
export const currentAccount=()=>desktop ? desktop.accountCurrent() : vault.current();
export const loginAccount=(name,password)=>desktop ? desktop.accountLogin(name,password) : vault.login(usernameForAuth(name),password,name);
export const logoutAccount=async()=>{if(desktop)return desktop.accountLogout();registration.clear();await vault.logout();};
export const registerAccount=values=>desktop ? desktop.accountRegister(values) : registration.begin(values);
export const verifyRegistration=(id,token)=>desktop ? desktop.accountVerifyRegistration(id,token) : registration.confirm(id,token);
export const cancelRegistration=()=>registration?.clear();
export const cloudSync=data=>desktop ? desktop.accountSync(data) : vault.withSession(async identity=>{
 if(!identity || data.accountId && identity.id!==data.accountId)throw new Error('账号身份已变化，请重新登录后同步');
 return checked(await app.rdb().rpc('rater_sync',{p_type:data.type,p_base_version:data.baseVersion??0,p_request_id:data.requestId??null,p_state:data.state??null}));
});
