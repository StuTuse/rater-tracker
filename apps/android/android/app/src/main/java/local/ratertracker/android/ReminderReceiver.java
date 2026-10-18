package local.ratertracker.android;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import java.text.SimpleDateFormat;
import java.util.*;
import org.json.*;

public final class ReminderReceiver extends BroadcastReceiver {
 static final String PREFS="rater-reminders-v1", ACTION="local.ratertracker.android.REMINDER";
 static boolean schedule(Context context){
  Intent intent=new Intent(context,ReminderReceiver.class).setAction(ACTION);
  AlarmManager alarm=(AlarmManager)context.getSystemService(Context.ALARM_SERVICE);
  if(alarm==null)return false;boolean exact=Build.VERSION.SDK_INT<31||alarm.canScheduleExactAlarms();
  for(int hour:new int[]{10,11}){
   PendingIntent pending=PendingIntent.getBroadcast(context,hour,intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
   Calendar next=Calendar.getInstance(TimeZone.getTimeZone("Asia/Hong_Kong"));next.set(Calendar.HOUR_OF_DAY,hour);next.set(Calendar.MINUTE,0);next.set(Calendar.SECOND,0);next.set(Calendar.MILLISECOND,0);if(next.getTimeInMillis()<=System.currentTimeMillis())next.add(Calendar.DAY_OF_YEAR,1);
   if(exact){if(Build.VERSION.SDK_INT>=23)alarm.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,next.getTimeInMillis(),pending);else alarm.setExact(AlarmManager.RTC_WAKEUP,next.getTimeInMillis(),pending);}
   else alarm.setInexactRepeating(AlarmManager.RTC_WAKEUP,next.getTimeInMillis(),AlarmManager.INTERVAL_DAY,pending);
  }
  return exact;
 }
 static void cancel(Context context){AlarmManager alarm=(AlarmManager)context.getSystemService(Context.ALARM_SERVICE);if(alarm==null)return;for(int hour:new int[]{10,11}){PendingIntent p=PendingIntent.getBroadcast(context,hour,new Intent(context,ReminderReceiver.class).setAction(ACTION),PendingIntent.FLAG_NO_CREATE|PendingIntent.FLAG_IMMUTABLE);if(p!=null){alarm.cancel(p);p.cancel();}}}
 private static String date(){SimpleDateFormat f=new SimpleDateFormat("yyyy-MM-dd",Locale.ROOT);f.setTimeZone(TimeZone.getTimeZone("Asia/Hong_Kong"));return f.format(new Date());}
 @Override public void onReceive(Context context,Intent intent){
  if(Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())||Intent.ACTION_TIME_CHANGED.equals(intent.getAction())||Intent.ACTION_TIMEZONE_CHANGED.equals(intent.getAction())){if(context.getSharedPreferences(PREFS,Context.MODE_PRIVATE).getBoolean("enabled",false))schedule(context);else cancel(context);return;}
  if(!ACTION.equals(intent.getAction()))return;
  android.content.SharedPreferences prefs=context.getSharedPreferences(PREFS,Context.MODE_PRIVATE);if(!prefs.getBoolean("enabled",false))return;
  Calendar hk=Calendar.getInstance(TimeZone.getTimeZone("Asia/Hong_Kong"));int hour=hk.get(Calendar.HOUR_OF_DAY);if(hour!=10&&hour!=11)return;
  String today=date(),slot=hour==10?"morning":"followup",key=today+"/"+slot;Set<String>sent=new HashSet<>(prefs.getStringSet("sent",Collections.emptySet()));if(sent.contains(key))return;
  boolean daily=prefs.getBoolean("daily",true),followup=prefs.getBoolean("followup",true),weekly=prefs.getBoolean("weekly",true);
  if(hour==11&&(!daily||!followup||today.equals(prefs.getString("todayUpdate",""))))return;
  boolean monday=hk.get(Calendar.DAY_OF_WEEK)==Calendar.MONDAY,week=hour==10&&monday&&weekly;
  if(hour==10&&!daily&&!week)return;
  String title,body,route=week?"weekly-report":"today",weekStart="";
  if(week){title="上周周报已生成";body="点击查看上周评分曲线、记录与本周建议。";Calendar w=(Calendar)hk.clone();w.set(Calendar.DAY_OF_WEEK,Calendar.MONDAY);w.add(Calendar.DAY_OF_YEAR,-7);SimpleDateFormat f=new SimpleDateFormat("yyyy-MM-dd",Locale.ROOT);f.setTimeZone(TimeZone.getTimeZone("Asia/Hong_Kong"));weekStart=f.format(w.getTime());}
  else {int index=nextCopy(prefs);try{JSONArray copies=new JSONArray(prefs.getString("copies","[]"));JSONObject copy=copies.optJSONObject(index);title=copy==null?"今天登录登记":copy.optString("title","今天登录登记");body=copy==null?"打开成长手记，记下今天的投入与进展。":copy.optString("body","");}catch(Exception e){title="今天登录登记";body="打开成长手记，记下今天的投入与进展。";}}
  sent.add(key);if(sent.size()>60){ArrayList<String>ordered=new ArrayList<>(sent);Collections.sort(ordered);while(ordered.size()>60)sent.remove(ordered.remove(0));}prefs.edit().putStringSet("sent",sent).putString("pendingRoute",route).putString("pendingWeek",weekStart).apply();
  if(Build.VERSION.SDK_INT>=26){NotificationManager manager=(NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE);manager.createNotificationChannel(new NotificationChannel("daily-reminders","每日提醒与周报",NotificationManager.IMPORTANCE_DEFAULT));}
  Intent open=new Intent(context,MainActivity.class).setAction("local.ratertracker.android.OPEN_REMINDER").putExtra("route",route).putExtra("weeklyStart",weekStart).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
  PendingIntent click=PendingIntent.getActivity(context,week?3001:3000,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  NotificationCompat.Builder n=new NotificationCompat.Builder(context,"daily-reminders").setSmallIcon(R.drawable.rater_icon).setContentTitle(title).setContentText(body).setStyle(new NotificationCompat.BigTextStyle().bigText(body)).setAutoCancel(true).setContentIntent(click);
  ((NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE)).notify(week?3001:3000,n.build());
  schedule(context);
 }
 private static int nextCopy(android.content.SharedPreferences p){
  try{JSONArray remaining=new JSONArray(p.getString("remaining","[]"));int cycle=p.getInt("cycle",0),last=p.getInt("lastId",-1);if(remaining.length()==0){JSONArray copies=new JSONArray(p.getString("copies","[]"));ArrayList<Integer>ids=new ArrayList<>();for(int i=0;i<copies.length();i++)ids.add(i);Collections.shuffle(ids,new Random(System.currentTimeMillis()^cycle));if(ids.size()>1&&ids.get(0)==last)Collections.swap(ids,0,1);remaining=new JSONArray();for(int id:ids)remaining.put(id);cycle++;}int id=remaining.getInt(0);JSONArray next=new JSONArray();for(int i=1;i<remaining.length();i++)next.put(remaining.get(i));p.edit().putString("remaining",next.toString()).putInt("cycle",cycle).putInt("lastId",id).apply();return id;}catch(Exception e){return 0;}
 }
}
