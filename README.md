# 炸金花 PWA（zjh-pwa）

单机AI + 同WiFi联机 的炸金花，支持 PWA 安装到桌面，可转安卓 APK。

## 牌型规则（强顺序）
1. **235神牌**（开关可关） >
2. **豹子** >
3. **同花顺** >
4. **同花** >
5. **顺子** >
6. **对子** >
7. **散牌**
- 同型比花色：♠ > ♥ > ♣ > ♦
- 235 为神牌时仅限非同花

## 目录结构
.

├ index.html         # 单机模式

├ game.html          # 联机模式

├ app.js             # 规则引擎（window挂载）

├ net.js             # WS联机封装

├ server.js          # Node联机后端(ESM)

├ style.css          # 牌桌样式

├ manifest.webmanifest

├ service-worker.js  # 离线缓存

├ package.json

├ capacitor.config.ts

├ scripts/copy-dist.mjs

├ android-template/  # 安卓明文ws补丁

└ .github/workflows/build-zip.yml
## 本地跑联机
bash

npm install

npm run dev          # node server.js，默认3000端口

手机同WiFi访问 http://电脑IP:3000/game.html
## 打前端包
bash

npm run build        # 生成 dist/

npm run zip          # 出 zjh-pwa.build-zip
## 转安卓 APK。
bash

npx cap add android

npm run cap:sync

npm run cap:open     # Android Studio 出包
> 按 android-template/AndroidManifest.patch.md 补明文网络配置

## PWA
浏览器打开后「添加到主屏幕」即可离线使用。

---
MIT License