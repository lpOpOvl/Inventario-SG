// ── CATALOG ──────────────────────────────────────────────────────────────
const DEFAULT_SHIP=['Agricium','Aluminum','Aslarite','Beryl','Bexalite','Borase','Copper','Corundum','Glacium','Gold','Hephaestanite','Iron','Laranite','Lindinium','Ouratite','Quantanium','Quartz','Riccite','Savrilium','Silicon','Stileron','Taranite','Titanium','Torite','Tungsten'];
const DEFAULT_GEM=['Aphorite','Beradom','Carinite','Carinite (Pure)','Dolivine','Feynmaline','Glacosite','Hadanite','Jaclium','Jaclium (Ore)','Janalite','Sadaryx','Saldynium','Saldynium (Ore)'];
let SHIP_LIST=JSON.parse(localStorage.getItem('sg_ship_list')||'null')||[...DEFAULT_SHIP];
let GEM_LIST=JSON.parse(localStorage.getItem('sg_gem_list')||'null')||[...DEFAULT_GEM];
let SHIP_M=new Set(SHIP_LIST);
const ROC_M=new Set();
let GEM_M=new Set(GEM_LIST);
function refreshOreSets(){SHIP_M=new Set(SHIP_LIST);GEM_M=new Set(GEM_LIST);}
const QSPEC={};
function qCfg(n){return{min:900,max:1000,req:true};}
function oreIcon(n){if(GEM_M.has(n))return'gem';if(SHIP_M.has(n))return'ship';return'comm';}
function oreBadge(n){if(GEM_M.has(n))return['badge-gem','Gema'];if(SHIP_M.has(n))return['badge-ship','Minério'];return['badge-comm','Minério'];}
function oreUnit(n){return GEM_M.has(n)?'UND':'SCU';}
function buildOreOptions(){
  const shipOpts=SHIP_LIST.slice().sort().map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('');
  const gemOpts=GEM_LIST.slice().sort().map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('');
  const html=`<optgroup label="Minérios Ship">${shipOpts}</optgroup><optgroup label="Gemas (UND)">${gemOpts}</optgroup>`;
  ['iOre','aOre'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=html;});
}

// ── USER STATE ────────────────────────────────────────────────────────────
let cUser='';
let allUsers=[];
let allLocations=[];
let adminExtra=new Set();
const ADMINS=new Set(['lpOpOvl']);
function isAdmin(){return ADMINS.has(cUser)||adminExtra.has(cUser);}

