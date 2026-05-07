// ── QUAL CONFIG ───────────────────────────────────────────────────────────
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

let cUser='',myI=[],orgI=[],allUsers=[],customLocs=[],view='inv',tab='all',saidaId=null;
const ADMINS=new Set(['lpOpOvl']);
let adminExtra=new Set();
function isAdmin(){return ADMINS.has(cUser)||adminExtra.has(cUser);}
function checkAdminUI(){
  const show=isAdmin();
  document.getElementById('nav-admin').style.display=show?'flex':'none';
  if(show){
    const av=document.getElementById('uAv');
    const nb=document.getElementById('uName');
    if(!document.getElementById('adminBadge')){
      const b=document.createElement('span');b.id='adminBadge';b.className='badge-admin';b.textContent='ADM';
      nb.parentNode.insertBefore(b,nb.nextSibling);
    }
  }
}

// ── AUTO LOGIN ───────────────────────────────────────────────────────────
(async function autoLogin(){
  const saved=localStorage.getItem('sg_user');
  if(saved){cUser=saved;try{await loadData();return;}catch{localStorage.removeItem('sg_user');}}
})();

// ── AUTH ──────────────────────────────────────────────────────────────────
function showAuth(t){
  const saved=localStorage.getItem('sg_user');
  if(saved&&document.getElementById('lU'))document.getElementById('lU').value=saved;
  document.getElementById('fL').style.display=t==='l'?'block':'none';
  document.getElementById('fR').style.display=t==='r'?'block':'none';
  document.getElementById('tabL').classList.toggle('active',t==='l');
  document.getElementById('tabR').classList.toggle('active',t==='r');
}
async function doLogin(){
  const u=document.getElementById('lU').value.trim(),p=document.getElementById('lP').value;
  if(!u||!p)return toast('Preenche todos os campos.','err');
  try{const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})});const d=await r.json();if(!r.ok)return toast(d.error||'Erro.','err');cUser=d.player.username;localStorage.setItem('sg_user',cUser);await loadData();}catch{toast('Erro de ligação.','err');}
}
async function doRegister(){
  const u=document.getElementById('rU').value.trim(),p=document.getElementById('rP').value,p2=document.getElementById('rP2').value,c=document.getElementById('rC').value.trim();
  if(!u)return toast('Introduz o teu nickname.','err');
  if(p.length<4)return toast('Password mínimo 4 caracteres.','err');
  if(p!==p2)return toast('Passwords não coincidem.','err');
  if(!c)return toast('Introduz o código de convite.','err');
  try{const r=await fetch('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p,invite_code:c})});const d=await r.json();if(!r.ok)return toast(d.error||'Erro.','err');cUser=d.player.username;localStorage.setItem('sg_user',cUser);await loadData();}catch{toast('Erro de ligação.','err');}
}
document.addEventListener('keydown',e=>{
  if(e.key!=='Enter')return;
  if(document.getElementById('loginPage').style.display!=='none'){if(document.getElementById('fL').style.display!=='none')doLogin();else doRegister();}
  else if(document.getElementById('mSaida').style.display!=='none')confirmSaida();
});
function logout(){cUser='';myI=[];orgI=[];localStorage.removeItem('sg_user');document.getElementById('loginPage').style.display='flex';document.getElementById('dashPage').style.display='none';document.getElementById('lU').value='';document.getElementById('lP').value='';}

// ── LOAD ──────────────────────────────────────────────────────────────────
async function loadData(){
  try{
    const[rM,rO]=await Promise.all([fetch(`/api/items?username=${encodeURIComponent(cUser)}`),fetch('/api/items?org=1')]);
    const dM=await rM.json(),dO=await rO.json();
    myI=dM.items||[];orgI=dO.items||[];
    document.getElementById('loginPage').style.display='none';
    document.getElementById('dashPage').style.display='block';
    document.getElementById('uAv').textContent=cUser[0].toUpperCase();
    const uc=userColor(cUser);
    document.getElementById('uAv').style.background=`linear-gradient(135deg,${uc.text},${uc.border.replace('0.35','0.8').replace('0.3','0.8')})`;
    document.getElementById('uName').textContent=cUser;
    populateLocFilter();
    buildOreOptions();
    try{const ra=await fetch('/api/admins');const da=await ra.json();adminExtra=new Set(da.admins||[]);}catch{}
    checkAdminUI();
    await loadLocations();
    await renderStatsCards();
    renderCurrent();
    checkGoalBanner();
  }catch(err){toast('Erro ao carregar: '+err.message,'err');}
}

function populateLocFilter(){
  // fLoc removido — filtro de localização apenas na view da org
}

// ── VIEW SWITCH ───────────────────────────────────────────────────────────
function setView(v,el){
  view=v;
  document.querySelectorAll('.sb-item').forEach(i=>i.classList.remove('active'));
  el.classList.add('active');
  // Fechar menu admin ao mudar para outra vista
  adminMenuOpen=false;
  document.getElementById('adminSubMenu').style.display='none';
  document.getElementById('nav-admin').classList.remove('open');
  document.getElementById('adminMenuChevron').style.transform='rotate(0deg)';
  checkGoalBanner();

  const isPw=v==='pw',isOrg=v==='org',isInv=v==='inv',isHist=v==='hist',isObj=v==='obj',isObjItems=v==='objitems',isRules=v==='rules';
  document.querySelector('.page-header').style.display=(isObj||isObjItems||isRules)?'none':'';
  document.getElementById('pwPage').style.display=isPw?'block':'none';
  document.getElementById('adminPage').style.display='none';
  document.getElementById('histPage').style.display=isHist?'block':'none';
  document.getElementById('objPage').style.display=isObj?'block':'none';
  document.getElementById('objitemsPage').style.display=isObjItems?'block':'none';
  document.getElementById('rulesPage').style.display=isRules?'block':'none';
  document.getElementById('statsRow').style.display=(isPw||isHist||isObj||isObjItems||isRules)?'none':'grid';
  document.getElementById('filterRow').style.display='none';
  document.getElementById('filterRowOrg').style.display=isOrg?'flex':'none';
  document.getElementById('addBtnRow').style.display=isInv?'flex':'none';
  document.getElementById('addPanel').style.display='none';
  document.getElementById('tblWrapInv').style.display=isInv?'block':'none';
  document.getElementById('tblWrapOrg').style.display=isOrg?'block':'none';
  if(isPw){
    document.getElementById('tbTitle').textContent='Alterar Password';
    document.getElementById('pgTitle').textContent='Alterar Password';
    document.getElementById('pgSub').textContent='Actualiza a tua password de acesso';
    ['pwC','pwA','pwN','pwN2'].forEach(id=>document.getElementById(id).value='');
  }else if(isHist){
    document.getElementById('tbTitle').textContent='Histórico';
    document.getElementById('pgTitle').textContent='Histórico de Transações';
    document.getElementById('pgSub').textContent='Registo de todas as entradas e saídas de stock';
    renderHist();
  }else if(isObj){
    document.getElementById('tbTitle').textContent='Objetivos Minérios';
    document.getElementById('pgTitle').textContent='Objetivos Minérios';
    document.getElementById('pgSub').textContent='Minérios e gemas que a org está a priorizar';
    renderObj();
  }else if(isObjItems){
    document.getElementById('tbTitle').textContent='Objetivos Itens';
    document.getElementById('pgTitle').textContent='Objetivos Itens';
    document.getElementById('pgSub').textContent='Itens de equipamento que a org está a priorizar';
    renderObjItems();
  }else if(isRules){
    document.getElementById('tbTitle').textContent='Regras';
    renderRulesPage();
  }else{
    document.getElementById('tbTitle').textContent=isInv?'Stock para Org':'Stock da Org';
    document.getElementById('pgTitle').textContent=isInv?'Stock para Org':'Stock da Org';
    document.getElementById('pgSub').textContent=isInv?'Os teus minérios registados':'Stock agregado de toda a organização';
    renderCurrent();
  }
}
function switchTab(t){tab=t;document.getElementById('tab-all').classList.toggle('active',t==='all');document.getElementById('tab-mine').classList.toggle('active',t==='mine');renderCurrent();}
function renderCurrent(){if(view==='inv')renderMine();else if(view==='org')renderOrg();}

// ── MINE VIEW ─────────────────────────────────────────────────────────────
function setStat(id,val){const el=document.getElementById(id);if(el)el.textContent=val;}
function renderMine(){
  const ft=document.getElementById('fType').value;
  let items=myI.filter(i=>{
    if(ft==='ship'&&!SHIP_M.has(i.name))return false;
    if(ft==='roc'&&!ROC_M.has(i.name))return false;
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
    const pct=item.quality!=null?Math.round((item.quality-cfg.min)/(cfg.max-cfg.min)*100):0;
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
    </tr>`}).join('');
  document.getElementById('tblContainerInv').innerHTML=`<table style="table-layout:auto;"><thead><tr><th>Minério</th><th>Localização</th><th>Tipo</th><th class="r">Quantidade</th><th class="r">Qualidade</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
}

// ── ORG VIEW ──────────────────────────────────────────────────────────────
function renderOrg(){
  const s=document.getElementById('fSearchOrg').value.toLowerCase();
  const ft=document.getElementById('fTypeOrg').value;
  const fl=document.getElementById('fLocOrg').value;
  // populate location dropdown from org data
  const allLocs=[...new Set(orgI.map(i=>i.location).filter(Boolean))].sort();
  const locSel=document.getElementById('fLocOrg');
  const curLoc=locSel.value;
  locSel.innerHTML='<option value="">Todas as localizações</option>'+allLocs.map(l=>`<option${l===curLoc?' selected':''}>${esc(l)}</option>`).join('');
  const grouped={};
  orgI.forEach(item=>{
    if(s&&!item.name.toLowerCase().includes(s)&&!(item.player_name||'').toLowerCase().includes(s))return;
    if(ft==='ship'&&!SHIP_M.has(item.name))return;
    if(ft==='roc'&&!ROC_M.has(item.name))return;
    if(ft==='gem'&&!GEM_M.has(item.name))return;
    if(fl&&item.location!==fl)return;
    if(!grouped[item.name])grouped[item.name]={name:item.name,entries:[]};
    // Juntar entradas do mesmo user + qualidade + localização
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
  const rows=groups.map(g=>{
    const sid='os_'+g.name.replace(/[^a-z0-9]/gi,'_');
    const eid='oe_'+g.name.replace(/[^a-z0-9]/gi,'_');
    const tQ=g.entries[0].quality,bQ=g.entries[g.entries.length-1].quality;
    const qr=tQ!=null?(tQ===bQ?`Q: ${tQ}`:`Q: ${bQ}–${tQ}`):'';
    const mem=new Set(g.entries.map(e=>e.player_name)).size;
    const tot=g.entries.reduce((a,e)=>a+parseFloat(e.quantity||0),0);
    const ic=oreIcon(g.name);
    const[bc,bl]=oreBadge(g.name);
    // Sub-rows inserted directly into main tbody for perfect column alignment
    const subs=g.entries.map((m,idx)=>{
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
        <td style="border-bottom:1px solid rgba(255,255,255,0.04);text-align:right;"></td>
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



// ── ADD ───────────────────────────────────────────────────────────────────
function toggleAdd(){const p=document.getElementById('addPanel');p.style.display=p.style.display==='block'?'none':'block';if(p.style.display==='block'){updateQR();document.getElementById('iQty').focus();}}
function updateQR(){
  const n=document.getElementById('iOre').value;
  const h=document.getElementById('qh');
  h.textContent='900–1000 obrigatório';
  h.className='qhint warn';
  const qi=document.getElementById('iQual');qi.min=900;qi.max=1000;qi.placeholder='900–1000';
  const isGem=GEM_M.has(n);
  document.getElementById('iQtyLabel').textContent=isGem?'Quantidade (UND)':'Quantidade (SCUs)';
  document.getElementById('iQty').step=isGem?'1':'0.001';
  document.getElementById('iQty').min=isGem?'1':'0.001';
}
async function addItem(){
  const n=document.getElementById('iOre').value,qty=parseFloat(document.getElementById('iQty').value)||0;
  const qs=document.getElementById('iQual').value,loc=document.getElementById('iLoc').value,notes='';
  const isGemAdd=GEM_M.has(n);if(isGemAdd?qty<1:qty<0.001)return toast(isGemAdd?'Quantidade mínima: 1 UND.':'Quantidade mínima: 0.001 SCUs.','err');
  const q=qs!==''?parseInt(qs):null;
  if(q===null||isNaN(q)||q<900||q>1000)return toast('Qualidade obrigatória entre 900 e 1000.','err');
  try{
    const r=await fetch('/api/items',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:cUser,name:n,quantity:qty,quality:q,location:loc,notes})});
    if(!r.ok){const d=await r.json();return toast(d.error||'Erro.','err');}
    regEntrada(cUser,n,qty,q,loc);
    toast('Item adicionado.','ok');document.getElementById('addPanel').style.display='none';
    ['iQty','iQual'].forEach(id=>document.getElementById(id).value='');document.getElementById('iLoc').value='';
    await loadData();
  }catch{toast('Erro ao adicionar.','err');}
}

// ── SAÍDA ─────────────────────────────────────────────────────────────────
let saidaType='craft';
function setSaidaType(t){
  saidaType=t;
  document.getElementById('stypeCraft').classList.toggle('active',t==='craft');
  document.getElementById('stypeTransfer').classList.toggle('active',t==='transfer');
  document.getElementById('mTransferTo').style.display=t==='transfer'?'block':'none';
}
async function openSaida(id){
  const item=myI.find(i=>i.id===id);if(!item)return;
  const unit=oreUnit(item.name);
  const isGem=unit==='UND';
  saidaId=id;
  document.getElementById('mName').textContent=item.name;
  document.getElementById('mStock').textContent=`Stock atual: ${isGem?Math.round(item.quantity):fQ(item.quantity)} ${unit}`;
  document.getElementById('mQtyLabel').textContent=`Quantidade (${unit})`;
  document.getElementById('mQty').step=isGem?'1':'0.001';
  document.getElementById('mQty').min=isGem?'1':'0.001';
  document.getElementById('mQty').value='';
  // Reset to craft mode
  setSaidaType('craft');
  // Populate destination users (everyone except self) — fetch if not yet loaded
  if(!allUsers.length){try{const r=await fetch('/api/users');if(r.ok){const d=await r.json();allUsers=d.users||[];}}catch{}}
  const destSel=document.getElementById('mDestUser');
  destSel.innerHTML=allUsers.filter(u=>u.username!==cUser).map(u=>`<option value="${esc(u.username)}">${esc(u.username)}</option>`).join('');
  document.getElementById('mSaida').style.display='flex';
  setTimeout(()=>document.getElementById('mQty').focus(),50);
}
async function confirmSaida(){
  const item=myI.find(i=>i.id===saidaId);if(!item)return;
  const s=parseFloat(document.getElementById('mQty').value)||0;
  const unit=oreUnit(item.name);
  const isGem=unit==='UND';
  if(isGem?s<1:s<0.001)return toast('Quantidade inválida.','err');
  const n=parseFloat(item.quantity)-s;
  if(n<0)return toast(`Stock insuficiente. Tens ${isGem?Math.round(item.quantity):fQ(item.quantity)} ${unit}.`,'err');
  document.getElementById('mSaida').style.display='none';

  if(saidaType==='transfer'){
    const dest=document.getElementById('mDestUser').value;
    if(!dest)return toast('Seleciona o destinatário.','err');
    // Remove from my inventory
    if(n<0.001){await fetch(`/api/items?id=${item.id}`,{method:'DELETE'});}
    else{await fetch('/api/items',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:item.id,name:item.name,quantity:n,quality:item.quality,location:item.location,notes:item.notes})});}
    // Add to destination inventory
    await fetch('/api/items',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:dest,name:item.name,quantity:s,quality:item.quality,location:item.location,notes:''})});
    // Record transaction
    fetch('/api/transactions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:cUser,item_name:item.name,quantity:s,unit,quality:item.quality,location:item.location,quantity_before:parseFloat(item.quantity),quantity_after:n<0.001?0:n,type:'transfer',to_player:dest})});
    toast(`${isGem?Math.round(s):fQ(s)} ${unit} de ${item.name} transferido para ${dest}.`,'ok');
  } else {
    // Crafting/consumo
    fetch('/api/transactions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:cUser,item_name:item.name,quantity:s,unit,quality:item.quality,location:item.location,quantity_before:parseFloat(item.quantity),quantity_after:n<0.001?0:n,type:'craft',to_player:null})});
    if(n<0.001){await fetch(`/api/items?id=${item.id}`,{method:'DELETE'});toast(`${item.name} esgotado e removido.`,'ok');}
    else{await fetch('/api/items',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:item.id,name:item.name,quantity:n,quality:item.quality,location:item.location,notes:item.notes})});toast(`Saída de ${isGem?Math.round(s):fQ(s)} ${unit}. Restam ${isGem?Math.round(n):fQ(n)} ${unit}.`,'ok');}
  }
  await loadData();
}

// ── EDIT ──────────────────────────────────────────────────────────────────
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
  try{await fetch('/api/items',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,name:item.name,quantity:item.quantity,quality:item.quality,location:loc,notes:item.notes})});toast('Localização atualizada.','ok');await loadData();}
  catch{toast('Erro.','err');}
}

