package local.ratertracker.android;
import android.content.*;
public class ReminderReceiver extends BroadcastReceiver {
 @Override public void onReceive(Context context,Intent intent){
  int hour=intent.getIntExtra("hour",0);
  if(hour==10||hour==11)ReminderScheduler.deliver(context,hour);else ReminderScheduler.schedule(context);
 }
}
