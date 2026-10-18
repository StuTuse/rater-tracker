// Playwright CLI run-code --filename=scripts/ui-polish-acceptance.cjs; isolated guest browser only.
async page => {
 const checks={},sizes=[];
 const check=(name,value)=>{checks[name]=Boolean(value);if(!value)throw Error(name);};
 const settle=()=>page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));
 const read=()=>page.evaluate(async()=>{const{openStore}=await import('./src/storage.js');const db=await openStore(),s=await db.read();db.close();return s;});
 const motion=id=>page.evaluate(id=>document.getAnimations().filter(a=>a.id===id).map(a=>({target:a.effect.target.className,frames:a.effect.getKeyframes(),duration:a.effect.getTiming().duration})),id);
 const go=async name=>{await page.getByRole('navigation').getByRole('button',{name,exact:true}).click();await settle();};
 await page.reload();await page.evaluate(()=>window.raterReady);
 if(await page.evaluate(()=>Boolean(JSON.parse(localStorage.getItem('rater-active-account')??'null')?.id)))throw Error('Run only in an isolated guest browser');
 if(await page.locator('#modal[open][data-kind=account]').count()){await page.getByRole('button',{name:'关闭',exact:true}).click();await settle();}
 const original=await read();
 const originalDrafts=await page.evaluate(async()=>{const{openStore}=await import('./src/storage.js');const db=await openStore(),drafts=await db.readAux('text-drafts');db.close();return drafts;});
 try {
  await page.evaluate(async original=>{
   const{createState,transact,addDays,hongKong}=await import('./src/core.js');const{openStore}=await import('./src/storage.js');let s=createState();const date=hongKong().date;
   const act=(a,d=date)=>s=transact(s,{id:crypto.randomUUID(),...a},d+'T12:00:00+08:00');
   for(let i=7;i>=0;i--){const d=addDays(date,-i);for(const[j,dimension]of ['study','work','health','life'].entries()){act({type:'rate',date:d,dimension,stars:(i+j)%6},d);act({type:'note',date:d,dimension,note:j<2?'完成练习，整理了可以回看的依据。':''},d);}act({type:'journal',date:d,note:'今天向前走了一小步。'},d);}
   act({type:'createTask',id:'ui-short',title:'完成短片初剪与声音整理',start:date,target:addDays(date,6),importance:'important',dimension:'work',stages:'整理素材\n完成初剪\n声音字幕'});
   act({type:'createTask',id:'ui-long',title:'系统学习视觉设计，整理一份可以复用的作品集',start:date,target:addDays(date,45),importance:'normal',dimension:'study',stages:'整理参考\n完成练习\n归档作品'});
   act({type:'progress',taskId:'ui-short',date,note:'整理素材，确认了主要节奏。'});
   s.revision=original.revision+1;const db=await openStore();await db.write(s,original.revision);db.close();
  },original);
  await page.reload();await page.evaluate(()=>window.raterReady);await page.setViewportSize({width:390,height:844});await settle();
  check('phoneHasOneTaskAndAllTasksEntry',await page.locator('.today-tasks .task-card:visible').count()===1&&await page.getByRole('button',{name:'查看全部 2 项',exact:true}).isVisible());
  await page.getByRole('button',{name:'写健康记录',exact:true}).click();
  const field=page.getByRole('textbox',{name:'健康原因与依据',exact:true});
  check('writeFocusIsImmediate',await field.evaluate(e=>e===document.activeElement));
  check('noteOpenHasSizeMotion',(await motion('layout-resize')).length>0);await settle();
  const text='记录完整的一段练习过程。\n'.repeat(8);
  await field.fill(text);
  await page.evaluate(()=>{window.__editor=document.activeElement;window.__editorHeight=document.activeElement.style.height;document.querySelector('[data-action=rate][data-dimension=work][data-stars="4"]').click();});
  await page.waitForFunction(()=>document.querySelector('[data-dimension=work][data-stars="4"]').getAttribute('aria-pressed')==='true');
  check('savedUpdatePreservesEditorAndHeight',await field.evaluate(e=>e===window.__editor&&e===document.activeElement&&e.style.height===window.__editorHeight&&e.scrollHeight<=e.clientHeight+2));
  await page.getByRole('heading',{name:'今日记录',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.rating-card [data-dimension=health].write-note')?.getAttribute('aria-expanded')==='false');
  await settle();const saved=await read();
  check('noteSavedAndReadable',saved.ratings[Object.keys(saved.ratings).sort().at(-1)].health.note===text.trim());
  check('noInlineCardHeightAfterMotion',await page.locator('.rating-card').evaluateAll(es=>es.every(e=>!e.style.height&&!e.style.overflow)));
  await page.getByRole('button',{name:'推进',exact:true}).first().click();await settle();
  check('quickProgressHasOnlyNecessaryControls',await page.locator('#quick-task-form').count()===1&&await page.locator('#modal input[type=date]').count()===0&&await page.locator('#modal .detail-actions').count()===0);
  check('quickProgressFitsPhone',await page.locator('#modal').evaluate(e=>e.scrollHeight<=e.clientHeight+1&&e.getBoundingClientRect().height<700));
  await page.getByRole('textbox',{name:'成果说明',exact:true}).fill('完成了一次新的声音整理。');
  await page.getByRole('button',{name:'保存推进',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('#modal').open);await settle();
  check('taskProgressSaved',(await read()).tasks['ui-short'].progress.filter(p=>p.active).length===2);
  await go('历史');await page.evaluate(()=>{window.__chart=document.querySelector('.trend-chart svg');});
  const dates=await page.locator('.history-recall .calendar-day:not(:disabled)').all();await dates.at(-2).click();
  check('historyRecallHasLocalMotion',(await motion('page-enter')).some(a=>String(a.target).includes('day-recall')));
  check('historyGraphNodeSurvivesDateChange',await page.evaluate(()=>window.__chart===document.querySelector('.trend-chart svg')));
  await settle();await page.getByRole('button',{name:'上个月',exact:true}).click();
  check('monthHasLocalMotion',(await motion('page-enter')).some(a=>String(a.target).includes('calendar-grid')));await settle();
  await page.getByRole('button',{name:'周报归档',exact:true}).click();
  check('weeklyArchiveHasEntrance',(await motion('page-enter')).length>0);await settle();
  check('weeklyDayContentIsContained',await page.locator('.weekly-original>.weekly-day-content').count()===1&&await page.locator('.weekly-next').count()===1);
  const day=page.locator('.weekly-days button').nth(2);await day.scrollIntoViewIfNeeded();const scroll=await page.evaluate(()=>scrollY);await day.click();
  const dayMotion=await motion('page-enter');check('weeklyDayAnimatesOnlyOriginal',dayMotion.length===1&&dayMotion.every(a=>String(a.target).includes('weekly-day-content')));
  check('weeklyDayDoesNotJumpPage',Math.abs(await page.evaluate(()=>scrollY)-scroll)<=2);await settle();
  for(const width of [320,390,800,1280]){await page.setViewportSize({width,height:900});await settle();check('weeklyNoOverflow'+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if([390,800].includes(width))await page.screenshot({path:'output/playwright/polish-weekly-'+width+'.png',fullPage:true});}
  await go('设置');await page.locator('#motion-setting').evaluate(e=>{e.value='off';e.dispatchEvent(new Event('change',{bubbles:true}));});await page.waitForFunction(()=>document.documentElement.dataset.motion==='off');
  await go('历史');await page.getByRole('button',{name:'日历回看',exact:true}).click();await settle();await page.getByRole('button',{name:'周报归档',exact:true}).click();
  check('offStopsContentMotion',await page.locator('#content').evaluate(e=>e.getAnimations({subtree:true}).length===0));
  await go('设置');await page.locator('#motion-setting').evaluate(e=>{e.value='full';e.dispatchEvent(new Event('change',{bubbles:true}));});await page.waitForFunction(()=>document.documentElement.dataset.motion==='full');
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.documentElement.dataset.motion==='gentle');
  await go('历史');await page.getByRole('button',{name:'日历回看',exact:true}).click();await settle();await page.evaluate(()=>{window.__animateOriginal=Element.prototype.animate;window.__motionCalls=[];Element.prototype.animate=function(...args){const a=window.__animateOriginal.apply(this,args);window.__motionCalls.push(a);return a;};});await page.getByRole('button',{name:'周报归档',exact:true}).click();const gentle=await page.evaluate(()=>{Element.prototype.animate=window.__animateOriginal;return window.__motionCalls.filter(a=>a.id==='page-enter').map(a=>({frames:a.effect.getKeyframes()}));});
  check('reducedMotionHasNoTranslation',gentle.length>0&&gentle.every(a=>a.frames.every(f=>!f.translate||f.translate==='none')));await settle();await page.emulateMedia({reducedMotion:'no-preference'});
  for(const platform of ['desktop','android']){
   await page.reload();await page.evaluate(()=>window.raterReady);
   if(platform==='android'){await page.addStyleTag({path:'apps/android/mobile.css'});await page.addStyleTag({path:'packages/ui/experience.css'});await page.evaluate(()=>{document.documentElement.dataset.platform='android';document.querySelector('.topbar').append(document.querySelector('#account-entry-slot'));});}
   for(const width of [320,360,390,700,800,1024,1280,1440]){
    await page.setViewportSize({width,height:900});await settle();
    const geometry=await page.evaluate(()=>({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,controlsFit:[...document.querySelectorAll('.rating-control')].every(e=>e.scrollWidth<=e.clientWidth+1),touch:[...document.querySelectorAll('.star-button,.write-note')].every(e=>e.getBoundingClientRect().width>=44&&e.getBoundingClientRect().height>=44),aligned:innerWidth<700||Math.abs(document.querySelector('.today-layout>section .section-title').getBoundingClientRect().top-document.querySelector('.today-tasks .section-title').getBoundingClientRect().top)<1,account:document.querySelector('#account-entry-slot').getBoundingClientRect().right<=innerWidth}));
    sizes.push({platform,...geometry});check(platform+'Layout'+width,!geometry.overflow&&geometry.controlsFit&&geometry.touch&&geometry.aligned&&geometry.account);
    if([390,800,1280].includes(width))await page.screenshot({path:'output/playwright/polish-'+platform+'-'+width+'.png',fullPage:true});
   }
   for(const name of ['任务','历史','奖励中心','设置']){await go(name);await page.setViewportSize({width:320,height:844});await settle();check(platform+name+'NoOverflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(name==='历史')await page.screenshot({path:'output/playwright/polish-'+platform+'-history.png',fullPage:true});}
  }
  console.log(JSON.stringify({checks,sizes},null,2));return {checks,sizes};
 } finally {
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(async({original,originalDrafts})=>{const{openStore}=await import('./src/storage.js');const db=await openStore(),current=await db.read();original.revision=current.revision+1;await db.write(original,current.revision);await db.writeAux('text-drafts',originalDrafts??{});db.close();},{original,originalDrafts});
  await page.reload();await page.evaluate(()=>window.raterReady);
 }
}
