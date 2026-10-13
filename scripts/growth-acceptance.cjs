// Synthetic fixtures only in the isolated browser preview; original test snapshot is restored in finally.
async (page) => {
  const original = await page.evaluate(async()=>{const{openStore}=await import('./src/storage.js');const store=await openStore();const s=await store.read();store.close();return s;});
  const results={};
  try {
    await page.evaluate(async()=>{
      const c=await import('./src/core.js'),{openStore}=await import('./src/storage.js');
      const store=await openStore(), current=await store.read(), now=new Date().toISOString(),date=c.hongKong(now).date;
      let s=c.createState();
      for(let i=1;i<=5;i++){
        const id=`max-fixture-${i}`;
        s=c.transact(s,{id,type:'createTask',title:`MAX验收成果 ${i}`,start:c.addDays(date,-365),target:date,importance:'core'},now);
        if(i<5)s=c.transact(s,{id:`finish-${i}`,type:'complete',taskId:id,date},now);
      }
      s.revision=current.revision+1;await store.write(s,current.revision);store.close();await window.raterReload();
    });
    await page.getByRole('button',{name:'MAX验收成果 5',exact:true}).click();
    await page.getByRole('button',{name:'完成并结算',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#level-label').textContent==='MAX');
    await page.getByRole('button',{name:'关闭',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#xp-total').textContent.replaceAll(',','')==='31265.0');
    results.maxFinal=true;await page.locator('#modal[data-kind=award][open]').waitFor({state:'visible'});await page.getByRole('button',{name:'收下',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('#modal').open);results.maxAwardDoesNotGrantXP=await page.locator('#xp-total').innerText()==='31,265.0';
    await page.getByRole('button',{name:'任务',exact:true}).click();
    await page.getByRole('button',{name:'已完成',exact:true}).click();
    await page.getByRole('button',{name:'MAX验收成果 5',exact:true}).click();
    await page.getByRole('button',{name:'撤销完成',exact:true}).click();
    await page.getByRole('button',{name:'撤销完成',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#level-label').textContent!=='MAX');
    results.exitMax=true;
    await page.getByRole('button',{name:/恢复原 .* 完成记录/}).click();
    await page.waitForFunction(()=>document.querySelector('#level-label').textContent==='MAX');
    results.sameDayRestore=true;
    await page.getByRole('button',{name:'关闭',exact:true}).click();
    const snapshot=await page.evaluate(async()=>{const{openStore}=await import('./src/storage.js');const store=await openStore();const s=await store.read();store.close();return s;});
    results.onlyOneLiveCompletion=snapshot.ledger.filter(e=>e.active&&e.owner==='max-fixture-5'&&e.kind==='完成任务').length===1;
    results.cRetained=snapshot.tasks['max-fixture-5'].completion.c===160;
  } finally {
    await page.evaluate(async original=>{const{openStore}=await import('./src/storage.js');const store=await openStore();const current=await store.read();original.revision=current.revision+1;await store.write(original,current.revision);store.close();document.querySelector('#modal').close();await window.raterReload();},original);
    await page.reload();await page.evaluate(()=>window.raterReady);
  }
  if(Object.values(results).some(v=>v!==true))throw new Error('Growth acceptance failed');
  return results;
}
