package local.ratertracker.android;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import org.json.*;
import java.text.SimpleDateFormat;
import java.util.*;

/** Only a private minimal mirror crosses into native code; never notes or tokens. */
public final class ReminderScheduler {
 static final String CHANNEL="journal-reminders-v1";
 static final TimeZone ZONE=TimeZone.getTimeZone("Asia/Hong_Kong");
 static Calendar now(){return Calendar.getInstance(ZONE);}
 static String date(Calendar value){SimpleDateFormat f=new SimpleDateFormat("yyyy-MM-dd",Locale.ROOT);f.setTimeZone(ZONE);return f.format(value.getTime());}
 static String daysAgo(Calendar value,int days){Calendar c=(Calendar)value.clone();c.add(Calendar.DAY_OF_YEAR,-days);return date(c);}
 static SharedPreferences prefs(Context c){return c.getSharedPreferences("rater-reminders-v1",Context.MODE_PRIVATE);}
 static JSONObject object(String value){try{return new JSONObject(value);}catch(Exception e){return new JSONObject();}}
 static void channel(Context c){
  if(Build.VERSION.SDK_INT<26)return;
  NotificationChannel channel=new NotificationChannel(CHANNEL,"登记与周报",NotificationManager.IMPORTANCE_HIGH);
  channel.setDescription("每日10点登记、11点有条件提醒，周一合并周报");
  channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PRIVATE);
  c.getSystemService(NotificationManager.class).createNotificationChannel(channel);
 }
 static boolean allowed(Context c){
  if(Build.VERSION.SDK_INT>=33 && c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)return false;
  NotificationChannel channel=Build.VERSION.SDK_INT>=26?c.getSystemService(NotificationManager.class).getNotificationChannel(CHANNEL):null;
  return NotificationManagerCompat.from(c).areNotificationsEnabled() && (channel==null || channel.getImportance()!=NotificationManager.IMPORTANCE_NONE);
 }
 static PendingIntent alarm(Context c,int hour){return PendingIntent.getBroadcast(c,hour,new Intent(c,ReminderReceiver.class).setAction("rater.slot."+hour).putExtra("hour",hour),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);}
 public static synchronized void schedule(Context c){
  AlarmManager manager=c.getSystemService(AlarmManager.class);SharedPreferences p=prefs(c);JSONObject options=object(p.getString("options","{}"));
  for(int hour:new int[]{10,11}){
   PendingIntent pi=alarm(c,hour);
   if(!options.optBoolean("enabled",false)){manager.cancel(pi);p.edit().remove("next"+hour).apply();continue;}
   Calendar now=now(),next=(Calendar)now.clone();next.set(Calendar.HOUR_OF_DAY,hour);next.set(Calendar.MINUTE,0);next.set(Calendar.SECOND,0);next.set(Calendar.MILLISECOND,0);
   // A foreground refresh at 10:00 must not cancel an undelivered 10:00 alarm
   // and replace it with tomorrow. Recover this slot within its own hour.
   String receipt=object(p.getString("mirror","{}")).optString("scope")+"/"+date(now)+"/"+hour;
   boolean due=now.get(Calendar.HOUR_OF_DAY)==hour && !date(now).equals(p.getString("handled"+hour,"")) && !p.getStringSet("sent",Collections.emptySet()).contains(receipt);
   if(!next.after(now)){if(due)next.setTimeInMillis(now.getTimeInMillis()+1000);else next.add(Calendar.DAY_OF_YEAR,1);}
   long at=next.getTimeInMillis();
   boolean exact=Build.VERSION.SDK_INT<31 || manager.canScheduleExactAlarms();
   try{if(exact)manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,pi);else manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,pi);}
   catch(SecurityException denied){manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,pi);exact=false;}
   p.edit().putLong("next"+hour,at).putBoolean("scheduledExact",exact).apply();
  }
 }
 public static synchronized JSONObject sync(Context c,JSONObject input)throws JSONException{
  SharedPreferences p=prefs(c);String scope=input.getString("scope");long revision=input.getLong("revision");
  JSONObject old=object(p.getString("mirror","{}"));
  if(scope.equals(old.optString("scope")) && revision<old.optLong("revision",-1))return status(c);
  JSONObject mirror=new JSONObject().put("scope",scope).put("date",input.getString("date")).put("updated",input.getBoolean("updated")).put("revision",revision).put("valid",true);
  JSONArray copies=input.getJSONArray("copies");if(copies.length()!=50)throw new JSONException("提醒文案不完整");
  boolean ok=p.edit().putString("mirror",mirror.toString()).putString("options",input.getJSONObject("options").toString()).putString("copies",copies.toString()).commit();
  if(!ok)throw new JSONException("提醒状态未保存");
  channel(c);schedule(c);return status(c);
 }
 public static JSONObject status(Context c)throws JSONException{
  AlarmManager manager=c.getSystemService(AlarmManager.class);
  android.os.PowerManager power=c.getSystemService(android.os.PowerManager.class);
  NotificationChannel channel=Build.VERSION.SDK_INT>=26?c.getSystemService(NotificationManager.class).getNotificationChannel(CHANNEL):null;
  SharedPreferences p=prefs(c);
  return new JSONObject().put("allowed",allowed(c)).put("exact",Build.VERSION.SDK_INT<31||manager.canScheduleExactAlarms()).put("batteryUnrestricted",power.isIgnoringBatteryOptimizations(c.getPackageName())).put("next10",p.getLong("next10",0)).put("next11",p.getLong("next11",0)).put("enabled",object(p.getString("options","{}")).optBoolean("enabled",false))
   .put("channelImportance",channel==null?NotificationManager.IMPORTANCE_DEFAULT:channel.getImportance()).put("channelSound",channel==null||channel.getSound()!=null)
   .put("serviceRequested",ReminderService.requested(c)).put("serviceRunning",ReminderService.running).put("serviceError",p.getString("serviceError",""))
   .put("heartbeatAt",p.getLong("serviceHeartbeat",0)).put("lastAttemptAt",p.getLong("lastAttemptAt",0)).put("lastStage",p.getString("lastStage","none"))
   .put("testScheduledAt",p.getLong("testScheduledAt",0)).put("testPostedAt",p.getLong("testPostedAt",0));
 }
 static void event(Context c,String stage){prefs(c).edit().putLong("lastAttemptAt",System.currentTimeMillis()).putString("lastStage",stage).apply();}
 static void checkCurrentSlot(Context c){
  Calendar clock=now();int hour=clock.get(Calendar.HOUR_OF_DAY);if(hour!=10&&hour!=11)return;
  String scope=object(prefs(c).getString("mirror","{}")).optString("scope"),key=scope+"/"+date(clock)+"/"+hour;
  if(!scope.isEmpty()&&!prefs(c).getStringSet("sent",Collections.emptySet()).contains(key))deliver(c,hour);
 }
 static JSONObject test(Context c,int delay)throws JSONException{
  channel(c);if(!allowed(c))return new JSONObject().put("posted",false).put("reason","通知权限或登记与周报渠道未开启");
  if(delay==0)return testNotify(c);
  long at=System.currentTimeMillis()+60000;
  PendingIntent pi=PendingIntent.getBroadcast(c,6202,new Intent(c,ReminderTestReceiver.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  AlarmManager alarms=c.getSystemService(AlarmManager.class);
  try{if(Build.VERSION.SDK_INT<31||alarms.canScheduleExactAlarms())alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,pi);else alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,pi);}
  catch(SecurityException denied){alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,pi);}
  prefs(c).edit().putLong("testScheduledAt",at).apply();return new JSONObject().put("scheduledAt",at).put("posted",false);
 }
 static JSONObject testNotify(Context c){
  JSONObject result=new JSONObject();
  try{
   channel(c);if(!allowed(c)){event(c,"notifications_blocked");return result.put("posted",false).put("reason","通知权限或渠道未开启");}
   PendingIntent open=PendingIntent.getActivity(c,6202,new Intent(c,MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
   Notification n=new NotificationCompat.Builder(c,CHANNEL).setSmallIcon(R.drawable.rater_notification).setContentTitle("提醒通道测试").setContentText("这是一条系统原生测试通知，不会改动你的记录。").setContentIntent(open).setAutoCancel(true).setCategory(NotificationCompat.CATEGORY_REMINDER).setPriority(NotificationCompat.PRIORITY_HIGH).build();
   NotificationManagerCompat.from(c).notify("rater-test",6202,n);prefs(c).edit().putLong("testPostedAt",System.currentTimeMillis()).remove("testScheduledAt").apply();event(c,"test_posted");return result.put("posted",true);
  }catch(Exception e){event(c,"post_failed");try{return result.put("posted",false).put("reason","系统通知提交失败，请检查通知渠道");}catch(JSONException ignored){return result;}}
 }
 public static void deliver(Context c,int hour){deliverAt(c,hour,System.currentTimeMillis());}
 static synchronized void deliverAt(Context c,int hour,long milliseconds){
  try{
   SharedPreferences p=prefs(c);JSONObject options=object(p.getString("options","{}")),mirror=object(p.getString("mirror","{}"));
   Calendar now=now();now.setTimeInMillis(milliseconds);String date=date(now),scope=mirror.optString("scope");
   if(!options.optBoolean("enabled")){event(c,"disabled");return;}
   if(!allowed(c)){event(c,"notifications_blocked");return;}
   if(now.get(Calendar.HOUR_OF_DAY)!=hour){event(c,"slot_expired");return;}
   if(!mirror.optBoolean("valid")||scope.isEmpty()){event(c,"mirror_unavailable");return;}
   boolean daily=options.optBoolean("daily",true),weekly=hour==10&&now.get(Calendar.DAY_OF_WEEK)==Calendar.MONDAY&&options.optBoolean("weekly",true);
   if(hour==10&&!daily&&!weekly || hour==11&&(!daily||!options.optBoolean("followup",true)||date.equals(mirror.optString("date"))&&mirror.optBoolean("updated"))){event(c,"not_needed");return;}
   String receipt=scope+"/"+date+"/"+hour;
   Set<String> sent=new HashSet<>(p.getStringSet("sent",Collections.emptySet()));if(sent.contains(receipt))return;
   JSONArray copies=new JSONArray(p.getString("copies","[]"));if(copies.length()!=50)return;
   JSONArray bag=new JSONArray(p.getString("bag","[]"));
   if(bag.length()==0){List<Integer> order=new ArrayList<>();for(int i=0;i<50;i++)order.add(i);Collections.shuffle(order);if(order.get(0)==p.getInt("last",-1))Collections.swap(order,0,1);bag=new JSONArray(order);}
   JSONObject pending=object(p.getString("pending","{}"));int index=receipt.equals(pending.optString("key"))?pending.getInt("index"):bag.getInt(0);
   if(!p.edit().putString("bag",bag.toString()).putString("pending",new JSONObject().put("key",receipt).put("index",index).toString()).commit())return;
   JSONObject copy=copies.getJSONObject(index);
   Intent open=new Intent(c,MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP).putExtra("raterRoute",weekly?"weekly-report":"today").putExtra("raterScope",scope);
   if(weekly)open.putExtra("raterWeek",daysAgo(now,7));
   int id=receipt.hashCode();PendingIntent action=PendingIntent.getActivity(c,id,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
   String title=weekly?"上周回顾已开启":copy.getString("title"),body=weekly?"点开查看上周的记录、变化与下一周建议。"+(daily?" "+copy.getString("body"):""):copy.getString("body");
   android.app.Notification n=new NotificationCompat.Builder(c,CHANNEL).setSmallIcon(R.drawable.rater_notification).setContentTitle(title).setContentText(body).setStyle(new NotificationCompat.BigTextStyle().bigText(body)).setVisibility(NotificationCompat.VISIBILITY_PRIVATE).setContentIntent(action).setAutoCancel(true).setOnlyAlertOnce(true).setCategory(NotificationCompat.CATEGORY_REMINDER).setPriority(NotificationCompat.PRIORITY_HIGH).build();
   NotificationManagerCompat.from(c).notify(id,n);
   event(c,"posted");
   sent.add(receipt);sent.removeIf(key->{String[] v=key.split("/");return v.length>=3&&v[v.length-2].compareTo(daysAgo(now,35))<0;});
   JSONArray remaining=new JSONArray();for(int i=0;i<bag.length();i++)if(bag.getInt(i)!=index)remaining.put(bag.getInt(i));
   p.edit().putStringSet("sent",sent).putString("bag",remaining.toString()).putInt("last",index).remove("pending").commit();
  }catch(Exception ignored){event(c,"post_failed");/* Never present system submission as proof of user-visible delivery. */}
  finally{Calendar handled=now();handled.setTimeInMillis(milliseconds);prefs(c).edit().putString("handled"+hour,date(handled)).commit();schedule(c);}
 }
}
