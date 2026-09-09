javascript:(function(){
'use strict';

// ============================================================
// MONITOR NODOS — Last Mile SRJ3 — by Kelvin
// ============================================================

const ID        = '__MONITOR_NODOS__';
const BACKDROP  = '__MONITOR_NODOS_BD__';
const FACILITIES = ['SRJ3','ERJ2','ERJ5','BRNRJ381','BRNRJ82','BRNRJ719',
  'BRNRJ153','BRNRJ542','BRNRJ564','BRNRJ906','BRNRJ1510','BRNRJ1924',
  'BRNRJ12663','BRNSP1335','BRNRJ122','BRNRJ12898'];

// === TOGGLE ===
const existing = document.getElementById(ID);
if (existing) {
  const bd = document.getElementById(BACKDROP);
  const visible = existing.style.display !== 'none';
  existing.style.display = visible ? 'none' : 'flex';
  if (bd) bd.style.display = visible ? 'none' : 'block';
  return;
}

// === STATE ===
const S = {
  date: getTodayStr(),
  tab: 'nodos',
  data: [],       // merged rows
  summary: {},
  loading: false,
  countdown: 60,
  timer: null,
  cdTimer: null,
  kangu: {},      // travelID -> true (marcados como Kangu)
};

function getTodayStr() {
  const d = new Date();
  return d.toISOString().slice(0,10);
}
function fmtDate(str) {
  const [y,m,d] = str.split('-');
  return `${d}/${m}/${y}`;
}
function addDays(str, n) {
  const d = new Date(str + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0,10);
}
function nowHHMM() {
  const d = new Date();
  return d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
}
function etaPassed(eta) {
  if (!eta || eta === '00:00') return false;
  const [eh,em] = eta.split(':').map(Number);
  const now = new Date();
  const etaMs = eh*60+em;
  const nowMs = now.getHours()*60+now.getMinutes();
  return nowMs > etaMs + 60; // passou ETA + 1h
}

// === STYLES ===
const styleEl = document.createElement('style');
styleEl.textContent = `
  #${ID} * { box-sizing: border-box; font-family: 'Segoe UI', system-ui, sans-serif; }
  #${ID} ::-webkit-scrollbar { width: 6px; height: 6px; }
  #${ID} ::-webkit-scrollbar-track { background: #0a0e1a; }
  #${ID} ::-webkit-scrollbar-thumb { background: #00d4ff55; border-radius: 3px; }
  @keyframes nodos-glow {
    0%,100% { box-shadow: 0 0 15px rgba(0,212,255,0.3), 0 0 40px rgba(0,212,255,0.1), inset 0 0 30px rgba(0,212,255,0.03); }
    50%      { box-shadow: 0 0 30px rgba(0,212,255,0.7), 0 0 80px rgba(0,212,255,0.25), inset 0 0 60px rgba(0,212,255,0.06); }
  }
  @keyframes nodos-scan {
    0%   { top: -2px; opacity:0; }
    5%   { opacity: 1; }
    95%  { opacity: 1; }
    100% { top: 100%; opacity:0; }
  }
  @keyframes nodos-shimmer {
    0%   { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes nodos-pulse-red {
    0%,100% { opacity:1; } 50% { opacity:0.3; }
  }
  @keyframes nodos-spin {
    from { transform: rotate(0deg); } to { transform: rotate(360deg); }
  }
  .nodos-scan-line {
    position: absolute; left:0; right:0; height:2px; pointer-events:none; z-index:9999;
    background: linear-gradient(90deg, transparent, #00d4ff, #ffffff88, #00d4ff, transparent);
    animation: nodos-scan 4s linear infinite;
  }
  .nodos-shimmer-text {
    background: linear-gradient(90deg, #00d4ff, #ffffff, #00d4ff, #7b61ff, #00d4ff);
    background-size: 200% auto;
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    animation: nodos-shimmer 3s linear infinite;
  }
  .nodos-tab { cursor:pointer; padding:7px 16px; border-radius:20px; font-size:12px; font-weight:600;
    color:#7090b0; border:1px solid transparent; transition:all .25s; white-space:nowrap; }
  .nodos-tab:hover { color:#00d4ff; border-color:rgba(0,212,255,0.3); }
  .nodos-tab.active { color:#00d4ff; background:rgba(0,212,255,0.12); border-color:rgba(0,212,255,0.5);
    box-shadow: 0 0 12px rgba(0,212,255,0.3); }
  .nodos-btn { cursor:pointer; padding:6px 14px; border-radius:8px; font-size:12px; font-weight:600;
    border:1px solid rgba(0,212,255,0.4); background:rgba(0,212,255,0.1); color:#00d4ff;
    transition:all .2s; }
  .nodos-btn:hover { background:rgba(0,212,255,0.25); box-shadow:0 0 12px rgba(0,212,255,0.4); }
  .nodos-btn.green { border-color:rgba(0,255,136,0.4); background:rgba(0,255,136,0.1); color:#00ff88; }
  .nodos-btn.green:hover { background:rgba(0,255,136,0.25); box-shadow:0 0 12px rgba(0,255,136,0.4); }
  .nodos-btn.yellow { border-color:rgba(255,204,0,0.4); background:rgba(255,204,0,0.08); color:#ffcc00; }
  .nodos-table { width:100%; border-collapse:collapse; font-size:12px; }
  .nodos-table th { color:#00d4ff; font-size:11px; text-transform:uppercase; letter-spacing:.5px;
    padding:8px 10px; border-bottom:1px solid rgba(0,212,255,0.2); text-align:left; position:sticky; top:0;
    background:#0d1525; z-index:2; }
  .nodos-table td { padding:7px 10px; border-bottom:1px solid rgba(255,255,255,0.04); color:#c8d8f0;
    vertical-align:middle; }
  .nodos-table tr:hover td { background:rgba(0,212,255,0.05); }
  .nodos-table tr:hover td:first-child { border-left:2px solid #00d4ff; }
  .badge { display:inline-block; padding:2px 8px; border-radius:10px; font-size:11px; font-weight:600; }
  .badge-green  { background:rgba(0,255,136,0.15); color:#00ff88; border:1px solid rgba(0,255,136,0.3); }
  .badge-yellow { background:rgba(255,204,0,0.15); color:#ffcc00; border:1px solid rgba(255,204,0,0.3); }
  .badge-blue   { background:rgba(0,180,255,0.15); color:#00b4ff; border:1px solid rgba(0,180,255,0.3); }
  .badge-red    { background:rgba(255,51,102,0.15); color:#ff3366; border:1px solid rgba(255,51,102,0.3); }
  .badge-gray   { background:rgba(120,140,160,0.15); color:#8aa0b8; border:1px solid rgba(120,140,160,0.3); }
  .badge-orange { background:rgba(255,140,0,0.15); color:#ff8c00; border:1px solid rgba(255,140,0,0.3); }
  .badge-kangu  { background:rgba(123,97,255,0.15); color:#7b61ff; border:1px solid rgba(123,97,255,0.4); }
  .nodos-alert { animation: nodos-pulse-red 1s infinite; }
  .nodos-kpi { background:rgba(0,212,255,0.06); border:1px solid rgba(0,212,255,0.2); border-radius:10px;
    padding:12px 16px; text-align:center; flex:1; min-width:100px; }
  .nodos-kpi .val { font-size:26px; font-weight:700; color:#00d4ff; line-height:1; }
  .nodos-kpi .lbl { font-size:10px; color:#6080a0; margin-top:4px; text-transform:uppercase; letter-spacing:.5px; }
  .nodos-group-header { background:rgba(0,212,255,0.08); border-left:3px solid #00d4ff;
    padding:8px 14px; border-radius:6px; margin-bottom:6px; display:flex; align-items:center;
    justify-content:space-between; cursor:pointer; }
  .nodos-group-header:hover { background:rgba(0,212,255,0.14); }
  .nodos-loading { display:flex; align-items:center; gap:10px; color:#00d4ff; padding:30px; justify-content:center; }
  .nodos-spinner { width:20px; height:20px; border:2px solid rgba(0,212,255,0.2);
    border-top-color:#00d4ff; border-radius:50%; animation:nodos-spin .8s linear infinite; }
  .nodos-toast { position:fixed; bottom:30px; right:30px; background:#0d1525;
    border:1px solid #00ff88; color:#00ff88; padding:10px 20px; border-radius:10px;
    font-size:13px; font-weight:600; z-index:999999; box-shadow:0 0 20px rgba(0,255,136,0.3); }
`;
document.head.appendChild(styleEl);

// === BACKDROP ===
const bd = document.createElement('div');
bd.id = BACKDROP;
Object.assign(bd.style, {
  position:'fixed', inset:'0', background:'rgba(0,0,0,0.55)',
  backdropFilter:'blur(4px)', zIndex:'99998'
});
bd.onclick = () => {
  panel.style.display = 'none';
  bd.style.display = 'none';
};
document.body.appendChild(bd);

// === PANEL ===
const panel = document.createElement('div');
panel.id = ID;
Object.assign(panel.style, {
  position:'fixed', top:'40px', right:'30px', width:'900px', maxWidth:'96vw',
  height:'82vh', background:'#0a0e1a', border:'1px solid rgba(0,212,255,0.35)',
  borderRadius:'16px', display:'flex', flexDirection:'column', zIndex:'99999',
  animation:'nodos-glow 3s ease-in-out infinite', overflow:'hidden',
  color:'#e0e8ff',
});

// scan line
const scanLine = document.createElement('div');
scanLine.className = 'nodos-scan-line';
panel.appendChild(scanLine);

// === HEADER ===
const header = document.createElement('div');
Object.assign(header.style, {
  background:'linear-gradient(135deg,#0d1b3e,#1a2a6c,#0d1b3e)',
  padding:'14px 18px', display:'flex', alignItems:'center',
  justifyContent:'space-between', cursor:'move', flexShrink:'0',
  borderBottom:'1px solid rgba(0,212,255,0.2)',
});
header.innerHTML = `
  <div style="display:flex;align-items:center;gap:12px">
    <span style="font-size:20px">🛰️</span>
    <span class="nodos-shimmer-text" style="font-size:16px;font-weight:700;letter-spacing:1px">MONITOR NODOS</span>
    <span id="nodos-date-label" style="font-size:12px;color:#7090b0;margin-left:4px"></span>
  </div>
  <div style="display:flex;align-items:center;gap:8px">
    <button id="nodos-prev" class="nodos-btn" style="padding:4px 10px">◀</button>
    <span id="nodos-date-display" style="font-size:13px;color:#00d4ff;font-weight:600;min-width:80px;text-align:center"></span>
    <button id="nodos-next" class="nodos-btn" style="padding:4px 10px">▶</button>
    <button id="nodos-refresh" class="nodos-btn" style="margin-left:8px">🔄 <span id="nodos-cd">60</span>s</button>
    <button id="nodos-close" style="background:rgba(255,51,102,0.15);border:1px solid rgba(255,51,102,0.4);color:#ff3366;border-radius:8px;padding:4px 12px;cursor:pointer;font-size:13px;font-weight:700">✕</button>
  </div>
`;
panel.appendChild(header);

// === TABS ===
const tabsBar = document.createElement('div');
Object.assign(tabsBar.style, {
  display:'flex', gap:'6px', padding:'10px 16px',
  borderBottom:'1px solid rgba(0,212,255,0.1)', flexShrink:'0',
  background:'rgba(0,0,0,0.2)', overflowX:'auto',
});
tabsBar.innerHTML = `
  <div class="nodos-tab active" data-tab="nodos">🛰️ Nodos</div>
  <div class="nodos-tab" data-tab="escala">📋 Escala por Horário</div>
  <div class="nodos-tab" data-tab="fechamento">📦 Fechamento</div>
  <div class="nodos-