// ── DELETE ────────────────────────────────────────────────────────────────
async function delItem(id){if(!confirm('Remover este item?'))return;try{await fetch(`/api/items?id=${id}`,{method:'DELETE'});toast('Removido.','ok');await loadData();}catch{toast('Erro.','err');}}

// ── ALTERAR PASS ──────────────────────────────────────────────────────────
async function alterarPass(){
  const c=document.getElementById('pwC').value.trim(),a=document.getElementById('pwA').value,n=document.getElementById('pwN').value,n2=document.getElementById('pwN2').value;
  if(!c)return toast('Introduz o código de convite.','err');
  if(!a)return toast('Introduz a password atual.','err');
  if(n.length<4)return toast('Nova password mínimo 4 caracteres.','err');
  if(n!==n2)return toast('Passwords não coincidem.','err');
  try{const r=await fetch('/api/change-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:cUser,currentPassword:a,newPassword:n,invite_code:c})});const d=await r.json();if(!r.ok)return toast(d.error||'Erro.','err');toast('Password alterada!','ok');['pwC','pwA','pwN','pwN2'].forEach(id=>document.getElementById(id).value='');}
  catch{toast('Erro.','err');}
}

// ── ADMIN ─────────────────────────────────────────────────────────────────
async function renderAdmin(){
  try{
    const [ru,ra]=await Promise.all([fetch('/api/users'),fetch('/api/admins')]);
    if(ru.ok){const d=await ru.json();allUsers=d.users||[];}
    if(ra.ok){const d=await ra.json();adminExtra=new Set(d.admins||[]);}
  }catch{}
  await loadLocations();
  ADMIN_SECTIONS.forEach(s=>{const e=document.getElementById('asec-'+s);if(e)e.style.display=s===activeAdminSection?'block':'none';});
  renderAdminUsers();
  renderAdminUserSelects();
  renderAdminCatalog();
  renderAdminLocs();
  renderAdminObj();
  if(activeAdminSection==='objitems')renderAdminObjItems();
  if(activeAdminSection==='rules')renderAdminRules();
  updateAdminQR();
}

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

function renderAdminUserSelects(){
  const opts=allUsers.map(u=>`<option value="${esc(u.username)}">${esc(u.username)}</option>`).join('');
  document.getElementById('aUser').innerHTML=opts;
  document.getElementById('aSaidaUser').innerHTML=opts;
  loadAdminSaidaItems();
}

function renderAdminLocs(){
  const el=document.getElementById('adminLocList');
  const cg=document.getElementById('aLocCustom');
  if(!customLocs.length){el.innerHTML='<div style="color:var(--muted);font-size:0.85rem;">Nenhuma localização personalizada.</div>';cg.innerHTML='';return;}
  cg.innerHTML=customLocs.map(l=>`<option>${esc(l)}</option>`).join('');
  el.innerHTML=customLocs.map((l,i)=>`<div class="admin-loc-row">
    <div class="admin-loc-name" id="locname-${i}">${esc(l)}</div>
    <div class="admin-loc-edit" id="locedit-${i}" style="display:none;"><input type="text" value="${esc(l)}" id="locinput-${i}"></div>
    <div style="display:flex;gap:4px;">
      <button class="btn btn-outline btn-sm" id="loceditbtn-${i}" onclick="adminEditLocToggle(${i})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></button>
      <button class="btn btn-success btn-sm" id="locsavebtn-${i}" style="display:none;" onclick="adminSaveLoc(${i})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg></button>
      <button class="btn btn-danger btn-sm" onclick="adminDelLoc(${i})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg></button>
    </div>
  </div>`).join('');
}

function adminEditLocToggle(i){
  document.getElementById('locname-'+i).style.display='none';
  document.getElementById('locedit-'+i).style.display='block';
  document.getElementById('loceditbtn-'+i).style.display='none';
  document.getElementById('locsavebtn-'+i).style.display='';
  document.getElementById('locinput-'+i).focus();
}
function adminSaveLoc(i){
  const v=document.getElementById('locinput-'+i).value.trim();
  if(!v)return toast('Nome inválido.','err');
  customLocs[i]=v;
  localStorage.setItem('sg_custom_locs',JSON.stringify(customLocs));
  renderAdminLocs();
  toast('Localização atualizada.','ok');
}
function buildLocName(){
  const name=document.getElementById('newLocName').value.trim();
  const system=document.getElementById('newLocSystem').value;
  const type=document.getElementById('newLocType').value;
  if(!name)return '';
  if(system==='Outro')return name;
  return `${name} (${type}, ${system})`;
}
function updateLocType(){
  const system=document.getElementById('newLocSystem').value;
  const typeEl=document.getElementById('newLocType');
  // suggest sensible defaults per system
  const opts={
    'Stanton':['Cidade','Estação Orbital','Lua','Estação','Outro'],
    'Pyro':['Estação','Cidade','Outro'],
    'Nyx':['Estação','Outro'],
    'Outro':['Cidade','Estação Orbital','Lua','Estação','Outro'],
  };
  const cur=typeEl.value;
  typeEl.innerHTML=(opts[system]||opts['Outro']).map(o=>`<option${o===cur?' selected':''}>${o}</option>`).join('');
  updateLocPreview();
}
function updateLocPreview(){
  const n=buildLocName();
  const prev=document.getElementById('newLocPreview');
  const txt=document.getElementById('newLocPreviewText');
  if(n){prev.style.display='block';txt.textContent=n;}
  else{prev.style.display='none';}
}
function adminAddLoc(){
  const v=buildLocName();
  if(!v)return toast('Introduz o nome da localização.','err');
  if(customLocs.includes(v))return toast('Localização já existe.','err');
  customLocs.push(v);
  localStorage.setItem('sg_custom_locs',JSON.stringify(customLocs));
  document.getElementById('newLocName').value='';
  document.getElementById('newLocPreview').style.display='none';
  renderAdminLocs();
  toast(`"${v}" adicionada.`,'ok');
}
function adminDelLoc(i){
  if(!confirm(`Remover localização "${customLocs[i]}"?`))return;
  customLocs.splice(i,1);
  localStorage.setItem('sg_custom_locs',JSON.stringify(customLocs));
  renderAdminLocs();
  toast('Localização removida.','ok');
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
  const idx=list.indexOf(oldName);
  if(idx===-1)return;
  if(list.includes(newName)&&newName!==oldName)return toast('Este nome já existe.','err');
  list[idx]=newName;
  localStorage.setItem(type==='ship'?'sg_ship_list':'sg_gem_list',JSON.stringify(list));
  refreshOreSets();
  buildOreOptions();
  renderAdminCatalog();
  toast(`"${oldName}" renomeado para "${newName}".`,'ok');
}
function adminCatDel(type,name){
  if(!confirm(`Apagar "${name}" do catálogo?`))return;
  const list=type==='ship'?SHIP_LIST:GEM_LIST;
  const idx=list.indexOf(name);
  if(idx===-1)return;
  list.splice(idx,1);
  localStorage.setItem(type==='ship'?'sg_ship_list':'sg_gem_list',JSON.stringify(list));
  refreshOreSets();
  buildOreOptions();
  renderAdminCatalog();
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
  refreshOreSets();
  buildOreOptions();
  renderAdminCatalog();
  document.getElementById(inputId).value='';
  toast(`"${n}" adicionado.`,'ok');
}

// Admin grant/revoke
async function adminGrantAdmin(u){
  try{
    const r=await fetch('/api/admins',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u})});
    if(!r.ok){const d=await r.json();return toast(d.error||'Erro.','err');}
    adminExtra.add(u);
    renderAdminUsers();
    toast(`${u} agora é administrador.`,'ok');
  }catch{toast('Erro ao atribuir admin.','err');}
}
async function adminRevokeAdmin(u){
  try{
    const r=await fetch(`/api/admins?username=${encodeURIComponent(u)}`,{method:'DELETE'});
    if(!r.ok){const d=await r.json();return toast(d.error||'Erro.','err');}
    adminExtra.delete(u);
    renderAdminUsers();
    toast(`Permissões de ${u} removidas.`,'ok');
  }catch{toast('Erro ao revogar admin.','err');}
}
async function adminDelUser(u){
  if(!confirm(`Remover usuário "${u}"? Esta acção é irreversível.`))return;
  try{
    const r=await fetch(`/api/users?username=${encodeURIComponent(u)}`,{method:'DELETE'});
    if(!r.ok){const d=await r.json();return toast(d.error||'Erro.','err');}
    toast(`${u} removido.`,'ok');
    await renderAdmin();
  }catch{toast('Erro ao remover usuário.','err');}
}

