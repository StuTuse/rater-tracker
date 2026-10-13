import { createRegistration } from '../data/registration.js';
import { sessionIdentity } from '../data/session-identity.js';
import { memoryAuthStorage } from '../data/memory-auth-storage.js';
import cloudbase from './vendor/cloudbase.js';
import { usernameForAuth } from './username.js';
export const CLOUD_ENV='rater-tracker-sync-d3cx88f64aea2';
const native=window.raterNative;
let bootSession=null;if(native){try{bootSession=await native.sessionRead();}catch{}}
const credentialMemory=memoryAuthStorage({...bootSession?.storage,...(bootSession?.deviceId?{device_id:bootSession.deviceId}:{})});
const app=cloudbase.init({env:CLOUD_ENV,region:'ap-shanghai',persistence:native?'none':'local',auth:{detectSessionInUrl:false}});
const auth=app.auth(native?{persistence:'none',storage:credentialMemory}:undefined);let usernameLabel='',restoring,offlineIdentity;
function checked(r){if(r?.error)throw new Error(r.error.message||'账号操作失败');return r?.data??r;}
async function request(promise){try{return checked(await promise);}catch(error){if(native&&/credentials not found|no session/i.test(error.message??''))throw new Error('当前未登录，请登录后同步');if(native&&/unauthenticated|expired|unauthorized|invalid.*token/i.test(error.message??''))throw new Error('登录已过期，请退出后重新登录');if(native&&/FetchError|fetch|network|timeout|Socket|DNS|Unable to resolve|ECONN/i.test(error.message??''))throw new Error('网络暂时无法连接，请联网后重试');throw error;}}
function identity(data){return sessionIdentity(data,native?offlineIdentity:null,usernameLabel);}
async function restore(){
 if(!native)return;
 if(!restoring)restoring=(async()=>{const saved=bootSession;if(!saved)return;usernameLabel=saved.label??'';offlineIdentity=saved.identity??null;try{if(!saved.storage)await request(auth.setSession({access_token:saved.session.access_token,refresh_token:saved.session.refresh_token}));}catch{/* Offline local account remains available; sync reports network/auth errors. */}})();
 await restoring;
}
async function persist(){const data=await request(auth.getSession());const account=identity(data);if(native&&data?.session){await native.sessionWrite({session:data.session,label:usernameLabel,identity:account,deviceId:credentialMemory.getItemSync('device_id'),storage:credentialMemory.snapshot()});offlineIdentity=account;}return account;}
if(native)auth.onAuthStateChange((event,session)=>{if(session?.sub!==offlineIdentity?.id||!session?.access_token)return;const account=sessionIdentity({session},offlineIdentity,usernameLabel);if(!account)return;native.sessionWrite({session,label:usernameLabel,identity:account,deviceId:credentialMemory.getItemSync('device_id'),storage:credentialMemory.snapshot()}).catch(()=>{});});
export async function currentAccount(){if(window.desktop)return window.desktop.accountCurrent();await restore();try{return await persist()??offlineIdentity;}catch(error){if(native&&offlineIdentity)return offlineIdentity;if(/credentials not found|no session|当前未登录/i.test(error.message))return null;throw error;}}
export async function loginAccount(username,password){const canonical=usernameForAuth(username);if(window.desktop)return window.desktop.accountLogin(username,password);await restore();await request(auth.signInWithPassword({username:canonical,password}));usernameLabel=username;const account=await persist();if(!account)throw new Error('未获得有效账号身份');return account;}
export async function logoutAccount(){if(window.desktop)return window.desktop.accountLogout();const saved=native?await native.sessionRead():null;try{await request(auth.signOut());}catch(error){if(!/credentials not found|no session|unauthenticated|expired|当前未登录|登录已过期/i.test(error.message??'')){if(native&&saved?.storage)credentialMemory.replace(saved.storage);throw error;}}if(native){await native.sessionClear();credentialMemory.clear();}usernameLabel='';offlineIdentity=null;registration.clear();}
const registration=createRegistration({signUp:v=>request(auth.signUp(v)),signOut:()=>request(auth.signOut())},async label=>{usernameLabel=label;return persist();});
export function cancelRegistration(){if(!window.desktop)registration.clear();}
export async function registerAccount(values){if(window.desktop)return window.desktop.accountRegister(values);await restore();return registration.begin(values);}
export async function verifyRegistration(id,token){if(window.desktop)return window.desktop.accountVerifyRegistration(id,token);return registration.confirm(id,token);}
export async function cloudSync(data){if(window.desktop)return window.desktop.accountSync(data);await restore();if(native&&data.accountId){const session=(await request(auth.getSession()))?.session;if(session?.sub!==data.accountId)throw new Error('账号身份已变化，请退出后重新登录再同步');}const result=await request(app.rdb().rpc('rater_sync',{p_type:data.type,p_base_version:data.baseVersion??0,p_request_id:data.requestId??null,p_state:data.state??null}));await persist();return result;}
