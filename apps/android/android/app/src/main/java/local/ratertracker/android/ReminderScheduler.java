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
  NotificationChannel channel=new NotificationChannel(CHANNEL,"登记与周报",NotificationManager.IMPORTANCE_DEFAULT);
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
   PendingIntent pi=alarm(c,hour);manager.cancel(pi);
   if(!options.optBoolean("enabled",false))continue;
   Calendar now=now(),next=(Calendar)now.clone();next.set(Calendar.HOUR_OF_DAY,hour);next.set(Calendar.MINUTE,0);next.set(Calendar.SECOND,0);next.set(Calendar.MILLISECOND,0);
   if(!next.after(now))next.add(Calendar.DAY_OF_YEAR,1);
   long at=next.getTimeInMillis();
   if(Build.VERSION.SDK_INT<31 || manager.canScheduleExactAlarms())manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,pi);
   else manager.setWindow(AlarmManager.RTC_WAKEUP,at,15*60*1000,pi);
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
  return new JSONObject().put("allowed",allowed(c)).put("exact",Build.VERSION.SDK_INT<31||manager.canScheduleExactAlarms()).put("enabled",object(prefs(c).getString("options","{}")).optBoolean("enabled",false));
 }
 public static void deliver(Context c,int hour){deliverAt(c,hour,System.currentTimeMillis());}
 static synchronized void deliverAt(Context c,int hour,long milliseconds){
  try{
   SharedPreferences p=prefs(c);JSONObject options=object(p.getString("options","{}")),mirror=object(p.getString("mirror","{}"));
   Calendar now=now();now.setTimeInMillis(milliseconds);String date=date(now),scope=mirror.optString("scope");
   if(!options.optBoolean("enabled")||!allowed(c)||now.get(Calendar.HOUR_OF_DAY)!=hour||now.get(Calendar.MINUTE)>15||!mirror.optBoolean("valid")||scope.isEmpty())return;
   boolean daily=options.optBoolean("daily",true),weekly=hour==10&&now.get(Calendar.DAY_OF_WEEK)==Calendar.MONDAY&&options.optBoolean("weekly",true);
   if(hour==10&&!daily&&!weekly || hour==11&&(!daily||!options.optBoolean("followup",true)||date.equals(mirror.optString("date"))&&mirror.optBoolean("updated")))return;
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
   android.app.Notification n=new NotificationCompat.Builder(c,CHANNEL).setSmallIcon(R.drawable.rater_notification).setContentTitle(title).setContentText(body).setStyle(new NotificationCompat.BigTextStyle().bigText(body)).setVisibility(NotificationCompat.VISIBILITY_PRIVATE).setContentIntent(action).setAutoCancel(true).setOnlyAlertOnce(true).build();
   NotificationManagerCompat.from(c).notify(id,n);
   sent.add(receipt);sent.removeIf(key->{String[] v=key.split("/");return v.length>=3&&v[v.length-2].compareTo(daysAgo(now,35))<0;});
   JSONArray remaining=new JSONArray();for(int i=0;i<bag.length();i++)if(bag.getInt(i)!=index)remaining.put(bag.getInt(i));
   p.edit().putStringSet("sent",sent).putString("bag",remaining.toString()).putInt("last",index).remove("pending").commit();
  }catch(Exception ignored){/* Invalid mirror is not evidence of an unrecorded day. */}
  finally{schedule(c);}
 }
}