function updateAdminQR(){
  const n=document.getElementById('aOre').value;
  const h=document.getElementById('aQh');
  h.textContent='900–1000 obrigatório';h.className='qhint warn';
  const qi=document.getElementById('aQual');qi.min=900;qi.max=1000;qi.placeholder='900–1000';
  const isGem=GEM_M.has(n);
  document.getElementById('aQtyLabel').textContent=isGem?'Quantidade (UND)':'Quantidade (SCUs)';
  document.getElementById('aQty').step=isGem?'1':'0.001';
  document.getElementById('aQty').min=isGem?'1':'0.001';
}

async function adminAddItem(){
  const username=document.getElementById('aUser').value;
  const n=document.getElementById('aOre').value;
  const qty=parseFloat(document.getElementById('aQty').value)||0;
  const qs=document.getElementById('aQual').value;
  const loc=document.getElementById('aLoc').value;
  if(qty<0.001)return toast('Quantidade mínima: 0.001.','err');
  const q=qs!==''?parseInt(qs):null;
  if(q===null||isNaN(q)||q<900||q>1000)return toast('Qualidade obrigatória entre 900 e 1000.','err');
  try{
    const r=await fetch('/api/items',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,name:n,quantity:qty,quality:q,location:loc,notes:''})});
    if(!r.ok){const d=await r.json();return toast(d.error||'Erro.','err');}
    regEntrada(username,n,qty,q,loc);
    toast(`Item adicionado a ${username}.`,'ok');
    document.getElementById('aQty').value='';document.getElementById('aQual').value='';
    await loadData();
  }catch{toast('Erro ao adicionar.','err');}
}

