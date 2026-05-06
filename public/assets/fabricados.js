const _FAB_FLIP=['recoil smoothness','recoil handling','fuel requirement','fuelrequirement'];
const _FAB_NEG_GOOD=['recoil kick'];
const _fabIsFlip=pk=>_FAB_FLIP.some(f=>pk.includes(f));
const _fabIsNegGood=pk=>_FAB_NEG_GOOD.some(f=>pk.includes(f));
function _fabEff(prop,raw){const pk=(prop||'').toLowerCase();return(_fabIsFlip(pk)||_fabIsNegGood(pk))?-raw:raw;}
function _fabCls(eff){return eff>0.01?'pos':eff<-0.01?'neg':'neu';}
function _fabFmt(n){return Math.round(n).toLocaleString('pt-PT');}

const FAB_CAT_COLORS={
  'Armas (FPS)':'#f87171','Armadura (FPS)':'#60a5fa','Armas (Veículo)':'#34d399',
  'Componentes (Veículo)':'#a78bfa','Componentes (Mining)':'#f59e0b'
};

let fabCache=[];

document.addEventListener('DOMContentLoaded',async()=>{
  if(!requireAuth())return;
  await initPage();
  await fabLoad();
});

async function fabLoad(){
  const el=document.getElementById('fabContainer');
  el.innerHTML='<p style="color:var(--muted);text-align:center;padding:40px 0;">A carregar...</p>';
  try{
    const r=await fetch('/api/crafted_items?username='+encodeURIComponent(cUser));
    const d=await r.json();
    fabCache=d.items||[];
  }catch{fabCache=[];}
  fabRender();
}

function fabRender(){
  const el=document.getElementById('fabContainer');
  if(!fabCache.length){
    el.innerHTML=emptyH('Ainda não fabricaste nenhum item. Vai a Objetivos Itens e clica num item para começar.');
    return;
  }
  const grouped={};
  fabCache.forEach(item=>{
    if(!grouped[item.item_name])grouped[item.item_name]=[];
    grouped[item.item_name].push(item);
  });
  el.innerHTML=`<div style="display:flex;flex-direction:column;gap:20px;">${
    Object.entries(grouped).map(([name,items])=>`
      <div>
        <div style="font-size:0.78rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">${esc(name)} <span style="font-weight:400;opacity:0.6;">(${items.length})</span></div>
        <div style="display:flex;flex-direction:column;gap:8px;">${items.map(fabCard).join('')}</div>
      </div>`).join('')
  }</div>`;
}

function fabCard(item){
  const stats=JSON.parse(item.stats||'{}');
  const baseStats=JSON.parse(item.base_stats||'{}');
  const quals=JSON.parse(item.qualities||'{}');
  const catColor=FAB_CAT_COLORS[item.category||'']||'#94a3b8';
  const rgb=hexToRgb(catColor);
  const date=new Date(item.crafted_at+'Z');
  const dateStr=date.toLocaleDateString('pt-PT',{day:'2-digit',month:'short',year:'numeric'});

  const qualEntries=Object.entries(quals);
  const statEntries=Object.entries(stats);

  const qualHtml=qualEntries.length?`<div style="padding:8px 14px;display:flex;flex-wrap:wrap;gap:5px;border-bottom:1px solid var(--border);">${
    qualEntries.map(([ing,q])=>`<span style="display:inline-flex;align-items:center;gap:5px;padding:3px 9px;background:var(--bg2);border:1px solid var(--border);border-radius:4px;font-size:0.73rem;">
      <span style="color:var(--muted);">${esc(ing)}</span>
      <span style="font-weight:700;color:${q>=900?'#86efac':q>=700?'#fbbf24':'var(--text2)'};">${q}</span>
    </span>`).join('')
  }</div>`:'';

  const statsHtml=statEntries.length?`<div style="padding:6px 14px 10px;">${
    statEntries.map(([prop,rawPct])=>{
      const eff=_fabEff(prop,rawPct);
      const cls=_fabCls(eff);
      const base=baseStats[prop];
      return`<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:5px 0;border-bottom:1px solid var(--border);">
        <span style="font-size:0.82rem;color:var(--text2);flex:1;min-width:0;">${esc(prop)}</span>
        <span class="oi-stat-val ${cls}" style="font-size:0.86rem;min-width:60px;text-align:right;">${(rawPct>=0?'+':'')+rawPct.toFixed(2)}%</span>
        ${base!=null?`<span style="font-size:0.76rem;color:var(--muted);min-width:90px;text-align:right;white-space:nowrap;">${_fabFmt(base)} → <span class="oi-stat-val ${cls}" style="font-size:0.76rem;">${_fabFmt(base*(1+rawPct/100))}</span></span>`:''}
      </div>`;
    }).join('')
  }</div>`:'';

  return`<div style="background:var(--card);border:1px solid var(--border2);border-radius:0.75rem;overflow:hidden;">
    <div style="display:flex;align-items:center;gap:10px;padding:11px 14px;border-bottom:1px solid var(--border);">
      <div style="width:32px;height:32px;border-radius:0.4rem;background:rgba(${rgb},0.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${catColor}" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:0.95rem;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(item.item_name)}</div>
        <div style="font-size:0.72rem;color:var(--muted);margin-top:1px;">${dateStr}</div>
      </div>
      ${item.category?`<span style="font-size:0.65rem;font-weight:600;color:${catColor};background:rgba(${rgb},0.1);border:1px solid rgba(${rgb},0.25);border-radius:4px;padding:2px 7px;white-space:nowrap;flex-shrink:0;">${esc(item.category)}</span>`:''}
      <button onclick="fabDelete(${item.id},'${esc(item.item_name)}')" style="padding:4px 10px;background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.3);border-radius:0.4rem;color:#f87171;font-size:0.73rem;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;white-space:nowrap;flex-shrink:0;">Apagar</button>
    </div>
    ${qualHtml}${statsHtml}
  </div>`;
}

function fabDelete(id,nome){
  document.getElementById('fabConfirmMsg').textContent=`Apagar "${nome}"?`;
  const ov=document.getElementById('fabConfirmOverlay');
  ov.style.display='flex';
  document.getElementById('fabConfirmOk').onclick=async()=>{
    ov.style.display='none';
    try{
      const r=await fetch('/api/crafted_items?id='+id,{method:'DELETE'});
      if(r.ok)await fabLoad();
    }catch{}
  };
}
function fabConfirmCancel(){document.getElementById('fabConfirmOverlay').style.display='none';}
