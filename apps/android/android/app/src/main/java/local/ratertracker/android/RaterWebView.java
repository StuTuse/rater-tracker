package local.ratertracker.android;

import android.content.Context;
import android.util.AttributeSet;
import android.view.KeyEvent;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputConnection;
import com.getcapacitor.CapacitorWebView;

/** Keep the real WebView IME connection, selection, composition and input events. */
public class RaterWebView extends CapacitorWebView {
 public RaterWebView(Context context, AttributeSet attrs){super(context,attrs);}
 @Override @SuppressWarnings("deprecation") public boolean dispatchKeyEvent(KeyEvent event){
  if(event.getAction()==KeyEvent.ACTION_MULTIPLE){
   String text=event.getCharacters();
   if(text==null || text.isEmpty())return false;
   InputConnection connection=onCreateInputConnection(new EditorInfo());
   return connection!=null && connection.commitText(text,1);
  }
  return super.dispatchKeyEvent(event);
 }
}
