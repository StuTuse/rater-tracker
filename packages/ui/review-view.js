import { updateDOM } from './dom.js';
import { DIMENSIONS, LABELS, addDays, hongKong } from '../core/index.js';
import { recordText, journalText } from '../core/records.js';
import { buildWeeklyReport, mondayFor, previousWeek } from '../core/reports.js';
import { html } from './journal-view.js';

const colors = ['#b68519', '#b77950', '#6f8953', '#4b837a'];
const number = value => value === null ? '—' : value.toFixed(1);
export function chart(dates, { range = 0, hidden = new Set(), label = '四项评分趋势' } = {}) {
  return `<section class="panel trend-panel"><div class="section-title"><h2>${label}</h2>${range ? `<div class="segmented" aria-label="趋势范围">${[7,30].map(n => `<button type="button" data-action="trend-range" data-range="${n}" class="${n === range ? 'selected' : ''}">${n} 天</button>`).join('')}</div>` : ''}</div>
    <div class="chart-legend">${DIMENSIONS.map((d, i) => `<button type="button" data-action="trend-series" data-dimension="${d}" aria-pressed="${!hidden.has(d)}" style="--series:${colors[i]}"><i></i>${LABELS[d]}</button>`).join('')}</div>
    <div class="rating-chart" data-chart-dates="${html(JSON.stringify(dates))}" data-chart-hidden="${html(JSON.stringify([...hidden]))}" data-owned-content aria-label="${label}，0至5星；空白断线，点击日期查看依据"></div>
    <div class="trend-labels"><span>${dates[0]}</span><span>${dates.at(-1)}</span></div></section>`;
}

export function dayReview(state, date) {
  const tasks = Object.values(state.tasks).filter(t => !t.deleted);
  const progress = tasks.flatMap(t => t.progress.filter(p => p.active && p.date === date).map(p => ({ title:t.title, note:p.note })));
  const completed = tasks.filter(t => t.completion?.active && t.completion.date === date);
  const note = journalText(state, date);
  return `<section class="day-review" data-ui-key="day-review:${date}"><div class="section-title"><div><span class="eyebrow">当天回顾</span><h2>${date}</h2></div><span>${DIMENSIONS.filter(d => state.ratings[date]?.[d]).length}/4 项评分</span></div>
    <div class="day-scores">${DIMENSIONS.map((d, i) => `<div style="--series:${colors[i]}"><span>${LABELS[d]}</span><strong>${state.ratings[date]?.[d]?.stars ?? '—'}<small> / 5</small></strong></div>`).join('')}</div>
    ${note ? `<p class="day-journal">${html(note)}</p>` : '<p class="muted">这一天还没有写小结。</p>'}
    <div class="day-activity"><h3>任务进展 <span>${progress.length} 次推进 · ${completed.length} 项完成</span></h3>${[...progress.map(p => `<p><strong>${html(p.title)}</strong><span>${html(p.note)}</span></p>`), ...completed.map(t => `<p><strong>完成 · ${html(t.title)}</strong><span>${html(t.completion.note)}</span></p>`)].join('') || '<p class="muted">暂无任务记录</p>'}</div></section>`;
}

export function reportWeeks(state, now = new Date().toISOString()) {
  const latest = previousWeek(now).start;
  const dates = [...Object.keys(state.ratings), ...Object.keys(state.ratingNotes ?? {}), ...Object.keys(state.dailyNotes ?? {}), ...Object.values(state.tasks).flatMap(t => [hongKong(t.createdAt).date, ...t.progress.map(p => p.date), ...(t.completion ? [t.completion.date] : [])])];
  return [...new Set([latest, ...dates.map(mondayFor).filter(d => d <= latest)])].sort().reverse();
}

