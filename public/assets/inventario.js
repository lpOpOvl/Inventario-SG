let _invItems=[];
let _scNames=null;
let _acActive=-1;
let _acFiltered=[];

document.addEventListener('DOMContentLoaded',async()=>{
  if(!requireAuth())return;
  await Promise.all([initPage(),invLoad()]);
  invBuildLocFilter();
  _loadScNames();
  _initAc();
});

async function _loadScNames(){
  if(_scNames!==null)return;
  try{
    const r=await fetch('/sc_names.json');
    _scNames=await r.json();
  }catch{_scNames=[];}
}

function _initAc(){
  const inp=document.getElementById('invMName');
  if(!inp)return;

  const drop=document.createElement('div');
  drop.id='invAcDrop';
  drop.style.cssText='position:absolute;top:100%;left:0;right:0;background:#0c1a2e;border:1px solid #1a2a44;border-top:none;border-radius:0 0 0.45rem 0.45rem;max-height:300px;overflow-y:auto;z-index:9999;display:none;box-shadow:0 8px 24px rgba(0,0,0,0.5);';
  inp.parentNode.style.position='relative';
  inp.parentNode.appendChild(drop);

  drop.addEventListener('mousedown',e=>{
    const el=e.target.closest('[data-idx]');
    if(el){e.preventDefault();inp.value=_acFiltered[+el.dataset.idx].name;_acHide();}
  });

  inp.addEventListener('input',()=>{
    const q=inp.value.trim().toLowerCase();
    if(!q||!_scNames||!_scNames.length){_acHide();return;}
    _acFiltered=_scNames.filter(i=>i.name.toLowerCase().includes(q));
    _acActive=-1;
    _acRender(drop,q);
  });

  inp.addEventListener('keydown',e=>{
    if(drop.style.display==='none')return;
    if(e.key==='ArrowDown'){e.preventDefault();_acActive=Math.min(_acActive+1,_acFiltered.length-1);_acRender(drop,inp.value.trim().toLowerCase());}
    else if(e.key==='ArrowUp'){e.preventDefault();_acActive=Math.max(_acActive-1,-1);_acRender(drop,inp.value.trim().toLowerCase());}
    else if(e.key==='Enter'&&_acActive>=0){e.preventDefault();inp.value=_acFiltered[_acActive].name;_acHide();}
    else if(e.key==='Escape'){_acHide();}
  });

  inp.addEventListener('blur',()=>setTimeout(_acHide,150));
}

function _acRender(drop,q){
  if(!_acFiltered.length){_acHide();return;}
  drop.innerHTML=_acFiltered.map((item,i)=>{
    const lo=item.name.toLowerCase();const idx=lo.indexOf(q);
    const hi=idx>=0?esc(item.name.slice(0,idx))+'<strong style="color:#90c5ff;">'+esc(item.name.slice(idx,idx+q.length))+'</strong>'+esc(item.name.slice(idx+q.length)):esc(item.name);
    const active=i===_acActive;
    return`<div data-idx="${i}" style="padding:8px 12px;cursor:pointer;font-size:0.85rem;color:var(--text);background:${active?'rgba(59,130,246,0.18)':'transparent'};border-bottom:1px solid rgba(26,42,68,0.4);">
      ${hi}
    </div>`;
  }).join('');
  drop.style.display='block';
}

function _acHide(){
  const d=document.getElementById('invAcDrop');
  if(d)d.style.display='none';
  _acActive=-1;
}

async function invLoad(){
  const el=document.getElementById('invContainer');
  el.innerHTML='<div class="empty" style="opacity:0.5;">A carregar...</div>';
  try{
    const r=await fetch('/api/items?username='+encodeURIComponent(cUser)+'&personal=1');
    const d=await r.json();
    _invItems=d.items||[];
  }catch{_invItems=[];}
  invBuildLocFilter();
  invFilter();
}

function invBuildLocFilter(){
  const sel=document.getElementById('invLocFilter');
  const cur=sel.value;
  const grouped={};
  allLocations.forEach(l=>{const sys=l.system||'Outro';if(!grouped[sys])grouped[sys]=[];grouped[sys].push(l);});
  const opts=Object.keys(grouped).sort().map(sys=>
    `<optgroup label="${esc(sys)}">${grouped[sys].map(l=>`<option value="${esc(l.name)}">${esc(l.name)}</option>`).join('')}</optgroup>`
  ).join('');
  sel.innerHTML='<option value="">Todas as localizações</option>'+opts;
  if(cur)sel.value=cur;
}

function invFilter(){
  const q=(document.getElementById('invSearch').value||'').toLowerCase();
  const loc=document.getElementById('invLocFilter').value;
  const sort=document.getElementById('invSortFilter')?.value||'qual_desc';
  const filtered=_invItems.filter(i=>{
    if(q&&!(i.name||'').toLowerCase().includes(q))return false;
    if(loc&&(i.location||'')!==loc)return false;
    return true;
  });
  if(sort==='qual_desc')filtered.sort((a,b)=>(b.quality??-1)-(a.quality??-1));
  else if(sort==='qual_asc')filtered.sort((a,b)=>(a.quality??-1)-(b.quality??-1));
  invRender(filtered);
}

