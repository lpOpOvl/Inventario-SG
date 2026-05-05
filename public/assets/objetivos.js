let objCache=[];
let objActiveCat=null;

document.addEventListener('DOMContentLoaded',async()=>{
  if(!requireAuth())return;
  await initPage();
  await renderObj();
});

async function renderObj(){
  try{const r=await fetch('/api/objectives');const d=await r.json();objCache=d.objectives||[];}catch{objCache=[];}
  renderObjList();
}

function setObjCat(cat){objActiveCat=cat;renderObjList();}

function renderObjList(){
  const objs=objCache||[];
  const el=document.getElementById('objContainer');
  const tabsEl=document.getElementById('objCatTabs');
  if(!tabsEl||!el)return;
  if(!objs.length){tabsEl.innerHTML='';el.innerHTML=`<div class="empty"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg><p>Sem objetivos definidos ainda.</p></div>`;return;}
  const catOrder=['Componentes de Mineração','Armas FPS','Armaduras FPS','Componentes de Nave','Armas de Nave','Evento'];
  const catColors={'Componentes de Mineração':'#f59e0b','Armas FPS':'#f87171','Armaduras FPS':'#60a5fa','Componentes de Nave':'#a78bfa','Armas de Nave':'#34d399','Evento':'#fbbf24'};
  const cats={};
  objs.forEach((o,i)=>{const cat=o.category||'Componentes de Mineração';if(!cats[cat])cats[cat]=[];cats[cat].push({o,i});});
  const available=[...catOrder.filter(c=>cats[c]),...Object.keys(cats).filter(c=>!catOrder.includes(c))];
  if(!objActiveCat||(objActiveCat!=='__todos__'&&!cats[objActiveCat]))objActiveCat='__todos__';
  const totalCount=objs.length;
  const todosActive=objActiveCat==='__todos__';
  const todosBg=todosActive?'rgba(148,163,184,0.15)':'var(--card)';
  const todosBorder=todosActive?'#94a3b8':'var(--border2)';
  const todosClr=todosActive?'#e2e8f0':'var(--muted)';
  const todoBtn='<button onclick="setObjCat(\'__todos__\')" style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:0.5rem;font-size:0.84rem;font-weight:600;cursor:pointer;border:1px solid '+todosBorder+';background:'+todosBg+';color:'+todosClr+';transition:all 0.15s;font-family:\'Inter\',sans-serif;white-space:nowrap;flex-shrink:0;">Todos <span style="font-size:0.7rem;opacity:0.7;">'+totalCount+'</span></button>';
  tabsEl.innerHTML=todoBtn+available.map(cat=>{
    const color=catColors[cat]||'#94a3b8';
    const active=cat===objActiveCat;
    const bg=active?`rgba(${hexToRgb(color)},0.12)`:'var(--card)';
    const border=active?color:'var(--border2)';
    const clr=active?color:'var(--muted)';
    const safecat=cat.replace(/'/g,"\\'");
    return'<button onclick="setObjCat(\''+safecat+'\')" style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:0.5rem;font-size:0.84rem;font-weight:600;cursor:pointer;border:1px solid '+border+';background:'+bg+';color:'+clr+';transition:all 0.15s;font-family:\'Inter\',sans-serif;white-space:nowrap;flex-shrink:0;">'+esc(cat)+' <span style="font-size:0.7rem;opacity:0.7;">'+cats[cat].length+'</span></button>';
  }).join('')+'<div style="flex:1;"></div>';
  const items=objActiveCat==='__todos__'?objs.map((o,i)=>({o,i})):(cats[objActiveCat]||[]);
  const accentColors=['#fbbf24','#94a3b8','#b47c3c','#6366f1','#22c55e','#60a5fa','#f472b6','#34d399'];
  const rankClass=i=>i===0?'r1':i===1?'r2':i===2?'r3':'rn';
  const rankLabel=i=>`${i+1}º`;
  el.innerHTML=`<div class="obj-list">${items.map(({o,i})=>{
    const ic=oreIcon(o.item);const unit=oreUnit(o.item);const isGem=GEM_M.has(o.item);
    const hasTarget=o.target_qty!=null&&parseFloat(o.target_qty)>0;
    const targetFmt=hasTarget?(isGem?Math.round(o.target_qty):parseFloat(o.target_qty).toLocaleString('pt-BR',{minimumFractionDigits:3,maximumFractionDigits:3})):null;
    const accent=accentColors[i%accentColors.length];
    const iconBg=ic==='gem'?'rgba(20,184,166,0.12)':'rgba(245,158,11,0.12)';
    const iconColor=ic==='gem'?'#2dd4bf':'#f59e0b';
    const catColor=catColors[o.category||'']||'#94a3b8';
    const cardAccent=objActiveCat==='__todos__'?catColor:accent;
    return`<div class="obj-card" style="--obj-accent:${cardAccent};">
      <div class="obj-rank ${rankClass(i)}">${rankLabel(i)}</div>
      <div style="width:30px;height:30px;border-radius:0.4rem;background:${iconBg};display:flex;align-items:center;justify-content:center;color:${iconColor};flex-shrink:0;">${itemSvg(ic)}</div>
      <div style="flex:1;min-width:0;display:flex;align-items:center;gap:8px;overflow:hidden;">
        <span style="font-size:1.15rem;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(o.item)}</span>
        ${objActiveCat==='__todos__'?`<span style="font-size:0.72rem;font-weight:600;color:${catColor};white-space:nowrap;flex-shrink:0;opacity:0.85;">${esc(o.category||'')}</span>`:''}
        ${o.category==='Evento'&&o.event_name?`<span style="font-size:0.75rem;font-weight:600;color:#fbbf24;white-space:nowrap;flex-shrink:0;background:rgba(251,191,36,0.12);border:1px solid rgba(251,191,36,0.3);border-radius:4px;padding:2px 8px;">&#9889; ${esc(o.event_name)}</span>`:''}
      </div>
      <div style="flex:0 0 160px;display:flex;align-items:center;justify-content:center;"><span style="font-size:0.8rem;color:var(--muted);white-space:nowrap;">${o.note?esc(o.note):''}</span></div>
      <div style="flex:0 0 120px;display:flex;align-items:center;justify-content:flex-end;">${hasTarget?`<div style="text-align:right;"><div style="font-size:0.6rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.07em;">${o.event_name?esc(o.event_name):'Meta'}</div><div style="font-size:1.1rem;font-weight:800;color:${catColor};line-height:1.2;">${targetFmt} <span style="font-size:0.7rem;font-weight:600;color:var(--muted);">${unit}</span></div></div>`:''}</div>
    </div>`;
  }).join('')}</div>`;
}
