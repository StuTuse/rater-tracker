import { registerPlugin } from "./capacitor-core.js";
import './touch-feedback.js';
const Native=registerPlugin('RaterPlatform');
async function nativeInfo(){let timer;try{return await Promise.race([Native.info(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('应用信息暂未读取，请重新打开')),5000);})]);}finally{clearTimeout(timer);}}
document.documentElement.dataset.platform='android';
window.raterNative={
 active:true,
 info:()=>nativeInfo(),
 exportBackup:async(contents,name)=>(await Native.exportBackup({contents,name})).success===true,
 importBackup:async()=>{const r=await Native.importBackup();return r.cancelled?null:r.contents;},
 sessionRead:async()=>{const r=await Native.sessionRead();return r.contents?JSON.parse(r.contents):null;},
 sessionWrite:data=>Native.sessionWrite({contents:JSON.stringify(data)}),
 sessionClear:()=>Native.sessionClear(),
 openData:async()=>{},
 quit:()=>Native.quit()
};
function safeArea(v){if(typeof v.active==='boolean')window.raterNative.active=v.active;document.documentElement.style.setProperty('--native-safe-top',(v.safeTop??24)+'px');document.documentElement.style.setProperty('--native-safe-bottom',(v.safeBottom??24)+'px');}
safeArea(await nativeInfo().catch(()=>({})));Native.addListener('insets',safeArea);
function viewport(){document.documentElement.style.setProperty('--visual-height',visualViewport.height+'px');document.documentElement.classList.toggle('keyboard-open',visualViewport.height<innerHeight-100);}
visualViewport?.addEventListener('resize',viewport);viewport();
Native.addListener('back',()=>window.dispatchEvent(new Event('rater-back')));
Native.addListener('inactive',()=>{window.raterNative.active=false;window.dispatchEvent(new Event('rater-pause'));});
Native.addListener('active',()=>{window.raterNative.active=true;window.dispatchEvent(new Event('online'));window.dispatchEvent(new Event('rater-resume'));});
await import('./src/app.js');
