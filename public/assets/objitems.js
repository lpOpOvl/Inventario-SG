let objItemsCache=[];
let objItemsActiveCat=null;

const OBJ_ITEM_CATS=['Armas (FPS)','Armadura (FPS)','Armas (Veículo)','Componentes (Veículo)','Componentes (Mining)'];
const OBJ_ITEM_COLORS={'Armas (FPS)':'#f87171','Armadura (FPS)':'#60a5fa','Armas (Veículo)':'#34d399','Componentes (Veículo)':'#a78bfa','Componentes (Mining)':'#f59e0b'};

document.addEventListener('DOMContentLoaded',async()=>{
  if(!requireAuth())return;
  await initPage();
  await renderObjItems();
});

async function renderObjItems(){
  try{const r=await fetch('/api/objectives_items');const d=await r.json();objItemsCache=d.objectives_items||[];}catch{objItemsCache=[];}
  renderObjItemsList();
}

function setObjItemCat(cat){objItemsActiveCat=cat;renderObjItemsList();}

function renderObjItemsList(){
  const objs=objItemsCache||[];
  const el=document.getElementById('objitemsContainer');
  const tabsEl=document.getElementById('objitemsCatTabs');
  if(!tabsEl||!el)return;
  if(!objs.length){
    tabsEl.innerHTML='';
    el.innerHTML=`<div class="empty"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg><p>Sem objetivos de itens definidos ainda.</p></div>`;
    return;
  }
  const cats={};
  objs.forEach((o,i)=>{const cat=o.category||'Armas (FPS)';if(!cats[cat])cats[cat]=[];cats[cat].push({o,i});});
  const available=[...OBJ_ITEM_CATS.filter(c=>cats[c]),...Object.keys(cats).filter(c=>!OBJ_ITEM_CATS.includes(c))];
  if(!objItemsActiveCat||(objItemsActiveCat!=='__todos__'&&!cats[objItemsActiveCat]))objItemsActiveCat='__todos__';
  const totalCount=objs.length;
  const todosActive=objItemsActiveCat==='__todos__';
  const todosBg=todosActive?'rgba(148,163,184,0.15)':'var(--card)';
  const todosBorder=todosActive?'#94a3b8':'var(--border2)';
  const todosClr=todosActive?'#e2e8f0':'var(--muted)';
  const todoBtn='<button onclick="setObjItemCat(\'__todos__\')" style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:0.5rem;font-size:0.84rem;font-weight:600;cursor:pointer;border:1px solid '+todosBorder+';background:'+todosBg+';color:'+todosClr+';transition:all 0.15s;font-family:\'Inter\',sans-serif;white-space:nowrap;flex-shrink:0;">Todos <span style="font-size:0.7rem;opacity:0.7;">'+totalCount+'</span></button>';
  tabsEl.innerHTML=todoBtn+available.map(cat=>{
    const color=OBJ_ITEM_COLORS[cat]||'#94a3b8';
    const active=cat===objItemsActiveCat;
    const rgb=hexToRgb(color);
    const bg=active?`rgba(${rgb},0.12)`:'var(--card)';
    const border=active?color:'var(--border2)';
    const clr=active?color:'var(--muted)';
    const safecat=cat.replace(/'/g,"\\'");
    return'<button onclick="setObjItemCat(\''+safecat+'\')" style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:0.5rem;font-size:0.84rem;font-weight:600;cursor:pointer;border:1px solid '+border+';background:'+bg+';color:'+clr+';transition:all 0.15s;font-family:\'Inter\',sans-serif;white-space:nowrap;flex-shrink:0;">'+esc(cat)+' <span style="font-size:0.7rem;opacity:0.7;">'+cats[cat].length+'</span></button>';
  }).join('')+'<div style="flex:1;"></div>';

  const items=objItemsActiveCat==='__todos__'?objs.map((o,i)=>({o,i})):(cats[objItemsActiveCat]||[]);
  const accentColors=['#fbbf24','#94a3b8','#b47c3c','#6366f1','#22c55e','#60a5fa','#f472b6','#34d399'];
  const rankClass=i=>i===0?'r1':i===1?'r2':i===2?'r3':'rn';
  const rankLabel=i=>`${i+1}º`;
  const catIcons={
    'Armas (FPS)':'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/></svg>',
    'Armadura (FPS)':'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    'Armas (Veículo)':'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    'Componentes (Veículo)':'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>',
    'Componentes (Mining)':'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>'
  };

  el.innerHTML=`<div class="obj-list">${items.map(({o,i})=>{
    const catColor=OBJ_ITEM_COLORS[o.category||'']||'#94a3b8';
    const cardAccent=objItemsActiveCat==='__todos__'?catColor:accentColors[i%accentColors.length];
    const hasTarget=o.target_qty!=null&&parseFloat(o.target_qty)>0;
    const targetFmt=hasTarget?Math.round(parseFloat(o.target_qty)):null;
    const iconSvg=catIcons[o.category||'']||catIcons['Componentes (Mining)'];
    const iconBg=`rgba(${hexToRgb(catColor)},0.12)`;
    return`<div class="obj-card" style="--obj-accent:${cardAccent};">
      <div class="obj-rank ${rankClass(i)}">${rankLabel(i)}</div>
      <div style="width:30px;height:30px;border-radius:0.4rem;background:${iconBg};display:flex;align-items:center;justify-content:center;color:${catColor};flex-shrink:0;">${iconSvg}</div>
      <div style="flex:1;min-width:0;display:flex;align-items:center;gap:8px;overflow:hidden;">
        <span style="font-size:1.15rem;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(o.item)}</span>
        ${objItemsActiveCat==='__todos__'?`<span style="font-size:0.72rem;font-weight:600;color:${catColor};white-space:nowrap;flex-shrink:0;opacity:0.85;">${esc(o.category||'')}</span>`:''}
      </div>
      <div style="flex:0 0 160px;display:flex;align-items:center;justify-content:center;"><span style="font-size:0.8rem;color:var(--muted);white-space:nowrap;">${o.note?esc(o.note):''}</span></div>
      <div style="flex:0 0 120px;display:flex;align-items:center;justify-content:flex-end;">${hasTarget?`<div style="text-align:right;"><div style="font-size:0.6rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.07em;">Meta</div><div style="font-size:1.1rem;font-weight:800;color:${catColor};line-height:1.2;">${targetFmt} <span style="font-size:0.7rem;font-weight:600;color:var(--muted);">UND</span></div></div>`:''}</div>
    </div>`;
  }).join('')}</div>`;
}
