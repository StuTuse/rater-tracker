import {execFileSync} from 'node:child_process';import {mkdirSync,writeFileSync} from 'node:fs';import path from 'node:path';import os from 'node:os';import {chromium} from 'playwright';
export const serial=process.env.RATER_ANDROID_SERIAL??'emulator-5556';
export const adb=path.join(process.env.ANDROID_SDK_ROOT??path.join(os.homedir(),'AppData/Local/Android/Sdk'),'platform-tools/adb.exe');
export function device(...args){return execFileSync(adb,['-s',serial,...args],{encoding:'utf8'});}
export async function attach(packageId='local.ratertracker.android.dev'){
 let failure;
 for(let n=0;n<30;n++){
  let browser;
  try{
   const pid=device('shell','pidof',packageId).trim();if(!pid)throw Error('App not running');
   device('forward','tcp:9225','localabstract:webview_devtools_remote_'+pid);
   browser=await chromium.connectOverCDP('http://127.0.0.1:9225');
   const page=browser.contexts()[0].pages().find(p=>/^https?:/.test(p.url()))??browser.contexts()[0].pages()[0];
   if(!page)throw Error('WebView page not ready');
   page.setDefaultTimeout(15000);await page.waitForFunction(()=>!!window.raterReady,null,{timeout:5000});await page.evaluate(()=>window.raterReady);
   return {browser,page};
  }catch(error){failure=error;await browser?.close().catch(()=>{});await new Promise(r=>setTimeout(r,500));}
 }
 throw failure;
}
export async function screenshot(page,name){mkdirSync('output/android',{recursive:true});await page.screenshot({path:'output/android/'+name+'.png'});writeFileSync('output/android/'+name+'-device.png',execFileSync(adb,['-s',serial,'exec-out','screencap','-p']));}
