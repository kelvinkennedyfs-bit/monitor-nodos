javascript:(function(){'use strict';
var PID='__MN__',BID='__MN_BD__',FACS=['SRJ3','ERJ2','ERJ5','BRNRJ381','BRNRJ82','BRNRJ719','BRNRJ153','BRNRJ542','BRNRJ564','BRNRJ906','BRNRJ1510','BRNRJ1924','BRNRJ12663','BRNSP1335','BRNRJ122','BRNRJ12898'];
var ex=document.getElementById(PID);
if(ex){var bd2=document.getElementById(BID);var v=ex.style.display!=='none';ex.style.display=v?'none':'flex';if(bd2)bd2.style.display=v?'none':'block';return;}
var S={date:gd(),tab:'nodos',rows:[],sum:{},loading:false,cd:60,kangu:JSON.parse(localStorage.getItem('__nk__')||'{}'),rt:null,ct:null,ff:'',fs:'',ft:''};
function gd(){return new Date().toISOString().slice(0,10);}
function ad(s,n){var d=new Date(s+'T12:00:00');d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);}
function br(s){var p=s.split('-');return p[2]+'/'+p[1]+'/'+p[0];}
function nm(){var n=new Date();return n.getHours()*60+n.getMinutes();}
function e2m(e){if(!e||e==='00:00')return null;var p=e.split(':');return parseInt(p[0])*60+parseInt(p[1]);}
function late(eta,st){if(st==='started')return false;var m=e2m(eta);if(m===null)return false;return nm()>m+60;}
function sk(){localStorage.setItem('__nk__',JSON.stringify(S.kangu));}
function toast(msg){var t=document.createElement('div');t.textContent=msg;Object.assign(t.style,{position:'fixed',bottom:'28px',right:'28px',background:'#0d1525',border:'1px solid #00ff88',color:'#00ff88',padding:'10px 20px',borderRadius:'10px',fontSize:'13px',fontWeight:'600',zIndex:'999999',boxShadow:'0 0 20px rgba(0,255,136,.3)',animation:'mn-toast 2.5s forwards'});document.body.appendChild(t);setTimeout(function(){t.remove();},2500);}
function cp(txt,label){navigator.clipboard.writeText(txt).then(function(){toast('✅ '+label+' copiado!');});}

function badge(status,isLate){
  if(isLate)return '<span class="mn-bx mn-bo">⚠️ ATRASADO</span>';
  var m={started:'<span class="mn-bx mn-bg">✅ Subiu</span>',accepted:'<span class="mn-bx mn-bb">🔵 Aceito</span>',defined:'<span class="mn-bx mn-by">🟡 Definido</span>',rejected:'<span class="mn-bx mn-br">🔴 Recusou</span>',canceled:'<span class="mn-bx mn-bgr">⚫ Cancelado</span>'};
  return m[status]||'<span class="mn-bx mn-bgr">'+status+'</span>';
}

async function fetchAll(){
  S.loading=true;renderBody();
  var dt=S.date,base='https://envios.adminml.com';
  try{
    var rs=await Promise.all([
      fetch(base+'/logistics/travel-management/api/schedules?date_lt_eq='+dt+'&date_gt_eq='+dt+'&step_type=last_mile',{credentials:'include'}).then(function(r){return r.json();}),
      fetch(base+'/logistics/travel-management/api/schedules/summary?date_lt_eq='+dt+'&date_gt_eq='+dt+'&step_type=last_mile',{credentials:'include'}).then(function(r){return r.json();}),
      fetch(base+'/logistics/rostering/api/services/details?startDate='+dt+'&endDate='+dt+'&stepType=last_mile&channel=logistics',{credentials:'include'}).then(function(r){return r.json();})
    ]);
    var sched=Array.isArray(rs[0])?rs[0]:(rs[0].data||[]);
    S.sum=rs[1]||{};
    var rost=Array.isArray(rs[2])?rs[2]:(rs[2].data||[]);
    var rm={};rost.forEach(function(r){rm[String(r.travelID)]=r;});
    S.rows=sched.filter(function(s){var f=s.origin_facility_id||s.destination_facility_id||'';return FACS.includes(f);}).map(function(s){
      var tid=String(s.travel_id),ro=rm[tid]||{};
      var drv=s.assigned&&s.assigned.drivers&&s.assigned.drivers[0];
      var veh=s.assigned&&s.assigned.vehicles&&s.assigned.vehicles[0];
      var st=s.steps&&s.steps[0];
      var rst=ro.steps&&ro.steps[0];
      return {
        tid:tid,
        fac:s.origin_facility_id||s.destination_facility_id||'',
        carrier:s.carrier_description||ro.carrierName||'',
        driver:drv?(drv.first_name+' '+drv.last_name).trim():'',
        plate:veh?veh.license_plate:'',
        cycle:st?st.cycle_id:'',
        eta:rst?rst.ETA:(st?st.eta:''),
        etd:rst?rst.ETD:'',
        status:s.status||'',
        service:ro.serviceName||s.service_description||'',
        vtype:ro.vehicleType?ro.vehicleType.name:'',
        locked:ro.locked||false,
        limitDate:ro.limitDate||''
      };
    });
  }catch(e){console.error('[MN]',e);}
  S.loading=false;renderBody();
}

function injectCSS(){
  if(document.getElementById('__mn_css__'))return;
  var st=document.createElement('style');st.id='__mn_css__';
  st.textContent='#'+PID+' *{box-sizing:border-box;font-family:Segoe UI,system-ui,sans-serif}'
  +'#'+PID+' ::-webkit-scrollbar{width:5px;height:5px}'
  +'#'+PID+' ::-webkit-scrollbar-track{background:#0a0e1a}'
  +'#'+PID+' ::-webkit-scrollbar-thumb{background:#00d4ff44;border-radius:3px}'
  +'@keyframes mn-glow{0%,100%{box-shadow:0 0 20px rgba(0,212,255,.3),0 0 60px rgba(0,212,255,.08)}50%{box-shadow:0 0 45px rgba(0,212,255,.75),0 0 100px rgba(0,212,255,.2)}}'
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
  +'.mn-btn.g:hover{background:rgba(0,255,136,.22);box-shadow:0 0 10px rgba(0,255,136,.4)}'
  +'.mn-btn.y{border-color:rgba(255,204,0,.4);background:rgba(255,204,0,.08);color:#ffcc00}'
  +'.mn-btn.y:hover{background:rgba(255,204,0,.22)}'
  +'.mn-btn.r{border-color:rgba(255,51,102,.4);background:rgba(255,51,102,.08);color:#ff3366}'
  +'.mn-btn.r:hover{background:rgba(255,51,102,.22)}'
  +'.mn-btn.k{border-color:rgba(123,97,255,.4);background:rgba(123,97,255,.08);color:#7b61ff}'
  +'.mn-btn.k:hover{background:rgba(123,97,255,.22)}'
  +'.mn-btn.sm{padding:2px 7px;font-size:11px}'
  +'.mn-tbl{width:100%;border-collapse:collapse;font-size:12px}'
  +'.mn-tbl th{color:#00d4ff;font-size:11px;text-transform:uppercase;letter-spacing:.5px;padding:7px 9px;border-bottom:1px solid rgba(0,212,255,.18);text-align:left;position:sticky;top:0;background:#0d1525;z-index:2}'
  +'.mn-tbl td{padding:6px 9px;border-bottom:1px solid rgba(255,255,255,.04);color:#c0d0e8;vertical-align:middle}'
  +'.mn-tbl tr:hover td{background:rgba(0,212,255,.05)}'
  +'.mn-tbl tr.st td{background:rgba(0,255,136,.04)}'
  +'.mn-tbl tr.lt td{background:rgba(255,51,102,.06)}'
  +'.mn-bx{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600}'
  +'.mn-bg{background:rgba(0,255,136,.14);color:#00ff88;border:1px solid rgba(0,255,136,.3)}'
  +'.mn-bb{background:rgba(0,180,255,.14);color:#00b4ff;border:1px solid rgba(0,180,255,.3)}'
  +'.mn-by{background:rgba(255,204,0,.14);color:#ffcc00;border:1px solid rgba(255,204,0,.3)}'
  +'.mn-br{background:rgba(255,51,102,.14);color:#ff3366;border:1px solid rgba(255,51,102,.3)}'
  +'.mn-bgr{background:rgba(100,120,140,.14);color:#8090a8;border:1px solid rgba(100,120,140,.3)}'
  +'.mn-bo{background:rgba(255,140,0,.14);color:#ff8c00;border:1px solid rgba(255,140,0,.3);animation:mn-pulse 1s infinite}'
  +'.mn-bk{background:rgba(123,97,255,.14);color:#7b61ff;border:1px solid rgba(123,97,255,.4)}'
  +'.mn-kpi{background:rgba(0,212,255,.05);border:1px solid rgba(0,212,255,.18);border-radius:10px;padding:12px 14px;text-align:center;flex:1;min-width:90px}'
  +'.mn-kpi .v{font-size:26px;font-weight:700;color:#00d4ff;line-height:1}'
  +'.mn-kpi .l{font-size:10px;color:#506070;margin-top:3px;text-transform:uppercase;letter-spacing:.5px}'
  +'.mn-sel{background:rgba(255,255,255,.05);border:1px solid rgba(0,212,255,.2);border-radius:7px;color:#c0d0e8;padding:5px 8px;font-size:12px;outline:none}'
  +'.mn-sel:focus{border-color:rgba(0,212,255,.5)}'
  +'.mn-inp{background:rgba(255,255,255,.05);border:1px solid rgba(0,212,255,.2);border-radius:7px;color:#c0d0e8;padding:5px 10px;font-size:12px;outline:none;width:160px}'
  +'.mn-inp:focus{border-color:rgba(0,212,255,.5)}'
  +'.mn-grp{background:rgba(0,212,255,.07);border-left:3px solid #00d4ff;padding:8px 14px;border-radius:6px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between}'
  +'.mn-grp:hover{background:rgba(0,212,255,.12)}'
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
  Object.assign(panel.style,{position:'fixed',top:'40px',right:'30px',width:'940px',maxWidth:'96vw',height:'84vh',background:'#0a0e1a',border:'1px solid rgba(0,212,255,.35)',borderRadius:'16px',display:'flex',flexDirection:'column',zIndex:'99999',animation:'mn-glow 3s ease-in-out infinite',overflow:'hidden',color:'#e0e8ff'});

  // SCAN LINE
  var scan=document.createElement('div');scan.className='mn-scan';panel.appendChild(scan);

  // HEADER
  var hdr=document.createElement('div');
  Object.assign(hdr.style,{background:'linear-gradient(135deg,#0d1b3e,#1a2a6c,#0d1b3e)',padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'move',flexShrink:'0',borderBottom:'1px solid rgba(0,212,255,.2)'});
  hdr.innerHTML='<div style="display:flex;align-items:center;gap:10px">'
    +'<span style="font-size:20px">🛰️</span>'
    +'<span class="mn-shim" style="font-size:15px;font-weight:700;letter-spacing:1px">MONITOR NODOS</span>'
    +'<span id="mn-dtlbl" style="font-size:11px;color:#506070;margin-left:2px"></span>'
    +'</div>'
    +'<div style="display:flex;align-items:center;gap:6px">'
    +'<button id="mn-prev" class="mn-btn sm">◀</button>'
    +'<span id="mn-dtdisp" style="font-size:13px;color:#00d4ff;font-weight:600;min-width:78px;text-align:center"></span>'
    +'<button id="mn-next" class="mn-btn sm">▶</button>'
    +'<button id="mn-ref" class="mn-btn" style="margin-left:6px">🔄 <span id="mn-cd">60</span>s</button>'
    +'<button id="mn-cls" style="background:rgba(255,51,102,.15);border:1px solid rgba(255,51,102,.4);color:#ff3366;border-radius:8px;padding:4px 12px;cursor:pointer;font-size:13px;font-weight:700">✕</button>'
    +'</div>';
  panel.appendChild(hdr);

  // TABS
  var tabs=document.createElement('div');
  Object.assign(tabs.style,{display:'flex',gap:'6px',padding:'8px 14px',borderBottom:'1px solid rgba(0,212,255,.1)',flexShrink:'0',background:'rgba(0,0,0,.2)',overflowX:'auto'});
  tabs.innerHTML='<div class="mn-tab on" data-t="nodos">🛰️ Nodos</div>'
    +'<div class="mn-tab" data-t="escala">📋 Escala por Horário</div>'
    +'<div class="mn-tab" data-t="fechamento">📦 Fechamento</div>';
  panel.appendChild(tabs);

  // BODY
  var body=document.createElement('div');
  body.id='mn-body';
  Object.assign(body.style,{flex:'1',overflowY:'auto',padding:'14px 16px'});
  panel.appendChild(body);

  document.body.appendChild(panel);

  // DRAG
  var dx=0,dy=0,drag=false;
  hdr.addEventListener('mousedown',function(e){drag=true;dx=e.clientX-panel.offsetLeft;dy=e.clientY-panel.offsetTop;});
  document.addEventListener('mousemove',function(e){if(!drag)return;panel.style.left=(e.clientX-dx)+'px';panel.style.top=(e.clientY-dy)+'px';panel.style.right='auto';});
  document.addEventListener('mouseup',function(){drag=false;});

  // EVENTS
  panel.querySelector('#mn-cls').onclick=function(){panel.style.display='none';bd.style.display='none';};
  panel.querySelector('#mn-prev').onclick=function(){S.date=ad(S.date,-1);updateDate();fetchAll();};
  panel.querySelector('#mn-next').onclick=function(){S.date=ad(S.date,1);updateDate();fetchAll();};
  panel.querySelector('#mn-ref').onclick=function(){S.cd=60;fetchAll();};
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
  if(dl) dl.textContent=S.date===gd()?'(hoje)':'';
  if(dd) dd.textContent=br(S.date);
}

function startTimers(){
  if(S.rt) clearInterval(S.rt);
  if(S.ct) clearInterval(S.ct);
  S.ct=setInterval(function(){
    S.cd--;
    var el=document.getElementById('mn-cd');
    if(el) el.textContent=S.cd;
    if(S.cd<=0){S.cd=60;fetchAll();}
  },1000);
}

function renderBody(){
  var body=document.getElementById('mn-body');
  if(!body) return;
  if(S.loading){body.innerHTML='<div style="display:flex;align-items:center;gap:10px;color:#00d4ff;padding:40px;justify-content:center"><div class="mn-sp"></div><span>Carregando dados...</span></div>';return;}
  if(S.tab==='nodos') renderNodos(body);
  else if(S.tab==='escala') renderEscala(body);
  else renderFechamento(body);
}

// ===================== ABA NODOS =====================
function renderNodos(body){
  var rows=S.rows.filter(function(r){
    if(S.ff && r.fac!==S.ff) return false;
    if(S.fs && r.status!==S.fs) return false;
    if(S.ft){var q=S.ft.toLowerCase();if(r.driver.toLowerCase().indexOf(q)<0&&r.carrier.toLowerCase().indexOf(q)<0&&r.plate.toLowerCase().indexOf(q)<0&&r.fac.toLowerCase().indexOf(q)<0) return false;}
    return true;
  });

  var facs=[''].concat(FACS);
  var html='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;align-items:center">'
    +'<select id="mn-ff" class="mn-sel"><option value="">Todas as facilities</option>'
    +FACS.map(function(f){return '<option value="'+f+'"'+(S.ff===f?' selected':'')+'>'+f+'</option>';}).join('')
    +'</select>'
    +'<select id="mn-fs" class="mn-sel"><option value="">Todos os status</option>'
    +'<option value="started"'+(S.fs==='started'?' selected':'')+'>✅ Subiu</option>'
    +'<option value="accepted"'+(S.fs==='accepted'?' selected':'')+'>🔵 Aceito</option>'
    +'<option value="defined"'+(S.fs==='defined'?' selected':'')+'>🟡 Definido</option>'
    +'<option value="rejected"'+(S.fs==='rejected'?' selected':'')+'>🔴 Recusou</option>'
    +'<option value="canceled"'+(S.fs==='canceled'?' selected':'')+'>⚫ Cancelado</option>'
    +'</select>'
    +'<input id="mn-ft" class="mn-inp" placeholder="🔍 Buscar driver, placa..." value="'+S.ft+'">'
    +'<span style="font-size:12px;color:#506070;margin-left:4px">'+rows.length+' rotas</span>'
    +'</div>';

  html+='<div style="overflow-x:auto"><table class="mn-tbl"><thead><tr>'
    +'<th>Facility</th><th>Carrier</th><th>Driver</th><th>Placa</th><th>Ciclo</th><th>ETA</th><th>Status</th><th>Alerta</th><th>Kangu</th>'
    +'</tr></thead><tbody>';

  rows.forEach(function(r){
    var isLate=late(r.eta,r.status);
    var isKangu=!!S.kangu[r.tid];
    var rc=r.status==='started'?'st':(isLate?'lt':'');
    html+='<tr class="'+rc+'">'
      +'<td><strong style="color:#00d4ff">'+r.fac+'</strong></td>'
      +'<td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+r.carrier+'">'+r.carrier+'</td>'
      +'<td style="font-weight:600">'+r.driver+'</td>'
      +'<td><code style="color:#00ff88;font-size:11px">'+r.plate+'</code></td>'
      +'<td>'+r.cycle+'</td>'
      +'<td style="font-weight:600;color:#ffcc00">'+r.eta+'</td>'
      +'<td>'+badge(r.status,isLate)+'</td>'
      +'<td>'+(isLate?'<span class="mn-bx mn-bo" style="font-size:10px">⚠️ LATE</span>':r.status==='started'?'<span style="color:#00ff88;font-size:13px">✅</span>':'—')+'</td>'
      +'<td><button class="mn-btn sm '+(isKangu?'k':'') +'" onclick="(function(){'
        +'var s=window.__MN_S__;if(!s)return;'
        +'if(s.kangu[\''+r.tid+'\'])delete s.kangu[\''+r.tid+'\'];else s.kangu[\''+r.tid+'\']=1;'
        +'localStorage.setItem(\'__nk__\',JSON.stringify(s.kangu));'
        +'var p=document.getElementById(\'mn-body\');if(p){var tabs=document.querySelectorAll(\'.mn-tab.on\');}'
        +'window.__MN_RENDER__();'
      +'})()">'+(isKangu?'🦘 Kangu':'🦘')+'</button></td>'
      +'</tr>';
  });

  html+='</tbody></table></div>';
  body.innerHTML=html;

  var elff=body.querySelector('#mn-ff');
  var elfs=body.querySelector('#mn-fs');
  var elft=body.querySelector('#mn-ft');
  if(elff) elff.onchange=function(){S.ff=this.value;renderBody();};
  if(elfs) elfs.onchange=function(){S.fs=this.value;renderBody();};
  if(elft) elft.oninput=function(){S.ft=this.value;renderBody();};
}

// ===================== ABA ESCALA =====================
function renderEscala(body){
  var groups={};
  S.rows.forEach(function(r){
    if(!r.driver) return;
    var k=r.eta||'Sem ETA';
    if(!groups[k]) groups[k]=[];
    groups[k].push(r);
  });

  var keys=Object.keys(groups).sort(function(a,b){
    var ma=e2m(a)||9999,mb=e2m(b)||9999;return ma-mb;
  });

  if(keys.length===0){body.innerHTML='<div style="color:#506070;padding:30px;text-align:center">Nenhum driver com ETA encontrado.</div>';return;}

  var html='<div style="display:flex;flex-direction:column;gap:10px">';

  keys.forEach(function(eta){
    var drivers=groups[eta].slice().sort(function(a,b){return a.driver.localeCompare(b.driver);});
    var total=drivers.length;
    var subiram=drivers.filter(function(d){return d.status==='started';}).length;
    var atrasados=drivers.filter(function(d){return late(d.eta,d.status);}).length;

    html+='<div style="background:rgba(13,21,37,.8);border:1px solid rgba(0,212,255,.15);border-radius:12px;overflow:hidden">';
    html+='<div class="mn-grp" style="margin:0;border-radius:0">'
      +'<div style="display:flex;align-items:center;gap:10px">'
      +'<span style="font-size:14px;font-weight:700;color:#ffcc00">⏰ '+eta+'</span>'
      +'<span style="font-size:12px;color:#506070">'+total+' drivers</span>'
      +(subiram?'<span class="mn-bx mn-bg" style="font-size:10px">✅ '+subiram+' subiram</span>':'')
      +(atrasados?'<span class="mn-bx mn-bo" style="font-size:10px">⚠️ '+atrasados+' atrasados</span>':'')
      +'</div>'
      +'<button class="mn-btn g sm" onclick="(function(){'
        +'var lines=[];'
        +'var ds='+JSON.stringify(drivers.map(function(d,i){return{n:(i+1)+'. '+d.driver,s:d.status,e:d.eta,f:d.fac,isLate:late(d.eta,d.status)};}))+';'
        +'lines.push("*'+eta+' — '+total+' drivers*");'
        +'lines.push("━━━━━━━━━━━");'
        +'ds.forEach(function(d){'
          +'var ic=d.s==="started"?"✅":d.isLate?"⚠️":"⏳";'
          +'lines.push(ic+" "+d.n+" ("+d.f+")");'
        +'});'
        +'navigator.clipboard.writeText(lines.join("\\n")).then(function(){alert("✅ Lista '+eta+' copiada!");});'
      +'})()" >📋 Copiar</button>'+'</div>';

    html+='<div style="padding:10px 14px">';
    drivers.forEach(function(d,i){
      var isLate=late(d.eta,d.status);
      var ic=d.status==='started'?'✅':isLate?'⚠️':'⏳';
      var cor=d.status==='started'?'#00ff88':isLate?'#ff8c00':'#c0d0e8';
      html+='<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04)">'
        +'<span style="color:#506070;font-size:11px;min-width:18px">'+(i+1)+'.</span>'
        +'<span style="font-size:13px">'+ic+'</span>'
        +'<span style="font-weight:600;color:'+cor+';flex:1">'+d.driver+'</span>'
        +'<span style="font-size:11px;color:#00d4ff">'+d.fac+'</span>'
        +'<span style="font-size:11px;color:#506070">'+d.carrier+'</span>'
        +'<span style="font-size:11px;color:#00ff88;font-family:monospace">'+d.plate+'</span>'
        +'</div>';
    });
    html+='</div></div>';
  });

  html+='</div>';

  // Botão copiar escala completa
  html+='<div style="margin-top:14px">'
    +'<button class="mn-btn y" id="mn-cp-escala-all">📋 Copiar Escala Completa</button>'
    +'</div>';

  body.innerHTML=html;

  body.querySelector('#mn-cp-escala-all').onclick=function(){
    var lines=['*📋 ESCALA POR HORÁRIO — '+br(S.date)+'*','━━━━━━━━━━━━━━━━━━━━'];
    keys.forEach(function(eta){
      var drivers=groups[eta].slice().sort(function(a,b){return a.driver.localeCompare(b.driver);});
      lines.push('');
      lines.push('*⏰ '+eta+' ('+drivers.length+' drivers)*');
      drivers.forEach(function(d,i){
        var ic=d.status==='started'?'✅':late(d.eta,d.status)?'⚠️':'⏳';
        lines.push(ic+' '+(i+1)+'. '+d.driver+' ('+d.fac+')');
      });
    });
    cp(lines.join('\n'),'Escala completa');
  };
}

// ===================== ABA FECHAMENTO =====================
function renderFechamento(body){
  var total=S.rows.length;
  var subiram=S.rows.filter(function(r){return r.status==='started';}).length;
  var aceitos=S.rows.filter(function(r){return r.status==='accepted';}).length;
  var definidos=S.rows.filter(function(r){return r.status==='defined';}).length;
  var recusaram=S.rows.filter(function(r){return r.status==='rejected';}).length;
  var cancelados=S.rows.filter(function(r){return r.status==='canceled';}).length;
  var atrasados=S.rows.filter(function(r){return late(r.eta,r.status);}).length;
  var semDriver=S.rows.filter(function(r){return !r.driver;}).length;
  var semPlaca=S.rows.filter(function(r){return !r.plate;}).length;
  var kangus=Object.keys(S.kangu).length;

  var html='';

  // KPIs
  html+='<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px">'
    +'<div class="mn-kpi"><div class="v">'+total+'</div><div class="l">Total Rotas</div></div>'
    +'<div class="mn-kpi" style="border-color:rgba(0,255,136,.3)"><div class="v" style="color:#00ff88">'+subiram+'</div><div class="l">Subiram</div></div>'
    +'<div class="mn-kpi" style="border-color:rgba(0,180,255,.3)"><div class="v" style="color:#00b4ff">'+aceitos+'</div><div class="l">Aceitos</div></div>'
    +'<div class="mn-kpi" style="border-color:rgba(255,204,0,.3)"><div class="v" style="color:#ffcc00">'+definidos+'</div><div class="l">Definidos</div></div>'
    +'<div class="mn-kpi" style="border-color:rgba(255,140,0,.3)"><div class="v" style="color:#ff8c00">'+atrasados+'</div><div class="l">Atrasados</div></div>'
    +'<div class="mn-kpi" style="border-color:rgba(255,51,102,.3)"><div class="v" style="color:#ff3366">'+recusaram+'</div><div class="l">Recusaram</div></div>'
    +'<div class="mn-kpi" style="border-color:rgba(100,120,140,.3)"><div class="v" style="color:#8090a8">'+cancelados+'</div><div class="l">Cancelados</div></div>'
    +'<div class="mn-kpi" style="border-color:rgba(255,51,102,.2)"><div class="v" style="color:#ff3366">'+semDriver+'</div><div class="l">Sem Driver</div></div>'
    +'<div class="mn-kpi" style="border-color:rgba(255,51,102,.2)"><div class="v" style="color:#ff3366">'+semPlaca+'</div><div class="l">Sem Placa</div></div>'
    +'<div class="mn-kpi" style="border-color:rgba(123,97,255,.3)"><div class="v" style="color:#7b61ff">'+kangus+'</div><div class="l">Kangu</div></div>'
    +'</div>';

  // Tabela por facility
  var byFac={};
  S.rows.forEach(function(r){
    if(!byFac[r.fac]) byFac[r.fac]={fac:r.fac,total:0,subiu:0,aceito:0,definido:0,atrasado:0,recusou:0,cancelado:0,semDriver:0,semPlaca:0};
    var f=byFac[r.fac];
    f.total++;
    if(r.status==='started') f.subiu++;
    else if(r.status==='accepted') f.aceito++;
    else if(r.status==='defined') f.definido++;
    else if(r.status==='rejected') f.recusou++;
    else if(r.status==='canceled') f.cancelado++;
    if(late(r.eta,r.status)) f.atrasado++;
    if(!r.driver) f.semDriver++;
    if(!r.plate) f.semPlaca++;
  });

  html+='<div style="overflow-x:auto;margin-bottom:18px"><table class="mn-tbl"><thead><tr>'
    +'<th>Facility</th><th>Total</th><th>✅ Subiu</th><th>🔵 Aceito</th><th>🟡 Defin.</th>'
    +'<th>⚠️ Atrasado</th><th>🔴 Recusou</th><th>⚫ Cancel.</th><th>Sem Driver</th><th>Sem Placa</th>'
    +'</tr></thead><tbody>';

  Object.values(byFac).sort(function(a,b){return a.fac.localeCompare(b.fac);}).forEach(function(f){
    html+='<tr>'
      +'<td><strong style="color:#00d4ff">'+f.fac+'</strong></td>'
      +'<td>'+f.total+'</td>'
      +'<td style="color:#00ff88">'+f.subiu+'</td>'
      +'<td style="color:#00b4ff">'+f.aceito+'</td>'
      +'<td style="color:#ffcc00">'+f.definido+'</td>'
      +'<td style="color:#ff8c00">'+(f.atrasado||'—')+'</td>'
      +'<td style="color:#ff3366">'+(f.recusou||'—')+'</td>'
      +'<td style="color:#8090a8">'+(f.cancelado||'—')+'</td>'
      +'<td style="color:#ff3366">'+(f.semDriver||'—')+'</td>'
      +'<td style="color:#ff3366">'+(f.semPlaca||'—')+'</td>'
      +'</tr>';
  });
  html+='</tbody></table></div>';

  // Botões WhatsApp
  html+='<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px">'
    +'<button class="mn-btn g" id="mn-cp-fechamento">📦 Report Fechamento</button>'
    +'<button class="mn-btn y" id="mn-cp-lista">📋 Lista por Facility/Horário</button>'
    +'<button class="mn-btn r" id="mn-cp-recusou">🔴 Driver Recusou</button>'
    +'<button class="mn-btn k" id="mn-cp-kangu">🦘 Alerta Kangu</button>'
    +'</div>';

  body.innerHTML=html;

  // Report fechamento
  body.querySelector('#mn-cp-fechamento').onclick=function(){
    var lines=['📦 *FECHAMENTO DE SACA — '+br(S.date)+'*','━━━━━━━━━━━━━━━━━━━━',''];
    lines.push('🔢 *Total:* '+total+' rotas');
    lines.push('✅ *Subiram:* '+subiram);
    lines.push('🔵 *Aceitos:* '+aceitos);
    lines.push('🟡 *Definidos:* '+definidos);
    lines.push('⚠️ *Atrasados:* '+atrasados);
    lines.push('🔴 *Recusaram:* '+recusaram);
    lines.push('⚫ *Cancelados:* '+cancelados);
    if(kangus) lines.push('🦘 *Kangu:* '+kangus+' rota(s) repassada(s)');
    lines.push('');
    lines.push('*📊 Por Facility:*');
    Object.values(byFac).sort(function(a,b){return a.fac.localeCompare(b.fac);}).forEach(function(f){
      lines.push('• *'+f.fac+'* — '+f.total+' rotas | ✅'+f.subiu+' 🔵'+f.aceito+' ⚠️'+f.atrasado+' 🔴'+f.recusou);
    });
    cp(lines.join('\n'),'Report fechamento');
  };

  // Lista por facility/horário
  body.querySelector('#mn-cp-lista').onclick=function(){
    var lines=['📋 *LISTA POR FACILITY/HORÁRIO — '+br(S.date)+'*','━━━━━━━━━━━━━━━━━━━━'];
    FACS.forEach(function(fac){
      var facRows=S.rows.filter(function(r){return r.fac===fac;});
      if(!facRows.length) return;
      lines.push('');
      lines.push('*🏭 '+fac+'*');
      var etaGroups={};
      facRows.forEach(function(r){var k=r.eta||'Sem ETA';if(!etaGroups[k])etaGroups[k]=[];etaGroups[k].push(r);});
      Object.keys(etaGroups).sort(function(a,b){return (e2m(a)||9999)-(e2m(b)||9999);}).forEach(function(eta){
        lines.push('  ⏰ *'+eta+'*');
        etaGroups[eta].slice().sort(function(a,b){return a.driver.localeCompare(b.driver);}).forEach(function(d,i){
          var ic=d.status==='started'?'✅':late(d.eta,d.status)?'⚠️':'⏳';
          lines.push('  '+ic+' '+(i+1)+'. '+d.driver+(d.plate?' | '+d.plate:''));
        });
      });
    });
    cp(lines.join('\n'),'Lista por facility');
  };

  // Driver recusou
  body.querySelector('#mn-cp-recusou').onclick=function(){
    var rejeitados=S.rows.filter(function(r){return r.status==='rejected';});
    if(!rejeitados.length){toast('ℹ️ Nenhum driver recusou hoje.');return;}
    var lines=['🔴 *DRIVERS QUE RECUSARAM — '+br(S.date)+'*','━━━━━━━━━━━━━━━━━━━━',''];
    rejeitados.forEach(function(r){
      var novoEta=r.eta?(function(){var m=e2m(r.eta)+30;var h=Math.floor(m/60);var mi=m%60;return String(h).padStart(2,'0')+':'+String(mi).padStart(2,'0');}()):'—';
      lines.push('• *'+r.driver+'*');
      lines.push('  Facility: '+r.fac+' | Carrier: '+r.carrier);
      lines.push('  ETA original: '+r.eta+' | Sugestão novo ETA: *'+novoEta+'*');
      lines.push('  Travel ID: '+r.tid);
      lines.push('');
    });
    cp(lines.join('\n'),'Lista recusaram');
  };

  // Alerta Kangu
  body.querySelector('#mn-cp-kangu').onclick=function(){
    var kIds=Object.keys(S.kangu);
    var kRows=S.rows.filter(function(r){return S.kangu[r.tid];});
    if(!kRows.length){toast('ℹ️ Nenhuma rota marcada como Kangu.');return;}
    var lines=['🦘 *ROTAS REPASSADAS — KANGU — '+br(S.date)+'*','━━━━━━━━━━━━━━━━━━━━',''];
    kRows.forEach(function(r){
      lines.push('• Travel '+r.tid+' | *'+r.fac+'* | ETA: '+r.eta);
      lines.push('  Carrier: '+r.carrier+' | Driver: '+(r.driver||'—')+' | Placa: '+(r.plate||'—'));
      lines.push('');
    });
    lines.push('_Total: '+kRows.length+' rota(s) Kangu_');
    cp(lines.join('\n'),'Alerta Kangu');
  };
}

// ===================== INIT =====================
window.__window.__MN_S__=S;
window.__MN_RENDER__=function(){renderBody();};
buildPanel();
})();