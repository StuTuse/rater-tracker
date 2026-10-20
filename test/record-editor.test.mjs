import test from 'node:test';
import assert from 'node:assert/strict';
import { createRecordEditor } from '../packages/ui/record-editor.js';
import { createState, transact } from '../packages/core/index.js';
import { recordText } from '../packages/core/records.js';

function fixture(){
 const doc=new EventTarget(),win=new EventTarget(),cache=new Map();let state=createState(),fail=false,gate=null;
 Object.assign(globalThis,{document:doc,window:win,visualViewport:new EventTarget(),requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{},localStorage:{getItem:k=>cache.get(k)??null,setItem:(k,v)=>cache.set(k,v)}});
 doc.querySelectorAll=()=>[];doc.activeElement=null;
 const key='2026-10-21/study',drafts=new Map(),messages=[];
 const el={dataset:{recordKey:key},value:'',style:{},scrollHeight:72,matches:()=>true};
 const fire=(type,value,extra={})=>{if(value!==undefined)el.value=value;const e=new Event(type);Object.defineProperty(e,'target',{value:el});Object.assign(e,extra);doc.dispatchEvent(e);};
 const editor=createRecordEditor({state:()=>state,scope:()=> 'guest',drafts,render:()=>{},status:s=>messages.push(s),writeDrafts:async()=>{},save:async action=>{if(gate)await gate;if(fail)return false;state=transact(state,{...action,id:crypto.randomUUID()},'2026-10-21T12:00:00+08:00');return true;}});
 return {editor,fire,drafts,cache,key,el,messages,state:()=>state,setFail:v=>fail=v,setGate:v=>gate=v};
}
test('each input is immediately recoverable and commits without debounce or blur',async()=>{
 const f=fixture();f.fire('input','立即保留');assert.equal(JSON.parse([...f.cache.values()][0]).entries[f.key],'立即保留');
 assert.equal(await f.editor.flush(),true);assert.equal(recordText(f.state(),'2026-10-21','study'),'立即保留');assert.equal(f.state().ledger.length,0);assert.equal(f.drafts.size,0);
});
test('in-flight save cannot discard newer text, including edit away and back',async()=>{
 const f=fixture();let release;f.setGate(new Promise(r=>release=r));f.fire('input','甲');await Promise.resolve();
 f.fire('input','乙');f.fire('input','甲');release();await f.editor.flush();assert.equal(recordText(f.state(),'2026-10-21','study'),'甲');assert.equal(f.drafts.size,0);
 f.fire('input','最后一次修改');await f.editor.flush();assert.equal(recordText(f.state(),'2026-10-21','study'),'最后一次修改');
});
test('IME missing compositionend and input is captured on focusout',async()=>{
 const f=fixture();f.fire('compositionstart');f.fire('input','拼音中',{isComposing:true});await f.editor.flush();assert.equal(recordText(f.state(),'2026-10-21','study'),'');
 f.el.value='中文最终选词';f.fire('focusout');await f.editor.flush();assert.equal(recordText(f.state(),'2026-10-21','study'),'中文最终选词');
});
test('failed write keeps recovery copy and retry saves the latest value',async()=>{
 const f=fixture();f.setFail(true);f.fire('input','失败时也不能丢');assert.equal(await f.editor.flush(),false);assert.equal(f.drafts.get(f.key),'失败时也不能丢');
 f.setFail(false);f.fire('input','离线重试后的文字');assert.equal(await f.editor.flush(),true);assert.equal(recordText(f.state(),'2026-10-21','study'),'离线重试后的文字');
});
test('restart restores interrupted IME draft and commits it; clear stays cleared',async()=>{
 const f=fixture();f.fire('compositionstart');f.fire('input','重启前输入',{isComposing:true});f.editor.restore();await f.editor.flush();assert.equal(recordText(f.state(),'2026-10-21','study'),'重启前输入');
 f.fire('input','');await f.editor.flush();f.editor.restore();await f.editor.flush();assert.equal(recordText(f.state(),'2026-10-21','study'),'');assert.equal(f.drafts.size,0);
});
