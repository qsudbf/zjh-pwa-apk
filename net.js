// net.js —— 联机通信层（浏览器全局版，配合 game.html 使用）
(function(){
  // 联机地址：优先读 index.html/game.html 里设的 window.__ZJH_WS__
  // 格式如 '192.168.1.88:3000'，自动补 ws://
  function wsBase(){
    let addr = (window.__ZJH_WS__ || '192.168.1.88:3000').trim();
    addr = addr.replace(/^https?:\/\//,'').replace(/\/+$/,'');
    return 'ws://' + addr + '/ws';
  }

  class ZJHClient {
    constructor(){
      this.ws = null;
      this.user = '';
      this.room = '';
      this.handlers = {};
    }
    on(type, fn){ this.handlers[type] = fn; return this; }
    _emit(type, data){ if(this.handlers[type]) this.handlers[type](data); }

    connect(){
      return new Promise((resolve,reject)=>{
        try{
          this.ws = new WebSocket(wsBase());
          this.ws.onopen = ()=>resolve();
          this.ws.onerror = (e)=>reject(e);
          this.ws.onmessage = (ev)=>{
            let m; try{ m=JSON.parse(ev.data); }catch{ return; }
            this._emit(m.type, m);
          };
          this.ws.onclose = ()=> this._emit('close',{});
        }catch(e){ reject(e); }
      });
    }

    _send(obj){
      if(this.ws && this.ws.readyState===1) this.ws.send(JSON.stringify(obj));
    }

    create(user, avatar=0, allow235=true){
      this.user=user;
      this._send({type:'create', user, avatar, allow235});
    }
    join(room, user, avatar=0){
      this.user=user; this.room=room.toUpperCase();
      this._send({type:'join', room:this.room, user, avatar});
    }
    reconnect(room, user, avatar=0){
      this.user=user; this.room=room.toUpperCase();
      this._send({type:'reconnect', room:this.room, user, avatar});
    }
    start(){ this._send({type:'start'}); }
    action(act){ this._send({type:'action', act}); }
    chat(text){ this._send({type:'chat', text}); }
  }

  // 暴露全局
  window.ZJHClient = ZJHClient;
  window.__ZJH_WS_URL__ = wsBase;
})();