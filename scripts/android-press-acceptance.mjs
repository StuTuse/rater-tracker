// Real WebView touch rendering compared with desktop mouse hover. Guest data only.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
import {attach,screenshot,device} from './android-device.mjs';
const shared=readFileSync('packages/ui/styles.css','utf8');
const cases=[
 ['button','<button>普通操作</button>'],
 ['primary','<button class="primary">保存</button>'],
 ['secondary','<button class="secondary">取消</button>'],
 ['icon','<button class="icon-button">×</button>'],
 ['rating','<div class="rating-card">评分卡</div>'],
 ['task','<div class="task-card">任务卡</div>'],
 ['star','<button class="star-button"><svg class="icon"><path d="M2 2L18 18"/></svg></button>'],
 ['zero','<button class="zero">0 星</button>'],
 ['navigation','<button class="nav-link">今日</button>'],
 ['segment','<div class="segmented"><button>全部</button></div>','button'],
 ['chip','<button class="chip">学习</button>'],
 ['text','<button class="text-button">详情</button>'],
 ['title','<button class="title-button">任务名称</button>'],
 ['danger','<button class="danger-text">删除</button>'],
 ['badge','<button class="badge-card"><img alt="徽章" width="50" height="50" src="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27/%3E">徽章</button>'],
 ['summary','<details><summary>评分原因</summary></details>','summary'],
 ['account','<button class="account-entry">账号</button>'],
 ['trigger','<button class="control-trigger">选择</button>'],
 ['date','<div class="date-switch"><button class="control-trigger">日期</button></div>','button'],
 ['option','<button class="control-option">完整动效</button>'],
 ['calendar','<button class="calendar-day">14</button>'],
 ['month','<div class="control-popover"><button class="calendar-nav">›</button></div>','button'],
 ['day','<div class="control-popover"><button class="calendar-day">14</button></div>','button'],
 ['today','<button class="calendar-today">今天</button>'],
];
const probeStyle='<style>#press-probe{position:fixed;inset:100px 20px auto;z-index:2000;background:#faf8ef;padding:30px;width:300px}#press-probe>*{min-width:100px;min-height:50px;animation:none!important}#press-probe button{animation:none!important}</style>';
const sample=el=>{const read=n=>{const s=getComputedStyle(n);return Object.fromEntries(['backgroundColor','borderTopColor','boxShadow','color','transform','scale'].map(k=>[k,k==='scale'&&s[k]==='none'?'1':s[k]]));};return {self:read(el),child:el.querySelector('img,.icon')?read(el.querySelector('img,.icon')):null};};
const desktop=await chromium.launch({headless:true});
const desktopPage=await desktop.newPage({viewport:{width:1200,height:900}});
await desktopPage.setContent('<style>'+shared+'</style>'+probeStyle+'<section id="press-probe"></section>');
const {browser,page}=await attach(process.argv[2]??'local.ratertracker.android.dev');
await page.waitForFunction(()=>!document.querySelector('#startup'));
const report={};
let touchPoint=['0','0'];
async function fixture(p,html,target=':scope > *'){
 await p.evaluate(h=>{let probe=document.querySelector('#press-probe');if(!probe){document.body.insertAdjacentHTML('beforeend',h.style+'<section id="press-probe"></section>');probe=document.querySelector('#press-probe');}probe.innerHTML=h.html;},{style:probeStyle,html});
 return p.locator('#press-probe').locator(target).first();
}
async function touch(el){const b=await el.boundingBox(),d=await page.evaluate(()=>devicePixelRatio);touchPoint=[String(Math.round((b.x+b.width/2)*d)),String(Math.round((b.y+b.height/2)*d))];device('shell','input','motionevent','DOWN',...touchPoint);await page.waitForTimeout(100);assert.equal(await el.evaluate(e=>e.hasAttribute('data-touch-pressed')||e.disabled),true,'native press reaches target');await el.evaluate(e=>{for(const a of e.getAnimations({subtree:true}))if(a.transitionProperty)a.finish();});}
async function cancel(){device('shell','input','motionevent','CANCEL',...touchPoint);await page.waitForTimeout(400);}
try{
 assert.equal(await page.evaluate(()=>window.raterNative?.active),true);
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.platform),'android');
 await page.evaluate(()=>document.documentElement.dataset.motion='full');
 for(const [name,html,target] of cases){
  const d=await fixture(desktopPage,html,target),a=await fixture(page,html,target);
  const resting=await a.evaluate(sample);
  await d.hover();await desktopPage.waitForTimeout(400);const expected=await d.evaluate(sample);
  // The circular mobile avatar keeps its existing resting shadow.
  if(name==='account')expected.self.boxShadow=resting.self.boxShadow;
  await touch(a);const pressed=await a.evaluate(sample);
  assert.deepEqual(pressed,expected,name+' desktop hover parity');
  assert.equal(await a.evaluate(el=>getComputedStyle(el).webkitTapHighlightColor),'rgba(0, 0, 0, 0)');
  if(name==='primary'||name==='star'||name==='badge')await screenshot(page,'press-'+name);
  await cancel();assert.deepEqual(await a.evaluate(sample),resting,name+' touch cancel restores');
  await touch(a);device('shell','input','motionevent','UP',...touchPoint);await page.waitForTimeout(400);
  assert.deepEqual(await a.evaluate(sample),resting,name+' release restores');
  report[name]={desktopParity:true,cancelRestores:true,releaseRestores:true,noBlueOverlay:true};
 }
 const disabled=await fixture(page,'<button class="primary" disabled>不能保存</button>');
 const before=await disabled.evaluate(sample);await touch(disabled);assert.deepEqual(await disabled.evaluate(sample),before);await cancel();report.disabled=true;
 const drag=await fixture(page,cases[1][1]);await touch(drag);
 device('shell','input','motionevent','MOVE',touchPoint[0],String(Number(touchPoint[1])+150));await page.waitForTimeout(400);
 assert.equal(await page.locator('[data-touch-pressed]').count(),0);await cancel();report.scrollGestureClears=true;
 await touch(drag);await page.evaluate(()=>window.dispatchEvent(new Event('rater-pause')));
 assert.equal(await page.locator('[data-touch-pressed]').count(),0);await cancel();report.backgroundClears=true;
 for(const mode of ['gentle','off']){
  await page.evaluate(m=>document.documentElement.dataset.motion=m,mode);
  const el=await fixture(page,cases.find(c=>c[0]==='badge')[1]);await touch(el);
  assert.equal((await el.evaluate(sample)).self.transform,'none');assert.equal((await el.evaluate(sample)).child.transform,'none');await cancel();report[mode]=true;
 }
 await page.evaluate(()=>document.documentElement.dataset.motion='full');await page.emulateMedia({reducedMotion:'reduce'});
 const reduced=await fixture(page,cases.find(c=>c[0]==='primary')[1]);await touch(reduced);assert.equal((await reduced.evaluate(sample)).self.transform,'none');await cancel();report.systemReducedMotion=true;
 console.log(JSON.stringify(report,null,2));
}finally{
 await cancel().catch(()=>{});await page.evaluate(()=>document.querySelector('#press-probe')?.remove()).catch(()=>{});
 await page.emulateMedia({reducedMotion:'no-preference'});await page.reload();await page.waitForFunction(()=>!!window.raterReady);await page.evaluate(()=>window.raterReady);
 mkdirSync('output/android',{recursive:true});writeFileSync('output/android/press-report.json',JSON.stringify(report,null,2));
 await browser.close();await desktop.close();
}
