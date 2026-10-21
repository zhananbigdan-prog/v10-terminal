package com.v10companion;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
public final class BootReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction()) &&
            context.getSharedPreferences("companion",0).getBoolean("schedule",false)) {
            Schedule.reschedule(context);
            if(Schedule.isOnNow()){
                Intent launch=new Intent(context,MainActivity.class).setAction(MainActivity.ACTION_WAKE)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                try{context.startActivity(launch);}catch(Exception ignored){}
            }
        }
    }
}
