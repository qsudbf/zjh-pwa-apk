// scripts/copy-dist.mjs —— 构建：把前端资源整理进 dist/
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

const ASSETS = [
  'index.html',
  'game.html',
  'app.js',
  'net.js',
  'style.css',
  'manifest.webmanifest',
  'service-worker.js',
  'icon.svg',
  'icon-192.png',
  'icon-512.png'
];

function ensureDir(dir){ fs.mkdirSync(dir, { recursive:true }); }

function copyFile(src, dest){
  if(!fs.existsSync(src)){
    console.warn('⚠️  跳过（不存在）:', path.relative(ROOT, src));
    return false;
  }
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  return true;
}

// 清空旧 dist
if(fs.existsSync(DIST)){
  fs.rmSync(DIST, { recursive:true, force:true });
}
ensureDir(DIST);

console.log('📦 构建 dist/');
let ok = 0, skip = 0;
for(const a of ASSETS){
  const copied = copyFile(path.join(ROOT, a), path.join(DIST, a));
  copied ? ok++ : skip++;
}
console.log(`✅ 复制 ${ok} 个文件，${skip} 个跳过`);