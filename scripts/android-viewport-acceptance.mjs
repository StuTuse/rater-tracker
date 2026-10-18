import { attach, device } from './android-device.mjs';
import { tap, capture } from './android-native-ui.mjs';
import { writeFileSync } from 'node:fs';
if(device('emu','avd','name').split(/\r?\n/)[0].trim()!=='RaterSigningAcceptance')throw Error('Isolated AVD required');
const {browser,page}=await attach();const report={checks:[]};
const check=(name,value)=>{report.checks.push({name,passed:Boolean(value)});if(!value)throw Error(name);};
try{
  await page.reload();await page.evaluate(()=>window.raterReady);
  if(await page.locator('#modal[open]').count())await page.locator('#modal [data-action=close-modal]').click();
  await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});
  await tap('写学习记录');await page.waitForFunction(()=>document.documentElement.classList.contains('keyboard-open'));
  await page.waitForTimeout(700);
  const writing=await page.evaluate(()=>{const r=document.querySelector('textarea[data-dimension=study]').getBoundingClientRect(),v=visualViewport;return {input:{top:r.top,bottom:r.bottom},viewport:{top:v.offsetTop,height:v.height},overlay:parseFloat(getComputedStyle(document.body,'::before').top),visible:r.top>=v.offsetTop&&r.bottom<=v.offsetTop+v.height};});
  report.writing=writing;check('record input entirely above real IME',writing.visible);check('paper overlay follows panned visual viewport',Math.abs(writing.overlay-writing.viewport.top)<1.5);
  capture('rebuild-viewport-final');
  device('shell','input','keyevent','4');await page.waitForTimeout(500);await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});
  await page.evaluate(async()=>{
    if(JSON.parse(localStorage.getItem('rater-active-account')??'null')?.id)throw Error('Use only guest fixtures');
    const {openStore}=await import('./packages/data/storage.js'),{transact,hongKong,addDays}=await import('./packages/core/index.js');
    const store=await openStore(),old=await store.read(),date=hongKong().date;
    if(!Object.values(old.tasks).some(t=>!t.deleted&&!t.archived&&!t.completion?.active))await store.write(transact(old,{id:crypto.randomUUID(),type:'createTask',title:'隔离键盘定位测试',start:date,target:addDays(date,15),importance:'normal'}),old.revision);
    store.close();await window.raterReload();document.querySelector('[data-action=quick-progress]').click();
  });
  await page.waitForTimeout(550);
  const point=await page.locator('#quick-progress-form textarea').evaluate(n=>{const r=n.getBoundingClientRect(),v=visualViewport;return{x:Math.round((r.x+r.width/2-v.offsetLeft)*devicePixelRatio),y:Math.round((r.y+r.height/2-v.offsetTop)*devicePixelRatio)};});
  device('shell','input','tap',String(point.x),String(point.y));
  await page.waitForFunction(()=>document.documentElement.classList.contains('keyboard-open'));await page.waitForTimeout(700);
  const sheet=await page.evaluate(()=>{const r=document.querySelector('#modal').getBoundingClientRect(),b=document.querySelector('#quick-progress-form [type=submit]').getBoundingClientRect(),v=visualViewport;return {dialog:{top:r.top,bottom:r.bottom},save:{top:b.top,bottom:b.bottom},viewport:{top:v.offsetTop,height:v.height},visible:r.top>=v.offsetTop&&r.bottom<=v.offsetTop+v.height&&b.bottom<=v.offsetTop+v.height};});
  report.sheet=sheet;check('advance sheet and save stay above real IME',sheet.visible);capture('rebuild-sheet-ime-final');
  console.log(JSON.stringify(report));
}finally{device('shell','input','keyevent','4');writeFileSync('output/rebuild/android-viewport-report.json',JSON.stringify(report,null,2));await browser.close();}
