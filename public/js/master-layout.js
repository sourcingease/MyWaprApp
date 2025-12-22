(function(){
  if(document.getElementById('ml-styles')) return;
  const css = `
  .ml-icons{display:flex;align-items:flex-start;gap:10px;margin-right:6px}
  .icon-item{display:flex;flex-direction:column;align-items:center;gap:2px}
  .icon-btn{width:36px;height:36px;background:transparent;border:1px solid #e2e8f0;border-radius:8px;cursor:pointer;color:#64748b;display:flex;align-items:center;justify-content:center;transition:all .2s;font-size:18px}
  .icon-btn:hover{background:#f1f5f9;border-color:#0ea5e9;color:#0ea5e9}
  .icon-label{font-size:10px;color:#64748b;line-height:1;text-align:center;white-space:nowrap}
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
  .ml-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}
  .ml-tab{padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;color:#0f172a;cursor:pointer;font-size:12px}
  .ml-tab.active{background:#0ea5e9;color:#fff;border-color:#0ea5e9}
  `;
  const st = document.createElement('style'); st.id='ml-styles'; st.textContent = css; document.head.appendChild(st);
})();

// Global helper: try to open a URL inside the working area (appFrame or .working-pane)
window.mlOpenInWorkingArea = function(url){
  try{
    // Always enforce embedded=1 on internal HTML pages
    try{ const u=new URL(url, location.origin); if(u.origin===location.origin){ if(!u.searchParams.get('embedded')){ u.searchParams.set('embedded','1'); } url = u.pathname + (u.search?u.search:'') + (u.hash||''); } }catch(e){}
    const f = document.getElementById('appFrame');
    if(f){ f.src = url; return true; }
    const pane = document.querySelector('.working-pane');
    if(pane){
      pane.style.display='block'; pane.style.padding='0'; pane.style.alignItems='stretch'; pane.style.justifyContent='flex-start';
      // If accounting URL, render tabs above iframe inside pane
      const isAcct = /^\/accounting\//.test(new URL(url, location.origin).pathname||'');
      if(isAcct){
        pane.innerHTML = '<div class="ml-tabs" id="ml-acct-tabs"></div><iframe id="ml-embed-frame" style="width:100%;height:70vh;border:0;border-radius:8px;background:#fff"></iframe>';
        window.renderAccountingTabs && window.renderAccountingTabs(document.getElementById('ml-acct-tabs'), url);
        const frame = document.getElementById('ml-embed-frame'); frame.src = url;
      } else {
        pane.innerHTML = '<iframe id="ml-embed-frame" src="'+url+'" style="width:100%;height:70vh;border:0;border-radius:8px;background:#fff"></iframe>';
      }
      try{
        const frame = document.getElementById('ml-embed-frame');
        function size(){ const hdr=document.querySelector('.dashboard-header'); const h=window.innerHeight - (hdr?.offsetHeight||0) - 120; frame.style.height = Math.max(420,h)+'px'; }
        window.addEventListener('resize', size); size();
      }catch(e){}
      return true;
    }
  }catch(e){}
  return false;
};

