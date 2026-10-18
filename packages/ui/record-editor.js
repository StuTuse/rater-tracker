import { recoverRecordDrafts } from '../data/record-drafts.js';
import { recordText, journalText } from '../core/records.js';
import { recordKey } from './journal-view.js';

// Captured date + account scope travel with each draft. Composition never submits.
export function createRecordEditor({ state, scope, save, render, drafts, status, writeDrafts }) {
  let editing = '', timer, running = Promise.resolve();
  const composing = new Set();
  const storageKey = () => `rater-record-drafts:${scope()}`;
  let stamp=0;
  const persistDrafts = () => {
    stamp=Math.max(Date.now(),stamp+1);const snapshot={version:1,at:stamp,entries:Object.fromEntries(drafts)};
    try { localStorage.setItem(storageKey(),JSON.stringify(snapshot)); } catch { status('草稿暂未落盘，请保持应用打开'); }
    return writeDrafts(snapshot).catch(()=>{status('草稿暂存失败，请保持应用打开');});
  };
  const resize = input => { input.style.height = 'auto'; input.style.height = `${Math.max(72, input.scrollHeight)}px`; };
  function restore(legacy = {}) {
    drafts.clear(); editing = '';
    let cached=null;try{cached=localStorage.getItem(storageKey());}catch{}
    const recovered=recoverRecordDrafts(legacy,cached);stamp=Math.max(stamp,recovered.at);
    for(const [key,value] of recovered.entries)drafts.set(key,value);
  }
  function flush() {
    clearTimeout(timer);
    const owner = scope(), snapshot = [...drafts].filter(([key]) => !composing.has(key));
    running = running.then(async () => {
      for (const [key, note] of snapshot) {
        if (scope() !== owner) return false;
        const [date, dimension] = key.split('/');
        const original = dimension === 'journal' ? journalText(state(), date) : recordText(state(), date, dimension);
        if (original !== note && !await save({ type: dimension === 'journal' ? 'journal' : 'note', date, dimension, note }, null)) { persistDrafts(); return false; }
        if (drafts.get(key) === note) drafts.delete(key);
      }
      await persistDrafts(); return true;
    }).catch(() => { status('记录尚未保存，草稿已保留'); return false; });
    return running;
  }
  function input(event) {
    const el = event.target;
    if (!el.matches?.('[data-record-key]')) return;
    drafts.set(el.dataset.recordKey, el.value); resize(el); persistDrafts(); status('正在保存…');queueKeepVisible();
    clearTimeout(timer); if (!composing.has(el.dataset.recordKey)) timer = setTimeout(flush, 500);
  }
  document.addEventListener('input', input);
  document.addEventListener('compositionstart', e => { if (e.target.dataset.recordKey) { composing.add(e.target.dataset.recordKey); clearTimeout(timer); } });
  document.addEventListener('compositionend', e => { if (e.target.dataset.recordKey) { composing.delete(e.target.dataset.recordKey); input(e); } });
  document.addEventListener('focusout', e => { if (!e.target.dataset.recordKey) return; flush(); if (editing === e.target.dataset.recordKey) setTimeout(() => { if (!document.activeElement?.matches('[data-record-key]')) { editing = ''; render(); } }, 0); });
  const retain = () => { persistDrafts(); flush(); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) retain(); });
  window.addEventListener('rater-pause', retain); window.addEventListener('pagehide', retain);
  function keepVisible() {
    const input=document.activeElement;if(!input?.matches('textarea,input')||!window.visualViewport)return false;
    const box=input.getBoundingClientRect(),viewport=visualViewport;
    const top=viewport.offsetTop+12,bottom=viewport.offsetTop+viewport.height-18;
    const delta=box.height>bottom-top || box.top<top ? box.top-top : box.bottom>bottom ? box.bottom-bottom : 0;
    if(Math.abs(delta)<1)return false;
    const dialog=input.closest('dialog');
    if(dialog && dialog.scrollHeight>dialog.clientHeight)dialog.scrollTop+=delta;
    else window.scrollBy({top:delta,behavior:'instant'});
    return true;
  }
  let visibilityFrame;
  function queueKeepVisible(){
    cancelAnimationFrame(visibilityFrame);let remaining=4;
    const step=()=>{if(keepVisible()&&--remaining>0)visibilityFrame=requestAnimationFrame(step);};
    visibilityFrame=requestAnimationFrame(step);
  }
  visualViewport?.addEventListener('resize',queueKeepVisible);
  return {
    get editing() { return editing; }, restore, flush,
    refresh() { document.querySelectorAll('[data-record-key]:not([hidden])').forEach(resize); },
    open(date, dimension) {
      editing = recordKey(date, dimension); render();
      const input = [...document.querySelectorAll('[data-record-key]')].find(el => el.dataset.recordKey === editing);
      input?.focus({ preventScroll: true }); input?.setSelectionRange(input.value.length, input.value.length);
      // focus stays in the user's gesture to request the Android IME immediately.
      queueKeepVisible();
    }
  };
}
