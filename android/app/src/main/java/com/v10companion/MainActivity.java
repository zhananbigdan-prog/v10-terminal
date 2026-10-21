package com.v10companion;

import android.Manifest;
import android.app.Activity;
import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;

public final class MainActivity extends Activity {
    public static final String ACTION_WAKE="com.v10companion.WAKE";
    private static final String DEFAULT_URL="https://computer-farming-athletes-picked.trycloudflare.com/";
    private static final int MIC_REQUEST=21, ADMIN_REQUEST=22;
    private static MainActivity active;
    private WebView web;
    private PermissionRequest pendingPermission;
    private String trustedHost;
    private boolean viewingPage=false;

    public static boolean canSleep(Context ctx){
        DevicePolicyManager d=(DevicePolicyManager)ctx.getSystemService(Context.DEVICE_POLICY_SERVICE);
        return d!=null&&d.isAdminActive(new ComponentName(ctx,AdminReceiver.class));
    }
    public static boolean requestSleep(Context ctx){
        DevicePolicyManager d=(DevicePolicyManager)ctx.getSystemService(Context.DEVICE_POLICY_SERVICE);
        if(d==null||!canSleep(ctx))return false;
        try{if(active!=null)active.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);d.lockNow();return true;}catch(SecurityException e){return false;}
    }
    private static boolean validUrl(String value){
        try{Uri u=Uri.parse(value);return "https".equalsIgnoreCase(u.getScheme())&&u.getHost()!=null&&u.getHost().length()>3&&u.getUserInfo()==null;}
        catch(Exception e){return false;}
    }
    private String homeUrl(){return getSharedPreferences("companion",0).getString("url",DEFAULT_URL);}
    @Override public void onCreate(Bundle state){super.onCreate(state);getWindow().setStatusBarColor(Color.WHITE);getWindow().setNavigationBarColor(Color.WHITE);
        Schedule.reschedule(this);
        if(ACTION_WAKE.equals(getIntent().getAction()))openPage(true);else showSetup();
    }
    @Override protected void onNewIntent(Intent intent){super.onNewIntent(intent);setIntent(intent);if(ACTION_WAKE.equals(intent.getAction()))openPage(true);}
    @Override protected void onResume(){super.onResume();active=this;if(getSharedPreferences("companion",0).getBoolean("schedule",false)&&Schedule.isOnNow())getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);}
    @Override protected void onPause(){if(active==this)active=null;super.onPause();}
    @Override public void onBackPressed(){if(viewingPage){viewingPage=false;if(web!=null){web.destroy();web=null;}showSetup();}else super.onBackPressed();}
    private void showSetup(){
        viewingPage=false;getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        LinearLayout box=new LinearLayout(this);box.setOrientation(LinearLayout.VERTICAL);box.setPadding(28,24,28,24);box.setBackgroundColor(Color.WHITE);
        TextView title=new TextView(this);title.setText("天猫精灵 · V10 系统控制");title.setTextSize(25);title.setTextColor(Color.rgb(39,72,112));box.addView(title);
        TextView help=new TextView(this);help.setText("这是可安装的原生外壳。开启锁屏权限后，能在设定时段关闭屏幕，并在工作日定时尝试亮屏。系统是否允许唤醒、原生屏保是否仍覆盖，必须在这台 V10 实测。");help.setTextSize(15);help.setPadding(0,18,0,18);box.addView(help);
        EditText url=new EditText(this);url.setSingleLine();url.setText(homeUrl());url.setHint("HTTPS 伴侣入口");box.addView(url);
        Button open=new Button(this);open.setText("打开伴侣网页");open.setOnClickListener(v->{String value=url.getText().toString().trim();if(!validUrl(value)){url.setError("请输入 HTTPS 地址");return;}getSharedPreferences("companion",0).edit().putString("url",value).apply();openPage(false);});box.addView(open);
        Button admin=new Button(this);admin.setText(canSleep(this)?"锁屏权限已启用":"启用真正熄屏所需的锁屏权限");admin.setOnClickListener(v->{Intent i=new Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN);i.putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN,new ComponentName(this,AdminReceiver.class));i.putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION,"仅用于按时间或语音关闭这台屏幕；可以在系统设置里撤销。");startActivityForResult(i,ADMIN_REQUEST);});box.addView(admin);
        Button schedule=new Button(this);boolean enabled=getSharedPreferences("companion",0).getBoolean("schedule",false);schedule.setText(enabled?"关闭工作日自动时段":"开启工作日自动时段");schedule.setOnClickListener(v->{boolean next=!getSharedPreferences("companion",0).getBoolean("schedule",false);getSharedPreferences("companion",0).edit().putBoolean("schedule",next).apply();Schedule.reschedule(this);schedule.setText(next?"关闭工作日自动时段":"开启工作日自动时段");});box.addView(schedule);
        TextView note=new TextView(this);note.setText("周一至周五 07:10–08:30、19:30–21:30。需要保持供电和网络。返回键可从网页回到这里。不会自动解锁 PIN、密码或 OEM 锁屏。");note.setTextSize(13);note.setGravity(Gravity.CENTER);note.setPadding(0,24,0,0);box.addView(note);
        setContentView(box);
    }
    private void openPage(boolean wake){
        String url=homeUrl();if(!validUrl(url)){showSetup();return;}
        trustedHost=Uri.parse(url).getHost();viewingPage=true;
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if(wake)wakeDisplay();
        web=new WebView(this);web.setBackgroundColor(Color.WHITE);WebSettings cfg=web.getSettings();cfg.setJavaScriptEnabled(true);cfg.setDomStorageEnabled(true);cfg.setMediaPlaybackRequiresUserGesture(false);
        cfg.setAllowFileAccess(false);cfg.setAllowContentAccess(false);cfg.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        web.addJavascriptInterface(new NativeBridge(),"NativeScreen");
        web.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView v,String target){return !isTrusted(target);}
            @Override public void onPageFinished(WebView v,String target){if(!isTrusted(target)){v.stopLoading();showSetup();}}
        });
        web.setWebChromeClient(new WebChromeClient(){
            @Override public void onPermissionRequest(PermissionRequest request){
                Uri origin=request.getOrigin();if(origin==null||!trustedHost.equalsIgnoreCase(origin.getHost())||!"https".equalsIgnoreCase(origin.getScheme())){request.deny();return;}
                if(checkSelfPermission(Manifest.permission.RECORD_AUDIO)!=PackageManager.PERMISSION_GRANTED){pendingPermission=request;requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO},MIC_REQUEST);return;}
                grantMic(request);
            }
        });
        setContentView(web);web.loadUrl(url);
    }
    private void grantMic(PermissionRequest request){
        for(String resource:request.getResources())if(PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)){request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});return;}
        request.deny();
    }
    private boolean isTrusted(String value){try{Uri u=Uri.parse(value);return "https".equalsIgnoreCase(u.getScheme())&&trustedHost.equalsIgnoreCase(u.getHost());}catch(Exception e){return false;}}
    @Override public void onRequestPermissionsResult(int code,String[] permissions,int[] grants){super.onRequestPermissionsResult(code,permissions,grants);
        if(code==MIC_REQUEST&&pendingPermission!=null){if(grants.length>0&&grants[0]==PackageManager.PERMISSION_GRANTED)grantMic(pendingPermission);else pendingPermission.deny();pendingPermission=null;}}
    private void wakeDisplay(){
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED|WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON|WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        PowerManager p=(PowerManager)getSystemService(POWER_SERVICE);
        if(p!=null){PowerManager.WakeLock lock=p.newWakeLock(PowerManager.FULL_WAKE_LOCK|PowerManager.ACQUIRE_CAUSES_WAKEUP,"v10companion:schedule");lock.acquire(2000);}
    }
    private final class NativeBridge {
        @JavascriptInterface public void sleep(){runOnUiThread(()->{if(web!=null&&isTrusted(web.getUrl())){getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);requestSleep(MainActivity.this);}});}
        @JavascriptInterface public void wake(){runOnUiThread(()->{if(web!=null&&isTrusted(web.getUrl()))wakeDisplay();});}
        @JavascriptInterface public boolean canControlScreen(){return canSleep(MainActivity.this);}
    }
}
