package local.ratertracker.android;
import android.app.Activity;
import android.Manifest;
import android.content.pm.PackageManager;
import android.content.Intent;
import android.os.Build;
import android.net.Uri;
import android.provider.Settings;
import android.net.Uri;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.AtomicFile;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import androidx.core.content.ContextCompat;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import java.io.*;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.nio.charset.CodingErrorAction;
import java.security.KeyStore;
import org.json.JSONArray;
import javax.crypto.*;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name="RaterPlatform", permissions={@Permission(alias="notifications", strings={Manifest.permission.POST_NOTIFICATIONS})})
public class RaterPlatformPlugin extends Plugin {
 private boolean foreground=true;
 private static final int LIMIT=64*1024*1024;
 private static final String KEY="rater-session-v1";
 @PluginMethod public void info(PluginCall call){getActivity().runOnUiThread(()->{try{
  JSObject r=new JSObject();r.put("version",BuildConfig.VERSION_NAME);r.put("dataDirectory",getContext().getApplicationInfo().dataDir);r.put("packaged",true);r.put("platform","android");r.put("active",foreground);androidx.core.view.WindowInsetsCompat wi=androidx.core.view.ViewCompat.getRootWindowInsets(getActivity().getWindow().getDecorView());if(wi!=null){androidx.core.graphics.Insets b=wi.getInsets(androidx.core.view.WindowInsetsCompat.Type.systemBars());float d=getContext().getResources().getDisplayMetrics().density;r.put("safeTop",b.top/d);r.put("safeBottom",b.bottom/d);}call.resolve(r);}catch(Exception e){call.reject("无法读取应用信息，请重试");}});
 }
 @PluginMethod public void exportBackup(PluginCall call){
  String text=call.getString("contents"),name=call.getString("name","Rater-Tracker-backup.json");
  if(text==null||text.getBytes(StandardCharsets.UTF_8).length>LIMIT){call.reject("备份超出64 MiB限制");return;}
  Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType("application/json");intent.putExtra(Intent.EXTRA_TITLE,name);
  startActivityForResult(call,intent,"exportResult");
 }
 @ActivityCallback private void exportResult(PluginCall call,ActivityResult result){
  if(call==null)return;
  JSObject r=new JSObject();
  if(result.getResultCode()!=Activity.RESULT_OK||result.getData()==null||result.getData().getData()==null){r.put("success",false);r.put("cancelled",true);call.resolve(r);return;}
  execute(()->{try(OutputStream out=getContext().getContentResolver().openOutputStream(result.getData().getData(),"wt")){
   if(out==null)throw new IOException("无法打开文件");out.write(call.getString("contents").getBytes(StandardCharsets.UTF_8));out.flush();r.put("success",true);call.resolve(r);
  }catch(Exception e){call.reject("备份写入失败，请保留本机记录后重试");}});
 }
 @PluginMethod public void importBackup(PluginCall call){
  Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType("*/*");intent.putExtra(Intent.EXTRA_MIME_TYPES,new String[]{"application/json","text/plain","application/octet-stream"});startActivityForResult(call,intent,"importResult");
 }
 @ActivityCallback private void importResult(PluginCall call,ActivityResult result){
  if(call==null)return;JSObject r=new JSObject();
  if(result.getResultCode()!=Activity.RESULT_OK||result.getData()==null||result.getData().getData()==null){r.put("cancelled",true);call.resolve(r);return;}
  execute(()->{try(InputStream in=getContext().getContentResolver().openInputStream(result.getData().getData());ByteArrayOutputStream out=new ByteArrayOutputStream()){
   if(in==null)throw new IOException();byte[] buf=new byte[8192];int n;while((n=in.read(buf))!=-1){if(out.size()+n>LIMIT)throw new IOException();out.write(buf,0,n);}r.put("contents",StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT).onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(out.toByteArray())).toString());call.resolve(r);
  }catch(Exception e){call.reject("备份读取失败、编码无效或超过64 MiB，原记录保持不变");}});
 }
 private AtomicFile file(){return new AtomicFile(new File(getContext().getFilesDir(),"account-session.sec"));}
 private SecretKey key() throws Exception {
  KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);
  if(!store.containsAlias(KEY)){KeyGenerator gen=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");gen.init(new KeyGenParameterSpec.Builder(KEY,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());gen.generateKey();}
  return ((KeyStore.SecretKeyEntry)store.getEntry(KEY,null)).getSecretKey();
 }
 @PluginMethod public void sessionWrite(PluginCall call){
  String text=call.getString("contents");if(text==null||text.length()>65536){call.reject("会话格式无效");return;}
  FileOutputStream out=null;
  try{Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.ENCRYPT_MODE,key());byte[] iv=c.getIV(),data=c.doFinal(text.getBytes(StandardCharsets.UTF_8));out=file().startWrite();out.write(ByteBuffer.allocate(4+iv.length+data.length).putInt(iv.length).put(iv).put(data).array());file().finishWrite(out);call.resolve();}
  catch(Exception e){if(out!=null)file().failWrite(out);call.reject("凭证加密保存失败，请保持当前会话或重新登录");}
 }
 @PluginMethod public void sessionRead(PluginCall call){
  JSObject r=new JSObject();
  try{ByteBuffer b=ByteBuffer.wrap(file().readFully());int n=b.getInt();if(n!=12||b.remaining()<n+16)throw new IOException();byte[] iv=new byte[n];b.get(iv);byte[] data=new byte[b.remaining()];b.get(data);Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,iv));r.put("contents",new String(c.doFinal(data),StandardCharsets.UTF_8));}
  catch(Exception e){r.put("contents",JSObject.NULL);}
  call.resolve(r);
 }
 @PluginMethod public void sessionClear(PluginCall call){file().delete();call.resolve();}
 @PluginMethod public void configureReminders(PluginCall call){
  try{
   android.content.SharedPreferences p=getContext().getSharedPreferences(ReminderReceiver.PREFS,Activity.MODE_PRIVATE);
   boolean enabled=call.getBoolean("enabled",false);JSArray copies=call.getArray("copies",new JSArray());
   p.edit().putBoolean("enabled",enabled).putBoolean("daily",call.getBoolean("daily",true)).putBoolean("followup",call.getBoolean("followup",true)).putBoolean("weekly",call.getBoolean("weekly",true)).putString("copies",copies.toString()).putString("todayUpdate",call.getString("todayUpdate","")).apply();
   if(!enabled){ReminderReceiver.cancel(getContext());JSObject result=new JSObject();result.put("granted",true);call.resolve(result);return;}
   if(Build.VERSION.SDK_INT>=33&&ContextCompat.checkSelfPermission(getContext(),Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED){requestPermissionForAlias("notifications",call,"notificationPermissionResult");return;}
   boolean exact=scheduleReminders(true);JSObject result=new JSObject();result.put("granted",true);result.put("exactAlarm",exact);call.resolve(result);
  }catch(Exception e){call.reject("提醒设置没有保存，请重试");}
 }
 @PermissionCallback private void notificationPermissionResult(PluginCall call){if(call==null)return;boolean granted=Build.VERSION.SDK_INT<33||ContextCompat.checkSelfPermission(getContext(),Manifest.permission.POST_NOTIFICATIONS)==PackageManager.PERMISSION_GRANTED;boolean exact=granted&&scheduleReminders(true);try{JSObject result=new JSObject();result.put("granted",granted);result.put("exactAlarm",exact);call.resolve(result);}catch(Exception e){call.reject("无法读取通知权限状态");}}
 private boolean scheduleReminders(boolean askOnce){boolean exact=ReminderReceiver.schedule(getContext());if(Build.VERSION.SDK_INT>=31&&!exact&&askOnce){android.content.SharedPreferences p=getContext().getSharedPreferences(ReminderReceiver.PREFS,Activity.MODE_PRIVATE);if(!p.getBoolean("askedExact",false)){p.edit().putBoolean("askedExact",true).apply();try{getActivity().startActivity(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,Uri.parse("package:"+getContext().getPackageName())));}catch(Exception ignored){}}}return exact;}
 @PluginMethod public void reminderActivity(PluginCall call){String date=call.getString("date","");if(date.matches("\\d{4}-\\d{2}-\\d{2}"))getContext().getSharedPreferences(ReminderReceiver.PREFS,Activity.MODE_PRIVATE).edit().putString("todayUpdate",date).apply();call.resolve();}
 @PluginMethod public void pendingRoute(PluginCall call){android.content.SharedPreferences p=getContext().getSharedPreferences(ReminderReceiver.PREFS,Activity.MODE_PRIVATE);String route=p.getString("pendingRoute","");JSObject result=new JSObject();result.put("route",route);result.put("weeklyStart",p.getString("pendingWeek",""));p.edit().remove("pendingRoute").remove("pendingWeek").apply();call.resolve(result);}
 @PluginMethod public void openExternal(PluginCall call){try{Uri uri=Uri.parse(call.getString("url",""));if(!"https".equals(uri.getScheme())||!"github.com".equals(uri.getHost())||uri.getPath()==null||!uri.getPath().startsWith("/StuTuse/rater-tracker/releases"))throw new IllegalArgumentException();Intent intent=new Intent(Intent.ACTION_VIEW,uri);intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);getContext().startActivity(intent);call.resolve();}catch(Exception e){call.reject("无法打开项目官方发布页");}}
 @PluginMethod public void quit(PluginCall call){getActivity().runOnUiThread(()->getActivity().moveTaskToBack(true));call.resolve();}
 public void insets(int top,int bottom){float d=getContext().getResources().getDisplayMetrics().density;JSObject r=new JSObject();r.put("safeTop",top/d);r.put("safeBottom",bottom/d);notifyListeners("insets",r,true);}
 public void back(){notifyListeners("back",new JSObject());}
 public void inactive(){foreground=false;notifyListeners("inactive",new JSObject(),true);}
 public void active(){foreground=true;notifyListeners("active",new JSObject());}
 public void notificationOpened(){android.content.SharedPreferences p=getContext().getSharedPreferences(ReminderReceiver.PREFS,Activity.MODE_PRIVATE);JSObject r=new JSObject();r.put("route",p.getString("pendingRoute",""));r.put("weeklyStart",p.getString("pendingWeek",""));notifyListeners("notification",r,true);}
}
