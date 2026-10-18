// Shared actual-viewport smoke for packaged Electron and the isolated Android WebView.
async (page, { output, dismissKeyboard = async()=>{}, captureDevice = async()=>{} }) => {
 const checks={};const check=(key,value)=>{checks[key]=Boolean(value);if(!value)throw Error(key);};
 const ready=async()=>{await page.waitForFunction(()=>Boolean(window.raterReady));await page.evaluate(()=>window.raterReady);};
 const settle=()=>page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));
 const read=()=>page.evaluate(async()=>{const{openStore}=await import('./src/storage.js');const db=await openStore(),s=await db.read();db.close();return s;});
 await ready();await settle();
 if(await page.evaluate(()=>Boolean(JSON.parse(localStorage.getItem('rater-active-account')??'null')?.id)))throw Error('Use an isolated guest runtime');
 const prompt=await page.locator('#modal[open][data-kind=account]').count()>0;
 if(prompt){await page.getByRole('button',{name:'关闭',exact:true}).click();await settle();}
 const original=await read();
 const aux=await page.evaluate(async()=>{const{openStore}=await import('./src/storage.js');const db=await openStore(),aux=await db.readAux('text-drafts');db.close();return aux;});
 try {
  check('runtimeVersion',await page.evaluate(async()=>(await(window.desktop??window.raterNative).info()).version==='1.0.1'));
  await page.evaluate(async original=>{
   const{createState,transact,hongKong,addDays}=await import('./src/core.js');const{openStore}=await import('./src/storage.js');let s=createState();const d=hongKong().date;
   const act=a=>s=transact(s,{id:crypto.randomUUID(),...a},d+'T12:00:00+08:00');
   for(const dimension of ['study','work','health','life'])act({type:'rate',date:d,dimension,stars:3});
   act({type:'createTask',id:'runtime-ui',title:'整理并完成本周作品',start:d,target:addDays(d,7),importance:'normal',dimension:'work',stages:'整理\n制作\n交付'});
   s.revision=original.revision+1;const db=await openStore();await db.write(s,original.revision);db.close();
  },original);
  await page.reload();await ready();await settle();
  check('noHorizontalOverflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  check('starsAndPencils44px',await page.locator('.star-button,.write-note').evaluateAll(es=>es.every(e=>e.getBoundingClientRect().width>=44&&e.getBoundingClientRect().height>=44)));
  check('ratingControlsFit',await page.locator('.rating-control').evaluateAll(es=>es.every(e=>e.scrollWidth<=e.clientWidth+1)));
  check('pencilIsRightAligned',await page.locator('.rating-card').evaluateAll(es=>es.every(e=>Math.abs(e.querySelector('.card-top').getBoundingClientRect().right-e.querySelector('.write-note').getBoundingClientRect().right)<1)));
  await page.screenshot({path:output+'/home.png',fullPage:true});await captureDevice('home');
  await page.getByRole('button',{name:'写学习记录',exact:true}).click();
  check('writeFocus',await page.getByRole('textbox',{name:'学习原因与依据',exact:true}).evaluate(e=>e===document.activeElement));
  check('noteSizeAnimation',await page.locator('.rating-card').evaluateAll(es=>es.some(e=>e.getAnimations().some(a=>a.id==='layout-resize'))));
  await page.getByRole('textbox',{name:'学习原因与依据',exact:true}).fill('本轮隔离界面验收：输入后保存，保留评分与经验。');
  await settle();await page.screenshot({path:output+'/writing.png',fullPage:true});await captureDevice('writing');
  await dismissKeyboard();await page.getByRole('heading',{name:'今日记录',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('[aria-label="写学习记录"]').getAttribute('aria-expanded')==='false');await settle();
  const after=await read();check('notePersists',Object.values(after.ratings).some(day=>day.study?.note==='本轮隔离界面验收：输入后保存，保留评分与经验。'));
  await page.getByRole('button',{name:'推进',exact:true}).first().click();await settle();
  check('quickDialogFits',await page.locator('#modal').evaluate(e=>e.scrollHeight<=e.clientHeight+1));
  check('quickDialogHasNoDateOrManagement',await page.locator('#modal input[type=date],#modal .detail-actions').count()===0);
  await page.screenshot({path:output+'/progress.png'});await captureDevice('progress');await page.getByRole('button',{name:'取消',exact:true}).click();await settle();
  await page.getByRole('navigation').getByRole('button',{name:'历史',exact:true}).click();await settle();
  await page.evaluate(()=>{window.__runtimeChart=document.querySelector('.trend-chart svg');});await page.getByRole('button',{name:'前一天',exact:true}).click();await settle();
  check('chartNodeStable',await page.evaluate(()=>window.__runtimeChart===document.querySelector('.trend-chart svg')));
  check('historyFits',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:output+'/history.png',fullPage:true});await captureDevice('history');
  await page.getByRole('button',{name:'周报归档',exact:true}).click();await settle();
  check('weeklyContainsOriginal',await page.locator('.weekly-original>.weekly-day-content').count()===1);
  check('weeklyFits',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:output+'/weekly.png',fullPage:true});await captureDevice('weekly');
  return{promptShown:prompt,checks,viewport:await page.evaluate(()=>({width:innerWidth,height:innerHeight,platform:document.documentElement.dataset.platform??'windows'}))};
 } finally {
  await page.evaluate(async({original,aux})=>{const{openStore}=await import('./src/storage.js');const db=await openStore(),now=await db.read();original.revision=now.revision+1;await db.write(original,now.revision);await db.writeAux('text-drafts',aux??{});db.close();},{original,aux});
  await page.reload();await ready();
 }
}
