let orgI=[];
let objCache=[];
let adminMenuOpen=true;
let activeAdminSection='users';
const ADMIN_SECTIONS=['users','additem','saida','obj','objitems','rules','catalog','locs','export','activity'];

document.addEventListener('DOMContentLoaded',async()=>{
  if(!requireAuth())return;
  await initPage();
  if(!isAdmin()){window.location.href='/dashboard.html';return;}
  if(cUser==='lpOpOvl'){const an=document.getElementById('nav-admin-activity');if(an)an.style.display='';}
  buildOreOptions();
  await loadAdminPageData();
  setAdminSection('users',document.getElementById('nav-admin-users'));
});

async function loadAdminPageData(){
  try{
    const[ru,ro]=await Promise.all([fetch('/api/users'),fetch('/api/items?org=1')]);
    if(ru.ok)allUsers=(await ru.json()).users||[];
    if(ro.ok)orgI=(await ro.json()).items||[];
  }catch{}
}

// ── SIDEBAR MENU ──────────────────────────────────────────────────────────
function toggleAdminMenu(){
  adminMenuOpen=!adminMenuOpen;
  document.getElementById('adminSubMenu').style.display=adminMenuOpen?'block':'none';
  document.getElementById('nav-admin').classList.toggle('open',adminMenuOpen);
  document.getElementById('adminMenuChevron').style.transform=adminMenuOpen?'rotate(180deg)':'rotate(0deg)';
}

function setAdminSection(sec,el){
  activeAdminSection=sec;
  document.querySelectorAll('.sb-subitem').forEach(i=>i.classList.remove('active'));
  if(el)el.classList.add('active');
  ADMIN_SECTIONS.forEach(s=>{const e=document.getElementById('asec-'+s);if(e)e.style.display=s===sec?'block':'none';});
  if(sec==='users')renderAdminUsers();
  if(sec==='additem'){renderAdminUserSelects();updateAdminQR();}
  if(sec==='saida'){renderAdminUserSelects();}
  if(sec==='catalog')renderAdminCatalog();
  if(sec==='locs')renderAdminLocs();
  if(sec==='obj')renderAdminObj();
  if(sec==='objitems')renderAdminObjItems();
  if(sec==='rules')renderAdminRules();
  if(sec==='activity')renderAdminActivity();
}

