let orgI=[];
let adminEditId=null;

document.addEventListener('DOMContentLoaded',async()=>{
  if(!requireAuth())return;
  buildOreOptions();
  await Promise.all([initPage(),loadOrgData()]);
});

async function loadOrgData(){
  try{
    const[rO]=await Promise.all([fetch('/api/items?org=1')]);
    orgI=(await rO.json()).items||[];
    await renderStatsCards();
    renderOrg();
    checkGoalBanner();
  }catch(err){toast('Erro ao carregar: '+err.message,'err');}
}

function renderOrg(){
  const s=document.getElementById('fSearchOrg').value.toLowerCase();
  const ft=document.getElementById('fTypeOrg').value;
  const fl=document.getElementById('fLocOrg').value;
  const allLocs=[...new Set(orgI.map(i=>i.location).filter(Boolean))].sort();
  const locSel=document.getElementById('fLocOrg');
  const curLoc=locSel.value;
  locSel.innerHTML='<option value="">Todas as localizações</option>'+allLocs.map(l=>`<option${l===curLoc?' selected':''}>${esc(l)}</option>`).join('');
  const grouped={};
  orgI.forEach(item=>{
    if(s&&!item.name.toLowerCase().includes(s)&&!(item.player_name||'').toLowerCase().includes(s))return;
    if(ft==='ship'&&!SHIP_M.has(item.name))return;
    if(ft==='gem'&&!GEM_M.has(item.name))return;
    if(fl&&item.location!==fl)return;
    if(!grouped[item.name])grouped[item.name]={name:item.name,entries:[]};
    const key=`${item.player_name}||${item.quality??''}||${item.location||''}`;
    const existing=grouped[item.name].entries.find(e=>e._key===key);
    if(existing){existing.quantity=parseFloat(existing.quantity)+parseFloat(item.quantity||0);}
    else{grouped[item.name].entries.push({...item,quantity:parseFloat(item.quantity||0),_key:key});}
  });
  const groups=Object.values(grouped).sort((a,b)=>a.name.localeCompare(b.name));
  groups.forEach(g=>g.entries.sort((a,b)=>(b.quality??-1)-(a.quality??-1)));
  const total=orgI.reduce((a,i)=>a+parseFloat(i.quantity||0),0);
  const members=new Set(orgI.map(i=>i.player_name)).size;
  setStat('s0',fQ(total));setStat('s1',fQ(total));setStat('s2',members);setStat('s2l','Membros');setStat('s3',groups.length);
  document.getElementById('tblCount2').textContent=orgI.length+' registo'+(orgI.length!==1?'s':'');
  if(!groups.length){document.getElementById('tblContainerOrg').innerHTML=emptyH(orgI.length===0?'Nenhum membro registou stock ainda':'Nenhum resultado');return;}
  const adminMode=isAdmin();
  const rows=groups.map(g=>{
    const sid='os_'+g.name.replace(/[^a-z0-9]/gi,'_');
    const eid='oe_'+g.name.replace(/[^a-z0-9]/gi,'_');
    const tQ=g.entries[0].quality,bQ=g.entries[g.entries.length-1].quality;
    const mem=new Set(g.entries.map(e=>e.player_name)).size;
    const tot=g.entries.reduce((a,e)=>a+parseFloat(e.quantity||0),0);
    const ic=oreIcon(g.name);
    const[bc,bl]=oreBadge(g.name);
    const subs=g.entries.map((m)=>{
      const cfg2=qCfg(m.name);
      const pct2=m.quality!=null?Math.round((m.quality-cfg2.min)/(cfg2.max-cfg2.min)*100):0;
      const subUnit=oreUnit(m.name);
      const subIsGem=subUnit==='UND';
      const[sbc,sbl]=oreBadge(m.name);
      return`<tr class="sub-entry-row" style="background:rgba(0,0,0,0.2);display:none;" data-parent="${sid}">
        <td style="padding-left:52px;border-bottom:1px solid rgba(255,255,255,0.04);">
          ${playerPill(m.player_name)}
        </td>
        <td style="border-bottom:1px solid rgba(255,255,255,0.04);"><span class="badge ${sbc}">${sbl}</span></td>
        <td style="border-bottom:1px solid rgba(255,255,255,0.04);"><span style="font-size:0.88rem;color:var(--muted);">${m.location?esc(m.location):'—'}</span></td>
        <td class="r" style="border-bottom:1px solid rgba(255,255,255,0.04);"><span class="qty-big">${subIsGem?Math.round(m.quantity):fQ(m.quantity)}</span><span class="qty-scu">${subUnit}</span></td>
        <td class="r" style="border-bottom:1px solid rgba(255,255,255,0.04);">
          <div class="qual-cell-wrap">
            <span class="qual-num">${m.quality!=null?m.quality:'—'}</span>
            <div class="qual-bar"><div class="qual-fill" style="width:${pct2}%"></div></div>
          </div>
        </td>
        <td class="r" style="border-bottom:1px solid rgba(255,255,255,0.04);"><span class="holders-cell"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>1</span></td>
        <td style="border-bottom:1px solid rgba(255,255,255,0.04);"></td>
      </tr>`;
    }).join('');
    const orgUnit=oreUnit(g.name);
    const orgIsGem=orgUnit==='UND';
    return`
      <tr class="org-row" onclick="toggleOrg('${sid}','${eid}')">
        <td><div class="item-cell">
          <svg class="exp-icon" id="${eid}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          <div class="item-icon ${ic}" style="width:28px;height:28px;">${itemSvg(ic)}</div>
          <span class="item-name">${esc(g.name)}</span>
        </div></td>
        <td><span class="badge ${bc}">${bl}</span></td>
        <td><span style="font-size:0.85rem;color:var(--muted);">${g.entries.length} registo${g.entries.length!==1?'s':''}</span></td>
        <td class="r"><span class="qty-big">${orgIsGem?Math.round(tot):fQ(tot)}</span><span class="qty-scu">${orgUnit}</span></td>
        <td class="r"><span class="qty-big" style="color:var(--text2);">${tQ!=null?tQ:'—'}</span></td>
        <td class="r"><span class="holders-cell"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>${mem}</span></td>
        <td style="text-align:center;"><svg class="chevron-cell" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></td>
      </tr>
      ${subs}`;
  }).join('');
  document.getElementById('tblContainerOrg').innerHTML=`<table><colgroup><col class="c-item"><col class="c-tipo"><col class="c-loc"><col class="c-qty"><col class="c-qual"><col class="c-det"><col class="c-act"></colgroup><thead><tr><th>Item</th><th>Tipo</th><th>Localização</th><th class="r">Quantidade</th><th class="r">Qualidade</th><th class="r">Membros</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
}

function toggleOrg(sid,eid){
  const e=document.getElementById(eid);
  const rows=document.querySelectorAll(`tr[data-parent="${sid}"]`);
  const isOpen=e&&e.classList.contains('open');
  rows.forEach(r=>r.style.display=isOpen?'none':'table-row');
  if(e)e.classList.toggle('open',!isOpen);
}

function adminOrgEdit(id,e){
  e&&e.stopPropagation();
  const item=orgI.find(i=>i.id===id);if(!item)return;
  adminEditId=id;
  document.getElementById('mAEUser').textContent='Usuário: '+item.player_name;
  const shipOpts=SHIP_LIST.slice().sort().map(n=>`<option value="${esc(n)}"${n===item.name?' selected':''}>${esc(n)}</option>`).join('');
  const gemOpts=GEM_LIST.slice().sort().map(n=>`<option value="${esc(n)}"${n===item.name?' selected':''}>${esc(n)}</option>`).join('');
  document.getElementById('mAEShipOpts').innerHTML=shipOpts;
  document.getElementById('mAEGemOpts').innerHTML=gemOpts;
  document.getElementById('mAEName').value=item.name;
  const unit=oreUnit(item.name);
  document.getElementById('mAEQtyLabel').textContent='Quantidade ('+unit+')';
  document.getElementById('mAEQty').step=unit==='UND'?'1':'0.001';
  document.getElementById('mAEQty').value=unit==='UND'?Math.round(item.quantity):item.quantity;
  document.getElementById('mAEQual').value=item.quality??'';
  document.getElementById('mAELoc').value=item.location||'';
  document.getElementById('mAdminEdit').style.display='flex';
}

function updateAEUnit(){
  const n=document.getElementById('mAEName').value;
  const unit=oreUnit(n);
  document.getElementById('mAEQtyLabel').textContent='Quantidade ('+unit+')';
  document.getElementById('mAEQty').step=unit==='UND'?'1':'0.001';
}

async function confirmAdminEdit(){
  const item=orgI.find(i=>i.id===adminEditId);if(!item)return;
  const name=document.getElementById('mAEName').value;
  const qty=parseFloat(document.getElementById('mAEQty').value)||0;
  const qv=document.getElementById('mAEQual').value;
  const quality=qv!==''?parseInt(qv):null;
  const loc=document.getElementById('mAELoc').value.trim();
  const unit=oreUnit(name);
  if(unit==='UND'?qty<1:qty<0.001)return toast('Quantidade inválida.','err');
  if(quality===null||quality<500||quality>1000)return toast('Qualidade obrigatória entre 500 e 1000.','err');
  try{
    await fetch('/api/items',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:adminEditId,name,quantity:qty,quality,location:loc,notes:item.notes||''})});
    document.getElementById('mAdminEdit').style.display='none';
    toast('Item atualizado.','ok');
    await loadOrgData();
  }catch{toast('Erro ao guardar.','err');}
}

async function adminOrgDel(id,e){
  e&&e.stopPropagation();
  const item=orgI.find(i=>i.id===id);if(!item)return;
  if(!confirm(`Remover "${item.name}" de ${item.player_name}?`))return;
  try{
    await fetch(`/api/items?id=${id}`,{method:'DELETE'});
    toast('Item removido.','ok');
    await loadOrgData();
  }catch{toast('Erro ao remover.','err');}
}
