import{device}from'./android-device.mjs';import{tap,observe,pause,capture}from'./android-native-ui.mjs';import{writeFileSync}from'node:fs';
if(device('emu','avd','name').split(/\r?\n/)[0].trim()!=='RaterSigningAcceptance')throw Error('Isolated AVD required');
const pkg='local.ratertracker.android',report={checks:[]};
const running=()=>device('shell','dumpsys','activity','services',pkg+'/.ReminderService').includes('isForeground=true');
const check=(name,v)=>{report.checks.push({name,passed:!!v});console.log(name+': '+!!v);if(!v)throw Error(name);};
async function find(text){let node=observe().find(n=>(n.text+' '+n['content-desc']).includes(text));if(node)return node;for(let i=0;i<4;i++)device('shell','input','swipe','540','600','540','1600','150');for(let i=0;i<12;i++){node=observe().find(n=>(n.text+' '+n['content-desc']).includes(text));if(node)return node;device('shell','input','swipe','540','1550','540','650','350');await pause(350);}throw Error('Native control missing '+text);}
async function click(node){const b=node.rect;device('shell','input','tap',String(Math.round((b[0]+b[2])/2)),String(Math.round((b[1]+b[3])/2)));await pause(700);}
try{
 device('shell','input','keyevent','224');device('shell','wm','dismiss-keyguard');device('shell','pm','grant',pkg,'android.permission.POST_NOTIFICATIONS');device('shell','appops','set',pkg,'SCHEDULE_EXACT_ALARM','allow');
 device('shell','am','start','-n',pkg+'/.MainActivity');await pause(800);await tap('设置');
 let node=await find('开启通知提醒');if(!running())await click(node);
 check('formal signed APK starts actual foreground service',running());
 node=await find('立即测试通知');await click(node);device('shell','input','keyevent','3');await pause(700);
 check('formal service stays foreground after activity closes',running());
 const dump=device('shell','dumpsys','notification','--noredact');check('formal APK owns service and test system notifications',dump.includes('pkg='+pkg)&&dump.includes('tag=rater-test')&&dump.includes('提醒服务正在运行'));
 device('shell','cmd','statusbar','expand-notifications');await pause(700);capture('service103-formal-shade');device('shell','cmd','statusbar','collapse');
 device('shell','am','start','-n',pkg+'/.MainActivity');await pause(500);
 node=await find('开启通知提醒');if(running())await click(node);
 check('formal settings can stop foreground service',!running());
}finally{writeFileSync('output/android/formal-service103-report.json',JSON.stringify(report,null,2));}
