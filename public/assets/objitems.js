let objItemsCache=[];let objItemsActiveCat=null;
const _bpMap={};const _oiData={};

const OBJ_ITEM_CATS=['Armas (FPS)','Armadura (FPS)','Armas (Veículo)','Componentes (Veículo)','Componentes (Mining)'];
const OBJ_ITEM_COLORS={'Armas (FPS)':'#f87171','Armadura (FPS)':'#60a5fa','Armas (Veículo)':'#34d399','Componentes (Veículo)':'#a78bfa','Componentes (Mining)':'#f59e0b'};

document.addEventListener('DOMContentLoaded',async()=>{
  if(!requireAuth())return;
  await initPage();
  await renderObjItems();
});

function _fmtProp(p){
  if(!p)return'';
  const part=p.includes('_')?p.split('_').slice(1).join(' '):p;
  return part.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/\b\w/g,c=>c.toUpperCase());
}

async function _loadBp(){
  if(Object.keys(_bpMap).length)return;
  try{
    const r=await fetch('/ptblueprints.json');
    const raw=await r.json();
    const arr=raw.blueprints||(Array.isArray(raw)?raw:[]);
    arr.forEach(bp=>{
      const name=bp.blueprintName||'';
      if(!name)return;
      const ings=(bp.slots||[]).map(slot=>{
        const opt=slot.options&&slot.options[0];
        if(!opt)return null;
        const isItem=opt.type==='item';
        const isResource=opt.type==='resource';
        if(!isItem&&!isResource)return null;
        const resName=isResource?(opt.resourceName||''):(opt.entityName||'');
        if(!resName)return null;
        const qty=isItem?(opt.quantity||1):(slot.requiredCount||1);
        // Group raw modifier entries by property (piecewise segments)
        const propSegs={};
        (opt.modifiers||[]).forEach(m=>{
          const prop=_fmtProp(m.gameplayProperty||'');
          if(!prop)return;
          if(!propSegs[prop])propSegs[prop]=[];
          propSegs[prop].push({sq:m.startQuality??0,eq:m.endQuality??1000,vs:m.modifierAtStart??1,ve:m.modifierAtEnd??1});
        });
        const mods=Object.entries(propSegs)
          .map(([property,segs])=>({property,segs:segs.sort((a,b)=>a.sq-b.sq)}))
          .filter(mod=>Math.abs(_oiPieceEval(mod.segs,1000)-_oiPieceEval(mod.segs,500))>0.0005);
        return{name:resName,quantity:qty,modifiers:mods};
      }).filter(Boolean);
      _bpMap[name.toLowerCase()]={name,category:bp.categoryName||'',ingredients:ings};
    });
  }catch{}
}

async function renderObjItems(){
  try{const r=await fetch('/api/objectives_items');const d=await r.json();objItemsCache=d.objectives_items||[];}catch{objItemsCache=[];}
  await _loadBp();
  renderObjItemsList();
}

function setObjItemCat(cat){objItemsActiveCat=cat;renderObjItemsList();}

// Evaluate a piecewise-linear modifier at quality q
function _oiPieceEval(segs,quality){
  const q=Math.max(0,Math.min(1000,+quality));
  let seg=segs[0];
  for(const s of segs){if(q>=s.sq)seg=s;else break;}
  const{sq,eq,vs,ve}=seg;
  if(eq<=sq)return vs;
  const t=Math.max(0,Math.min(1,(q-sq)/(eq-sq)));
  return vs+(ve-vs)*t;
}

function _oiCalc(mod,quality){return _oiPieceEval(mod.segs,quality);}
function _oiBase(mod){return _oiCalc(mod,500);}
// Properties where lower modifier = better player experience → show improvement as positive
const _INVERTED=new Set(['recoil smoothness','recoil handling','fuelrequirement']);
function _sign(mod){return _INVERTED.has((mod.property||'').toLowerCase())?-1:1;}
function _fmtDelta(mod,quality){
  const pct=(_oiCalc(mod,quality)-_oiBase(mod))*_sign(mod)*100;
  return(pct>=0?'+':'')+pct.toFixed(1)+'%';
}
function _deltaCls(mod,quality){
  const d=(_oiCalc(mod,quality)-_oiBase(mod))*_sign(mod);
  return d>0.0005?'pos':d<-0.0005?'neg':'neu';
}

function oiSliderUpdate(cid,ii,quality){
  const ings=_oiData[cid];if(!ings||!ings[ii])return;
  (ings[ii].modifiers||[]).forEach((mod,mi)=>{
    const el=document.getElementById('oiv-'+cid+'-'+ii+'-'+mi);if(!el)return;
    el.textContent=_fmtDelta(mod,quality);
    el.className='oi-mod-val '+_deltaCls(mod,quality);
  });
  const qEl=document.getElementById('oiq-'+cid+'-'+ii);if(qEl)qEl.textContent=quality;
  const sl=document.getElementById('ois-'+cid+'-'+ii);if(sl)sl.style.setProperty('--pct',((+quality-500)/500*100)+'%');
  _oiRebuildSummary(cid);
}

