import {attach,device} from './android-device.mjs';
import {capture,pause} from './android-native-ui.mjs';
import {writeFileSync} from 'node:fs';
if(device('emu','avd','name').split(/\r?\n/)[0].trim()!=='RaterSigningAcceptance')throw Error('Isolated AVD required');
let browser;const report={checks:[]},check=(name,v)=>{report.checks.push({name,passed:!!v});if(!v)throw Error(name);};
try{
 device('shell','wm','size','1600x1050');device('shell','wm','density','160');await pause(1200);
 device('shell','am','force-stop','local.ratertracker.android.dev');device('shell','am','start','-n','local.ratertracker.android.dev/local.ratertracker.android.MainActivity');
 const attached=await attach();browser=attached.browser;const page=attached.page;await page.reload();await page.evaluate(()=>window.raterReady);
 if(await page.locator('#modal[open]').count()){await page.locator('#modal [data-action=close-modal]').click();await pause(400);}
 await page.locator('button[data-action=navigate][data-page=history]').click();await pause(500);
 report.geometry=await page.evaluate(async()=>{const info=await raterNative.info(),side=document.querySelector('.sidebar'),work=document.querySelector('.workspace');return {info,width:innerWidth,height:innerHeight,safeTop:parseFloat(getComputedStyle(work).paddingTop),sideTop:side.getBoundingClientRect().top,sidePadding:parseFloat(getComputedStyle(side).paddingTop),overflow:document.documentElement.scrollWidth>innerWidth};});
 check('actual tablet WebView layout',report.geometry.width>=1400&&report.geometry.sideTop===0);
 check('workspace only reserves actual overlap',Math.abs(report.geometry.safeTop-report.geometry.info.safeTop)<1);
 check('sidebar protects system status bar once',Math.abs(report.geometry.sidePadding-30-report.geometry.info.safeTop)<1);
 check('tablet history has no horizontal overflow',!report.geometry.overflow);
 check('history has exactly one date trigger',await page.locator('[data-control-for="id:rating-date"]').count()===1);
 capture('compat102-tablet-history');await page.locator('button[data-action=navigate][data-page=today]').click();await pause(400);capture('compat102-tablet-today');
 console.log(JSON.stringify(report));
}finally{await browser?.close().catch(()=>{});device('shell','wm','size','reset');device('shell','wm','density','reset');writeFileSync('output/android/tablet102-report.json',JSON.stringify(report,null,2));}
