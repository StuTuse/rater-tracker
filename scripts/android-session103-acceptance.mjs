import {attach,device} from './android-device.mjs';import {pause} from './android-native-ui.mjs';import {readFileSync,writeFileSync} from 'node:fs';
if(device('emu','avd','name').split(/\r?\n/)[0].trim()!=='RaterSigningAcceptance')throw Error('Isolated AVD required');
const base='runtime-data/session103-cloud',fixture=JSON.parse(readFileSync(base+'/fixture.json','utf8')),expected=fixture.id;
if(!/^rt\d+$/.test(fixture.username)||fixture.purpose!=='Synthetic login persistence acceptance 1.0.3'||!expected)throw Error('Known synthetic fixture required');
const report={checks:[]};let browser,page;const check=(name,v)=>{report.checks.push({name,passed:!!v});console.log(name+': '+!!v);if(!v)throw Error(name);};
async function connect(){({browser,page}=await attach());await page.route('**/*',route=>{const request=route.request();if((request.postData()??'').includes('rater_sync')||request.url().includes('rater_sync'))return route.abort();return route.continue();});}
async function restart(){await browser?.close().catch(()=>{});device('shell','am','force-stop','local.ratertracker.android.dev');device('shell','am','start','-n','local.ratertracker.android.dev/local.ratertracker.android.MainActivity');await pause(2000);await connect();}
try{
 await connect();
 const first=await page.evaluate(async value=>{const api=await import('/packages/ui/account.js');const identity=await api.loginAccount(value.username,value.password);return{id:identity.id,valid:!identity.needsLogin};},fixture);
 check('Android real SDK login matches synthetic UID',first.id===expected&&first.valid);
 const saved=await page.evaluate(()=>window.raterNative.sessionRead());check('Android Keystore encrypted vault roundtrip retains credentials',saved.identity.id===expected&&!!saved.session.refresh_token&&!!saved.storage);
 writeFileSync(base+'/identity.json',JSON.stringify({id:expected}));
 for(let i=1;i<=2;i++){await restart();const current=await page.evaluate(async()=>{const api=await import('/packages/ui/account.js');const identity=await api.currentAccount();return{id:identity?.id,valid:!identity?.needsLogin};});check('Android cold restart '+i+' keeps real login without password',current.id===expected&&current.valid);}
 await page.evaluate(async()=>{const row=await window.raterNative.sessionRead();row.session.expires_at=new Date(Date.now()-86400000).toISOString();await window.raterNative.sessionWrite(row);});await restart();
 const renewed=await page.evaluate(async()=>{const api=await import('/packages/ui/account.js');const u=await api.currentAccount();return{id:u?.id,valid:!u?.needsLogin};});check('Android past access expiry renews real session',renewed.id===expected&&renewed.valid);
 await page.evaluate(async()=>{const row=await window.raterNative.sessionRead();row.lastActive=Date.now()-29*86400000;await window.raterNative.sessionWrite(row);});await restart();check('Android 29 day remembered login remains valid',await page.evaluate(async()=>{const api=await import('/packages/ui/account.js');const user=await api.currentAccount();return !!user?.id&&!user.needsLogin;}));
 await page.evaluate(async()=>{const row=await window.raterNative.sessionRead();row.lastActive=Date.now()-31*86400000;await window.raterNative.sessionWrite(row);});await restart();
 check('Android 31 day idle requires login',await page.evaluate(async()=>{const api=await import('/packages/ui/account.js');return await api.currentAccount()===null;}));
 check('Android expired native credential file cleared',await page.evaluate(async()=>await window.raterNative.sessionRead()===null));
}finally{if(page&&!page.isClosed())await page.evaluate(async()=>{await window.raterNative.sessionClear();localStorage.removeItem('rater-active-account');}).catch(()=>{});writeFileSync('output/android/session103-report.json',JSON.stringify(report,null,2));await browser?.close().catch(()=>{});}
