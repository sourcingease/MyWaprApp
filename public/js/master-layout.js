(function(){
  if(document.getElementById('ml-styles')) return;
  const css = `
  .ml-icons{display:flex;align-items:center;gap:8px;margin-right:6px}
  .icon-btn{width:36px;height:36px;background:transparent;border:1px solid #e2e8f0;border-radius:8px;cursor:pointer;color:#64748b;display:flex;align-items:center;justify-content:center;transition:all .2s;font-size:18px}
  .icon-btn:hover{background:#f1f5f9;border-color:#0ea5e9;color:#0ea5e9}
  .user-badge{width:36px;height:36px;background:#0ea5e9;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:14px;cursor:pointer;box-shadow:0 2px 6px rgba(14,165,233,.25)}
  .user-menu{position:absolute;right:0;top:100%;margin-top:8px;width:280px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 12px 24px rgba(0,0,0,.12);display:none;z-index:1100}
  .user-menu.open{display:block}
  .user-menu .menu-header{display:flex;gap:12px;align-items:center;padding:12px 16px;border-bottom:1px solid #e2e8f0}
  .user-menu .avatar{width:56px;height:56px;background:#e2e8f0;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:700;color:#334155}
  .user-menu .name{font-weight:700;color:#0f172a}
  .user-menu .role{font-size:12px;color:#64748b}
  .user-menu .company{font-size:12px;color:#94a3b8}
  .user-menu .menu-item{padding:12px 16px;cursor:pointer;display:flex;align-items:center;gap:8px;color:#0f172a;text-decoration:none}
  .user-menu .menu-item:hover{background:#f8fafc}
  .user-menu .menu-actions{padding:12px 16px;display:flex;gap:8px;border-top:1px solid #e2e8f0;justify-content:flex-end}
  .user-menu .btn{padding:8px 12px;border-radius:8px;font-weight:600;font-size:12px;border:1px solid #e2e8f0;background:#fff;cursor:pointer}
  .user-menu .btn.primary{background:#ef4444;color:#fff;border-color:#ef4444}
  `;
  const st = document.createElement('style'); st.id='ml-styles'; st.textContent = css; document.head.appendChild(st);
})();

window.renderMasterHeader = function(opts){
  opts = opts || {}; const current = opts.current || '';
  // Find/create header-right container
  let hdr = document.querySelector('.dashboard-header');
  if(!hdr){ return; }
  let right = hdr.querySelector('.header-right');
  if(!right){ right = document.createElement('div'); right.className = 'header-right'; hdr.appendChild(right); }
  // Insert icons bar if missing (and if an icons row isn't already present)
  if(!hdr.querySelector('.ml-icons') && !right.querySelector('.icon-btn')){
    const icons = document.createElement('div'); icons.className='ml-icons';
    function a(href, emoji, title){ const a=document.createElement('a'); a.href=href; a.className='icon-btn'; a.title=title; a.textContent=emoji; return a; }
    icons.append(
      a('/masters/safety-office.html','🦺','Safety'),
      a('/accounting/index.html','💰','Accounting'),
      a('/hr/index.html','👥','HR & Payroll'),
      a('/crm/index.html','🧩','CRM'),
      a('/tasks/planning.html','🗓️','Tasks'),
      a('/ai/analyst.html','🤖','AI Analyst'),
      a('/support.html','💬','Support'),
      a('mailto:?subject=Hello','✉️','Email')
    );
    right.prepend(icons);
  }
  // Add user badge & dropdown if missing
  if(!hdr.querySelector('.user-badge')){
    const badge = document.createElement('div'); badge.className='user-badge'; badge.textContent='SS'; badge.title='Account';
    const menu = document.createElement('div'); menu.id='user-menu'; menu.className='user-menu'; menu.setAttribute('aria-hidden','true');
menu.innerHTML = '<div class="menu-header"><div class="avatar">SS</div><div><div class="name">Sam Safety</div><div class="role">USER</div><div class="company">ComplytEX</div></div></div>'+
      '<a class="menu-item" href="/profile.html?tab=profile">👤 My Profile</a>'+
      '<a class="menu-item" href="/profile.html#password">🔒 Change Password</a>'+
'<div class=\"menu-actions\"><a class=\"btn\" href=\"/profile.html?tab=company\">Company Setup</a><button class=\"btn primary\" id=\"mlSignOut\">Sign out</button></div>'
    const wrap = document.createElement('div'); wrap.style.position='relative'; wrap.appendChild(badge); wrap.appendChild(menu); right.appendChild(wrap);
    badge.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); menu.classList.toggle('open'); });
    document.addEventListener('click', (e)=>{ if(!menu.contains(e.target) && !badge.contains(e.target)) menu.classList.remove('open'); });
    const so = document.getElementById('mlSignOut'); if(so){ so.onclick = function(){ fetch('/api/auth/logout',{method:'POST',credentials:'include'}).finally(()=>{ location.href='/login';}); }; }
  }
};

// Auto-render if a dashboard header exists
window.addEventListener('DOMContentLoaded', ()=>{ if(document.querySelector('.dashboard-header')) renderMasterHeader({}); });
