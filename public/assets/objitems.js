let objItemsCache=[];let objItemsActiveCat=null;
const _bpMap={};const _oiData={};const _oiQuality={};const _oiBStats={};

const OBJ_ITEM_CATS=['Armas (FPS)','Armadura (FPS)','Armas (Veículo)','Componentes (Veículo)','Componentes (Mining)'];
const OBJ_ITEM_COLORS={'Armas (FPS)':'#f87171','Armadura (FPS)':'#60a5fa','Armas (Veículo)':'#34d399','Componentes (Veículo)':'#a78bfa','Componentes (Mining)':'#f59e0b'};

document.addEventListener('DOMContentLoaded',async()=>{
  if(!requireAuth())return;
  await initPage();
  await renderObjItems();
});

// Generic prefixes that add no display value — strip them
const _NOISY_PFX=new Set(['weapon','vehicleweapon','vehicleitem','vehicle','health','item','fpsgear','fps']);

function _fmtProp(p){
  if(!p)return'';
  let s=p;
  if(p.includes('_')){
    const parts=p.split('_');
    const skip=parts.length>1&&_NOISY_PFX.has(parts[0].toLowerCase())?1:0;
    s=parts.slice(skip).join(' ');
  }
  s=s.replace(/([a-z])([A-Z])/g,'$1 $2');
  const sfx='max|min|health|regen|rate|range|speed|power|time|cooldown|damage|charge|resistance|capacity|generation|temperature|requirement|level|count|shield|armor|mitigation|reduction|multiplier|penalty|bonus|strength|recharge';
  s=s.replace(new RegExp('([a-z])('+sfx+')(?=[^a-z]|$)','gi'),'$1 $2');
  s=s.replace(/\b(max|min)([a-z])/gi,'$1 $2');
  return s.replace(/\b\w/g,c=>c.toUpperCase()).replace(/\s+/g,' ').trim();
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
        const qty=isItem?(opt.quantity||1):(opt.standardCargoUnits||slot.requiredCount||1);
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
        return{name:resName,quantity:qty,isItem,modifiers:mods};
      }).filter(Boolean);
      const baseStats={};Object.entries(bp.vehicleBaseStats||{}).forEach(([k,v])=>{if(v==null)return;const fk=_fmtProp(k);if(fk)baseStats[fk]=v;});
      _bpMap[name.toLowerCase()]={name,category:bp.categoryName||'',ingredients:ings,baseStats};
    });
  }catch{}
}

async function renderObjItems(){
  try{const r=await fetch('/api/objectives_items');const d=await r.json();objItemsCache=d.objectives_items||[];}catch{objItemsCache=[];}
  await _loadBp();
  renderObjItemsList();
}

function setObjItemCat(cat){objItemsActiveCat=cat;renderObjItemsList();}

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
function _oiBase(){return 1;}
function _fmtNum(n){return Math.round(n).toLocaleString('pt-PT');}

const _FLIP=new Set(['recoil smoothness','recoil handling','fuelrequirement','fuel requirement']);
const _NEG_GOOD=new Set(['recoil kick']);

function _dispVal(prop,rawPct){
  const pk=(prop||'').toLowerCase();
  return _FLIP.has(pk)?-rawPct:rawPct;
}
function _effVal(prop,rawPct){
  const pk=(prop||'').toLowerCase();
  return(_FLIP.has(pk)||_NEG_GOOD.has(pk))?-rawPct:rawPct;
}
function _valCls(eff){return eff>0.01?'pos':eff<-0.01?'neg':'neu';}
function _propKey(prop){return prop.toLowerCase().replace(/[^a-z0-9]/g,'-');}

