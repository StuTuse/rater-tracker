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
  bridge.getWebView().setVerticalScrollBarEnabled(false);
  bridge.getWebView().setHorizontalScrollBarEnabled(false);
  ViewCompat.setOnApplyWindowInsetsListener(getWindow().getDecorView(),(v,insets)->{
   androidx.core.graphics.Insets bars=insets.getInsets(WindowInsetsCompat.Type.systemBars());
   RaterPlatformPlugin p=(RaterPlatformPlugin)bridge.getPlugin("RaterPlatform").getInstance();p.insets(bars.top,bars.bottom);return insets;
  });
  getOnBackPressedDispatcher().addCallback(this,new OnBackPressedCallback(true){
   @Override public void handleOnBackPressed(){ RaterPlatformPlugin p=(RaterPlatformPlugin)bridge.getPlugin("RaterPlatform").getInstance();p.back(); }
  });
 }
 @Override public void onPause(){super.onPause();if(bridge!=null && bridge.getPlugin("RaterPlatform")!=null)((RaterPlatformPlugin)bridge.getPlugin("RaterPlatform").getInstance()).inactive();}
 @Override public void onResume(){super.onResume();if(bridge!=null && bridge.getPlugin("RaterPlatform")!=null)((RaterPlatformPlugin)bridge.getPlugin("RaterPlatform").getInstance()).active();}
}