// ── USUÁRIOS ──────────────────────────────────────────────────────────────
function renderAdminUsers(){
  const el=document.getElementById('adminUserList');
  if(!allUsers.length){el.innerHTML='<div style="color:var(--muted);font-size:0.85rem;">Nenhum usuário encontrado.</div>';return;}
  el.innerHTML=allUsers.map(u=>{
    const isAdm=ADMINS.has(u.username)||adminExtra.has(u.username);
    const isSelf=u.username===cUser;
    return`<div class="admin-user-row">
      <div class="admin-user-av">${u.username[0].toUpperCase()}</div>
      <div style="flex:1;">
        <div class="admin-user-name">${esc(u.username)}${isAdm?'<span class="badge-admin" style="margin-left:8px;">ADM</span>':''}</div>
      </div>
      <div class="admin-user-acts">
        ${!isAdm&&!isSelf?`<button class="btn btn-outline btn-sm" onclick="adminGrantAdmin('${esc(u.username)}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>Dar ADM</button>`:''}
        ${isAdm&&!isSelf&&!ADMINS.has(u.username)?`<button class="btn btn-outline btn-sm" onclick="adminRevokeAdmin('${esc(u.username)}')">Remover ADM</button>`:''}
        ${!isSelf?`<button class="btn btn-danger btn-sm" onclick="adminDelUser('${esc(u.username)}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>Remover</button>`:'<span style="font-size:0.75rem;color:var(--muted);">(tu)</span>'}
      </div>
    </div>`;
  }).join('');
}

async function adminGrantAdmin(u){
  try{const r=await fetch('/api/admins',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u})});if(!r.ok){const d=await r.json();return toast(d.error||'Erro.','err');}adminExtra.add(u);renderAdminUsers();toast(`${u} agora é administrador.`,'ok');}catch{toast('Erro ao atribuir admin.','err');}
}
async function adminRevokeAdmin(u){
  try{const r=await fetch(`/api/admins?username=${encodeURIComponent(u)}`,{method:'DELETE'});if(!r.ok){const d=await r.json();return toast(d.error||'Erro.','err');}adminExtra.delete(u);renderAdminUsers();toast(`Permissões de ${u} removidas.`,'ok');}catch{toast('Erro ao revogar admin.','err');}
}
async function adminDelUser(u){
  if(!confirm(`Remover usuário "${u}"? Esta acção é irreversível.`))return;
  try{const r=await fetch(`/api/users?username=${encodeURIComponent(u)}`,{method:'DELETE'});if(!r.ok){const d=await r.json();return toast(d.error||'Erro.','err');}toast(`${u} removido.`,'ok');const[ru]=await Promise.all([fetch('/api/users')]);if(ru.ok)allUsers=(await ru.json()).users||[];renderAdminUsers();}catch{toast('Erro ao remover usuário.','err');}
}

// ── ADICIONAR ITEM ────────────────────────────────────────────────────────
function renderAdminUserSelects(){
  const opts=allUsers.map(u=>`<option value="${esc(u.username)}">${esc(u.username)}</option>`).join('');
  const aUser=document.getElementById('aUser');if(aUser)aUser.innerHTML=opts;
  const aSaidaUser=document.getElementById('aSaidaUser');if(aSaidaUser){aSaidaUser.innerHTML=opts;loadAdminSaidaItems();}
}
function updateAdminQR(){
  const n=document.getElementById('aOre')?.value;if(!n)return;
  const h=document.getElementById('aQh');
  if(h){h.textContent='900–1000 obrigatório';h.className='qhint warn';}
  const qi=document.getElementById('aQual');if(qi){qi.min=900;qi.max=1000;qi.placeholder='900–1000';}
  const isGem=GEM_M.has(n);
  const ql=document.getElementById('aQtyLabel');if(ql)ql.textContent=isGem?'Quantidade (UND)':'Quantidade (SCUs)';
  const aqty=document.getElementById('aQty');if(aqty){aqty.step=isGem?'1':'0.001';aqty.min=isGem?'1':'0.001';}
}
async function adminAddItem(){
  const username=document.getElementById('aUser').value;
  const n=document.getElementById('aOre').value;
  const qty=parseFloat(document.getElementById('aQty').value)||0;
  const qs=document.getElementById('aQual').value;
  const loc=document.getElementById('aLoc').value;
  const isGem=GEM_M.has(n);
  if(isGem?qty<1:qty<0.001)return toast(isGem?'Quantidade mínima: 1 UND.':'Quantidade mínima: 0.001 SCUs.','err');
  const q=qs!==''?parseInt(qs):null;
  if(q===null||isNaN(q)||q<900||q>1000)return toast('Qualidade obrigatória entre 900 e 1000.','err');
  try{
    const r=await fetch('/api/items',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,name:n,quantity:qty,quality:q,location:loc,notes:''})});
    if(!r.ok){const d=await r.json();return toast(d.error||'Erro.','err');}
    regEntrada(username,n,qty,q,loc);
    toast(`Item adicionado a ${username}.`,'ok');
    document.getElementById('aQty').value='';document.getElementById('aQual').value='';
    const ro=await fetch('/api/items?org=1');if(ro.ok)orgI=(await ro.json()).items||[];
  }catch{toast('Erro ao adicionar.','err');}
}

// ── DAR SAÍDA ─────────────────────────────────────────────────────────────
function loadAdminSaidaItems(){
  const u=document.getElementById('aSaidaUser')?.value;if(!u)return;
  const items=orgI.filter(i=>i.player_name===u);
  const sel=document.getElementById('aSaidaItem');if(!sel)return;
  sel.innerHTML=items.length?items.map(i=>`<option value="${i.id}">${esc(i.name)} — ${GEM_M.has(i.name)?Math.round(i.quantity):fQ(i.quantity)} ${oreUnit(i.name)}</option>`).join(''):'<option value="">Sem itens</option>';
  fillAdminSaidaQty();
}
function fillAdminSaidaQty(){
  const id=parseInt(document.getElementById('aSaidaItem')?.value);
  const item=orgI.find(i=>i.id===id);
  const unit=item?oreUnit(item.name):'SCU';
  const ql=document.getElementById('aSaidaQtyLabel');if(ql)ql.textContent=`Quantidade (${unit})`;
  const aqty=document.getElementById('aSaidaQty');if(aqty){aqty.step=unit==='UND'?'1':'0.001';aqty.min=unit==='UND'?'1':'0.001';}
}
async function adminDarSaida(){
  const id=parseInt(document.getElementById('aSaidaItem').value);
  const item=orgI.find(i=>i.id===id);if(!item)return toast('Seleciona um item.','err');
  const s=parseFloat(document.getElementById('aSaidaQty').value)||0;
  if(s<0.001)return toast('Quantidade inválida.','err');
  const reason=document.getElementById('aSaidaReason').value.trim();
  if(!reason)return toast('Preenche a razão da saída.','err');
  const n=parseFloat(item.quantity)-s;
  if(n<0)return toast(`Stock insuficiente. Disponível: ${fQ(item.quantity)} ${oreUnit(item.name)}.`,'err');
  fetch('/api/transactions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:item.player_name,item_name:item.name,quantity:s,unit:oreUnit(item.name),quality:item.quality,location:item.location,quantity_before:parseFloat(item.quantity),quantity_after:n<0.001?0:n,type:'adm_remove',notes:`[ADM: ${cUser}] ${reason}`})});
  if(n<0.001){await fetch(`/api/items?id=${item.id}`,{method:'DELETE'});toast(`${item.name} de ${item.player_name} esgotado e removido.`,'ok');}
  else{await fetch('/api/items',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:item.id,name:item.name,quantity:n,quality:item.quality,location:item.location,notes:item.notes||''})});toast(`Saída de ${fQ(s)} ${oreUnit(item.name)} de ${item.player_name} registada.`,'ok');}
  document.getElementById('aSaidaQty').value='';
  document.getElementById('aSaidaReason').value='';
  const ro=await fetch('/api/items?org=1');if(ro.ok)orgI=(await ro.json()).items||[];
  loadAdminSaidaItems();
}

// ── CATÁLOGO ──────────────────────────────────────────────────────────────
function renderAdminCatalog(){
  ['ship','gem'].forEach(type=>{
    const list=type==='ship'?SHIP_LIST:GEM_LIST;
    const el=document.getElementById(type==='ship'?'catShipList':'catGemList');
    if(!el)return;
    el.innerHTML=list.slice().sort().map(name=>`
      <div class="admin-loc-row" id="catrow-${type}-${esc(name)}">
        <div class="admin-loc-name" id="catname-${type}-${esc(name)}">${esc(name)}</div>
        <div class="admin-loc-edit" id="catedit-${type}-${esc(name)}" style="display:none;">
          <input type="text" value="${esc(name)}" id="catinput-${type}-${esc(name)}">
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0;">
          <button class="btn btn-outline btn-sm" id="cateditbtn-${type}-${esc(name)}" onclick="adminCatEditToggle('${type}','${esc(name)}')" title="Editar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></button>
          <button class="btn btn-success btn-sm" id="catsavebtn-${type}-${esc(name)}" style="display:none;" onclick="adminCatSave('${type}','${esc(name)}')" title="Guardar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg></button>
          <button class="btn btn-danger btn-sm" onclick="adminCatDel('${type}','${esc(name)}')" title="Apagar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg></button>
        </div>
      </div>`).join('');
  });
}
function adminCatEditToggle(type,name){
  document.getElementById(`catname-${type}-${name}`).style.display='none';
  document.getElementById(`catedit-${type}-${name}`).style.display='block';
  document.getElementById(`cateditbtn-${type}-${name}`).style.display='none';
  document.getElementById(`catsavebtn-${type}-${name}`).style.display='';
  document.getElementById(`catinput-${type}-${name}`).focus();
}
function adminCatSave(type,oldName){
  const newName=document.getElementById(`catinput-${type}-${oldName}`).value.trim();
  if(!newName)return toast('Nome inválido.','err');
  const list=type==='ship'?SHIP_LIST:GEM_LIST;
  const idx=list.indexOf(oldName);if(idx===-1)return;
  if(list.includes(newName)&&newName!==oldName)return toast('Este nome já existe.','err');
  list[idx]=newName;
  localStorage.setItem(type==='ship'?'sg_ship_list':'sg_gem_list',JSON.stringify(list));
  refreshOreSets();buildOreOptions();renderAdminCatalog();
  toast(`"${oldName}" renomeado para "${newName}".`,'ok');
}
function adminCatDel(type,name){
  if(!confirm(`Apagar "${name}" do catálogo?`))return;
  const list=type==='ship'?SHIP_LIST:GEM_LIST;
  const idx=list.indexOf(name);if(idx===-1)return;
  list.splice(idx,1);
  localStorage.setItem(type==='ship'?'sg_ship_list':'sg_gem_list',JSON.stringify(list));
  refreshOreSets();buildOreOptions();renderAdminCatalog();
  toast(`"${name}" removido.`,'ok');
}
function adminCatAdd(type){
  const inputId=type==='ship'?'newShipName':'newGemName';
  const n=document.getElementById(inputId).value.trim();
  if(!n)return toast('Introduz um nome.','err');
  const list=type==='ship'?SHIP_LIST:GEM_LIST;
  const other=type==='ship'?GEM_LIST:SHIP_LIST;
  if(list.includes(n)||other.includes(n))return toast('Este nome já existe no catálogo.','err');
  list.push(n);
  localStorage.setItem(type==='ship'?'sg_ship_list':'sg_gem_list',JSON.stringify(list));
  refreshOreSets();buildOreOptions();renderAdminCatalog();
  document.getElementById(inputId).value='';
  toast(`"${n}" adicionado.`,'ok');
}

// ── LOCALIZAÇÕES ──────────────────────────────────────────────────────────
function renderAdminLocs(){
  const el=document.getElementById('adminLocList');if(!el)return;
  if(!allLocations.length){el.innerHTML='<div style="color:var(--muted);font-size:0.85rem;">Nenhuma localização. Adiciona acima.</div>';return;}
  const grouped={};
  allLocations.forEach(l=>{const sys=l.system||'Outro';if(!grouped[sys])grouped[sys]=[];grouped[sys].push(l);});
  el.innerHTML=Object.keys(grouped).sort().map(sys=>`<div style="margin-bottom:12px;"><div style="font-size:0.68rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid var(--border);">${esc(sys)}</div>${grouped[sys].map(l=>`<div class="admin-loc-row" id="locrow-${l.id}"><div id="locname-${l.id}" style="flex:1;font-size:0.88rem;color:var(--text2);">${esc(l.name)}</div><div id="locedit-${l.id}" style="display:none;flex:1;gap:6px;align-items:center;"><input type="text" id="locinput-${l.id}" value="${esc(l.name)}" onkeydown="if(event.key==='Enter')adminSaveLoc('${l.id}');if(event.key==='Escape')adminCancelLoc('${l.id}')" style="flex:1;height:32px;padding:0 8px;background:var(--bg2);border:1px solid var(--accent);border-radius:var(--r-sm);color:var(--text);font-family:'Inter',sans-serif;font-size:0.82rem;outline:none;"><select id="locsystem-${l.id}" style="height:32px;padding:0 6px;background:var(--bg2);border:1px solid var(--border2);border-radius:var(--r-sm);color:var(--text);font-family:'Inter',sans-serif;font-size:0.78rem;outline:none;"><option${l.system==='Stanton'?' selected':''}>Stanton</option><option${l.system==='Pyro'?' selected':''}>Pyro</option><option${l.system==='Nyx'?' selected':''}>Nyx</option><option${l.system==='Outro'?' selected':''}>Outro</option></select></div><div style="display:flex;gap:4px;flex-shrink:0;"><button class="btn btn-outline btn-sm" id="loceditbtn-${l.id}" onclick="adminEditLocToggle('${l.id}')" title="Editar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></button><button class="btn btn-success btn-sm" id="locsavebtn-${l.id}" style="display:none;" onclick="adminSaveLoc('${l.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg></button><button class="btn btn-outline btn-sm" id="loccancelbtn-${l.id}" style="display:none;" onclick="adminCancelLoc('${l.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button><button class="btn btn-danger btn-sm" id="locdelbtn-${l.id}" onclick="adminDelLoc('${l.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg></button></div></div>`).join('')}</div>`).join('');
}
function adminEditLocToggle(id){document.getElementById('locname-'+id).style.display='none';document.getElementById('locedit-'+id).style.display='flex';document.getElementById('loceditbtn-'+id).style.display='none';document.getElementById('locsavebtn-'+id).style.display='';document.getElementById('loccancelbtn-'+id).style.display='';document.getElementById('locdelbtn-'+id).style.display='none';const inp=document.getElementById('locinput-'+id);inp.focus();inp.select();}
function adminCancelLoc(id){document.getElementById('locname-'+id).style.display='';document.getElementById('locedit-'+id).style.display='none';document.getElementById('loceditbtn-'+id).style.display='';document.getElementById('locsavebtn-'+id).style.display='none';document.getElementById('loccancelbtn-'+id).style.display='none';document.getElementById('locdelbtn-'+id).style.display='';}
async function adminSaveLoc(id){const name=document.getElementById('locinput-'+id).value.trim();const system=document.getElementById('locsystem-'+id).value;if(!name)return toast('Nome inválido.','err');try{const r=await fetch('/api/locations',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,name,system})});if(!r.ok){const d=await r.json();return toast(d.error||'Erro.','err');}await loadLocations();renderAdminLocs();toast('Localização atualizada.','ok');}catch{toast('Erro ao guardar.','err');}}
async function adminDelLoc(id){const loc=allLocations.find(l=>String(l.id)===String(id));if(!confirm(`Remover "${loc?.name||id}"?`))return;try{await fetch(`/api/locations?id=${id}`,{method:'DELETE'});await loadLocations();renderAdminLocs();toast('Localização removida.','ok');}catch{toast('Erro ao remover.','err');}}
function buildLocName(){const name=document.getElementById('newLocName').value.trim();const system=document.getElementById('newLocSystem').value;const type=document.getElementById('newLocType').value;if(!name)return{name:'',system,type};return{name,system,type};}
function updateLocType(){const system=document.getElementById('newLocSystem').value;const typeEl=document.getElementById('newLocType');const opts={'Stanton':['Cidade','Estação Orbital','Lua','Estação','Outro'],'Pyro':['Estação','Cidade','Outro'],'Nyx':['Estação','Outro'],'Outro':['Cidade','Estação Orbital','Lua','Estação','Outro']};const cur=typeEl.value;typeEl.innerHTML=(opts[system]||opts['Outro']).map(o=>`<option${o===cur?' selected':''}>${o}</option>`).join('');updateLocPreview();}
function updateLocPreview(){const{name}=buildLocName();const prev=document.getElementById('newLocPreview');const txt=document.getElementById('newLocPreviewText');if(name){prev.style.display='block';txt.textContent=name;}else{prev.style.display='none';}}
async function adminAddLoc(){const{name,system,type}=buildLocName();if(!name)return toast('Introduz o nome da localização.','err');try{const r=await fetch('/api/locations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,system,type})});if(!r.ok){const d=await r.json();return toast(d.error||'Erro.','err');}document.getElementById('newLocName').value='';document.getElementById('newLocPreview').style.display='none';await loadLocations();renderAdminLocs();toast(`"${name}" adicionada.`,'ok');}catch{toast('Erro ao adicionar.','err');}}

// ── OBJETIVOS ─────────────────────────────────────────────────────────────
let dragSrcIdx=null;
function objDragStart(e,i){dragSrcIdx=i;e.dataTransfer.effectAllowed='move';}
function objDragOver(e){e.preventDefault();e.dataTransfer.dropEffect='move';e.currentTarget.style.borderColor='var(--accent)';}

async function renderAdminObj(){
  try{const r=await fetch('/api/objectives');const d=await r.json();objCache=d.objectives||[];}catch{objCache=[];}
  const objs=objCache;
  const el=document.getElementById('adminObjList');if(!el)return;
  const shipOpts=SHIP_LIST.slice().sort().map(n=>`<option>${esc(n)}</option>`).join('');
  const gemOpts=GEM_LIST.slice().sort().map(n=>`<option>${esc(n)}</option>`).join('');
  const so=document.getElementById('newObjShipOpts');const go=document.getElementById('newObjGemOpts');
  if(so)so.innerHTML=shipOpts;if(go)go.innerHTML=gemOpts;
  if(!objs.length){el.innerHTML=`<p style="font-size:0.82rem;color:var(--muted);">Sem objetivos. Adiciona abaixo.</p>`;return;}
  const adminCatColors={'Componentes de Mineração':'#f59e0b','Armas FPS':'#f87171','Armaduras FPS':'#60a5fa','Componentes de Nave':'#a78bfa','Armas de Nave':'#34d399','Evento':'#fbbf24'};
  el.innerHTML=objs.map((o,i)=>{
    const isGem=GEM_M.has(o.item);const unit=isGem?'UND':'SCU';
    const hasQty=o.target_qty!=null&&parseFloat(o.target_qty)>0;
    const qtyFmt=hasQty?(isGem?Math.round(o.target_qty):parseFloat(o.target_qty).toLocaleString('pt-BR',{minimumFractionDigits:3,maximumFractionDigits:3})):null;
    const catColor=adminCatColors[o.category||'']||'#94a3b8';
    const iconBg=isGem?'rgba(20,184,166,0.12)':'rgba(245,158,11,0.12)';
    const iconColor=isGem?'#2dd4bf':'#f59e0b';
    const ic=oreIcon(o.item);
    return`<div class="obj-edit-row" draggable="true" data-idx="${i}" ondragstart="objDragStart(event,${i})" ondragover="objDragOver(event)" ondrop="objDrop(event,${i})" ondragleave="event.currentTarget.style.borderColor=''" style="margin-bottom:8px;">
      <div class="obj-drag-handle" title="Arrastar para reordenar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="18" x2="16" y2="18"/></svg></div>
      <div class="obj-rank rn" style="flex-shrink:0;">${i+1}º</div>
      <div style="width:30px;height:30px;border-radius:0.4rem;background:${iconBg};display:flex;align-items:center;justify-content:center;color:${iconColor};flex-shrink:0;">${itemSvg(ic)}</div>
      <div style="flex:1;min-width:0;display:flex;align-items:center;gap:8px;overflow:hidden;">
        <span style="font-size:1.15rem;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(o.item)}</span>
        ${o.category?`<span style="font-size:0.72rem;font-weight:600;color:${catColor};white-space:nowrap;flex-shrink:0;opacity:0.85;">${esc(o.category)}</span>`:''}
        ${o.category==='Evento'&&o.event_name?`<span style="font-size:0.72rem;font-weight:500;color:#fbbf24;white-space:nowrap;flex-shrink:0;opacity:0.9;background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.25);border-radius:4px;padding:1px 7px;">${esc(o.event_name)}</span>`:''}
      </div>
      <div style="flex:0 0 160px;display:flex;align-items:center;justify-content:center;"><span style="font-size:0.8rem;color:var(--muted);white-space:nowrap;">${o.note?esc(o.note):''}</span></div>
      <div style="flex:0 0 120px;display:flex;align-items:center;justify-content:flex-end;">${hasQty?`<span style="font-size:0.8rem;font-weight:700;color:${catColor};">${qtyFmt} <span style="font-size:0.7rem;font-weight:600;color:var(--muted);">${unit}</span></span>`:''}</div>
      <div style="display:flex;gap:4px;flex-shrink:0;">
        <button class="btn btn-ghost btn-sm" onclick="adminMoveObj(${i},-1)" title="Subir" ${i===0?'disabled':''} style="opacity:${i===0?'0.3':'1'}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="18 15 12 9 6 15"/></svg></button>
        <button class="btn btn-ghost btn-sm" onclick="adminMoveObj(${i},1)" title="Descer" ${i===objs.length-1?'disabled':''} style="opacity:${i===objs.length-1?'0.3':'1'}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="6 9 12 15 18 9"/></svg></button>
        <button class="btn btn-danger btn-sm" onclick="adminDelObj(${i})" title="Remover"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg></button>
      </div>
    </div>`;
  }).join('');
}
async function objDrop(e,i){e.preventDefault();e.currentTarget.style.borderColor='';if(dragSrcIdx===null||dragSrcIdx===i)return;const objs=[...objCache];const[moved]=objs.splice(dragSrcIdx,1);objs.splice(i,0,moved);await fetch('/api/objectives',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({order:objs.map(o=>o.id)})});dragSrcIdx=null;renderAdminObj();}
async function adminMoveObj(i,dir){const objs=[...objCache];const ni=i+dir;if(ni<0||ni>=objs.length)return;[objs[i],objs[ni]]=[objs[ni],objs[i]];await fetch('/api/objectives',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({order:objs.map(o=>o.id)})});renderAdminObj();}
function toggleEventoDesc(){const cat=document.getElementById('newObjCategory').value;const row=document.getElementById('eventoDescRow');if(row)row.style.display=cat==='Evento'?'block':'none';if(cat!=='Evento'){const d=document.getElementById('newObjEventoDesc');if(d)d.value='';}}
async function adminAddObj(){
  const item=document.getElementById('newObjItem').value;
  const note=document.getElementById('newObjNote').value.trim();
  const category=document.getElementById('newObjCategory').value;
  const qtyRaw=document.getElementById('newObjQty').value;
  let target_qty=null;if(qtyRaw!==''&&qtyRaw!==null){const v=parseFloat(qtyRaw);if(!isNaN(v)&&v>0)target_qty=v;}
  if(!item)return toast('Seleciona um item.','err');
  try{
    const event_name=category==='Evento'?(document.getElementById('newObjEventoDesc').value.trim()||null):null;
    const r=await fetch('/api/objectives',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({item,note,category,target_qty,event_name})});
    if(!r.ok){const d=await r.json();return toast(d.error||'Erro.','err');}
    document.getElementById('newObjNote').value='Mínimo Q900';document.getElementById('newObjQty').value='';
    const evd=document.getElementById('newObjEventoDesc');if(evd)evd.value='';
    renderAdminObj();toast(`"${item}" adicionado aos objetivos.`,'ok');
  }catch{toast('Erro ao adicionar.','err');}
}
async function adminDelObj(i){const obj=objCache[i];if(!obj)return;try{await fetch(`/api/objectives?id=${obj.id}`,{method:'DELETE'});renderAdminObj();toast(`"${obj.item}" removido.`,'ok');}catch{toast('Erro ao remover.','err');}}

// ── OBJETIVOS ITENS ───────────────────────────────────────────────────────
let objItemsCache=[];
let objItemsDragSrcIdx=null;
function objItemsDragStart(e,i){objItemsDragSrcIdx=i;e.dataTransfer.effectAllowed='move';}

async function renderAdminObjItems(){
  try{const r=await fetch('/api/objectives_items');const d=await r.json();objItemsCache=d.objectives_items||[];}catch{objItemsCache=[];}
  const objs=objItemsCache;
  const el=document.getElementById('adminObjItemsList');if(!el)return;
  const OBJ_ITEM_COLORS={'Armas (FPS)':'#f87171','Armadura (FPS)':'#60a5fa','Armas (Veículo)':'#34d399','Componentes (Veículo)':'#a78bfa','Componentes (Mining)':'#f59e0b'};
  if(!objs.length){el.innerHTML=`<p style="font-size:0.82rem;color:var(--muted);">Sem objetivos de itens. Adiciona abaixo.</p>`;return;}
  el.innerHTML=objs.map((o,i)=>{
    const catColor=OBJ_ITEM_COLORS[o.category||'']||'#94a3b8';
    const hasQty=o.target_qty!=null&&parseFloat(o.target_qty)>0;
    const qtyFmt=hasQty?Math.round(o.target_qty):null;
    return`<div class="obj-edit-row" draggable="true" data-idx="${i}" ondragstart="objItemsDragStart(event,${i})" ondragover="objDragOver(event)" ondrop="objItemsDrop(event,${i})" ondragleave="event.currentTarget.style.borderColor=''" style="margin-bottom:8px;">
      <div class="obj-drag-handle" title="Arrastar para reordenar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="18" x2="16" y2="18"/></svg></div>
      <div class="obj-rank rn" style="flex-shrink:0;">${i+1}º</div>
      <div style="flex:1;min-width:0;display:flex;align-items:center;gap:8px;overflow:hidden;">
        <span style="font-size:1.05rem;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(o.item)}</span>
        ${o.category?`<span style="font-size:0.72rem;font-weight:600;color:${catColor};white-space:nowrap;flex-shrink:0;opacity:0.85;">${esc(o.category)}</span>`:''}
      </div>
      <div style="flex:0 0 160px;display:flex;align-items:center;justify-content:center;"><span style="font-size:0.8rem;color:var(--muted);white-space:nowrap;">${o.note?esc(o.note):''}</span></div>
      <div style="flex:0 0 80px;display:flex;align-items:center;justify-content:flex-end;">${hasQty?`<span style="font-size:0.8rem;font-weight:700;color:${catColor};">${qtyFmt} <span style="font-size:0.7rem;font-weight:600;color:var(--muted);">UND</span></span>`:''}</div>
      <div style="display:flex;gap:4px;flex-shrink:0;">
        <button class="btn btn-ghost btn-sm" onclick="adminMoveObjItem(${i},-1)" title="Subir" ${i===0?'disabled':''} style="opacity:${i===0?'0.3':'1'}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="18 15 12 9 6 15"/></svg></button>
        <button class="btn btn-ghost btn-sm" onclick="adminMoveObjItem(${i},1)" title="Descer" ${i===objs.length-1?'disabled':''} style="opacity:${i===objs.length-1?'0.3':'1'}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="6 9 12 15 18 9"/></svg></button>
        <button class="btn btn-danger btn-sm" onclick="adminDelObjItem(${i})" title="Remover"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg></button>
      </div>
    </div>`;
  }).join('');
}
async function objItemsDrop(e,i){e.preventDefault();e.currentTarget.style.borderColor='';if(objItemsDragSrcIdx===null||objItemsDragSrcIdx===i)return;const objs=[...objItemsCache];const[moved]=objs.splice(objItemsDragSrcIdx,1);objs.splice(i,0,moved);await fetch('/api/objectives_items',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({order:objs.map(o=>o.id)})});objItemsDragSrcIdx=null;renderAdminObjItems();}
async function adminMoveObjItem(i,dir){const objs=[...objItemsCache];const ni=i+dir;if(ni<0||ni>=objs.length)return;[objs[i],objs[ni]]=[objs[ni],objs[i]];await fetch('/api/objectives_items',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({order:objs.map(o=>o.id)})});renderAdminObjItems();}
async function adminAddObjItem(){const item=document.getElementById('newObjItemName').value.trim();const category=document.getElementById('newObjItemCat').value;const note=document.getElementById('newObjItemNote').value.trim();const qtyRaw=document.getElementById('newObjItemQty').value;let target_qty=null;if(qtyRaw!==''&&qtyRaw!==null){const v=parseFloat(qtyRaw);if(!isNaN(v)&&v>0)target_qty=v;}if(!item)return toast('Escreve o nome do item.','err');try{const r=await fetch('/api/objectives_items',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({item,note,category,target_qty})});if(!r.ok){const d=await r.json();return toast(d.error||'Erro.','err');}document.getElementById('newObjItemName').value='';document.getElementById('newObjItemNote').value='';document.getElementById('newObjItemQty').value='';renderAdminObjItems();toast(`"${item}" adicionado aos objetivos.`,'ok');}catch{toast('Erro ao adicionar.','err');}}
async function adminDelObjItem(i){
  const obj=objItemsCache[i];if(!obj)return;
  // Load blueprint data and find ingredients of this item
  const bpData=await _adminBpLoad();
  const bp=bpData.find(b=>b.name.toLowerCase()===(obj.item||'').toLowerCase());
  const ingNames=bp?bp.ingredients.map(ing=>ing.name.toLowerCase()):[];
  let orphaned=[];
  if(ingNames.length){
    // Fetch current mineral objectives
    let minObjs=[];
    try{const r=await fetch('/api/objectives');const d=await r.json();minObjs=d.objectives||[];}catch{}
    // Collect ingredients used by all OTHER remaining item objectives
    const otherIngNames=new Set();
    objItemsCache.forEach((oi,idx)=>{
      if(idx===i)return;
      const obp=bpData.find(b=>b.name.toLowerCase()===(oi.item||'').toLowerCase());
      if(obp)obp.ingredients.forEach(ing=>otherIngNames.add(ing.name.toLowerCase()));
    });
    // Orphaned = ingredient exists in mineral objectives AND no other item needs it
    orphaned=minObjs.filter(mo=>ingNames.includes((mo.item||'').toLowerCase())&&!otherIngNames.has((mo.item||'').toLowerCase()));
  }
  if(orphaned.length){
    _showDelObjItemModal(obj,i,orphaned);
  }else{
    await _doDelObjItem(i,[]);
  }
}
async function _doDelObjItem(i,mineralIds){
  const obj=objItemsCache[i];if(!obj)return;
  try{
    await fetch(`/api/objectives_items?id=${obj.id}`,{method:'DELETE'});
    for(const mid of mineralIds)await fetch(`/api/objectives?id=${mid}`,{method:'DELETE'});
    renderAdminObjItems();toast(`"${obj.item}" removido.`,'ok');
  }catch{toast('Erro ao remover.','err');}
}
function _showDelObjItemModal(obj,idx,orphaned){
  const mid='_delObjItemModal';
  const ex=document.getElementById(mid);if(ex)ex.remove();
  const checks=orphaned.map(mo=>`<label style="display:flex;align-items:center;gap:8px;font-size:0.84rem;color:var(--text2);cursor:pointer;padding:4px 0;"><input type="checkbox" checked data-mid="${mo.id}" style="width:14px;height:14px;accent-color:var(--accent);cursor:pointer;"> ${esc(mo.item)}</label>`).join('');
  const modal=document.createElement('div');
  modal.id=mid;
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:9999;display:flex;align-items:center;justify-content:center;';
  modal.innerHTML=`<div style="background:var(--card);border:1px solid var(--border2);border-radius:0.85rem;padding:24px 26px;max-width:380px;width:92%;display:flex;flex-direction:column;gap:14px;box-shadow:0 8px 32px rgba(0,0,0,0.4);">
    <div style="font-size:1rem;font-weight:700;color:var(--text);">Apagar "${esc(obj.item)}"</div>
    <div style="font-size:0.84rem;color:var(--muted);line-height:1.55;">Os seguintes objetivos de minérios só são usados por este item. Apagar também?</div>
    <div style="display:flex;flex-direction:column;gap:2px;">${checks}</div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px;flex-wrap:wrap;">
      <button class="btn btn-ghost btn-sm" onclick="document.getElementById('${mid}').remove()">Cancelar</button>
      <button class="btn btn-outline btn-sm" onclick="_confirmDelObjItem(${idx},'${mid}',false)">Só o item</button>
      <button class="btn btn-danger btn-sm" onclick="_confirmDelObjItem(${idx},'${mid}',true)">Apagar selecionados</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
}
async function _confirmDelObjItem(idx,mid,withMinerals){
  const modal=document.getElementById(mid);
  const mineralIds=[];
  if(withMinerals&&modal)modal.querySelectorAll('input[type=checkbox]:checked').forEach(cb=>{if(cb.dataset.mid)mineralIds.push(cb.dataset.mid);});
  if(modal)modal.remove();
  await _doDelObjItem(idx,mineralIds);
}

async function adminAddObjItemManual(){
  const item=document.getElementById('manualObjItemName')?.value.trim();
  const category=document.getElementById('manualObjItemCat')?.value||'Armas (FPS)';
  if(!item)return toast('Escreve o nome do item.','err');
  try{
    const r=await fetch('/api/objectives_items',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({item,note:'',category,target_qty:null})});
    if(!r.ok){const d=await r.json();return toast(d.error||'Erro.','err');}
    document.getElementById('manualObjItemName').value='';
    renderAdminObjItems();toast(`"${item}" adicionado.`,'ok');
  }catch{toast('Erro ao adicionar.','err');}
}

// ── BLUEPRINT SEARCH ──────────────────────────────────────────────────────
let _adminBpData=null;let _adminBpFiltered=[];let _adminBpSel=null;

async function _adminBpLoad(){
  if(_adminBpData)return _adminBpData;
  try{
    const r=await fetch('/ptblueprints.json');
    const raw=await r.json();
    const arr=raw.blueprints||(Array.isArray(raw)?raw:[]);
    _adminBpData=arr.map(bp=>{
      const ings=(bp.slots||[]).map(slot=>{
        const opt=slot.options&&slot.options[0];
        if(!opt||opt.type!=='resource'||!opt.resourceName)return null;
        const mods=(opt.modifiers||[]).map(m=>{const p=m.gameplayProperty||'';const part=p.includes('_')?p.split('_').slice(1).join(' '):p;const label=part.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/\b\w/g,c=>c.toUpperCase());return{property:label,modifierAtStart:m.modifierAtStart??1,modifierAtEnd:m.modifierAtEnd??1};});
        return{name:opt.resourceName,quantity:slot.requiredCount||1,modifiers:mods};
      }).filter(Boolean);
      return{name:bp.blueprintName||'',category:bp.categoryName||'',ingredients:ings};
    }).filter(bp=>bp.name);
  }catch(e){_adminBpData=[];toast('Erro ao carregar blueprints: '+e.message,'err');}
  return _adminBpData;
}