function loadAdminSaidaItems(){
  const u=document.getElementById('aSaidaUser').value;
  const items=orgI.filter(i=>i.player_name===u);
  const sel=document.getElementById('aSaidaItem');
  sel.innerHTML=items.length?items.map(i=>`<option value="${i.id}">${esc(i.name)} — ${GEM_M.has(i.name)?Math.round(i.quantity):fQ(i.quantity)} ${oreUnit(i.name)}</option>`).join(''):'<option value="">Sem itens</option>';
  fillAdminSaidaQty();
}
function fillAdminSaidaQty(){
  const id=parseInt(document.getElementById('aSaidaItem').value);
  const item=orgI.find(i=>i.id===id);
  const unit=item?oreUnit(item.name):'SCU';
  document.getElementById('aSaidaQtyLabel').textContent=`Quantidade (${unit})`;
  document.getElementById('aSaidaQty').step=unit==='UND'?'1':'0.001';
  document.getElementById('aSaidaQty').min=unit==='UND'?'1':'0.001';
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
  await loadData();
  loadAdminSaidaItems();
}

// ── EXPORT XLSX ───────────────────────────────────────────────────────────
async function exportXLSX(){
  const btn=document.getElementById('btnExport');
  btn.textContent='A carregar dados...';btn.disabled=true;
  // Always fetch fresh data before export
  try{
    const r=await fetch('/api/items?org=1');
    const d=await r.json();
    orgI=d.items||[];
  }catch{toast('Erro ao carregar dados.','err');btn.disabled=false;return;}
  btn.textContent='A gerar...';
  // Load SheetJS from CDN dynamically
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
    const rows=orgI.map(i=>({
      'Usuário': i.player_name,
      'Material': i.name,
      'Tipo': GEM_M.has(i.name)?'Gema':'Minério',
      'Quantidade': GEM_M.has(i.name)?Math.round(parseFloat(i.quantity)):parseFloat(i.quantity),
      'Unidade': oreUnit(i.name),
      'Qualidade': i.quality!=null?i.quality:'',
      'Localização': i.location||'',
    })).sort((a,b)=>a['Usuário'].localeCompare(b['Usuário'])||a['Material'].localeCompare(b['Material']));

    if(!rows.length){toast('Sem dados para exportar.','err');btn.disabled=false;return;}

    const wb=XLSX.utils.book_new();

    // ── Sheet 1: Todos os materiais ──
    const ws1=XLSX.utils.json_to_sheet(rows);
    // Column widths
    ws1['!cols']=[{wch:18},{wch:22},{wch:14},{wch:14},{wch:10},{wch:12},{wch:30}];
    // Header style (bold + background) — via cell format
    const hdr=['A1','B1','C1','D1','E1','F1','G1'];
    hdr.forEach(ref=>{
      if(ws1[ref]){
        ws1[ref].s={
          font:{bold:true,color:{rgb:'FFFFFF'}},
          fill:{fgColor:{rgb:'1E3A5F'}},
          alignment:{horizontal:'center'},
          border:{bottom:{style:'medium',color:{rgb:'3B82F6'}}}
        };
      }
    });
    // Freeze header row
    ws1['!freeze']={xSplit:0,ySplit:1};
    XLSX.utils.book_append_sheet(wb,ws1,'Todos os Materiais');

    // ── Sheet 2: Resumo por usuário ──
    const byUser={};
    orgI.forEach(i=>{
      if(!byUser[i.player_name])byUser[i.player_name]={usuário:i.player_name,itens:0,totalSCU:0,totalUND:0};
      byUser[i.player_name].itens++;
      if(GEM_M.has(i.name))byUser[i.player_name].totalUND+=Math.round(parseFloat(i.quantity));
      else byUser[i.player_name].totalSCU+=parseFloat(i.quantity);
    });
    const rows2=Object.values(byUser).sort((a,b)=>a.usuário.localeCompare(b.usuário)).map(u=>({
      'Usuário': u.usuário,
      'Nº de Registos': u.itens,
      'Total SCUs': parseFloat(u.totalSCU.toFixed(3)),
      'Total UND (Gemas)': u.totalUND,
    }));
    const ws2=XLSX.utils.json_to_sheet(rows2);
    ws2['!cols']=[{wch:18},{wch:16},{wch:14},{wch:18}];
    ['A1','B1','C1','D1'].forEach(ref=>{
      if(ws2[ref])ws2[ref].s={font:{bold:true,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'1E3A5F'}},alignment:{horizontal:'center'}};
    });
    ws2['!freeze']={xSplit:0,ySplit:1};
    XLSX.utils.book_append_sheet(wb,ws2,'Resumo por Usuário');

    // ── Sheet 3: Resumo por material ──
    const byMat={};
    orgI.forEach(i=>{
      if(!byMat[i.name])byMat[i.name]={material:i.name,tipo:GEM_M.has(i.name)?'Gema':'Minério',detentores:new Set(),totalQty:0,unidade:oreUnit(i.name),qualMin:9999,qualMax:0};
      byMat[i.name].detentores.add(i.player_name);
      byMat[i.name].totalQty+=parseFloat(i.quantity);
      if(i.quality!=null){byMat[i.name].qualMin=Math.min(byMat[i.name].qualMin,i.quality);byMat[i.name].qualMax=Math.max(byMat[i.name].qualMax,i.quality);}
    });
    const rows3=Object.values(byMat).sort((a,b)=>a.material.localeCompare(b.material)).map(m=>({
      'Material': m.material,
      'Tipo': m.tipo,
      'Detentores': m.detentores.size,
      'Quantidade Total': m.unidade==='UND'?Math.round(m.totalQty):parseFloat(m.totalQty.toFixed(3)),
      'Unidade': m.unidade,
      'Qualidade Mín': m.qualMin===9999?'':m.qualMin,
      'Qualidade Máx': m.qualMax===0?'':m.qualMax,
    }));
    const ws3=XLSX.utils.json_to_sheet(rows3);
    ws3['!cols']=[{wch:22},{wch:14},{wch:12},{wch:16},{wch:10},{wch:14},{wch:14}];
    ['A1','B1','C1','D1','E1','F1','G1'].forEach(ref=>{
      if(ws3[ref])ws3[ref].s={font:{bold:true,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'1E3A5F'}},alignment:{horizontal:'center'}};
    });
    ws3['!freeze']={xSplit:0,ySplit:1};
    XLSX.utils.book_append_sheet(wb,ws3,'Resumo por Material');

    // Download
    const fname=`ShadowGuardians_Stock_${date.replace(/\//g,'-')}.xlsx`;
    XLSX.writeFile(wb,fname,{bookType:'xlsx',cellStyles:true});
    toast('Excel exportado com sucesso!','ok');
  }catch(err){
    toast('Erro ao gerar Excel: '+err.message,'err');
    console.error(err);
  }finally{
    btn.disabled=false;
    btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> Exportar para Excel (.xlsx)';
  }
}

