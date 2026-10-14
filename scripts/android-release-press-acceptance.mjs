import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {device} from './android-device.mjs';
import {tap,observe,pause,capture,texts} from './android-native-ui.mjs';
const id='local.ratertracker.android';
const version=readFileSync('apps/android/VERSION','utf8').trim();
const apk='release/android/Rater-Tracker-Android-'+version+'-release.apk';
const report={};
const renderedData=()=>texts().filter(t=>/^(?:Lv\.|MAX$)|XP|已记录|未评分|^\d 星$|^未记录$/.test(t));
async function launch(){device('shell','am','force-stop',id);device('shell','am','start','-n',id+'/local.ratertracker.android.MainActivity');await pause(1800);await tap('今日');}
await launch();const before=renderedData();
device('install','-r',apk);await launch();
assert.deepEqual(renderedData(),before,'signed upgrade keeps the rendered ratings and XP');report.upgradeKeepsRenderedData=true;
try{
 const node=observe().find(n=>n.text==='0 星'&&n.clickable==='true');assert.ok(node,'real rating button exists');
 const x=String(Math.round((node.rect[0]+node.rect[2])/2)),y=String(Math.round((node.rect[1]+node.rect[3])/2));
 device('shell','input','motionevent','DOWN',x,y);await pause(100);capture('release-press-held');
 device('shell','input','motionevent','CANCEL',x,y);await pause(400);capture('release-press-restored');
 assert.deepEqual(renderedData(),before,'cancelled press does not save a rating');report.cancelDoesNotSave=true;
 for(const [label,expected] of [['任务','新建任务'],['历史','历史'],['奖励中心','奖励中心'],['设置','评分参照']]){
  await tap(label);assert.ok(texts().some(t=>t.includes(expected)),label+' page');report[label]=true;
 }
 await tap('今日');capture('release-press-final');console.log(JSON.stringify(report,null,2));
}finally{
 device('shell','input','motionevent','CANCEL','0','0');writeFileSync('output/android/release-press-report.json',JSON.stringify(report,null,2));
}
