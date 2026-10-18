import { DIMENSIONS, LABELS, hongKong, addDays, SCALE } from '../core/index.js';
import { buildWeeklyReport, mondayFor, previousWeek } from '../core/weekly-report.js';
import { updateDOM } from './dom.js';
const esc = v => String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const colors=['#be9225','#bb885e','#7d925e','#5c8a82'];
const reports=new Map();
export function availableWeeks(state, now=new Date().toISOString()) {
  const latest=previousWeek(now).start,current=mondayFor(hongKong(now).date),dates=[...Object.keys(state.ratings),...Object.keys(state.dailyNotes??{}),...Object.keys(state.ratingNotes??{}),...Object.values(state.tasks).flatMap(t=>[t.start,...t.progress.map(p=>p.date),...(t.completion?[t.completion.date]:[])])];
  return [...new Set([latest,...dates.map(mondayFor).filter(d=>d<current)])].sort().reverse();
}
function reportAt(state,start,scope,depth=0) {
  const key=scope+'/'+start,existing=reports.get(key);if(existing?.source===state)return existing.report;
  // Generate the preceding visible week using its own predecessor, so opening
  // reports out of order still honors the no-adjacent-repeat rule.
  const prior=depth<52?reportAt(state,addDays(start,-7),scope,depth+1):null;
  const report=buildWeeklyReport(state,start,{accountScope:scope,previousTemplateIds:prior?.templateIds??[],generatedAt:new Date().toISOString()});
  if(existing?.report.fingerprint===report.fingerprint)report.generatedAt=existing.report.generatedAt;
  reports.set(key,{source:state,report});if(reports.size>52)reports.delete(reports.keys().next().value);return report;
}
export function getWeeklyReport(state,start,scope='guest') { return reportAt(state,start,scope); }
export function trendPanel(start,end,{weekly=false,hidden=[]}={}) {
  return `<section class="panel trend-panel"><div class="section-title"><h2>${weekly?'一周评分走势':'每日评分趋势'}</h2>${weekly?'':`<div class="segmented">${[7,30].map(n=>`<button type="button" data-action="trend-range" data-range="${n}" class="${Math.round((Date.parse(end)-Date.parse(start))/86400000)+1===n?'selected':''}">${n} 天</button>`).join('')}</div>`}</div><div class="legend trend-legend">${DIMENSIONS.map((d,i)=>`<button type="button" data-action="trend-series" data-dimension="${d}" aria-pressed="${!hidden.includes(d)}" style="--legend:${colors[i]}"><i></i>${LABELS[d]}</button>`).join('')}</div><div class="trend-chart" data-render-owned="trend" data-start="${start}" data-end="${end}" data-weekly="${weekly}"></div><small class="field-hint">0—5 星 · 空白保留断线，明确0星保留零点 · 点曲线回看当天</small></section>`;
}
export function drawTrends(root,state,hidden=[],selected='') {
  root.querySelectorAll('.trend-chart').forEach(host=>{
    const width=Math.max(200,host.clientWidth),height=260,pad={left:32,right:18,top:18,bottom:38};
    const count=Math.round((Date.parse(host.dataset.end)-Date.parse(host.dataset.start))/86400000)+1;
    const dates=Array.from({length:count},(_,i)=>addDays(host.dataset.start,i)),x=i=>pad.left+i*(width-pad.left-pad.right)/(count-1||1),y=n=>height-pad.bottom-n*(height-pad.top-pad.bottom)/5;
    let svg=`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${host.dataset.start}至${host.dataset.end}四项评分趋势"><title>日期与星级，缺失断线，0星保留</title>`;
    for(let n=0;n<=5;n++)svg+=`<line x1="${pad.left}" x2="${width-pad.right}" y1="${y(n)}" y2="${y(n)}" class="chart-grid"/><text x="8" y="${y(n)+4}">${n}</text>`;
    const ticks=width<420?3:5;
    for(let j=0;j<ticks;j++){const i=Math.round(j*(count-1)/(ticks-1));svg+=`<text x="${x(i)}" y="${height-12}" text-anchor="${j===0?'start':j===ticks-1?'end':'middle'}">${dates[i].slice(5).replace('-','/')}</text>`;}
    const chosen=dates.indexOf(selected);if(chosen>=0)svg+=`<line x1="${x(chosen)}" x2="${x(chosen)}" y1="${pad.top}" y2="${height-pad.bottom}" class="chart-selected"/>`;
    DIMENSIONS.forEach((d,k)=>{if(hidden.includes(d))return;let path='',pen=false,points='';dates.forEach((date,i)=>{const r=state.ratings[date]?.[d];if(!r){pen=false;return;}path+=`${pen?'L':'M'}${x(i)},${y(r.stars)} `;pen=true;points+=`<circle data-ui-key="point:${date}" cx="${x(i)}" cy="${y(r.stars)}" r="3" fill="${colors[k]}"/><circle cx="${x(i)}" cy="${y(r.stars)}" r="12" fill="transparent" data-action="${host.dataset.weekly==='true'?'weekly-day':'calendar-date'}" data-date="${date}"><title>${date} ${LABELS[d]} ${r.stars}星</title></circle>`;});svg+=`<g data-ui-key="trend-series:${d}" data-series="${d}"><path d="${path}" fill="none" stroke="${colors[k]}" stroke-width="2.5" stroke-linejoin="round"/>${points}</g>`;});
    updateDOM(host,svg+'</svg>');
  });
}
export function weeklyArchive(state,start,day,scope='guest',hidden=[]) {
  const r=getWeeklyReport(state,start,scope),current=r.days.find(d=>d.date===day)??r.days[0],num=n=>n===null?'—':n.toFixed(1);
  return `<div class="weekly-archive"><div class="weekly-picker"><label>回顾周期<select id="weekly-picker" aria-label="选择周报">${availableWeeks(state).map(date=>`<option value="${date}" ${date===start?'selected':''}>${date} — ${addDays(date,6)}</option>`).join('')}</select></label><small>已结束的一周 · 离线分析</small></div><section class="panel weekly-intro"><h2>${r.start} — ${r.end}</h2><p>${esc(r.overall.text)}</p><small>${esc(r.qualityText.text)}</small><div class="weekly-stats"><span><b>${r.ratedCount}/28</b>评分记录</span><span><b>${r.completeDays}天</b>四项完整</span><span><b>${r.taskProgress}次</b>任务推进</span><span><b>${r.completedTasks}项</b>完成成果</span></div></section>${trendPanel(start,r.end,{weekly:true,hidden})}<section><div class="section-title"><h2>四项观察与建议</h2></div><div class="weekly-assessments">${r.sections.map(s=>`<article class="panel weekly-assessment"><header><h3>${s.label}</h3><small>${num(s.mean)}星 · ${s.count}/7天</small></header><p>${esc(s.assessment.text)}</p><div class="weekly-advice"><small>下周可以试试</small><p>${esc(s.advice.text)}</p></div><details><summary>判断依据</summary><p>${s.pairs}个同星期可比日；${s.delta===null?'对照不足，不判断升降':`成对均分变化 ${s.delta>=0?'+':''}${s.delta.toFixed(1)}星`}。最高${s.max??'—'}、最低${s.min??'—'}；0星${s.zeroDays}天。</p><small>记录日期：${s.evidence.recordedDates.map(d=>d.slice(5)).join('、')||'无'}</small></details></article>`).join('')}</div></section><section class="panel weekly-original"><div class="section-title"><h2>逐日原文</h2><small>原评分与依据</small></div><div class="weekly-days">${r.days.map((d,i)=>`<button type="button" data-action="weekly-day" data-date="${d.date}" aria-pressed="${d.date===current.date}"><span>周${'一二三四五六日'[i]}</span><small>${d.date.slice(5)}</small></button>`).join('')}</div><div class="weekly-day-content" data-ui-key="weekly-day-content"><h3>${current.date}</h3><p class="record-text weekly-journal">${esc(current.journal||'当天没有写小结')}</p><div class="weekly-reasons">${DIMENSIONS.map(d=>`<div><h3>${LABELS[d]}<small>${current.scores[d]===null?'—':current.scores[d]+'星'}</small></h3><p class="record-text">${esc(current.notes[d]||'没有填写依据')}</p></div>`).join('')}</div><h3>任务与成果</h3>${[...current.progress,...current.completed].map(e=>`<p class="record-text">${esc(e.title)}：${esc(e.note)}</p>`).join('')||'<p class="muted">当天没有有效推进或完成记录</p>'}</div></section><section class="panel weekly-next"><h2>下周，先做这两件</h2>${r.nextSteps.map(s=>`<p><b>${s.label}</b> · ${esc(s.advice.text)}</p>`).join('')}<small>${esc(r.closing.text)}</small></section><details class="panel weekly-version"><summary>经验与报告版本</summary><p>本周记录当前有效经验 ${(r.effectiveXPUnits/SCALE).toFixed(1)} XP（不是本周净新增）；小结${r.journalDays}天，创建任务${r.createdTasks}项。</p><small>${r.version} · 周报和小结不增加经验</small></details></div>`;
}