function invRender(items){
  const el=document.getElementById('invContainer');
  const statsEl=document.getElementById('invStats');

  // Stats
  const total=_invItems.length;
  const unicas=[...new Set(_invItems.map(i=>i.name))].length;
  const locs=[...new Set(_invItems.map(i=>i.location||'').filter(Boolean))].length;
  statsEl.innerHTML=[
    {label:'Total de Itens',val:total,color:'#a78bfa'},
    {label:'Itens Únicos',val:unicas,color:'#60a5fa'},
    {label:'Localizações',val:locs,color:'#34d399'},
  ].map(s=>`<div style="background:var(--card);border:1px solid var(--border2);border-radius:0.6rem;padding:10px 18px;display:flex;flex-direction:column;gap:2px;">
    <div style="font-size:0.65rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.08em;">${s.label}</div>
    <div style="font-size:1.4rem;font-weight:800;color:${s.color};font-variant-numeric:tabular-nums;">${s.val}</div>
  </div>`).join('');

  if(!items.length){
    el.innerHTML=`<div class="empty"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg><p>${_invItems.length?'Sem resultados para os filtros aplicados.':'Sem itens ainda. Usa o OCR ou adiciona manualmente.'}</p></div>`;
    return;
  }

  el.innerHTML=`<div style="display:flex;flex-direction:column;gap:8px;">${items.map(item=>{
    const hasQual=item.quality!=null;
    const qualColor=item.quality>=800?'#22c55e':item.quality>=500?'#f59e0b':'#f87171';
    return`<div class="obj-card" style="padding:12px 16px;gap:12px;align-items:center;">
      <div style="width:34px;height:34px;border-radius:0.45rem;background:rgba(167,139,250,0.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:0.97rem;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(item.name)}</div>
        ${item.notes?`<div style="font-size:0.75rem;color:var(--muted);margin-top:1px;">${esc(item.notes)}</div>`:''}
      </div>
      ${item.location?`<div style="flex-shrink:0;font-size:0.75rem;color:var(--muted);background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:2px 8px;white-space:nowrap;">${esc(item.location)}</div>`:''}
      ${hasQual?`<div style="flex-shrink:0;text-align:center;"><div style="font-size:0.58rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.07em;">Qual.</div><div style="font-size:0.92rem;font-weight:800;color:${qualColor};">${Math.round(item.quality)}</div></div>`:''}
      <div style="flex-shrink:0;text-align:center;"><div style="font-size:0.58rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.07em;">Qtd.</div><div style="font-size:0.92rem;font-weight:800;color:var(--text2);">${item.quantity??1}</div></div>
      <div style="flex-shrink:0;display:flex;gap:6px;">
        <button onclick="invOpenEdit(${item.id})" style="padding:5px 10px;background:var(--bg2);border:1px solid var(--border2);border-radius:0.4rem;color:var(--text2);font-size:0.75rem;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;">Editar</button>
        <button onclick="invDelete(${item.id},'${esc(item.name)}')" style="padding:5px 10px;background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.3);border-radius:0.4rem;color:#f87171;font-size:0.75rem;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;">Apagar</button>
      </div>
    </div>`;
  }).join('')}</div>`;
}

function invToggleQual(){
  const row=document.getElementById('invQualRow');
  const btn=document.getElementById('invQualToggle');
  const show=row.style.display==='none';
  row.style.display=show?'block':'none';
  btn.textContent=show?'− Qualidade':'+ Qualidade';
  btn.style.color=show?'var(--accent2)':'var(--muted)';
  if(!show)document.getElementById('invMQual').value='';
}

function invOpenAdd(){
  document.getElementById('invModalTitle').textContent='Adicionar Item';
  document.getElementById('invModalId').value='';
  document.getElementById('invMName').value='';
  document.getElementById('invMQty').value='1';
  document.getElementById('invMQual').value='';
  document.getElementById('invMLoc').value='';
  document.getElementById('invMNotes').value='';
  document.getElementById('invModalStatus').textContent='';
  document.getElementById('invQualRow').style.display='none';
  document.getElementById('invQualToggle').textContent='+ Qualidade';
  document.getElementById('invQualToggle').style.color='var(--muted)';
  document.getElementById('invModal').style.display='flex';
  document.getElementById('invMName').focus();
}

