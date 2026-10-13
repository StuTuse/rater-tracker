// Real startup frames, preferences and a failed storage open. Browser data only.
async page => {
  await page.evaluate(() => window.raterReady);
  const original = await page.evaluate(async () => { const {openStore}=await import('./src/storage.js');const db=await openStore(),s=await db.read();db.close();return s; });
  const report = {};
  const ready = async () => { await page.waitForFunction(()=>window.raterReady);await page.evaluate(() => window.raterReady); };
  const geometry = () => page.locator('#startup').evaluate(s => {
    const image=s.querySelector('img'),title=s.querySelector('h1'),brand=s.querySelector('strong');
    const a=image.getBoundingClientRect(),b=title.getBoundingClientRect(),c=brand.getBoundingClientRect();
    const center=r=>Math.abs(r.left+r.width/2-innerWidth/2)<2;
    return {white:getComputedStyle(s).backgroundColor==='rgb(255, 255, 255)'&&s.offsetWidth===innerWidth&&s.offsetHeight===innerHeight,
      identity:image.complete&&image.naturalWidth>0&&center(a)&&center(b)&&b.top>a.bottom&&title.textContent==='Rater & Tracker',
      wordmark:brand.textContent==='TuseCreation'&&Number(getComputedStyle(brand).fontWeight)>=800&&center(c)&&c.top>innerHeight*.8&&c.bottom<innerHeight-25,
      blocked:document.querySelector('#app').inert&&getComputedStyle(document.querySelector('#app')).visibility==='hidden',
      cleanText:s.innerText.trim()==='Rater & Tracker\nTuseCreation',noOverflow:document.documentElement.scrollWidth===innerWidth};
  });
  const setMode = mode => page.evaluate(async mode => { const {openStore}=await import('./src/storage.js');const db=await openStore(),s=await db.read(),rev=s.revision;s.settings.motion=mode;await db.write(s,rev);db.close(); }, mode);
  const start = async () => { await page.reload({waitUntil:'domcontentloaded'});await page.locator('#startup img').evaluate(i=>i.decode()); };
  const freezeExit = async () => {
    await page.waitForFunction(()=>document.getAnimations().some(a=>a.id==='startup-exit'));
    return page.evaluate(()=>{const a=document.getAnimations().find(a=>a.id==='startup-exit');a.pause();a.currentTime=a.effect.getTiming().duration*.4;return {duration:a.effect.getTiming().duration,opacity:Number(getComputedStyle(a.effect.target).opacity),noScale:!a.effect.getKeyframes().some(f=>f.transform),appVisible:getComputedStyle(document.querySelector('#app')).visibility==='visible',entry:document.querySelector('#content').getAnimations({subtree:true}).some(a=>a.id==='page-enter')};});
  };
  const resume = () => page.evaluate(()=>document.getAnimations().filter(a=>a.id==='startup-exit').forEach(a=>a.play()));
  try {
    await page.setViewportSize({width:1440,height:960});await setMode('full');await start();
    Object.assign(report,await geometry());await page.screenshot({path:'output/playwright/startup.png'});
    const full=await freezeExit();report.fullSmoothDissolve=full.duration===320&&full.opacity>0&&full.opacity<1&&full.noScale&&full.appVisible;
    report.mainEntranceVisible=full.entry;await resume();await ready();
    report.readyUnlocked=await page.evaluate(()=>!document.querySelector('#startup')&&!document.querySelector('#app').inert&&!document.querySelector('#app').hasAttribute('aria-busy')&&!document.body.classList.contains('is-starting'));
    await page.getByRole('button',{name:'任务',exact:true}).click();await page.getByRole('button',{name:'历史',exact:true}).click();await page.evaluate(()=>window.raterReload());
    report.inAppNoReplay=await page.locator('#startup').count()===0;
    await page.setViewportSize({width:390,height:844});await start();const small=await geometry();report.narrowLayout=small.white&&small.identity&&small.wordmark&&small.noOverflow;
    await page.screenshot({path:'output/playwright/startup-narrow.png'});await ready();await page.setViewportSize({width:1440,height:960});
    await setMode('gentle');await start();const gentle=await freezeExit();report.gentleRespected=gentle.duration===150&&gentle.noScale;await resume();await ready();
    await setMode('off');await start();await ready();report.offRespected=await page.evaluate(()=>document.documentElement.dataset.motion==='off'&&!document.getAnimations().some(a=>a.id==='startup-exit'||a.id==='page-enter'));
    await setMode('full');await page.emulateMedia({reducedMotion:'reduce'});await start();const reduced=await freezeExit();report.systemReduced= reduced.duration===150&&reduced.noScale;await resume();await ready();await page.emulateMedia({reducedMotion:'no-preference'});
    await page.route('**/src/storage.js',async route=>{await new Promise(r=>setTimeout(r,2100));await route.continue();});
    await page.reload({waitUntil:'commit'});await page.locator('#startup img').evaluate(i=>i.decode());await page.waitForTimeout(1400);
    report.slowOpenKeepsSplash=(await geometry()).blocked;await ready();await page.unroute('**/src/storage.js');
    await page.addInitScript(()=>{if(sessionStorage.getItem('startup-fail-open')){sessionStorage.removeItem('startup-fail-open');IDBFactory.prototype.open=function(){throw Error('启动存储失败验收');};}});
    await page.evaluate(()=>sessionStorage.setItem('startup-fail-open','1'));await page.reload();await ready();
    report.failureRevealsRetry=await page.getByRole('button',{name:'重新打开',exact:true}).isVisible()&&await page.getByRole('heading',{name:'数据尚未打开'}).isVisible()&&await page.locator('#startup').count()===0&&await page.locator('#app').evaluate(a=>!a.inert);
    await page.getByRole('button',{name:'重新打开',exact:true}).click();await ready();
    report.retryRecovers=await page.getByRole('button',{name:'今日',exact:true}).isVisible();
    report.dataPreserved=await page.evaluate(async original=>{const{openStore}=await import('./src/storage.js');const db=await openStore(),s=await db.read();db.close();return JSON.stringify(s.ledger)===JSON.stringify(original.ledger)&&JSON.stringify(s.ratings)===JSON.stringify(original.ratings)&&JSON.stringify(s.tasks)===JSON.stringify(original.tasks);},original);
  } finally {
    await page.unrouteAll({behavior:'wait'});await page.emulateMedia({reducedMotion:'no-preference'});await resume();
    await page.evaluate(async original=>{const{openStore}=await import('./src/storage.js');const db=await openStore(),s=await db.read();await db.write(original,s.revision);db.close();},original);
    await page.setViewportSize({width:1440,height:960});await page.reload();await ready();
  }
  if(Object.values(report).some(v=>v!==true))throw Error(JSON.stringify(report));return report;
}
