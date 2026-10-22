import{attach,device}from'./android-device.mjs';import{pause,capture}from'./android-native-ui.mjs';import{writeFileSync}from'node:fs';
if(device('emu','avd','name').split(/\r?\n/)[0].trim()!=='RaterSigningAcceptance')throw Error('Isolated AVD required');
const pkg='local.ratertracker.android.dev',report={checks:[]};let browser,page,prior;
const check=(name,value)=>{report.checks.push({name,passed:!!value});console.log(name+': '+!!value);if(!value)throw Error(name);};
try{
 device('shell','input','keyevent','224');device('shell','wm','dismiss-keyguard');device('shell','pm','grant',pkg,'android.permission.POST_NOTIFICATIONS');device('shell','appops','set',pkg,'SCHEDULE_EXACT_ALARM','allow');
 device('shell','am','start','-n',pkg+'/local.ratertracker.android.MainActivity');({browser,page}=await attach());
 prior=await page.evaluate(()=>localStorage.getItem('rater-reminders-v1'));
 await page.evaluate(()=>localStorage.setItem('rater-reminders-v1',JSON.stringify({enabled:true,persistent:true,daily:true,followup:true,weekly:true})));await page.reload();await page.evaluate(()=>window.raterReady);await pause(700);
 let status=await page.evaluate(async()=>{const{reminderCopy}=await import('/packages/core/reminder-copy.js');const{hongKong}=await import('/packages/core/index.js');return window.raterNative.reminderSync({scope:'guest',date:hongKong().date,updated:false,revision:0,copies:reminderCopy,options:JSON.parse(localStorage.getItem('rater-reminders-v1'))});});
 check('native foreground service starts with permission',status.serviceRunning&&status.serviceRequested);
 await page.locator('[data-page="settings"]').click();await pause(400);check('native settings exposes persistent channel and both notification tests',await page.locator('[data-action="test-reminder"]').count()===2&&await page.locator('[data-reminder-option="persistent"]').count()===1);capture('service103-settings');
 const first=await page.evaluate(()=>window.raterNative.reminderTest(0));check('immediate notification submits through native channel',first.posted);
 device('shell','cmd','statusbar','expand-notifications');await pause(800);capture('service103-notification-shade');device('shell','cmd','statusbar','collapse');
 const scheduled=await page.evaluate(()=>window.raterNative.reminderTest(60));check('one-minute background test scheduled',scheduled.scheduledAt>Date.now());
 device('shell','input','keyevent','3');await pause(800);
 check('service remains foreground after leaving activity',/isForeground=true/.test(device('shell','dumpsys','activity','services',pkg)));
 for(let n=0;n<13;n++){await pause(5000);if(n===5||n===11)console.log('Waiting for native background test alarm...');}
 const notifications=device('shell','dumpsys','notification','--noredact');writeFileSync('output/android/service103-notifications.txt',notifications);
 check('test receiver posts system notification while activity is in background',notifications.includes('pkg='+pkg)&&notifications.includes('tag=rater-test')&&notifications.includes('提醒通道测试'));
 device('shell','am','start','-n',pkg+'/local.ratertracker.android.MainActivity');await pause(600);
 const persisted=await page.evaluate(async()=>{const{reminderCopy}=await import('/packages/core/reminder-copy.js');const{hongKong}=await import('/packages/core/index.js');return window.raterNative.reminderSync({scope:'guest',date:hongKong().date,updated:false,revision:0,copies:reminderCopy,options:JSON.parse(localStorage.getItem('rater-reminders-v1'))});});
 check('background alarm receipt persisted after its scheduled time',persisted.testPostedAt>=scheduled.scheduledAt&&!persisted.testScheduledAt&&persisted.serviceRunning);
 await page.locator('[data-reminder-option="enabled"]').uncheck();await pause(700);
 check('disabling reminders removes foreground service',!device('shell','dumpsys','activity','services',pkg).includes('isForeground=true'));
}finally{
 if(page&&!page.isClosed()){await page.evaluate(value=>{if(value===null)localStorage.removeItem('rater-reminders-v1');else localStorage.setItem('rater-reminders-v1',value);},prior??null).catch(()=>{});await page.reload().catch(()=>{});}
 writeFileSync('output/android/service103-report.json',JSON.stringify(report,null,2));await browser?.close().catch(()=>{});
}
