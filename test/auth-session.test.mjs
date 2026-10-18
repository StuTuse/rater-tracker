import test from 'node:test';
import assert from 'node:assert/strict';
import {createSessionKeeper,SESSION_IDLE_MS,shouldRestoreAccountSession} from '../packages/data/auth-session.js';
import {memoryAuthStorage} from '../packages/data/memory-auth-storage.js';

test('guest startup avoids remote session lookup unless a saved identity or token exists',()=>{
 assert.equal(shouldRestoreAccountSession(null),false);assert.equal(shouldRestoreAccountSession({}),false);
 assert.equal(shouldRestoreAccountSession({session:{access_token:'saved'}}),true);
 assert.equal(shouldRestoreAccountSession({identity:{id:'u1'}}),true);
});

test('a stale access token refreshes before sync retries and keeps the same account',async()=>{
 let valid=false,operations=0,written;
 const storage=memoryAuthStorage();
 const auth={getSession:async()=>valid?{session:{sub:'u1',access_token:'fresh'}}:{error:{message:'access token expired'}},refreshSession:async()=>{valid=true;return{data:{session:{sub:'u1',access_token:'fresh'}}};}};
 const keeper=createSessionKeeper({auth,storage,initial:{identity:{id:'u1',name:'Test'},session:{sub:'u1',access_token:'old'},lastActiveAt:1000},now:()=>2000,write:async value=>{written=value;},clear:async()=>{}});
 const result=await keeper.run(async()=>({ok:true}),'u1');
 assert.deepEqual(result,{ok:true});assert.equal(operations,0);assert.equal(written.identity.id,'u1');
});

test('thirty days idle preserves local identity but blocks sync until re-login',async()=>{
 let reads=0;
 const keeper=createSessionKeeper({auth:{getSession:async()=>{reads++;return{session:{sub:'u1'}};}},storage:memoryAuthStorage(),initial:{identity:{id:'u1',name:'Test'},session:{sub:'u1'},lastActiveAt:1000,storage:{device_id:'kept'}},now:()=>1000+SESSION_IDLE_MS,write:async()=>{},clear:async()=>{}});
 const current=await keeper.current();assert.equal(current.id,'u1');assert.equal(current.needsLogin,true);assert.equal(reads,0);
 await assert.rejects(keeper.run(async()=>true,'u1'),{code:'AUTH_REQUIRED'});
});

test('startup refreshes an expired access token instead of forcing a login',async()=>{
 let valid=false;const keeper=createSessionKeeper({auth:{getSession:async()=>valid?{session:{sub:'u2',access_token:'fresh'}}:{error:{message:'access token expired'}},refreshSession:async()=>{valid=true;return{data:{session:{sub:'u2',access_token:'fresh'}}};}},storage:memoryAuthStorage(),initial:{identity:{id:'u2',name:'User'},session:{sub:'u2',access_token:'old'},lastActiveAt:1000},now:()=>2000,write:async()=>{},clear:async()=>{}});
 assert.deepEqual(await keeper.current(),{id:'u2',name:'User'});
});