function _oiRebuildSummary(cid){
  const ings=_oiData[cid];if(!ings)return;
  const totals={};
  ings.forEach((ing,ii)=>{
    const sl=document.getElementById('ois-'+cid+'-'+ii);
    const q=sl?+sl.value:500;
    (ing.modifiers||[]).forEach(mod=>{
      const p=mod.property||'Modifier';
      const delta=(_oiCalc(mod,q)-_oiBase(mod))*_sign(mod)*100;
      totals[p]=(totals[p]||0)+delta;
    });
  });
  const el=document.getElementById('oi-sum-'+cid);if(!el)return;
  const props=Object.keys(totals);
  if(!props.length){el.style.display='none';return;}
  el.style.display='';
  el.innerHTML='<div class="oi-sum-label">Total combinado</div>'+props.map(p=>{
    const v=totals[p];const cls=v>0.01?'pos':v<-0.01?'neg':'neu';
    return`<div class="oi-sum-row"><span class="oi-sum-prop">${esc(p)}</span><span class="oi-sum-val oi-mod-val ${cls}">${(v>=0?'+':'')+v.toFixed(1)+'%'}</span></div>`;
  }).join('');
}

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
  const catIcons={
    'Armas (FPS)':'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/></svg>',
    'Armadura (FPS)':'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    'Armas (Veículo)':'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    'Componentes (Veículo)':'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>',
    'Componentes (Mining)':'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>'
  };

  Object.keys(_oiData).forEach(k=>delete _oiData[k]);

  el.innerHTML=`<div class="obj-list">${items.map(({o,i})=>{
    const catColor=OBJ_ITEM_COLORS[o.category||'']||'#94a3b8';
    const cardAccent=objItemsActiveCat==='__todos__'?catColor:accentColors[i%accentColors.length];
    const hasTarget=o.target_qty!=null&&parseFloat(o.target_qty)>0;
    const targetFmt=hasTarget?Math.round(parseFloat(o.target_qty)):null;
    const iconSvg=catIcons[o.category||'']||catIcons['Componentes (Mining)'];
    const iconBg=`rgba(${hexToRgb(catColor)},0.12)`;
    const cid=o.id||i;
    const bp=_bpMap[(o.item||'').toLowerCase()];
    _oiData[cid]=bp?bp.ingredients:[];
    const ings=_oiData[cid];

    const hasMods=ings.some(ing=>ing.modifiers.length>0);
    const ingHtml=ings.length?`<div class="oi-ingredients">${ings.map((ing,ii)=>{
      const defQ=500;const pct=0;
      const modsHtml=ing.modifiers.length?ing.modifiers.map((mod,mi)=>`<div class="oi-mod-row"><span class="oi-mod-prop">${esc(mod.property||'Modifier')}</span><span class="oi-mod-val ${_deltaCls(mod,defQ)}" id="oiv-${cid}-${ii}-${mi}">${_fmtDelta(mod,defQ)}</span></div>`).join(''):'';
      return`<div class="oi-ingredient">
        <div class="oi-ing-top">
          <span class="oi-ing-name">${esc(ing.name)}<span class="oi-qty-badge">×${ing.quantity}</span></span>
          ${modsHtml?`<div class="oi-mods">${modsHtml}</div>`:''}
        </div>
        <div class="oi-slider-row">
          <span class="oi-slider-lbl">500</span>
          <input type="range" class="oi-slider" id="ois-${cid}-${ii}" min="500" max="1000" step="1" value="${defQ}" style="--pct:${pct}%" oninput="oiSliderUpdate(${cid},${ii},+this.value)">
          <span class="oi-slider-lbl">1000</span>
          <span class="oi-slider-qval" id="oiq-${cid}-${ii}">${defQ}</span>
        </div>
      </div>`;
    }).join('')}${hasMods?`<div class="oi-summary" id="oi-sum-${cid}"></div>`:''}</div>`:'';

    return`<div class="obj-card oi-card" style="--obj-accent:${cardAccent};--oi-accent:${catColor};">
      <div class="oi-main-row">
        <div class="obj-rank rn">${i+1}º</div>
        <div style="width:30px;height:30px;border-radius:0.4rem;background:${iconBg};display:flex;align-items:center;justify-content:center;color:${catColor};flex-shrink:0;">${iconSvg}</div>
        <div style="flex:1;min-width:0;display:flex;align-items:center;gap:8px;overflow:hidden;">
          <span style="font-size:1.15rem;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(o.item)}</span>
          ${objItemsActiveCat==='__todos__'?`<span style="font-size:0.72rem;font-weight:600;color:${catColor};white-space:nowrap;flex-shrink:0;opacity:0.85;">${esc(o.category||'')}</span>`:''}
        </div>
        <div style="display:flex;align-items:center;gap:12px;flex-shrink:0;">
          ${o.note?`<span style="font-size:0.8rem;color:var(--muted);">${esc(o.note)}</span>`:''}
          ${hasTarget?`<div style="text-align:right;"><div style="font-size:0.6rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.07em;">Meta</div><div style="font-size:1.1rem;font-weight:800;color:${catColor};line-height:1.2;">${targetFmt} <span style="font-size:0.7rem;font-weight:600;color:var(--muted);">UND</span></div></div>`:''}
        </div>
      </div>
      ${ingHtml}
    </div>`;
  }).join('')}</div>`;
  items.forEach(({o,i})=>_oiRebuildSummary(o.id||i));
}
