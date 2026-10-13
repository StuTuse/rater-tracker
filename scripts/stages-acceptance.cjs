// Actual transactions form all preview states; no fabricated ledger or thresholds.
async page => {
  page.setDefaultTimeout(10000);await page.reload();await page.evaluate(()=>window.raterReady);
  const original=await page.evaluate(async()=>{const{openStore}=await import('./src/storage.js');const db=await openStore(),s=await db.read();db.close();return s;});
  const report={}, names=[], arts=[], motions=[];
  const install=target=>page.evaluate(async target=>{
    const c=await import('./src/core.js'),{openStore}=await import('./src/storage.js');
    let s=c.createState(),serial=0;const now=new Date().toISOString(),date=c.hongKong(now).date;
    while(c.totalUnits(s)<target*c.SCALE){
      const remaining=target-c.totalUnits(s)/c.SCALE;let plan;
      for(let days=365;days>=1;days--){
        const p=c.taskPlan({start:c.addDays(date,-days),target:date,importance:'normal'});
        if(p.e/c.SCALE*c.nextCoefficient(s,p.tier,date).c/100<=remaining){plan=p;break;}
      }
      const id=`phase-fixture-${serial++}`;
      s=c.transact(s,{id,type:'createTask',title:`阶段验收 ${serial}`,start:plan?.start??date,target:date,importance:'normal'},now);
      if(plan)s=c.transact(s,{id:`finish-${serial}`,type:'complete',taskId:id,date},now);
      if(serial>100)throw new Error('Fixture did not converge');
    }
    const db=await openStore(),old=await db.read();s.revision=old.revision+1;await db.write(s,old.revision);db.close();await window.raterReload();return c.levelAt(c.totalUnits(s));
  },target);
  const threshold=level=>(level-1)*30+(level-1)*(level-2)*2.5;
  try {
    await page.setViewportSize({width:1440,height:960});
    for(let stage=1;stage<=10;stage++){
      const level=stage===1?1:(stage-1)*10;
      await page.waitForFunction(()=>!document.querySelector('#modal').hasAttribute('data-closing'));
      await install(threshold(level));
      const sample=await page.locator('#growth').evaluate(el=>({stage:Number(el.dataset.stage),art:el.querySelector('.level-emblem').outerHTML,motion:getComputedStyle(el.querySelector('.xp-fluid i')).animationName,flow:el.dataset.flow,static:!el.classList.contains('level-up'),width:el.querySelector('#level-art').offsetWidth}));
      names.push(sample.motion);arts.push(sample.art);
      if(sample.stage!==stage||!sample.static||sample.width<35)throw new Error('Wrong static phase '+stage);
      await page.locator('#growth').screenshot({path:`output/playwright/phase-${stage}.png`});
      // A real saved rating crosses one level boundary in each destination phase.
      const boundary=stage===1?30:threshold(level);
      await install(boundary-2.5);
      await page.getByRole('button',{name:'今日',exact:true}).click();
      await page.getByRole('button',{name:'学习 5 星',exact:true}).click();
      await page.waitForFunction(stage=>Number(document.querySelector('#growth').dataset.stage)===stage&&document.querySelector('#growth').classList.contains('level-up'),stage);
      const frames=await page.locator('#level-art').evaluate(el=>el.getAnimations().map(a=>a.effect.getKeyframes()));
      if(!frames.length)throw new Error('No committed upgrade animation at phase '+stage);
      motions.push(JSON.stringify(frames));
      await page.evaluate(()=>Promise.all(document.querySelector('#growth').getAnimations({subtree:true}).filter(a=>a.effect.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));
      await page.locator('[data-action=clear-rating][data-dimension=study]').click();await page.getByRole('button',{name:'清空评分',exact:true}).click();
      await page.waitForFunction(()=>document.querySelector('#growth').classList.contains('level-down'));
      if(stage>1&&await page.locator('#growth').getAttribute('data-stage')!==String(stage-1))throw new Error('Phase failed to retreat');
    }
    report.tenActualPhases=true;report.tenFlowPatterns=new Set(names).size===10;report.tenIndependentEmblems=new Set(arts).size===10;report.tenUpgradeChoreographies=new Set(motions).size===10;report.retreatRecomputes=true;
    await install(27222.5);await page.getByRole('button',{name:'学习 5 星',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#level-label').textContent==='MAX');
    report.maxIsPhaseTen=await page.locator('#growth').getAttribute('data-stage')==='10'&&await page.locator('.level-constellation').count()===1;
    await page.screenshot({path:'output/playwright/phase-max.png'});
    await page.setViewportSize({width:390,height:844});
    await page.evaluate(()=>Promise.all(document.querySelector('#growth').getAnimations({subtree:true}).filter(a=>a.effect.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));
    const narrow=await page.locator('.level-emblem').evaluate(el=>{const a=el.getBoundingClientRect(),b=el.closest('.level-medallion').getBoundingClientRect();return {width:a.width,left:a.left,right:a.right,frameLeft:b.left,frameRight:b.right,scroll:document.documentElement.scrollWidth,viewport:innerWidth};});
    console.log('Narrow geometry '+JSON.stringify(narrow));
    report.narrowEmblemFits=narrow.width>=35&&narrow.left>=narrow.frameLeft&&narrow.right<=narrow.frameRight&&narrow.scroll===narrow.viewport;
    await page.getByRole('button',{name:'设置',exact:true}).click();await page.getByRole('button',{name:/^动效强度，当前/}).click();await page.getByRole('option',{name:'柔和 · 轻量过渡',exact:true}).click();await page.waitForFunction(()=>document.documentElement.dataset.motion==='gentle');
    report.gentleStopsNewFlow=await page.locator('.xp-stage-stream').evaluate(el=>el.getAnimations({subtree:true}).length===0);
    await page.getByRole('button',{name:/^动效强度，当前/}).click();await page.getByRole('option',{name:'关闭 · 保留数值反馈',exact:true}).click();await page.waitForFunction(()=>document.documentElement.dataset.motion==='off');
    report.offStopsAllFlow=await page.locator('#growth').evaluate(el=>el.getAnimations({subtree:true}).length===0);
    await page.getByRole('button',{name:/^动效强度，当前/}).click();await page.getByRole('option',{name:'完整 · 金色成长反馈',exact:true}).click();await page.waitForFunction(()=>document.documentElement.dataset.motion==='full');
    await page.setViewportSize({width:1440,height:960});await page.getByRole('button',{name:'今日',exact:true}).click();
    // A render-only contact sheet, clearly separate from the business states above.
    await page.evaluate(async()=>{
      const{GROWTH_STAGES,levelEmblem}=await import('./src/growth-stages.js');
      document.querySelector('#content').innerHTML=`<div class="phase-gallery">${GROWTH_STAGES.map(s=>`<article style="--stage-light:${s.light};--stage-gold:${s.gold}"><div class="phase-gallery-art">${levelEmblem(s)}</div><strong>${s.name}</strong><span>Lv.${s.from}–${s.to}</span></article>`).join('')}</div>`;
    });
    await page.screenshot({path:'output/playwright/ten-stage-emblems.png',fullPage:true});
  } finally {
    await page.evaluate(async original=>{const {openStore}=await import('./src/storage.js');const db=await openStore(),s=await db.read();original.revision=s.revision+1;await db.write(original,s.revision);db.close();document.querySelector('#modal').close();},original);
    await page.setViewportSize({width:1440,height:960});await page.reload();await page.evaluate(()=>window.raterReady);page.setDefaultTimeout(30000);
  }
  console.log(JSON.stringify(report));if(Object.values(report).some(v=>v!==true))throw new Error('Stages acceptance failed '+JSON.stringify(report));return report;
}
