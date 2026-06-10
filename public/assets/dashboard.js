let myI=[],orgI=[];
let saidaId=null,saidaType='craft';

document.addEventListener('DOMContentLoaded',async()=>{
  if(!requireAuth())return;
  await initPage();
  buildOreOptions();
  await loadDashData();
  // Alterar password via ?section=pw
  if(new URLSearchParams(location.search).get('section')==='pw'){
    document.getElementById('mainContent').style.display='none';
    document.getElementById('pwPage').style.display='block';
  }
});

async function loadDashData(){
  try{
    const[rM,rO]=await Promise.all([
      fetch(`/api/items?username=${encodeURIComponent(cUser)}`),
      fetch('/api/items?org=1')
    ]);
    myI=(await rM.json()).items||[];
    orgI=(await rO.json()).items||[];
    await renderStatsCards();
    renderMine();
    checkGoalBanner();
  }catch(err){toast('Erro ao carregar: '+err.message,'err');}
}

function renderMine(){
  const ft=document.getElementById('fType').value;
  let items=myI.filter(i=>{
    if(ft==='ship'&&!SHIP_M.has(i.name))return false;
    if(ft==='gem'&&!GEM_M.has(i.name))return false;
    return true;
  });
  items.sort((a,b)=>a.name.localeCompare(b.name)||(b.quality??-1)-(a.quality??-1));
  const total=myI.reduce((a,i)=>a+parseFloat(i.quantity||0),0);
  setStat('s0',fQ(total));setStat('s1',fQ(total));setStat('s2',myI.length);setStat('s2l','Registos');setStat('s3',new Set(myI.map(i=>i.name)).size);
  document.getElementById('tblCount').textContent=items.length+' item'+(items.length!==1?'s':'');
  if(!items.length){document.getElementById('tblContainerInv').innerHTML=emptyH(myI.length===0?'Adicione o primeiro minério clicando em "Adicionar Item"':'Nenhum item encontrado');return;}
  const rows=items.map(item=>{
    const cfg=qCfg(item.name);
    const ic=oreIcon(item.name);
    const[bc,bl]=oreBadge(item.name);
    const unit=oreUnit(item.name);
    const isGem=unit==='UND';
    return`<tr id="row-${item.id}">
      <td><div class="item-cell">
        <div class="item-icon ${ic}">${itemSvg(ic)}</div>
        <div class="item-name">${esc(item.name)}</div>
      </div></td>
      <td><span style="font-size:0.85rem;color:var(--muted);">${item.location?esc(item.location):'—'}</span></td>
      <td><span class="badge ${bc}">${bl}</span></td>
      <td class="r"><span class="qty-big">${isGem?Math.round(item.quantity):fQ(item.quantity)}</span><span class="qty-scu">${unit}</span></td>
      <td class="r"><span class="qty-big" style="color:var(--accent2);">${item.quality!=null?item.quality:'—'}</span></td>
      <td style="text-align:right;">
        <button class="btn btn-outline btn-sm" onclick="openChangeLoc(${item.id})" title="Mudar Localização"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>Localização</button>
        <button class="btn btn-saida" onclick="openSaida(${item.id})" title="Dar Saída"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="m12 5-7 7 7 7"/></svg>Dar Saída</button>
      </td>
    </tr>`;
  }).join('');
  document.getElementById('tblContainerInv').innerHTML=`<table style="table-layout:auto;"><thead><tr><th>Minério</th><th>Localização</th><th>Tipo</th><th class="r">Quantidade</th><th class="r">Qualidade</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
}

// ── ADD ───────────────────────────────────────────────────────────────────
function toggleAdd(){const p=document.getElementById('addPanel');p.style.display=p.style.display==='block'?'none':'block';if(p.style.display==='block'){updateQR();document.getElementById('iQty').focus();}}
function updateQR(){
  const n=document.getElementById('iOre').value;
  const h=document.getElementById('qh');
  h.textContent='500–1000 obrigatório';h.className='qhint warn';
  const qi=document.getElementById('iQual');qi.min=500;qi.max=1000;qi.placeholder='500–1000';
  const isGem=GEM_M.has(n);
  document.getElementById('iQtyLabel').textContent=isGem?'Quantidade (UND)':'Quantidade (SCUs)';
  document.getElementById('iQty').step=isGem?'1':'0.001';
  document.getElementById('iQty').min=isGem?'1':'0.001';
}
async function addItem(){
  const n=document.getElementById('iOre').value,qty=parseFloat(document.getElementById('iQty').value)||0;
  const qs=document.getElementById('iQual').value,loc=document.getElementById('iLoc').value;
  const isGemAdd=GEM_M.has(n);
  if(isGemAdd?qty<1:qty<0.001)return toast(isGemAdd?'Quantidade mínima: 1 UND.':'Quantidade mínima: 0.001 SCUs.','err');
  const q=qs!==''?parseInt(qs):null;
  if(q===null||isNaN(q)||q<500||q>1000)return toast('Qualidade obrigatória entre 500 e 1000.','err');
  try{
    const r=await fetch('/api/items',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:cUser,name:n,quantity:qty,quality:q,location:loc,notes:''})});
    if(!r.ok){const d=await r.json();return toast(d.error||'Erro.','err');}
    regEntrada(cUser,n,qty,q,loc);
    toast('Item adicionado.','ok');
    document.getElementById('addPanel').style.display='none';
    ['iQty','iQual'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('iLoc').value='';
    await loadDashData();
  }catch{toast('Erro ao adicionar.','err');}
}

// ── SAÍDA ─────────────────────────────────────────────────────────────────
function setSaidaType(t){
  saidaType=t;
  document.getElementById('stypeCraft').classList.toggle('active',t==='craft');
  document.getElementById('stypeTransfer').classList.toggle('active',t==='transfer');
  document.getElementById('mTransferTo').style.display=t==='transfer'?'block':'none';
}
async function openSaida(id){
  const item=myI.find(i=>i.id===id);if(!item)return;
  const unit=oreUnit(item.name);const isGem=unit==='UND';
  saidaId=id;
  document.getElementById('mName').textContent=item.name;
  document.getElementById('mStock').textContent=`Stock atual: ${isGem?Math.round(item.quantity):fQ(item.quantity)} ${unit}`;
  document.getElementById('mQtyLabel').textContent=`Quantidade (${unit})`;
  document.getElementById('mQty').step=isGem?'1':'0.001';
  document.getElementById('mQty').min=isGem?'1':'0.001';
  document.getElementById('mQty').value='';
  setSaidaType('craft');
  if(!allUsers.length){try{const r=await fetch('/api/users');if(r.ok){const d=await r.json();allUsers=d.users||[];}}catch{}}
  const destSel=document.getElementById('mDestUser');
  destSel.innerHTML=allUsers.filter(u=>u.username!==cUser).map(u=>`<option value="${esc(u.username)}">${esc(u.username)}</option>`).join('');
  document.getElementById('mSaida').style.display='flex';
  setTimeout(()=>document.getElementById('mQty').focus(),50);
}
async function confirmSaida(){
  const item=myI.find(i=>i.id===saidaId);if(!item)return;
  const s=parseFloat(document.getElementById('mQty').value)||0;
  const unit=oreUnit(item.name);const isGem=unit==='UND';
  if(isGem?s<1:s<0.001)return toast('Quantidade inválida.','err');
  const n=parseFloat(item.quantity)-s;
  if(n<0)return toast(`Stock insuficiente. Tens ${isGem?Math.round(item.quantity):fQ(item.quantity)} ${unit}.`,'err');
  document.getElementById('mSaida').style.display='none';
  if(saidaType==='transfer'){
    const dest=document.getElementById('mDestUser').value;
    if(!dest)return toast('Seleciona o destinatário.','err');
    if(n<0.001){await fetch(`/api/items?id=${item.id}`,{method:'DELETE'});}
    else{await fetch('/api/items',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:item.id,name:item.name,quantity:n,quality:item.quality,location:item.location,notes:item.notes})});}
    await fetch('/api/items',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:dest,name:item.name,quantity:s,quality:item.quality,location:item.location,notes:''})});
    fetch('/api/transactions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:cUser,item_name:item.name,quantity:s,unit,quality:item.quality,location:item.location,quantity_before:parseFloat(item.quantity),quantity_after:n<0.001?0:n,type:'transfer',to_player:dest})});
    toast(`${isGem?Math.round(s):fQ(s)} ${unit} de ${item.name} transferido para ${dest}.`,'ok');
  }else{
    fetch('/api/transactions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:cUser,item_name:item.name,quantity:s,unit,quality:item.quality,location:item.location,quantity_before:parseFloat(item.quantity),quantity_after:n<0.001?0:n,type:'craft',to_player:null})});
    if(n<0.001){await fetch(`/api/items?id=${item.id}`,{method:'DELETE'});toast(`${item.name} esgotado e removido.`,'ok');}
    else{await fetch('/api/items',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:item.id,name:item.name,quantity:n,quality:item.quality,location:item.location,notes:item.notes})});toast(`Saída de ${isGem?Math.round(s):fQ(s)} ${unit}. Restam ${isGem?Math.round(n):fQ(n)} ${unit}.`,'ok');}
  }
  await loadDashData();
}

// ── LOCALIZAÇÃO ───────────────────────────────────────────────────────────
function openChangeLoc(id){
  const item=myI.find(i=>i.id===id);if(!item)return;
  const grouped={};
  allLocations.forEach(l=>{const sys=l.system||'Outro';if(!grouped[sys])grouped[sys]=[];grouped[sys].push(l);});
  const opts='<option value="">— Sem localização —</option>'+Object.keys(grouped).sort().map(sys=>`<optgroup label="${esc(sys)}">${grouped[sys].map(l=>`<option value="${esc(l.name)}"${l.name===item.location?' selected':''}>${esc(l.name)}</option>`).join('')}</optgroup>`).join('');
  document.getElementById('mLocName').textContent=item.name;
  document.getElementById('mLocSel').innerHTML=opts;
  document.getElementById('mLocId').value=id;
  document.getElementById('mLoc').style.display='flex';
}
async function confirmChangeLoc(){
  const id=parseInt(document.getElementById('mLocId').value);
  const item=myI.find(i=>i.id===id);if(!item)return;
  const loc=document.getElementById('mLocSel').value||null;
  document.getElementById('mLoc').style.display='none';
  try{await fetch('/api/items',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,name:item.name,quantity:item.quantity,quality:item.quality,location:loc,notes:item.notes})});toast('Localização atualizada.','ok');await loadDashData();}
  catch{toast('Erro.','err');}
}

// ── ALTERAR PASSWORD ──────────────────────────────────────────────────────
async function alterarPass(){
  const c=document.getElementById('pwC').value.trim(),a=document.getElementById('pwA').value,n=document.getElementById('pwN').value,n2=document.getElementById('pwN2').value;
  if(!c)return toast('Introduz o código de convite.','err');
  if(!a)return toast('Introduz a password atual.','err');
  if(n.length<4)return toast('Nova password mínimo 4 caracteres.','err');
  if(n!==n2)return toast('Passwords não coincidem.','err');
  try{
    const r=await fetch('/api/change-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:cUser,currentPassword:a,newPassword:n,invite_code:c})});
    const d=await r.json();
    if(!r.ok)return toast(d.error||'Erro.','err');
    toast('Password alterada!','ok');
    ['pwC','pwA','pwN','pwN2'].forEach(id=>document.getElementById(id).value='');
  }catch{toast('Erro.','err');}
}

document.addEventListener('keydown',e=>{
  if(e.key!=='Enter')return;
  if(document.getElementById('mSaida')?.style.display!=='none')confirmSaida();
});
