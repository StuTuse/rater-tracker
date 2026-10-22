package local.ratertracker.android;

import android.app.*;
import android.content.*;
import android.os.Build;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.json.*;
import org.junit.*;
import org.junit.runner.RunWith;
import java.util.*;
import static org.junit.Assert.*;

/** Runs against the isolated debug package. No real account or business state. */
@RunWith(AndroidJUnit4.class)
public class ReminderIntegrationTest {
 Context context;NotificationManager manager;Map<String,?> prior;
 static long time(String iso){try{return new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX",Locale.ROOT).parse(iso).getTime();}catch(Exception e){throw new RuntimeException(e);}}
 void shell(String command)throws Exception{try(android.os.ParcelFileDescriptor fd=InstrumentationRegistry.getInstrumentation().getUiAutomation().executeShellCommand(command);java.io.InputStream in=new android.os.ParcelFileDescriptor.AutoCloseInputStream(fd)){while(in.read()!=-1){}}}
 JSONObject config(boolean updated)throws Exception{
  JSONArray copies=new JSONArray();for(int i=0;i<50;i++)copies.put(new JSONObject().put("id","test-"+i).put("title","隔离提醒 "+i).put("body","仅用于本机通知验收 "+i));
  return new JSONObject().put("scope","guest").put("date","2026-10-19").put("updated",updated).put("revision",1).put("copies",copies).put("options",new JSONObject().put("enabled",true).put("persistent",false).put("daily",true).put("followup",true).put("weekly",true));
 }
 @Before public void before()throws Exception{
  context=InstrumentationRegistry.getInstrumentation().getTargetContext();manager=context.getSystemService(NotificationManager.class);prior=new HashMap<>(ReminderScheduler.prefs(context).getAll());context.stopService(new Intent(context,ReminderService.class));for(int i=0;i<30&&ReminderService.running;i++)Thread.sleep(100);ReminderScheduler.prefs(context).edit().clear().commit();
  if(Build.VERSION.SDK_INT>=33)shell("pm grant "+context.getPackageName()+" android.permission.POST_NOTIFICATIONS");
  ReminderScheduler.channel(context);manager.cancelAll();ReminderScheduler.sync(context,config(false));
 }
 @After public void after()throws Exception{
  context.stopService(new Intent(context,ReminderService.class));for(int i=0;i<30&&ReminderService.running;i++)Thread.sleep(100);manager.cancelAll();SharedPreferences.Editor edit=ReminderScheduler.prefs(context).edit().clear();
  for(Map.Entry<String,?> entry:prior.entrySet()){Object v=entry.getValue();String k=entry.getKey();if(v instanceof String)edit.putString(k,(String)v);else if(v instanceof Integer)edit.putInt(k,(Integer)v);else if(v instanceof Boolean)edit.putBoolean(k,(Boolean)v);else if(v instanceof Long)edit.putLong(k,(Long)v);else if(v instanceof Set)edit.putStringSet(k,(Set<String>)v);}edit.commit();ReminderScheduler.schedule(context);
 }
 void delivered()throws Exception{for(int i=0;i<20&&manager.getActiveNotifications().length==0;i++)Thread.sleep(100);assertEquals(1,manager.getActiveNotifications().length);}
 @Test public void mondayCombinesAndDeduplicates()throws Exception{
  ReminderScheduler.deliverAt(context,10,time("2026-10-19T10:00:00+08:00"));delivered();
  android.app.Notification n=manager.getActiveNotifications()[0].getNotification();assertEquals("上周回顾已开启",n.extras.getString(android.app.Notification.EXTRA_TITLE));assertNotNull(n.contentIntent);assertEquals(context.getPackageName(),n.contentIntent.getCreatorPackage());
  String bag=ReminderScheduler.prefs(context).getString("bag","");ReminderScheduler.deliverAt(context,10,time("2026-10-19T10:01:00+08:00"));assertEquals(bag,ReminderScheduler.prefs(context).getString("bag",""));assertEquals(1,manager.getActiveNotifications().length);
 }
 @Test public void elevenChecksLatestSuccessfulUpdate()throws Exception{
  ReminderScheduler.sync(context,config(true));ReminderScheduler.deliverAt(context,11,time("2026-10-19T11:00:00+08:00"));assertEquals(0,manager.getActiveNotifications().length);assertFalse(ReminderScheduler.prefs(context).contains("last"));
  JSONObject fresh=config(false).put("revision",2);ReminderScheduler.sync(context,fresh);ReminderScheduler.deliverAt(context,11,time("2026-10-19T11:00:00+08:00"));delivered();
 }
 @Test public void morningStillRemindsAfterAnUpdate()throws Exception{
  ReminderScheduler.sync(context,config(true));ReminderScheduler.deliverAt(context,10,time("2026-10-20T10:00:00+08:00"));delivered();assertTrue(manager.getActiveNotifications()[0].getNotification().extras.getString(android.app.Notification.EXTRA_TITLE).startsWith("隔离提醒"));
 }
 @Test public void staleOrCorruptMirrorDoesNotInventMissingData()throws Exception{
  ReminderScheduler.prefs(context).edit().putString("mirror","broken").commit();ReminderScheduler.deliverAt(context,11,time("2026-10-19T11:00:00+08:00"));assertEquals(0,manager.getActiveNotifications().length);assertFalse(ReminderScheduler.prefs(context).contains("last"));
 }
 @Test public void closedAndLateSlotsNeverConsumeCopy()throws Exception{
  ReminderScheduler.deliverAt(context,10,time("2026-10-19T11:00:00+08:00"));assertEquals(0,manager.getActiveNotifications().length);assertFalse(ReminderScheduler.prefs(context).contains("last"));
  JSONObject off=config(false);off.getJSONObject("options").put("enabled",false);ReminderScheduler.sync(context,off);ReminderScheduler.deliverAt(context,10,time("2026-10-19T10:00:00+08:00"));assertEquals(0,manager.getActiveNotifications().length);
 }
 @Test public void delayedWithinSlotStillDeliversAfterDoze()throws Exception{
  ReminderScheduler.deliverAt(context,10,time("2026-10-19T10:45:00+08:00"));delivered();
  ReminderScheduler.deliverAt(context,10,time("2026-10-19T10:46:00+08:00"));assertEquals(1,manager.getActiveNotifications().length);
 }
 @Test public void enabledAlarmsArePersistedAndDisabledAlarmsAreCancelled()throws Exception{
  JSONObject status=ReminderScheduler.status(context);assertTrue(status.getLong("next10")>System.currentTimeMillis());assertTrue(status.getLong("next11")>System.currentTimeMillis());
  JSONObject off=config(false);off.getJSONObject("options").put("enabled",false);ReminderScheduler.sync(context,off);assertEquals(0,ReminderScheduler.status(context).getLong("next10"));
 }
 @Test public void systemBarsAreOnlyCountedWhereTheyOverlapWebView(){
  assertEquals(24,RaterPlatformPlugin.overlap(24,0));assertEquals(0,RaterPlatformPlugin.overlap(24,24));assertEquals(0,RaterPlatformPlugin.overlap(24,40));assertEquals(12,RaterPlatformPlugin.overlap(24,12));
 }
 @Test public void staleRevisionCannotOverwriteNewerMirror()throws Exception{
  ReminderScheduler.sync(context,config(true).put("revision",10));ReminderScheduler.sync(context,config(false).put("revision",9));assertTrue(new JSONObject(ReminderScheduler.prefs(context).getString("mirror","{}")).getBoolean("updated"));
 }
 @Test public void rotationDoesNotRepeatAcrossDailySlots()throws Exception{
  ReminderScheduler.deliverAt(context,10,time("2026-10-20T10:00:00+08:00"));delivered();int first=ReminderScheduler.prefs(context).getInt("last",-1);manager.cancelAll();ReminderScheduler.deliverAt(context,11,time("2026-10-20T11:00:00+08:00"));delivered();assertNotEquals(first,ReminderScheduler.prefs(context).getInt("last",-1));
 }
 @Test public void deniedPermissionLeavesReceiptAndRotationUntouched()throws Exception{
  if(Build.VERSION.SDK_INT<33)return;
  Context denied=new ContextWrapper(context){@Override public int checkSelfPermission(String permission){return permission.equals(android.Manifest.permission.POST_NOTIFICATIONS)?android.content.pm.PackageManager.PERMISSION_DENIED:super.checkSelfPermission(permission);}};
  ReminderScheduler.deliverAt(denied,10,time("2026-10-19T10:00:00+08:00"));assertEquals(0,manager.getActiveNotifications().length);assertFalse(ReminderScheduler.prefs(context).contains("last"));
 }
 @Test public void realForegroundServiceHasOngoingSystemNotificationAndStopsWhenDisabled()throws Exception{
  JSONObject on=config(false);on.getJSONObject("options").put("persistent",true);ReminderScheduler.sync(context,on);
  InstrumentationRegistry.getInstrumentation().runOnMainSync(()->ReminderService.reconcile(context,true));
  for(int i=0;i<50&&!ReminderService.running;i++)Thread.sleep(100);assertTrue(ReminderService.running);
  Notification card=null;for(android.service.notification.StatusBarNotification entry:manager.getActiveNotifications())if(entry.getId()==ReminderService.ID)card=entry.getNotification();
  assertNotNull(card);assertTrue((card.flags&Notification.FLAG_FOREGROUND_SERVICE)!=0);assertTrue((card.flags&Notification.FLAG_ONGOING_EVENT)!=0);
  assertTrue(ReminderScheduler.status(context).getBoolean("serviceRunning"));assertTrue(ReminderScheduler.prefs(context).getLong("serviceHeartbeat",0)>0);
  on.getJSONObject("options").put("persistent",false);ReminderScheduler.sync(context,on);ReminderService.reconcile(context,true);
  for(int i=0;i<30&&ReminderService.running;i++)Thread.sleep(100);assertFalse(ReminderService.running);
  for(android.service.notification.StatusBarNotification entry:manager.getActiveNotifications())assertNotEquals(ReminderService.ID,entry.getId());
 }
 @Test public void testNotificationUsesSystemChannelWithoutConsumingDailyReceipt()throws Exception{
  Set<String> sent=new HashSet<>(ReminderScheduler.prefs(context).getStringSet("sent",Collections.emptySet()));String bag=ReminderScheduler.prefs(context).getString("bag","");
  assertTrue(ReminderScheduler.test(context,0).getBoolean("posted"));delivered();
  assertEquals("提醒通道测试",manager.getActiveNotifications()[0].getNotification().extras.getString(Notification.EXTRA_TITLE));
  assertEquals(sent,ReminderScheduler.prefs(context).getStringSet("sent",Collections.emptySet()));assertEquals(bag,ReminderScheduler.prefs(context).getString("bag",""));assertEquals("test_posted",ReminderScheduler.status(context).getString("lastStage"));
 }
 @Test public void backgroundTestPersistsAnActualAlarm()throws Exception{
  long before=System.currentTimeMillis();JSONObject scheduled=ReminderScheduler.test(context,60);assertFalse(scheduled.getBoolean("posted"));assertTrue(scheduled.getLong("scheduledAt")>=before+60000);assertEquals(scheduled.getLong("scheduledAt"),ReminderScheduler.status(context).getLong("testScheduledAt"));
  PendingIntent pi=PendingIntent.getBroadcast(context,6202,new Intent(context,ReminderTestReceiver.class),PendingIntent.FLAG_NO_CREATE|PendingIntent.FLAG_IMMUTABLE);assertNotNull(pi);context.getSystemService(AlarmManager.class).cancel(pi);
 }
}
