// Redireciona se já está autenticado
if(localStorage.getItem('sg_user'))window.location.href='/dashboard.html';

let _tt;
function toast(m,t){const el=document.getElementById('toast');el.textContent=m;el.className=`show ${t}`;clearTimeout(_tt);_tt=setTimeout(()=>el.classList.remove('show'),4000);}

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
  try{
    const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})});
    const d=await r.json();
    if(!r.ok)return toast(d.error||'Erro.','err');
    localStorage.setItem('sg_user',d.player.username);
    window.location.href='/dashboard.html';
  }catch{toast('Erro de ligação.','err');}
}
async function doRegister(){
  const u=document.getElementById('rU').value.trim(),p=document.getElementById('rP').value,p2=document.getElementById('rP2').value,c=document.getElementById('rC').value.trim();
  if(!u)return toast('Introduz o teu nickname.','err');
  if(p.length<4)return toast('Password mínimo 4 caracteres.','err');
  if(p!==p2)return toast('Passwords não coincidem.','err');
  if(!c)return toast('Introduz o código de convite.','err');
  try{
    const r=await fetch('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p,invite_code:c})});
    const d=await r.json();
    if(!r.ok)return toast(d.error||'Erro.','err');
    localStorage.setItem('sg_user',d.player.username);
    window.location.href='/dashboard.html';
  }catch{toast('Erro de ligação.','err');}
}
document.addEventListener('keydown',e=>{
  if(e.key!=='Enter')return;
  if(document.getElementById('fR').style.display!=='none')doRegister();
  else doLogin();
});