async function bpSearch(){
  const data=await _adminBpLoad();
  const q=(document.getElementById('bpSearchInput')?.value||'').trim().toLowerCase();
  const el=document.getElementById('bpSearchResults');
  if(!el)return;
  if(!q){el.style.display='none';el.innerHTML='';return;}
  _adminBpFiltered=data.filter(b=>b.name.toLowerCase().includes(q)).slice(0,40);
  if(!_adminBpFiltered.length){el.style.display='block';el.innerHTML='<div style="padding:10px 14px;color:var(--muted);font-size:0.82rem;">Nenhum resultado.</div>';return;}
  el.style.display='block';
  el.innerHTML=_adminBpFiltered.map((b,i)=>`<div class="bp-result-item" onclick="bpSelect(${i})"><div style="font-size:0.88rem;font-weight:600;color:var(--text);">${esc(b.name)}</div></div>`).join('');
}

function bpSelect(i){
  _adminBpSel=_adminBpFiltered[i];if(!_adminBpSel)return;
  const inp=document.getElementById('bpSearchInput');if(inp)inp.value=_adminBpSel.name;
  document.getElementById('bpSearchResults').style.display='none';
  _bpRenderPreview();
}

function _bpRenderPreview(){
  const prev=document.getElementById('bpPreview');if(!prev||!_adminBpSel)return;
  const bp=_adminBpSel;
  const SS='height:38px;padding:0 10px;background:var(--bg2);border:1px solid var(--border2);border-radius:var(--r-sm);color:var(--text);font-family:Inter,sans-serif;font-size:0.82rem;outline:none;width:100%;';
  prev.style.display='block';
  prev.innerHTML=`<div style="display:flex;align-items:center;gap:10px;"><div style="flex:1;font-size:1rem;font-weight:700;color:var(--text);">${esc(bp.name)}</div><button class="btn btn-ghost btn-sm" onclick="bpClearSel()">Limpar</button></div><div style="display:flex;gap:8px;align-items:flex-end;margin-top:10px;"><div class="ff" style="flex:1;"><label>Subcategoria</label><select id="bpItemCat" style="${SS}"><option value="Armas (FPS)">Armas (FPS)</option><option value="Armadura (FPS)">Armadura (FPS)</option><option value="Armas (Veículo)">Armas (Veículo)</option><option value="Componentes (Veículo)">Componentes (Veículo)</option><option value="Componentes (Mining)">Componentes (Mining)</option></select></div><button class="btn btn-success btn-sm" onclick="bpConfirmAdd()" style="height:38px;flex-shrink:0;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Adicionar</button></div>`;
}

