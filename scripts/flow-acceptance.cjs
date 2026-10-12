// Real renderer acceptance. Fixtures only in the isolated browser; restore in finally.
async page => {
  const read = () => page.evaluate(async () => { const {openStore}=await import('./src/storage.js'); const store=await openStore(); const s=await store.read(); store.close(); return s; });
  const original=await read(), report={}; let stage='fixture';
  const frames = () => page.evaluate(() => new Promise(resolve => { let n=0; const tick=()=>++n===12?resolve():requestAnimationFrame(tick); requestAnimationFrame(tick); }));
  try {
    await page.evaluate(async () => {
      const c=await import('./src/core.js'),{openStore}=await import('./src/storage.js');
      const store=await openStore(),current=await store.read(),now=new Date().toISOString();
      let s=c.transact(c.createState(),{id:'flow-fixture',type:'rate',date:c.hongKong(now).date,dimension:'study',stars:3},now);
      s.revision=current.revision+1;await store.write(s,current.revision);store.close();await window.raterReload();
    });
    await page.getByRole('button',{name:'今日',exact:true}).click();
    await page.setViewportSize({width:1440,height:960});
    report.restoreIsStatic=await page.evaluate(()=>!document.querySelector('#growth').classList.contains('level-up') && !document.querySelector('#xp-fill').getAnimations().some(a=>a.effect.getComputedTiming().iterations!==Infinity));
    const first=await page.locator('.xp-fluid i').first().evaluate(i=>getComputedStyle(i).transform);
    await frames();
    report.liquidLightMoves=await page.locator('.xp-fluid i').first().evaluate((i,first)=>getComputedStyle(i).transform!==first,first);
    // Observe the actual rendered width at cancellation, then the next animation's start.
    await page.evaluate(()=>{
      window.flowProbe={animate:Element.prototype.animate,cancel:Animation.prototype.cancel,pairs:[],last:null};
      Animation.prototype.cancel=function(){if(this.effect?.target?.id==='xp-fill')window.flowProbe.last=parseFloat(getComputedStyle(this.effect.target).width);return window.flowProbe.cancel.call(this);};
      Element.prototype.animate=function(keyframes,options){if(this.id==='xp-fill'&&window.flowProbe.last!==null)window.flowProbe.pairs.push({visible:window.flowProbe.last,start:parseFloat(keyframes[0].width)/100*document.querySelector('#xp-bar').clientWidth});return window.flowProbe.animate.call(this,keyframes,options);};
    });
    stage='increase';
    await page.getByRole('button',{name:'学习 5 星',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('[data-dimension="study"][data-stars="5"]').getAttribute('aria-pressed')==='true');
    await frames();
    stage='interruption';
    // Dispatch the second click while feedback is still running; locator.click waits
    // for the entering card to settle and can miss the intended interruption window.
    await page.evaluate(()=>document.querySelector('[data-dimension="study"][data-stars="1"]').click());
    await page.waitForFunction(()=>document.querySelector('[data-dimension="study"][data-stars="1"]').getAttribute('aria-pressed')==='true');
    report.interruptionIsContinuous=await page.evaluate(()=>window.flowProbe.pairs.length>0&&window.flowProbe.pairs.every(p=>Math.abs(p.visible-p.start)<2));
    stage='settle';
    await page.waitForFunction(()=>!document.querySelector('#xp-fill').getAnimations().some(a=>a.playState==='running'));
    report.finalValueAndWidth=await page.evaluate(async()=>{const c=await import('./src/core.js'),{openStore}=await import('./src/storage.js');const store=await openStore(),s=await store.read();store.close();const l=c.levelAt(c.totalUnits(s));return Number(document.querySelector('#xp-total').textContent.replaceAll(',',''))===l.total&&Math.abs(parseFloat(getComputedStyle(document.querySelector('#xp-fill')).width)-document.querySelector('#xp-bar').clientWidth*l.ratio)<1&&Number(document.querySelector('#xp-bar').getAttribute('aria-valuenow'))===Math.round(l.ratio*100);});
    report.readableText=await page.evaluate(()=>{
      const luminance=rgb=>{const a=rgb.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return .2126*a[0]+.7152*a[1]+.0722*a[2];};
      const pairs=[['.card-top>div>span',[255,254,249]],['.rating-meta',[255,254,249]],['.field-hint',[255,254,249]],['.subtitle',[250,248,239]],['.xp-message',[255,241,191]],['.growth-foot',[255,241,191]]];
      return pairs.every(([selector,bg])=>{const style=getComputedStyle(document.querySelector(selector)),fg=style.color.match(/[\d.]+/g).slice(0,3).map(Number),l1=luminance(fg),l2=luminance(bg);return parseFloat(style.fontSize)>=12&&(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05)>=4.5;});
    });
    await page.screenshot({path:'output/playwright/alpha3-today.png',fullPage:true});
    await page.locator('#growth').screenshot({path:'output/playwright/alpha3-flow-a.png'});await frames();
    await page.locator('#growth').screenshot({path:'output/playwright/alpha3-flow-b.png'});
    stage='preferences';
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(()=>document.documentElement.dataset.motion==='gentle');
    report.reducedMotionStopsFlow=await page.evaluate(()=>document.documentElement.dataset.motion==='gentle'&&!document.querySelector('.xp-fluid').getAnimations({subtree:true}).some(a=>a.playState==='running'&&a.effect.getComputedTiming().iterations===Infinity));
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
    report.hiddenPausesFlow=await page.evaluate(()=>document.querySelector('#growth').dataset.flow==='paused'&&!document.querySelector('.xp-fluid').getAnimations({subtree:true}).some(a=>a.playState==='running'&&a.effect.getComputedTiming().iterations===Infinity));
    await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
    stage='off';
    await page.getByRole('button',{name:'设置',exact:true}).click();
    await page.getByLabel('动效强度').selectOption('off');
    await page.waitForFunction(()=>document.documentElement.dataset.motion==='off');
    report.offStopsAllGrowth=await page.evaluate(()=>document.querySelector('#growth').getAnimations({subtree:true}).length===0);
    stage='full';
    await page.getByLabel('动效强度').selectOption('full');
    await page.waitForFunction(()=>document.documentElement.dataset.motion==='full');
    await page.getByRole('button',{name:'今日',exact:true}).click();
    stage='zero';
    await page.getByRole('button',{name:'清空',exact:true}).click();
    await page.getByRole('button',{name:'清空评分',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#xp-total').textContent==='0.0');
    await page.waitForFunction(()=>!document.querySelector('#xp-fill').getAnimations().some(a=>a.playState==='running'));
    await page.evaluate(()=>Promise.all(document.querySelector('#growth').getAnimations({subtree:true}).filter(a=>a.effect.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{}))));
    report.zeroHasNoFalseFill=await page.evaluate(()=>parseFloat(getComputedStyle(document.querySelector('#xp-fill')).width)===0&&Number(getComputedStyle(document.querySelector('#xp-ghost')).opacity)===0&&document.querySelector('#growth').dataset.flow==='paused');
    await page.evaluate(()=>document.documentElement.style.zoom='1.25');
    report.zoom125NoOverflow=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
    report.zoomRatingControlsContained=await page.evaluate(()=>Array.from(document.querySelectorAll('.star-button')).every(button=>{const a=button.getBoundingClientRect(),b=button.closest('.rating-card').getBoundingClientRect();return a.left>=b.left&&a.right<=b.right;}));
    await page.screenshot({path:'output/playwright/alpha3-zoom125.png',fullPage:true});
  } catch(error) {
    const debug=await page.evaluate(()=>({total:document.querySelector('#xp-total').textContent,save:document.querySelector('#save-status').textContent,message:document.querySelector('#feedback').textContent,pairs:window.flowProbe?.pairs}));
    throw new Error('Flow stage '+stage+': '+error.message+'; completed '+JSON.stringify(report)+'; debug '+JSON.stringify(debug));
  } finally {
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.evaluate(async original=>{
      delete document.hidden;document.documentElement.style.zoom='';
      if(window.flowProbe){Element.prototype.animate=window.flowProbe.animate;Animation.prototype.cancel=window.flowProbe.cancel;delete window.flowProbe;}
      const{openStore}=await import('./src/storage.js');const store=await openStore(),current=await store.read();original.revision=current.revision+1;await store.write(original,current.revision);store.close();await window.raterReload();
    },original);
    await page.reload();await page.evaluate(()=>window.raterReady);
  }
  console.log(JSON.stringify(report,null,2));
  if(Object.values(report).some(v=>v!==true))throw new Error('Flow acceptance failed: '+JSON.stringify(report));
  return report;
}
