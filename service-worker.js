// service-worker.js —— 炸金花 PWA 离线缓存
const CACHE = 'zjh-v1';
const ASSETS = [
  './',
  './index.html',
  './game.html',
  './app.js',
  './net.js',
  './style.css',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon.svg'
];

// 安装：预缓存核心资源
self.addEventListener('install', e=>{
  e.waitUntil(
    caches.open(CACHE).then(c=>c.addAll(ASSETS).catch(()=>{}))
      .then(()=>self.skipWaiting())
  );
});

// 激活：清旧缓存
self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys().then(keys=>
      Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))
    ).then(()=>self.clients.claim())
  );
});

// 拦截请求：缓存优先，回源兜底（联机 WS 不缓存）
self.addEventListener('fetch', e=>{
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  // WebSocket / 联机接口不拦截
  if(url.protocol === 'ws:' || url.protocol === 'wss:' || url.pathname.startsWith('/ws')) return;
  // 跨域不缓存
  if(url.origin !== location.origin) return;

  e.respondWith(
    caches.match(req).then(cached=>{
      if(cached) return cached;
      return fetch(req).then(res=>{
        // 只缓存成功响应
        if(res && res.status===200 && res.type==='basic'){
          const copy = res.clone();
          caches.open(CACHE).then(c=>c.put(req,copy));
        }
        return res;
      }).catch(()=> caches.match('./index.html'));
    })
  );
});

// 断线重连宽限提示（可选，给前端用）
self.addEventListener('message', e=>{
  if(e.data==='SKIP_WAITING') self.skipWaiting();
});