function oiIngUpdate(cid,ingIdx,quality){
  if(!_oiQuality[cid])_oiQuality[cid]={};
  _oiQuality[cid][ingIdx]=+quality;

  const pct=((+quality-500)/500*100);
  const sl=document.getElementById('ois-'+cid+'-'+ingIdx);
  if(sl)sl.style.setProperty('--pct',pct+'%');
  const qEl=document.getElementById('oiq-'+cid+'-'+ingIdx);
  if(qEl)qEl.textContent=quality;

  const ings=_oiData[cid]||[];

  // Current deltas at each ingredient's actual quality
  const totals={};
  ings.forEach((ing,idx)=>{
    const q=(_oiQuality[cid]||{})[idx]??500;
    ing.modifiers.forEach(mod=>{
      const p=mod.property||'';if(!p)return;
      if(!totals[p])totals[p]=0;
      totals[p]+=(_oiCalc(mod,q)-_oiBase())*100;
    });
  });

  // Max possible deltas (all ings at q=1000) for bar normalisation per property
  const maxTotals={};
  ings.forEach(ing=>{
    ing.modifiers.forEach(mod=>{
      const p=mod.property||'';if(!p)return;
      if(!maxTotals[p])maxTotals[p]=0;
      maxTotals[p]+=(_oiCalc(mod,1000)-_oiBase())*100;
    });
  });

  Object.entries(totals).forEach(([prop,rawVal])=>{
    const key=_propKey(prop);
    const disp=_dispVal(prop,rawVal);
    const eff=_effVal(prop,rawVal);
    const cls=_valCls(eff);

    const valEl=document.getElementById('oiv-'+cid+'-'+key);
    if(valEl){valEl.textContent=(disp>=0?'+':'')+disp.toFixed(2)+'%';valEl.className='oi-stat-val '+cls;}

    const fillEl=document.getElementById('oib-'+cid+'-'+key);
    if(fillEl){
      const maxDisp=Math.abs(_dispVal(prop,maxTotals[prop]||0));
      const barPct=maxDisp>0?Math.min(100,Math.abs(disp)/maxDisp*100):0;
      fillEl.style.width=barPct+'%';
      fillEl.className='oi-bar-f '+cls;
    }

    const finalEl=document.getElementById('oifs-'+cid+'-'+key);
    if(finalEl){
      const base=(_oiBStats[cid]||{})[prop];
      if(base!=null){finalEl.textContent=_fmtNum(base*(1+rawVal/100));finalEl.className='oi-bf-val '+cls;}
    }
  });
}

