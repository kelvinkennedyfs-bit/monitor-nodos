(function(){'use strict';
var PID='__MN__',BID='__MN_BD__',FACS=['SRJ3','ERJ2','ERJ5','BRNRJ381','BRNRJ82','BRNRJ719','BRNRJ153','BRNRJ542','BRNRJ564','BRNRJ906','BRNRJ1510','BRNRJ1924','BRNRJ12663','BRNSP1335','BRNRJ122','BRNRJ12898'];

var ex=document.getElementById(PID);
if(ex){var bd2=document.getElementById(BID);var v=ex.style.display!=='none';ex.style.display=v?'none':'flex';if(bd2)bd2.style.display=v?'none':'block';return;}

var S={date:gd(),tab:'nodos',rows:[],loading:false,kangu:JSON.parse(localStorage.getItem('__nk__')||'{}'),ct:null,cd:60,ff:'',fs:'',fc:'',ft:''};

function gd(){return new Date().toISOString().slice(0,10);}
function ad(s,n){var d=new Date(s+'T12:00:00');d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);}
function br(s){var p=s.split('-');return p[2]+'/'+p[1]+'/'+p[0];}
function pad(n){return String(n).padStart(2,'0');}
function nm(){var n=new Date();return n.getHours()*60+n.getMinutes();}
function e2m(e){if(!e||e==='00:00')return null;var p=e.split(':');return parseInt(p[0])*60+parseInt(p[1]);}
function etaStr(h){if(!h||h==='')return '';return pad(parseInt(h))+':00';}
function isToday(){return S.date===gd();}

function late(eta,st){
  if(st==='encerrada'||st==='acaminho')return false;
  var m=e2m(eta);if(m===null)return false;
  return nm()>m+60;
}
function sk(){localStorage.setItem('__nk__',JSON.stringify(S.kangu));}
function toast(msg){
  var t=document.createElement('div');t.textContent=msg;
  Object.assign(t.style,{position:'fixed',bottom:'28px',right:'28px',background:'#0d1525',border:'1px solid #00ff88',color:'#00ff88',padding:'10px 20px',borderRadius:'10px',fontSize:'13px',fontWeight:'600',zIndex:'999999',boxShadow:'0 0 20px rgba(0,255,136,.3)',animation:'mn-toast 2.5s forwards'});
  document.body.appendChild(t);setTimeout(function(){t.remove();},2500);
}
function cp(txt,label){
  navigator.clipboard.writeText(txt).then(function(){toast('✅ '+(label||'')+'copiado!');});
}

function mapStatus(status,substatus){
  var st=String(status||'').toLowerCase();
  var sub=String(substatus||'').toLowerCase();
  if(st==='closed'||st==='finished') return 'encerrada';
  if(st==='rejected') return 'recusou';
  if(st==='canceled') return 'cancelado';
  if(sub==='on_way_destination_facility') return 'acaminho';
  if(st==='active'||st==='started'){
    if(sub==='return_to_station'||sub==='returning') return 'retornando';
    return 'emrota';
  }
  if(st==='planned') return 'pendente';
  return 'pendente';
}

function badgeStatus(st,isLate){
  if(isLate) return '<span class="mn-bx mn-bo">⚠️ ATRASADO</span>';
  var m={
    emrota:    '<span class="mn-bx mn-bb">🔵 Em Rota</span>',
    pendente:  '<span class="mn-bx mn-by">🟡 Pendente</span>',
    acaminho:  '<span class="mn-bx mn-bc">🚛 A Caminho</span>',
    encerrada: '<span class="mn-bx mn-bg">✅ Encerrada</span>',
    retornando:'<span class="mn-bx mn-bw">🔄 Retornando</span>',
    recusou:   '<span class="mn-bx mn-br">🔴 Recusou</span>',
    cancelado: '<span class="mn-bx mn-bgr">⚫ Cancelado</span>'
  };
  return m[st]||'<span class="mn-bx mn-bgr">'+st+'</span>';
}
async function fetchAll(){
  S.loading=true;renderBody();
  var base='https://envios.adminml.com/logistics/api/monitoring/get-routes-list';
  try{
    var all=[],page=1,hasNext=true;
    while(hasNext&&page<=20){
      var resp=await fetch(base,{
        method:'POST',credentials:'include',
        headers:{'Accept':'application/json','Content-Type':'application/json'},
        body:JSON.stringify({serviceCenterId:'SRJ3',siteId:'MLB',page:page,pageSize:50,order_by:'performance'})
      });
      var data=await resp.json();
      all=all.concat((data&&data.routes)||[]);
      hasNext=!!(data&&data.pagination&&data.pagination.hasNext);
      page++;
    }
    S.rows=all.map(function(r){
      var c=r.counters||{};
      var v=r.vehicle||{};
      var pl=r.plannedRoute||{};
      var dr=r.driver||{};
      var st=mapStatus(r.status,r.substatus);
      var eta=etaStr(r.initHour);
      return {
        tid:String(r.id||''),
        fac:r.facilityId||'',
        carrier:r.carrier||'',
        driver:dr.driverName&&dr.driverName!=='-'?dr.driverName:'',
        plate:v.license||'',
        cycle:pl.cycleName||'',
        eta:eta,
        status:st,
        total:c.total||0,
        delivered:c.delivered||0,
        failed:c.notDelivered||0,
        pending:c.pending||0,
        date:r.plannedRoute&&r.plannedRoute.cpt?r.plannedRoute.cpt:S.date
      };
    }).filter(function(r){return FACS.includes(r.fac);});
  }catch(e){console.error('[MN]',e);}
  S.loading=false;renderBody();
}

function injectCSS(){
  if(document.getElementById('__mn_css__'))return;
  var st=document.createElement('style');st.id='__mn_css__';
  st.textContent=
    '#'+PID+' *{box-sizing:border-box;font-family:Segoe UI,system-ui,sans-serif}'
   +'#'+PID+' ::-webkit-scrollbar{width:5px;height:5px}'
   +'#'+PID+' ::-webkit-scrollbar-track{background:#0a0e1a}'
   +'#'+PID+' ::-webkit-scrollbar-thumb{background:#00d4ff44;border-radius:3px}'
   +'@keyframes mn-glow{0%,100%{box-shadow:0 0 20px rgba(0,212,255,.3)}50%{box-shadow:0 0 45px rgba(0,212,255,.75)}}'
   +'@keyframes mn-scan{0%{top:-2px;opacity:0}5%{opacity:1}95%{opacity:1}100%{top:100%;opacity:0}}'
   +'@keyframes mn-shimmer{0%{background-position:0% center}100%{background-position:200% center}}'
   +'@keyframes mn-pulse{0%,100%{opacity:1}50%{opacity:.2}}'
   +'@keyframes mn-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}'
   +'@keyframes mn-toast{0%{opacity:0;transform:translateY(8px)}15%{opacity:1;transform:translateY(0)}85%{opacity:1}100%{opacity:0}}'
   +'.mn-scan{position:absolute;left:0;right:0;height:2px;pointer-events:none;z-index:9;background:linear-gradient(90deg,transparent,#00d4ff,rgba(255,255,255,.5),#00d4ff,transparent);animation:mn-scan 4s linear infinite}'
   +'.mn-shim{background:linear-gradient(90deg,#00d4ff,#fff,#00d4ff,#7b61ff,#00d4ff);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:mn-shimmer 3s linear infinite}'
   +'.mn-tab{cursor:pointer;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600;color:#607898;border:1px solid transparent;transition:all .2s;white-space:nowrap}'
   +'.mn-tab:hover{color:#00d4ff;border-color:rgba(0,212,255,.3)}'
   +'.mn-tab.on{color:#00d4ff;background:rgba(0,212,255,.12);border-color:rgba(0,212,255,.5);box-shadow:0 0 12px rgba(0,212,255,.3)}'
   +'.mn-btn{cursor:pointer;padding:5px 12px;border-radius:8px;font-size:12px;font-weight:600;border:1px solid rgba(0,212,255,.4);background:rgba(0,212,255,.08);color:#00d4ff;transition:all .2s;white-space:nowrap}'
   +'.mn-btn:hover{background:rgba(0,212,255,.22);box-shadow:0 0 10px rgba(0,212,255,.4)}'
   +'.mn-btn.g{border-color:rgba(0,255,136,.4);background:rgba(0,255,136,.08);color:#00ff88}'
   +'.mn-btn.g:hover{background:rgba(0,255,136,.22)}'
   +'.mn-btn.y{border-color:rgba(255,204,0,.4);background:rgba(255,204,0,.08);color:#ffcc00}'
   +'.mn-btn.y:hover{background:rgba(255,204,0,.22)}'
   +'.mn-btn.r{border-color:rgba(255,51,102,.4);background:rgba(255,51,102,.08);color:#ff3366}'
   +'.mn-btn.r:hover{background:rgba(255,51,102,.22)}'
   +'.mn-btn.k{border-color:rgba(123,97,255,.4);background:rgba(123,97,255,.08);color:#7b61ff}'
   +'.mn-btn.k:hover{background:rgba(123,97,255,.22)}'
   +'.mn-btn.sm{padding:2px 7px;font-size:11px}'
   +'.mn-btn.o{border-color:rgba(255,140,0,.4);background:rgba(255,140,0,.08);color:#ff8c00}'
   +'.mn-tbl{width:100%;border-collapse:collapse;font-size:12px}'
   +'.mn-tbl th{color:#00d4ff;font-size:11px;text-transform:uppercase;letter-spacing:.5px;padding:7px 9px;border-bottom:1px solid rgba(0,212,255,.18);text-align:left;position:sticky;top:0;background:#0d1525;z-index:2}'
   +'.mn-tbl td{padding:6px 9px;border-bottom:1px solid rgba(255,255,255,.04);color:#c0d0e8;vertical-align:middle}'
   +'.mn-tbl tr:hover td{background:rgba(0,212,255,.05)}'
   +'.mn-bx{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600}'
   +'.mn-bg{background:rgba(0,255,136,.14);color:#00ff88;border:1px solid rgba(0,255,136,.3)}'
   +'.mn-bb{background:rgba(0,180,255,.14);color:#00b4ff;border:1px solid rgba(0,180,255,.3)}'
   +'.mn-by{background:rgba(255,204,0,.14);color:#ffcc00;border:1px solid rgba(255,204,0,.3)}'
   +'.mn-br{background:rgba(255,51,102,.14);color:#ff3366;border:1px solid rgba(255,51,102,.3)}'
   +'.mn-bgr{background:rgba(100,120,140,.14);color:#8090a8;border:1px solid rgba(100,120,140,.3)}'
   +'.mn-bo{background:rgba(255,140,0,.14);color:#ff8c00;border:1px solid rgba(255,140,0,.3);animation:mn-pulse 1s infinite}'
   +'.mn-bc{background:rgba(0,212,255,.14);color:#00d4ff;border:1px solid rgba(0,212,255,.3)}'
   +'.mn-bw{background:rgba(200,200,200,.14);color:#c0c0c0;border:1px solid rgba(200,200,200,.3)}'
   +'.mn-bk{background:rgba(123,97,255,.14);color:#7b61ff;border:1px solid rgba(123,97,255,.4)}'
   +'.mn-kpi{background:rgba(0,212,255,.05);border:1px solid rgba(0,212,255,.18);border-radius:10px;padding:12px 14px;text-align:center;flex:1;min-width:90px}'
   +'.mn-kpi .v{font-size:26px;font-weight:700;color:#00d4ff;line-height:1}'
   +'.mn-kpi .l{font-size:10px;color:#506070;margin-top:3px;text-transform:uppercase;letter-spacing:.5px}'
   +'.mn-sel{background:rgba(255,255,255,.05);border:1px solid rgba(0,212,255,.2);border-radius:7px;color:#c0d0e8;padding:5px 8px;font-size:12px;outline:none}'
   +'.mn-inp{background:rgba(255,255,255,.05);border:1px solid rgba(0,212,255,.2);border-radius:7px;color:#c0d0e8;padding:5px 10px;font-size:12px;outline:none;width:160px}'
   +'.mn-grp{background:rgba(0,212,255,.07);border-left:3px solid #00d4ff;padding:8px 14px;border-radius:6px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between}'
   +'.mn-sp{width:18px;height:18px;border:2px solid rgba(0,212,255,.2);border-top-color:#00d4ff;border-radius:50%;animation:mn-spin .8s linear infinite}';
  document.head.appendChild(st);
}

function buildPanel(){
  injectCSS();
  var bd=document.createElement('div');
  bd.id=BID;
  Object.assign(bd.style,{position:'fixed',inset:'0',background:'rgba(0,0,0,.55)',backdropFilter:'blur(4px)',zIndex:'99998'});
  bd.onclick=function(){var p=document.getElementById(PID);if(p){p.style.display='none';bd.style.display='none';}};
  document.body.appendChild(bd);

  var panel=document.createElement('div');
  panel.id=PID;
  Object.assign(panel.style,{position:'fixed',top:'40px',right:'30px',width:'980px',maxWidth:'96vw',height:'84vh',background:'#0a0e1a',border:'1px solid rgba(0,212,255,.35)',borderRadius:'16px',display:'flex',flexDirection:'column',zIndex:'99999',animation:'mn-glow 3s ease-in-out infinite',overflow:'hidden',color:'#e0e8ff'});

  // SCAN LINE
  var scan=document.createElement('div');scan.className='mn-scan';panel.appendChild(scan);

  // HEADER
  var hdr=document.createElement('div');
  Object.assign(hdr.style,{background:'linear-gradient(135deg,#0d1b3e,#1a2a6c,#0d1b3e)',padding:'10px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'move',flexShrink:'0',borderBottom:'1px solid rgba(0,212,255,.2)'});
  hdr.innerHTML='<div style="display:flex;align-items:center;gap:10px">'
    +'<span style="font-size:18px">🛰️</span>'
    +'<span class="mn-shim" style="font-size:14px;font-weight:700;letter-spacing:1px">MONITOR NODOS</span>'
    +'<span id="mn-dtlbl" style="font-size:11px;color:#506070;margin-left:2px"></span>'
    +'</div>'
    +'<div style="display:flex;align-items:center;gap:6px">'
    +'<button id="mn-prev" class="mn-btn sm">◀</button>'
    +'<span id="mn-dtdisp" style="font-size:13px;color:#00d4ff;font-weight:600;min-width:78px;text-align:center"></span>'
    +'<button id="mn-next" class="mn-btn sm">▶</button>'
    +'<button id="mn-ref" class="mn-btn" style="margin-left:6px">🔄 <span id="mn-cd">60</span>s</button>'
    +'<button id="mn-min" style="background:rgba(255,204,0,.15);border:1px solid rgba(255,204,0,.4);color:#ffcc00;border-radius:8px;padding:4px 10px;cursor:pointer;font-size:13px;font-weight:700" title="Minimizar">—</button>'
    +'<button id="mn-max" style="background:rgba(0,212,255,.15);border:1px solid rgba(0,212,255,.4);color:#00d4ff;border-radius:8px;padding:4px 10px;cursor:pointer;font-size:13px;font-weight:700" title="Maximizar">⛶</button>'
    +'<button id="mn-cls" style="background:rgba(255,51,102,.15);border:1px solid rgba(255,51,102,.4);color:#ff3366;border-radius:8px;padding:4px 12px;cursor:pointer;font-size:13px;font-weight:700" title="Fechar">✕</button>'
    +'</div>';
  panel.appendChild(hdr);

  // TABS
  var tabs=document.createElement('div');
  Object.assign(tabs.style,{display:'flex',gap:'6px',padding:'8px 14px',borderBottom:'1px solid rgba(0,212,255,.1)',flexShrink:'0',background:'rgba(0,0,0,.2)',overflowX:'auto'});
  tabs.innerHTML='<div class="mn-tab on" data-t="nodos">🛰️ Nodos</div>'
    +'<div class="mn-tab" data-t="escala">📋 Escala</div>'
    +'<div class="mn-tab" data-t="fechamento">📦 Fechamento</div>'
    +'<div class="mn-tab" data-t="turno">🔄 Passagem de Turno</div>';
  panel.appendChild(tabs);

  // BODY
  var body=document.createElement('div');
  body.id='mn-body';
  Object.assign(body.style,{flex:'1',overflowY:'auto',padding:'14px 16px'});
  panel.appendChild(body);

  document.body.appendChild(panel);

  // DRAG
  var dx=0,dy=0,drag=false;
  hdr.addEventListener('mousedown',function(e){
    if(e.target.tagName==='BUTTON')return;
    drag=true;dx=e.clientX-panel.offsetLeft;dy=e.clientY-panel.offsetTop;
  });
  document.addEventListener('mousemove',function(e){
    if(!drag)return;
    panel.style.left=(e.clientX-dx)+'px';
    panel.style.top=(e.clientY-dy)+'px';
    panel.style.right='auto';
  });
  document.addEventListener('mouseup',function(){drag=false;});

  // MINIMIZAR
  var minimized=false;
  panel.querySelector('#mn-min').onclick=function(){
    minimized=!minimized;
    body.style.display=minimized?'none':'flex';
    tabs.style.display=minimized?'none':'flex';
    panel.style.height=minimized?'auto':'84vh';
    this.textContent=minimized?'▲':'—';
  };

  // MAXIMIZAR
  var maximized=false;
  var prevStyle={};
  panel.querySelector('#mn-max').onclick=function(){
    maximized=!maximized;
    if(maximized){
      prevStyle={width:panel.style.width,height:panel.style.height,top:panel.style.top,right:panel.style.right,left:panel.style.left};
      Object.assign(panel.style,{width:'100vw',height:'100vh',top:'0',left:'0',right:'0',maxWidth:'100vw',borderRadius:'0'});
      this.textContent='⛶';
    }else{
      Object.assign(panel.style,{width:prevStyle.width||'980px',height:prevStyle.height||'84vh',top:prevStyle.top||'40px',left:prevStyle.left||'auto',right:prevStyle.right||'30px',maxWidth:'96vw',borderRadius:'16px'});
      this.textContent='⛶';
    }
  };

  // FECHAR
  panel.querySelector('#mn-cls').onclick=function(){
    panel.style.display='none';bd.style.display='none';
  };

  // PREV/NEXT DATA
  panel.querySelector('#mn-prev').onclick=function(){S.date=ad(S.date,-1);updateDate();fetchAll();};
  panel.querySelector('#mn-next').onclick=function(){S.date=ad(S.date,1);updateDate();fetchAll();};
  panel.querySelector('#mn-ref').onclick=function(){S.cd=60;fetchAll();};

  // TABS CLICK
  tabs.querySelectorAll('.mn-tab').forEach(function(t){
    t.addEventListener('click',function(){
      S.tab=t.dataset.t;
      tabs.querySelectorAll('.mn-tab').forEach(function(x){x.classList.remove('on');});
      t.classList.add('on');
      renderBody();
    });
  });

  updateDate();
  fetchAll();
  startTimers();
}

function updateDate(){
  var dl=document.getElementById('mn-dtlbl');
  var dd=document.getElementById('mn-dtdisp');
  if(dl)dl.textContent=isToday()?'(hoje)':'';
  if(dd)dd.textContent=br(S.date);
}

function startTimers(){
  if(S.ct)clearInterval(S.ct);
  S.ct=setInterval(function(){
    S.cd--;
    var el=document.getElementById('mn-cd');
    if(el)el.textContent=S.cd;
    if(S.cd<=0){S.cd=60;fetchAll();}
  },1000);
}

function renderBody(){
  var body=document.getElementById('mn-body');
  if(!body)return;
  if(S.loading){
    body.innerHTML='<div style="display:flex;align-items:center;gap:10px;color:#00d4ff;padding:40px;justify-content:center"><div class="mn-sp"></div><span>Carregando dados...</span></div>';
    return;
  }
  if(S.tab==='nodos')renderNodos(body);
  else if(S.tab==='escala')renderEscala(body);
  else if(S.tab==='fechamento')renderFechamento(body);
  else if(S.tab==='turno')renderTurno(body);
}

function renderNodos(body){
  var today=S.rows.filter(function(r){return r.date===S.date;});
  var rows=today.filter(function(r){
    if(S.ff&&r.fac!==S.ff)return false;
    if(S.fs&&r.status!==S.fs)return false;
    if(S.fc&&r.cycle!==S.fc)return false;
    if(S.ft){var q=S.ft.toLowerCase();if(r.driver.toLowerCase().indexOf(q)<0&&r.carrier.toLowerCase().indexOf(q)<0&&r.plate.toLowerCase().indexOf(q)<0&&r.fac.toLowerCase().indexOf(q)<0)return false;}
    return true;
  });

  var html='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;align-items:center">'
    +'<select id="mn-ff" class="mn-sel"><option value="">Todas facilities</option>'
    +FACS.map(function(f){return '<option value="'+f+'"'+(S.ff===f?' selected':'')+'>'+f+'</option>';}).join('')
    +'</select>'
    +'<select id="mn-fs" class="mn-sel"><option value="">Todos status</option>'
    +'<option value="acaminho"'+(S.fs==='acaminho'?' selected':'')+'>🚛 A Caminho</option>'
    +'<option value="pendente"'+(S.fs==='pendente'?' selected':'')+'>🟡 Pendente</option>'
    +'<option value="emrota"'+(S.fs==='emrota'?' selected':'')+'>🔵 Em Rota</option>'
    +'<option value="encerrada"'+(S.fs==='encerrada'?' selected':'')+'>✅ Encerrada</option>'
    +'<option value="retornando"'+(S.fs==='retornando'?' selected':'')+'>🔄 Retornando</option>'
    +'<option value="recusou"'+(S.fs==='recusou'?' selected':'')+'>🔴 Recusou</option>'
    +'<option value="cancelado"'+(S.fs==='cancelado'?' selected':'')+'>⚫ Cancelado</option>'
    +'</select>'
    +'<select id="mn-fc" class="mn-sel"><option value="">Todos ciclos</option>'
    +'<option value="CHP"'+(S.fc==='CHP'?' selected':'')+'>CHP</option>'
    +'<option value="AM1"'+(S.fc==='AM1'?' selected':'')+'>AM</option>'
    +'<option value="PM1"'+(S.fc==='PM1'?' selected':'')+'>PM</option>'
    +'<option value="SD"'+(S.fc==='SD'?' selected':'')+'>SD</option>'
    +'</select>'
    +'<input id="mn-ft" class="mn-inp" placeholder="🔍 Buscar..." value="'+S.ft+'">'
    +'<span style="font-size:12px;color:#506070">'+rows.length+' rotas</span>'
    +'</div>';

  // KPIs
  var total=rows.length;
  var emrota=rows.filter(function(r){return r.status==='emrota';}).length;
  var pendente=rows.filter(function(r){return r.status==='pendente'||r.status==='acaminho';}).length;
  var encerrada=rows.filter(function(r){return r.status==='encerrada';}).length;
  var recusou=rows.filter(function(r){return r.status==='recusou';}).length;
  var cancelado=rows.filter(function(r){return r.status==='cancelado';}).length;
  var kangu=rows.filter(function(r){return !!S.kangu[r.tid];}).length;
  var atrasado=rows.filter(function(r){return late(r.eta,r.status);}).length;

  html+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">'
    +'<div class="mn-kpi"><div class="v">'+total+'</div><div class="l">Total</div></div>'
    +'<div class="mn-kpi" style="border-color:rgba(0,180,255,.3)"><div class="v" style="color:#00b4ff">'+emrota+'</div><div class="l">Em Rota</div></div>'
    +'<div class="mn-kpi" style="border-color:rgba(255,204,0,.3)"><div class="v" style="color:#ffcc00">'+pendente+'</div><div class="l">Pendente</div></div>'
    +'<div class="mn-kpi" style="border-color:rgba(0,255,136,.3)"><div class="v" style="color:#00ff88">'+encerrada+'</div><div class="l">Encerrada</div></div>'
    +'<div class="mn-kpi" style="border-color:rgba(255,140,0,.3)"><div class="v" style="color:#ff8c00">'+atrasado+'</div><div class="l">Atrasados</div></div>'
    +'<div class="mn-kpi" style="border-color:rgba(255,51,102,.3)"><div class="v" style="color:#ff3366">'+recusou+'</div><div class="l">Recusou</div></div>'
    +'<div class="mn-kpi" style="border-color:rgba(100,120,140,.3)"><div class="v" style="color:#8090a8">'+cancelado+'</div><div class="l">Cancelado</div></div>'
    +'<div class="mn-kpi" style="border-color:rgba(123,97,255,.3)"><div class="v" style="color:#7b61ff">'+kangu+'</div><div class="l">Kangu</div></div>'
    +'</div>';

  // TABELA
  html+='<div style="overflow-x:auto"><table class="mn-tbl"><thead><tr>'
    +'<th>Facility</th><th>Carrier</th><th>Driver</th><th>Placa</th><th>Ciclo</th><th>ETA</th><th>Pacotes</th><th>Status</th><th>Alerta</th><th>Kangu</th>'
    +'</tr></thead><tbody>';

  rows.forEach(function(r){
    var isLate=late(r.eta,r.status);
    var isKangu=!!S.kangu[r.tid];
    html+='<tr>'
      +'<td><strong style="color:#00d4ff">'+r.fac+'</strong></td>'
      +'<td style="max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+r.carrier+'">'+r.carrier+'</td>'
      +'<td style="font-weight:600">'+r.driver+'</td>'
      +'<td><code style="color:#00ff88;font-size:11px">'+r.plate+'</code></td>'
      +'<td><span style="background:rgba(0,212,255,.12);color:#00d4ff;padding:1px 7px;border-radius:6px;font-size:11px">'+r.cycle+'</span></td>'
      +'<td style="font-weight:600;color:#ffcc00">'+r.eta+'</td>'
      +'<td style="font-size:11px;color:#8090a8">'+r.total+' 📦 / '+r.delivered+' ✅ / '+r.pending+' ⏳</td>'
      +'<td>'+badgeStatus(r.status,isLate)+'</td>'
      +'<td>'+(isLate?'<span class="mn-bx mn-bo">⚠️</span>':r.status==='emrota'?'<span style="color:#00ff88">✅</span>':'—')+'</td>'
      +'<td><button class="mn-btn sm '+(isKangu?'k':'')+'" data-tid="'+r.tid+'" data-kangu="1">'+(isKangu?'🦘 Kangu':'🦘')+'</button></td>'
      +'</tr>';
  });

  html+='</tbody></table></div>';
  body.innerHTML=html;

  // EVENTOS FILTROS
  body.querySelector('#mn-ff').onchange=function(){S.ff=this.value;renderBody();};
  body.querySelector('#mn-fs').onchange=function(){S.fs=this.value;renderBody();};
  body.querySelector('#mn-fc').onchange=function(){S.fc=this.value;renderBody();};
  body.querySelector('#mn-ft').oninput=function(){S.ft=this.value;renderBody();};

  // EVENTO KANGU
  body.querySelectorAll('[data-kangu="1"]').forEach(function(btn){
    btn.onclick=function(){
      var tid=this.dataset.tid;
      if(S.kangu[tid])delete S.kangu[tid];else S.kangu[tid]=1;
      sk();renderBody();
    };
  });
}

function renderEscala(body){
  var today=S.rows.filter(function(r){return r.date===S.date;});
  // Apenas rotas com driver e que não sejam canceladas/recusadas
  var rows=today.filter(function(r){
    return r.driver&&r.status!=='cancelado'&&r.status!=='recusou';
  });

  // Agrupa por ciclo depois por ETA
  var ciclos=['CHP','AM1','PM1','SD'];
  var cicloLabel={'CHP':'CHP/AM0','AM1':'AM','PM1':'PM','SD':'SD'};

  if(rows.length===0){
    body.innerHTML='<div style="color:#506070;padding:30px;text-align:center">Nenhum driver encontrado.</div>';
    return;
  }

  var html='<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">'
    +'<button class="mn-btn g" id="mn-cp-escala-completa">📋 Copiar Escala Completa</button>'
    +'</div>';

  ciclos.forEach(function(ciclo){
    var cicloRows=rows.filter(function(r){return r.cycle===ciclo;});
    if(!cicloRows.length)return;

    // Agrupa por ETA
    var groups={};
    cicloRows.forEach(function(r){
      var k=r.eta||'Sem ETA';
      if(!groups[k])groups[k]=[];
      groups[k].push(r);
    });

    var keys=Object.keys(groups).sort(function(a,b){
      return (e2m(a)||9999)-(e2m(b)||9999);
    });

    html+='<div style="background:rgba(13,21,37,.8);border:1px solid rgba(0,212,255,.15);border-radius:12px;margin-bottom:12px;overflow:hidden">';
    html+='<div style="background:rgba(0,212,255,.08);padding:10px 16px;display:flex;align-items:center;justify-content:space-between">'
      +'<span style="font-size:14px;font-weight:700;color:#00d4ff">'+cicloLabel[ciclo]+'</span>'
      +'<span style="font-size:11px;color:#506070">'+cicloRows.length+' drivers</span>'
      +'</div>';

    keys.forEach(function(eta){
      var drivers=groups[eta].slice().sort(function(a,b){return a.driver.localeCompare(b.driver);});
      var subiram=drivers.filter(function(d){return d.status==='emrota'||d.status==='encerrada';}).length;
      var atrasados=drivers.filter(function(d){return late(d.eta,d.status);}).length;

      html+='<div style="padding:10px 16px;border-top:1px solid rgba(0,212,255,.08)">';
      html+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
        +'<div style="display:flex;align-items:center;gap:8px">'
        +'<span style="font-size:13px;font-weight:700;color:#ffcc00">⏰ '+eta+'</span>'
        +'<span style="font-size:11px;color:#506070">'+drivers.length+' drivers</span>'
        +(subiram?'<span class="mn-bx mn-bg" style="font-size:10px">✅ '+subiram+' subiram</span>':'')
        +(atrasados?'<span class="mn-bx mn-bo" style="font-size:10px">⚠️ '+atrasados+' atrasados</span>':'')
        +'</div>'
        +'<button class="mn-btn g sm" data-copy-eta="'+eta+'" data-copy-ciclo="'+ciclo+'">📋 Copiar</button>'
        +'</div>';

      drivers.forEach(function(d,i){
        var isLate=late(d.eta,d.status);
        var ic=d.status==='emrota'||d.status==='encerrada'?'✅':isLate?'⚠️':'⏳';
        var cor=d.status==='emrota'||d.status==='encerrada'?'#00ff88':isLate?'#ff8c00':'#c0d0e8';
        var isKangu=!!S.kangu[d.tid];
        html+='<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.03)">'
          +'<span style="color:#506070;font-size:11px;min-width:20px">'+(i+1)+'.</span>'
          +'<span style="font-size:13px">'+ic+'</span>'
          +'<span style="font-weight:600;color:'+cor+';flex:1">'+d.driver+'</span>'
          +'<span style="font-size:11px;color:#00d4ff">'+d.fac+'</span>'
          +(isKangu?'<span class="mn-bx mn-bk" style="font-size:10px">🦘</span>':'')
          +'</div>';
      });

      html+='</div>';
    });

    // Botão copiar ciclo completo
    html+='<div style="padding:8px 16px;border-top:1px solid rgba(0,212,255,.08)">'
      +'<button class="mn-btn y sm" data-copy-ciclo-all="'+ciclo+'">📋 Copiar '+cicloLabel[ciclo]+' completo</button>'
      +'</div>';

    html+='</div>';
  });

  body.innerHTML=html;

  // COPIAR POR ETA
  body.querySelectorAll('[data-copy-eta]').forEach(function(btn){
    btn.onclick=function(){
      var eta=this.dataset.copyEta;
      var ciclo=this.dataset.copyCiclo;
      var label=cicloLabel[ciclo]||ciclo;
      var drivers=rows.filter(function(r){return r.cycle===ciclo&&(r.eta||'Sem ETA')===eta;})
        .sort(function(a,b){return a.driver.localeCompare(b.driver);});
      var lines=['Segue escala do *'+label+'*:',''];
      drivers.forEach(function(d,i){
        lines.push((i+1)+' - '+d.driver);
      });
      cp(lines.join('\n'),'Escala '+label+' '+eta);
    };
  });

  // COPIAR CICLO COMPLETO
  body.querySelectorAll('[data-copy-ciclo-all]').forEach(function(btn){
    btn.onclick=function(){
      var ciclo=this.dataset.copyCicloAll;
      var label=cicloLabel[ciclo]||ciclo;
      var cicloRows=rows.filter(function(r){return r.cycle===ciclo;});
      var groups={};
      cicloRows.forEach(function(r){
        var k=r.eta||'Sem ETA';
        if(!groups[k])groups[k]=[];
        groups[k].push(r);
      });
      var keys=Object.keys(groups).sort(function(a,b){return (e2m(a)||9999)-(e2m(b)||9999);});
      var lines=['Segue escala do *'+label+'*:',''];
      keys.forEach(function(eta){
        var drivers=groups[eta].slice().sort(function(a,b){return a.driver.localeCompare(b.driver);});
        if(keys.length>1)lines.push('⏰ *'+eta+'*');
        drivers.forEach(function(d,i){lines.push((i+1)+' - '+d.driver);});
        lines.push('');
      });
      cp(lines.join('\n'),'Escala '+label+' completa');
    };
  });

  // COPIAR ESCALA COMPLETA
  body.querySelector('#mn-cp-escala-completa').onclick=function(){
    var lines=[];
    ciclos.forEach(function(ciclo){
      var cicloRows=rows.filter(function(r){return r.cycle===ciclo;});
      if(!cicloRows.length)return;
      var label=cicloLabel[ciclo]||ciclo;
      var groups={};
      cicloRows.forEach(function(r){
        var k=r.eta||'Sem ETA';
        if(!groups[k])groups[k]=[];
        groups[k].push(r);
      });
      var keys=Object.keys(groups).sort(function(a,b){return (e2m(a)||9999)-(e2m(b)||9999);});
      lines.push('Segue escala do *'+label+'*:');
      lines.push('');
      keys.forEach(function(eta){
        var drivers=groups[eta].slice().sort(function(a,b){return a.driver.localeCompare(b.driver);});
        if(keys.length>1)lines.push('⏰ *'+eta+'*');
        drivers.forEach(function(d,i){lines.push((i+1)+' - '+d.driver);});
        lines.push('');
      });
    });
    cp(lines.join('\n'),'Escala completa');
  };
} 

function renderFechamento(body){
  var hoje=S.date;
  var todayRows=S.rows.filter(function(r){return r.date===hoje;});
  var otherRows=S.rows.filter(function(r){return r.date!==hoje;});

  // Exclui "atribuídas" (acaminho) do fechamento
  var rows=todayRows.filter(function(r){return r.status!=='acaminho';});

  var total=rows.length;
  var emrota=rows.filter(function(r){return r.status==='emrota';}).length;
  var pendente=rows.filter(function(r){return r.status==='pendente';}).length;
  var encerrada=rows.filter(function(r){return r.status==='encerrada';}).length;
  var retornando=rows.filter(function(r){return r.status==='retornando';}).length;
  var recusou=rows.filter(function(r){return r.status==='recusou';}).length;
  var cancelado=rows.filter(function(r){return r.status==='cancelado';}).length;
  var atrasado=rows.filter(function(r){return late(r.eta,r.status);}).length;
  var kanguRows=rows.filter(function(r){return !!S.kangu[r.tid];});
  var totalPacotes=rows.reduce(function(s,r){return s+r.total;},0);
  var totalEntregues=rows.reduce(function(s,r){return s+r.delivered;},0);
  var totalPendPac=rows.reduce(function(s,r){return s+r.pending;},0);
  var totalFailed=rows.reduce(function(s,r){return s+r.failed;},0);

  // Rotas outros dias
  var outrosAbertos=otherRows.filter(function(r){return r.status==='emrota'||r.status==='pendente';}).length;
  var outrosEncerrados=otherRows.filter(function(r){return r.status==='encerrada';}).length;

  var html='';

  // KPIs
  html+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">'
    +'<div class="mn-kpi"><div class="v">'+total+'</div><div class="l">Total Rotas</div></div>'
    +'<div class="mn-kpi" style="border-color:rgba(0,180,255,.3)"><div class="v" style="color:#00b4ff">'+emrota+'</div><div class="l">Em Rota</div></div>'
    +'<div class="mn-kpi" style="border-color:rgba(255,204,0,.3)"><div class="v" style="color:#ffcc00">'+pendente+'</div><div class="l">Pendente</div></div>'
    +'<div class="mn-kpi" style="border-color:rgba(0,255,136,.3)"><div class="v" style="color:#00ff88">'+encerrada+'</div><div class="l">Encerradas</div></div>'
    +'<div class="mn-kpi" style="border-color:rgba(255,140,0,.3)"><div class="v" style="color:#ff8c00">'+atrasado+'</div><div class="l">Atrasados</div></div>'
    +'<div class="mn-kpi" style="border-color:rgba(255,51,102,.3)"><div class="v" style="color:#ff3366">'+recusou+'</div><div class="l">Recusou</div></div>'
    +'<div class="mn-kpi" style="border-color:rgba(100,120,140,.3)"><div class="v" style="color:#8090a8">'+cancelado+'</div><div class="l">Cancelado</div></div>'
    +'<div class="mn-kpi" style="border-color:rgba(123,97,255,.3)"><div class="v" style="color:#7b61ff">'+kanguRows.length+'</div><div class="l">Kangu</div></div>'
    +'</div>';

  // Pacotes
  html+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">'
    +'<div class="mn-kpi"><div class="v">'+totalPacotes+'</div><div class="l">Total Pacotes</div></div>'
    +'<div class="mn-kpi" style="border-color:rgba(0,255,136,.3)"><div class="v" style="color:#00ff88">'+totalEntregues+'</div><div class="l">Entregues</div></div>'
    +'<div class="mn-kpi" style="border-color:rgba(255,204,0,.3)"><div class="v" style="color:#ffcc00">'+totalPendPac+'</div><div class="l">Pendentes</div></div>'
    +'<div class="mn-kpi" style="border-color:rgba(255,51,102,.3)"><div class="v" style="color:#ff3366">'+totalFailed+'</div><div class="l">Insucessos</div></div>'
    +'</div>';

  // Rotas outros dias
  if(otherRows.length>0){
    html+='<div style="background:rgba(255,140,0,.08);border:1px solid rgba(255,140,0,.3);border-radius:10px;padding:12px 16px;margin-bottom:14px">'
      +'<div style="font-size:12px;font-weight:700;color:#ff8c00;margin-bottom:6px">⚠️ Rotas de outros dias</div>'
      +'<div style="font-size:12px;color:#c0d0e8">'
      +'🔴 Abertas/Pendentes: <strong style="color:#ff8c00">'+outrosAbertos+'</strong>'
      +' &nbsp;|&nbsp; ✅ Encerradas: <strong style="color:#00ff88">'+outrosEncerrados+'</strong>'
      +'</div></div>';
  }

  // Tabela por facility
  var byFac={};
  rows.forEach(function(r){
    if(!byFac[r.fac])byFac[r.fac]={fac:r.fac,total:0,emrota:0,pendente:0,encerrada:0,recusou:0,cancelado:0,atrasado:0,kangu:0,pacotes:0,entregues:0};
    var f=byFac[r.fac];
    f.total++;f.pacotes+=r.total;f.entregues+=r.delivered;
    if(r.status==='emrota')f.emrota++;
    else if(r.status==='pendente')f.pendente++;
    else if(r.status==='encerrada')f.encerrada++;
    else if(r.status==='recusou')f.recusou++;
    else if(r.status==='cancelado')f.cancelado++;
    if(late(r.eta,r.status))f.atrasado++;
    if(S.kangu[r.tid])f.kangu++;
  });

  html+='<div style="overflow-x:auto;margin-bottom:16px"><table class="mn-tbl"><thead><tr>'
    +'<th>Facility</th><th>Total</th><th>🔵 Em Rota</th><th>🟡 Pendente</th>'
    +'<th>✅ Encerrada</th><th>⚠️ Atrasado</th><th>🔴 Recusou</th><th>⚫ Cancel.</th>'
    +'<th>🦘 Kangu</th><th>📦 Pacotes</th><th>✅ Entreg.</th>'
    +'</tr></thead><tbody>';

  Object.values(byFac).sort(function(a,b){return a.fac.localeCompare(b.fac);}).forEach(function(f){
    html+='<tr>'
      +'<td><strong style="color:#00d4ff">'+f.fac+'</strong></td>'
      +'<td>'+f.total+'</td>'
      +'<td style="color:#00b4ff">'+f.emrota+'</td>'
      +'<td style="color:#ffcc00">'+f.pendente+'</td>'
      +'<td style="color:#00ff88">'+f.encerrada+'</td>'
      +'<td style="color:#ff8c00">'+(f.atrasado||'—')+'</td>'
      +'<td style="color:#ff3366">'+(f.recusou||'—')+'</td>'
      +'<td style="color:#8090a8">'+(f.cancelado||'—')+'</td>'
      +'<td style="color:#7b61ff">'+(f.kangu||'—')+'</td>'
      +'<td>'+f.pacotes+'</td>'
      +'<td style="color:#00ff88">'+f.entregues+'</td>'
      +'</tr>';
  });
  html+='</tbody></table></div>';

  // Botões
  html+='<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px">'
    +'<button class="mn-btn g" id="mn-cp-fechamento">📦 Copiar Report Fechamento</button>'
    +'<button class="mn-btn k" id="mn-cp-kangu">🦘 Copiar Alerta Kangu</button>'
    +'<button class="mn-btn r" id="mn-cp-chao">🔴 Rotas no Chão</button>'
    +'</div>';

  body.innerHTML=html;

  // REPORT FECHAMENTO
  body.querySelector('#mn-cp-fechamento').onclick=function(){
    var now=new Date();
    var hora=pad(now.getHours())+':'+pad(now.getMinutes());
    var lines=[
      '📦 *FECHAMENTO — '+br(S.date)+'*',
      '_Gerado às '+hora+'_',
      '━━━━━━━━━━━━━━━━━━━━','',
      '🔢 *Total Rotas:* '+total,
      '🔵 *Em Rota:* '+emrota,
      '🟡 *Pendentes:* '+pendente,
      '✅ *Encerradas:* '+encerrada,
      '⚠️ *Atrasados:* '+atrasado,
      '🔴 *Recusaram:* '+recusou,
      '⚫ *Cancelados:* '+cancelado,
      '🦘 *Kangu:* '+kanguRows.length,
      '',
      '📦 *Pacotes:* '+totalPacotes,
      '✅ *Entregues:* '+totalEntregues,
      '⏳ *Pendentes:* '+totalPendPac,
      '🔴 *Insucessos:* '+totalFailed,
      '',
      '━━━━━━━━━━━━━━━━━━━━',
      '*📊 Por Facility:*',''
    ];
    Object.values(byFac).sort(function(a,b){return a.fac.localeCompare(b.fac);}).forEach(function(f){
      lines.push('🏭 *'+f.fac+'*');
      lines.push('   Total: '+f.total+' | 🔵'+f.emrota+' 🟡'+f.pendente+' ✅'+f.encerrada+' 🔴'+f.recusou+(f.kangu?' 🦘'+f.kangu:''));
      lines.push('   📦 '+f.pacotes+' pacotes | ✅ '+f.entregues+' entregues');
      lines.push('');
    });
    if(outrosAbertos>0){
      lines.push('━━━━━━━━━━━━━━━━━━━━');
      lines.push('⚠️ *Rotas de outros dias em aberto:* '+outrosAbertos);
      lines.push('');
    }
    cp(lines.join('\n'),'Report fechamento');
  };

  // ALERTA KANGU
  body.querySelector('#mn-cp-kangu').onclick=function(){
    if(!kanguRows.length){toast('ℹ️ Nenhuma rota Kangu marcada.');return;}
    var lines=['🦘 *ROTAS KANGU — '+br(S.date)+'*','━━━━━━━━━━━━━━━━━━━━',''];
    kanguRows.forEach(function(r){
      lines.push('• Travel '+r.tid+' | *'+r.fac+'* | ETA: '+r.eta);
      lines.push('  Carrier: '+r.carrier+(r.driver?' | Driver: '+r.driver:'')+(r.plate?' | '+r.plate:''));
      lines.push('  Status: '+r.status);
      lines.push('');
    });
    lines.push('_Total: '+kanguRows.length+' rota(s) Kangu_');
    cp(lines.join('\n'),'Alerta Kangu');
  };

  // ROTAS NO CHÃO
  body.querySelector('#mn-cp-chao').onclick=function(){
    var chao=rows.filter(function(r){return r.status==='pendente'||r.status==='recusou';});
    if(!chao.length){toast('ℹ️ Nenhuma rota no chão.');return;}
    var byF={};
    chao.forEach(function(r){
      if(!byF[r.fac])byF[r.fac]=[];
      byF[r.fac].push(r);
    });
    var lines=['🔴 *ROTAS NO CHÃO — '+br(S.date)+'*','━━━━━━━━━━━━━━━━━━━━',''];
    Object.keys(byF).sort().forEach(function(fac){
      lines.push('🏭 *'+fac+'* ('+byF[fac].length+')');
      byF[fac].forEach(function(r,i){
        lines.push((i+1)+'. '+(r.driver||'Sem driver')+' | ETA: '+r.eta+' | '+r.status.toUpperCase());
      });
      lines.push('');
    });
    lines.push('_Total: '+chao.length+' rota(s) no chão_');
    cp(lines.join('\n'),'Rotas no chão');
  };
}

function renderTurno(body){
  var hoje=S.date;
  var rows=S.rows.filter(function(r){return r.date===hoje;});

  // Pendentes de subir = pendente ou acaminho COM driver
  var pendentes=rows.filter(function(r){
    return (r.status==='pendente'||r.status==='acaminho')&&r.driver;
  });

  // Kangu pendente = kangu marcado e não encerrado
  var kanguPend=rows.filter(function(r){
    return S.kangu[r.tid]&&r.status!=='encerrada'&&r.status!=='cancelado';
  });

  // Agrupa pendentes por facility
  var byFac={};
  pendentes.forEach(function(r){
    if(!byFac[r.fac])byFac[r.fac]=[];
    byFac[r.fac].push(r);
  });

  // Stats gerais
  var emrota=rows.filter(function(r){return r.status==='emrota';}).length;
  var encerrada=rows.filter(function(r){return r.status==='encerrada';}).length;
  var recusou=rows.filter(function(r){return r.status==='recusou';}).length;
  var total=rows.filter(function(r){return r.status!=='acaminho';}).length;

  var now=new Date();
  var hora=pad(now.getHours())+':'+pad(now.getMinutes());

  var html='<div style="display:flex;gap:8px;margin-bottom:14px">'
    +'<button class="mn-btn g" id="mn-cp-turno">📋 Copiar Passagem de Turno</button>'
    +'</div>';

  // Preview
  html+='<div style="background:rgba(13,21,37,.9);border:1px solid rgba(0,212,255,.2);border-radius:12px;padding:16px;font-size:12px;line-height:1.8;color:#c0d0e8;white-space:pre-wrap;font-family:monospace">';

  html+='<span style="color:#00d4ff;font-weight:700">🔄 PASSAGEM DE TURNO T1 → T2</span>\n';
  html+='<span style="color:#506070">📅 '+br(hoje)+' | '+hora+'</span>\n\n';

  html+='<span style="color:#ffcc00;font-weight:700">📊 RESUMO DO TURNO</span>\n';
  html+='Total Rotas: '+total+'\n';
  html+='🔵 Em Rota: '+emrota+'\n';
  html+='✅ Encerradas: '+encerrada+'\n';
  html+='🔴 Recusaram: '+recusou+'\n\n';

  if(Object.keys(byFac).length>0){
    html+='<span style="color:#ff8c00;font-weight:700">⏳ PENDENTES DE SUBIR ROTA</span>\n';
    Object.keys(byFac).sort().forEach(function(fac){
      var drivers=byFac[fac].sort(function(a,b){return a.driver.localeCompare(b.driver);});
      html+='<span style="color:#00d4ff">🏭 '+fac+':</span> '+drivers.length+'\n';
      drivers.forEach(function(d,i){
        html+='  '+(i+1)+' - '+d.driver+(d.eta?' (ETA: '+d.eta+')':'')+'\n';
      });
      html+='\n';
    });
  }else{
    html+='<span style="color:#00ff88">✅ Nenhum motorista pendente de subir rota!</span>\n\n';
  }

  if(kanguPend.length>0){
    html+='<span style="color:#7b61ff;font-weight:700">🦘 KANGU PENDENTE</span>\n';
    var kByFac={};
    kanguPend.forEach(function(r){
      if(!kByFac[r.fac])kByFac[r.fac]=[];
      kByFac[r.fac].push(r);
    });
    Object.keys(kByFac).sort().forEach(function(fac){
      html+='<span style="color:#00d4ff">🏭 '+fac+':</span> '+kByFac[fac].length+' rota(s)\n';
      kByFac[fac].forEach(function(r){
        html+='  • Travel '+r.tid+(r.driver?' | '+r.driver:'')+(r.eta?' | ETA: '+r.eta:'')+'\n';
      });
    });
    html+='\n';
  }else{
    html+='<span style="color:#00ff88">✅ Nenhuma rota Kangu pendente.</span>\n\n';
  }

  html+='<span style="color:#506070;font-size:11px">_Monitor Nodos | '+hora+'_</span>';
  html+='</div>';

  body.innerHTML=html;

  // COPIAR
  body.querySelector('#mn-cp-turno').onclick=function(){
    var lines=[
      '🔄 *PASSAGEM DE TURNO T1 → T2*',
      '📅 '+br(hoje)+' | '+hora,
      '',
      '📊 *RESUMO DO TURNO*',
      'Total Rotas: '+total,
      '🔵 Em Rota: '+emrota,
      '✅ Encerradas: '+encerrada,
      '🔴 Recusaram: '+recusou,
      ''
    ];

    if(Object.keys(byFac).length>0){
      lines.push('⏳ *PENDENTES DE SUBIR ROTA*');
      Object.keys(byFac).sort().forEach(function(fac){
        var drivers=byFac[fac].sort(function(a,b){return a.driver.localeCompare(b.driver);});
        lines.push('🏭 *'+fac+':* '+drivers.length);
        drivers.forEach(function(d,i){
          lines.push((i+1)+' - '+d.driver+(d.eta?' (ETA: '+d.eta+')':''));
        });
        lines.push('');
      });
    }else{
      lines.push('✅ Nenhum motorista pendente de subir rota!');
      lines.push('');
    }

    if(kanguPend.length>0){
      lines.push('🦘 *KANGU PENDENTE*');
      var kByFac={};
      kanguPend.forEach(function(r){
        if(!kByFac[r.fac])kByFac[r.fac]=[];
        kByFac[r.fac].push(r);
      });
      Object.keys(kByFac).sort().forEach(function(fac){
        lines.push('🏭 *'+fac+':* '+kByFac[fac].length+' rota(s)');
        kByFac[fac].forEach(function(r){
          lines.push('• Travel '+r.tid+(r.driver?' | '+r.driver:'')+(r.eta?' | ETA: '+r.eta:''));
        });
        lines.push('');
      });
    }else{
      lines.push('✅ Nenhuma rota Kangu pendente.');
      lines.push('');
    }

    lines.push('_Monitor Nodos | '+hora+'_');
    cp(lines.join('\n'),'Passagem de turno');
  };
}

// ===================== INIT =====================
window.__MN_S__=S;
window.__MN_RENDER__=function(){renderBody();};
buildPanel();
})();