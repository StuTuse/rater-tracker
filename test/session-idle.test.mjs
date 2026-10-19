import test from 'node:test';import assert from 'node:assert/strict';import {createSessionVault} from '../packages/data/session-vault.js';
const day=86400000,start=Date.parse('2026-10-20T00:00:00+08:00');
function setup({setError=false,offline=false,refreshInvalid=false}={}){
 let clock=start,row={session:{sub:'fixture',access_token:'old',refresh_token:'durable',expires_at:start/1000+3600},identity:{id:'fixture',name:'Fixture'},lastActive:start-10*day},session=row.session,renewals=0,listener;
 const auth={onAuthStateChange:f=>listener=f,setSession:async()=>{if(offline)throw Error('network offline');if(setError)throw Error('invalid access token');return{data:{session}};},getSession:async()=>{if(offline)throw Error('network offline');return{data:{session}};},refreshSession:async token=>{renewals++;assert.equal(token,row.session.refresh_token);if(refreshInvalid)throw Error('invalid_grant');session={...row.session,access_token:'new',refresh_token:renewals===1?'rotated':'rotated'+renewals,expires_at:clock/1000+3600};return{data:{session}};}};
 const options={auth,now:()=>clock,read:async()=>structuredClone(row),write:async value=>{row=structuredClone(value);},clear:async()=>{row=null;}};
 let vault=createSessionVault(options);
 return{get vault(){return vault;},get row(){return row;},get renewals(){return renewals;},setTime:value=>clock=start+value*day,reboot:()=>vault=createSessionVault(options),rotate:()=>listener?.('TOKEN_REFRESHED',session)};
}
test('cold launch with rejected expired access token renews saved refresh credentials and survives reboot',async()=>{const f=setup({setError:true});assert.equal((await f.vault.current()).id,'fixture');assert.equal(f.renewals,1);assert.equal(f.row.session.refresh_token,'rotated');f.reboot();assert.equal((await f.vault.current()).id,'fixture');assert.equal(f.renewals,2);assert.equal(f.row.session.refresh_token,'rotated2');});
test('background sync and SDK callbacks never extend the 30 day user idle window',async()=>{const f=setup();await f.vault.current();const active=f.row.lastActive;f.setTime(29);await f.vault.withSession(async a=>a);f.rotate();await f.vault.withSession(async a=>a);assert.equal(f.row.lastActive,active);f.setTime(30);await assert.rejects(f.vault.withSession(async()=>assert.fail()),/登录已过期/);assert.equal(f.row,null);});
test('trusted user activity persists while offline and renews window across process restart',async()=>{const f=setup({offline:true});await f.vault.current();f.setTime(29);assert.equal(await f.vault.touch(),true);assert.equal(f.row.lastActive,start+29*day);f.setTime(58);f.reboot();assert.equal((await f.vault.current()).id,'fixture');});
test('activity at idle deadline cannot revive expired login even without process restart',async()=>{const f=setup();await f.vault.current();f.setTime(30);assert.equal(await f.vault.touch(),false);assert.equal(f.row,null);assert.equal(await f.vault.current(),null);});
test('just before 30 days still restores; 30 days plus 1ms requires login',async()=>{const f=setup({offline:true});await f.vault.current();f.setTime(30-1/day);f.reboot();assert.equal((await f.vault.current()).id,'fixture');f.setTime(60);f.reboot();assert.equal(await f.vault.current(),null);});
test('revoked refresh token retains matching local identity but explicitly requires login',async()=>{const f=setup({setError:true,refreshInvalid:true});const a=await f.vault.current();assert.equal(a.id,'fixture');assert.equal(a.needsLogin,true);assert.equal(f.row.session.refresh_token,'durable');});

test('network hang does not block durable local activity or renew an expired idle session',async()=>{
 let clock=start,row={session:{sub:'fixture',access_token:'old',refresh_token:'durable'},identity:{id:'fixture',name:'Fixture'},lastActive:start-day};
 const vault=createSessionVault({auth:{setSession:()=>new Promise(()=>{})},now:()=>clock,read:async()=>row,write:async value=>{row=structuredClone(value);},clear:async()=>{row=null;}});
 void vault.current();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(row.lastActive,start);
 clock+=29*day;assert.equal(await vault.touch(),true);assert.equal(row.lastActive,clock);
 clock+=30*day;assert.equal(await vault.touch(),false);assert.equal(row,null);
});
