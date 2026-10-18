// Deterministic, fictional preview fixtures; never reads application user data.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createState, addDays, SCALE } from '../../packages/core/index.js';
import { buildWeeklyReport } from './weekly-report-engine.mjs';
import { reminderCopy } from './reminder-copy.mjs';
const state=createState();state.dailyNotes={};
const dimensions=['study','work','health','life'];
const values={study:[2,3,3,4,3,4,3],work:[3,3,4,3,4,4,3],health:[3,4,0,3,4,3,4],life:[3,3,4,3,4,3,4]};
const journals=['先把练习安排清楚，晚上整理了素材。','完成了一次练习，也给自己留了休息时间。','今天没有运动，记录实际情况，早点收工。','整理出短片结构，明天继续细化。','初剪基本成形，标出了需要补拍的段落。','散步时想清了一个写作问题。','回看这一周，把下周要做的两件事写下来。'];
for(let week=0;week<3;week++)for(let i=0;i<7;i++){
 const date=addDays('2026-09-21',week*7+i);
 state.ratings[date]=Object.fromEntries(dimensions.map(d=>[d,{stars:Math.max(0,values[d][i]-(week===0?1:0)),note:({study:'完成练习并整理了错题，记下还需要复习的概念。',work:'整理镜头与修改意见，留下一版可以继续推进的文件。',health:i===2?'今天没有运动，按实际情况记录为0星。':'按自己的状态安排活动与休息。',life:'处理日常事务，并留出与家人交流的时间。'}[d])}]));
 state.dailyNotes[date]={note:journals[i]};
}
delete state.ratings['2026-09-30'].study;
state.tasks.demo={id:'demo',title:'短片初剪',createdAt:'2026-10-04T16:30:00Z',progress:[{id:'p1',active:true,date:'2026-10-06',note:'整理素材并完成粗剪。'},{id:'p2',active:true,date:'2026-10-09',note:'调整结构和节奏。'}],completion:{active:true,date:'2026-10-10',note:'交付一版可观看的短片。'}};
for(const [date,day]of Object.entries(state.ratings))for(const [d,r]of Object.entries(day))state.ledger.push({date,owner:date+'/'+d,kind:'评分',actual:(5+2*r.stars)*SCALE,active:true});
const first=buildWeeklyReport(state,'2026-09-28',{accountScope:'fictional-preview',generatedAt:'2026-10-04T16:00:00Z'});
const latest=buildWeeklyReport(state,'2026-10-05',{accountScope:'fictional-preview',generatedAt:'2026-10-11T16:00:00Z',previousTemplateIds:first.templateIds});
const demo={fictional:true,clock:'2026-10-18',reports:[latest,first],reminders:reminderCopy};
await writeFile(new URL('./weekly-demo.json',import.meta.url),JSON.stringify(demo,null,2)+'\n');
const preview=new URL('../previews/experience-refined.html',import.meta.url);
let html=await readFile(preview,'utf8');
const marker=/<script type="application\/json" id="rr-weekly-demo">[\s\S]*?<\/script>/;
if(!marker.test(html))throw Error('Missing literal weekly demo data block');
html=html.replace(marker,`<script type="application/json" id="rr-weekly-demo">${JSON.stringify(demo).replaceAll('<','\\u003c')}</script>`);
await writeFile(preview,html);
console.log('Fictional weekly fixtures and preview data updated: '+fileURLToPath(preview));
