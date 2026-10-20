import { recoverRecordDrafts } from '../data/record-drafts.js';
import { recordText, journalText } from '../core/records.js';
import { recordKey } from './journal-view.js';

// Every input has a synchronous recovery copy. Native IME composition is kept
// intact; blur/pause also capture IMEs which omit their final input/end event.
export function createRecordEditor({ state, scope, save, render, drafts, status, writeDrafts }) {
  let editing = '', running = null, pending = false, generation = 0;
  const composing = new Set();
  const revisions = new Map();
  const storageKey = () => `rater-record-drafts:${scope()}`;
  let stamp=0;
  const persistDrafts = () => {
    stamp=Math.max(Date.now(),stamp+1);const snapshot={version:1,at:stamp,entries:Object.fromEntries(drafts)};
    try { localStorage.setItem(storageKey(),JSON.stringify(snapshot)); } catch { status('草稿暂未落盘，请保持应用打开'); }
    return writeDrafts(snapshot).catch(()=>{status('草稿暂存失败，请保持应用打开');});
  };
  const resize = input => { input.style.height = 'auto'; input.style.height = `${Math.max(72, input.scrollHeight)}px`; };
  function restore(legacy = {}) {
    generation++; drafts.clear(); composing.clear(); revisions.clear(); editing = '';
    let cached=null;try{cached=localStorage.getItem(storageKey());}catch{}
    const recovered=recoverRecordDrafts(legacy,cached);stamp=Math.max(stamp,recovered.at);
    for(const [key,value] of recovered.entries)drafts.set(key,value);
  }
  function flush() {
    pending = true;
    if (running) return running;
    const owner = scope(), epoch = generation;
    running = Promise.resolve().then(async () => {
     do {
      pending = false;
      const snapshot = [...drafts].filter(([key]) => !composing.has(key)).map(([key,note])=>[key,note,revisions.get(key)]);
      for (const [key, note, revision] of snapshot) {
        if (scope() !== owner || generation !== epoch) return false;
        if (composing.has(key) || revisions.get(key) !== revision) { pending = true; continue; }
        const [date, dimension] = key.split('/');
        const original = dimension === 'journal' ? journalText(state(), date) : recordText(state(), date, dimension);
        if (original !== note && !await save({ type: dimension === 'journal' ? 'journal' : 'note', date, dimension, note }, null)) { persistDrafts(); return false; }
        if (scope() !== owner || generation !== epoch) return false;
        if (revisions.get(key) === revision && drafts.get(key) === note && !composing.has(key)) drafts.delete(key);
      }
      await persistDrafts();
     } while (pending);
     if (!drafts.size) status('已保存到本机');
     return true;
    }).catch(() => { status('记录尚未保存，草稿已保留'); return false; }).finally(()=>{running=null;});
    return running;
  }
  function input(event) {
    const el = event.target;
    if (!el.matches?.('[data-record-key]')) return;
    if (event.isComposing) composing.add(el.dataset.recordKey);
    capture(el); resize(el); persistDrafts(); status('正在保存…');queueKeepVisible();
    if (!composing.has(el.dataset.recordKey) && !event.isComposing) flush();
  }
  function capture(el) {
    const key=el.dataset.recordKey;
    if (!drafts.has(key) && el.value === (key.endsWith('/journal') ? journalText(state(),key.split('/')[0]) : recordText(state(),...key.split('/')))) return;
    if (!drafts.has(key) || drafts.get(key)!==el.value) { drafts.set(key,el.value); revisions.set(key,(revisions.get(key)??0)+1); }
  }
  document.addEventListener('input', input);
  document.addEventListener('compositionstart', e => { if (e.target.dataset.recordKey) composing.add(e.target.dataset.recordKey); });
  document.addEventListener('compositionend', e => { if (e.target.dataset.recordKey) { composing.delete(e.target.dataset.recordKey); input(e); } });
  document.addEventListener('focusout', e => { if (!e.target.dataset.recordKey) return; capture(e.target); composing.delete(e.target.dataset.recordKey); persistDrafts(); flush(); if (editing === e.target.dataset.recordKey) setTimeout(() => { if (!document.activeElement?.matches('[data-record-key]')) { editing = ''; render(); } }, 0); });
  const retain = () => { const el=document.activeElement;if(el?.matches('[data-record-key]'))capture(el); persistDrafts(); flush(); };
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