function bpClearSel(){
  _adminBpSel=null;
  const inp=document.getElementById('bpSearchInput');if(inp)inp.value='';
  const el=document.getElementById('bpSearchResults');if(el){el.style.display='none';el.innerHTML='';}
  const prev=document.getElementById('bpPreview');if(prev)prev.style.display='none';
}

async function bpConfirmAdd(){
  if(!_adminBpSel)return;
  const bp=_adminBpSel;
  const category=document.getElementById('bpItemCat')?.value||'Armas (FPS)';
  try{
    const r=await fetch('/api/objectives_items',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({item:bp.name,note:'',category,target_qty:null})});
    if(!r.ok){const d=await r.json();return toast(d.error||'Erro.','err');}
    toast(`"${bp.name}" adicionado.`,'ok');
  }catch{return toast('Erro ao adicionar item.','err');}
  if(bp.ingredients.length){
    const catMap={'Armas (FPS)':'Armas FPS','Armadura (FPS)':'Armaduras FPS','Armas (Veículo)':'Armas de Nave','Componentes (Veículo)':'Componentes de Nave','Componentes (Mining)':'Componentes de Mineração'};
    const objCat=catMap[category]||'Componentes de Mineração';
    for(const ing of bp.ingredients){
      if(!ing.name)continue;
      try{
        await fetch('/api/objectives',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({item:ing.name,note:'',category:objCat,target_qty:null})});
      }catch{}
    }
  }
  bpClearSel();
  renderAdminObjItems();
}