// Intercept internal anchor clicks on top-level pages to keep navigation in working area
(function(){
  if(window.top !== window.self) return; // inside iframe -> skip
  document.addEventListener('click', function(e){
    const a = e.target && (e.target.closest ? e.target.closest('a') : null);
    if(!a) return;
    const href = a.getAttribute('href');
    if(!href || href.startsWith('mailto:') || href.startsWith('tel:') || a.hasAttribute('download') || a.target) return;
    // Same-origin HTML/internal paths
    try{
      const u = new URL(href, location.origin);
      if(u.origin !== location.origin) return;
      // Only intercept app pages (html or known modules)
      const p = u.pathname || '';
      const isAppPage = p.endsWith('.html') || p.startsWith('/accounting') || p.startsWith('/crm') || p.startsWith('/hr') || p.startsWith('/masters') || p.startsWith('/ai') || p.startsWith('/support');
      if(!isAppPage) return;
      e.preventDefault();
      if(/^\/accounting\//.test(p) && window.showAccountingTabs){ window.showAccountingTabs(); }
      window.mlOpenInWorkingArea(u.href);
    }catch(_){ /* ignore */ }
  }, true);
})();

// Render Accounting tabs into a container (and wire to working area)
window.renderAccountingTabs = function(container, currentUrl){
  if(!container) return;
  const tabs = [
    ['Dashboard','/accounting/dashboard.html'],
    ['Banks','/accounting/banks.html'],
    ['Payables','/accounting/payables.html'],
    ['Receivables','/accounting/receivables.html'],
    ['Received/Paid','/accounting/received-paid.html'],
    ['Petty Cash','/accounting/petty-cash.html'],
    ['Transfer','/accounting/transfer.html'],
    ['Accounts Balance','/accounting/accounts-balance.html'],
    ['Summary','/accounting/bank-deposit-summary.html']
  ];
  const uNow = (function(){ try{ return new URL(currentUrl||location.href, location.origin).pathname; }catch(_){ return ''; } })();
  container.innerHTML = '';
  tabs.forEach(([label, href])=>{
    const a = document.createElement('button'); a.className='ml-tab'; a.textContent = label; if(uNow===href) a.classList.add('active');
    a.addEventListener('click', function(){ const url = href + (href.includes('?')?'&':'?')+'embedded=1'; if(window.mlOpenInWorkingArea){ window.mlOpenInWorkingArea(url); } });
    container.appendChild(a);
  });
};

// Show Accounting tabs above appFrame if present
window.showAccountingTabs = function(){
  try{
    const f = document.getElementById('appFrame');
    if(f && f.parentElement){
      const parent = f.parentElement;
      let bar = parent.querySelector('#ml-acct-tabs');
      if(!bar){ bar = document.createElement('div'); bar.id='ml-acct-tabs'; bar.className='ml-tabs'; parent.insertBefore(bar, f); }
      window.renderAccountingTabs(bar, (f.contentWindow && f.contentWindow.location)? f.contentWindow.location.href : '/accounting/dashboard.html');
    }
  }catch(e){}
};

window.renderMasterHeader = function(opts){
  opts = opts || {}; const current = opts.current || '';
  // Find/create header-right container
  let hdr = document.querySelector('.dashboard-header');
  if(!hdr){ return; }
  let right = hdr.querySelector('.header-right');
  if(!right){ right = document.createElement('div'); right.className = 'header-right'; hdr.appendChild(right); }
  // Ensure icons bar exists (with small labels)
  if(!hdr.querySelector('.ml-icons')){
    const icons = document.createElement('div'); icons.className='ml-icons';
    function item(href, emoji, title, label, onclick){ const wrap=document.createElement('div'); wrap.className='icon-item'; const a=document.createElement('a'); a.href=href; a.className='icon-btn'; a.title=title; a.textContent=emoji; if(onclick){ a.addEventListener('click', function(e){ e.preventDefault(); onclick(e); }); } const s=document.createElement('div'); s.className='icon-label'; s.textContent=label; wrap.appendChild(a); wrap.appendChild(s); return wrap; }
    // Try to open a URL inside the current working area (app iframe or safety working pane)
    function openInWorkingArea(url){
      try{
        const f = document.getElementById('appFrame');
        if(f){ f.src = url; return true; }
        const pane = document.querySelector('.working-pane');
        if(pane){
          pane.style.display='block'; pane.style.padding='0'; pane.style.alignItems='stretch'; pane.style.justifyContent='flex-start';
          pane.innerHTML = '<iframe id="ml-embed-frame" src="'+url+'" style="width:100%;height:70vh;border:0;border-radius:8px;background:#fff"></iframe>';
          try{
            const frame = document.getElementById('ml-embed-frame');
            function size(){ const hdr=document.querySelector('.dashboard-header'); const h=window.innerHeight - (hdr?.offsetHeight||0) - 120; frame.style.height = Math.max(420,h)+'px'; }
            window.addEventListener('resize', size); size();
          }catch(e){}
          return true;
        }
      }catch(e){}
      return false;
    }
    function openAccountingInPlace(){
      // Ensure tabs are visible above working area/appFrame
      try{ if(window.showAccountingTabs) window.showAccountingTabs(); }catch(e){}
      // Prefer opening the new Accounting Dashboard in the working area/app iframe
      if(window.mlOpenInWorkingArea && window.mlOpenInWorkingArea('/accounting/dashboard.html?embedded=1')) return;
      try{
        const f = document.getElementById('appFrame');
        if(f){ f.src = '/accounting/dashboard.html?embedded=1'; return; }
      }catch(e){}
      // Fallback: navigate directly
      location.href = '/accounting/dashboard.html';
    }
    function openSafetyInPlace(){
      try{ if(typeof window.showSafetyTabs === 'function'){ window.showSafetyTabs(); return; } }catch(e){}
      try{
        const f = document.getElementById('appFrame');
        if(f && f.contentWindow && typeof f.contentWindow.showSafetyTabs === 'function'){ f.contentWindow.showSafetyTabs(); return; }
        if(f){ f.src = '/masters/safety-office.html?embedded=1'; return; }
      }catch(e){}
      location.href = '/masters/safety-office.html';
    }
    function openTasksInPlace(){
      // Prefer embedding the Task Planner in the current working area / app frame
      try{
        if (window.mlOpenInWorkingArea && window.mlOpenInWorkingArea('/tasks/planning.html?embedded=1')) return;
      }catch(e){}
      // Fallback: navigate directly
      location.href = '/tasks/planning.html';
    }
    function openCRMinPlace(){
      // Prefer using CRM email tabs inside the current working area/app frame
      try{ if(typeof window.showCRMTabs === 'function'){ window.showCRMTabs(); return; } }catch(e){}
      try{
        const f = document.getElementById('appFrame');
        if(f && f.contentWindow && typeof f.contentWindow.showCRMTabs === 'function'){ f.contentWindow.showCRMTabs(); return; }
        if(f){ f.src = '/crm/mailbox.html?embedded=1'; return; }
      }catch(e){}
      // Fallback: open standalone CRM mailbox page
      location.href = '/crm/mailbox.html';
    }
    function openHRInPlace(){
      // Prefer opening HR in working area (embedded)
      if(window.mlOpenInWorkingArea && window.mlOpenInWorkingArea('/hr/index.html?embedded=1')) return;
      try{
        const f = document.getElementById('appFrame');
        if(f){ f.src = '/hr/index.html?embedded=1'; return; }
      }catch(e){}
      location.href = '/hr/index.html?embedded=1';
    }
    function openAIInPlace(){
      try{
        const f = document.getElementById('appFrame');
        if(f){ f.src = '/ai/analyst.html?embedded=1'; return; }
      }catch(e){}
      location.href = '/ai/analyst.html';
    }
    function openSupportInPlace(){
      try{
        const f = document.getElementById('appFrame');
        if(f){ f.src = '/support.html?embedded=1'; return; }
      }catch(e){}
      location.href = '/support.html';
    }
    function openChatInPlace(){
      if(openInWorkingArea('/crm/chat.html')) return;
      location.href = '/app.html#/chat';
    }
    function openReportInPlace(){
      // Prefer embedding reports page and switching agents to Reports module if available
      try{
        if (window.AgentUI) {
          var el = document.querySelector('#safety-agents-panel');
          if (el) {
            window.AgentUI.initModuleAgents({ containerSelector: '#safety-agents-panel', moduleId: 'reports' });
          }
        }
      }catch(e){}
      if(openInWorkingArea('/report.html?embedded=1')) return;
      location.href = '/app.html#/report';
    }
    function openTrackingInPlace(){
      if(openInWorkingArea('/tracking.html?embedded=1')) return;
      location.href = '/app.html#/tracking';
    }
    function openEmployeesInPlace(){
      if(openInWorkingArea('/employees.html?embedded=1#add')) return;
      location.href = '/app.html#/employees-add';
    }
    icons.append(
      item('#','🦺','Safety','Safety', openSafetyInPlace),
      item('#','💰','Accounting','Accounting', openAccountingInPlace),
      item('#','👥','HR & Payroll','HR & Payroll', openHRInPlace),
      item('#','🧩','CRM','CRM', openCRMinPlace),
      item('#','🗓️','Tasks','Tasks', openTasksInPlace),
      item('#','🤖','AI Analyst','AI', openAIInPlace),
      item('#','💬','Support','Support', openSupportInPlace),
      // Email should open CRM mailbox (compose/inbox/etc.), not external mail client
      item('#','✉️','Email','Email', openCRMinPlace),
      item('#','💬','Chat','Chat', openChatInPlace),
      item('#','📊','Report','Report', openReportInPlace),
      item('#','📍','Tracking','Tracking', openTrackingInPlace),
      item('/profile.html?tab=company','⚙️','Setup','Setup')
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
      '<div class="menu-actions"><a class="btn" href="/profile.html?tab=company">Business Setup</a><button class="btn primary" id="mlSignOut">Sign out</button></div>';
    const wrap = document.createElement('div'); wrap.style.position='relative'; wrap.appendChild(badge); wrap.appendChild(menu); right.appendChild(wrap);
    badge.addEventListener('click', (e)=>{ e.preventDefault(); e.stopPropagation(); menu.classList.toggle('open'); });
    document.addEventListener('click', (e)=>{ if(!menu.contains(e.target) && !badge.contains(e.target)) menu.classList.remove('open'); });
    const so = document.getElementById('mlSignOut'); if(so){ so.onclick = function(){ fetch('/api/auth/logout',{method:'POST',credentials:'include'}).finally(()=>{ location.href='/login';}); }; }
  }
};

// Auto-render if a dashboard header exists
window.addEventListener('DOMContentLoaded', ()=>{ if(document.querySelector('.dashboard-header')) renderMasterHeader({}); });
