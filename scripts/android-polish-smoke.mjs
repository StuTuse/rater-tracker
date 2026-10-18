// Formal APK: native UIAutomator only; no WebView debugging or real account.
import{tap,texts,observe,capture,back,pause}from'./android-native-ui.mjs';
import{device,serial}from'./android-device.mjs';import{mkdirSync,writeFileSync}from'node:fs';
if(serial!=='emulator-5580'||process.env.ANDROID_ADB_SERVER_PORT!=='5038'||!device('emu','avd','name').trim().startsWith('RaterSigningAcceptance'))throw Error('Use the isolated RaterSigningAcceptance emulator on port 5038');
const checks={},check=(k,v)=>{checks[k]=Boolean(v);if(!v)throw Error(k);};
const keyboardPreference=device('shell','settings','get','secure','show_ime_with_hard_keyboard').trim();
device('shell','settings','put','secure','show_ime_with_hard_keyboard','1');
try {
if(texts().includes('欢迎回来'))await tap('关闭');
if(!texts().includes('今日记录'))await tap('今日');
check('version1_0_1Code8',/versionName=1\.0\.1/.test(device('shell','dumpsys','package','local.ratertracker.android'))&&/versionCode=8\b/.test(device('shell','dumpsys','package','local.ratertracker.android')));
check('offlineHome',texts().includes('今日记录')&&texts().includes('每日评分'));capture('polish-release-home');
await tap('写学习记录');
check('writeFocus',observe().some(n=>n.class==='android.widget.EditText'&&n.focused==='true'));
check('nativeKeyboardShown',/mIsInputViewShown=true/.test(device('shell','dumpsys','input_method')));
capture('polish-release-keyboard');
device('shell','input','text','UI%stest%snote');await pause(600);await back();await tap('今日记录');await pause(700);
check('noteVisibleAfterAutoSave',texts().join(' ').includes('UI test note'));capture('polish-release-note');
await tap('历史');await tap('日历回看');check('historyLoaded',texts().includes('历史记录')&&texts().includes('每日评分趋势'));capture('polish-release-history');
await tap('周报归档');check('weeklyLoaded',texts().join(' ').includes('评分记录'));capture('polish-release-weekly');
mkdirSync('output/android',{recursive:true});writeFileSync('output/android/polish-release-report.json',JSON.stringify({checks,serial},null,2)+'\n');console.log(JSON.stringify({checks,serial},null,2));
} finally {
 if(keyboardPreference==='null')device('shell','settings','delete','secure','show_ime_with_hard_keyboard');
 else device('shell','settings','put','secure','show_ime_with_hard_keyboard',keyboardPreference);
}