// ── ATIVIDADE ─────────────────────────────────────────────────────────────
async function renderAdminActivity(){
  const el=document.getElementById('adminActivityContent');
  if(!el)return;
  el.innerHTML='<div style="color:var(--muted);font-size:0.85rem;">A carregar...</div>';
  let logs=[];
  try{const r=await fetch('/api/activity');const d=await r.json();logs=d.logs||[];}catch{el.innerHTML='<div style="color:#f87171;">Erro ao carregar.</div>';return;}

  const now=Date.now();
  function parseTs(ts){return new Date((ts||'').replace(' ','T')+'Z').getTime();}
  function timeAgo(ts){const s=Math.floor((now-parseTs(ts))/1000);if(s<60)return'agora';if(s<3600)return Math.floor(s/60)+'m';if(s<86400)return Math.floor(s/3600)+'h';return Math.floor(s/86400)+'d atrás';}
  function devIcon(ua){return/Mobile|Android|iPhone|iPad/i.test(ua||'')?'📱':'🖥️';}

  const today=new Date().toISOString().slice(0,10);
  const weekAgo=new Date(now-7*864e5).toISOString().slice(0,10);

  const loginsToday=logs.filter(l=>l.action==='login'&&(l.timestamp||'').startsWith(today)).length;
  const activeWeek=new Set(logs.filter(l=>l.timestamp>=weekAgo.replace('T',' ')).map(l=>l.username)).size;
  const totalLogins=logs.filter(l=>l.action==='login').length;
  const totalLogouts=logs.filter(l=>l.action==='logout').length;

  // Per-user login counts
  const userCnt={};
  logs.filter(l=>l.action==='login').forEach(l=>{userCnt[l.username]=(userCnt[l.username]||0)+1;});
  const topUsers=Object.entries(userCnt).sort((a,b)=>b[1]-a[1]).slice(0,8);

  // Daily logins last 10 days
  const days=[];for(let i=9;i>=0;i--){const d=new Date(now-i*864e5);days.push(d.toISOString().slice(0,10));}
  const dayCnt={};
  logs.filter(l=>l.action==='login').forEach(l=>{const d=(l.timestamp||'').slice(0,10);if(dayCnt[d]!==undefined||days.includes(d))dayCnt[d]=(dayCnt[d]||0)+1;});
  const dayMax=Math.max(1,...days.map(d=>dayCnt[d]||0));

  const statCard=(val,lbl,clr='var(--accent2)')=>`<div style="background:var(--card2);border:1px solid var(--border2);border-radius:0.65rem;padding:14px 18px;text-align:center;flex:1;min-width:100px;">
    <div style="font-size:1.6rem;font-weight:800;color:${clr};">${val}</div>
    <div style="font-size:0.72rem;color:var(--muted);margin-top:3px;">${lbl}</div>
  </div>`;

  const chartBars=days.map(d=>{
    const cnt=dayCnt[d]||0;
    const pct=Math.round(cnt/dayMax*100);
    const label=d.slice(5); // MM-DD
    return`<div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;">
      <div style="font-size:0.68rem;color:var(--accent2);font-weight:700;">${cnt||''}</div>
      <div style="flex:1;width:100%;display:flex;align-items:flex-end;min-height:40px;">
        <div style="width:100%;background:${cnt>0?'var(--accent)':'var(--muted2)'};border-radius:3px 3px 0 0;height:${pct||2}%;min-height:${cnt>0?'4px':'2px'};transition:height 0.3s;"></div>
      </div>
      <div style="font-size:0.62rem;color:var(--muted);white-space:nowrap;">${label}</div>
    </div>`;
  }).join('');

  const topUsersHtml=topUsers.map(([u,c])=>`
    <div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);">
      <span style="font-size:0.82rem;font-weight:600;color:var(--text);">${esc(u)}</span>
      <span style="font-size:0.78rem;color:var(--accent2);font-weight:700;">${c}×</span>
    </div>`).join('');

  const logRows=logs.slice(0,120).map(l=>`
    <tr style="border-bottom:1px solid var(--border);">
      <td style="padding:6px 8px;font-size:0.75rem;">${devIcon(l.user_agent)}</td>
      <td style="padding:6px 8px;font-size:0.82rem;font-weight:600;color:var(--text);">${esc(l.username)}</td>
      <td style="padding:6px 8px;">
        <span style="font-size:0.72rem;font-weight:700;padding:2px 7px;border-radius:3px;background:${l.action==='login'?'rgba(34,197,94,0.12)':'rgba(248,113,113,0.12)'};color:${l.action==='login'?'#22c55e':'#f87171'};">${l.action==='login'?'login':'logout'}</span>
      </td>
      <td style="padding:6px 8px;font-size:0.74rem;color:var(--muted);">${timeAgo(l.timestamp)}</td>
      <td style="padding:6px 8px;font-size:0.68rem;color:var(--muted2);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc((l.user_agent||'').split(' ').slice(-2).join(' '))}</td>
    </tr>`).join('');

  el.innerHTML=`
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;">
      ${statCard(loginsToday,'Logins hoje','#22c55e')}
      ${statCard(activeWeek,'Ativos (7d)','var(--accent2)')}
      ${statCard(totalLogins,'Total logins')}
      ${statCard(totalLogouts,'Total logouts','#f87171')}
    </div>
    <div class="admin-grid" style="margin-bottom:16px;">
      <div class="admin-card">
        <div style="font-size:0.78rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:12px;">Logins por dia (últimos 10d)</div>
        <div style="display:flex;gap:6px;align-items:flex-end;height:80px;">${chartBars}</div>
      </div>
      <div class="admin-card">
        <div style="font-size:0.78rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:8px;">Top utilizadores</div>
        ${topUsersHtml||'<div style="color:var(--muted);font-size:0.82rem;">Sem dados.</div>'}
      </div>
    </div>
    <div class="admin-card" style="padding:0;overflow:hidden;">
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="border-bottom:1px solid var(--border2);">
          <th style="padding:8px;font-size:0.72rem;color:var(--muted);font-weight:600;text-align:left;"></th>
          <th style="padding:8px;font-size:0.72rem;color:var(--muted);font-weight:600;text-align:left;">Usuário</th>
          <th style="padding:8px;font-size:0.72rem;color:var(--muted);font-weight:600;text-align:left;">Ação</th>
          <th style="padding:8px;font-size:0.72rem;color:var(--muted);font-weight:600;text-align:left;">Quando</th>
          <th style="padding:8px;font-size:0.72rem;color:var(--muted);font-weight:600;text-align:left;">Browser</th>
        </tr></thead>
        <tbody>${logRows}</tbody>
      </table>
    </div>`;
}

