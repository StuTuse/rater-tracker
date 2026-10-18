import { device } from './android-device.mjs';
import { tap, capture, pause, texts } from './android-native-ui.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const avd=device('emu','avd','name').split(/\r?\n/)[0].trim();
if(avd!=='RaterSigningAcceptance')throw Error('Use only the isolated RaterSigningAcceptance AVD');
const pkg='local.ratertracker.android', report={checks:[]};
const check=(name,value)=>{report.checks.push({name,passed:Boolean(value)});if(!value)throw Error(name);};
const info=device('shell','dumpsys','package',pkg);
check('formal APK is 1.0.0 code9',info.includes('versionCode=9')&&info.includes('versionName=1.0.0'));
const oldIme=device('shell','settings','get','secure','show_ime_with_hard_keyboard').trim();
mkdirSync('output/rebuild',{recursive:true});
try{
  // This script deliberately clears only this named AVD's fake formal-app data.
  device('shell','am','force-stop',pkg);device('shell','pm','clear',pkg);
  device('shell','settings','put','secure','show_ime_with_hard_keyboard','1');
  device('shell','am','start','-n',pkg+'/.MainActivity');await pause(2300);
  capture('rebuild-final-guide');
  await tap('关闭');check('initial login closes to offline page',texts().includes('今日记录'));
  await tap('写学习记录');await pause(500);
  const ime=device('shell','dumpsys','input_method');check('real system keyboard opens from pencil',/mIsInputViewShown=true/.test(ime));
  device('shell','input','text','Final_rebuild_native_note');await pause(850);capture('rebuild-final-ime');
  device('shell','input','keyevent','4');await pause(600);
  check('note appears directly after writing',texts().some(t=>t.includes('Final_rebuild_native_note')));
  device('shell','am','force-stop',pkg);device('shell','am','start','-n',pkg+'/.MainActivity');await pause(2000);
  let reopened=[];for(let i=0;i<8;i++){try{reopened=texts();}catch{}if(reopened.some(t=>t.includes('Final_rebuild_native_note')))break;await pause(250);}
  check('saved note survives process restart',reopened.some(t=>t.includes('Final_rebuild_native_note')));check('login guide does not repeat',!reopened.includes('欢迎回来'));
  device('install','-r','release/android/Rater-Tracker-Android-1.0.0-release.apk');device('shell','am','start','-n',pkg+'/.MainActivity');await pause(2000);
  let upgraded=[];for(let i=0;i<8;i++){try{upgraded=texts();}catch{}if(upgraded.some(t=>t.includes('Final_rebuild_native_note')))break;await pause(250);}
  check('same-certificate APK replacement retains saved note',upgraded.some(t=>t.includes('Final_rebuild_native_note')));
  const pid=device('shell','pidof',pkg).trim();const sockets=device('shell','cat','/proc/net/unix');check('formal WebView debugging is disabled',!sockets.includes('webview_devtools_remote_'+pid));
  capture('rebuild-final-home');
  console.log(JSON.stringify({passed:report.checks.length,...report}));
}finally{
  if(oldIme==='null')device('shell','settings','delete','secure','show_ime_with_hard_keyboard');else device('shell','settings','put','secure','show_ime_with_hard_keyboard',oldIme);
  writeFileSync('output/rebuild/android-formal-report.json',JSON.stringify(report,null,2));
}