// ── EXPORT JSON ───────────────────────────────────────────────────────────
async function exportJSON(){
  // Always fetch fresh data before export
  try{
    const r=await fetch('/api/items?org=1');
    const d=await r.json();
    orgI=d.items||[];
  }catch{return toast('Erro ao carregar dados.','err');}
  if(!orgI.length)return toast('Sem dados para exportar.','err');
  const date=new Date().toLocaleDateString('pt-PT');
  const data={
    exportedAt: new Date().toISOString(),
    exportedBy: cUser,
    totalRecords: orgI.length,
    members: [...new Set(orgI.map(i=>i.player_name))].sort(),
    items: orgI.map(i=>({
      id: i.id,
      player: i.player_name,
      name: i.name,
      type: GEM_M.has(i.name)?'gem':'mineral',
      quantity: GEM_M.has(i.name)?Math.round(parseFloat(i.quantity)):parseFloat(i.quantity),
      unit: oreUnit(i.name),
      quality: i.quality??null,
      location: i.location||null,
    })).sort((a,b)=>a.player.localeCompare(b.player)||a.name.localeCompare(b.name)),
    summary: {
      byPlayer: Object.fromEntries(
        [...new Set(orgI.map(i=>i.player_name))].sort().map(p=>{
          const pi=orgI.filter(i=>i.player_name===p);
          return[p,{
            records: pi.length,
            totalSCU: parseFloat(pi.filter(i=>!GEM_M.has(i.name)).reduce((a,i)=>a+parseFloat(i.quantity),0).toFixed(3)),
            totalUND: Math.round(pi.filter(i=>GEM_M.has(i.name)).reduce((a,i)=>a+parseFloat(i.quantity),0)),
          }];
        })
      ),
      byMaterial: Object.fromEntries(
        [...new Set(orgI.map(i=>i.name))].sort().map(n=>{
          const mi=orgI.filter(i=>i.name===n);
          return[n,{
            type: GEM_M.has(n)?'gem':'mineral',
            unit: oreUnit(n),
            holders: [...new Set(mi.map(i=>i.player_name))],
            totalQuantity: GEM_M.has(n)?Math.round(mi.reduce((a,i)=>a+parseFloat(i.quantity),0)):parseFloat(mi.reduce((a,i)=>a+parseFloat(i.quantity),0).toFixed(3)),
            qualityRange: mi.some(i=>i.quality!=null)?{min:Math.min(...mi.filter(i=>i.quality!=null).map(i=>i.quality)),max:Math.max(...mi.filter(i=>i.quality!=null).map(i=>i.quality))}:null,
          }];
        })
      ),
    }
  };
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`ShadowGuardians_Stock_${date.replace(/\//g,'-')}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('JSON exportado com sucesso!','ok');
}

// ── OBJETIVOS ────────────────────────────────────────────────────────────
let objCache=[];

async function renderObj(){
  try{const r=await fetch('/api/objectives');const d=await r.json();objCache=d.objectives||[];}catch{objCache=[];}
  renderObjList();
}

async function renderAdminObj(){
  try{
    const r=await fetch('/api/objectives');
    const d=await r.json();
    objCache=d.objectives||[];
  }catch{objCache=[];}
  const objs=objCache;
  const el=document.getElementById('adminObjList');
  // populate item selects
  const shipOpts=SHIP_LIST.slice().sort().map(n=>`<option>${esc(n)}</option>`).join('');
  const gemOpts=GEM_LIST.slice().sort().map(n=>`<option>${esc(n)}</option>`).join('');
  const so=document.getElementById('newObjShipOpts');
  const go=document.getElementById('newObjGemOpts');
  if(so)so.innerHTML=shipOpts;
  if(go)go.innerHTML=gemOpts;

  if(!objs.length){el.innerHTML=`<p style="font-size:0.82rem;color:var(--muted);">Sem objetivos. Adiciona abaixo.</p>`;return;}

    const adminCatColors={'Componentes de Mineração':'#f59e0b','Armas FPS':'#f87171','Armaduras FPS':'#60a5fa','Componentes de Nave':'#a78bfa','Armas de Nave':'#34d399','Evento':'#fbbf24'};
  el.innerHTML=objs.map((o,i)=>{
    const isGem=GEM_M.has(o.item);
    const unit=isGem?'UND':'SCU';
    const hasQty=o.target_qty!=null&&parseFloat(o.target_qty)>0;
    const qtyFmt=hasQty?(isGem?Math.round(o.target_qty):parseFloat(o.target_qty).toLocaleString('pt-BR',{minimumFractionDigits:3,maximumFractionDigits:3})):null;
    const catColor=adminCatColors[o.category||'']||'#94a3b8';
    const isGemIcon=GEM_M.has(o.item);
    const iconBg=isGemIcon?'rgba(20,184,166,0.12)':'rgba(245,158,11,0.12)';
    const iconColor=isGemIcon?'#2dd4bf':'#f59e0b';
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
    </div>`;}).join('');;
}

let dragSrcIdx=null;
function objDragStart(e,i){dragSrcIdx=i;e.dataTransfer.effectAllowed='move';}
function objDragOver(e){e.preventDefault();e.dataTransfer.dropEffect='move';e.currentTarget.style.borderColor='var(--accent)';}
async function objDrop(e,i){
  e.preventDefault();e.currentTarget.style.borderColor='';
  if(dragSrcIdx===null||dragSrcIdx===i)return;
  const objs=[...objCache];
  const[moved]=objs.splice(dragSrcIdx,1);
  objs.splice(i,0,moved);
  await fetch('/api/objectives',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({order:objs.map(o=>o.id)})});
  dragSrcIdx=null;
  renderAdminObj();
}
async function adminMoveObj(i,dir){
  const objs=[...objCache];
  const ni=i+dir;
  if(ni<0||ni>=objs.length)return;
  [objs[i],objs[ni]]=[objs[ni],objs[i]];
  await fetch('/api/objectives',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({order:objs.map(o=>o.id)})});
  renderAdminObj();
}
function toggleEventoDesc(){
  const cat=document.getElementById('newObjCategory').value;
  const row=document.getElementById('eventoDescRow');
  if(row) row.style.display=cat==='Evento'?'block':'none';
  if(cat!=='Evento'){const d=document.getElementById('newObjEventoDesc');if(d)d.value='';}
}
async function adminAddObj(){
  const item=document.getElementById('newObjItem').value;
  const note=document.getElementById('newObjNote').value.trim();
  const category=document.getElementById('newObjCategory').value;
  const qtyRaw=document.getElementById('newObjQty').value;
  let target_qty=null;
  if(qtyRaw!==''&&qtyRaw!==null){const v=parseFloat(qtyRaw);if(!isNaN(v)&&v>0)target_qty=v;}
  if(!item)return toast('Seleciona um item.','err');
  try{
    const event_name=category==='Evento'?(document.getElementById('newObjEventoDesc').value.trim()||null):null;
    const r=await fetch('/api/objectives',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({item,note,category,target_qty,event_name})});
    if(!r.ok){const d=await r.json();return toast(d.error||'Erro.','err');}
    document.getElementById('newObjNote').value='Mínimo Q900';
    document.getElementById('newObjQty').value='';
    const evd=document.getElementById('newObjEventoDesc');if(evd)evd.value='';
    renderAdminObj();
    toast(`"${item}" adicionado aos objetivos.`,'ok');
  }catch{toast('Erro ao adicionar.','err');}
}
async function adminDelObj(i){
  const obj=objCache[i];if(!obj)return;
  try{
    await fetch(`/api/objectives?id=${obj.id}`,{method:'DELETE'});
    renderAdminObj();
    toast(`"${obj.item}" removido.`,'ok');
  }catch{toast('Erro ao remover.','err');}
}

// ── OBJETIVOS ITENS ───────────────────────────────────────────────────────
let objItemsCache=[];
let objItemsActiveCat=null;

const OBJ_ITEM_CATS=['Armas (FPS)','Armadura (FPS)','Armas (Veículo)','Componentes (Veículo)','Componentes (Mining)'];
const OBJ_ITEM_COLORS={'Armas (FPS)':'#f87171','Armadura (FPS)':'#60a5fa','Armas (Veículo)':'#34d399','Componentes (Veículo)':'#a78bfa','Componentes (Mining)':'#f59e0b'};

function setObjItemCat(cat){objItemsActiveCat=cat;renderObjItemsList();}