// ── REGRAS ────────────────────────────────────────────────────────────────
let rulesCache=[];
let ruleDragSrcIdx=null;
function ruleDragStart(e,i){ruleDragSrcIdx=i;e.dataTransfer.effectAllowed='move';}

async function renderAdminRules(){
  try{const r=await fetch('/api/rules');const d=await r.json();rulesCache=d.rules||[];}catch{rulesCache=[];}
  const el=document.getElementById('adminRulesList');if(!el)return;
  if(!rulesCache.length){el.innerHTML=`<p style="font-size:0.88rem;color:var(--muted);">Sem regras. Adiciona abaixo.</p>`;return;}
  const TAG_LABELS={'warn':'Aviso','info':'Info','danger':'Importante','success':'OK / Permitido'};
  el.innerHTML=rulesCache.map((r,i)=>`
    <div id="ruleRow-${i}" style="margin-bottom:10px;">
      <div id="ruleView-${i}" style="background:var(--card2);border:1px solid var(--border2);border-radius:0.75rem;padding:16px 18px;display:flex;align-items:flex-start;gap:10px;">
        <div class="obj-drag-handle" style="margin-top:3px;cursor:grab;" draggable="true" ondragstart="ruleDragStart(event,${i})" ondragover="objDragOver(event)" ondrop="ruleDrop(event,${i})" ondragleave="event.currentTarget.style.borderColor=''">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="18" x2="16" y2="18"/></svg>
        </div>
        <div class="rule-num" style="margin-top:2px;flex-shrink:0;">${i+1}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:1rem;font-weight:700;color:var(--text);line-height:1.4;">${esc(r.title)}</div>
          ${r.description?`<div style="font-size:0.88rem;color:var(--text2);margin-top:5px;line-height:1.7;white-space:pre-wrap;">${esc(r.description)}</div>`:''}
          ${r.tag?`<span class="rule-tag ${esc(r.tag)}" style="margin-top:8px;">${esc(TAG_LABELS[r.tag]||r.tag)}</span>`:''}
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0;margin-top:2px;">
          <button class="btn btn-ghost btn-sm" onclick="adminMoveRule(${i},-1)" ${i===0?'disabled':''} style="opacity:${i===0?'0.3':'1'}" title="Subir"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="18 15 12 9 6 15"/></svg></button>
          <button class="btn btn-ghost btn-sm" onclick="adminMoveRule(${i},1)" ${i===rulesCache.length-1?'disabled':''} style="opacity:${i===rulesCache.length-1?'0.3':'1'}" title="Descer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="6 9 12 15 18 9"/></svg></button>
          <button class="btn btn-outline btn-sm" onclick="startEditRule(${i})" title="Editar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></button>
          <button class="btn btn-danger btn-sm" onclick="adminDelRule(${i})" title="Remover"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg></button>
        </div>
      </div>
      <div id="ruleEdit-${i}" style="display:none;background:var(--card2);border:1px solid var(--accent-border);border-radius:0.75rem;padding:18px;">
        <div style="margin-bottom:8px;">
          <label style="font-size:0.75rem;color:var(--muted);font-weight:600;display:block;margin-bottom:4px;">Título</label>
          <input type="text" id="ruleEditT-${i}" value="${esc(r.title)}" style="width:100%;height:40px;padding:0 12px;background:var(--bg2);border:1px solid var(--border2);border-radius:var(--r-sm);color:var(--text);font-family:'Inter',sans-serif;font-size:0.95rem;font-weight:600;outline:none;" onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border2)'">
        </div>
        <div style="margin-bottom:8px;">
          <label style="font-size:0.75rem;color:var(--muted);font-weight:600;display:block;margin-bottom:4px;">Descrição</label>
          <textarea id="ruleEditD-${i}" style="width:100%;min-height:180px;padding:10px 12px;background:var(--bg2);border:1px solid var(--border2);border-radius:var(--r-sm);color:var(--text);font-family:'Inter',sans-serif;font-size:0.88rem;outline:none;resize:vertical;line-height:1.65;white-space:pre-wrap;" onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border2)'">${esc(r.description||'')}</textarea>
        </div>
        <div style="margin-bottom:12px;">
          <label style="font-size:0.75rem;color:var(--muted);font-weight:600;display:block;margin-bottom:4px;">Etiqueta</label>
          <select id="ruleEditG-${i}" style="height:36px;padding:0 10px;background:var(--bg2);border:1px solid var(--border2);border-radius:var(--r-sm);color:var(--text);font-family:'Inter',sans-serif;font-size:0.85rem;outline:none;appearance:none;background-image:url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E&quot;);background-repeat:no-repeat;background-position:right 10px center;padding-right:30px;width:200px;">
            <option value="" ${!r.tag?'selected':''}>— Sem etiqueta —</option>
            <option value="info" ${r.tag==='info'?'selected':''}>Info</option>
            <option value="warn" ${r.tag==='warn'?'selected':''}>Aviso</option>
            <option value="danger" ${r.tag==='danger'?'selected':''}>Importante</option>
            <option value="success" ${r.tag==='success'?'selected':''}>OK / Permitido</option>
          </select>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-success btn-sm" onclick="saveRuleInline(${i},${r.id})" style="height:36px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg> Guardar</button>
          <button class="btn btn-outline btn-sm" onclick="cancelRuleInline(${i})" style="height:36px;">Cancelar</button>
        </div>
      </div>
    </div>`).join('');
}
function startEditRule(i){document.getElementById('ruleView-'+i).style.display='none';document.getElementById('ruleEdit-'+i).style.display='block';document.getElementById('ruleEditT-'+i).focus();}
function cancelRuleInline(i){document.getElementById('ruleEdit-'+i).style.display='none';document.getElementById('ruleView-'+i).style.display='flex';}
async function saveRuleInline(i,id){const title=document.getElementById('ruleEditT-'+i).value.trim();const description=document.getElementById('ruleEditD-'+i).value.trim();const tag=document.getElementById('ruleEditG-'+i).value||null;if(!title)return toast('O título não pode estar vazio.','err');try{const r=await fetch('/api/rules',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,title,description,tag})});if(!r.ok){const d=await r.json();return toast(d.error||'Erro.','err');}renderAdminRules();toast('Regra atualizada.','ok');}catch{toast('Erro ao guardar.','err');}}
async function ruleDrop(e,i){e.preventDefault();e.currentTarget.style.borderColor='';if(ruleDragSrcIdx===null||ruleDragSrcIdx===i)return;const rules=[...rulesCache];const[moved]=rules.splice(ruleDragSrcIdx,1);rules.splice(i,0,moved);await fetch('/api/rules',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({order:rules.map(r=>r.id)})});ruleDragSrcIdx=null;renderAdminRules();}
async function adminMoveRule(i,dir){const rules=[...rulesCache];const ni=i+dir;if(ni<0||ni>=rules.length)return;[rules[i],rules[ni]]=[rules[ni],rules[i]];await fetch('/api/rules',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({order:rules.map(r=>r.id)})});renderAdminRules();}
async function adminAddRule(){const title=document.getElementById('newRuleTitle').value.trim();const description=document.getElementById('newRuleDesc').value.trim();const tag=document.getElementById('newRuleTag').value||null;if(!title)return toast('Escreve o título da regra.','err');try{const r=await fetch('/api/rules',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title,description,tag})});if(!r.ok){const d=await r.json();return toast(d.error||'Erro.','err');}document.getElementById('newRuleTitle').value='';document.getElementById('newRuleDesc').value='';document.getElementById('newRuleTag').value='';renderAdminRules();toast('Regra adicionada.','ok');}catch{toast('Erro ao adicionar.','err');}}
async function adminDelRule(i){const rule=rulesCache[i];if(!rule)return;if(!confirm(`Remover regra "${rule.title}"?`))return;try{await fetch(`/api/rules?id=${rule.id}`,{method:'DELETE'});renderAdminRules();toast('Regra removida.','ok');}catch{toast('Erro ao remover.','err');}}