export function weeklyView(state, start, scope, cache = () => {}) {
  const prior = buildWeeklyReport(state, addDays(start, -7), { accountScope:scope });
  const report = buildWeeklyReport(state, start, { accountScope:scope, previousTemplateIds:prior.templateIds });
  cache(report);
  const weeks = [...new Set([start, ...reportWeeks(state)])].sort().reverse();
  return `<div class="weekly-toolbar"><button type="button" class="secondary" data-action="history-daily">← 每日回顾</button><label>周报归档<select id="weekly-select" aria-label="选择周报">${weeks.map(w => `<option value="${w}" ${start === w ? 'selected' : ''}>${w} — ${addDays(w,6)}</option>`).join('')}</select></label></div>
    <section class="panel weekly-intro"><span class="eyebrow">每周回顾</span><h2>${report.start} — ${report.end}</h2><p>${html(report.overall.text)}</p><div class="weekly-metrics"><div><strong>${report.recordedDays}<small> / 7</small></strong><span>评分天数</span></div><div><strong>${report.completeDays}</strong><span>完整记录</span></div><div><strong>${report.taskProgress}</strong><span>有效推进</span></div><div><strong>${report.completedTasks}</strong><span>完成任务</span></div></div><p class="field-hint">${html(report.qualityText.text)}</p></section>
    ${chart(report.days.map(d => d.date), { label:'上周评分曲线' })}
    <div class="weekly-sections">${report.sections.map(s => `<section class="panel weekly-dimension"><div class="section-title"><h2>${LABELS[s.dimension]}</h2><strong>${number(s.mean)} <small>均分</small></strong></div><p>${html(s.assessment.text)}</p><details><summary>查看评价依据</summary><p>${s.count} 天评分，${s.zeroDays} 天为0星。${s.pairs >= 4 ? `与上周${s.pairs}个同星期配对日比较，变化${s.delta >= 0 ? '+' : ''}${number(s.delta)}星。` : '同星期对照不足4天，不判断升降。'}</p><p>评分日期：${s.evidence.recordedDates.join('、') || '暂无'}</p></details><p class="weekly-advice">${html(s.advice.text)}</p></section>`).join('')}</div>
    <section class="panel weekly-next"><h2>下周，先做这两件小事</h2><ol>${report.nextSteps.map(s => `<li><strong>${s.label}</strong>${html(s.advice.text)}</li>`).join('')}</ol><p class="field-hint">${html(report.closing.text)}</p></section>
    <section class="panel weekly-originals"><div class="section-title"><h2>七天原始记录</h2><span>原文保留，可逐日展开</span></div>${report.days.map(day => `<details class="weekly-day"><summary>${day.date}<span>${DIMENSIONS.filter(d => day.scores[d] !== null).length}/4 项评分 · ${day.progress.length} 次推进</span></summary><div class="weekly-day-content">${DIMENSIONS.map(d => `<section><h3>${LABELS[d]} <span>${day.scores[d] === null ? '未评分' : day.scores[d]+' 星'}</span></h3><p>${html(day.notes[d]) || '未填写依据'}</p></section>`).join('')}${day.journal ? `<section><h3>当天小结</h3><p>${html(day.journal)}</p></section>` : ''}${[...day.progress,...day.completed].map(t => `<section><h3>${html(t.title)}</h3><p>${html(t.note)}</p></section>`).join('')}<button type="button" class="text-button" data-action="report-day" data-date="${day.date}">查看当天记录 →</button></div></details>`).join('')}</section><p class="report-footnote">依据当前有效记录生成；更正历史后会更新。周报不增加经验。</p>`;
}

export function refreshCharts(root, state) {
  for (const node of root.querySelectorAll('.rating-chart')) {
    const dates = JSON.parse(node.dataset.chartDates), hidden = new Set(JSON.parse(node.dataset.chartHidden));
    const width = Math.max(220, Math.round(node.clientWidth)), height = 220, left = 28, right = width - 16, top = 14, bottom = height - 22;
    const signature = JSON.stringify([width, dates, dates.map(date => DIMENSIONS.map(d => state.ratings[date]?.[d]?.stars ?? null)), [...hidden]]);
    if (node.chartSignature === signature) continue;
    node.chartSignature = signature;
    const x = i => left + i * (right - left) / (dates.length - 1), y = stars => bottom - stars / 5 * (bottom - top);
    let svg = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="四项0至5星评分曲线">${[0,1,2,3,4,5].map(n => `<line x1="${left}" x2="${right}" y1="${y(n)}" y2="${y(n)}" stroke="#e8e5d8"/><text x="8" y="${y(n)+4}" font-size="11" fill="#68705e">${n}</text>`).join('')}`;
    DIMENSIONS.forEach((d, index) => {
      if (hidden.has(d)) return;
      let path = '', pen = false;
      dates.forEach((date, i) => { const r = state.ratings[date]?.[d]; if (!r) { pen = false; return; } path += `${pen ? 'L' : 'M'}${x(i)},${y(r.stars)} `; pen = true; });
      svg += `<path data-ui-key="line:${d}" d="${path}" fill="none" stroke="${colors[index]}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
      dates.forEach((date, i) => { const r = state.ratings[date]?.[d]; if (r) svg += `<circle data-ui-key="point:${d}:${date}" cx="${x(i)}" cy="${y(r.stars)}" r="3" fill="${colors[index]}"><title>${date} ${LABELS[d]} ${r.stars}星</title></circle>`; });
    });
    dates.forEach((date, i) => { svg += `<g role="button" tabindex="0" data-action="report-day" data-date="${date}" aria-label="查看${date}记录"><rect x="${x(i)-Math.max(4,(right-left)/dates.length/2)}" y="${top-5}" width="${Math.max(8,(right-left)/dates.length)}" height="${bottom-top+10}" fill="transparent"/><title>${date}</title></g>`; });
    updateDOM(node, svg + '</svg>');
  }
}
