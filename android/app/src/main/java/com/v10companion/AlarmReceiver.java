package com.v10companion;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
public final class AlarmReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        if (!context.getSharedPreferences("companion",0).getBoolean("schedule",false)) return;
        Schedule.reschedule(context);
        boolean on=Schedule.isOnNow();
        if (on) {
            Intent launch=new Intent(context,MainActivity.class).setAction(MainActivity.ACTION_WAKE)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            try{context.startActivity(launch);}catch(Exception ignored){}
        } else MainActivity.requestSleep(context);
    }
}
