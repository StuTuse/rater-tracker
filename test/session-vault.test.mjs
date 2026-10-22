import test from 'node:test';import assert from 'node:assert/strict';
import { createSessionVault } from '../packages/data/session-vault.js';
import { memoryAuthStorage } from '../packages/data/memory-auth-storage.js';
const start=Date.parse('2026-10-19T10:00:00+08:00');
function fixture(saved,{offline=false}={}){
  let current=saved?.session??null,clock=start,listener,refreshes=0;const writes=[];
  const auth={onAuthStateChange:f=>{listener=f;},setSession:async()=>{if(offline)throw Error('network failed');return {data:{session:current}};},getSession:async()=>{if(offline)throw Error('network failed');return {data:{session:current}};},refreshSession:async token=>{assert.equal(typeof token,'string');refreshes++;current={...current,access_token:'new-token',refresh_token:'rotated',expires_at:clock/1000+3600};listener?.('TOKEN_REFRESHED',current);return {data:{session:current}};},signOut:async()=>({data:{}}),signInWithPassword:async()=>{current={access_token:'login',refresh_token:'refresh',sub:'new-user',user:{id:'new-user'},expires_at:clock/1000+3600};return {data:{session:current,user:current.user}};}};
  const vault=createSessionVault({auth,now:()=>clock,read:async()=>saved,write:async row=>{writes.push(structuredClone(row));saved=structuredClone(row);},clear:async()=>{saved=null;}});
  return {vault,auth,writes,advance:days=>clock+=days*86400000,get saved(){return saved;},get refreshes(){return refreshes;}};
}
const old=()=>({session:{access_token:'expired',refresh_token:'old-refresh',sub:'same-user',expires_at:start/1000-20},identity:{id:'same-user',name:'Existing'},label:'Existing',lastActive:start-86400000});
test('expired access token renews with string refresh token and durably serializes latest credentials',async()=>{const f=fixture(old());assert.equal((await f.vault.current()).id,'same-user');assert.equal(f.refreshes,1);await Promise.all([f.vault.current(),f.vault.withSession(async a=>a)]);assert.equal(f.saved.session.refresh_token,'rotated');assert.equal(f.saved.identity.id,'same-user');});
test('active login survives repeated use; 30 days idle returns logged out while local business is untouched',async()=>{const f=fixture(old());await f.vault.current();f.advance(29);await f.vault.current();assert.equal(f.vault.identity.id,'same-user');const reboot=fixture({...old(),lastActive:start-30*86400000});assert.equal(await reboot.vault.current(),null);assert.equal(reboot.saved,null);});
test('offline restored identity stays usable and keeps credentials for retry',async()=>{const f=fixture(old(),{offline:true});assert.equal((await f.vault.current()).id,'same-user');assert.equal(f.saved.session.refresh_token,'old-refresh');await assert.rejects(f.vault.withSession(async()=>{}),/network/);});
test('legacy Windows session retains user identity and new login replaces the old subject',async()=>{const row={...old().session,user:{id:'same-user'},_raterLabel:'Legacy'};const f=fixture(row);const account=await f.vault.login('new-user','fake-password');assert.equal(account.id,'new-user');assert.equal(f.saved.identity.id,'new-user');await f.vault.logout();assert.equal(f.saved,null);});

test('legacy lastActiveAt and needsLogin are honoured without restoring expired credentials',async()=>{
 const row=old();delete row.lastActive;row.lastActiveAt=start-31*86400000;const f=fixture(row);assert.equal(await f.vault.current(),null);
 const blocked=fixture({...old(),needsLogin:true});assert.equal(await blocked.vault.current(),null);
});
test('ISO SDK expiry and refresh fallback when getSession loses the old access token',async()=>{
 const row=old();row.session.expires_at=new Date(start-1000).toISOString();const f=fixture(row);assert.equal((await f.vault.current()).id,'same-user');assert.equal(f.refreshes,1);
 const g=fixture(old());const original=g.auth.getSession;let first=true;g.auth.getSession=async()=>{if(first){first=false;return{error:{message:'credentials not found'}};}return original();};assert.equal((await g.vault.current()).id,'same-user');assert.equal(g.refreshes,1);
});
test('RPC authorization expiry refreshes once and retries with the verified subject',async()=>{
 const f=fixture(old());let calls=0;const result=await f.vault.withSession(async identity=>{assert.equal(identity.id,'same-user');if(++calls===1)throw Error('unauthorized');return 'synced';});assert.equal(result,'synced');assert.equal(calls,2);assert.equal(f.saved.session.refresh_token,'rotated');
});
test('display casing survives canonical authentication',async()=>{const f=fixture(null);assert.equal((await f.vault.login('testuser','fake-password','TestUser')).name,'TestUser');});

test('restore persists the rotated grant even if the next SDK read loses connectivity',async()=>{
 let row=old(),reads=0;const rotated={...row.session,access_token:'valid',refresh_token:'rotated-on-restore',expires_at:start/1000+3600};
 const vault=createSessionVault({now:()=>start,read:async()=>row,write:async v=>{row=structuredClone(v);},clear:async()=>assert.fail(),auth:{setSession:async()=>({data:{session:rotated}}),getSession:async()=>{reads++;throw Error('network failed');}}});
 assert.equal((await vault.current()).needsLogin,undefined);assert.equal(row.session.refresh_token,'rotated-on-restore');assert.equal(reads,1);
});
test('restored SDK cache avoids a needless cold-launch grant rotation',async()=>{
 let row={...old(),storage:{fixture:'encrypted-cache'}},sets=0;const session={...row.session,expires_at:start/1000+3600};
 const vault=createSessionVault({memory:memoryAuthStorage(),now:()=>start,read:async()=>row,write:async v=>row=v,clear:async()=>assert.fail(),auth:{getSession:async()=>({data:{session}}),setSession:async()=>{sets++;throw Error('should reuse cache');}}});
 assert.equal((await vault.current()).id,'same-user');assert.equal(sets,0);
});
test('generic authorization failure is retried rather than permanently requiring a password',async()=>{
 const f=fixture(old());const original=f.auth.refreshSession;let offline=true;
 f.auth.setSession=async()=>{throw Error('unauthorized');};f.auth.getSession=async()=>{throw Error('credentials not found');};f.auth.refreshSession=async token=>{if(offline)throw Error('unauthorized');return original(token);};
 assert.equal((await f.vault.current()).needsLogin,undefined);assert.equal(f.saved.session.refresh_token,'old-refresh');offline=false;
 assert.equal((await f.vault.current()).needsLogin,undefined);assert.equal(f.saved.session.refresh_token,'rotated');
});
test('SDK-cleared credentials recover through setSession without losing durable grant',async()=>{
 const f=fixture(old());let sets=0;f.auth.setSession=async()=>{sets++;if(sets===1)throw Error('credentials not found');return {data:{session:{...old().session,refresh_token:'cache-restored',expires_at:start/1000+3600}}};};
 f.auth.getSession=async()=>{throw Error('network failed');};f.auth.refreshSession=async()=>{throw TypeError("Cannot set properties of null (setting 'refresh_token')");};
 assert.equal((await f.vault.current()).needsLogin,undefined);assert.equal(f.saved.session.refresh_token,'cache-restored');assert.equal(sets,2);
});
