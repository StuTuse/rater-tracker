package local.ratertracker.android;

import android.content.Intent;
import android.view.KeyEvent;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import java.util.concurrent.*;
import static org.junit.Assert.*;

/** Only the named isolated AVD/debug guest is used by the runner. */
public class KeyboardIntegrationTest {
 String js(MainActivity activity,String source)throws Exception{
  CountDownLatch done=new CountDownLatch(1);String[] result={null};
  activity.runOnUiThread(()->activity.getBridge().getWebView().evaluateJavascript(source,v->{result[0]=v;done.countDown();}));
  if(!done.await(5,TimeUnit.SECONDS)){
   // Navigation can discard callbacks. Only this read-only readiness probe is
   // retried; mutation callbacks still fail the test rather than replay input.
   if(source.startsWith("Boolean(window.raterReady"))return "null";
   fail("WebView callback timed out: "+source);
  }
  return result[0];
 }
 @Test public void nativeChineseMultipleEventUsesSelectionAndAutosaves()throws Exception{
  android.app.Instrumentation ins=InstrumentationRegistry.getInstrumentation();
  try(java.io.InputStream wake=new android.os.ParcelFileDescriptor.AutoCloseInputStream(ins.getUiAutomation().executeShellCommand("input keyevent 224"))){wake.readAllBytes();}
  try(java.io.InputStream unlock=new android.os.ParcelFileDescriptor.AutoCloseInputStream(ins.getUiAutomation().executeShellCommand("wm dismiss-keyguard"))){unlock.readAllBytes();}
  MainActivity activity=(MainActivity)ins.startActivitySync(new Intent(ins.getTargetContext(),MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
  try{
   ins.runOnMainSync(()->activity.getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON));
   // evaluateJavascript callbacks issued during WebView's initial navigation
   // can be discarded by Android before the document exists.
   Thread.sleep(1800);ins.waitForIdleSync();
   for(int i=0;i<60;i++){if("true".equals(js(activity,"Boolean(window.raterReady && document.querySelector('[data-action=write-record]') && !document.querySelector('#startup'))")))break;Thread.sleep(150);}
   assertEquals("false",js(activity,"Boolean(JSON.parse(localStorage.getItem('rater-active-account')||'null')?.id)"));
   assertTrue(activity.getBridge().getWebView() instanceof RaterWebView);
   assertFalse(activity.getBridge().getConfig().isInputCaptured());
   js(activity,"document.querySelector('#modal[open] [data-action=close-modal]')?.click();true");Thread.sleep(450);
   js(activity,"document.querySelector('[data-action=write-record][data-dimension=study]').click();window.imeTarget=document.querySelector('textarea[data-dimension=study]');window.imeEvents=[];for(const t of ['input','compositionstart','compositionend'])imeTarget.addEventListener(t,e=>imeEvents.push([t,e.isComposing,imeTarget.value]));imeTarget.value='ab';imeTarget.focus();imeTarget.setSelectionRange(1,2);true");
   ins.runOnMainSync(()->activity.getBridge().getWebView().requestFocus());Thread.sleep(400);
   ins.runOnMainSync(()->assertTrue(activity.getBridge().getWebView().dispatchKeyEvent(new KeyEvent(android.os.SystemClock.uptimeMillis(),"中文'\n尾",0,0))));
   for(int i=0;i<50;i++){if(js(activity,"imeTarget.value").contains("中文"))break;Thread.sleep(100);}
   assertEquals("\"a中文'\\n尾\"",js(activity,"imeTarget.value"));
   js(activity,"window.imeSaved=null;import(location.origin+'/packages/data/storage.js').then(async({openStore})=>{for(let i=0;i<60;i++){const s=await openStore(),v=await s.read();s.close();const d=imeTarget.dataset.date;window.imeSaved=v.ratings[d]?.study?.note??v.ratingNotes?.[d]?.study?.note;if(imeSaved===imeTarget.value)break;await new Promise(r=>setTimeout(r,100));}}).catch(e=>window.imeError=String(e));true");
   for(int i=0;i<60;i++){if("\"a中文'\\n尾\"".equals(js(activity,"window.imeSaved")))break;Thread.sleep(100);}
   assertEquals(js(activity,"JSON.stringify({error:window.imeError,events:imeEvents,status:document.querySelector('#save-status').textContent,draft:localStorage.getItem('rater-record-drafts:guest')})"),"\"a中文'\\n尾\"",js(activity,"window.imeSaved"));
  }finally{ins.runOnMainSync(activity::finish);}
 }
}
