package com.v10companion;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import java.util.Calendar;
public final class Schedule {
    private static final int[][] WINDOWS={{7,10},{8,30},{19,30},{21,30}};
    private Schedule(){}
    public static boolean isOnNow(){
        Calendar c=Calendar.getInstance();int d=c.get(Calendar.DAY_OF_WEEK),m=c.get(Calendar.HOUR_OF_DAY)*60+c.get(Calendar.MINUTE);
        return d!=Calendar.SATURDAY && d!=Calendar.SUNDAY && ((m>=430 && m<510)||(m>=1170 && m<1290));
    }
    public static void reschedule(Context ctx){
        AlarmManager am=(AlarmManager)ctx.getSystemService(Context.ALARM_SERVICE);
        boolean enabled=ctx.getSharedPreferences("companion",0).getBoolean("schedule",false);
        for(int i=0;i<4;i++){
            Intent in=new Intent(ctx,AlarmReceiver.class).setAction("com.v10companion.ALARM_"+i);
            PendingIntent pi=PendingIntent.getBroadcast(ctx,100+i,in,PendingIntent.FLAG_UPDATE_CURRENT);
            am.cancel(pi);
            if(!enabled)continue;
            Calendar next=Calendar.getInstance();next.set(Calendar.HOUR_OF_DAY,WINDOWS[i][0]);next.set(Calendar.MINUTE,WINDOWS[i][1]);next.set(Calendar.SECOND,0);next.set(Calendar.MILLISECOND,0);
            if(next.getTimeInMillis()<=System.currentTimeMillis())next.add(Calendar.DATE,1);
            while(next.get(Calendar.DAY_OF_WEEK)==Calendar.SATURDAY||next.get(Calendar.DAY_OF_WEEK)==Calendar.SUNDAY)next.add(Calendar.DATE,1);
            if(Build.VERSION.SDK_INT>=23)am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,next.getTimeInMillis(),pi);
            else am.setExact(AlarmManager.RTC_WAKEUP,next.getTimeInMillis(),pi);
        }
    }
}
