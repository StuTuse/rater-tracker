import { createRegistration } from '../data/registration.js';
import { createSessionKeeper, checkedAuth, SESSION_IDLE_MS, shouldRestoreAccountSession } from '../data/auth-session.js';
import { memoryAuthStorage } from '../data/memory-auth-storage.js';
import cloudbase from './vendor/cloudbase.js';
import { usernameForAuth } from './username.js';
export const CLOUD_ENV='rater-tracker-sync-d3cx88f64aea2';
const native=window.raterNative;
let bootSession=null;if(native){try{bootSession=await native.sessionRead();}catch{}}
let hasLocalSession=shouldRestoreAccountSession(bootSession);
const idle=bootSession?.lastActiveAt&&Date.now()-bootSession.lastActiveAt>=SESSION_IDLE_MS;
const credentialMemory=memoryAuthStorage(idle?{}:{...bootSession?.storage,...(bootSession?.deviceId?{device_id:bootSession.deviceId}:{})});
const app=cloudbase.init({env:CLOUD_ENV,region:'ap-shanghai',persistence:native?'none':'local',auth:{detectSessionInUrl:false}});
const auth=app.auth(native?{persistence:'none',storage:credentialMemory}:undefined);
const keeper=createSessionKeeper({auth,storage:credentialMemory,initial:bootSession,write:data=>native?native.sessionWrite(data):Promise.resolve(),clear:()=>native?native.sessionClear():Promise.resolve(),foreground:()=>!document.hidden&&native?.active!==false});
const request=async promise=>checkedAuth(await promise);
export async function currentAccount(){return window.desktop?window.desktop.accountCurrent():hasLocalSession?keeper.current():null;}
export async function touchAccount(){return window.desktop?window.desktop.accountTouch?.():keeper.touch();}
export async function loginAccount(username,password){if(window.desktop)return window.desktop.accountLogin(username,password);await keeper.restore();await request(auth.signInWithPassword({username:usernameForAuth(username),password}));const identity=await keeper.accept(username);hasLocalSession=true;return identity;}
export async function logoutAccount(){if(window.desktop)return window.desktop.accountLogout();await keeper.logout();registration.clear();hasLocalSession=false;}
const registration=createRegistration({signUp:v=>request(auth.signUp(v)),signOut:()=>request(auth.signOut())},name=>keeper.accept(name));
export function cancelRegistration(){if(!window.desktop)registration.clear();}
export async function registerAccount(values){if(window.desktop)return window.desktop.accountRegister(values);await keeper.restore();return registration.begin(values);}
export async function verifyRegistration(id,token){if(window.desktop)return window.desktop.accountVerifyRegistration(id,token);const identity=await registration.confirm(id,token);hasLocalSession=true;return identity;}
export async function cloudSync(data){if(window.desktop)return window.desktop.accountSync(data);return keeper.run(()=>app.rdb().rpc('rater_sync',{p_type:data.type,p_base_version:data.baseVersion??0,p_request_id:data.requestId??null,p_state:data.state??null}),data.accountId);}