function invOpenEdit(id){
  const item=_invItems.find(i=>i.id===id);
  if(!item)return;
  document.getElementById('invModalTitle').textContent='Editar Item';
  document.getElementById('invModalId').value=id;
  document.getElementById('invMName').value=item.name||'';
  document.getElementById('invMQty').value=item.quantity??1;
  document.getElementById('invMQual').value=item.quality??'';
  document.getElementById('invMLoc').value=item.location||'';
  document.getElementById('invMNotes').value=item.notes||'';
  document.getElementById('invModalStatus').textContent='';
  const hasQual=item.quality!=null;
  document.getElementById('invQualRow').style.display=hasQual?'block':'none';
  document.getElementById('invQualToggle').textContent=hasQual?'− Qualidade':'+ Qualidade';
  document.getElementById('invQualToggle').style.color=hasQual?'var(--accent2)':'var(--muted)';
  document.getElementById('invModal').style.display='flex';
}

function invCloseModal(){document.getElementById('invModal').style.display='none';_acHide();}

async function invSave(){
  const id=document.getElementById('invModalId').value;
  const name=document.getElementById('invMName').value.trim();
  const qty=document.getElementById('invMQty').value;
  const qual=document.getElementById('invMQual').value;
  const loc=document.getElementById('invMLoc').value.trim();
  const notes=document.getElementById('invMNotes').value.trim();
  const status=document.getElementById('invModalStatus');

  if(!name){status.textContent='Nome obrigatório.';return;}

  const payload={name};
  if(qty)payload.quantity=parseFloat(qty);
  if(qual)payload.quality=parseFloat(qual);
  if(loc)payload.location=loc;
  if(notes)payload.notes=notes;

  try{
    let r;
    if(id){
      r=await fetch('/api/items',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:+id,...payload})});
    }else{
      // Auto-merge: se já existe item com mesmo nome e mesma qualidade, soma a quantidade
      const qualNum=qual!==''?Math.round(parseFloat(qual)):null;
      const existing=_invItems.find(i=>{
        if((i.name||'').toLowerCase()!==(name||'').toLowerCase())return false;
        const iQual=i.quality!=null?Math.round(i.quality):null;
        return qualNum===null?iQual===null:iQual===qualNum;
      });
      if(existing){
        const newQty=(parseFloat(existing.quantity)||0)+(parseFloat(qty)||1);
        r=await fetch('/api/items',{method:'PUT',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({id:existing.id,name:existing.name,quantity:newQty,quality:existing.quality??null,location:existing.location||'',notes:existing.notes||''})});
      }else{
        r=await fetch('/api/items',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:cUser,...payload,personal:1})});
      }
    }
    if(r.ok){invCloseModal();await invLoad();}
    else{const d=await r.json();status.textContent=d.error||'Erro ao guardar.';}
  }catch{status.textContent='Sem ligação.';}
}

function invOpenMoveLoc(id){
  const item=_invItems.find(i=>i.id===id);
  if(!item)return;
  document.getElementById('invMoveLocId').value=id;
  const sel=document.getElementById('invMoveLocSel');
  const grouped={};
  allLocations.forEach(l=>{const sys=l.system||'Outro';if(!grouped[sys])grouped[sys]=[];grouped[sys].push(l);});
  const opts=Object.keys(grouped).sort().map(sys=>
    `<optgroup label="${esc(sys)}">${grouped[sys].map(l=>`<option value="${esc(l.name)}">${esc(l.name)}</option>`).join('')}</optgroup>`
  ).join('');
  sel.innerHTML='<option value="">— Sem localização —</option>'+opts;
  sel.value=item.location||'';
  document.getElementById('invMoveLocOverlay').style.display='flex';
}
function invMoveLocCancel(){document.getElementById('invMoveLocOverlay').style.display='none';}
async function invSaveMoveLoc(){
  const id=+document.getElementById('invMoveLocId').value;
  const loc=document.getElementById('invMoveLocSel').value;
  const item=_invItems.find(i=>i.id===id);
  if(!item)return;
  try{
    const r=await fetch('/api/items',{method:'PUT',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({id,name:item.name,quantity:item.quantity,quality:item.quality??null,location:loc,notes:item.notes||''})});
    if(r.ok){invMoveLocCancel();await invLoad();}
  }catch{}
}

let _invConfirmCb=null;
function invConfirmCancel(){
  document.getElementById('invConfirmOverlay').style.display='none';
  _invConfirmCb=null;
}
function _invConfirmShow(msg,cb){
  _invConfirmCb=cb;
  document.getElementById('invConfirmMsg').textContent=msg;
  const ov=document.getElementById('invConfirmOverlay');
  ov.style.display='flex';
  document.getElementById('invConfirmOk').onclick=()=>{ov.style.display='none';cb();};
}

async function invDelete(id,nome){
  _invConfirmShow(`Apagar "${nome}"?`,async()=>{
    try{
      const r=await fetch('/api/items?id='+id,{method:'DELETE'});
      if(r.ok)await invLoad();
    }catch{}
  });
}

// Fechar modal ao clicar fora
document.getElementById('invModal').addEventListener('click',function(e){if(e.target===this)invCloseModal();});
