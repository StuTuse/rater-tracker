// Real navigation, actual saved fixtures, controlled middle frames; restore in finally.
async page => {
  await page.reload();await page.evaluate(()=>window.raterReady);page.setDefaultTimeout(10000);
  const original=await page.evaluate(async()=>{const{openStore}=await import('./src/storage.js');const db=await openStore(),s=await db.read();db.close();return s;});
  const report={};
  const settle=()=>page.evaluate(()=>Promise.all(document.querySelector('#content').getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{}))));
  const probe=()=>page.locator('#content').evaluate(root=>{
    const animations=root.getAnimations({subtree:true}).filter(a=>a.id==='page-enter');
    animations.forEach(a=>{a.pause();a.currentTime=a.effect.getTiming().delay+120;});
    const targets=animations.map(a=>a.effect.target);
    const nodes=[...root.querySelectorAll('*')].filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden'&&(el.childNodes.length&&[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())||el.matches('img,input,textarea,button,svg')));
    const coverage=nodes.every(el=>targets.some(target=>target===el||target.contains(el)));
    const moving=animations.every(a=>Number(getComputedStyle(a.effect.target).opacity)>0&&Number(getComputedStyle(a.effect.target).opacity)<1&&getComputedStyle(a.effect.target).translate!=='none');
    return{count:animations.length,coverage,moving,targets:targets.map(el=>el.className),stagger:Math.max(...animations.map(a=>a.effect.getTiming().delay))};
  });
  const resume=()=>page.evaluate(()=>document.querySelector('#content').getAnimations({subtree:true}).filter(a=>a.id==='page-enter').forEach(a=>a.play()));
  const fresh=()=>page.evaluate(()=>document.querySelector('#content').getAnimations({subtree:true}).filter(a=>a.id==='page-enter').length);
  try {
    await page.setViewportSize({width:1440,height:960});
    await page.evaluate(async()=>{
      const c=await import('./src/core.js'),{openStore}=await import('./src/storage.js');const db=await openStore(),old=await db.read(),now=new Date().toISOString(),date=c.hongKong(now).date;
      let s=c.transact(c.createState(),{id:'pages-rating',type:'rate',date,dimension:'study',stars:3},now);
      for(let i=0;i<4;i++)s=c.transact(s,{id:'pages-task-'+i,type:'createTask',title:'剪辑验收 '+i,start:date,target:c.addDays(date,7),importance:'normal'},now);
      s=c.transact(s,{id:'pages-archive',type:'archive',taskId:'pages-task-1'},now);
      for(const i of [2,3])s=c.transact(s,{id:'pages-complete-'+i,type:'complete',taskId:'pages-task-'+i,date},now);
      s=c.transact(s,{id:'pages-hide',type:'hide',taskId:'pages-task-3'},now);
      s.revision=old.revision+1;await db.write(s,old.revision);db.close();await window.raterReload();
    });
    await settle();
    // Move away first so 今日 is a real page transition as well.
    await page.getByRole('button',{name:'设置',exact:true}).click();await settle();
    for(const [id,label] of [['today','今日'],['tasks','任务'],['history','历史'],['rewards','奖励中心'],['settings','设置']]){
      await page.getByRole('button',{name:label,exact:true}).click();
      const sample=await probe();report[id+'AllContentEnters']=sample.count>0&&sample.coverage&&sample.moving&&sample.stagger<=132;
      if(id==='tasks')report.taskCardsEnter=sample.targets.some(t=>String(t).includes('task-card'));
      if(id==='rewards')report.all48BadgeCardsEnter=sample.targets.filter(t=>String(t).includes('badge-card')).length===48;
      if(id==='settings')report.allSettingsPanelsEnter=sample.targets.filter(t=>String(t).includes('panel')).length===4;
      await page.screenshot({path:`output/playwright/page-${id}-enter.png`});await resume();await settle();
      report[id+'SettlesClean']=await page.locator('#content').evaluate(el=>!el.hasAttribute('data-entering')&&el.getAnimations({subtree:true}).every(a=>a.id!=='page-enter'));
    }
    await page.getByRole('button',{name:'任务',exact:true}).click();await settle();
    for(const label of ['已完成','归档','已隐藏','全部','未完成']){
      await page.getByRole('button',{name:label,exact:true}).click();
      const scope=await page.locator('#content').getAttribute('data-entering');report['task-'+label]=scope==='tasks'&&await fresh()>0;
      report.taskFilterHeaderStable=await page.locator('.page-header').evaluate(el=>el.getAnimations().every(a=>a.id!=='page-enter'));
      await settle();
    }
    await page.getByRole('button',{name:'未完成',exact:true}).click();report.sameTabNoReplay=await fresh()===0;
    await page.getByRole('searchbox',{name:'搜索任务',exact:true}).fill('没有结果的筛选');report.searchNoPageReplay=await fresh()===0;
    await page.getByRole('searchbox',{name:'搜索任务',exact:true}).fill('');
    await page.getByRole('button',{name:'奖励中心',exact:true}).click();await settle();
    for(const label of ['经验明细','周期回顾','奖励规则','徽章收藏']){
      await page.getByRole('button',{name:label,exact:true}).click();
      report['reward-'+label]=await page.locator('#content').getAttribute('data-entering')==='rewards'&&await fresh()>0;
      report.rewardSummaryStable=await page.locator('.summary-grid').evaluate(el=>el.getAnimations({subtree:true}).every(a=>a.id!=='page-enter'));
      await settle();
    }
    for(const label of ['求知','创作','活力','日常','达成','星光','全部']){
      await page.getByRole('button',{name:label,exact:true}).click();
      report['badge-'+label]=await page.locator('#content').getAttribute('data-entering')==='badges'&&await fresh()=== (label==='全部'?48:8);await settle();
    }
    await page.getByRole('button',{name:'历史',exact:true}).click();await settle();
    await page.getByRole('button',{name:'30 天',exact:true}).click();report.trendTabEnters=await page.locator('#content').getAttribute('data-entering')==='trend'&&await fresh()>0;await settle();
    // Keep old animations to verify cancellation when reusing the same DOM nodes.
    await page.getByRole('button',{name:'奖励中心',exact:true}).click();
    await page.evaluate(()=>{window.pagesOld=document.querySelector('#content').getAnimations({subtree:true}).filter(a=>a.id==='page-enter');window.pagesOld.forEach(a=>a.pause());document.querySelector('[data-page=tasks]').click();document.querySelector('[data-page=settings]').click();});
    report.rapidSwitchCancelsOld=await page.evaluate(()=>window.pagesOld.every(a=>a.playState==='idle')&&document.querySelector('.nav-link.selected').dataset.page==='settings'&&document.querySelector('#content').getAnimations({subtree:true}).filter(a=>a.id==='page-enter').every(a=>a.effect.target.isConnected));await settle();
    await page.getByRole('button',{name:'今日',exact:true}).click();await settle();
    await page.getByRole('button',{name:'学习 5 星',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[data-dimension=study][data-stars="5"]').getAttribute('aria-pressed')==='true');report.ratingDoesNotReplay=await fresh()===0;
    await page.getByRole('button',{name:'设置',exact:true}).click();await settle();
    await page.locator('#references-form textarea').first().fill('动画检查中的草稿');
    const beforeReferences=await page.evaluate(async()=>{const{openStore}=await import('./src/storage.js');const db=await openStore(),s=await db.read();db.close();return s.revision;});
    await page.getByRole('button',{name:'保存评分参照',exact:true}).click();
    await page.evaluate(async revision=>{const{openStore}=await import('./src/storage.js');const db=await openStore();try{for(let i=0;i<100;i++){const s=await db.read();if(s.revision>revision&&s.settings.references.study==='动画检查中的草稿')return;await new Promise(r=>setTimeout(r,20));}throw Error('Reference save not committed');}finally{db.close();}},beforeReferences);
    report.referencesSaveNoReplay=await fresh()===0&&await page.locator('#references-form textarea').first().inputValue()==='动画检查中的草稿';
    for(const [mode,option] of [['gentle','柔和 · 轻量过渡'],['off','关闭 · 保留数值反馈']]){
      await page.getByRole('button',{name:/^动效强度，当前/}).click();await page.getByRole('option',{name:option,exact:true}).click();await page.waitForFunction(mode=>document.documentElement.dataset.motion===mode,mode);
      await page.getByRole('button',{name:'任务',exact:true}).click();
      report[mode+'Respected']=await page.locator('#content').evaluate((el,mode)=>{const a=el.getAnimations({subtree:true}).filter(a=>a.id==='page-enter');return mode==='off'?a.length===0:a.length>0&&a.every(x=>x.effect.getTiming().duration===160&&!x.effect.getKeyframes().some(f=>f.translate));},mode);await settle();
      await page.getByRole('button',{name:'设置',exact:true}).click();await settle();
    }
    await page.getByRole('button',{name:/^动效强度，当前/}).click();await page.getByRole('option',{name:'完整 · 金色成长反馈',exact:true}).click();await page.waitForFunction(()=>document.documentElement.dataset.motion==='full');
    await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'奖励中心',exact:true}).click();
    report.reducedMotionNoLift=await page.locator('#content').evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.id==='page-enter').every(a=>!a.effect.getKeyframes().some(f=>f.translate)));await settle();await page.emulateMedia({reducedMotion:'no-preference'});
    await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'任务',exact:true}).click();report.narrowNoOverflow=await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth);await settle();
  } finally {
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.evaluate(async original=>{const{openStore}=await import('./src/storage.js');const db=await openStore(),old=await db.read();original.revision=old.revision+1;await db.write(original,old.revision);db.close();},original);
    await page.setViewportSize({width:1440,height:960});await page.reload();await page.evaluate(()=>window.raterReady);page.setDefaultTimeout(30000);
  }
  if(Object.values(report).some(v=>v!==true))throw Error(JSON.stringify(report));return report;
}
