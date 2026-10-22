package local.ratertracker.android;

import android.app.*;
import android.content.*;
import android.content.pm.ServiceInfo;
import android.os.*;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;

/** User-visible, offline reminder supervision. No network or permanent wake lock. */
public final class ReminderService extends Service {
 static final String CHANNEL="reminder-service-v1";
 static final int ID=6201;
 static volatile boolean running=false;
 private final Handler handler=new Handler(Looper.getMainLooper());
 static boolean requested(Context c){org.json.JSONObject o=ReminderScheduler.object(ReminderScheduler.prefs(c).getString("options","{}"));return o.optBoolean("enabled",false)&&o.optBoolean("persistent",true);}
 static void reconcile(Context c,boolean mayStart){
  if(!requested(c)||!ReminderScheduler.allowed(c)){c.stopService(new Intent(c,ReminderService.class));return;}
  if(running||!mayStart)return;
  try{Intent intent=new Intent(c,ReminderService.class);if(Build.VERSION.SDK_INT>=26)c.startForegroundService(intent);else c.startService(intent);}
  catch(RuntimeException e){ReminderScheduler.prefs(c).edit().putString("serviceError","系统未允许启动，请回到软件重新开启常驻提醒").apply();}
 }
 private Notification notification(){
  if(Build.VERSION.SDK_INT>=26){NotificationChannel channel=new NotificationChannel(CHANNEL,"提醒常驻服务",NotificationManager.IMPORTANCE_LOW);channel.setDescription("显示离线提醒服务的运行状态，不播放提示音");getSystemService(NotificationManager.class).createNotificationChannel(channel);}
  PendingIntent open=PendingIntent.getActivity(this,ID,new Intent(this,MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  return new NotificationCompat.Builder(this,CHANNEL).setSmallIcon(R.drawable.rater_notification).setContentTitle("提醒服务正在运行").setContentText("每日10:00登记 · 11:00补充提醒；点击打开软件管理")
   .setContentIntent(open).setOngoing(true).setOnlyAlertOnce(true).setShowWhen(false).setVisibility(NotificationCompat.VISIBILITY_PRIVATE).setCategory(NotificationCompat.CATEGORY_SERVICE).setPriority(NotificationCompat.PRIORITY_LOW).setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE).build();
 }
 @Override public void onCreate(){
  super.onCreate();
  try{ServiceCompat.startForeground(this,ID,notification(),Build.VERSION.SDK_INT>=34?ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE:0);running=true;ReminderScheduler.prefs(this).edit().remove("serviceError").apply();}
  catch(RuntimeException e){running=false;ReminderScheduler.prefs(this).edit().putString("serviceError","常驻通知启动失败，请检查系统通知及后台权限").apply();stopSelf();}
 }
 private final Runnable tick=new Runnable(){@Override public void run(){
  if(!requested(ReminderService.this)||!ReminderScheduler.allowed(ReminderService.this)){stopSelf();return;}
  ReminderScheduler.prefs(ReminderService.this).edit().putLong("serviceHeartbeat",System.currentTimeMillis()).apply();
  ReminderScheduler.checkCurrentSlot(ReminderService.this);
  handler.postDelayed(this,30000);
 }};
 @Override public int onStartCommand(Intent intent,int flags,int startId){
  if(!running||!requested(this)||!ReminderScheduler.allowed(this)){stopSelf();return START_NOT_STICKY;}
  ReminderScheduler.schedule(this);handler.removeCallbacks(tick);handler.post(tick);return START_STICKY;
 }
 @Override public void onTaskRemoved(Intent rootIntent){ReminderScheduler.schedule(this);super.onTaskRemoved(rootIntent);}
 @Override public void onDestroy(){handler.removeCallbacks(tick);running=false;stopForeground(STOP_FOREGROUND_REMOVE);super.onDestroy();}
 @Override public IBinder onBind(Intent intent){return null;}
}
