import { memoryAuthStorage } from '../data/memory-auth-storage.js';
import cloudbase from './vendor/cloudbase.js';
import { usernameForAuth } from './username.js';
export const CLOUD_ENV='rater-tracker-sync-d3cx88f64aea2';
const native=window.raterNative;
let bootSession=null;if(native){try{bootSession=await native.sessionRead();}catch{}}
const credentialMemory=memoryAuthStorage(bootSession?.deviceId?{device_id:bootSession.deviceId}:{});
const app=cloudbase.init({env:CLOUD_ENV,region:'ap-shanghai',persistence:native?'none':'local',auth:{detectSessionInUrl:false}});
const auth=app.auth(native?{persistence:'none',storage:credentialMemory}:undefined);let usernameLabel='',restoring,offlineIdentity;
function checked(r){if(r?.error)throw new Error(r.error.message||'账号操作失败');return r?.data??r;}
function identity(data){const user=data?.user??data?.session?.user;if(!user||user.is_anonymous)return null;const id=[user.id,user.ID,user.uid].find(v=>typeof v==='string'&&v.length);const name=usernameLabel||[user.username,user.name].find(v=>typeof v==='string'&&v.length)||'我的账号';return id?{id,name}:null;}
async function restore(){
 if(!native)return;
 if(!restoring)restoring=(async()=>{const saved=bootSession;if(!saved)return;usernameLabel=saved.label??'';offlineIdentity=saved.identity??null;try{checked(await auth.setSession({access_token:saved.session.access_token,refresh_token:saved.session.refresh_token}));}catch{/* Offline local account remains available; sync reports network/auth errors. */}})();
 await restoring;
}
async function persist(){const data=checked(await auth.getSession());const account=identity(data);if(native&&data?.session){await native.sessionWrite({session:data.session,label:usernameLabel,identity:account,deviceId:credentialMemory.getItemSync('device_id')});offlineIdentity=account;}return account;}
export async function currentAccount(){if(window.desktop)return window.desktop.accountCurrent();await restore();try{return await persist()??offlineIdentity;}catch(error){if(native&&offlineIdentity)return offlineIdentity;if(/credentials not found|no session/i.test(error.message))return null;throw error;}}
export async function loginAccount(username,password){const canonical=usernameForAuth(username);if(window.desktop)return window.desktop.accountLogin(username,password);await restore();checked(await auth.signInWithPassword({username:canonical,password}));usernameLabel=username;const account=await persist();if(!account)throw new Error('未获得有效账号身份');return account;}
export async function logoutAccount(){if(window.desktop)return window.desktop.accountLogout();checked(await auth.signOut());if(native)await native.sessionClear();usernameLabel='';offlineIdentity=null;registration=null;}
let registration;
export async function registerAccount(values){const username=usernameForAuth(values?.username,true);if(window.desktop)return window.desktop.accountRegister(values);await restore();registration=null;const data=checked(await auth.signUp({...values,username}));if(typeof data?.verifyOtp!=='function')throw new Error('未获得邮箱验证流程');const id=crypto.randomUUID();registration={id,verify:data.verifyOtp,username:values.username};return {id,email:values.email};}
export async function verifyRegistration(id,token){if(window.desktop)return window.desktop.accountVerifyRegistration(id,token);if(registration?.id!==id)throw new Error('请重新发送验证码');checked(await registration.verify({token}));usernameLabel=registration.username;registration=null;return persist();}
export async function cloudSync(data){if(window.desktop)return window.desktop.accountSync(data);await restore();const result=await app.rdb().rpc('rater_sync',{p_type:data.type,p_base_version:data.baseVersion??0,p_request_id:data.requestId??null,p_state:data.state??null});if(result.error)throw new Error(result.error.message??'云端同步未成功');await persist();return result.data;}
