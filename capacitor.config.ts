// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zjh.poker',
  appName: '炸金花',
  webDir: 'dist',
  bundledWebRuntime: false,
  // 安卓用 http 协议，允许同WiFi明文 ws 联机
  androidScheme: 'http',
  server: {
    androidScheme: 'http',
    // 允许加载本地资源 + 同WiFi联机地址
    allowMixedContent: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#07261c',
      androidScaleType: 'CENTER_CROP'
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0b3d2e'
    }
  },
  logging: {
    android: 'debug'
  }
};

export default config;