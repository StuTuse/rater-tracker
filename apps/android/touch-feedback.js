// Visual only: never intercept clicks, focus, scrolling or business actions.
const targets='button,summary,.rating-card,.task-card,.xp-bar';
const pressed=new Set();
let pointer=null;
function clear(){for(const el of pressed)el.removeAttribute('data-touch-pressed');pressed.clear();pointer=null;}
document.addEventListener('pointerdown',event=>{
 clear();
 if(!event.isPrimary||event.button!==0)return;
 const path=event.composedPath();
 if(path.some(el=>el instanceof Element&&el.matches('button:disabled,input:disabled,select:disabled,textarea:disabled,[aria-disabled=true]')))return;
 pointer={id:event.pointerId,x:event.clientX,y:event.clientY};
 for(const el of path)if(el instanceof Element&&el.matches(targets)){el.setAttribute('data-touch-pressed','');pressed.add(el);}
},{capture:true,passive:true});
document.addEventListener('pointermove',event=>{
 if(pointer?.id===event.pointerId&&Math.hypot(event.clientX-pointer.x,event.clientY-pointer.y)>8)clear();
},{capture:true,passive:true});
for(const type of ['pointerup','pointercancel','lostpointercapture'])document.addEventListener(type,event=>{if(pointer?.id===event.pointerId)clear();},{capture:true,passive:true});
document.addEventListener('scroll',clear,{capture:true,passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
window.addEventListener('blur',clear);
window.addEventListener('rater-pause',clear);
