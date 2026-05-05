let rulesCache=[];

document.addEventListener('DOMContentLoaded',async()=>{
  if(!requireAuth())return;
  await initPage();
  await renderRulesPage();
});

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
