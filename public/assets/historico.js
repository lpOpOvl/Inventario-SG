let histData=[];
let histTab='all';

document.addEventListener('DOMContentLoaded',async()=>{
  if(!requireAuth())return;
  await initPage();
  await renderHist();
});

function setHistTab(t){
  histTab=t;
  ['all','entrada','saida','transfer'].forEach(s=>document.getElementById('htab-'+s)?.classList.toggle('active',s===t));
  renderHist();
}

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
