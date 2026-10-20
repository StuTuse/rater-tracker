import { registerPlugin } from "./capacitor-core.js";
import './touch-feedback.js';
const Native=registerPlugin('RaterPlatform');
async function nativeInfo(){let timer;try{return await Promise.race([Native.info(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('应用信息暂未读取，请重新打开')),5000);})]);}finally{clearTimeout(timer);}}
document.documentElement.dataset.platform='android';
window.raterNative={
 active:true,
 reminderSync:data=>Native.reminderSync(data),
 reminderPermission:()=>Native.reminderPermission(),
 exactReminderPermission:()=>Native.exactReminderPermission(),
 notificationSettings:()=>Native.notificationSettings(),
 batterySettings:()=>Native.batterySettings(),
 consumeReminderRoute:()=>Native.consumeReminderRoute(),
 openExternal:url=>Native.openExternal({url}),
 info:()=>nativeInfo(),
 exportBackup:async(contents,name)=>(await Native.exportBackup({contents,name})).success===true,
 importBackup:async()=>{const r=await Native.importBackup();return r.cancelled?null:r.contents;},
 sessionRead:async()=>{const r=await Native.sessionRead();return r.contents?JSON.parse(r.contents):null;},
 sessionWrite:data=>Native.sessionWrite({contents:JSON.stringify(data)}),
 sessionClear:()=>Native.sessionClear(),
 openData:async()=>{},
 quit:()=>Native.quit()
};
let nativeKeyboard=false;
function safeArea(v){if(typeof v.active==='boolean')window.raterNative.active=v.active;for(const edge of ['Top','Bottom','Left','Right'])document.documentElement.style.setProperty('--native-safe-'+edge.toLowerCase(),(v['safe'+edge]??0)+'px');if(typeof v.keyboardVisible==='boolean')nativeKeyboard=v.keyboardVisible;viewport();}
safeArea(await nativeInfo().catch(()=>({})));Native.addListener('insets',safeArea);
function viewport(){const view=window.visualViewport;const open=nativeKeyboard || (view?.height??innerHeight)<innerHeight-100;document.documentElement.style.setProperty('--visual-height',(view?.height??innerHeight)+'px');document.documentElement.style.setProperty('--visual-top',(view?.offsetTop??0)+'px');document.documentElement.classList.toggle('keyboard-open',open);}
visualViewport?.addEventListener('resize',viewport);visualViewport?.addEventListener('scroll',viewport);viewport();
Native.addListener('back',()=>window.dispatchEvent(new Event('rater-back')));
Native.addListener('inactive',()=>{window.raterNative.active=false;window.dispatchEvent(new Event('rater-pause'));});
Native.addListener('active',()=>{window.raterNative.active=true;window.dispatchEvent(new Event('online'));window.dispatchEvent(new Event('rater-resume'));});
await import('./src/app.js');