async function renderObjItems(){
  try{
    const r=await fetch('/api/objectives_items');
    const d=await r.json();
    objItemsCache=d.objectives_items||[];
  }catch{objItemsCache=[];}
  renderObjItemsList();
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
  const rankClass=i=>i===0?'r1':i===1?'r2':i===2?'r3':'rn';
  const rankLabel=i=>`${i+1}º`;

  el.innerHTML=`<div class="obj-list">${items.map(({o,i})=>{
    const catColor=OBJ_ITEM_COLORS[o.category||'']||'#94a3b8';
    const cardAccent=objItemsActiveCat==='__todos__'?catColor:accentColors[i%accentColors.length];
    const hasTarget=o.target_qty!=null&&parseFloat(o.target_qty)>0;
    const targetFmt=hasTarget?Math.round(parseFloat(o.target_qty)):null;
    // icon by category
    const catIcons={'Armas (FPS)':'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/></svg>','Armadura (FPS)':'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>','Armas (Veículo)':'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>','Componentes (Veículo)':'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>','Componentes (Mining)':'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>'};
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

async function renderAdminObjItems(){
  try{
    const r=await fetch('/api/objectives_items');
    const d=await r.json();
    objItemsCache=d.objectives_items||[];
  }catch{objItemsCache=[];}
  const objs=objItemsCache;
  const el=document.getElementById('adminObjItemsList');
  if(!el)return;
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

let objItemsDragSrcIdx=null;
function objItemsDragStart(e,i){objItemsDragSrcIdx=i;e.dataTransfer.effectAllowed='move';}
async function objItemsDrop(e,i){
  e.preventDefault();e.currentTarget.style.borderColor='';
  if(objItemsDragSrcIdx===null||objItemsDragSrcIdx===i)return;
  const objs=[...objItemsCache];
  const[moved]=objs.splice(objItemsDragSrcIdx,1);
  objs.splice(i,0,moved);
  await fetch('/api/objectives_items',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({order:objs.map(o=>o.id)})});
  objItemsDragSrcIdx=null;
  renderAdminObjItems();
}
async function adminMoveObjItem(i,dir){
  const objs=[...objItemsCache];
  const ni=i+dir;
  if(ni<0||ni>=objs.length)return;
  [objs[i],objs[ni]]=[objs[ni],objs[i]];
  await fetch('/api/objectives_items',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({order:objs.map(o=>o.id)})});
  renderAdminObjItems();
}
async function adminAddObjItem(){
  const item=document.getElementById('newObjItemName').value.trim();
  const category=document.getElementById('newObjItemCat').value;
  const note=document.getElementById('newObjItemNote').value.trim();
  const qtyRaw=document.getElementById('newObjItemQty').value;
  let target_qty=null;
  if(qtyRaw!==''&&qtyRaw!==null){const v=parseFloat(qtyRaw);if(!isNaN(v)&&v>0)target_qty=v;}
  if(!item)return toast('Escreve o nome do item.','err');
  try{
    const r=await fetch('/api/objectives_items',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({item,note,category,target_qty})});
    if(!r.ok){const d=await r.json();return toast(d.error||'Erro.','err');}
    document.getElementById('newObjItemName').value='';
    document.getElementById('newObjItemNote').value='';
    document.getElementById('newObjItemQty').value='';
    renderAdminObjItems();
    toast(`"${item}" adicionado aos objetivos.`,'ok');
  }catch{toast('Erro ao adicionar.','err');}
}
async function adminDelObjItem(i){
  const obj=objItemsCache[i];if(!obj)return;
  try{
    await fetch(`/api/objectives_items?id=${obj.id}`,{method:'DELETE'});
    renderAdminObjItems();
    toast(`"${obj.item}" removido.`,'ok');
  }catch{toast('Erro ao remover.','err');}
}

// ── REGRAS ───────────────────────────────────────────────────────────────
let rulesCache=[];

async function loadRules(){
  try{const r=await fetch('/api/rules');const d=await r.json();rulesCache=d.rules||[];}catch{rulesCache=[];}
}

async function renderRulesPage(){
  await loadRules();
  const el=document.getElementById('rulesContainer');
  if(!el)return;
  const TAG_LABELS={'warn':'Aviso','info':'Info','danger':'Importante','success':'OK / Permitido'};
  if(!rulesCache.length){
    el.innerHTML=`<div class="rule-empty"><svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin:0 auto 14px;display:block;color:var(--muted2);"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>Sem regras definidas ainda.</div>`;
    return;
  }
  el.innerHTML=`<div class="rules-list">${rulesCache.map((r,i)=>`
    <div class="rule-card">
      <div class="rule-num">${i+1}</div>
      <div class="rule-body">
        <div class="rule-title">${esc(r.title)}</div>
        ${r.description?`<div class="rule-desc">${escNl(r.description)}</div>`:''}
        ${r.tag?`<span class="rule-tag ${esc(r.tag)}">${esc(TAG_LABELS[r.tag]||r.tag)}</span>`:''}
      </div>
    </div>`).join('')}
  </div>`;
}

async function renderAdminRules(){
  await loadRules();
  const el=document.getElementById('adminRulesList');
  if(!el)return;
  if(!rulesCache.length){el.innerHTML=`<p style="font-size:0.88rem;color:var(--muted);">Sem regras. Adiciona abaixo.</p>`;return;}
  const TAG_LABELS={'warn':'Aviso','info':'Info','danger':'Importante','success':'OK / Permitido'};
  el.innerHTML=rulesCache.map((r,i)=>`
    <div id="ruleRow-${i}" style="margin-bottom:10px;">
      <!-- VIEW MODE -->
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
      <!-- EDIT MODE (oculto por defeito) -->
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
          <select id="ruleEditG-${i}" style="height:36px;padding:0 10px;background:var(--bg2);border:1px solid var(--border2);border-radius:var(--r-sm);color:var(--text);font-family:'Inter',sans-serif;font-size:0.85rem;outline:none;appearance:none;background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\");background-repeat:no-repeat;background-position:right 10px center;padding-right:30px;width:200px;">
            <option value="" ${!r.tag?'selected':''}>— Sem etiqueta —</option>
            <option value="info" ${r.tag==='info'?'selected':''}>Info</option>
            <option value="warn" ${r.tag==='warn'?'selected':''}>Aviso</option>
            <option value="danger" ${r.tag==='danger'?'selected':''}>Importante</option>
            <option value="success" ${r.tag==='success'?'selected':''}>OK / Permitido</option>
          </select>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-success btn-sm" onclick="saveRuleInline(${i},${r.id})" style="height:36px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg> Guardar
          </button>
          <button class="btn btn-outline btn-sm" onclick="cancelRuleInline(${i})" style="height:36px;">Cancelar</button>
        </div>
      </div>
    </div>`).join('');
}

function startEditRule(i){
  document.getElementById('ruleView-'+i).style.display='none';
  document.getElementById('ruleEdit-'+i).style.display='block';
  document.getElementById('ruleEditT-'+i).focus();
}
function cancelRuleInline(i){
  document.getElementById('ruleEdit-'+i).style.display='none';
  document.getElementById('ruleView-'+i).style.display='flex';
}
async function saveRuleInline(i,id){
  const title=document.getElementById('ruleEditT-'+i).value.trim();
  const description=document.getElementById('ruleEditD-'+i).value.trim();
  const tag=document.getElementById('ruleEditG-'+i).value||null;
  if(!title)return toast('O título não pode estar vazio.','err');
  try{
    const r=await fetch('/api/rules',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,title,description,tag})});
    if(!r.ok){const d=await r.json();return toast(d.error||'Erro.','err');}
    renderAdminRules();
    toast('Regra atualizada.','ok');
  }catch{toast('Erro ao guardar.','err');}
}

let ruleDragSrcIdx=null;
function ruleDragStart(e,i){ruleDragSrcIdx=i;e.dataTransfer.effectAllowed='move';}
async function ruleDrop(e,i){
  e.preventDefault();e.currentTarget.style.borderColor='';
  if(ruleDragSrcIdx===null||ruleDragSrcIdx===i)return;
  const rules=[...rulesCache];
  const[moved]=rules.splice(ruleDragSrcIdx,1);
  rules.splice(i,0,moved);
  await fetch('/api/rules',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({order:rules.map(r=>r.id)})});
  ruleDragSrcIdx=null;
  renderAdminRules();
}
async function adminMoveRule(i,dir){
  const rules=[...rulesCache];
  const ni=i+dir;
  if(ni<0||ni>=rules.length)return;
  [rules[i],rules[ni]]=[rules[ni],rules[i]];
  await fetch('/api/rules',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({order:rules.map(r=>r.id)})});
  renderAdminRules();
}
async function adminAddRule(){
  const title=document.getElementById('newRuleTitle').value.trim();
  const description=document.getElementById('newRuleDesc').value.trim();
  const tag=document.getElementById('newRuleTag').value||null;
  if(!title)return toast('Escreve o título da regra.','err');
  try{
    const r=await fetch('/api/rules',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title,description,tag})});
    if(!r.ok){const d=await r.json();return toast(d.error||'Erro.','err');}
    document.getElementById('newRuleTitle').value='';
    document.getElementById('newRuleDesc').value='';
    document.getElementById('newRuleTag').value='';
    renderAdminRules();
    toast('Regra adicionada.','ok');
  }catch{toast('Erro ao adicionar.','err');}
}
async function adminDelRule(i){
  const rule=rulesCache[i];if(!rule)return;
  if(!confirm(`Remover regra "${rule.title}"?`))return;
  try{
    await fetch(`/api/rules?id=${rule.id}`,{method:'DELETE'});
    renderAdminRules();
    toast('Regra removida.','ok');
  }catch{toast('Erro ao remover.','err');}
}

