javascript:(function(){
'use strict';

const PID = '__MONITOR_NODOS__';
const BID = '__MONITOR_NODOS_BD__';
const FACILITIES = ['SRJ3','ERJ2','ERJ5','BRNRJ381','BRNRJ82','BRNRJ719',
  'BRNRJ153','BRNRJ542','BRNRJ564','BRNRJ906','BRNRJ1510','BRNRJ1924',
  'BRNRJ12663','BRNSP1335','BRNRJ122','BRNRJ12898'];

// === TOGGLE SINGLETON ===
const ex = document.getElementById(PID);
if(ex){
  const bd = document.getElementById(BID);
  const v = ex.style.display !== 'none';
  ex.style.display = v ? 'none' : 'flex';
  if(bd) bd.style.display = v ? 'none' : 'block';
  return;
}

// === STATE ===
const S = {
  date: getToday(),
  tab: 'nodos',
  rows: [],
  summary: {},
  loading: false,
  cd: 60,
  kangu: JSON.parse(localStorage.getItem('__nodos_kangu__')||'{}'),
  refreshTimer: null,
  cdTimer: null,
  filterFac: '',
  filterStatus: '',
  filterText: ''
};

function getToday(){
  return new Date().toISOString().slice(0,10);
}
function addDays(s,n){
  const d = new Date(s+'T12:00:00');
  d.setDate(d.getDate()+n);
  return d.toISOString().slice(0,10);
}
function fmtBR(s){
  const [y,m,d]=s.split('-'); return d+'/'+m+'/'+y;
}
function nowMin(){
  const n=new Date(); return n.getHours()*60+n.getMinutes();
}
function etaToMin(e){
  if(!e||e==='00:00') return null;
  const [h,m]=e.split(':').map(Number); return h*60+m;
}
function isLate(eta,status){
  if(status==='started') return false;
  const em=etaToMin(eta); if(em===null) return false;
  return nowMin() > em+60;
}
function saveKangu(){
  localStorage.setItem('__nodos_kangu__',JSON.stringify(S.kangu));
}

// === FETCH ===
async function fetchAll(){
  S.loading=true; renderBody();
  const dt=S.date;
  const base='https://envios.adminml.com';
  try{
    const [r1,r2,r3]=await Promise.all([
      fetch(`${base}/logistics/travel-management/api/schedules?date_lt_eq=${dt}&date_gt_eq=${dt}&step_type=last_mile`,{credentials:'include'}).then(r=>r.json()),
      fetch(`${base}/logistics/travel-management/api/schedules/summary?date_lt_eq=${dt}&date_gt_eq=${dt}&step_type=last_mile`,{credentials:'include'}).then(r=>r.json()),
      fetch(`${base}/logistics/rostering/api/services/details?startDate=${dt}&endDate=${dt}&stepType=last_mile&channel=logistics`,{credentials:'include'}).then(r=>r.json())
    ]);
    const schedules = Array.isArray(r1) ? r1 : (r1.data||[]);
    S.summary = r2||{};
    const roster = Array.isArray(r3) ? r3 : (r3.data||[]);

    // JOIN por travel_id
    const rMap={};
    roster.forEach(r=>{ rMap[String(r.travelID)]=r; });

    S.rows = schedules
      .filter(s=> FACILITIES.includes(s.origin_facility_id||s.destination_facility_id))
      .map(s=>{
        const tid=String(s.travel_id);
        const ro=rMap[tid]||{};
        const drv=s.assigned&&s.assigned.drivers&&s.assigned.drivers[0];
        const veh=s.assigned&&s.assigned.vehicles&&s.assigned.vehicles[0];
        const step=s.steps&&s.steps[0];
        const rstep=ro.steps&&ro.steps[0];
        return {
          travelId: tid,
          facility: s.origin_facility_id||s.destination_facility_id||'',
          carrier: s.carrier_description||ro.carrierName||'',
          driverName: drv ? (drv.first_name+' '+drv.last_name).trim() : '',
          plate: veh ? veh.license_plate : '',
          cycle: step ? step.cycle_id : '',
          eta: rstep ? rstep.ETA : (step ? step.eta : ''),
          etd: rstep ? rstep.ETD : '',
          status: s.status||'',
          locked: ro.locked||false,
          serviceName: ro.serviceName||s.service_description||'',
          vehicleType: ro.vehicleType ? ro.vehicleType.name : '',
          limitDate: ro.limitDate||''
        };
      });
  }catch(e){
    console.error('[Monitor Nodos]',e);
  }
  S.loading=false;
  renderBody();
}

// === CSS ===
function injectCSS(){
  if(document.getElementById('__nodos_css__')) return;
  const st=document.createElement('style');
  st.id='__nodos_css__';
  st.textContent=`
  #${PID} *{box-sizing:border-box;font-family:'Segoe UI',system-ui,sans-serif}
  #${PID} ::-webkit-scrollbar{width:5px;height:5px}
  #${PID} ::-webkit-scrollbar-track{background:#0a0e1a}
  #${PID} ::-webkit-scrollbar-thumb{background:#00d4ff44;border-radius:3px}
  @keyframes nd-glow{
    0%,100%{box-shadow:0 0 20px rgba(0,212,255,.3),0 0 60px rgba(0,212,255,.08),inset 0 0 30px rgba(0,212,255,.03)}
    50%{box-shadow:0 0 40px rgba(0,212,255,.7),0 0 100px rgba(0,212,255,.18),inset 0 0 60px rgba(0,212,255,.07)}
  }
  @keyframes nd-scan{
    0%{top:-2px;opacity:0}5%{opacity:1}95%{opacity:1}100%{top:100%;opacity:0}
  }
  @keyframes nd-shimmer{
    0%{background-position:0% center}100%{background-position:200% center}
  }
  @keyframes nd-pulse{
    0%,100%{opacity:1}50%{opacity:.25}
  }
  @keyframes nd-spin{
    from{transform:rotate(0)}to{transform:rotate(360deg)}
  }
  @keyframes nd-toast{
    0%{opacity:0;transform:translateY(10px)}15%{opacity:1;transform:translateY(0)}
    85%{opacity:1}100%{opacity:0}
  }
  .nd-scan{position:absolute;left:0;right:0;height:2px;pointer-events:none;z-index:9;
    background:linear-gradient(90deg,transparent,#00d4ff,rgba(255,255,255,.5),#00d4ff,transparent);
    animation:nd-scan 4s linear infinite}
  .nd-shimmer{
    background:linear-gradient(90deg,#00d4ff,#fff,#00d4ff,#7b61ff,#00d4ff);
    background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;
    animation:nd-shimmer 3s linear infinite}
  .nd-tab{cursor:pointer;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:600;
    color:#607898;border:1px solid transparent;transition:all .2s;white-space:nowrap}
  .nd-tab:hover{color:#00d4ff;border-color:rgba(0,212,255,.3)}
  .nd-tab.on{color:#00d4ff;background:rgba(0,212,255,.12);border-color:rgba(0,212,255,.5);
    box-shadow:0 0 12px rgba(0,212,255,.3)}
  .nd-btn{cursor:pointer;padding:5px 13px;border-radius:8px;font-size:12px;font-weight:600;
    border:1px solid rgba(0,212,255,.4);background:rgba(0,212,255,.08);color:#00d4ff;transition:all .2s}
  .nd-btn:hover{background:rgba(0,212,255,.22);box-shadow:0 0 10px rgba(0,212,255,.4)}
  .nd-btn.g{border-color:rgba(0,255,136,.4);background:rgba(0,255,136,.08);color:#00ff88}
  .nd-btn.g:hover{background:rgba(0,255,136,.22);box-shadow:0 0 10px rgba(0,255,136,.4)}
  .nd-btn.y{border-color:rgba(255,204,0,.4);background:rgba(255,204,0,.08);color:#ffcc00}
  .nd-btn.y:hover{background:rgba(255,204,0,.22)}
  .nd-btn.r{border-color:rgba(255,51,102,.4);background:rgba(255,51,102,.08);color:#ff3366}
  .nd-btn.sm{padding:2px 8px;font-size:11px;border-radius:6px}
  .nd-tbl{width:100%;border-collapse:collapse;font-size:12px}
  .nd-tbl th{color:#00d4ff;font-size:11px;text-transform:uppercase;letter-spacing:.5px;
    padding:7px 10px;border-bottom:1px solid rgba(0,212,255,.18);text-align:left;
    position:sticky;top:0;background:#0d1525;z-index:2}
  .nd-tbl td{padding:6px 10px;border-bottom:1px solid rgba(255,255,255,.04);color:#c0d0e8;vertical-align:middle}
  .nd-tbl tr:hover td{background:rgba(0,212,255,.05)}
  .nd-tbl tr.started td{background:rgba(0,255,136,.04)}
  .nd-tbl tr.late td{background:rgba(255,51,102,.06)}
  .bx{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600}
  .bx-g{background:rgba(0,255,136,.14);color:#00ff88;border:1px solid rgba(0,255,136,.3)}
  .bx-b{background:rgba(0,180,255,.14);color:#00b4ff;border:1px solid rgba(0,180,255,.3)}
  .bx-y{background:rgba(255,204,0,.14);color:#ffcc00;border:1px solid rgba(255,204,0,.3)}
  .bx-r{background:rgba(255,51,102,.14);color:#ff3366;border:1px solid rgba(255,51,102,.3)}
  .bx-gr{background:rgba(100,120,140,.14);color:#8090a8;border:1px solid rgba(100,120,140,.3)}
  .bx-o{background:rgba(255,140,0,.14);color:#ff8c00;border:1px solid rgba(255,140,0,.3);animation:nd-pulse 1s infinite}
  .bx-k{background:rgba(123,97,255,.14);color:#7b61ff;border:1px solid rgba(123,97,255,.4)}
  .nd-kpi{background:rgba(0,212,255,.05);border:1px solid rgba(0,212,255,.18);border-radius:10px;
    padding:12px 14px;text-align:center;flex:1;min-width:90px}
  .nd-kpi .v{font-size:24px;font-weight:700;color:#00d4ff;line-height:1}
  .nd-kpi .l{font-size:10px;color:#506070;margin-top:3px;text-transform:uppercase;letter-spacing:.5px}
  .nd-grp{background:rgba(0,212,255,.07);border-left:3px solid #00d4ff;padding:8px 14px;
    border-radius:6px;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between}
  .nd-grp:hover{background:rgba(0,212,255,.12);cursor:pointer}
  .nd-spinner{width:18px;height:18px;border:2px solid rgba(0,212,255,.2);
    border-top-color:#00d4ff;border-radius:50%;animation:nd-spin .8s linear infinite}
  .nd-filter{background:rgba(255,255,255,.05);border:1px solid rgba(0,212,255,.2);
    border-radius:8px;color:#c0d0e8;padding:5px 10px;font-size:12px;outline:none}
  .nd-filter:focus{border-color:rgba(0,212,255,.5)}
  `;
  document.head.appendChild(st);
}

// === BADGE STATUS ===
function badge(status, late){
  if(late) return '<span class="bx bx-o">⚠️ ATRASADO</span>';
  const m={
    started:  '<span class="bx bx-g">✅ Subiu</span>',
    accepted: '<span class="bx bx-b">🔵 Aceito</span>',
    defined:  '<span class="bx bx-y">🟡 Definido</span>',
    rejected: '<span class="bx bx-r">🔴 Recusou</span>',
    canceled: '<span class="bx bx-gr">⚫ Cancelado</span>',
    not_defined:'<span class="bx bx-gr">— Sem rota</span>'
  };
  return m[status]||`<span class="bx bx-gr">${status}</span>`;
}

// === TOAST ===
function toast(msg){
  const t=document.createElement('div');
  Object.assign(t.style,{
    position:'fixed',bottom:'28px',right:'28px',
    background:'#0d1525',border:'1px solid #00ff