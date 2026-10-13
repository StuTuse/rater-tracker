async page => {
  page.setDefaultTimeout(7000);
  await page.addInitScript(() => {
    window.desktop = {
      info: async () => ({version:'UI motion test',dataDirectory:'isolated browser',packaged:false}),
      accountCurrent: async () => null,
      accountRegister: async ({email}) => ({id:'motion-challenge',email}),
      accountVerifyRegistration: async () => { throw new Error('验证码不正确'); },
      accountSync: async () => ({version:0,state:null})
    };
  });
  await page.setViewportSize({width:1440,height:960});
  await page.reload();await page.evaluate(()=>window.raterReady);
  await page.getByRole('button',{name:'设置',exact:true}).click();await page.getByRole('button',{name:/^动效强度，当前/}).click();await page.getByRole('option',{name:'完整 · 金色成长反馈',exact:true}).click();await page.waitForFunction(()=>document.documentElement.dataset.motion==='full');
  const report={};const settle=()=>page.waitForTimeout(480);
  const modal=page.locator('#modal'), login=page.locator('#account-login'), register=page.locator('#account-register');
  const open=()=>page.getByRole('button',{name:'登录或注册账号',exact:true}).click();
  try {
    await open();await settle();
    report.initialSliderMeasured=await page.locator('.account-tabs').evaluate(el=>{const i=el.querySelector('.segment-indicator'),b=el.querySelector('button.selected');return Math.abs(i.getBoundingClientRect().width-b.offsetWidth)<1&&Math.abs(i.getBoundingClientRect().height-b.offsetHeight)<1;});
    await page.keyboard.press('Escape');await settle();
    report.closeDuringEntranceStable=await page.evaluate(async()=>{
      document.querySelector('[data-action=account-open]').click();await new Promise(resolve=>requestAnimationFrame(resolve));
      const el=document.querySelector('#modal'),input=document.querySelector('#account-login [name=password]'),style=getComputedStyle(el),before={width:parseFloat(style.width),height:parseFloat(style.height),inputWidth:input.offsetWidth},samples=[];
      document.querySelector('[data-action=close-modal]').click();const start=performance.now();
      await new Promise(resolve=>{const tick=()=>{const s=getComputedStyle(el);if(s.display!=='none')samples.push({width:parseFloat(s.width),height:parseFloat(s.height),inputWidth:input.offsetWidth,opacity:parseFloat(s.opacity),kind:el.dataset.kind,position:s.position});if(performance.now()-start<350)requestAnimationFrame(tick);else resolve();};requestAnimationFrame(tick);});
      return samples.length>3&&samples.every((s,i)=>Math.abs(s.width-before.width)<.1&&Math.abs(s.height-before.height)<.1&&s.inputWidth===before.inputWidth&&s.kind==='account'&&s.position==='fixed'&&(i===0||s.opacity<=samples[i-1].opacity+.001));
    });
    await open();await settle();
    await login.locator('[name=username]').fill('login_draft');await login.locator('[name=password]').fill('Secret_test123');
    await page.evaluate(()=>window.motionProbe={login:document.querySelector('#account-login'),register:document.querySelector('#account-register'),username:document.querySelector('#account-login [name=username]'),tabs:document.querySelector('.account-tabs'),indicator:document.querySelector('.account-tabs .segment-indicator'),height:document.querySelector('#modal').getBoundingClientRect().height});
    await page.getByRole('button',{name:'注册账号',exact:true}).click();
    report.onlyFrameAnimates=await modal.evaluate(el=>{
      const a=el.getAnimations().find(a=>a.effect.getKeyframes().some(k=>'height' in k));
      if(!a)return false;a.pause();a.currentTime=140;
      const frames=a.effect.getKeyframes(),r=el.getBoundingClientRect();
      return frames.every(k=>!('opacity' in k)&&!('transform' in k))&&getComputedStyle(el).opacity==='1'&&r.height>window.motionProbe.height&&r.height<parseFloat(el.style.height)&&Math.abs(r.y+r.height/2-innerHeight/2)<2;
    });
    await page.screenshot({path:'output/playwright/alpha10-account-morph.png'});
    await modal.evaluate(el=>el.getAnimations().forEach(a=>{if(a.playState==='paused')a.play();}));await settle();
    report.nodesAndSliderPreserved=await page.evaluate(()=>window.motionProbe.login===document.querySelector('#account-login')&&window.motionProbe.register===document.querySelector('#account-register')&&window.motionProbe.username===document.querySelector('#account-login [name=username]')&&window.motionProbe.tabs===document.querySelector('.account-tabs')&&window.motionProbe.indicator===document.querySelector('.account-tabs .segment-indicator'));
    await register.locator('[name=username]').fill('register_draft');await register.locator('[name=email]').fill('motion@example.com');await register.locator('[name=password]').fill('Secret_test123');await register.locator('[name=confirmation]').fill('Secret_test123');
    await page.getByRole('button',{name:'登录',exact:true}).click();await settle();
    report.loginDraftPreserved=await login.locator('[name=username]').inputValue()==='login_draft'&&await login.locator('[name=password]').inputValue()==='Secret_test123';
    await page.getByRole('button',{name:'注册账号',exact:true}).click();await settle();
    report.registerDraftPreserved=await register.evaluate(form=>form.username.value==='register_draft'&&form.email.value==='motion@example.com'&&form.password.value===form.confirmation.value&&form.password.value.length>0);
    await register.getByRole('button',{name:'发送验证码',exact:true}).click();await settle();
    await page.locator('#account-verify input').fill('000000');await page.getByRole('button',{name:'验证并登录',exact:true}).click();
    await page.getByRole('button',{name:'登录',exact:true}).click();await settle();await page.getByRole('button',{name:'注册账号',exact:true}).click();await settle();
    report.codeAndChallengePreserved=await page.locator('#account-verify').isVisible()&&await page.locator('#account-verify input').inputValue()==='000000'&&await register.locator('[name=email]').inputValue()==='motion@example.com';
    await page.getByRole('button',{name:'重新填写 / 发送验证码',exact:true}).click();await settle();
    report.editKeepsRegistration=await register.isVisible()&&await register.locator('[name=username]').inputValue()==='register_draft';
    await page.evaluate(()=>{const el=document.querySelector('#modal');window.motionProbe.close={width:el.offsetWidth,height:el.offsetHeight,fieldTop:document.querySelector('#account-register [name=password]').offsetTop};});
    await page.getByRole('button',{name:'关闭',exact:true}).click();await page.waitForTimeout(90);
    report.exitKeepsLayoutAndFields=await modal.evaluate(el=>!el.open&&el.dataset.kind==='account'&&'closing' in el.dataset&&el.offsetWidth===window.motionProbe.close.width&&el.offsetHeight===window.motionProbe.close.height&&document.querySelector('#account-register [name=password]').offsetTop===window.motionProbe.close.fieldTop&&document.querySelector('#account-register [name=password]').value.length>0&&getComputedStyle(document.body).overflow==='hidden');
    await settle();
    report.exitCleansAfterFade=await modal.evaluate(el=>getComputedStyle(el).display==='none'&&![...el.querySelectorAll('input[type=password],#account-verify input')].some(input=>input.value)&&!el.dataset.closing&&el.style.height==='');
    report.focusReturns=await page.locator('.account-entry').evaluate(el=>el===document.activeElement);
    await open();await settle();
    report.reopenKeepsNonSecretDraft=await login.locator('[name=username]').inputValue()==='login_draft'&&await login.locator('[name=password]').inputValue()==='';
    await page.evaluate(()=>{document.querySelector('[data-action=account-register-tab]').click();document.querySelector('[data-action=close-modal]').click();document.querySelector('[data-action=account-open]').click();});await settle();
    report.rapidCloseReopenSafe=await modal.evaluate(el=>el.open&&el.dataset.kind==='account'&&!el.inert&&!('closing' in el.dataset)&&el.style.height==='');
    await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'注册账号',exact:true}).click();await settle();
    report.narrowCentered=await modal.evaluate(el=>{const r=el.getBoundingClientRect();return Math.abs(r.x+r.width/2-innerWidth/2)<2&&Math.abs(r.y+r.height/2-innerHeight/2)<2&&r.bottom<=innerHeight&&el.scrollWidth===el.clientWidth;});
    await page.screenshot({path:'output/playwright/alpha10-account-register-mobile.png'});
    await page.keyboard.press('Escape');await settle();
    for(const [mode,name] of [['off','关闭 · 保留数值反馈'],['gentle','柔和 · 轻量过渡']]){
      await page.getByRole('button',{name:'设置',exact:true}).click();await page.getByRole('button',{name:/^动效强度，当前/}).click();await page.getByRole('option',{name,exact:true}).click();await page.waitForFunction(mode=>document.documentElement.dataset.motion===mode,mode);
      await open();await settle();await page.getByRole('button',{name:'注册账号',exact:true}).click();
      report[mode+'Respected']=await modal.evaluate((el,mode)=>{const a=el.getAnimations().find(a=>a.effect.getKeyframes().some(k=>'height' in k));return mode==='off'?!a:!!a&&a.effect.getTiming().duration===150;},mode);
      await settle();await page.keyboard.press('Escape');await settle();
    }
  } finally {
    await page.evaluate(()=>{delete window.motionProbe;});
    await page.setViewportSize({width:1440,height:960});
  }
  console.log(JSON.stringify(report));
  if(Object.values(report).some(value=>value!==true))throw new Error('Account motion acceptance: '+JSON.stringify(report));
  return report;
}
