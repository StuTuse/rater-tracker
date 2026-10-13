import pages from './android-pages-acceptance.mjs';
import controls,{nativeViewport,installMotionObserver} from './android-controls-acceptance.mjs';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';import {attach,screenshot} from './android-device.mjs';
const {browser,page}=await attach();let report={};try{report=JSON.parse(readFileSync('output/android/ui-report.json','utf8'));}catch{}const originalReload=page.reload.bind(page);page.reload=async options=>{const r=await originalReload(options);await page.waitForFunction(()=>!!window.raterReady);await page.evaluate(()=>window.raterReady);await installMotionObserver(page);return r;};const originalSet=page.setViewportSize;page.setViewportSize=size=>nativeViewport(page,size); // Keep the actual emulator viewport for every scenario.
await page.emulateMedia({reducedMotion:'no-preference'});await installMotionObserver(page);
try{
 for(const [key,file] of [['ui','ui-acceptance.cjs'],['controls','controls-acceptance.cjs'],['pages','pages-acceptance.cjs'],['flow','flow-acceptance.cjs']]){
  if(process.argv[2]&&key!==process.argv[2])continue;
  await page.emulateMedia({reducedMotion:'no-preference'});
  console.log('Android actual-viewport suite: '+key);
  const suite=key==='controls'?controls:key==='pages'?pages:new Function('return ('+readFileSync('scripts/'+file,'utf8')+'\n)')();
  report[key]=await suite(page);
  await screenshot(page,key);mkdirSync('output/android',{recursive:true});writeFileSync('output/android/ui-report.json',JSON.stringify(report,null,2));
 }
 report.viewport=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth}));
 mkdirSync('output/android',{recursive:true});writeFileSync('output/android/ui-report.json',JSON.stringify(report,null,2));console.log('ANDROID UI SUITES PASSED');
}finally{page.setViewportSize=originalSet;await browser.close();}
