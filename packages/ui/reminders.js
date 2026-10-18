import { reminderCopy } from '../core/reminder-copy.js';

const KEY='rater-reminders-v1';
export const defaultReminders=()=>({enabled:false,daily:true,followup:true,weekly:true});
export function readReminders(){try{return{...defaultReminders(),...JSON.parse(localStorage.getItem(KEY)??'{}')};}catch{return defaultReminders();}}
export async function applyReminders(platform,preferences,todayUpdate=''){
 const value={...defaultReminders(),...preferences,copies:reminderCopy.map(([title,body],i)=>({id:i,title,body})),todayUpdate};
 localStorage.setItem(KEY,JSON.stringify(preferences));
 if(platform?.configureReminders)return platform.configureReminders(value);
 return{granted:false};
}