// ── HISTÓRICO ────────────────────────────────────────────────────────────
async function renderHist(){
  try{const r=await fetch('/api/transactions');const d=await r.json();histData=d.transactions||[];}catch{histData=[];}
  const search=(document.getElementById('histSearch')?.value||'').toLowerCase();
  const filtered=histData.filter(t=>{
    if(search&&!t.player_name.toLowerCase().includes(search)&&!t.item_name.toLowerCase().includes(search))return false;
    if(histTab==='entrada')return t.type==='entrada';
    if(histTab==='transfer')return t.type==='transfer';
    if(histTab==='saida')return t.type!=='entrada'&&t.type!=='transfer';
    return true;
  });
  document.getElementById('histCount').textContent=filtered.length+' registo'+(filtered.length!==1?'s':'');
  if(!filtered.length){document.getElementById('histContainer').innerHTML=`<div class="empty"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><p>Sem transações registadas ainda.</p></div>`;return;}
  const rows=filtered.map(t=>{
    const isGem=GEM_M.has(t.item_name);
    const qty=isGem?Math.round(t.quantity):fQ(t.quantity);
    const unit=t.unit||'SCU';
    const before=t.quantity_before!=null?(isGem?Math.round(t.quantity_before):fQ(t.quantity_before)):null;
    const after=t.quantity_after!=null?(isGem?Math.round(t.quantity_after):fQ(t.quantity_after)):null;
    const date=new Date(t.created_at);
    const dateStr=date.toLocaleDateString('pt-PT',{day:'2-digit',month:'2-digit',year:'numeric'});
    const timeStr=date.toLocaleTimeString('pt-PT',{hour:'2-digit',minute:'2-digit'});
    const isEntrada=t.type==='entrada';
    const isTransfer=t.type==='transfer';
    const isAdminAction=t.type==='adm_remove'||(t.type==='craft'&&t.notes&&t.notes.startsWith('[ADM:'));
    const adminMatch=isAdminAction&&t.notes&&t.notes.match(/^\[ADM:\s*(.+?)\]\s*(.*)/);
    const adminUser=adminMatch?adminMatch[1]:(t.type==='adm_remove'?'ADM':'');
    const reason=adminMatch?adminMatch[2]:'';
    const typeBadge=isEntrada
      ?`<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(34,197,94,0.12);color:#22c55e;border:1px solid rgba(34,197,94,0.3);border-radius:4px;padding:2px 7px;font-size:0.7rem;font-weight:600;">↑ Entrada</span>`
      :isTransfer
        ?`<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(59,130,246,0.12);color:#60a5fa;border:1px solid rgba(59,130,246,0.25);border-radius:4px;padding:2px 7px;font-size:0.7rem;font-weight:600;">↔ Transferência</span>`
        :isAdminAction
          ?`<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(239,68,68,0.13);color:#f87171;border:1px solid rgba(239,68,68,0.35);border-radius:4px;padding:2px 7px;font-size:0.7rem;font-weight:600;">🛡 Removido pelo ADM</span>`
          :`<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(245,158,11,0.1);color:#f59e0b;border:1px solid rgba(245,158,11,0.25);border-radius:4px;padding:2px 7px;font-size:0.7rem;font-weight:600;">↓ Saída/Crafting</span>`;
    const destInfo=isTransfer&&t.to_player
      ?`<div style="font-size:0.75rem;color:var(--muted);margin-top:3px;">→ <span style="color:var(--accent2);font-weight:600;">${esc(t.to_player)}</span></div>`
      :isAdminAction
        ?`<div style="font-size:0.72rem;color:var(--muted);margin-top:3px;">por <span style="color:#f87171;font-weight:600;">${esc(adminUser)}</span>${reason?`<span style="color:var(--muted);"> · </span><span style="color:#fca5a5;font-weight:500;">${esc(reason)}</span>`:''}</div>`
        :'';
    return`<tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
      <td style="padding:12px 16px;font-size:0.82rem;color:var(--muted);">${dateStr}<br><span style="font-size:0.75rem;">${timeStr}</span></td>
      <td style="padding:12px 16px;">${playerPill(t.player_name)}</td>
      <td style="padding:12px 16px;">${typeBadge}${destInfo}</td>
      <td style="padding:12px 16px;"><div style="font-weight:600;color:var(--text);font-size:0.9rem;">${esc(t.item_name)}</div></td>
      <td style="padding:12px 16px;text-align:right;"><span style="font-size:1rem;font-weight:700;color:${isEntrada?'#22c55e':isTransfer?'#60a5fa':'#f87171'};">${isEntrada?'+':isTransfer?'':'-'}${qty}</span><span class="qty-scu">${unit}</span></td>
      <td style="padding:12px 16px;text-align:right;font-size:0.78rem;color:var(--muted);">${before!=null?`${before} → ${after}`:''}</td>
      <td style="padding:12px 16px;font-size:0.82rem;color:var(--muted);">${t.location?esc(t.location):'—'}</td>
      <td style="padding:12px 16px;text-align:right;font-size:0.82rem;color:var(--accent2);">${t.quality!=null?'Q: '+t.quality:''}</td>
    </tr>`;
  }).join('');
  document.getElementById('histContainer').innerHTML=`<table style="table-layout:auto;width:100%;border-collapse:collapse;">
    <thead><tr>
      <th style="padding:12px 16px;text-align:left;font-size:0.72rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid var(--border);">Data</th>
      <th style="padding:12px 16px;text-align:left;font-size:0.72rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid var(--border);">Usuário</th>
      <th style="padding:12px 16px;text-align:left;font-size:0.72rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid var(--border);">Tipo</th>
      <th style="padding:12px 16px;text-align:left;font-size:0.72rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid var(--border);">Item</th>
      <th style="padding:12px 16px;text-align:right;font-size:0.72rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid var(--border);">Qtd</th>
      <th style="padding:12px 16px;text-align:right;font-size:0.72rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid var(--border);">Stock</th>
      <th style="padding:12px 16px;text-align:left;font-size:0.72rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid var(--border);">Localização</th>
      <th style="padding:12px 16px;text-align:right;font-size:0.72rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid var(--border);">Qualidade</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

// ── ADMIN ORG EDIT ────────────────────────────────────────────────────────
let adminEditId=null;
function adminOrgEdit(id,e){
  e&&e.stopPropagation();
  const item=orgI.find(i=>i.id===id);if(!item)return;
  adminEditId=id;
  document.getElementById('mAEUser').textContent='Usuário: '+item.player_name;
  // populate selects
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
  if(quality===null||quality<900||quality>1000)return toast('Qualidade obrigatória entre 900 e 1000.','err');
  try{
    await fetch('/api/items',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:adminEditId,name,quantity:qty,quality,location:loc,notes:item.notes||''})});
    document.getElementById('mAdminEdit').style.display='none';
    toast('Item atualizado.','ok');
    await loadData();
  }catch{toast('Erro ao guardar.','err');}
}
async function adminOrgDel(id,e){
  e&&e.stopPropagation();
  const item=orgI.find(i=>i.id===id);if(!item)return;
  if(!confirm(`Remover "${item.name}" de ${item.player_name}?`))return;
  try{
    await fetch(`/api/items?id=${id}`,{method:'DELETE'});
    toast('Item removido.','ok');
    await loadData();
  }catch{toast('Erro ao remover.','err');}
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

// ── USER COLORS ──────────────────────────────────────────────────────────
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

// ── ADMIN SIDEBAR MENU ───────────────────────────────────────────────────
const ADMIN_SECTIONS=['users','additem','saida','obj','objitems','rules','catalog','locs','export'];
let adminMenuOpen=false;
let activeAdminSection='users';

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
  showAdminPage();
}
function showAdminPage(){
  document.getElementById('adminPage').style.display='block';
  document.getElementById('histPage').style.display='none';
  document.getElementById('objPage').style.display='none';
  document.getElementById('objitemsPage').style.display='none';
  document.getElementById('rulesPage').style.display='none';
  document.getElementById('statsRow').style.display='none';
  document.getElementById('filterRow').style.display='none';
  document.getElementById('filterRowOrg') && (document.getElementById('filterRowOrg').style.display='none');
  document.getElementById('addBtnRow').style.display='none';
  document.getElementById('addPanel').style.display='none';
  document.getElementById('tblWrapInv').style.display='none';
  document.getElementById('tblWrapOrg').style.display='none';
  document.getElementById('tbTitle').textContent='Administração';
  document.getElementById('pgTitle').textContent='Administração';
  document.getElementById('pgSub').textContent='Gestão de usuários, stock e localizações';
  renderAdmin();
  if(activeAdminSection==='objitems')renderAdminObjItems();
  if(activeAdminSection==='rules')renderAdminRules();
}

// ── LOCALIZAÇÕES DA BD ────────────────────────────────────────────────────
let allLocations=[];
async function loadLocations(){
  try{const r=await fetch('/api/locations');const d=await r.json();allLocations=d.locations||[];}catch{allLocations=[];}
  buildLocSelects();
}
function buildLocSelects(){
  const grouped={};
  allLocations.forEach(l=>{const sys=l.system||'Outro';if(!grouped[sys])grouped[sys]=[];grouped[sys].push(l);});
  const html='<option value="">— Selecionar —</option>'+Object.keys(grouped).sort().map(sys=>`<optgroup label="${esc(sys)}">${grouped[sys].map(l=>`<option value="${esc(l.name)}">${esc(l.name)}</option>`).join('')}</optgroup>`).join('');
  ['iLoc','aLoc'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=html;});
}
function renderAdminLocs(){
  const el=document.getElementById('adminLocList');
  if(!el)return;
  if(!allLocations.length){el.innerHTML='<div style="color:var(--muted);font-size:0.85rem;">Nenhuma localização. Adiciona abaixo.</div>';return;}
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

// ── HISTÓRICO COM FILTROS ─────────────────────────────────────────────────
let histData=[];
let histTab='all';
function setHistTab(t){histTab=t;['all','entrada','saida','transfer'].forEach(s=>document.getElementById('htab-'+s)?.classList.toggle('active',s===t));renderHist();}

// ── OBJETIVOS COM CATEGORIAS ──────────────────────────────────────────────
let objActiveCat=null;
function hexToRgb(hex){const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return`${r},${g},${b}`;}
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
    const safecat=cat.replace(/'/g,"\'");
    return'<button onclick="setObjCat(\''+safecat+'\')" style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:0.5rem;font-size:0.84rem;font-weight:600;cursor:pointer;border:1px solid '+border+';background:'+bg+';color:'+clr+';transition:all 0.15s;font-family:\'Inter\',sans-serif;white-space:nowrap;flex-shrink:0;">'+esc(cat)+' <span style="font-size:0.7rem;opacity:0.7;">'+cats[cat].length+'</span></button>';
  }).join('')+'<div style="flex:1;"></div>';
  const items=objActiveCat==='__todos__'?objs.map((o,i)=>({o,i})):(cats[objActiveCat]||[]);
  const accentColors=['#fbbf24','#94a3b8','#b47c3c','#6366f1','#22c55e','#60a5fa','#f472b6','#34d399'];
  const rankClass=i=>i===0?'r1':i===1?'r2':i===2?'r3':'rn';
  const rankLabel=i=>`${i+1}º`;
  el.innerHTML=`<div class="obj-list">${items.map(({o,i})=>{const ic=oreIcon(o.item);const unit=oreUnit(o.item);const isGem=GEM_M.has(o.item);const hasTarget=o.target_qty!=null&&parseFloat(o.target_qty)>0;const targetFmt=hasTarget?(isGem?Math.round(o.target_qty):parseFloat(o.target_qty).toLocaleString('pt-BR',{minimumFractionDigits:3,maximumFractionDigits:3})):null;const accent=accentColors[i%accentColors.length];const iconBg=ic==='gem'?'rgba(20,184,166,0.12)':'rgba(245,158,11,0.12)';const iconColor=ic==='gem'?'#2dd4bf':'#f59e0b';const catColor=catColors[o.category||'']||'#94a3b8';const cardAccent=objActiveCat==='__todos__'?catColor:accent;return`<div class="obj-card" style="--obj-accent:${cardAccent};"><div class="obj-rank ${rankClass(i)}">${rankLabel(i)}</div><div style="width:30px;height:30px;border-radius:0.4rem;background:${iconBg};display:flex;align-items:center;justify-content:center;color:${iconColor};flex-shrink:0;">${itemSvg(ic)}</div><div style="flex:1;min-width:0;display:flex;align-items:center;gap:8px;overflow:hidden;"><span style="font-size:1.15rem;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(o.item)}</span>${objActiveCat==='__todos__'?`<span style="font-size:0.72rem;font-weight:600;color:${catColor};white-space:nowrap;flex-shrink:0;opacity:0.85;">${esc(o.category||'')}</span>`:''}${o.category==='Evento'&&o.event_name?`<span style="font-size:0.75rem;font-weight:600;color:#fbbf24;white-space:nowrap;flex-shrink:0;background:rgba(251,191,36,0.12);border:1px solid rgba(251,191,36,0.3);border-radius:4px;padding:2px 8px;">&#9889; ${esc(o.event_name)}</span>`:''}</div><div style="flex:0 0 160px;display:flex;align-items:center;justify-content:center;"><span style="font-size:0.8rem;color:var(--muted);white-space:nowrap;">${o.note?esc(o.note):''}</span></div><div style="flex:0 0 120px;display:flex;align-items:center;justify-content:flex-end;">${hasTarget?`<div style="text-align:right;"><div style="font-size:0.6rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.07em;">${o.event_name?esc(o.event_name):'Meta'}</div><div style="font-size:1.1rem;font-weight:800;color:${catColor};line-height:1.2;">${targetFmt} <span style="font-size:0.7rem;font-weight:600;color:var(--muted);">${unit}</span></div></div>`:''}</div></div>`}).join('')}</div>`;
}

// ── REGISTAR ENTRADA NO HISTÓRICO ─────────────────────────────────────────
function regEntrada(username,name,qty,quality,loc){
  fetch('/api/transactions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,item_name:name,quantity:qty,unit:oreUnit(name),quality,location:loc,quantity_before:0,quantity_after:qty,type:'entrada',to_player:null})});
}

function itemSvg(t){
  if(t==='ship')return`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/></svg>`;
  if(t==='roc')return`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`;
  return`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`;
}
function emptyH(m){return`<div class="empty"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg><p>${m}</p></div>`;}
function fQ(v){return parseFloat(v||0).toLocaleString('pt-BR',{minimumFractionDigits:3,maximumFractionDigits:3});}
function esc(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function escNl(s){return esc(s).replace(/\n/g,'<br>');}
// ── GOAL BANNER ──────────────────────────────────────────────────────────
async function checkGoalBanner(){
  try{
    const [ro,ri]=await Promise.all([
      fetch('/api/objectives').then(r=>r.json()),
      fetch('/api/items?org=1').then(r=>r.json())
    ]);
    const objs=(ro.objectives||[]).filter(o=>o.target_qty!=null&&parseFloat(o.target_qty)>0);
    const items=ri.items||[];
    if(!objs.length){document.getElementById('goalBanner').classList.remove('show');return;}
    const stockMap={};
    items.forEach(i=>{const k=i.name;stockMap[k]=(stockMap[k]||0)+parseFloat(i.quantity||0);});
    const reached=objs.filter(o=>(stockMap[o.item]||0)>=parseFloat(o.target_qty));
    const banner=document.getElementById('goalBanner');
    if(!reached.length){banner.classList.remove('show');return;}
    const isGem=n=>GEM_M&&GEM_M.has(n);
    const fmtQty=(o)=>{
      const total=stockMap[o.item]||0;
      const unit=isGem(o.item)?'UND':'SCU';
      const tgt=isGem(o.item)?Math.round(o.target_qty):parseFloat(o.target_qty).toLocaleString('pt-BR',{minimumFractionDigits:3,maximumFractionDigits:3});
      const cur=isGem(o.item)?Math.round(total):total.toLocaleString('pt-BR',{minimumFractionDigits:3,maximumFractionDigits:3});
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

let tt;function toast(m,t){const el=document.getElementById('toast');el.textContent=m;el.className=`show ${t}`;clearTimeout(tt);tt=setTimeout(()=>el.classList.remove('show'),4000);}
