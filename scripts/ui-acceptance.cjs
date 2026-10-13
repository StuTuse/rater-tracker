// Real UI regression: stable DOM, committed star feedback and preserved drafts.
async page => {
  await page.reload();await page.evaluate(()=>window.raterReady);
  const original = await page.evaluate(async () => { const {openStore}=await import('./src/storage.js'); const db=await openStore(),s=await db.read();db.close();return s; });
  const report = {};let rapidProbe;
  const waitRevision = expected => page.evaluate(async expected => {
    const{openStore}=await import('./src/storage.js'),db=await openStore(),end=performance.now()+10000;
    try { while(performance.now()<end) { if((await db.read()).revision===expected)return; await new Promise(resolve=>setTimeout(resolve,20)); } throw new Error('Saved revision did not reach '+expected); }
    finally {db.close();}
  },expected);
  page.setDefaultTimeout(10000);
  const stars = n => page.getByRole('button',{name:`学习 ${n} 星`,exact:true});
  const committed = n => page.waitForFunction(n => document.querySelector(`.star-button[data-dimension="study"][data-stars="${n}"]`).getAttribute('aria-pressed')==='true',n);
  try {
    await page.setViewportSize({width:1440,height:960});
    await page.evaluate(async () => {
      const c=await import('./src/core.js'),{openStore}=await import('./src/storage.js'),db=await openStore(),old=await db.read(),now=new Date().toISOString(),date=c.hongKong(now).date;
      let s=c.transact(c.createState(),{type:'rate',id:'ui-rate',date,dimension:'study',stars:3},now);
      s=c.transact(s,{type:'createTask',id:'ui-task',title:'交互验收任务',start:date,target:c.addDays(date,7),importance:'normal',stages:'准备\n完成'},now);
      s.revision=old.revision+1;await db.write(s,old.revision);db.close();await window.raterReload();
    });
    await page.getByRole('button',{name:'今日',exact:true}).click();
    await page.getByRole('button',{name:/^评分日期，当前/}).click();
    await page.getByRole('button',{name:'回到今天',exact:true}).click();
    await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));
    await page.evaluate(()=>{
      window.uiProbe={cards:[...document.querySelectorAll('.rating-card')],button:document.querySelector('.star-button[data-dimension="study"][data-stars="5"]'),note:document.querySelector('.rating-note[data-dimension="study"]'),animations:[],entrances:new Set(document.querySelector('#content').getAnimations({subtree:true}).filter(a=>a instanceof CSSAnimation)),animate:Element.prototype.animate,put:IDBObjectStore.prototype.put};
      Element.prototype.animate=function(frames,options){if(this.closest?.('.star-button'))window.uiProbe.animations.push({dimension:this.closest('.star-button').dataset.dimension,stars:this.closest('.star-button').dataset.stars,committed:this.closest('.star-button').classList.contains('lit')});return window.uiProbe.animate.call(this,frames,options);};
    });
    await stars(5).hover();
    report.hoverPreviewsWithoutSaving=await page.evaluate(async()=>{const {openStore}=await import('./src/storage.js'),db=await openStore(),s=await db.read();db.close();return document.querySelectorAll('.preview-lit').length===5&&s.ratings[Object.keys(s.ratings)[0]].study.stars===3;});
    await page.screenshot({path:'output/playwright/alpha4-hover.png',fullPage:true});
    await page.locator('h1').hover();
    report.hoverClears=await page.locator('.preview-lit,.preview-dim').count()===0;
    await page.locator('.rating-card').first().locator('summary').click();
    await page.getByLabel('学习原因与依据').fill('尚未离开输入框的备注');
    await page.evaluate(()=>{window.uiProbe.note.setSelectionRange(2,5);window.uiProbe.scroll=scrollY;window.uiProbe.animations=[];window.uiProbe.button.click();});
    await committed(5);
    report.stableCardsAndControls=await page.evaluate(()=>window.uiProbe.cards.every((c,i)=>c===document.querySelectorAll('.rating-card')[i])&&window.uiProbe.button===document.querySelector('.star-button[data-dimension="study"][data-stars="5"]'));
    report.onlyChangedStarsAnimate=await page.evaluate(()=>window.uiProbe.animations.length===2&&window.uiProbe.animations.every(a=>a.dimension==='study'&&['4','5'].includes(a.stars)&&a.committed));
    report.noCardEntranceReplay=await page.evaluate(()=>document.querySelector('#content').getAnimations({subtree:true}).filter(a=>a instanceof CSSAnimation).every(a=>window.uiProbe.entrances.has(a)));
    report.draftFocusAndSelectionPreserved=await page.evaluate(()=>document.activeElement===window.uiProbe.note&&window.uiProbe.note.value==='尚未离开输入框的备注'&&window.uiProbe.note.selectionStart===2&&window.uiProbe.note.selectionEnd===5&&window.uiProbe.note.closest('details').open&&scrollY===window.uiProbe.scroll);
    await stars(4).focus();await page.keyboard.press('Space');await committed(4);
    report.keyboardFocusPreserved=await stars(4).evaluate(b=>document.activeElement===b);
    await page.evaluate(()=>{window.uiProbe.animations=[];IDBObjectStore.prototype.put=function(){throw new DOMException('模拟磁盘写入失败','QuotaExceededError');};});
    await stars(5).click();
    await page.waitForFunction(()=>document.querySelector('#save-status').textContent==='本次未保存');
    report.failureKeepsConfirmedStars=await page.evaluate(()=>document.querySelectorAll('.rating-card:first-child .star-button.lit').length===4&&window.uiProbe.animations.length===0);
    const expectedRevision=await page.evaluate(async()=>{
      window.uiProbe.writes=[];window.uiProbe.clicks=[];
      window.uiProbe.listener=e=>{const b=e.target.closest('[data-action="rate"]');if(b)window.uiProbe.clicks.push(b.dataset.stars);};document.addEventListener('click',window.uiProbe.listener);
      IDBObjectStore.prototype.put=function(value,...args){window.uiProbe.writes.push({revision:value?.revision,stars:value?.ratings?.[document.querySelector('#rating-date')?.value]?.study?.stars});return window.uiProbe.put.call(this,value,...args);};
      const{openStore}=await import('./src/storage.js'),db=await openStore(),s=await db.read();db.close();
      document.querySelectorAll('.star-button[data-dimension="study"]').forEach(b=>b.click());document.querySelector('.star-button[data-dimension="study"][data-stars="2"]').click();
      return s.revision+6;
    });
    await waitRevision(expectedRevision);
    await committed(2);
    rapidProbe=await page.evaluate(async()=>{const{openStore}=await import('./src/storage.js'),db=await openStore(),s=await db.read();db.close();return {lit:document.querySelectorAll('.rating-card:first-child .star-button.lit').length,date:document.querySelector('#rating-date').value,ratings:s.ratings,revision:s.revision,clicks:window.uiProbe.clicks,writes:window.uiProbe.writes};});
    rapidProbe.expected=expectedRevision;
    report.rapidClicksConverge=rapidProbe.lit===2&&rapidProbe.ratings[rapidProbe.date].study.stars===2;
    await page.getByRole('button',{name:'交互验收任务',exact:true}).click();
    await page.locator('#progress-form [name="note"]').fill('未提交的推进草稿');
    const stageRevision=await page.evaluate(async()=>{const{openStore}=await import('./src/storage.js'),db=await openStore(),s=await db.read();db.close();window.uiProbe.form=document.querySelector('#progress-form');window.uiProbe.taskNote=window.uiProbe.form.elements.note;document.querySelector('.stage-row input[data-stage]').click();return s.revision+1;});
    await waitRevision(stageRevision);
    report.taskFormSurvivesStageSave=await page.evaluate(()=>window.uiProbe.form===document.querySelector('#progress-form')&&window.uiProbe.taskNote.value==='未提交的推进草稿'&&document.activeElement===window.uiProbe.taskNote);
    await page.getByRole('button',{name:'关闭',exact:true}).click();
    await page.getByRole('button',{name:'设置',exact:true}).click();
    const ref=page.locator('#references-form [name="study"]');await ref.fill('未提交的参照草稿');
    await page.getByRole('button',{name:/^动效强度，当前/}).click();await page.getByRole('option',{name:'关闭 · 保留数值反馈',exact:true}).click();await page.waitForFunction(()=>document.documentElement.dataset.motion==='off');
    report.settingsDraftSurvives=await ref.inputValue()==='未提交的参照草稿';
    await page.getByRole('button',{name:'今日',exact:true}).click();await stars(5).click();await committed(5);
    report.offHasNoStarAnimations=await page.evaluate(()=>document.querySelector('.ratings-grid').getAnimations({subtree:true}).length===0);
    await page.getByRole('button',{name:'设置',exact:true}).click();await page.getByRole('button',{name:/^动效强度，当前/}).click();await page.getByRole('option',{name:'完整 · 金色成长反馈',exact:true}).click();await page.waitForFunction(()=>document.documentElement.dataset.motion==='full');
    await page.getByRole('button',{name:'今日',exact:true}).click();
    await page.screenshot({path:'output/playwright/alpha4-today.png',fullPage:true});
  } catch(error) {
    const debug=await page.evaluate(()=>({date:document.querySelector('#rating-date')?.value,html:document.querySelector('.rating-card')?.outerHTML,report:window.uiProbe?.animations}));
    throw new Error(error.message+'; UI debug '+JSON.stringify({completed:report,debug,rapidProbe}));
  } finally {
    await page.evaluate(async original=>{
      if(window.uiProbe){Element.prototype.animate=window.uiProbe.animate;IDBObjectStore.prototype.put=window.uiProbe.put;if(window.uiProbe.listener)document.removeEventListener('click',window.uiProbe.listener);delete window.uiProbe;}
      const modal=document.querySelector('#modal');if(modal.open)modal.close();
      const{openStore}=await import('./src/storage.js'),db=await openStore(),s=await db.read();original.revision=s.revision+1;await db.write(original,s.revision);db.close();
    },original);
    page.setDefaultTimeout(30000);
    await page.reload();await page.evaluate(()=>window.raterReady);
  }
  console.log(JSON.stringify(report,null,2));
  if(Object.values(report).some(v=>v!==true))throw new Error('UI acceptance failed: '+JSON.stringify({report,rapidProbe}));
  return report;
}
