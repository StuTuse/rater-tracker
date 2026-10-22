package local.ratertracker.android;
import android.content.*;
public final class ReminderTestReceiver extends BroadcastReceiver {
 @Override public void onReceive(Context context,Intent intent){ReminderScheduler.testNotify(context);}
}
