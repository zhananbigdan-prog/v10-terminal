# V10 原生屏幕控制原型

此目录是可安装 Android 外壳的源码，目标 minSdk 23 / targetSdk 28。启动后在设置页填入自己的 HTTPS 伴侣入口，打开 WebView。WebView 以全屏模式前台显示，麦克风权限在设备上申请。工作日定时用 AlarmManager RTC_WAKEUP 在 07:10、08:30、19:30、21:30 触发；重启后重新注册。开启设备管理员的 force-lock 权限后，8:30 和 21:30 调用 DevicePolicyManager.lockNow()；7:10 和 19:30 启动页面并请求亮屏。这个权限必须由机主在 V10 上确认，可以在系统设置撤销。定时开关默认关闭，需确认权限和实机显示后再启用。

**未在 TG_S7A04 真机安装/验收。** 只持有钉钉网页无法安装本程序。原厂可能禁止安装 APK、禁止自启、覆盖 Activity、阻止唤醒或展示 OEM 屏保；不能保证它完全取代原系统。此版没有在物理熄屏期间持续收音，因此语音亮屏仍需单独开发和 V10 测试。若设备设有 PIN/密码，`lockNow()` 会锁定设备，程序不会绕过解锁。

不提供刷机脚本，不修改 boot/system，不包含 DeepSeek 密钥、会话令牌或个人信息。安装前先验证 USB/ADB 或系统安装器入口。需要 Android SDK 和 Gradle 8.7 构建：在拥有合法 SDK 的环境运行 `gradle :app:assembleDebug`。