// ── AUTH GUARD ────────────────────────────────────────────────────────────
function requireAuth(){
  const saved=localStorage.getItem('sg_user');
  if(!saved){window.location.href='/index.html';return false;}
  cUser=saved;
  return true;
}
function logout(){
  const u=localStorage.getItem('sg_user');
  if(u)try{fetch('/api/activity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,action:'logout'}),keepalive:true});}catch{}
  localStorage.removeItem('sg_user');
  window.location.href='/index.html';
}

// ── CACHE HELPERS (5 min TTL) ─────────────────────────────────────────────
const _CACHE_TTL=5*60*1000;
function _cGet(k){try{const s=localStorage.getItem(k);if(!s)return null;const{t,v}=JSON.parse(s);return Date.now()-t<_CACHE_TTL?v:null;}catch{return null;}}
function _cSet(k,v){try{localStorage.setItem(k,JSON.stringify({t:Date.now(),v}));}catch{}}
function _cBg(url,key,apply){fetch(url).then(r=>r.json()).then(d=>{_cSet(key,d);apply(d);}).catch(()=>{});}

// ── PAGE INIT (topbar + admins + locs) ───────────────────────────────────
async function initPage(){
  const av=document.getElementById('uAv');const nb=document.getElementById('uName');
  if(av){av.textContent=cUser[0].toUpperCase();const uc=userColor(cUser);av.style.background=`linear-gradient(135deg,${uc.text},${uc.border.replace('0.35','0.8').replace('0.3','0.8')})`;}
  if(nb)nb.textContent=cUser;
  // Pageview ping — fire-and-forget, não bloqueia
  const _pg=location.pathname.replace(/^\/|\.html$/g,'').replace(/^\s*$/,'home');
  try{fetch('/api/activity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:cUser,action:'pageview',page:_pg})});}catch{}

  const ca=_cGet('sg_admins');const cl=_cGet('sg_locs');

  // Apply cache immediately — no network wait
  if(ca){adminExtra=new Set(ca.admins||[]);checkAdminUI();}
  if(cl){allLocations=cl.locations||[];buildLocSelects();}

  if(ca&&cl){
    // Both cached: refresh silently in background, return instantly
    _cBg('/api/admins','sg_admins',d=>{adminExtra=new Set(d.admins||[]);checkAdminUI();});
    _cBg('/api/locations','sg_locs',d=>{allLocations=d.locations||[];buildLocSelects();});
    return;
  }

  // Missing cache: fetch both in parallel (first visit or expired)
  const [ra,rl]=await Promise.all([
    ca?null:fetch('/api/admins').then(r=>r.json()).catch(()=>null),
    cl?null:fetch('/api/locations').then(r=>r.json()).catch(()=>null)
  ]);
  if(ra){_cSet('sg_admins',ra);adminExtra=new Set(ra.admins||[]);checkAdminUI();}
  if(rl){_cSet('sg_locs',rl);allLocations=rl.locations||[];buildLocSelects();}
}
function checkAdminUI(){
  const show=isAdmin();
  const navAdmin=document.getElementById('nav-admin');
  if(navAdmin)navAdmin.style.display=show?'flex':'none';
  if(show){
    const nb=document.getElementById('uName');
    if(nb&&!document.getElementById('adminBadge')){
      const b=document.createElement('span');b.id='adminBadge';b.className='badge-admin';b.textContent='ADM';
      nb.parentNode.insertBefore(b,nb.nextSibling);
    }
  }
}

// ── LOCALIZAÇÕES ──────────────────────────────────────────────────────────
async function loadLocations(){
  try{const r=await fetch('/api/locations');const d=await r.json();allLocations=d.locations||[];_cSet('sg_locs',d);}catch{allLocations=[];}
  buildLocSelects();
}
function buildLocSelects(){
  const grouped={};
  allLocations.forEach(l=>{const sys=l.system||'Outro';if(!grouped[sys])grouped[sys]=[];grouped[sys].push(l);});
  const html='<option value="">— Selecionar —</option>'+Object.keys(grouped).sort().map(sys=>`<optgroup label="${esc(sys)}">${grouped[sys].map(l=>`<option value="${esc(l.name)}">${esc(l.name)}</option>`).join('')}</optgroup>`).join('');
  ['iLoc','aLoc','invMLoc'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=html;});
}

// ── GOAL BANNER ───────────────────────────────────────────────────────────
async function checkGoalBanner(){
  try{
    const[ro,ri]=await Promise.all([
      fetch('/api/objectives').then(r=>r.json()),
      fetch('/api/items?org=1').then(r=>r.json())
    ]);
    const objs=(ro.objectives||[]).filter(o=>o.target_qty!=null&&parseFloat(o.target_qty)>0);
    const items=ri.items||[];
    const banner=document.getElementById('goalBanner');
    if(!banner)return;
    if(!objs.length){banner.classList.remove('show');return;}
    const stockMap={};
    items.forEach(i=>{const k=i.name;stockMap[k]=(stockMap[k]||0)+parseFloat(i.quantity||0);});
    const reached=objs.filter(o=>(stockMap[o.item]||0)>=parseFloat(o.target_qty));
    if(!reached.length){banner.classList.remove('show');return;}
    const isGemFn=n=>GEM_M&&GEM_M.has(n);
    const fmtQty=o=>{
      const total=stockMap[o.item]||0;
      const unit=isGemFn(o.item)?'UND':'SCU';
      const tgt=isGemFn(o.item)?Math.round(o.target_qty):parseFloat(o.target_qty).toLocaleString('pt-BR',{minimumFractionDigits:3,maximumFractionDigits:3});
      const cur=isGemFn(o.item)?Math.round(total):total.toLocaleString('pt-BR',{minimumFractionDigits:3,maximumFractionDigits:3});
      return`${cur} / ${tgt} ${unit}`;
    };
    if(reached.length===1){
      document.getElementById('goalBannerTitle').textContent=`Meta atingida: ${reached[0].item}`;
      document.getElementById('goalBannerItems').textContent=fmtQty(reached[0]);
    }else{
      document.getElementById('goalBannerTitle').textContent=`${reached.length} metas atingidas`;
      document.getElementById('goalBannerItems').textContent=reached.map(o=>`${o.item}: ${fmtQty(o)}`).join('  ·  ');
    }
    banner.classList.add('show');
  }catch(e){console.warn('checkGoalBanner:',e);}
}

// ── STATS CARDS ───────────────────────────────────────────────────────────
const DEFAULT_CARDS=[
  {id:'sc0',cls:'blue',lbl:'Total de Itens',valId:'s0',icon:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z"/><path d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z"/><path d="M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z"/></svg>'},
  {id:'sc1',cls:'green',lbl:'Disponíveis',valId:'s1',icon:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><polyline points="3.29 7 12 12 20.71 7"/></svg>'},
  {id:'sc2',cls:'indigo',lbl:'Registos',valId:'s2',icon:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="2"><path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><polyline points="3.29 7 12 12 20.71 7"/></svg>'},
  {id:'sc3',cls:'gray',lbl:'Tipos de Itens',valId:'s3',icon:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><polyline points="3.29 7 12 12 20.71 7"/></svg>'},
];
const rankColors=['#fbbf24','#94a3b8','#b47c3c','#64748b'];
const rankBg=['rgba(251,191,36,0.1)','rgba(148,163,184,0.08)','rgba(180,120,60,0.1)','rgba(100,116,139,0.08)'];
async function renderStatsCards(){
  try{
    const r=await fetch('/api/objectives');const d=await r.json();
    const objs=(d.objectives||[]).slice(0,4);
    for(let i=0;i<4;i++){
      const sc=document.getElementById('sc'+i);if(!sc)continue;
      if(i<objs.length){
        const o=objs[i];const isGem=GEM_M.has(o.item);const unit=isGem?'UND':'SCU';
        const hasTarget=o.target_qty&&parseFloat(o.target_qty)>0;
        const targetFmt=hasTarget?(isGem?Math.round(o.target_qty):parseFloat(o.target_qty).toLocaleString('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:3})):null;
        const iconSvg=`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${rankColors[i]}" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`;
        sc.innerHTML=`<div class="sc-icon" style="background:${rankBg[i]};flex-shrink:0;">${iconSvg}</div><div class="sc-body"><div class="sc-label" style="color:${rankColors[i]};">${i+1}º Objetivo</div><div style="font-weight:700;color:var(--text);font-size:1rem;white-space:normal;word-break:break-word;">${esc(o.item)}</div><div style="display:flex;align-items:center;gap:6px;margin-top:2px;">${o.note?`<span style="font-size:0.7rem;color:var(--muted);">${esc(o.note)}</span>`:''} ${hasTarget?`<span style="font-size:0.7rem;font-weight:700;color:#f59e0b;">Meta: ${targetFmt} ${unit}</span>`:''}</div></div>`;
      }else{
        const def=DEFAULT_CARDS[i];
        sc.innerHTML=`<div class="sc-icon ${def.cls}">${def.icon}</div><div class="sc-body"><div class="sc-label">${def.lbl}</div><div class="sc-val" id="${def.valId}">0</div></div>`;
      }
    }
  }catch{}
}

// ── USER COLORS ───────────────────────────────────────────────────────────
const USER_COLORS=[
  {bg:'rgba(59,130,246,0.15)',border:'rgba(59,130,246,0.35)',text:'#60a5fa'},
  {bg:'rgba(16,185,129,0.12)',border:'rgba(16,185,129,0.3)',text:'#34d399'},
  {bg:'rgba(245,158,11,0.12)',border:'rgba(245,158,11,0.3)',text:'#fbbf24'},
  {bg:'rgba(239,68,68,0.12)',border:'rgba(239,68,68,0.3)',text:'#f87171'},
  {bg:'rgba(168,85,247,0.12)',border:'rgba(168,85,247,0.3)',text:'#c084fc'},
  {bg:'rgba(236,72,153,0.12)',border:'rgba(236,72,153,0.3)',text:'#f472b6'},
  {bg:'rgba(20,184,166,0.12)',border:'rgba(20,184,166,0.3)',text:'#2dd4bf'},
  {bg:'rgba(249,115,22,0.12)',border:'rgba(249,115,22,0.3)',text:'#fb923c'},
];
function userColor(name){let h=0;for(let i=0;i<(name||'').length;i++)h=(h*31+name.charCodeAt(i))>>>0;return USER_COLORS[h%USER_COLORS.length];}
function playerPill(name){const c=userColor(name);return`<span class="player-pill" style="background:${c.bg};border:1px solid ${c.border};color:${c.text};"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${esc(name)}</span>`;}

// ── UTILIDADES ────────────────────────────────────────────────────────────
function setStat(id,val){const el=document.getElementById(id);if(el)el.textContent=val;}
function itemSvg(t){
  if(t==='ship')return`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/></svg>`;
  if(t==='roc')return`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`;
  return`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`;
}
function emptyH(m){return`<div class="empty"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg><p>${m}</p></div>`;}
function fQ(v){return parseFloat(v||0).toLocaleString('pt-BR',{minimumFractionDigits:3,maximumFractionDigits:3});}
function esc(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function escNl(s){return esc(s).replace(/\n/g,'<br>');}
function hexToRgb(hex){const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return`${r},${g},${b}`;}
function regEntrada(username,name,qty,quality,loc){
  fetch('/api/transactions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,item_name:name,quantity:qty,unit:oreUnit(name),quality,location:loc,quantity_before:0,quantity_after:qty,type:'entrada',to_player:null})});
}

// ── MOBILE SIDEBAR ────────────────────────────────────────────────────────
function _initMobileSidebar(){
  const topbar=document.querySelector('.topbar');
  const sidebar=document.querySelector('.sidebar');
  if(!topbar||!sidebar)return;

  // Inject hamburger button
  const btn=document.createElement('button');
  btn.className='hamburger';
  btn.setAttribute('aria-label','Menu');
  btn.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
  topbar.prepend(btn);

  // Inject backdrop
  let backdrop=document.getElementById('sidebarBackdrop');
  if(!backdrop){
    backdrop=document.createElement('div');
    backdrop.id='sidebarBackdrop';
    backdrop.className='sidebar-backdrop';
    document.body.appendChild(backdrop);
  }

  const open=()=>{sidebar.classList.add('open');backdrop.classList.add('show');document.body.style.overflow='hidden';};
  const close=()=>{sidebar.classList.remove('open');backdrop.classList.remove('show');document.body.style.overflow='';};

  btn.addEventListener('click',()=>sidebar.classList.contains('open')?close():open());
  backdrop.addEventListener('click',close);

  // Close on nav item click (for mobile UX)
  sidebar.querySelectorAll('.sb-item').forEach(el=>el.addEventListener('click',()=>{if(window.innerWidth<768)close();}));
}

// ── SCROLL REVEAL ─────────────────────────────────────────────────────────
function _initScrollReveal(){
  const targets=document.querySelectorAll('.sc,.obj-card,.tbl-wrap,.rule-card,.admin-card');
  if(!targets.length)return;
  targets.forEach(el=>el.classList.add('reveal'));
  if(!('IntersectionObserver' in window)){
    targets.forEach(el=>el.classList.add('revealed'));return;
  }
  const obs=new IntersectionObserver(entries=>{
    entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('revealed');obs.unobserve(e.target);}});
  },{threshold:0.08});
  targets.forEach(el=>obs.observe(el));
}

// ── TOAST ─────────────────────────────────────────────────────────────────
let tt;
function toast(m,t){const el=document.getElementById('toast');el.textContent=m;el.className=`show ${t}`;clearTimeout(tt);tt=setTimeout(()=>el.classList.remove('show'),4000);}

// Run after DOM ready
document.addEventListener('DOMContentLoaded',()=>{_initMobileSidebar();_initScrollReveal();});
