import { spawn, execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import path from 'node:path';
import os from 'node:os';

const root=process.cwd(), source=path.resolve(process.argv[2]??'release/win-unpacked');
const runDirectory=path.join(os.tmpdir(),'rater-rebuild-'+Date.now());
const dataDirectory=path.join(root,'runtime-data','rebuild-desktop-'+Date.now());
await mkdir('output/rebuild',{recursive:true});await cp(source,runDirectory,{recursive:true});
const hash=async file=>createHash('sha256').update(await readFile(file)).digest('hex');
if(await hash(path.join(source,'resources/app.asar'))!==await hash(path.join(runDirectory,'resources/app.asar')))throw Error('Runtime copy differs from packaged ASAR');
const binary=path.join(runDirectory,'Rater & Tracker.exe'),port=9338;
const child=spawn(binary,['--acceptance-hold','--remote-debugging-port='+port],{cwd:runDirectory,env:{...process.env,RATER_TEST_DATA:dataDirectory},windowsHide:true,stdio:'ignore'});
let browser;
try{
  for(let n=0;n<60;n++){try{browser=await chromium.connectOverCDP('http://127.0.0.1:'+port);break;}catch{await new Promise(r=>setTimeout(r,250));}}
  if(!browser)throw Error('Packaged desktop did not start');
  const page=browser.contexts()[0].pages()[0];await page.waitForFunction(()=>Boolean(window.raterReady));await page.evaluate(()=>window.raterReady);
  const info=await page.evaluate(()=>window.desktop.info());
  if(!info.packaged||info.version!==(await readFile('VERSION','utf8')).trim()||path.resolve(info.dataDirectory)!==path.resolve(dataDirectory))throw Error('Packaged environment/isolation mismatch');
  const code=await readFile('scripts/rebuild-ui-acceptance.cjs','utf8');
  const run=(await import('node:vm')).runInThisContext('('+code+')');
  const report=await run(page);report.packaged=true;report.asarMatches=true;
  const fixCode=await readFile('scripts/fix-ui-acceptance.cjs','utf8');
  const fixRun=(await import('node:vm')).runInThisContext('('+fixCode+')');
  report.fix=await fixRun(page);
  const compatCode=await readFile('scripts/compat-ui-acceptance.cjs','utf8');
  report.compat=await (await import('node:vm')).runInThisContext('('+compatCode+')')(page);
  await writeFile('output/rebuild/desktop-report.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify({checks:report.checks.length,passed:report.checks.filter(c=>c.passed).length,packaged:true,asarMatches:true,fixChecks:report.fix.checks.length,compatChecks:report.compat.checks.length}));
}finally{
  await browser?.close().catch(()=>{});
  if(child.exitCode===null){try{execFileSync('taskkill',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore',windowsHide:true});}catch{}}
  await writeFile('output/rebuild/desktop-runtime.json',JSON.stringify({runDirectory,dataDirectory},null,2));
}
