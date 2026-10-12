// App controls: real pointer/keyboard paths, form data and secondary transitions.
async page => {
  page.setDefaultTimeout(7000);
  await page.reload(); await page.evaluate(() => window.raterReady);
  const original = await page.evaluate(async () => { const {openStore}=await import('./src/storage.js');const db=await openStore(),s=await db.read();db.close();return s; });
  const report = {};
  const waitSaved = () => page.waitForFunction(() => document.querySelector('#save-status').textContent === '已保存到本机');
  const currentDate = await page.evaluate(async () => (await import('./src/core.js')).hongKong().date);
  const settle = () => page.waitForTimeout(340);
  const trigger = name => page.getByRole('button', {name:new RegExp(`^${name}，当前`)});
  try {
    await page.setViewportSize({width:1440,height:960});
    await page.evaluate(async () => {
      const c=await import('./src/core.js'),{openStore}=await import('./src/storage.js'),db=await openStore(),old=await db.read();
      const s=c.createState();s.revision=old.revision+1;await db.write(s,old.revision);db.close();await window.raterReload();
    });
    await trigger('评分日期').click(); await settle();
    report.calendarBounds = await page.locator('.control-popover').evaluate(el => {
      const max=document.querySelector('#rating-date').max;
      return [...el.querySelectorAll('[data-calendar-date]')].every(b=>b.disabled === (b.dataset.calendarDate > max)) && el.querySelector('[data-calendar-nav="1"]').disabled;
    });
    const currentMonth=await page.locator('.date-popover .calendar-head strong').textContent();
    await page.getByRole('button',{name:'上个月',exact:true}).click();await page.waitForTimeout(40);
    report.monthNavigationAnimated = (await page.locator('.date-popover .calendar-head strong').textContent())!==currentMonth&&await page.locator('.date-popover .calendar-grid').evaluate(el=>el.getAnimations().length>0);
    await settle();await page.getByRole('button',{name:'下个月',exact:true}).click();await settle();
    await page.screenshot({path:'output/playwright/alpha5-calendar.png'});
    await page.getByRole('button',{name:'回到今天'}).click();
    report.popoverExit = await page.locator('.control-popover.is-closing').count() === 1;
    await settle();
    report.calendarCommitAndCleanup = await page.locator('#rating-date').inputValue() === currentDate && await page.locator('.control-popover').count() === 0;
    await page.getByRole('button',{name:'新建',exact:true}).click();
    report.modalEnter = await page.locator('#modal').evaluate(el=>el.getAnimations().some(a=>a.transitionProperty==='opacity'||a.transitionProperty==='transform'));
    report.allNewControls = await page.locator('#task-form .control-trigger').count() === 4;
    await page.locator('#task-form [name=title]').fill('控件验收任务');
    await trigger('所属项目').click();await settle();
    report.popoverInModal = await page.locator('.select-popover').evaluate(el=>el.closest('dialog')?.open && el.matches(':popover-open'));
    await page.screenshot({path:'output/playwright/alpha5-dropdown.png'});
    await page.getByRole('option',{name:'学习',exact:true}).click();await settle();
    await trigger('所属项目').focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Tab');await settle();
    report.tabLeavesPopup = await page.locator('.control-popover').count()===0&&await trigger('重要性').evaluate(el=>document.activeElement===el);
    await trigger('重要性').focus(); await page.keyboard.press('ArrowDown');
    await page.keyboard.press('End');await page.keyboard.press('Enter');await settle();
    report.keyboardSelectAndPreview = await page.locator('select[name=importance]').inputValue()==='core' && (await page.locator('#plan-preview').textContent()).includes('156.0');
    await trigger('原目标日期').click();await settle();await page.keyboard.press('Escape');await settle();
    report.escapeClosesOnlyPopover = await page.locator('dialog[open]').count()===1 && await page.locator('.control-popover').count()===0;
    await trigger('计划开始日期').click();await settle();await page.locator('#modal-title').click();await settle();
    report.outsideDismiss = await page.locator('.control-popover').count()===0;
    report.formValues = await page.locator('#task-form').evaluate(form=>{const f=new FormData(form);return f.get('dimension')==='study'&&f.get('importance')==='core'&&f.get('start')&&f.get('target');}).then(Boolean);
    await page.getByRole('button',{name:'创建任务 · +2 XP',exact:true}).click();await waitSaved();await settle();
    report.createdWithCustomValues = await page.evaluate(async()=>{const{openStore}=await import('./src/storage.js'),db=await openStore(),s=await db.read();db.close();const t=Object.values(s.tasks)[0];return t.title==='控件验收任务'&&t.dimension==='study'&&t.importance==='core';});
    await trigger('实际推进日期').click();await settle();
    report.taskDateRange = await page.locator('.date-popover').evaluate(el=>{const s=document.querySelector('#progress-form [name=date]');return [...el.querySelectorAll('[data-calendar-date]')].every(b=>b.disabled===!!(s.min&&b.dataset.calendarDate<s.min||s.max&&b.dataset.calendarDate>s.max));});
    await page.keyboard.press('Escape');await settle();
    const details=page.locator('#modal details');
    const closedHeight=await details.evaluate(el=>el.getBoundingClientRect().height);
    await page.locator('#modal details summary').click();await page.waitForTimeout(60);
    const enteringHeight=await details.evaluate(el=>el.getBoundingClientRect().height);
    await settle();
    const openedHeight=await details.evaluate(el=>el.getBoundingClientRect().height);
    report.detailsEnter = enteringHeight>closedHeight&&enteringHeight<openedHeight-1;
    await page.locator('#modal details summary').click();await page.waitForTimeout(60);
    const exitingHeight=await details.evaluate(el=>el.getBoundingClientRect().height);
    report.detailsExit = exitingHeight>closedHeight+1&&exitingHeight<openedHeight;
    await settle();
    await page.locator('#progress-form [name=note]').fill('通过应用控件记录推进');
    await page.getByRole('button',{name:'保存推进',exact:true}).click();await waitSaved();await settle();
    report.refreshNoDuplicateControls = await page.locator('#modal').evaluate(el=>{
      const sources=[...el.querySelectorAll('select,input[type=date]')],triggers=[...el.querySelectorAll('.control-trigger')];
      return sources.length===triggers.length && new Set(triggers.map(t=>t.dataset.controlFor)).size===triggers.length && sources.every(s=>triggers.some(t=>t.dataset.controlFor===s.dataset.controlId));
    });
    await page.getByRole('button',{name:'关闭',exact:true}).click();
    report.modalExit = await page.locator('#modal').evaluate(el=>!el.open&&getComputedStyle(el).display==='block'&&el.getAnimations().some(a=>a.transitionProperty==='overlay'));
    await settle();
    report.modalRemovedFromTopLayer = await page.locator('#modal').evaluate(el=>getComputedStyle(el).display==='none');
    await page.getByRole('button',{name:'任务',exact:true}).click();await settle();
    await page.evaluate(()=>window.segmentProbe=document.querySelector('.segment-indicator'));
    await page.getByRole('button',{name:'已完成',exact:true}).click();await page.waitForTimeout(60);
    report.segmentSlidesWithoutReplacement = await page.locator('.segmented').evaluate(el=>{
      const i=el.querySelector('.segment-indicator'),b=el.querySelector('button.selected');
      return i===window.segmentProbe&&i.getAnimations().some(a=>a.transitionProperty==='transform')&&parseFloat(el.style.getPropertyValue('--segment-x'))===b.offsetLeft;
    });
    await settle();await page.screenshot({path:'output/playwright/alpha5-segmented.png'});
    await page.getByRole('button',{name:'奖励中心',exact:true}).click();await settle();
    await page.mouse.wheel(0,650);await page.waitForTimeout(120);
    report.scrollbarHiddenScrollWorks = await page.evaluate(()=>getComputedStyle(document.documentElement).scrollbarWidth==='none'&&scrollY>100&&innerWidth===document.documentElement.clientWidth);
    await page.setViewportSize({width:280,height:844});
    await page.getByRole('button',{name:'任务',exact:true}).click();await settle();
    report.horizontalMenuScroll = await page.locator('.segmented').evaluate(el=>{el.scrollLeft=100;return el.scrollWidth>el.clientWidth&&el.scrollLeft>0&&getComputedStyle(el).scrollbarWidth==='none';});
    await page.setViewportSize({width:390,height:844});
    await page.getByRole('button',{name:'今日',exact:true}).click();await trigger('评分日期').click();await settle();
    report.narrowCalendarFits = await page.locator('.date-popover').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=10&&r.right<=innerWidth-10&&r.bottom<=innerHeight-10;});
    await page.screenshot({path:'output/playwright/alpha5-narrow-calendar.png'});
    await page.keyboard.press('Escape');await settle();
    await page.getByRole('button',{name:'设置',exact:true}).click();
    await trigger('动效强度').click();await page.getByRole('option',{name:'关闭 · 保留数值反馈',exact:true}).click();await waitSaved();await settle();
    await trigger('动效强度').click();
    report.offNoControlMotion = await page.locator('.control-popover').evaluate(el=>el.getAnimations().length===0&&getComputedStyle(el).transitionDuration==='0s');
    await page.keyboard.press('Escape');
    report.offNoSecondaryMotion = await page.evaluate(()=>getComputedStyle(document.querySelector('#modal'),'::backdrop').transitionDuration==='0s'&&getComputedStyle(document.querySelector('#modal details'),'::details-content').transitionDuration==='0s');
    await trigger('动效强度').click();await page.getByRole('option',{name:'完整 · 金色成长反馈',exact:true}).click();await waitSaved();
    await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.documentElement.dataset.motion==='gentle');
    await trigger('动效强度').click();await settle();
    report.reducedMotionRespected = await page.locator('.control-popover').evaluate(el=>parseFloat(getComputedStyle(el).transitionDuration)<=.15);
    await page.keyboard.press('Escape');await page.emulateMedia({reducedMotion:'no-preference'});
  } catch(error) { throw new Error(error.message+'; completed='+JSON.stringify(report)); }
  finally {
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.evaluate(async original=>{
      const {closeControlLayer}=await import('./src/controls.js');closeControlLayer({immediate:true});
      const modal=document.querySelector('#modal');if(modal.open)modal.close();
      const{openStore}=await import('./src/storage.js'),db=await openStore(),s=await db.read();original.revision=s.revision+1;await db.write(original,s.revision);db.close();delete window.segmentProbe;
    },original);
    await page.setViewportSize({width:1440,height:960});await page.reload();await page.evaluate(()=>window.raterReady);
    page.setDefaultTimeout(30000);
  }
  console.log(JSON.stringify(report,null,2));
  if(Object.values(report).some(value=>value!==true))throw new Error('Controls acceptance failed: '+JSON.stringify(report));
  return report;
}
