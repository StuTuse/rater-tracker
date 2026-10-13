import { registerPlugin } from "./capacitor-core.js";
const Native=registerPlugin('RaterPlatform');
document.documentElement.dataset.platform='android';
window.raterNative={
 info:()=>Native.info(),
 exportBackup:async(contents,name)=>(await Native.exportBackup({contents,name})).success===true,
 importBackup:async()=>{const r=await Native.importBackup();return r.cancelled?null:r.contents;},
 sessionRead:async()=>{const r=await Native.sessionRead();return r.contents?JSON.parse(r.contents):null;},
 sessionWrite:data=>Native.sessionWrite({contents:JSON.stringify(data)}),
 sessionClear:()=>Native.sessionClear(),
 openData:async()=>{},
 quit:()=>Native.quit()
};
function safeArea(v){document.documentElement.style.setProperty('--native-safe-top',(v.safeTop??24)+'px');document.documentElement.style.setProperty('--native-safe-bottom',(v.safeBottom??24)+'px');}
safeArea(await Native.info());Native.addListener('insets',safeArea);
function viewport(){document.documentElement.style.setProperty('--visual-height',visualViewport.height+'px');document.documentElement.classList.toggle('keyboard-open',visualViewport.height<innerHeight-100);}
visualViewport?.addEventListener('resize',viewport);viewport();
Native.addListener('back',()=>window.dispatchEvent(new Event('rater-back')));
Native.addListener('active',()=>{window.dispatchEvent(new Event('online'));window.dispatchEvent(new Event('rater-resume'));});
await import('./src/app.js');
