// app.js  —— 炸金花规则引擎 + 单机逻辑（浏览器全局版，无 export）
(function(){
  const RANK = {2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,10:10,J:11,Q:12,K:13,A:14};
  const SUIT_ORDER = {s:4,h:3,c:2,d:1};

  function suitVal(cs){ return cs.reduce((a,c)=>a*10+SUIT_ORDER[c.s],0); }

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

  function typeName(t){
    return {9:'235神牌',6:'豹子',5:'同花顺',4:'同花',3:'顺子',2:'对子',1:'散牌'}[t];
  }

  function deckNew(){
    const d=[];
    for(const s of ['s','h','c','d']) for(const r of Object.keys(RANK)) d.push({r,s});
    return d;
  }
  function shuffle(a){ for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]];} return a; }
  function deal3(){ return shuffle(deckNew()).slice(0,3); }

  // 牌面显示
  const RANK_SHOW={2:'2',3:'3',4:'4',5:'5',6:'6',7:'7',8:'8',9:'9',10:'10',J:'J',Q:'Q',K:'K',A:'A'};
  const SUIT_SHOW={s:'♠',h:'♥',c:'♣',d:'♦'};
  function cardHTML(c,hidden){
    if(hidden) return `<div class="card back"></div>`;
    const red = (c.s==='h'||c.s==='d')?' red':'';
    return `<div class="card${red}"><span class="rk">${RANK_SHOW[c.r]}</span><span class="st">${SUIT_SHOW[c.s]}</span></div>`;
  }

  // ===== 单机模式封装（index.html 用）=====
  const Solo = {
    state:null,
    start(allow235=true){
      const me=deal3();
      const ais=[deal3(),deal3()];
      this.state={me,ais,looked:false,pot:6,unit:1,over:false};
      return this.state;
    },
    look(){ if(this.state) this.state.looked=true; },
    call(){ if(!this.state||this.state.over)return; this.state.pot+=this.state.unit; },
    raise(){ if(!this.state||this.state.over)return; this.state.unit++; this.state.pot+=this.state.unit; },
    fold(){ this.state.over=true; return {winner:'AI',reason:'弃牌'}; },
    open(){
      if(!this.state)return null;
      const hMe=evalHand(this.state.me);
      const hAis=this.state.ais.map(a=>evalHand(a));
      let best=0;
      hAis.forEach((h,i)=>{ if(cmpHand(h,hMe)>0 && (best===0||cmpHand(h,hAis[best-1])>0)) best=i+1; });
      this.state.over=true;
      if(best===0) return {winner:'你',hand:hMe,typeName:typeName(hMe.type),pot:this.state.pot};
      return {winner:`AI${best}`,hand:hAis[best-1],typeName:typeName(hAis[best-1].type],pot:this.state.pot};
    }
  };

  // ===== 挂全局（关键，别删）=====
  window.evalHand = evalHand;
  window.cmpHand = cmpHand;
  window.typeName = typeName;
  window.deal3 = deal3;
  window.cardHTML = cardHTML;
  window.ZJH_Solo = Solo;
  window.RANK_SHOW = RANK_SHOW;
  window.SUIT_SHOW = SUIT_SHOW;
})();