// ── EXPORTAR ──────────────────────────────────────────────────────────────
async function exportXLSX(){
  const btn=document.getElementById('btnExport');
  btn.textContent='A carregar dados...';btn.disabled=true;
  try{const r=await fetch('/api/items?org=1');const d=await r.json();orgI=d.items||[];}catch{toast('Erro ao carregar dados.','err');btn.disabled=false;return;}
  btn.textContent='A gerar...';
  if(window.XLSX){_doExport(btn);return;}
  const script=document.createElement('script');
  script.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  script.onload=()=>_doExport(btn);
  script.onerror=()=>{toast('Erro ao carregar biblioteca Excel.','err');btn.disabled=false;};
  document.head.appendChild(script);
}
function _doExport(btn){
  try{
    const date=new Date().toLocaleDateString('pt-PT');
    const rows=orgI.map(i=>({'Usuário':i.player_name,'Material':i.name,'Tipo':GEM_M.has(i.name)?'Gema':'Minério','Quantidade':GEM_M.has(i.name)?Math.round(parseFloat(i.quantity)):parseFloat(i.quantity),'Unidade':oreUnit(i.name),'Qualidade':i.quality!=null?i.quality:'','Localização':i.location||''})).sort((a,b)=>a['Usuário'].localeCompare(b['Usuário'])||a['Material'].localeCompare(b['Material']));
    if(!rows.length){toast('Sem dados para exportar.','err');btn.disabled=false;return;}
    const wb=XLSX.utils.book_new();
    const ws1=XLSX.utils.json_to_sheet(rows);ws1['!cols']=[{wch:18},{wch:22},{wch:14},{wch:14},{wch:10},{wch:12},{wch:30}];
    const hdr=['A1','B1','C1','D1','E1','F1','G1'];
    hdr.forEach(ref=>{if(ws1[ref])ws1[ref].s={font:{bold:true,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'1E3A5F'}},alignment:{horizontal:'center'},border:{bottom:{style:'medium',color:{rgb:'3B82F6'}}}};});
    ws1['!freeze']={xSplit:0,ySplit:1};XLSX.utils.book_append_sheet(wb,ws1,'Todos os Materiais');
    const byUser={};orgI.forEach(i=>{if(!byUser[i.player_name])byUser[i.player_name]={usuário:i.player_name,itens:0,totalSCU:0,totalUND:0};byUser[i.player_name].itens++;if(GEM_M.has(i.name))byUser[i.player_name].totalUND+=Math.round(parseFloat(i.quantity));else byUser[i.player_name].totalSCU+=parseFloat(i.quantity);});
    const rows2=Object.values(byUser).sort((a,b)=>a.usuário.localeCompare(b.usuário)).map(u=>({'Usuário':u.usuário,'Nº de Registos':u.itens,'Total SCUs':parseFloat(u.totalSCU.toFixed(3)),'Total UND (Gemas)':u.totalUND}));
    const ws2=XLSX.utils.json_to_sheet(rows2);ws2['!cols']=[{wch:18},{wch:16},{wch:14},{wch:18}];['A1','B1','C1','D1'].forEach(ref=>{if(ws2[ref])ws2[ref].s={font:{bold:true,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'1E3A5F'}},alignment:{horizontal:'center'}};});ws2['!freeze']={xSplit:0,ySplit:1};XLSX.utils.book_append_sheet(wb,ws2,'Resumo por Usuário');
    const byMat={};orgI.forEach(i=>{if(!byMat[i.name])byMat[i.name]={material:i.name,tipo:GEM_M.has(i.name)?'Gema':'Minério',detentores:new Set(),totalQty:0,unidade:oreUnit(i.name),qualMin:9999,qualMax:0};byMat[i.name].detentores.add(i.player_name);byMat[i.name].totalQty+=parseFloat(i.quantity);if(i.quality!=null){byMat[i.name].qualMin=Math.min(byMat[i.name].qualMin,i.quality);byMat[i.name].qualMax=Math.max(byMat[i.name].qualMax,i.quality);}});
    const rows3=Object.values(byMat).sort((a,b)=>a.material.localeCompare(b.material)).map(m=>({'Material':m.material,'Tipo':m.tipo,'Detentores':m.detentores.size,'Quantidade Total':m.unidade==='UND'?Math.round(m.totalQty):parseFloat(m.totalQty.toFixed(3)),'Unidade':m.unidade,'Qualidade Mín':m.qualMin===9999?'':m.qualMin,'Qualidade Máx':m.qualMax===0?'':m.qualMax}));
    const ws3=XLSX.utils.json_to_sheet(rows3);ws3['!cols']=[{wch:22},{wch:14},{wch:12},{wch:16},{wch:10},{wch:14},{wch:14}];['A1','B1','C1','D1','E1','F1','G1'].forEach(ref=>{if(ws3[ref])ws3[ref].s={font:{bold:true,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'1E3A5F'}},alignment:{horizontal:'center'}};});ws3['!freeze']={xSplit:0,ySplit:1};XLSX.utils.book_append_sheet(wb,ws3,'Resumo por Material');
    const fname=`ShadowGuardians_Stock_${date.replace(/\//g,'-')}.xlsx`;
    XLSX.writeFile(wb,fname,{bookType:'xlsx',cellStyles:true});
    toast('Excel exportado com sucesso!','ok');
  }catch(err){toast('Erro ao gerar Excel: '+err.message,'err');console.error(err);}
  finally{btn.disabled=false;btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> Excel (.xlsx)';}
}
async function exportJSON(){
  try{const r=await fetch('/api/items?org=1');const d=await r.json();orgI=d.items||[];}catch{return toast('Erro ao carregar dados.','err');}
  if(!orgI.length)return toast('Sem dados para exportar.','err');
  const date=new Date().toLocaleDateString('pt-PT');
  const data={exportedAt:new Date().toISOString(),exportedBy:cUser,totalRecords:orgI.length,members:[...new Set(orgI.map(i=>i.player_name))].sort(),items:orgI.map(i=>({id:i.id,player:i.player_name,name:i.name,type:GEM_M.has(i.name)?'gem':'mineral',quantity:GEM_M.has(i.name)?Math.round(parseFloat(i.quantity)):parseFloat(i.quantity),unit:oreUnit(i.name),quality:i.quality??null,location:i.location||null})).sort((a,b)=>a.player.localeCompare(b.player)||a.name.localeCompare(b.name))};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`ShadowGuardians_Stock_${date.replace(/\//g,'-')}.json`;a.click();URL.revokeObjectURL(a.href);
  toast('JSON exportado com sucesso!','ok');
}