function oiIngStep(cid,ingIdx,delta){
  const sl=document.getElementById('ois-'+cid+'-'+ingIdx);
  if(!sl)return;
  const v=Math.max(500,Math.min(1000,+sl.value+delta));
  sl.value=v;
  oiIngUpdate(cid,ingIdx,v);
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
    'Armas (FPS)':'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/></svg>',
    'Armadura (FPS)':'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    'Armas (Veículo)':'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    'Componentes (Veículo)':'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>',
    'Componentes (Mining)':'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>'
  };

  Object.keys(_oiData).forEach(k=>delete _oiData[k]);
  Object.keys(_oiQuality).forEach(k=>delete _oiQuality[k]);
  Object.keys(_oiBStats).forEach(k=>delete _oiBStats[k]);

  el.innerHTML=`<div class="oi-list">${items.map(({o,i})=>{
    const catColor=OBJ_ITEM_COLORS[o.category||'']||'#94a3b8';
    const cardAccent=objItemsActiveCat==='__todos__'?catColor:accentColors[i%accentColors.length];
    const hasTarget=o.target_qty!=null&&parseFloat(o.target_qty)>0;
    const targetFmt=hasTarget?Math.round(parseFloat(o.target_qty)):null;
    const iconSvg=catIcons[o.category||'']||catIcons['Componentes (Mining)'];
    const iconBg=`rgba(${hexToRgb(catColor)},0.12)`;
    const cid=o.id||i;
    const bp=_bpMap[(o.item||'').toLowerCase()];
    _oiData[cid]=bp?bp.ingredients:[];
    const baseStats=bp?bp.baseStats:{};
    _oiBStats[cid]=baseStats;
    const ings=_oiData[cid];

    const propSet=[];const seen=new Set();
    ings.forEach(ing=>ing.modifiers.forEach(mod=>{
      const p=mod.property||'';if(!p||seen.has(p))return;
      seen.add(p);propSet.push(p);
    }));
    const hasMods=propSet.length>0;

    const combinedRows=propSet.map(prop=>{
      const key=_propKey(prop);
      const baseVal=(baseStats||{})[prop];
      const hasBase=baseVal!=null;
      return`<div class="oi-comb-row">
        <div class="oi-comb-top">
          <span class="oi-comb-prop">${esc(prop)}</span>
          <span class="oi-stat-val neu" id="oiv-${cid}-${key}">+0.00%</span>
        </div>
        <div class="oi-bar"><div class="oi-bar-f neu" id="oib-${cid}-${key}" style="width:0%"></div></div>
        ${hasBase?`<div class="oi-bf"><div class="oi-bf-item"><span class="oi-bf-lbl">BASE</span><span class="oi-bf-val">${_fmtNum(baseVal)}</span></div><span class="oi-bf-sep">→</span><div class="oi-bf-item"><span class="oi-bf-lbl">FINAL</span><span class="oi-bf-val neu" id="oifs-${cid}-${key}">${_fmtNum(baseVal)}</span></div></div>`:''}
      </div>`;
    }).join('');

    // Per-ingredient sliders — without 500/1000 labels to avoid overflow
    const ingSliders=ings.map((ing,ingIdx)=>{
      if(!ing.modifiers.length)return'';
      return`<div class="oi-ing-row">
        <span class="oi-ing-name" title="${esc(ing.name)}">${esc(ing.name)}</span>
        <span class="oi-ing-qty">${ing.isItem?ing.quantity+'×':ing.quantity}</span>
        <input type="range" class="oi-slider" id="ois-${cid}-${ingIdx}" min="500" max="1000" step="1" value="500" style="--pct:0%" oninput="oiIngUpdate(${cid},${ingIdx},+this.value)">
        <button class="oi-step" onclick="oiIngStep(${cid},${ingIdx},-1)">−</button>
        <span class="oi-qv" id="oiq-${cid}-${ingIdx}">500</span>
        <button class="oi-step" onclick="oiIngStep(${cid},${ingIdx},+1)">+</button>
      </div>`;
    }).join('');

    const catBadge=objItemsActiveCat==='__todos__'?`<span style="font-size:0.65rem;font-weight:600;color:${catColor};opacity:0.85;flex-shrink:0;white-space:nowrap;">${esc(o.category||'')}</span>`:'';
    const noteBadge=o.note?`<span style="font-size:0.75rem;color:var(--muted);">${esc(o.note)}</span>`:'';
    const targetBadge=hasTarget?`<div style="text-align:right;flex-shrink:0;"><div style="font-size:0.58rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.07em;">Meta</div><div style="font-size:1rem;font-weight:700;color:${catColor};line-height:1.2;">${targetFmt} <span style="font-size:0.65rem;color:var(--muted);">UND</span></div></div>`:'';

    return`<div class="obj-card oi-card" style="--obj-accent:${cardAccent};--oi-accent:${catColor};">
      <div class="oi-head">
        <div class="oi-head-l">
          <span class="obj-rank rn">${i+1}º</span>
          <div class="oi-icon2" style="background:${iconBg};color:${catColor};">${iconSvg}</div>
          <span class="oi-name2">${esc(o.item)}</span>
          ${catBadge}
        </div>
        <div class="oi-head-r">${noteBadge}${targetBadge}</div>
      </div>
      ${hasMods?`<div class="oi-combined">${combinedRows}</div><div class="oi-ings">${ingSliders}</div>`:''}
    </div>`;
  }).join('')}</div>`;
}
