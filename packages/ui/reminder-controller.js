import { hongKong, DIMENSIONS } from '../core/index.js';
import { reminderDecision, takeReminder } from '../core/reports.js';
import { reminderCopy } from '../core/reminder-copy.js';

const defaults = { enabled:false, daily:true, followup:true, weekly:true };
export function hasTodayUpdate(state, date) {
  return Boolean(state.businessUpdates?.[date] || DIMENSIONS.some(d=>state.ratings[date]?.[d] || state.ratingNotes?.[date]?.[d]?.note?.trim()) || state.dailyNotes?.[date]?.note?.trim() || Object.values(state.tasks).some(t=>!t.deleted && (hongKong(t.createdAt).date===date || t.progress.some(p=>p.active && p.date===date) || t.completion?.active && t.completion.date===date)));
}
export function createReminderController({ state, scope, platform, route, status }) {
  let options, nativeStatus={}, busy=false, pending=false;
  try { options={...defaults,...JSON.parse(localStorage.getItem('rater-reminders-v1')??'{}')}; } catch { options={...defaults}; }
  async function refresh() {
    if (busy) { pending=true;return; } busy=true;
    try {
      do {
        pending=false;
        const current=state(), date=hongKong().date;
        if(platform?.reminderSync) nativeStatus=await platform.reminderSync({options,scope:scope(),date,updated:hasTodayUpdate(current,date),revision:current.revision,copies:reminderCopy});
        else if (platform?.notify) {
          const key='rater-reminder-receipts', saved=JSON.parse(localStorage.getItem(key)??'{"sent":[]}');
          const decision=reminderDecision({now:new Date().toISOString(),enabled:options.enabled,dailyEnabled:options.daily,followupEnabled:options.followup,weeklyEnabled:options.weekly,accountScope:scope(),hasTodayBusinessUpdate:hasTodayUpdate(current,date),sent:saved.sent});
          if(decision){ const selected=takeReminder(saved.rotation,'desktop');const title=decision.weeklyStart?'上周回顾已开启':selected.copy.title;const body=decision.weeklyStart?'点开查看上周的记录、变化与下一周建议。'+(options.daily?' '+selected.copy.body:''):selected.copy.body;
            if(await platform.notify({title,body,route:decision.route,start:decision.weeklyStart,scope:scope()})){saved.sent=[...saved.sent,decision.key].slice(-80);saved.rotation=selected.nextState;localStorage.setItem(key,JSON.stringify(saved));}}
        }
      } while(pending);
    } catch { status?.('提醒状态尚未同步，下次打开会重试'); }
    finally { busy=false; }
  }
  platform?.onNotification?.(route);
  return {
    get options(){return options;}, get nativeStatus(){return nativeStatus;}, refresh,
    async configure(name,value){options={...options,[name]:value};localStorage.setItem('rater-reminders-v1',JSON.stringify(options));if(name==='enabled' && value && platform?.reminderPermission)nativeStatus=await platform.reminderPermission();await refresh();},
    async consumeRoute(){const value=await platform?.consumeReminderRoute?.();if(value?.route)route(value);}
  };
}
