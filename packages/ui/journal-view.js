import { DIMENSIONS, LABELS } from '../core/index.js';
import { recordText, journalText } from '../core/records.js';
import { icon } from './icons.js';

export const html = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
export const recordKey = (date, dimension) => `${date}/${dimension}`;

export function ratingCards({ state, date, drafts, editing, history = false }) {
  return `<div class="ratings-grid">${DIMENSIONS.map(d => {
    const rating = state.ratings[date]?.[d], key = recordKey(date, d);
    const note = drafts.get(key) ?? recordText(state, date, d), writing = editing === key;
    return `<article class="rating-card ${rating ? 'rated' : ''}" data-ui-key="rating:${key}">
      <header class="rating-heading"><span class="category-icon ${d}">${icon(d)}</span><h2><button type="button" class="rating-name" data-action="reference" data-dimension="${d}" aria-label="查看${LABELS[d]}评分参照">${LABELS[d]}</button></h2>${rating ? `<button type="button" class="clear-record-button" data-action="clear-rating" data-dimension="${d}" aria-label="清除${LABELS[d]}评分" title="清除评分">×</button>` : ''}
        <button type="button" class="write-button icon-button" data-action="write-record" data-dimension="${d}" data-date="${date}" aria-label="写${LABELS[d]}记录" aria-expanded="${writing}">${icon('pencil')}</button></header>
      <div class="rating-control" role="group" aria-label="${LABELS[d]}评分"><div class="stars">${[1,2,3,4,5].map(n => `<button type="button" class="star-button ${rating?.stars >= n ? 'lit' : ''}" data-action="rate" data-dimension="${d}" data-stars="${n}" aria-label="${LABELS[d]} ${n} 星" aria-pressed="${rating?.stars === n}">${icon('star')}</button>`).join('')}</div>
        <button type="button" class="zero ${rating?.stars === 0 ? 'active' : ''}" data-action="rate" data-dimension="${d}" data-stars="0" aria-label="${LABELS[d]} 0 星" aria-pressed="${rating?.stars === 0}">0 星</button></div>
      <div class="record-body ${writing ? 'is-editing' : ''} ${note ? 'has-text' : ''}" data-ui-key="record:${key}">
        <p class="record-reading" ${writing || !note ? 'hidden' : ''}>${html(note)}</p>
        <textarea class="rating-note record-input" data-date="${date}" data-dimension="${d}" data-record-key="${key}" rows="2" maxlength="4000" aria-label="${LABELS[d]}原因与依据" placeholder="记下今天的投入、进展或评分依据…" ${writing ? '' : 'hidden'}>${html(note)}</textarea>
      </div>

    </article>`;
  }).join('')}</div>`;
}

export function journalCard({ state, date, drafts }) {
  const key = recordKey(date, 'journal'), note = drafts.get(key) ?? journalText(state, date);
  return `<section class="panel journal-panel" data-ui-key="journal:${date}"><div class="section-title"><h2>今日小结</h2><span>选填 · 自动保存</span></div><textarea class="journal-input record-input" data-date="${date}" data-dimension="journal" data-record-key="${key}" rows="2" maxlength="4000" aria-label="今日小结" placeholder="给这一天留几句话…">${html(note)}</textarea></section>`;
}
