async page => {
  await page.reload();await page.evaluate(()=>window.raterReady);
  const read=()=>page.evaluate(async()=>{const{openStore}=await import('./src/storage.js');const db=await openStore(),s=await db.read();db.close();return s;});
  const original=await read(),report={};
  const closed=()=>page.waitForFunction(()=>!document.querySelector('#modal').open&&!document.querySelector('#modal').hasAttribute('data-closing'));
  const idle=()=>page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,400)));
  const fixture=motion=>page.evaluate(async motion=>{
    const c=await import('./src/core.js'),{openStore}=await import('./src/storage.js');let s=c.createState();
    const stamp=new Date().toISOString(),date=c.hongKong(stamp).date;
    for(let i=19;i>=1;i--)s=c.transact(s,{id:`fixture-${i}`,type:'rate',date:c.addDays(date,-i),dimension:'study',stars:5},stamp);
    s=c.transact(s,{id:'fixture-today',type:'rate',date,dimension:'study',stars:4},stamp);s.settings.motion=motion;
    const db=await openStore(),old=await db.read();s.revision=old.revision+1;await db.write(s,old.revision);db.close();await window.raterReload();
    return c.totalUnits(c.transact(s,{id:'expected-next',type:'rate',date,dimension:'study',stars:5},stamp));
  },motion);
  try {
    await page.setViewportSize({width:1440,height:960});
    const line=await page.locator('#launch-line').innerText();await page.getByRole('button',{name:'设置',exact:true}).click();
    report.stableWithinRun=await page.locator('#launch-line').innerText()===line;
    await page.reload();await page.evaluate(()=>window.raterReady);report.nextLaunchChanges=await page.locator('#launch-line').innerText()!==line;
    report.topOnly=await page.locator('.topbar #launch-line').count()===1&&await page.locator('.sidebar #launch-line').count()===0;
    await page.getByRole('button',{name:'今日',exact:true}).click();const expected=await fixture('full');await idle();
    report.restoreSilent=await page.locator('#modal').getAttribute('data-kind')!=='award';
    await page.getByRole('button',{name:'学习 5 星',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#modal').open&&document.querySelector('#modal').dataset.kind==='award');
    await page.locator('.award-image').evaluate(i=>i.decode());
    report.realGainGrouped=await page.locator('#award-count').innerText()==='1 / 2';
    const title=await page.locator('#modal-title').innerText();await page.getByRole('button',{name:'下一枚',exact:true}).click();
    report.batchBrowsing=await page.locator('#modal-title').innerText()!==title;
    await page.getByRole('button',{name:'上一枚',exact:true}).click();
    report.batchBrowsing&&=await page.locator('#modal-title').innerText()===title;
    report.confettiFinite=await page.locator('.award-confetti').evaluate(el=>el.getAnimations({subtree:true}).length===36&&el.getAnimations({subtree:true}).every(a=>a.effect.getComputedTiming().iterations===1));
    report.noExtraReward=await page.evaluate(async expected=>{const c=await import('./src/core.js'),{openStore}=await import('./src/storage.js');const db=await openStore(),s=await db.read();db.close();return c.totalUnits(s)===expected;},expected);
    await idle();
    report.profileWindowStyle=await page.locator('#modal').evaluate(el=>{const r=el.getBoundingClientRect();return Math.abs(r.x+r.width/2-innerWidth/2)<2&&Math.abs(r.y+r.height/2-innerHeight/2)<2&&getComputedStyle(el).borderRadius==='24px';});
    await page.locator('.award-confetti').evaluate(el=>el.getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=550;}));
    await page.screenshot({path:'output/playwright/badge-award.png'});
    await page.setViewportSize({width:390,height:844});
    report.narrowFits=await page.locator('#modal').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&document.documentElement.scrollWidth===innerWidth;});
    await page.screenshot({path:'output/playwright/badge-award-narrow.png'});
    const size=await page.locator('#modal').evaluate(el=>({w:el.offsetWidth,h:el.offsetHeight}));
    await page.getByRole('button',{name:'收下',exact:true}).click();
    report.exitStable=await page.locator('#modal').evaluate((el,size)=>!el.open&&el.hasAttribute('data-closing')&&el.offsetWidth===size.w&&el.offsetHeight===size.h,size);await closed();
    await page.getByRole('button',{name:'学习 5 星',exact:true}).click();await idle();report.sameValueNoRepeat=await page.locator('#modal').getAttribute('data-kind')!=='award';
    await page.setViewportSize({width:1440,height:960});await fixture('full');
    await page.getByRole('button',{name:'登录或注册账号',exact:true}).click();await page.locator('#account-login [name=username]').fill('Draft_01');
    await page.evaluate(()=>document.querySelector('[data-dimension=study][data-stars="5"]').click());await idle();
    report.existingDialogPreserved=await page.locator('#modal').getAttribute('data-kind')==='account'&&await page.locator('#account-login [name=username]').inputValue()==='Draft_01';
    // Withdraw the just-earned badge while its notice is deferred.
    await page.evaluate(()=>document.querySelector('[data-dimension=study][data-stars="4"]').click());await idle();
    await page.getByRole('button',{name:'关闭',exact:true}).click();await closed();await idle();
    report.withdrawnPendingSilent=await page.locator('#modal').getAttribute('data-kind')!=='award';
    await fixture('full');await page.getByRole('button',{name:'学习 5 星',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#modal').open&&document.querySelector('#modal').dataset.kind==='award');
    await page.evaluate(()=>document.querySelector('[data-dimension=study][data-stars="4"]').click());await closed();
    report.visibleWithdrawalCloses=true;
    await fixture('full');
    await page.locator('.rating-note[data-dimension=study]').evaluate(el=>el.closest('details').open=true);
    await page.locator('.rating-note[data-dimension=study]').fill('稿子还有一句想补');
    await page.evaluate(()=>document.querySelector('[data-dimension=study][data-stars="5"]').click());await idle();
    report.editingNotInterrupted=await page.locator('#modal').getAttribute('data-kind')!=='award'&&await page.locator('.rating-note[data-dimension=study]').inputValue()==='稿子还有一句想补';
    await page.getByRole('button',{name:'设置',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#modal').open&&document.querySelector('#modal').dataset.kind==='award');
    await page.getByRole('button',{name:'收下',exact:true}).click();await closed();
    await page.getByRole('button',{name:'今日',exact:true}).click();await fixture('full');
    await page.evaluate(()=>{window.noticePut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){if(this.name==='snapshots')throw new Error('勋章验收：保存失败');return window.noticePut.apply(this,args);};});
    try {
      await page.getByRole('button',{name:'学习 5 星',exact:true}).click();await page.getByText('勋章验收：保存失败',{exact:true}).waitFor();await idle();
      report.failedSaveNoAward=await page.locator('#modal').getAttribute('data-kind')!=='award'&&await page.locator('[data-dimension=study][data-stars="4"]').getAttribute('aria-pressed')==='true';
    } finally {await page.evaluate(()=>{IDBObjectStore.prototype.put=window.noticePut;delete window.noticePut;});}
    for(const mode of ['gentle','off']){
      await fixture(mode);await page.getByRole('button',{name:'学习 5 星',exact:true}).click();
      await page.waitForFunction(()=>document.querySelector('#modal').open&&document.querySelector('#modal').dataset.kind==='award');
      report[mode+'NoConfetti']=await page.locator('.award-confetti').count()===0;
      await page.getByRole('button',{name:'收下',exact:true}).click();await closed();
    }
    await fixture('full');await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'学习 5 星',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#modal').open&&document.querySelector('#modal').dataset.kind==='award');
    report.reducedMotionQuiet=await page.locator('.award-confetti').count()===0&&await page.locator('.award-image').evaluate(el=>el.getAnimations().length===0);
    await page.getByRole('button',{name:'收下',exact:true}).click();await closed();await page.emulateMedia({reducedMotion:'no-preference'});
    await page.reload();await page.evaluate(()=>window.raterReady);await idle();report.relaunchNoAward=await page.locator('#modal').getAttribute('data-kind')!=='award';
  } finally {
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.evaluate(async original=>{const{openStore}=await import('./src/storage.js');const db=await openStore(),old=await db.read();original.revision=old.revision+1;await db.write(original,old.revision);db.close();},original);
    await page.setViewportSize({width:1440,height:960});await page.reload();await page.evaluate(()=>window.raterReady);
  }
  console.log(JSON.stringify(report));if(Object.values(report).some(v=>v!==true))throw new Error(JSON.stringify(report));return report;
}
