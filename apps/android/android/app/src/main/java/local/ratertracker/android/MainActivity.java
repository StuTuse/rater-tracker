package local.ratertracker.android;
import android.os.Bundle;
import androidx.activity.OnBackPressedCallback;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;
public class MainActivity extends BridgeActivity {
 @Override public void onCreate(Bundle savedInstanceState){
  registerPlugin(RaterPlatformPlugin.class);
  super.onCreate(savedInstanceState);
  bridge.getWebView().setOverScrollMode(android.view.View.OVER_SCROLL_NEVER);
  bridge.getWebView().setVerticalScrollBarEnabled(false);
  bridge.getWebView().setHorizontalScrollBarEnabled(false);
  ViewCompat.setOnApplyWindowInsetsListener(getWindow().getDecorView(),(v,insets)->{
   bridge.getWebView().post(()->publishInsets());return insets;
  });
  bridge.getWebView().addOnLayoutChangeListener((v,l,t,r,b,ol,ot,or,ob)->publishInsets());
  getOnBackPressedDispatcher().addCallback(this,new OnBackPressedCallback(true){
   @Override public void handleOnBackPressed(){ RaterPlatformPlugin p=(RaterPlatformPlugin)bridge.getPlugin("RaterPlatform").getInstance();p.back(); }
  });
 }
 private void publishInsets(){if(bridge!=null && bridge.getPlugin("RaterPlatform")!=null)((RaterPlatformPlugin)bridge.getPlugin("RaterPlatform").getInstance()).insets();}
 @Override protected void onNewIntent(android.content.Intent intent){super.onNewIntent(intent);setIntent(intent);if(bridge!=null && bridge.getPlugin("RaterPlatform")!=null)((RaterPlatformPlugin)bridge.getPlugin("RaterPlatform").getInstance()).active();}
 @Override public void onPause(){super.onPause();if(bridge!=null && bridge.getPlugin("RaterPlatform")!=null)((RaterPlatformPlugin)bridge.getPlugin("RaterPlatform").getInstance()).inactive();}
 @Override public void onResume(){super.onResume();ReminderScheduler.schedule(this);if(bridge!=null && bridge.getPlugin("RaterPlatform")!=null){((RaterPlatformPlugin)bridge.getPlugin("RaterPlatform").getInstance()).active();bridge.getWebView().post(()->ReminderService.reconcile(this,true));}}
}
