// server.js  (ESM, type:module)
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

// ---- ws 导入兼容（本地 npm i ws / 全局安装回退）----
let WebSocketServer;
try {
  ({ WebSocketServer } = await import('ws'));
} catch {
  const g = process.env.GLOBAL_WS || '/usr/lib/node_modules/ws/index.js';
  ({ WebSocketServer } = await import(g));
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

// ========== 规则引擎（与 app.js 一致） ==========
const RANK = {2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,10:10,J:11,Q:12,K:13,A:14};
const SUIT_ORDER = {s:4,h:3,c:2,d:1};

function suitVal(cs){return cs.reduce((a,c)=>a*10+SUIT_ORDER[c.s],0);}
function evalHand(cards, allow235=true){
  const cs=[...cards].sort((a,b)=>RANK[b.r]-RANK[a.r]);
  const rs=cs.map(c=>RANK[c.r]);
  const suits=cs.map(c=>c.s);
  const sameSuit=suits.every(s=>s===suits[0]);
  const isSeq=(arr)=>{
    if(arr[0]===14&&arr[1]===3&&arr[2]===2) return {seq:true,top:3};
    if(arr[0]-arr[1]===1&&arr[1]-arr[2]===1) return {seq:true,top:arr[0]};
    return {seq:false};
  };
  const key235=[...rs].sort((a,b)=>a-b).join('');
  if(allow235 && key235==='235' && !sameSuit) return {type:9,cards:cs,key:[2,3,5],suitKey:0};
  if(rs[0]===rs[1]&&rs[1]===rs[2]) return {type:6,cards:cs,key:[rs[0]],suitKey:suitVal(cs)};
  const sq=isSeq(rs);
  if(sameSuit&&sq) return {type:5,cards:cs,key:[sq.top],suitKey:suitVal(cs)};
  if(sameSuit) return {type:4,cards:cs,key:[...rs],suitKey:suitVal(cs)};
  if(sq) return {type:3,cards:cs,key:[sq.top],suitKey:suitVal(cs)};
  let pair=null;
  if(rs[0]===rs[1])pair=[rs[0],rs[2]];
  else if(rs[1]===rs[2])pair=[rs[1],rs[0]];
  else if(rs[0]===rs[2])pair=[rs[0],rs[1]];
  if(pair) return {type:2,cards:cs,key:pair,suitKey:suitVal(cs)};
  return {type:1,cards:cs,key:[...rs],suitKey:suitVal(cs)};
}
function cmpHand(a,b){
  if(a.type!==b.type) return a.type-b.type;
  for(let i=0;i<Math.max(a.key.length,b.key.length);i++){
    const x=a.key[i]||0,y=b.key[i]||0;
    if(x!==y) return x-y;
  }
  return a.suitKey-b.suitKey;
}
function typeName(t){return {9:'235神牌',6:'豹子',5:'同花顺',4:'同花',3:'顺子',2:'对子',1:'散牌'}[t];}

// ========== 静态文件服务 ==========
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/manifest+json','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.map':'application/json','.xml':'application/xml','.md':'text/markdown'};
const server=http.createServer((req,res)=>{
  let urlPath=decodeURIComponent(req.url.split('?')[0]);
  if(urlPath==='/') urlPath='/index.html';
  const filePath=path.join(__dirname, path.normalize(urlPath));
  if(!filePath.startsWith(__dirname)){res.writeHead(403);return res.end('forbidden');}
  fs.readFile(filePath,(err,data)=>{
    if(err){res.writeHead(404);return res.end('not found');}
    const ext=path.extname(filePath);
    res.writeHead(200,{'Content-Type':MIME[ext]||'application/octet-stream'});
    res.end(data);
  });
});

// ========== WebSocket 房间 ==========
const wss=new WebSocketServer({server,path:'/ws'});
const rooms=new Map();

function bcast(r,obj){ for(const p of r.players){ if(p.ws&&p.ws.readyState===1) p.ws.send(JSON.stringify(obj)); } }
function sendTo(p,obj){ if(p.ws&&p.ws.readyState===1) p.ws.send(JSON.stringify(obj)); }

function syncRoom(r){
  bcast(r,{type:'room',players:r.players.map(p=>({
    user:p.user,avatar:p.avatar,folded:!!p.folded,offline:!!p.offline
  }))});
  bcast(r,{type:'canStart',can:r.players.length>=2 && r.round===0});
}

function joinCore(ws,r,user,avatar,isHostSet){
  if(r.players.length>=6){ sendTo({ws}, {type:'err',msg:'房间已满'}); return; }
  const p={ws,user,avatar:avatar||0,cards:[],folded:false,offline:false};
  r.players.push(p);
  ws.meta={room:r.id,user};
  sendTo(p,{type:'joined',room:r.id,allow235:r.allow235,host:isHostSet,reconnected:false});
  syncRoom(r);
}

wss.on('connection',(ws)=>{
  ws.meta={};
  ws.on('message',buf=>{
    let m; try{m=JSON.parse(buf.toString());}catch{return;}
    handle(ws,m);
  });
  ws.on('close',()=>{
    const r=ws.meta.room&&rooms.get(ws.meta.room);
    if(r){
      const p=r.players.find(x=>x.ws===ws);
      if(p){
        p.offline=true; p.ws=null;
        syncRoom(r);
        setTimeout(()=>{
          if(p.offline && !p.ws){
            r.players=r.players.filter(x=>x!==p);
            if(r.players.length===0) rooms.delete(r.id);
            else { if(r.hostUser===p.user) r.hostUser=r.players[0].user; syncRoom(r); }
          }
        },30000);
      }
    }
  });
});

function handle(ws,m){
  switch(m.type){
    case 'create': return createRoom(ws,m);
    case 'join': return joinRoom(ws,m);
    case 'reconnect': return reconnect(ws,m);
    case 'start': return startRound(ws,m);
    case 'action': return doAction(ws,m);
    case 'chat': return chat(ws,m);
  }
}

function createRoom(ws,m){
  let id; do{ id=Math.random().toString(36).slice(2,5).toUpperCase(); }while(rooms.has(id));
  const r={id,players:[],round:0,pot:0,unit:1,turn:0,hostUser:m.user,allow235:m.allow235!==false};
  rooms.set(id,r);
  joinCore(ws,r,m.user,m.avatar,true);
  console.log('🏠 建房',id);
}

function joinRoom(ws,m){
  const r=rooms.get((m.room||'').toUpperCase());
  if(!r){ sendTo({ws},{type:'err',msg:'房间不存在'}); return; }
  ws.meta={room:r.id,user:m.user};
  joinCore(ws,r,m.user,m.avatar, r.hostUser===m.user);
}

function reconnect(ws,m){
  const r=rooms.get((m.room||'').toUpperCase());
  if(!r){ sendTo({ws},{type:'err',msg:'房间已解散'}); return; }
  let p=r.players.find(x=>x.user===m.user);
  if(!p){
    if(r.round>0){ sendTo({ws},{type:'err',msg:'本局进行中，无法重入'}); return; }
    joinCore(ws,r,m.user,m.avatar, r.hostUser===m.user);
    return;
  }
  p.ws=ws; p.offline=false;
  ws.meta={room:r.id,user:m.user};
  sendTo(p,{type:'joined',room:r.id,allow235:r.allow235,host:r.hostUser===m.user,reconnected:true});
  syncRoom(r);
  if(r.round>0){
    sendTo(p,{type:'deal',pot:r.pot,unit:r.unit,reconnect:true});
    sendTo(p,{type:'cards',cards:p.cards});
    bcast(r,{type:'turn',turn:r.turn});
  }else{
    bcast(r,{type:'canStart',can:r.players.length>=2});
  }
}

function startRound(ws,m){
  const r=ws.meta.room&&rooms.get(ws.meta.room);
  if(!r)return;
  if(r.hostUser!==ws.meta.user){ sendTo({ws},{type:'err',msg:'只有房主可开始'}); return; }
  if(r.players.length<2)return;
  if(r.round>0)return;
  let deck=[];
  for(const s of ['s','h','c','d']) for(const k of Object.keys(RANK)) deck.push({r:k,s});
  for(let i=deck.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[deck[i],deck[j]]=[deck[j],deck[i]];}
  let idx=0;
  r.players.forEach(p=>{ p.cards=deck.slice(idx,idx+3); idx+=3; p.folded=false; });
  r.pot=6; r.unit=1; r.round=1; r.turn=0;
  bcast(r,{type:'deal',pot:r.pot,unit:r.unit});
  r.players.forEach(p=> sendTo(p,{type:'cards',cards:p.cards}) );
  bcast(r,{type:'turn',turn:r.turn});
  syncRoom(r);
}

function doAction(ws,m){
  const r=ws.meta.room&&rooms.get(ws.meta.room);
  if(!r||r.round===0)return;
  const p=r.players.find(x=>x.user===ws.meta.user);
  if(!p)return;
  const idx=r.players.indexOf(p);
  if(r.turn!==idx)return;
  const act=m.act;
  if(act==='call'){ r.pot+=r.unit; }
  else if(act==='raise'){ r.unit++; r.pot+=r.unit; }
  else if(act==='fold'){ p.folded=true; }
  else if(act==='look'){ /* 前端标记 */ }
  else if(act==='open'){ return settle(r); }
  bcast(r,{type:'chip',pot:r.pot,act:act,user:p.user});
  if(act!=='open'){
    let nxt=(idx+1)%r.players.length;
    let guard=0;
    while(r.players[nxt].folded && guard<6){ nxt=(nxt+1)%r.players.length; guard++; }
    r.turn=nxt;
    bcast(r,{type:'turn',turn:r.turn});
  }
}

function chat(ws,m){
  const r=ws.meta.room&&rooms.get(ws.meta.room);
  if(!r)return;
  bcast(r,{type:'chat',user:ws.meta.user,text:String(m.text||'').slice(0,80)});
}

function settle(r){
  const alive=r.players.filter(p=>!p.folded);
  let winner;
  if(alive.length===1){ winner=alive[0]; }
  else{
    const hs=alive.map(p=>({p,h:evalHand(p.cards,r.allow235)}));
    hs.sort((a,b)=>cmpHand(b.h,a.h));
    winner=hs[0].p;
  }
  const detail=r.players.map(p=>({
    user:p.user,
    hand:evalHand(p.cards,r.allow235)
  }));
  bcast(r,{
    type:'result',
    winner:winner.user,
    pot:r.pot,
    detail:detail.map(d=>({user:d.user,hand:{type:d.hand.type},typeName:typeName(d.hand.type)}))
  });
  r.round=0; r.pot=0; r.unit=1; r.turn=0;
  r.players.forEach(p=>p.cards=[]);
  setTimeout(()=>syncRoom(r),300);
}

server.listen(PORT,()=>{
  const ip=Object.values(os.networkInterfaces()).flat().find(n=>n.family==='IPv4'&&!n.internal)?.address||'127.0.0.1';
  console.log(`✅ 炸金花联机服务已启动 (端口 ${PORT})`);
  console.log(`   本机:   http://localhost:${PORT}`);
  console.log(`   手机:   http://${ip}:${PORT}`);
  console.log(`   WS路径: /ws`);
});