async page=>{
 const report={checks:[]},check=(name,v)=>{report.checks.push({name,passed:!!v});if(!v)throw Error(name);};
 const preview=await page.context().newPage();
 try{
  await preview.addInitScript(()=>{
   localStorage.setItem('rater-login-guide-v1','shown');
   const status={allowed:true,exact:true,batteryUnrestricted:false,serviceRequested:true,serviceRunning:true,channelImportance:3,lastStage:'test_posted'};
   window.raterNative={info:async()=>({version:'1.0.3',packaged:false,dataDirectory:'isolated preview'}),sessionRead:async()=>null,sessionWrite:async()=>{},sessionClear:async()=>{},reminderSync:async()=>status,reminderTest:async delay=>delay?{scheduledAt:Date.now()+60000}:{posted:true}};
  });
  await preview.goto(page.url());await preview.evaluate(()=>window.raterReady);await preview.locator('[data-page="settings"]').click();
  for(const width of [320,390,1280]){
   await preview.setViewportSize({width,height:900});await preview.waitForTimeout(250);
   check(width+' native reminder settings do not overflow',await preview.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   check(width+' persistent service and both tests are exposed',await preview.locator('[data-reminder-option=persistent]').count()===1&&await preview.locator('[data-action=test-reminder]').count()===2);
  }
  check('service running and channel banner guidance are truthful',await preview.locator('.reminder-service-state').innerText().then(t=>t.includes('运行中')&&t.includes('测试通知已提交系统')&&t.includes('横幅需在渠道设置开启')));
  await preview.locator('[data-action=test-reminder][data-delay="0"]').click();check('test confirmation does not claim delivery',await preview.locator('.toast').innerText().then(t=>t.includes('提交系统')&&!t.includes('已送达')));
  await preview.setViewportSize({width:390,height:900});await preview.locator('.reminder-panel').scrollIntoViewIfNeeded();await preview.screenshot({path:'output/playwright/reminder103-phone.png',fullPage:true});
 }finally{await preview.close();}return report;
}
