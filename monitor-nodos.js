(function(){'use strict';
var PID='__MN__',BID='__MN_BD__';
var FACS=['BRNRJ381','BRNRJ82','BRNRJ719','BRNRJ153','BRNRJ542','BRNRJ564','BRNRJ906','BRNRJ1510','BRNRJ1924','BRNRJ12663','BRNSP1335','BRNRJ122','BRNRJ12898'];
var ex=document.getElementById(PID);
if(ex){var bd2=document.getElementById(BID);var v=ex.style.display!=='none';ex.style.display=v?'none':'flex';if(bd2)bd2.style.display=v?'none':'block';return;}

var SHEET_URL='https://docs.google.com/spreadsheets/d/e/2PACX-1vS8NG_HVt-pRd1fAEyD9DGAicRCWMZ4DBpuJWS76o_UfwCKfqhefwq74znZqj0JpEVIMcyTzGj74bbn/pub?gid=1898881109&single=true&output=csv';

var FAC_ETA={
  'BRNSP1335':{'CHP':'09:30','AM1':'13:30'},
  'BRNRJ542': {'CHP':'09:30','AM1':'10:30','PM1':'14:30'},
  'BRNRJ12663':{'AM1':'10:30'},
  'BRNRJ1510': {'CHP':'09:30','AM1':'10:30'},
  'BRNRJ153':  {'CHP':'09:30','AM1':'10:30'},
  'BRNRJ381':  {'CHP':'09:30','AM1':'10:30','PM1':'14:30'},
  'BRNRJ564':  {'CHP':'09:30','AM1':'10:30'},
  'BRNRJ1924': {'CHP':'09:30','AM1':'10:30'},
  'BRNRJ82':   {'CHP':'09:30','AM1':'10:30'},
  'BRNRJ719':  {'CHP':'09:30','AM1':'10:30','PM1':'14:30'},
  'BRNRJ12898':{'AM1':'10:30'},
  'BRNRJ122':  {'CHP':'09:30'},
  'BRNRJ906':  {'CHP':'09:30','AM1':'10:30'}
};

var S={date:gd(),tab:'nodos',rows:[],loading:false,kangu:JSON.parse(localStorage.getItem('__nk__')||'{}'),ct:null,cd:60,ff:'',fs:'',fc:'',ft:'',plan:null,planLoading:false};

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
  navigator.clipboard.writeText(txt).then(function(){toast('✅ '+(label?label+' ':'')+'copiado!');});
}

function mapStatus(status,substatus){
  var st=String(status||'').toLowerCase();
  var sub=String(substatus||'').toLowerCase();
  if(st==='started')     return 'emrota';
  if(st==='accepted')    return 'pendente';
  if(st==='rejected')    return 'recusou';
  if(st==='canceled')    return 'cancelado';
  if(st==='finished'||st==='closed') return 'encerrada';
  if(sub==='on_way_destination_facility') return 'acaminho';
  if(sub==='at_destination_facility')     return 'pendente';
  if(st==='not_defined') return 'acaminho';
  return 'acaminho';
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

function etaToCiclo(eta){
  if(!eta||eta==='00:00')return '';
  var m=e2m(eta);
  if(m===null)return '';
  if(m < 9*60)  return 'CHP';
  if(m < 13*60) return 'AM1';
  if(m < 16 *60) return 'PM1';
  return 'SD';
}

async function fetchAll(){
  S.loading=true;renderBody();
  var base='https://envios.adminml.com/logistics/travel-management/api/schedules';
  try{
    var all=[],page=1,hasNext=true;
    while(hasNext&&page<=20){
      var resp=await fetch(base,{
        method:'POST',credentials:'include',
        headers:{'Accept':'application/json','Content-Type':'application/json'},
        body:JSON.stringify({
          page:page, per_page:100,
          date_lt_eq:S.date, date_gt_eq:S.date,
          eta_from:'', eta_to:'',
          carriers:[], created_by_apps:[], created_by_users:[],
          labels:[], origin_facilities:FACS,
          search:'', status:[],
          step_type:'last_mile',
          travel_ids:[], vehicles:[]
        })
      });
      var data=await resp.json();
      var routes=(data&&data.data)||[];
      all=all.concat(routes);
      hasNext=routes.length===100;
      page++;
    }

    S.rows=all.map(function(r){
      var assigned=r.assigned||{};
      var drivers=assigned.drivers||[];
      var vehicles=assigned.vehicles||[];
      var step=(r.steps&&r.steps[0])||{};
      var drv=drivers[0]||{};
      var veh=vehicles[0]||{};
      var driverName=(drv.first_name||drv.last_name)
        ?(drv.first_name+' '+drv.last_name).trim():'';
      var carrier=String(r.carrier_description||'');
      var fac=r.origin_facility_id||'';
      var tid=String(r.travel_id||'');
      var st=mapStatus(r.status,r.substatus||'');
      var vtype=String(r.service_description||'');
      var eta=(step.eta&&step.eta!=='00:00')?step.eta:'';
      var cycle=etaToCiclo(eta);
      // Kangu automático
      var autoKangu=carrier==='Kangu Logistics'&&vtype.toLowerCase().indexOf('utilitario')>=0;
      if(autoKangu&&!S.kangu[tid]){S.kangu[tid]=1;sk();}
      return {
        tid:tid,
        fac:fac,
        carrier:carrier,
        driver:driverName,
        plate:veh.license_plate||'',
        cycle:cycle,
        eta:eta,
        status:st,
        total:0,
        delivered:0,
        failed:0,
        pending:0,
        vtype:vtype,
        date:r.date||S.date,
        hasDriver:!!driverName
      };
    }).filter(function(r){
      return FACS.includes(r.fac);
    });

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
   +'.mn-kpi{background:rgba(0,212,255,.05);border:1px solid rgba(0,212,255,.18);border-radius:10px;padding:12px 14px;text-align:center;flex:1;min-width:80px}'
   +'.mn-kpi .v{font-size:24px;font-weight:700;color:#00d4ff;line-height:1}'
   +'.mn-kpi .l{font-size:10px;color:#506070;margin-top:3px;text-transform:uppercase;letter-spacing:.5px}'
   +'.mn-sel{background:rgba(255,255,255,.05);border:1px solid rgba(0,212,255,.2);border-radius:7px;color:#c0d0e8;padding:5px 8px;font-size:12px;outline:none}'
   +'.mn-inp{background:rgba(255,255,255,.05);border:1px solid rgba(0,212,255,.2);border-radius:7px;color:#c0d0e8;padding:5px 10px;font-size:12px;outline:none;width:150px}'
   +'.mn-grp{background:rgba(0,212,255,.07);border-left:3px solid #00d4ff;padding:8px 14px;border-radius:6px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between}'
   +'.mn-sp{width:18px;height:18px;border:2px solid rgba(0,212,255,.2);border-top-color:#00d4ff;border-radius:50%;animation:mn-spin .8s linear infinite}';
  document.head.appendChild(st);
}

async function fetchPlan(){
  S.planLoading=true;
  try{
    var hoje=gd();
    var ontem=ad(hoje,-1);
    function toBR(d){var p=d.split('-');return p[2]+'/'+p[1]+'/'+p[0];}
    var hojeStr=toBR(hoje);
    var ontemStr=toBR(ontem);

    var resp=await fetch(SHEET_URL+'&cachebust='+Date.now());
    var csv=await resp.text();
    var lines=csv.split('\n');
    var headers=lines[0].split(',').map(function(h){return h.trim().replace(/"/g,'').replace(/\r/g,'');});
    var iRoute=headers.indexOf('RTG_ROUTE_NAME');
    var iFac=headers.indexOf('nodo');
    var iShp=headers.indexOf('SHP_FACILITY_ID');
    var iData=headers.indexOf('data_sorting');
    var iSaca=headers.indexOf('saca');

    var plan={};

    lines.slice(1).forEach(function(line){
      if(!line.trim())return;
      var cols=line.split(',').map(function(c){return c.trim().replace(/"/g,'').replace(/\r/g,'');});
      var shp=cols[iShp]||'';
      if(shp!=='SRJ3')return;
      var fac=cols[iFac]||'';
      if(!FACS.includes(fac))return;
      var route=cols[iRoute]||'';
      var data=cols[iData]||'';
      var saca=parseInt(cols[iSaca])||0;

      // Detecta ciclo pelo prefixo
      var ciclo='';
      var r3=route.substring(0,3).toUpperCase();
      var r2=route.substring(0,2).toUpperCase();
      if(r3==='CHP') ciclo='CHP';
      else if(r3==='AM1'||r3==='AM2'||r3==='AM3'||r2==='AM') ciclo='AM1';
      else if(r3==='PM1'||r3==='PM2'||r3==='PM3'||r2==='PM') ciclo='PM1';
      else if(r2==='SD') ciclo='SD';
      if(!ciclo)return;

      // Valida data por ciclo
      var dataOk=false;
      if(ciclo==='CHP'&&(data===ontemStr||data===hojeStr)) dataOk=true;
      if((ciclo==='AM1'||ciclo==='PM1'||ciclo==='SD')&&data===hojeStr) dataOk=true;
      if(!dataOk)return;

      if(!plan[fac])plan[fac]={};
      if(!plan[fac][ciclo])plan[fac][ciclo]={rotas:0,sacas:0};
      plan[fac][ciclo].rotas++;
      plan[fac][ciclo].sacas+=saca;
    });

    // Separa CHP amanhã (pedidos feitos às 14h30 com data de hoje)
    S.planAmanha={};
    var amanha=ad(hoje,1);
    var amanhaStr=toBR(amanha);
    lines.slice(1).forEach(function(line){
      if(!line.trim())return;
      var cols=line.split(',').map(function(c){return c.trim().replace(/"/g,'').replace(/\r/g,'');});
      var shp=cols[iShp]||'';
      if(shp!=='SRJ3')return;
      var fac=cols[iFac]||'';
      if(!FACS.includes(fac))return;
      var route=cols[iRoute]||'';
      var data=cols[iData]||'';
      var saca=parseInt(cols[iSaca])||0;
      var r3=route.substring(0,3).toUpperCase();
      if(r3!=='CHP')return;
      if(data!==hojeStr)return; // CHP do amanhã vem com data de hoje às 14h30
      if(!S.planAmanha[fac])S.planAmanha[fac]={CHP:{rotas:0,sacas:0}};
      S.planAmanha[fac].CHP.rotas++;
      S.planAmanha[fac].CHP.sacas+=saca;
    });

    S.plan=plan;
    console.log('[MN Plan] OK:', Object.keys(plan).length,'facilities');
  }catch(e){console.error('[MN Plan]',e);S.plan={};}
  S.planLoading=false;
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

  var scan=document.createElement('div');scan.className='mn-scan';panel.appendChild(scan);

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

  var tabs=document.createElement('div');
  Object.assign(tabs.style,{display:'flex',gap:'6px',padding:'8px 14px',borderBottom:'1px solid rgba(0,212,255,.1)',flexShrink:'0',background:'rgba(0,0,0,.2)',overflowX:'auto'});
  tabs.innerHTML='<div class="mn-tab on" data-t="nodos">🛰️ Nodos</div>'
    +'<div class="mn-tab" data-t="escala">📋 Escala</div>'
    +'<div class="mn-tab" data-t="fechamento">📦 Fechamento</div>'
    +'<div class="mn-tab" data-t="turno">🔄 Passagem de Turno</div>'
    +'<div class="mn-tab" data-t="plan">📊 Planejamento</div>';
  panel.appendChild(tabs);

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
    body.style.display=minimized?'none':'block';
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
      prevStyle={width:panel.style.width,height:panel.style.height,top:panel.style.top,right:panel.style.right,left:panel.style.left,borderRadius:panel.style.borderRadius,maxWidth:panel.style.maxWidth};
      Object.assign(panel.style,{width:'100vw',height:'100vh',top:'0',left:'0',right:'0',maxWidth:'100vw',borderRadius:'0'});
    }else{
      Object.assign(panel.style,{width:prevStyle.width||'980px',height:prevStyle.height||'84vh',top:prevStyle.top||'40px',left:prevStyle.left||'auto',right:prevStyle.right||'30px',maxWidth:'96vw',borderRadius:'16px'});
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

  // TABS
  tabs.querySelectorAll('.mn-tab').forEach(function(t){
    t.addEventListener('click',function(){
      S.tab=t.dataset.t;
      tabs.querySelectorAll('.mn-tab').forEach(function(x){x.classList.remove('on');});
      t.classList.add('on');
      renderBody();
    });
  });

  updateDate();
  fetchPlan();
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
  else if(S.tab==='plan')renderPlan(body);
}

function renderPlan(body){
  if(S.planLoading){
    body.innerHTML='<div style="display:flex;align-items:center;gap:10px;color:#00d4ff;padding:40px;justify-content:center"><div class="mn-sp"></div><span>Carregando planilha...</span></div>';
    return;
  }
  if(!S.plan){
    fetchPlan().then(function(){renderPlan(body);});
    body.innerHTML='<div style="display:flex;align-items:center;gap:10px;color:#00d4ff;padding:40px;justify-content:center"><div class="mn-sp"></div><span>Carregando planilha...</span></div>';
    return;
  }

  var ciclos=['CHP','AM1','PM1','SD'];
  var cicloLabel={'CHP':'CHP','AM1':'AM','PM1':'PM','SD':'SD'};
  var hoje=gd();

  // Totais gerais por ciclo
  var totais={CHP:{rotas:0,sacas:0},AM1:{rotas:0,sacas:0},PM1:{rotas:0,sacas:0},SD:{rotas:0,sacas:0}};
  FACS.forEach(function(fac){
    var fp=S.plan[fac]||{};
    ciclos.forEach(function(c){
      if(fp[c]){totais[c].rotas+=fp[c].rotas;totais[c].sacas+=fp[c].sacas;}
    });
  });

  html+='<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center">'
  +'<button class="mn-btn g" id="mn-cp-plan-geral">Copiar Resumo Geral</button>'
  +'<button class="mn-btn y" id="mn-cp-plan-amanha">Copiar CHP Amanhã</button>'
  +'<button class="mn-btn" id="mn-ref-plan">Atualizar Planilha</button>'
  +'<span style="font-size:11px;color:#506070">Dados de '+br(hoje)+'</span>'
  +'</div>';

  // KPIs gerais
  html+='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">';
  ciclos.forEach(function(c){
    if(!totais[c].rotas)return;
    html+='<div class="mn-kpi" style="border-color:rgba(0,212,255,.3)">'
      +'<div class="v" style="color:#00d4ff">'+totais[c].rotas+'</div>'
      +'<div class="l">'+cicloLabel[c]+' rotas</div>'
      +'</div>'
      +'<div class="mn-kpi">'
      +'<div class="v" style="font-size:18px">'+totais[c].sacas+'</div>'
      +'<div class="l">'+cicloLabel[c]+' sacas</div>'
      +'</div>';
  });
  html+='</div>';

  // Por facility
  html+='<div style="display:flex;flex-direction:column;gap:10px">';
  FACS.forEach(function(fac){
    var fp=S.plan[fac]||{};
    var temRota=ciclos.some(function(c){return fp[c]&&fp[c].rotas>0;});
    var etaFac=FAC_ETA[fac]||{};

    // Ciclos sem rota
    var semRota=ciclos.filter(function(c){
      return etaFac[c]&&(!fp[c]||fp[c].rotas===0);
    });

    html+='<div style="background:rgba(13,21,37,.8);border:1px solid rgba(0,212,255,.15);border-radius:12px;overflow:hidden">';

    // Header facility
    html+='<div style="background:rgba(0,212,255,.08);padding:10px 16px;display:flex;align-items:center;justify-content:space-between">'
      +'<div style="display:flex;align-items:center;gap:10px">'
      +'<span style="font-size:13px;font-weight:700;color:#00d4ff">'+fac+'</span>'
      +(semRota.length?'<span style="background:rgba(255,140,0,.2);color:#ff8c00;font-size:10px;padding:2px 8px;border-radius:10px;font-weight:600">SEM '+semRota.map(function(c){return cicloLabel[c];}).join(', ')+'</span>':'')
      +'</div>'
      +'<button class="mn-btn g sm" data-cp-fac="'+fac+'">Copiar msg</button>'
      +'</div>';

    html+='<div style="padding:10px 16px;display:flex;gap:8px;flex-wrap:wrap">';
    ciclos.forEach(function(c){
      if(!etaFac[c])return;
      var d=fp[c]||{rotas:0,sacas:0};
      var cor=d.rotas>0?'#00d4ff':'#506070';
      var bg=d.rotas>0?'rgba(0,212,255,.08)':'rgba(255,255,255,.03)';
      var border=d.rotas>0?'rgba(0,212,255,.25)':'rgba(255,255,255,.06)';
      html+='<div style="background:'+bg+';border:1px solid '+border+';border-radius:10px;padding:10px 14px;min-width:110px;text-align:center">'
        +'<div style="font-size:11px;color:#506070;margin-bottom:2px">'+cicloLabel[c]+'</div>'
        +'<div style="font-size:22px;font-weight:700;color:'+cor+'">'+d.rotas+'</div>'
        +'<div style="font-size:10px;color:#506070">rotas</div>'
        +'<div style="font-size:12px;color:#ffcc00;margin-top:4px">'+d.sacas+' sacas</div>'
        +'<div style="font-size:10px;color:#506070;margin-top:2px">ETA '+etaFac[c]+'</div>'
        +'</div>';
    });
    html+='</div>';
    html+='</div>';
  });
  html+='</div>';

  body.innerHTML=html;

    // COPIAR CHP AMANHÃ
body.querySelector('#mn-cp-plan-amanha').onclick=function(){
  var amanha=ad(gd(),1);
  var lines=['Boa tarde!',''];
  var temAlgo=false;
  FACS.forEach(function(fac){
    var fp=S.planAmanha&&S.planAmanha[fac];
    if(!fp||!fp.CHP||!fp.CHP.rotas)return;
    lines.push('Para amanhã temos '+fp.CHP.rotas+' rotas no ciclo *CHP* — '+fac);
    temAlgo=true;
  });
  if(!temAlgo){
    // Resumo geral
    var totalCHP=0;
    FACS.forEach(function(fac){
      var fp=S.planAmanha&&S.planAmanha[fac];
      if(fp&&fp.CHP)totalCHP+=fp.CHP.rotas;
    });
    if(totalCHP===0){toast('Nenhum CHP de amanhã encontrado.');return;}
    lines.push('Para amanhã temos '+totalCHP+' rotas no ciclo *CHP*');
  }
  cp(lines.join('\n'),'CHP amanhã');
};

  // COPIAR POR FACILITY
  body.querySelectorAll('[data-cp-fac]').forEach(function(btn){
    btn.onclick=function(){
      var fac=this.dataset.cpFac;
      var fp=S.plan[fac]||{};
      var etaFac=FAC_ETA[fac]||{};
      var lines=['Bom dia!','','Para hoje temos:'];
      var temAlgo=false;
      ciclos.forEach(function(c){
        if(!etaFac[c])return;
        var d=fp[c]||{rotas:0,sacas:0};
        if(d.rotas===0)return;
        lines.push(d.rotas+' rotas no ciclo '+cicloLabel[c]+' - ETA '+etaFac[c]);
        temAlgo=true;
      });
      if(!temAlgo){toast('Sem rotas planejadas para '+fac);return;}
      cp(lines.join('\n'),'Planejamento '+fac);
    };
  });

  // Carrega planejamento ao abrir a aba
  if(!S.plan){
    fetchPlan().then(function(){renderPlan(body);});
  }
}

function renderNodos(body){
  var rows=S.rows.filter(function(r){return r.date===S.date;});
  rows=rows.filter(function(r){
    if(S.ff&&r.fac!==S.ff)return false;
    if(S.fs&&r.status!==S.fs)return false;
    if(S.fc&&r.cycle!==S.fc)return false;
    if(S.ft){var q=S.ft.toLowerCase();if(r.driver.toLowerCase().indexOf(q)<0&&r.carrier.toLowerCase().indexOf(q)<0&&r.plate.toLowerCase().indexOf(q)<0&&r.fac.toLowerCase().indexOf(q)<0)return false;}
    return true;
  });

  var all=S.rows.filter(function(r){return r.date===S.date;});
  var total=all.length;
  var emrota=all.filter(function(r){return r.status==='emrota';}).length;
  var pendente=all.filter(function(r){return r.status==='pendente';}).length;
  var acaminho=all.filter(function(r){return r.status==='acaminho';}).length;
  var encerrada=all.filter(function(r){return r.status==='encerrada';}).length;
  var recusou=all.filter(function(r){return r.status==='recusou';}).length;
  var cancelado=all.filter(function(r){return r.status==='cancelado';}).length;
  var atrasado=all.filter(function(r){return late(r.eta,r.status);}).length;
  var kangu=all.filter(function(r){return !!S.kangu[r.tid];}).length;

  var html='';

  // KPIs
  html+='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">'
    +'<div class="mn-kpi"><div class="v">'+total+'</div><div class="l">Total</div></div>'
    +'<div class="mn-kpi" style="border-color:rgba(0,212,255,.3)"><div class="v" style="color:#00d4ff">'+acaminho+'</div><div class="l">A Caminho</div></div>'
    +'<div class="mn-kpi" style="border-color:rgba(255,204,0,.3)"><div class="v" style="color:#ffcc00">'+pendente+'</div><div class="l">Pendente</div></div>'
    +'<div class="mn-kpi" style="border-color:rgba(0,180,255,.3)"><div class="v" style="color:#00b4ff">'+emrota+'</div><div class="l">Em Rota</div></div>'
    +'<div class="mn-kpi" style="border-color:rgba(0,255,136,.3)"><div class="v" style="color:#00ff88">'+encerrada+'</div><div class="l">Encerrada</div></div>'
    +'<div class="mn-kpi" style="border-color:rgba(255,140,0,.3)"><div class="v" style="color:#ff8c00">'+atrasado+'</div><div class="l">Atrasados</div></div>'
    +'<div class="mn-kpi" style="border-color:rgba(255,51,102,.3)"><div class="v" style="color:#ff3366">'+recusou+'</div><div class="l">Recusou</div></div>'
    +'<div class="mn-kpi" style="border-color:rgba(100,120,140,.3)"><div class="v" style="color:#8090a8">'+cancelado+'</div><div class="l">Cancelado</div></div>'
    +'<div class="mn-kpi" style="border-color:rgba(123,97,255,.3)"><div class="v" style="color:#7b61ff">'+kangu+'</div><div class="l">Kangu</div></div>'
    +'</div>';

  // FILTROS
  html+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;align-items:center">'
    +'<select id="mn-ff" class="mn-sel"><option value="">Todas facilities</option>'
    +FACS.map(function(f){return '<option value="'+f+'"'+(S.ff===f?' selected':'')+'>'+f+'</option>';}).join('')
    +'</select>'
    +'<select id="mn-fs" class="mn-sel"><option value="">Todos status</option>'
    +'<option value="acaminho"'+(S.fs==='acaminho'?' selected':'')+'>🚛 A Caminho</option>'
    +'<option value="pendente"'+(S.fs==='pendente'?' selected':'')+'>🟡 Pendente</option>'
    +'<option value="emrota"'+(S.fs==='emrota'?' selected':'')+'>🔵 Em Rota</option>'
    +'<option value="encerrada"'+(S.fs==='encerrada'?' selected':'')+'>✅ Encerrada</option>'
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
    +'<span style="font-size:12px;color:#506070">'+rows.length+' de '+total+' rotas</span>'
    +'</div>';

  // TABELA
  html+='<div style="overflow-x:auto"><table class="mn-tbl"><thead><tr>'
    +'<th>Facility</th><th>Carrier</th><th>Driver</th><th>Placa</th>'
    +'<th>Ciclo</th><th>ETA</th><th>Pacotes</th><th>Status</th><th>⚠️</th><th>Kangu</th>'
    +'</tr></thead><tbody>';

  if(rows.length===0){
    html+='<tr><td colspan="10" style="text-align:center;color:#506070;padding:30px;font-style:italic">Nenhuma rota encontrada.</td></tr>';
  }

  rows.forEach(function(r){
    var isLate=late(r.eta,r.status);
    var isKangu=!!S.kangu[r.tid];
    var rowBg=r.status==='recusou'?'background:rgba(255,51,102,.05);':r.status==='cancelado'?'background:rgba(100,120,140,.05);':isLate?'background:rgba(255,140,0,.05);':'';
    html+='<tr style="'+rowBg+'">'
      +'<td><strong style="color:#00d4ff">'+r.fac+'</strong></td>'
      +'<td style="max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px" title="'+r.carrier+'">'+r.carrier+'</td>'
      +'<td style="font-weight:600">'+r.driver+'</td>'
      +'<td><code style="color:#00ff88;font-size:11px">'+r.plate+'</code></td>'
      +'<td><span style="background:rgba(0,212,255,.12);color:#00d4ff;padding:1px 7px;border-radius:6px;font-size:11px">'+r.cycle+'</span></td>'
      +'<td style="font-weight:600;color:#ffcc00">'+r.eta+'</td>'
      +'<td style="font-size:11px;color:#8090a8">'+r.total+' 📦 '+r.delivered+' ✅ '+r.pending+' ⏳</td>'
      +'<td>'+badgeStatus(r.status,isLate)+'</td>'
      +'<td>'+(isLate?'<span class="mn-bx mn-bo" style="font-size:10px">⚠️</span>':r.status==='recusou'?'<span style="color:#ff3366;font-size:13px">🚫</span>':r.status==='cancelado'?'<span style="color:#8090a8;font-size:13px">⚫</span>':'')+'</td>'
      +'<td><button class="mn-btn sm '+(isKangu?'k':'')+'" data-tid="'+r.tid+'" data-kangu="1">'+(isKangu?'🦘':'🦘')+'</button></td>'
      +'</tr>';
  });

  html+='</tbody></table></div>';
  body.innerHTML=html;

  body.querySelector('#mn-ff').onchange=function(){S.ff=this.value;renderBody();};
  body.querySelector('#mn-fs').onchange=function(){S.fs=this.value;renderBody();};
  body.querySelector('#mn-fc').onchange=function(){S.fc=this.value;renderBody();};
  body.querySelector('#mn-ft').oninput=function(){S.ft=this.value;renderBody();};

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
  var rows=today.filter(function(r){
    return r.driver&&r.status!=='cancelado'&&r.status!=='recusou';
  });

  var ciclos=['CHP','AM1','PM1','SD'];
  var cicloLabel={'CHP':'CHP/AM0','AM1':'AM','PM1':'PM','SD':'SD'};

  if(!S.ef)S.ef='';
  if(!S.eff)S.eff='';
  if(!S.efc)S.efc='';

  var rowsFilt=rows.filter(function(r){
    if(S.efc&&r.cycle!==S.efc)return false;
    if(S.eff&&r.fac!==S.eff)return false;
    if(S.ef&&r.eta!==S.ef)return false;
    return true;
  });

  var html='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;align-items:center">'
    +'<select id="mn-efc" class="mn-sel"><option value="">Todos ciclos</option>'
    +'<option value="CHP"'+(S.efc==='CHP'?' selected':'')+'>CHP/AM0</option>'
    +'<option value="AM1"'+(S.efc==='AM1'?' selected':'')+'>AM</option>'
    +'<option value="PM1"'+(S.efc==='PM1'?' selected':'')+'>PM</option>'
    +'<option value="SD"'+(S.efc==='SD'?' selected':'')+'>SD</option>'
    +'</select>'
    +'<select id="mn-eff" class="mn-sel"><option value="">Todas facilities</option>'
    +FACS.map(function(f){return '<option value="'+f+'"'+(S.eff===f?' selected':'')+'>'+f+'</option>';}).join('')
    +'</select>'
    +'<select id="mn-ef" class="mn-sel"><option value="">Todos horários</option>';

  var etas={};
  rows.forEach(function(r){if(r.eta)etas[r.eta]=true;});
  Object.keys(etas).sort(function(a,b){return (e2m(a)||0)-(e2m(b)||0);}).forEach(function(eta){
    html+='<option value="'+eta+'"'+(S.ef===eta?' selected':'')+'>'+eta+'</option>';
  });
  html+='</select>'
    +'<span style="font-size:12px;color:#506070">'+rowsFilt.length+' drivers</span>'
    +'<button class="mn-btn g" id="mn-cp-escala-completa" style="margin-left:auto">📋 Escala Completa</button>'
    +'</div>';

  if(rowsFilt.length===0){
    html+='<div style="color:#506070;padding:30px;text-align:center">Nenhum driver encontrado.</div>';
    body.innerHTML=html;
    body.querySelector('#mn-efc').onchange=function(){S.efc=this.value;renderEscala(body);};
    body.querySelector('#mn-eff').onchange=function(){S.eff=this.value;renderEscala(body);};
    body.querySelector('#mn-ef').onchange=function(){S.ef=this.value;renderEscala(body);};
    body.querySelector('#mn-cp-escala-completa').onclick=function(){toast('ℹ️ Nenhum driver.');};
    return;
  }

  // Agrupa por CICLO → ETA → FACILITY
  var ciclosUsados=S.efc?[S.efc]:ciclos;
  ciclosUsados.forEach(function(ciclo){
    var cicloRows=rowsFilt.filter(function(r){return r.cycle===ciclo;});
    if(!cicloRows.length)return;
    var label=cicloLabel[ciclo]||ciclo;

    html+='<div style="background:rgba(13,21,37,.8);border:1px solid rgba(0,212,255,.15);border-radius:12px;margin-bottom:12px;overflow:hidden">';
    html+='<div style="background:rgba(0,212,255,.08);padding:10px 16px;display:flex;align-items:center;justify-content:space-between">'
      +'<div style="display:flex;align-items:center;gap:10px">'
      +'<span style="font-size:14px;font-weight:700;color:#00d4ff">'+label+'</span>'
      +'<span style="font-size:11px;color:#506070">'+cicloRows.length+' drivers</span>'
      +'</div>'
      +'<button class="mn-btn y sm" data-copy-ciclo-all="'+ciclo+'" data-copy-ciclo-label="'+label+'">📋 Copiar '+label+'</button>'
      +'</div>';

    // Agrupa por ETA
    var etaGroups={};
    cicloRows.forEach(function(r){
      var k=r.eta||'Sem ETA';
      if(!etaGroups[k])etaGroups[k]=[];
      etaGroups[k].push(r);
    });
    var etaKeys=Object.keys(etaGroups).sort(function(a,b){return (e2m(a)||9999)-(e2m(b)||9999);});

    etaKeys.forEach(function(eta){
      var etaRows=etaGroups[eta];

      // Agrupa por FACILITY dentro do ETA
      var facGroups={};
      etaRows.forEach(function(r){
        if(!facGroups[r.fac])facGroups[r.fac]=[];
        facGroups[r.fac].push(r);
      });
      var facKeys=Object.keys(facGroups).sort();

      facKeys.forEach(function(fac){
        var drivers=facGroups[fac].slice().sort(function(a,b){return a.driver.localeCompare(b.driver);});
        var subiram=drivers.filter(function(d){return d.status==='emrota'||d.status==='encerrada';}).length;
        var pendentes=drivers.filter(function(d){return d.status==='pendente';}).length;
        var atrasados=drivers.filter(function(d){return late(d.eta,d.status);}).length;

        html+='<div style="padding:10px 16px;border-top:1px solid rgba(0,212,255,.08)">';
        html+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
          +'<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">'
          +'<span style="font-size:13px;font-weight:700;color:#ffcc00">⏰ '+eta+'</span>'
          +'<span style="font-size:12px;font-weight:700;color:#00d4ff">'+fac+'</span>'
          +'<span style="font-size:11px;color:#506070">'+drivers.length+' drivers</span>'
          +(subiram?'<span class="mn-bx mn-bg" style="font-size:10px">✅ '+subiram+'</span>':'')
          +(pendentes?'<span class="mn-bx mn-by" style="font-size:10px">🟡 '+pendentes+'</span>':'')
          +(atrasados?'<span class="mn-bx mn-bo" style="font-size:10px">⚠️ '+atrasados+'</span>':'')
          +'</div>'
          +'<button class="mn-btn g sm" data-copy-eta="'+eta+'" data-copy-fac="'+fac+'" data-copy-ciclo="'+ciclo+'" data-copy-label="'+label+'">📋 Copiar</button>'
          +'</div>';

        drivers.forEach(function(d,i){
          var isLate=late(d.eta,d.status);
          var ic=d.status==='emrota'||d.status==='encerrada'?'✅':isLate?'⚠️':d.status==='pendente'?'🟡':'⏳';
          var cor=d.status==='emrota'||d.status==='encerrada'?'#00ff88':isLate?'#ff8c00':d.status==='pendente'?'#ffcc00':'#c0d0e8';
          var isKangu=!!S.kangu[d.tid];
          html+='<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.03)">'
            +'<span style="color:#506070;font-size:11px;min-width:22px;text-align:right">'+(i+1)+'.</span>'
            +'<span style="font-size:12px">'+ic+'</span>'
            +'<span style="font-weight:600;color:'+cor+';flex:1">'+d.driver+'</span>'
            +(isKangu?'<span class="mn-bx mn-bk" style="font-size:10px">🦘</span>':'')
            +'</div>';
        });
        html+='</div>';
      });
    });

    html+='</div>';
  });

  body.innerHTML=html;

  body.querySelector('#mn-efc').onchange=function(){S.efc=this.value;renderEscala(body);};
  body.querySelector('#mn-eff').onchange=function(){S.eff=this.value;renderEscala(body);};
  body.querySelector('#mn-ef').onchange=function(){S.ef=this.value;renderEscala(body);};

  // COPIAR POR ETA + FACILITY
  body.querySelectorAll('[data-copy-eta]').forEach(function(btn){
    btn.onclick=function(){
      var eta=this.dataset.copyEta;
      var fac=this.dataset.copyFac;
      var label=this.dataset.copyLabel;
      var drivers=rows.filter(function(r){
        return r.cycle===this.dataset.copyCiclo&&r.eta===eta&&r.fac===fac;
      }.bind(this)).sort(function(a,b){return a.driver.localeCompare(b.driver);});
      var lines=['Segue escala do *'+label+'* — '+fac+':',''];
      drivers.forEach(function(d,i){lines.push((i+1)+' - '+d.driver);});
      cp(lines.join('\n'),'Escala '+label+' '+eta+' '+fac);
    };
  });

  // COPIAR CICLO COMPLETO
  body.querySelectorAll('[data-copy-ciclo-all]').forEach(function(btn){
    btn.onclick=function(){
      var ciclo=this.dataset.copyCicloAll;
      var label=this.dataset.copyCicloLabel;
      var cicloRows=rows.filter(function(r){return r.cycle===ciclo;});
      var etaGroups={};
      cicloRows.forEach(function(r){
        var k=r.eta||'Sem ETA';
        if(!etaGroups[k])etaGroups[k]=[];
        etaGroups[k].push(r);
      });
      var etaKeys=Object.keys(etaGroups).sort(function(a,b){return (e2m(a)||9999)-(e2m(b)||9999);});
      var lines=['Segue a escala do *'+label+'*:',''];
      etaKeys.forEach(function(eta){
        var facGroups={};
        etaGroups[eta].forEach(function(r){
          if(!facGroups[r.fac])facGroups[r.fac]=[];
          facGroups[r.fac].push(r);
        });
        Object.keys(facGroups).sort().forEach(function(fac){
          var drivers=facGroups[fac].slice().sort(function(a,b){return a.driver.localeCompare(b.driver);});
          lines.push('⏰ *'+eta+'* — '+fac);
          drivers.forEach(function(d,i){lines.push((i+1)+' - '+d.driver);});
          lines.push('');
        });
      });
      cp(lines.join('\n'),'Escala '+label);
    };
  });

  // COPIAR ESCALA COMPLETA
  body.querySelector('#mn-cp-escala-completa').onclick=function(){
    var lines=[];
    ciclos.forEach(function(ciclo){
      var cicloRows=rows.filter(function(r){return r.cycle===ciclo;});
      if(!cicloRows.length)return;
      var label=cicloLabel[ciclo]||ciclo;
      lines.push('Segue escala do *'+label+'*:');
      lines.push('');
      var etaGroups={};
      cicloRows.forEach(function(r){
        var k=r.eta||'Sem ETA';
        if(!etaGroups[k])etaGroups[k]=[];
        etaGroups[k].push(r);
      });
      var etaKeys=Object.keys(etaGroups).sort(function(a,b){return (e2m(a)||9999)-(e2m(b)||9999);});
      etaKeys.forEach(function(eta){
        var facGroups={};
        etaGroups[eta].forEach(function(r){
          if(!facGroups[r.fac])facGroups[r.fac]=[];
          facGroups[r.fac].push(r);
        });
        Object.keys(facGroups).sort().forEach(function(fac){
          var drivers=facGroups[fac].slice().sort(function(a,b){return a.driver.localeCompare(b.driver);});
          lines.push('⏰ *'+eta+'* — '+fac);
          drivers.forEach(function(d,i){lines.push((i+1)+' - '+d.driver);});
          lines.push('');
        });
      });
    });
    cp(lines.join('\n'),'Escala completa');
  };
}

function renderFechamento(body){
  var hoje=S.date;
  var todayRows=S.rows.filter(function(r){return r.date===hoje;});
  var otherRows=S.rows.filter(function(r){return r.date!==hoje;});
  var rows=todayRows.filter(function(r){return r.status!=='acaminho';});

  var RESKEY='__mn_res__';
  var resolucoes=JSON.parse(localStorage.getItem(RESKEY)||'{}');

  var total=rows.length;
  var emrota=rows.filter(function(r){return r.status==='emrota';}).length;
  var pendente=rows.filter(function(r){return r.status==='pendente';}).length;
  var encerrada=rows.filter(function(r){return r.status==='encerrada';}).length;
  var recusou=rows.filter(function(r){return r.status==='recusou';}).length;
  var cancelado=rows.filter(function(r){return r.status==='cancelado';}).length;
  var atrasado=rows.filter(function(r){return late(r.eta,r.status);}).length;
  var kanguRows=rows.filter(function(r){return !!S.kangu[r.tid];});
  var totalPacotes=rows.reduce(function(s,r){return s+r.total;},0);
  var totalEntregues=rows.reduce(function(s,r){return s+r.delivered;},0);
  var totalPendPac=rows.reduce(function(s,r){return s+r.pending;},0);
  var totalFailed=rows.reduce(function(s,r){return s+r.failed;},0);
  var chao=rows.filter(function(r){return (r.status==='pendente'||r.status==='recusou')&&r.driver;});

  // Por ciclo
  var ciclos=['CHP','AM1','PM1','SD'];
  var cicloLabel={'CHP':'CHP','AM1':'AM','PM1':'PM','SD':'SD'};
  var byCiclo={};
  ciclos.forEach(function(c){
    byCiclo[c]={total:0,emrota:0,pendente:0,encerrada:0,recusou:0,cancelado:0,pacotes:0,entregues:0,kangu:0};
  });
  rows.forEach(function(r){
    var c=r.cycle;
    if(!byCiclo[c])return;
    byCiclo[c].total++;
    byCiclo[c].pacotes+=r.total;
    byCiclo[c].entregues+=r.delivered;
    if(r.status==='emrota')byCiclo[c].emrota++;
    else if(r.status==='pendente')byCiclo[c].pendente++;
    else if(r.status==='encerrada')byCiclo[c].encerrada++;
    else if(r.status==='recusou')byCiclo[c].recusou++;
    else if(r.status==='cancelado')byCiclo[c].cancelado++;
    if(S.kangu[r.tid])byCiclo[c].kangu++;
  });

  // Por facility
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

  var html='';

  // KPIs rotas
  html+='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">'
    +'<div class="mn-kpi"><div class="v">'+total+'</div><div class="l">Total</div></div>'
    +'<div class="mn-kpi" style="border-color:rgba(0,180,255,.3)"><div class="v" style="color:#00b4ff">'+emrota+'</div><div class="l">Em Rota</div></div>'
    +'<div class="mn-kpi" style="border-color:rgba(255,204,0,.3)"><div class="v" style="color:#ffcc00">'+pendente+'</div><div class="l">Pendente</div></div>'
    +'<div class="mn-kpi" style="border-color:rgba(0,255,136,.3)"><div class="v" style="color:#00ff88">'+encerrada+'</div><div class="l">Encerrada</div></div>'
    +'<div class="mn-kpi" style="border-color:rgba(255,140,0,.3)"><div class="v" style="color:#ff8c00">'+atrasado+'</div><div class="l">Atrasados</div></div>'
    +'<div class="mn-kpi" style="border-color:rgba(255,51,102,.3)"><div class="v" style="color:#ff3366">'+recusou+'</div><div class="l">Recusou</div></div>'
    +'<div class="mn-kpi" style="border-color:rgba(100,120,140,.3)"><div class="v" style="color:#8090a8">'+cancelado+'</div><div class="l">Cancelado</div></div>'
    +'<div class="mn-kpi" style="border-color:rgba(123,97,255,.3)"><div class="v" style="color:#7b61ff">'+kanguRows.length+'</div><div class="l">Kangu</div></div>'
    +'<div class="mn-kpi" style="border-color:rgba(255,51,102,.3)"><div class="v" style="color:#ff3366">'+chao.length+'</div><div class="l">No Chão</div></div>'
    +'</div>';

  // Rotas outros dias
  if(otherRows.length>0){
    var outrosAbertos=otherRows.filter(function(r){return r.status==='emrota'||r.status==='pendente';}).length;
    var outrosEncerrados=otherRows.filter(function(r){return r.status==='encerrada';}).length;
    html+='<div style="background:rgba(255,140,0,.08);border:1px solid rgba(255,140,0,.3);border-radius:8px;padding:8px 14px;margin-bottom:10px;font-size:12px">'
      +'<span style="font-weight:700;color:#ff8c00">Rotas de outros dias — </span>'
      +'Abertas: <strong>'+outrosAbertos+'</strong> | Encerradas: <strong style="color:#00ff88">'+outrosEncerrados+'</strong>'
      +'</div>';
  }

  // Tabela por ciclo
  html+='<div style="font-size:12px;font-weight:700;color:#00d4ff;margin-bottom:6px">Por Ciclo</div>';
  html+='<div style="overflow-x:auto;margin-bottom:12px"><table class="mn-tbl"><thead><tr>'
    +'<th>Ciclo</th><th>Total</th><th>Em Rota</th><th>Pendente</th>'
    +'<th>Encerrada</th><th>Recusou</th><th>Cancelado</th><th>Kangu</th>'
    +'</tr></thead><tbody>';
  ciclos.forEach(function(c){
    var f=byCiclo[c];
    if(!f||f.total===0)return;
    html+='<tr>'
      +'<td><strong style="color:#00d4ff">'+cicloLabel[c]+'</strong></td>'
      +'<td>'+f.total+'</td>'
      +'<td style="color:#00b4ff">'+f.emrota+'</td>'
      +'<td style="color:#ffcc00">'+f.pendente+'</td>'
      +'<td style="color:#00ff88">'+f.encerrada+'</td>'
      +'<td style="color:#ff3366">'+(f.recusou||'—')+'</td>'
      +'<td style="color:#8090a8">'+(f.cancelado||'—')+'</td>'
      +'<td style="color:#7b61ff">'+(f.kangu||'—')+'</td>'
      +'</tr>';
  });
  html+='</tbody></table></div>';

  // Tabela por facility
  html+='<div style="font-size:12px;font-weight:700;color:#00d4ff;margin-bottom:6px">Por Facility</div>';
  html+='<div style="overflow-x:auto;margin-bottom:12px"><table class="mn-tbl"><thead><tr>'
    +'<th>Facility</th><th>Total</th><th>Em Rota</th><th>Pendente</th>'
    +'<th>Encerrada</th><th>Atrasado</th><th>Recusou</th><th>Cancelado</th><th>Kangu</th>'
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
      +'</tr>';
  });
  html+='</tbody></table></div>';

  // Recusas com status de resolução
  var recusaRows=rows.filter(function(r){return r.status==='recusou';});
  if(recusaRows.length>0){
    html+='<div style="font-size:12px;font-weight:700;color:#ff3366;margin-bottom:6px">Recusas</div>';
    html+='<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px">';
    recusaRows.forEach(function(r){
      var res=resolucoes[r.tid]||{tipo:'pendente',obs:''};
      var cor=res.tipo==='resolvido'?'#00ff88':res.tipo==='pedido'||res.tipo==='kangu'?'#7b61ff':'#ff3366';
      var label=res.tipo==='resolvido'?'Resolvido':res.tipo==='pedido'?'Pedido enviado '+(res.obs||''):res.tipo==='kangu'?'Kangu '+(res.obs||''):'Pendente';
      html+='<div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-left:3px solid '+cor+';border-radius:8px;padding:8px 12px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">'
        +'<span style="color:#00d4ff;font-size:11px;font-weight:600">'+r.fac+'</span>'
        +'<span style="flex:1;font-weight:600">'+(r.driver||'Sem driver')+'</span>'
        +(r.eta?'<span style="color:#ffcc00;font-size:11px">ETA '+r.eta+'</span>':'')
        +'<span style="color:'+cor+';font-size:11px;font-weight:600">'+label+'</span>'
        +'</div>';
    });
    html+='</div>';
  }

  // Botões
  html+='<div style="display:flex;flex-wrap:wrap;gap:8px">'
    +'<button class="mn-btn g" id="mn-cp-fechamento">Copiar Report</button>'
    +'<button class="mn-btn k" id="mn-cp-kangu">Alerta Kangu</button>'
    +'<button class="mn-btn r" id="mn-cp-chao">Rotas no Chão</button>'
    +'</div>';

  body.innerHTML=html;

  // COPIAR REPORT
  body.querySelector('#mn-cp-fechamento').onclick=function(){
    var now=new Date();
    var hora=pad(now.getHours())+':'+pad(now.getMinutes());
    var lines=[
      'FECHAMENTO — '+br(S.date),
      'Gerado às '+hora,
      '---',
      'Total: '+total+' | Em Rota: '+emrota+' | Pendente: '+pendente,
      'Encerradas: '+encerrada+' | Atrasados: '+atrasado,
      'Recusaram: '+recusou+' | Cancelados: '+cancelado+' | Kangu: '+kanguRows.length,
      'Rotas no Chão: '+chao.length,
      ''
    ];
    if(totalPacotes>0){
      lines.push('Pacotes: '+totalPacotes+' | Entregues: '+totalEntregues+' | Pendentes: '+totalPendPac+' | Insucessos: '+totalFailed);
      lines.push('');
    }
    lines.push('--- Por Ciclo ---');
    ciclos.forEach(function(c){
      var f=byCiclo[c];
      if(!f||f.total===0)return;
      lines.push(cicloLabel[c]+': '+f.total+' rotas | Em Rota: '+f.emrota+' | Encerradas: '+f.encerrada+' | Recusou: '+f.recusou+(f.kangu?' | Kangu: '+f.kangu:''));
    });
    lines.push('');
    lines.push('--- Por Facility ---');
    Object.values(byFac).sort(function(a,b){return a.fac.localeCompare(b.fac);}).forEach(function(f){
      lines.push(f.fac+': '+f.total+' | Em Rota: '+f.emrota+' | Encerradas: '+f.encerrada+(f.recusou?' | Recusou: '+f.recusou:'')+(f.kangu?' | Kangu: '+f.kangu:''));
    });
    lines.push('');

    if(recusaRows.length>0){
      lines.push('--- Recusas ---');
      recusaRows.forEach(function(r){
        var res=resolucoes[r.tid]||{tipo:'pendente',obs:''};
        var label=res.tipo==='resolvido'?'Resolvido':res.tipo==='pedido'?'Pedido enviado '+(res.obs||''):res.tipo==='kangu'?'Kangu '+(res.obs||''):'Pendente';
        lines.push(r.fac+' | '+(r.driver||'Sem driver')+(r.eta?' | ETA '+r.eta:'')+' — '+label);
      });
      lines.push('');
    }

    if(kanguRows.length>0){
      lines.push('--- Kangu ---');
      kanguRows.forEach(function(r){
        lines.push('Travel '+r.tid+' | '+r.fac+(r.driver?' | '+r.driver:'')+(r.eta?' | ETA '+r.eta:''));
      });
      lines.push('');
    }

    if(chao.length>0){
      lines.push('--- Rotas no Chão ---');
      var chaoByFac={};
      chao.forEach(function(r){
        if(!chaoByFac[r.fac])chaoByFac[r.fac]=[];
        chaoByFac[r.fac].push(r);
      });
      Object.keys(chaoByFac).sort().forEach(function(fac){
        lines.push(fac+' ('+chaoByFac[fac].length+')');
        chaoByFac[fac].forEach(function(r,i){
          lines.push((i+1)+'. '+(r.driver||'Sem driver')+' | ETA: '+r.eta+' | '+r.status);
        });
      });
      lines.push('');
    }

    if(otherRows.length>0){
      var outrosAbertos=otherRows.filter(function(r){return r.status==='emrota'||r.status==='pendente';}).length;
      if(outrosAbertos>0){
        lines.push('Rotas de outros dias em aberto: '+outrosAbertos);
        lines.push('');
      }
    }

    lines.push('Monitor Nodos | '+hora);
    cp(lines.join('\n'),'Fechamento');
  };

  // ALERTA KANGU
  body.querySelector('#mn-cp-kangu').onclick=function(){
    if(!kanguRows.length){toast('Nenhuma rota Kangu marcada.');return;}
    var lines=['ALERTA KANGU — '+br(S.date),'---',''];
    kanguRows.forEach(function(r){
      lines.push('Travel '+r.tid+' | '+r.fac+' | ETA: '+r.eta);
      lines.push('Carrier: '+r.carrier+(r.driver?' | Driver: '+r.driver:'')+(r.plate?' | '+r.plate:''));
      lines.push('Status: '+r.status);
      lines.push('');
    });
    lines.push('Total: '+kanguRows.length+' rota(s)');
    cp(lines.join('\n'),'Alerta Kangu');
  };

  // ROTAS NO CHÃO
  body.querySelector('#mn-cp-chao').onclick=function(){
    if(!chao.length){toast('Nenhuma rota no chão.');return;}
    var byF={};
    chao.forEach(function(r){
      if(!byF[r.fac])byF[r.fac]=[];
      byF[r.fac].push(r);
    });
    var lines=['ROTAS NO CHÃO — '+br(S.date),'---',''];
    Object.keys(byF).sort().forEach(function(fac){
      lines.push(fac+' ('+byF[fac].length+')');
      byF[fac].forEach(function(r,i){
        lines.push((i+1)+'. '+(r.driver||'Sem driver')+' | ETA: '+r.eta+' | '+r.status);
      });
      lines.push('');
    });
    lines.push('Total: '+chao.length+' rota(s)');
    cp(lines.join('\n'),'Rotas no chão');
  };
}

function renderTurno(body){
  var hoje=S.date;
  var rows=S.rows.filter(function(r){return r.date===hoje;});

  // Carregar resoluções de recusa do LocalStorage
  var RESKEY='__mn_res__';
  var resolucoes=JSON.parse(localStorage.getItem(RESKEY)||'{}');
  function saveRes(){localStorage.setItem(RESKEY,JSON.stringify(resolucoes));}

  var pendentes=rows.filter(function(r){
    return r.status==='pendente'&&r.driver;
  });
  var recusaram=rows.filter(function(r){return r.status==='recusou';});
  var kanguPend=rows.filter(function(r){
    return S.kangu[r.tid]&&r.status!=='encerrada'&&r.status!=='cancelado';
  });

  // Só pendências não resolvidas
  var recusaPend=recusaram.filter(function(r){
    var res=resolucoes[r.tid];
    return !res||res.tipo==='pendente';
  });

  var byFac={};
  pendentes.forEach(function(r){
    if(!byFac[r.fac])byFac[r.fac]=[];
    byFac[r.fac].push(r);
  });
  var recByFac={};
  recusaPend.forEach(function(r){
    if(!recByFac[r.fac])recByFac[r.fac]=[];
    recByFac[r.fac].push(r);
  });

  var emrota=rows.filter(function(r){return r.status==='emrota';}).length;
  var encerrada=rows.filter(function(r){return r.status==='encerrada';}).length;
  var cancelado=rows.filter(function(r){return r.status==='cancelado';}).length;
  var total=rows.filter(function(r){return r.status!=='acaminho';}).length;
  var now=new Date();
  var hora=pad(now.getHours())+':'+pad(now.getMinutes());

  var html='<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">'
    +'<button class="mn-btn g" id="mn-cp-turno">Copiar Passagem de Turno</button>'
    +'</div>';

  html+='<div style="background:rgba(13,21,37,.9);border:1px solid rgba(0,212,255,.2);border-radius:12px;padding:16px;font-size:12px;line-height:1.9;color:#c0d0e8">';

  // RESUMO
  html+='<div style="color:#00d4ff;font-weight:700;font-size:13px;margin-bottom:4px">PASSAGEM DE TURNO T1 → T2</div>';
  html+='<div style="color:#506070;margin-bottom:12px">'+br(hoje)+' | '+hora+'</div>';
  html+='<div style="color:#ffcc00;font-weight:700;margin-bottom:6px">RESUMO DO TURNO</div>';
  html+='<div>Total: <strong>'+total+'</strong> &nbsp;|&nbsp; Em Rota: <strong style="color:#00b4ff">'+emrota+'</strong> &nbsp;|&nbsp; Encerradas: <strong style="color:#00ff88">'+encerrada+'</strong></div>';
  html+='<div style="margin-bottom:12px">Pendentes: <strong style="color:#ffcc00">'+pendentes.length+'</strong> &nbsp;|&nbsp; Recusas: <strong style="color:#ff3366">'+recusaPend.length+'</strong> &nbsp;|&nbsp; Cancelados: <strong style="color:#8090a8">'+cancelado+'</strong></div>';

  // PENDENTES DE SUBIR
  if(Object.keys(byFac).length>0){
    html+='<div style="color:#ff8c00;font-weight:700;margin-bottom:8px;border-top:1px solid rgba(255,255,255,.06);padding-top:10px">PENDENTES DE SUBIR ROTA</div>';
    Object.keys(byFac).sort().forEach(function(fac){
      var drivers=byFac[fac].sort(function(a,b){return a.driver.localeCompare(b.driver);});
      html+='<div style="color:#00d4ff;font-weight:600;margin-top:8px;margin-bottom:4px">'+fac+' ('+drivers.length+')</div>';
      drivers.forEach(function(d,i){
        html+='<div style="padding-left:14px;padding:4px 4px 4px 14px;border-radius:6px;display:flex;align-items:center;gap:8px">'
          +'<span style="color:#506070;min-width:20px">'+(i+1)+'.</span>'
          +'<span style="flex:1">'+d.driver+(d.eta?' <span style="color:#ffcc00;font-size:11px">ETA '+d.eta+'</span>':'')+' <span style="font-size:10px;color:#506070">'+d.cycle+'</span></span>'
          +'</div>';
      });
    });
    html+='<div style="margin-bottom:12px"></div>';
  }else{
    html+='<div style="color:#00ff88;margin-bottom:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,.06)">Nenhum motorista pendente.</div>';
  }

  // RECUSAS PENDENTES COM AÇÕES
  if(recusaram.length>0){
    html+='<div style="color:#ff3366;font-weight:700;margin-bottom:8px;border-top:1px solid rgba(255,255,255,.06);padding-top:10px">RECUSAS</div>';
    recusaram.forEach(function(r){
      var res=resolucoes[r.tid]||{tipo:'pendente',obs:''};
      var bgColor=res.tipo==='resolvido'?'rgba(0,255,136,.06)':res.tipo==='pedido'?'rgba(123,97,255,.06)':'rgba(255,51,102,.06)';
      var borderColor=res.tipo==='resolvido'?'rgba(0,255,136,.3)':res.tipo==='pedido'?'rgba(123,97,255,.3)':'rgba(255,51,102,.2)';
      html+='<div style="background:'+bgColor+';border:1px solid '+borderColor+';border-radius:8px;padding:10px 12px;margin-bottom:6px">';
      html+='<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">'
        +'<span style="color:#00d4ff;font-weight:600;font-size:11px">'+r.fac+'</span>'
        +'<span style="flex:1;font-weight:600">'+(r.driver||'Sem driver')+'</span>'
        +(r.eta?'<span style="color:#ffcc00;font-size:11px">ETA '+r.eta+'</span>':'')
        +'</div>';
      // Botões de ação
      html+='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:'+(res.tipo==='pedido'?'6px':'0')+'">'
        +'<button class="mn-btn sm '+(res.tipo==='resolvido'?'g':'')+'" data-res="resolvido" data-tid="'+r.tid+'">'+( res.tipo==='resolvido'?'✓ Resolvido':'Resolvido')+'</button>'
        +'<button class="mn-btn sm '+(res.tipo==='pedido'?'k':'')+'" data-res="pedido" data-tid="'+r.tid+'">Pedido enviado</button>'
        +'<button class="mn-btn sm '+(res.tipo==='kangu'?'k':'')+'" data-res="kangu" data-tid="'+r.tid+'">Kangu</button>'
        +'<button class="mn-btn sm r" data-res="pendente" data-tid="'+r.tid+'">Pendente</button>'
        +'</div>';
      // Campo de horário se for pedido
      if(res.tipo==='pedido'||res.tipo==='kangu'){
        html+='<div style="display:flex;align-items:center;gap:6px;margin-top:4px">'
          +'<span style="font-size:11px;color:#506070">Horário:</span>'
          +'<input class="mn-inp" data-obs-tid="'+r.tid+'" value="'+(res.obs||'')+'" placeholder="Ex: 10:00" style="width:80px">'
          +'</div>';
      }
      html+='</div>';
    });
    html+='<div style="margin-bottom:12px"></div>';
  }

  // KANGU PENDENTE
  if(kanguPend.length>0){
    html+='<div style="color:#7b61ff;font-weight:700;margin-bottom:8px;border-top:1px solid rgba(255,255,255,.06);padding-top:10px">KANGU PENDENTE</div>';
    var kByFac={};
    kanguPend.forEach(function(r){
      if(!kByFac[r.fac])kByFac[r.fac]=[];
      kByFac[r.fac].push(r);
    });
    Object.keys(kByFac).sort().forEach(function(fac){
      html+='<div style="color:#00d4ff;font-weight:600;margin-top:4px">'+fac+': '+kByFac[fac].length+' rota(s)</div>';
      kByFac[fac].forEach(function(r){
        html+='<div style="padding-left:14px">Travel '+r.tid+(r.driver?' | '+r.driver:'')+(r.eta?' | ETA '+r.eta:'')+' <span class="mn-bx mn-bk" style="font-size:10px">Kangu</span></div>';
      });
    });
  }else{
    html+='<div style="color:#00ff88;margin-top:8px;border-top:1px solid rgba(255,255,255,.06);padding-top:10px">Kangu: nenhuma pendencia.</div>';
  }

  html+='<div style="color:#506070;font-size:11px;margin-top:12px;border-top:1px solid rgba(0,212,255,.1);padding-top:8px">Monitor Nodos | '+hora+'</div>';
  html+='</div>';

  body.innerHTML=html;

  // BOTÕES DE RESOLUÇÃO
  body.querySelectorAll('[data-res]').forEach(function(btn){
    btn.onclick=function(){
      var tid=this.dataset.tid;
      var tipo=this.dataset.res;
      if(!resolucoes[tid])resolucoes[tid]={tipo:'pendente',obs:''};
      resolucoes[tid].tipo=tipo;
      saveRes();
      renderTurno(body);
    };
  });

  // CAMPO DE OBS (horário)
  body.querySelectorAll('[data-obs-tid]').forEach(function(inp){
    inp.oninput=function(){
      var tid=this.dataset.obsTid;
      if(!resolucoes[tid])resolucoes[tid]={tipo:'pedido',obs:''};
      resolucoes[tid].obs=this.value;
      saveRes();
    };
  });

  // COPIAR
  body.querySelector('#mn-cp-turno').onclick=function(){
    var now2=new Date();
    var hora2=pad(now2.getHours())+':'+pad(now2.getMinutes());
    var lines=[
      'PASSAGEM DE TURNO T1 → T2',
      br(hoje)+' | '+hora2,
      '',
      'RESUMO',
      'Total: '+total+' | Em Rota: '+emrota+' | Encerradas: '+encerrada,
      'Pendentes: '+pendentes.length+' | Recusas: '+recusaPend.length+' | Cancelados: '+cancelado,
      ''
    ];

    if(Object.keys(byFac).length>0){
      lines.push('PENDENTES DE SUBIR ROTA');
      Object.keys(byFac).sort().forEach(function(fac){
        var drivers=byFac[fac].sort(function(a,b){return a.driver.localeCompare(b.driver);});
        lines.push(fac+': '+drivers.length);
        drivers.forEach(function(d,i){
          lines.push((i+1)+' - '+d.driver+(d.eta?' (ETA: '+d.eta+')':''));
        });
        lines.push('');
      });
    }else{
      lines.push('Nenhum motorista pendente.');
      lines.push('');
    }

    if(recusaPend.length>0){
      lines.push('RECUSAS PENDENTES');
      recusaPend.forEach(function(r){
        lines.push('- '+r.fac+' | '+(r.driver||'Sem driver')+(r.eta?' | ETA '+r.eta:''));
      });
      lines.push('');
    }

    if(kanguPend.length>0){
      lines.push('KANGU PENDENTE');
      kanguPend.forEach(function(r){
        lines.push('- Travel '+r.tid+' | '+r.fac+(r.driver?' | '+r.driver:'')+(r.eta?' | ETA '+r.eta:''));
      });
      lines.push('');
    }

    lines.push('Monitor Nodos | '+hora2);
    cp(lines.join('\n'),'Passagem de turno');
  };
}

// ===================== INIT =====================
window.__MN_S__=S;
window.__MN_RENDER__=function(){renderBody();};
buildPanel();
})();


