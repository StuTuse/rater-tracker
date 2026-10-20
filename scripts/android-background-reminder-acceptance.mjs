import { attach, device } from './android-device.mjs';
import { mkdirSync,writeFileSync } from 'node:fs';
const pkg='local.ratertracker.android.dev';
if(device('emu','avd','name').split(/\r?\n/)[0].trim()!=='RaterSigningAcceptance')throw Error('Isolated AVD required');
const report={checks:[]},check=(name,value)=>{report.checks.push({name,passed:!!value});if(!value)throw Error(name);};
const pause=ms=>new Promise(r=>setTimeout(r,ms));let browser,oldOptions;
const auto=device('shell','settings','get','global','auto_time').trim();
try{
 device('shell','settings','put','global','auto_time','0');
 // Repeated acceptance runs must not reuse a receipt from an earlier run.
 let latest=Date.now()+8*3600000;
 try{for(const match of device('shell','run-as',pkg,'cat','shared_prefs/rater-reminders-v1.xml').matchAll(/guest\/(\d{4}-\d{2}-\d{2})\/10/g))latest=Math.max(latest,Date.parse(match[1]+'T12:00:00Z'));}catch{}
 const date=new Date(latest+24*3600000).toISOString().slice(0,10),at=Date.parse(date+'T09:59:30+08:00');
 device('shell','cmd','alarm','set-time',String(at));
 device('shell','pm','grant',pkg,'android.permission.POST_NOTIFICATIONS');
 device('shell','appops','set',pkg,'SCHEDULE_EXACT_ALARM','allow');
 device('shell','am','start','-n',pkg+'/local.ratertracker.android.MainActivity');
 const attached=await attach();browser=attached.browser;const page=attached.page;
 oldOptions=await page.evaluate(()=>localStorage.getItem('rater-reminders-v1'));
 check('only isolated guest fixtures',!await page.evaluate(()=>JSON.parse(localStorage.getItem('rater-active-account')??'null')?.id));
 await page.evaluate(()=>localStorage.setItem('rater-reminders-v1',JSON.stringify({enabled:true,daily:true,followup:true,weekly:true})));
 await page.reload();await page.evaluate(()=>window.raterReady);
 report.native=await page.evaluate(async()=>{const {reminderCopy}=await import('./packages/core/reminder-copy.js'),{hongKong}=await import('./packages/core/index.js'),{openStore}=await import('./packages/data/storage.js');const store=await openStore(),state=await store.read();store.close();return window.raterNative.reminderSync({scope:'guest',date:hongKong().date,revision:state.revision,updated:false,options:{enabled:true,daily:true,followup:true,weekly:true},copies:reminderCopy});});
 check('system exact alarm and notification permissions available',report.native.allowed&&report.native.exact);
 check('next daily alarm is the actual 10:00 slot',report.native.next10===Date.parse(date+'T10:00:00+08:00'));
 await browser.close();browser=null;
 device('shell','input','keyevent','3');await pause(500);
 const pid=device('shell','pidof',pkg).trim();device('shell','run-as',pkg,'kill','-9',pid);
 let remaining='';try{remaining=device('shell','pidof',pkg).trim();}catch{}
 check('application process is absent before reminder',!remaining);
 device('shell','dumpsys','battery','unplug');device('shell','input','keyevent','223');device('shell','dumpsys','deviceidle','force-idle');
 check('device enters Doze',device('shell','dumpsys','deviceidle').includes('mState=IDLE'));
 for(let i=0;i<45;i++){
  const mirror=device('shell','run-as',pkg,'cat','shared_prefs/rater-reminders-v1.xml');
  if(mirror.includes('guest/'+date+'/10')){report.receipt=true;break;}
  await pause(1000);
 }
 check('system wakes receiver and records notification without UI',report.receipt);
 let notified=false;
 for(let i=0;i<20;i++){const notifications=device('shell','dumpsys','notification','--noredact');if(notifications.includes('pkg='+pkg)&&notifications.includes('journal-reminders-v1')){notified=true;break;}await pause(250);}
 check('notification manager contains delivered reminder',notified);
 device('shell','dumpsys','deviceidle','unforce');device('shell','input','keyevent','224');device('shell','wm','dismiss-keyguard');await pause(700);device('shell','cmd','statusbar','expand-notifications');await pause(700);
 mkdirSync('output/android',{recursive:true});writeFileSync('output/android/background102-notification.png',Buffer.from((await import('node:child_process')).execFileSync((await import('./android-device.mjs')).adb,['-P','5038','-s',process.env.RATER_ANDROID_SERIAL??'emulator-5580','exec-out','screencap','-p'],{maxBuffer:16*1024*1024})));
 console.log(JSON.stringify(report));
}finally{
 await browser?.close().catch(()=>{});
 device('shell','dumpsys','deviceidle','unforce');device('shell','dumpsys','battery','reset');device('shell','input','keyevent','224');device('shell','cmd','statusbar','collapse');
 device('shell','cmd','alarm','set-time',String(Date.now()));
 if(auto==='null')device('shell','settings','delete','global','auto_time');else device('shell','settings','put','global','auto_time',auto);
 device('shell','am','start','-n',pkg+'/local.ratertracker.android.MainActivity');
 try{const a=await attach();await a.page.evaluate(options=>{if(options===null)localStorage.removeItem('rater-reminders-v1');else localStorage.setItem('rater-reminders-v1',options);},oldOptions??null);await a.page.reload();await a.browser.close();}catch{}
 mkdirSync('output/android',{recursive:true});writeFileSync('output/android/background102-report.json',JSON.stringify(report,null,2));
}
