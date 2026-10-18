async page => {
  const report={checks:[],sizes:[]};
  const check=(name,value)=>{report.checks.push({name,passed:Boolean(value)});if(!value)throw Error(name);};
  const read=()=>page.evaluate(async()=>{const {openStore}=await import('/packages/data/storage.js');const store=await openStore();const s=await store.read();store.close();return s;});
  if(page.url().startsWith('http:'))await page.route('https://api.github.com/**',route=>route.fulfill({status:404,body:'{}'}));
  await page.evaluate(()=>{localStorage.removeItem('rater-login-guide-v1');for(const key of Object.keys(localStorage))if(key.startsWith('rater-record-drafts:'))localStorage.removeItem(key);});
  await page.reload();await page.evaluate(()=>window.raterReady);
  check('first install guide appears',await page.locator('#modal[open][data-kind=account]').count()===1);
  await page.getByRole('button',{name:'关闭',exact:true}).click();await page.waitForTimeout(350);
  check('offline use after closing login',await page.locator('.rating-card').count()===4);
  await page.evaluate(async()=>{
    const {createState,transact,hongKong,addDays,DIMENSIONS}=await import('/packages/core/index.js');const {openStore}=await import('/packages/data/storage.js');
    let s=createState(),n=0;const today=hongKong().date,go=(action,at)=>s=transact(s,{id:'fixture-'+(++n),...action},at);
    for(let i=14;i>=1;i--){const date=addDays(today,-i);for(const d of DIMENSIONS)go({type:'rate',date,dimension:d,stars:i%6,note:date+' 的'+d+'评分依据'},date+'T12:00:00+08:00');go({type:'journal',date,note:date+' 当天的小结'},date+'T12:00:00+08:00');}
    go({type:'createTask',title:'隔离测试：完成一支短片',goal:'剪辑与导出',dimension:'work',start:today,target:addDays(today,45),importance:'normal',stages:'整理素材\n剪辑成片'},new Date().toISOString());
    const store=await openStore(),old=await store.read();s.revision=old.revision+1;await store.write(s,old.revision);store.close();await window.raterReload();
  });
  const task=(await read()).tasks;const id=Object.keys(task)[0];
  check('created long task is active without fabricated progress',await page.locator('.task-card .status').first().innerText()==='正在进行'&&task[id].progress.length===0);
  for(const width of [320,360,390,700,800,1024,1280,1440]){
    await page.setViewportSize({width,height:900});await page.waitForTimeout(100);
    const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,nav:document.querySelector('.sidebar').getBoundingClientRect().toJSON(),stars:[...document.querySelectorAll('.star-button,.write-button')].every(n=>n.getBoundingClientRect().width>=43.9&&n.getBoundingClientRect().height>=43.9),cards:[...document.querySelectorAll('.rating-card')].map(n=>n.getBoundingClientRect().height)}));
    check(width+' no overflow',!layout.overflow);check(width+' 44px rating controls',layout.stars);check(width+' controls contained by cards',await page.evaluate(()=>[...document.querySelectorAll('.rating-card')].every(card=>[...card.querySelectorAll('.star-button,.zero')].every(b=>{const r=b.getBoundingClientRect(),c=card.getBoundingClientRect();return r.x>=c.x&&r.right<=c.right+1;}))));check(width+' correct navigation',width<700?layout.nav.width>=width-1:layout.nav.width<220&&layout.nav.x===0);report.sizes.push({width,...layout});
  }
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'写学习记录',exact:true}).click();
  check('pencil synchronously focuses input',await page.getByRole('textbox',{name:'学习原因与依据',exact:true}).evaluate(n=>n===document.activeElement));
  const initial=await read();
  await page.getByRole('textbox',{name:'学习原因与依据',exact:true}).fill('未评分也能写。<img src=x onerror=alert(1)>\n原文第二行');await page.waitForTimeout(750);
  let s=await read();const date=new Date(Date.now()+8*3600000).toISOString().slice(0,10);
  check('unrated note saved without XP or zero',s.ratingNotes[date].study.note.startsWith('未评分')&&!s.ratings[date]?.study&&s.ledger.length===initial.ledger.length);
  await page.getByRole('textbox',{name:'学习原因与依据',exact:true}).evaluate(n=>{window.rebuildInput=n;n.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));n.value='中文输入进行中';n.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true}));});
  await page.waitForTimeout(650);check('IME composition does not commit partial text',(await read()).ratingNotes[date].study.note.startsWith('未评分'));
  await page.getByRole('textbox',{name:'学习原因与依据',exact:true}).evaluate(n=>n.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true})));await page.waitForTimeout(700);
  check('IME completes and commits exact text',(await read()).ratingNotes[date].study.note==='中文输入进行中');
  await page.getByRole('button',{name:'作品 3 星',exact:true}).click();await page.waitForTimeout(200);
  check('other save retains input DOM node',await page.evaluate(()=>window.rebuildInput===document.querySelector('textarea[data-dimension=study]')));
  await page.getByRole('button',{name:'学习 0 星',exact:true}).click();await page.waitForTimeout(200);
  check('explicit zero is distinct and note inherited',(await read()).ratings[date].study.stars===0&&(await read()).ratings[date].study.note==='中文输入进行中');
  await page.locator('[data-action=quick-progress]:visible').first().click();await page.waitForTimeout(300);
  check('advance opens focused action sheet',await page.locator('#modal').getAttribute('data-kind')==='quick-progress');
  check('no dates or destructive controls in advance',await page.locator('#modal input[type=date],#modal [data-action=delete-task],#modal [data-action=archive-task]').count()===0);
  check('advance fits phone without scrolling',await page.locator('#modal').evaluate(n=>n.scrollHeight<=n.clientHeight+1));
  await page.screenshot({path:'output/rebuild/phone-progress.png'});
  await page.locator('#quick-progress-form textarea').fill('剪完了第一段');await page.locator('#quick-progress-form [type=submit]').click();await page.waitForTimeout(350);
  s=await read();check('advance saves current date and closes',s.tasks[id].progress[0].date===date&&!await page.locator('#modal').evaluate(n=>n.open));
  await page.locator('.nav-link[data-page=tasks]').click();await page.waitForTimeout(350);
  await page.locator('.task-card').first().click();await page.waitForTimeout(250);
  check('card details retain history and management',await page.locator('#modal').getAttribute('data-kind')==='task'&&await page.locator('#modal [data-action=clear-progress]').count()===1&&await page.locator('#modal input[type=date]').count()>0);
  await page.getByRole('button',{name:'关闭',exact:true}).click();await page.waitForTimeout(300);
  await page.locator('[data-action=quick-complete]').first().click();await page.waitForTimeout(200);
  check('complete is separate concise sheet',await page.locator('#modal').getAttribute('data-kind')==='quick-complete'&&await page.locator('#modal input[type=date]').count()===0);
  await page.getByRole('button',{name:'取消',exact:true}).click();await page.waitForTimeout(300);
  await page.screenshot({path:'output/rebuild/phone-today.png',fullPage:true});
  await page.locator('.nav-link[data-page=history]').click();await page.waitForTimeout(450);
  check('history ordering and no growth banner',await page.evaluate(()=>{const chart=document.querySelector('.trend-panel').getBoundingClientRect(),calendar=document.querySelector('.history-date-layout').getBoundingClientRect(),ratings=document.querySelector('.ratings-grid').getBoundingClientRect();return chart.y<calendar.y&&calendar.y<ratings.y&&getComputedStyle(document.querySelector('.growth')).display==='none';}));
  check('history graph is real render width',await page.locator('.rating-chart').evaluate(n=>Math.abs(n.querySelector('svg').viewBox.baseVal.width-n.clientWidth)<2));
  await page.locator('[data-action=previous-date]').click();await page.waitForTimeout(250);check('past reasons immediately visible',await page.locator('.record-reading:visible').count()===4);
  await page.screenshot({path:'output/rebuild/phone-history.png',fullPage:true});
  await page.getByRole('button',{name:'每周回顾',exact:true}).click();await page.waitForTimeout(400);
  check('weekly includes four analyses and seven original days',await page.locator('.weekly-dimension').count()===4&&await page.locator('.weekly-day').count()===7);
  await page.locator('.weekly-day summary').first().click();await page.waitForTimeout(400);check('weekly raw reasons accessible',await page.locator('.weekly-day[open] .weekly-day-content').innerText().then(t=>t.includes('评分依据')));
  check('weekly no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:'output/rebuild/phone-weekly.png',fullPage:true});
  await page.setViewportSize({width:1024,height:800});await page.locator('[data-action=history-daily]').click();await page.waitForTimeout(400);
  check('tablet calendar integrated next to day review',await page.evaluate(()=>document.querySelector('.day-review').getBoundingClientRect().x>document.querySelector('.calendar-panel').getBoundingClientRect().right));
  await page.screenshot({path:'output/rebuild/tablet-history.png',fullPage:true});
  await page.locator('.nav-link[data-page=today]').click();await page.waitForTimeout(400);await page.screenshot({path:'output/rebuild/tablet-today.png',fullPage:true});
  check('tablet current task visible beside scoring',await page.evaluate(()=>{const t=document.querySelector('.today-tasks').getBoundingClientRect(),r=document.querySelector('.ratings-grid').getBoundingClientRect();return t.x>r.right&&t.y<innerHeight;}));
  await page.setViewportSize({width:1440,height:960});await page.screenshot({path:'output/rebuild/desktop-today.png',fullPage:true});
  for(const name of ['tasks','rewards','settings']){await page.locator(`.nav-link[data-page=${name}]`).click();await page.waitForTimeout(250);check(name+' renders without overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  check('notification settings all present',await page.locator('[data-reminder-option]').count()===4);
  await page.reload();await page.evaluate(()=>window.raterReady);check('guide does not repeat',!await page.locator('#modal').evaluate(n=>n.open));
  check('writing persists on restart',(await read()).ratings[date].study.note==='中文输入进行中');
  if(page.url().startsWith('http:')){
    await page.route('https://api.github.com/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([{draft:false,prerelease:false,html_url:'https://github.com/StuTuse/rater-tracker/releases/tag/fake-ui-test',assets:[{name:'Rater-Tracker-2.0.0-Setup.exe',state:'uploaded',browser_download_url:'https://github.com/StuTuse/rater-tracker/releases/download/fake-ui-test/fake.exe'}]}])}));
    await page.reload();await page.evaluate(()=>window.raterReady);await page.getByRole('button',{name:'写学习记录',exact:true}).click();
    await page.waitForTimeout(2100);check('update check does not interrupt writing',await page.locator('#modal[open]').count()===0);
    await page.locator('#content h1').click();await page.waitForTimeout(500);check('pending update appears after editing ends',await page.locator('#modal[open][data-kind=update]').count()===1);
    check('update offers the latest download',await page.getByRole('button',{name:'下载最新版本',exact:true}).count()===1);await page.getByRole('button',{name:'稍后',exact:true}).click();await page.waitForTimeout(300);
    const offline=await page.context().newPage();
    try{await offline.addInitScript(()=>{window.raterNative={active:true,info:async()=>({version:'1.0.0',packaged:false,dataDirectory:'isolated startup test'}),sessionRead:()=>new Promise(()=>{}),sessionWrite:async()=>{},sessionClear:async()=>{}};});
      await offline.goto(page.url());await offline.waitForFunction(()=>window.raterReady);await offline.waitForFunction(()=>!document.querySelector('#startup'),{timeout:4500});
      check('unresponsive authentication never blocks local startup',await offline.locator('.rating-card').count()===4&&!await offline.locator('#app').evaluate(n=>n.inert));
    }finally{await offline.close();}
  }
  await page.evaluate(report=>{window.rebuildReport=report;localStorage.setItem('rebuild-acceptance-report',JSON.stringify(report));},report);return report;
}
