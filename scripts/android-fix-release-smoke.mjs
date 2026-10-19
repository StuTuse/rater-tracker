import {device} from './android-device.mjs';import {tap,capture,pause,texts,observe} from './android-native-ui.mjs';import {readFileSync,writeFileSync} from 'node:fs';
if(device('emu','avd','name').split(/\r?\n/)[0].trim()!=='RaterSigningAcceptance')throw Error('Use only isolated acceptance AVD');
const pkg='local.ratertracker.android',version=readFileSync('apps/android/VERSION','utf8').trim(),code=readFileSync('apps/android/VERSION_CODE','utf8').trim(),report={checks:[]};const check=(name,v)=>{report.checks.push({name,passed:!!v});console.log(name+': '+!!v);if(!v)throw Error(name);};const oldIme=device('shell','settings','get','secure','show_ime_with_hard_keyboard').trim();
async function readyText(needle){for(let i=0;i<12;i++){try{if(texts().some(t=>t.includes(needle)))return true;}catch{}await pause(400);}return false;}
async function firstTap(label){const n=observe().find(n=>n.text===label&&n.clickable==='true');if(!n)throw Error('Missing '+label);const b=n.rect;device('shell','input','tap',String(Math.round((b[0]+b[2])/2)),String(Math.round((b[1]+b[3])/2)));await pause(600);}
try{
 device('shell','am','force-stop',pkg);device('shell','am','start','-n',pkg+'/.MainActivity');await pause(1800);let current=[];for(let i=0;i<12;i++){try{current=texts();if(current.includes('今日记录')||current.includes('欢迎回来'))break;}catch{}await pause(400);}if(current.includes('欢迎回来'))await tap('关闭');
 // Existing official app on this named AVD contains only prior fictional data.
 const beforeVersion=device('shell','dumpsys','package',pkg).match(/versionName=(\S+)/)?.[1];report.beforeVersion=beforeVersion;
 await tap('写学习记录');device('shell','settings','put','secure','show_ime_with_hard_keyboard','1');device('shell','input','text','_Fix101_upgrade_note');await pause(800);device('shell','input','keyevent','4');await pause(600);
 check('pre-upgrade note saved in existing official app',await readyText('_Fix101_upgrade_note'));
 device('install','-r','release/android/Rater-Tracker-Android-'+version+'-release.apk');device('shell','am','start','-n',pkg+'/.MainActivity');await pause(1800);
 const info=device('shell','dumpsys','package',pkg);check('final signed version and code installed',info.includes('versionCode='+code)&&info.includes('versionName='+version));
 check('cover installation retains existing note',await readyText('_Fix101_upgrade_note'));
 await tap('任务');for(let i=0;i<3;i++){await firstTap('新建任务');check('formal APK new task opens '+i,texts().some(t=>t.includes('任务名称')));await tap('关闭');}
 await tap('已完成');await tap('未完成');capture('fix101-formal-tasks');
 await tap('历史');await tap('30 天');await tap('7 天');capture('fix101-formal-history');
 await tap('今日');await tap('写学习记录');await pause(500);check('formal APK opens actual keyboard',/mIsInputViewShown=true/.test(device('shell','dumpsys','input_method')));device('shell','input','text','_Final_signed_101');await pause(800);capture('fix101-formal-ime');device('shell','input','keyevent','4');await pause(600);
 check('formal APK autosaves exact native input',await readyText('_Final_signed_101'));
 device('shell','am','force-stop',pkg);device('shell','am','start','-n',pkg+'/.MainActivity');await pause(1800);check('formal APK restart retains saved note',await readyText('_Final_signed_101'));
 const pid=device('shell','pidof',pkg).trim();check('formal WebView debugging remains disabled',!device('shell','cat','/proc/net/unix').includes('webview_devtools_remote_'+pid));capture('fix101-formal-home');
}finally{if(oldIme==='null')device('shell','settings','delete','secure','show_ime_with_hard_keyboard');else device('shell','settings','put','secure','show_ime_with_hard_keyboard',oldIme);writeFileSync('output/android/fix-release-report.json',JSON.stringify(report,null,2));}
