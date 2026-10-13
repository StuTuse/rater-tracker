import{readFileSync,writeFileSync,mkdirSync}from'node:fs';import{attach,device,screenshot}from'./android-device.mjs';
const file=process.env.RATER_ANDROID_TEST_CREDENTIALS;if(!file)throw Error('Set RATER_ANDROID_TEST_CREDENTIALS to an ignored test-only JSON with username/password/id.');
const credentials=JSON.parse(readFileSync(file,'utf8'));if(!credentials.id)throw Error('Expected test identity is required');let {browser,page}=await attach(),report={};
async function ready(){await page.waitForFunction(()=>!!window.raterReady);await page.evaluate(()=>window.raterReady);}
try{
const identity=await page.evaluate(async v=>{const a=await import('./src/account.js');return a.loginAccount(v.username,v.password);},credentials);
if(identity.id!==credentials.id)throw Error('Unexpected user; no account data will be modified');report.realLogin=true;
await page.reload();await ready();report.reloadKeepsIdentity=await page.evaluate(async id=>(await(await import('./src/account.js')).currentAccount())?.id===id,identity.id);
report.noPlainCredentials=await page.evaluate(()=>[localStorage,sessionStorage].every(store=>!Object.keys(store).some(k=>/credentials|token/i.test(k)||/eyJ[A-Za-z0-9_-]{20}/.test(store.getItem(k)))));
const encrypted=device('exec-out','run-as','local.ratertracker.android.dev','cat','files/account-session.sec');report.encryptedFile=encrypted.length>100&&!/eyJ[a-zA-Z0-9_-]{20}/.test(encrypted);
await browser.close();device('shell','am','force-stop','local.ratertracker.android.dev');device('shell','am','start','-n','local.ratertracker.android.dev/local.ratertracker.android.MainActivity');({browser,page}=await attach());
report.coldStartKeepsIdentity=await page.evaluate(async id=>(await(await import('./src/account.js')).currentAccount())?.id===id,identity.id);
await page.waitForFunction(()=>document.querySelector('#save-status').textContent.includes('已同步'));
const beforeRefresh=await page.evaluate(async()=>{const saved=await window.raterNative.sessionRead();for(const key of Object.keys(saved.storage??{})){if(key.startsWith('credentials_')){const c=JSON.parse(saved.storage[key]);c.expires_at=new Date(Date.now()-60000).toISOString();saved.storage[key]=JSON.stringify(c);}}await window.raterNative.sessionWrite(saved);return saved.session.access_token;});
await page.reload();await ready();report.refreshRestoredEncrypted=await page.evaluate(async({before,id})=>{const a=await import('./src/account.js');await a.cloudSync({type:'pull'});const saved=await window.raterNative.sessionRead();return saved.session.access_token!==before&&saved.identity?.id===id&&!Object.keys(localStorage).some(k=>/credentials|token/i.test(k));},{before:beforeRefresh,id:identity.id});
const original=await page.evaluate(async id=>{const{openStore}=await import('./src/storage.js');const db=await openStore(id),pair=await db.readSync();db.close();return pair;},identity.id);
const wifiBaseline=device('shell','cmd','wifi','status');device('shell','svc','wifi','disable');device('shell','svc','data','disable');
try{
await browser.close();device('shell','am','force-stop','local.ratertracker.android.dev');device('shell','am','start','-n','local.ratertracker.android.dev/local.ratertracker.android.MainActivity');({browser,page}=await attach());
report.offlineIdentity=await page.evaluate(async id=>(await(await import('./src/account.js')).currentAccount())?.id===id,identity.id);
await page.getByRole('button',{name:'今日',exact:true}).click();const oldStars=await page.evaluate(async id=>{const c=await import('./src/core.js'),{openStore}=await import('./src/storage.js');const db=await openStore(id),s=await db.read();db.close();return s.ratings[c.hongKong().date]?.health?.stars;},identity.id);
await page.getByRole('button',{name:'健康 '+(oldStars===4?2:4)+' 星',exact:true}).click();
report.offlineSavePending=await page.evaluate(async id=>{const{openStore}=await import('./src/storage.js');const db=await openStore(id),p=await db.readSync();db.close();return p.meta.dirty;},identity.id);
await page.getByRole('button',{name:'打开账号中心',exact:true}).click();await screenshot(page,'account-offline');
await page.evaluate(async({id,pair})=>{const{openStore}=await import('./src/storage.js');const db=await openStore(id),latest=await db.read();await db.useCloud(pair.state,pair.meta.baseVersion,latest.revision);db.close();}, {id:identity.id,pair:original});
const logoutAttempt=await page.evaluate(async()=>{const a=await import('./src/account.js');try{await a.logoutAccount();return{completed:true,encryptedPresent:!!await window.raterNative.sessionRead()};}catch(error){return{completed:false,encryptedPresent:!!await window.raterNative.sessionRead()};}});report.offlineLogoutConsistent=logoutAttempt.completed?!logoutAttempt.encryptedPresent:logoutAttempt.encryptedPresent;
}finally{device('shell','svc','wifi','enable');device('shell','svc','data','enable');if(wifiBaseline.includes('connected to \"AndroidWifi\"'))device('shell','cmd','wifi','connect-network','AndroidWifi','open');}
let reconnectError;for(let retry=0;retry<20;retry++){try{await page.evaluate(async v=>{const a=await import('./src/account.js');if(!(await a.currentAccount())?.id)await a.loginAccount(v.username,v.password);await a.cloudSync({type:'pull'});},credentials);report.reconnectAuthenticated=true;break;}catch(error){reconnectError=error;await new Promise(r=>setTimeout(r,500));}}if(!report.reconnectAuthenticated)throw reconnectError;
await page.evaluate(async()=>{const a=await import('./src/account.js');await a.logoutAccount();});await page.reload();await ready();
report.logoutClearsEncryptedFile=!device('shell','run-as','local.ratertracker.android.dev','ls','files').includes('account-session.sec');
report.logoutReturnsGuest=await page.locator('[data-action=account-open]').getAttribute('aria-label')==='登录或注册账号';
mkdirSync('output/android',{recursive:true});writeFileSync('output/android/account-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(Object.values(report).some(v=>v!==true))throw Error('Android account acceptance failed');
}finally{mkdirSync('output/android',{recursive:true});writeFileSync('output/android/account-report.json',JSON.stringify(report,null,2));await browser.close();}
