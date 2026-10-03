# AndroidManifest.xml 补丁说明（Capacitor 生成后手动改）

## 1. 引用网络安全配置
在 `android/app/src/main/AndroidManifest.xml` 的 `<application>` 标签加：xml

<application

android:name=".MainApplication"

android:label="@string/app_name"

android:icon="@mipmap/ic_launcher"

android:roundIcon="@mipmap/ic_launcher_round"

android:allowBackup="true"

android:theme="@style/AppTheme"

android:networkSecurityConfig="@xml/network_security_config"

android:usesCleartextTraffic="true">
## 2. 放配置文件
把本目录 `network_security_config.xml` 复制到：android/app/src/main/res/xml/network_security_config.xml
（没有 `res/xml/` 就新建）

## 3. 权限补全（<manifest> 层级加）
xml

<uses-permission android:name="android.permission.INTERNET" />

<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />

<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
## 4. 为什么必须做
- Android 9+ 默认禁止明文 HTTP / WS
- 我们联机用 `ws://192.168.x.x:3000`，属于内网明文
- 不加这个，APK 里联机会直接连接失败

## 5. 自动化建议
后续可在 `cap sync` 后加脚本自动拷贝，当前先手动按本说明操作即可。