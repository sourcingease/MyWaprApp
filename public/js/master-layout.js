(function(){
  if(document.getElementById('ml-styles')) return;
  
  // Helper function for WIP tracking - directly calls the global addToWIP
  window._mlAddToWIP = function(key, name) {
    console.log('[master-layout] _mlAddToWIP called:', key, name);
    console.log('[master-layout] Available functions:', { 
      addToWIP: typeof window.addToWIP,
      WIPTracker: typeof window.WIPTracker
    });
    
    try {
      // Try calling addToWIP directly
      if (window.addToWIP) {
        console.log('[master-layout] Calling window.addToWIP');
        window.addToWIP(key, name);
        console.log('[master-layout] window.addToWIP completed');
      } else if (window.WIPTracker && window.WIPTracker.track) {
        console.log('[master-layout] Calling WIPTracker.track');
        window.WIPTracker.track(key, name);
        console.log('[master-layout] WIPTracker.track completed');
      } else {
        console.error('[master-layout] WIP tracking functions not found!');
        console.log('[master-layout] window.addToWIP:', window.addToWIP);
        console.log('[master-layout] window.WIPTracker:', window.WIPTracker);
      }
    } catch (e) {
      console.error('[master-layout] Error in _mlAddToWIP:', e);
      console.error('[master-layout] Stack:', e.stack);
    }
  };
  
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
  .ml-layout-toggles{display:flex;gap:6px;margin-right:6px}
  .ml-collapse-toggle{width:26px;height:26px;background:#fff;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;color:#64748b;transition:all .2s}
  .ml-collapse-toggle:hover{background:#f1f5f9;border-color:#0ea5e9;color:#0ea5e9}
  `;
  const st = document.createElement('style'); st.id='ml-styles'; st.textContent = css; document.head.appendChild(st);
})();

// Global helper: try to open a URL inside the working area (appFrame or .working-pane)
window.mlOpenInWorkingArea = function(url){
  try{
    // Always enforce embedded=1 on internal HTML pages
    try{
      const u = new URL(url, location.origin);
      if(u.origin === location.origin){
        if(!u.searchParams.get('embedded')){
          u.searchParams.set('embedded','1');
        }
        // Special case: when navigating to Business Setup inside the Safety
        // dashboard, hide the Safety top tabs so only Setup tabs are visible.
        try{
          if(u.pathname === '/profile.html' && u.searchParams.get('tab') === 'company'){
            const safetyBar = document.getElementById('safety-top-tabs');
            if(safetyBar){ safetyBar.style.display = 'none'; }
          }
        }catch(_){ /* ignore */ }
        url = u.pathname + (u.search?u.search:'') + (u.hash||'');
      }
    }catch(e){}
    const f = document.getElementById('appFrame');
    if(f){ f.src = url; return true; }
    const pane = document.querySelector('.working-pane');
    if(pane){
      pane.style.display='block'; pane.style.padding='0'; pane.style.alignItems='stretch'; pane.style.justifyContent='flex-start';
      // If accounting or setup URL, render module tabs above iframe inside pane
      const pathname = new URL(url, location.origin).pathname || '';
      const isAcct = /^\/accounting\//.test(pathname);
      if(isAcct){
        pane.innerHTML = '<div class="ml-tabs" id="ml-acct-tabs"></div><iframe id="ml-embed-frame" style="width:100%;height:70vh;border:0;border-radius:8px;background:#fff"></iframe>';
        window.renderAccountingTabs && window.renderAccountingTabs(document.getElementById('ml-acct-tabs'), url);
        const frame = document.getElementById('ml-embed-frame'); frame.src = url;
      } else {
        // For Setup (/profile.html) and all other modules, just render the
        // iframe; the module page itself is responsible for its own top
        // tabs/icons (e.g. Business Setup profile/setup icons).
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
    // Skip Safety/other inline tab links that rely on onclick handlers (e.g. switchTab(...)).
    const onclickAttr = (a.getAttribute('onclick') || '').toString();
    if(onclickAttr.indexOf('switchTab(') !== -1) return;
    // Skip empty, in-page (#) and special links; let their own onclick handlers run.
    if(!href || href === '#' || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || a.hasAttribute('download') || a.target) return;
    // Same-origin HTML/internal paths
    try{
      const u = new URL(href, location.origin);
      if(u.origin !== location.origin) return;
      // Only intercept app pages (html or known modules)
      const p = u.pathname || '';
      const isAppPage = p.endsWith('.html') || p.startsWith('/accounting') || p.startsWith('/crm') || p.startsWith('/hr') || p.startsWith('/masters') || p.startsWith('/ai') || p.startsWith('/support');
      if(!isAppPage) return;
      e.preventDefault();
      window.mlOpenInWorkingArea(u.href);
    }catch(_){ /* ignore */ }
  }, true);
})();

// Render Setup (Business Profile) tabs into a container (and wire to working area)
window.renderSetupTabs = function(container, currentUrl){
  if(!container) return;

  // Two main views for Business Setup module
  const tabs = [
    ['Profile', 'profile'],
    ['Setup',   'company']
  ];

  const curTab = (function(){
    try{
      return new URL(currentUrl || location.href, location.origin)
               .searchParams.get('tab') || 'company';
    }catch(_){ return 'company'; }
  })();

  container.innerHTML = '';
  tabs.forEach(([label, key])=>{
    const href = '/profile.html?tab=' + key;
    const a = document.createElement('button');
    a.className = 'ml-tab';
    a.textContent = label;
    if(curTab === key) a.classList.add('active');

    a.addEventListener('click', function(){
      // Use mlOpenInWorkingArea so the iframe and tabs stay in sync
      const url = href + (href.includes('?') ? '&' : '?') + 'embedded=1';
      if(window.mlOpenInWorkingArea){ window.mlOpenInWorkingArea(url); }
    });

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
    // Global left/right layout collapse toggles
    const toggles = document.createElement('div');
    toggles.className = 'ml-layout-toggles';
    const leftBtn = document.createElement('button');
    leftBtn.className = 'ml-collapse-toggle';
    leftBtn.title = 'Toggle left section';
    leftBtn.setAttribute('aria-label','Toggle left section');
    const rightBtn = document.createElement('button');
    rightBtn.className = 'ml-collapse-toggle';
    rightBtn.title = 'Toggle right section';
    rightBtn.setAttribute('aria-label','Toggle right section');

    function applyPaneState(){
      try{
        const leftCollapsed = !!window.__mlLeftCollapsed;
        const rightCollapsed = !!window.__mlRightCollapsed;

        const leftEls = document.querySelectorAll('.safety-pane, .left-pane, .dashboard-left');
        const rightEls = document.querySelectorAll('.proc-pane, .right-pane, .dashboard-right');
        const centerEls = document.querySelectorAll('.working-pane, .center-pane, .dashboard-center');
        const layouts = document.querySelectorAll('.dashboard-content');

        // Hide/show side panes
        leftEls.forEach(function(el){ el.style.display = leftCollapsed ? 'none' : ''; });
        rightEls.forEach(function(el){ el.style.display = rightCollapsed ? 'none' : ''; });

        // Adjust grid so center takes the freed space
        layouts.forEach(function(layout){
          if(!layout) return;
          let cols;
          if(leftCollapsed && rightCollapsed){
            cols = '1fr';
            centerEls.forEach(function(el){ if(layout.contains(el)) el.style.gridColumn = '1 / -1'; });
          } else if(leftCollapsed && !rightCollapsed){
            cols = '4fr 1fr';
            centerEls.forEach(function(el){ if(layout.contains(el)) el.style.gridColumn = '1'; });
            rightEls.forEach(function(el){ if(layout.contains(el)) el.style.gridColumn = '2'; });
          } else if(!leftCollapsed && rightCollapsed){
            cols = '1fr 4fr';
            leftEls.forEach(function(el){ if(layout.contains(el)) el.style.gridColumn = '1'; });
            centerEls.forEach(function(el){ if(layout.contains(el)) el.style.gridColumn = '2'; });
          } else {
            // both visible
            cols = '1fr 4fr 1fr';
            leftEls.forEach(function(el){ if(layout.contains(el)) el.style.gridColumn = '1'; });
            centerEls.forEach(function(el){ if(layout.contains(el)) el.style.gridColumn = '2'; });
            rightEls.forEach(function(el){ if(layout.contains(el)) el.style.gridColumn = '3'; });
          }
          layout.style.display = 'grid';
          layout.style.gridTemplateColumns = cols;
        });

        // Update button glyphs
        leftBtn.textContent = leftCollapsed ? '|⟩' : '⟨|';
        rightBtn.textContent = rightCollapsed ? '⟨|' : '|⟩';
      }catch(e){}
    }

    function togglePane(side){
      try{
        if(side === 'left'){
          window.__mlLeftCollapsed = !window.__mlLeftCollapsed;
        } else if(side === 'right'){
          window.__mlRightCollapsed = !window.__mlRightCollapsed;
        }
        applyPaneState();
      }catch(e){}
    }

    leftBtn.addEventListener('click', function(ev){ ev.preventDefault(); ev.stopPropagation(); togglePane('left'); });
    rightBtn.addEventListener('click', function(ev){ ev.preventDefault(); ev.stopPropagation(); togglePane('right'); });
    toggles.appendChild(leftBtn);
    toggles.appendChild(rightBtn);
    right.prepend(toggles);

    const icons = document.createElement('div'); icons.className='ml-icons';
    function item(href, emoji, title, label, onclick){ const wrap=document.createElement('div'); wrap.className='icon-item'; const a=document.createElement('a'); a.href=href; a.className='icon-btn'; a.title=title; a.textContent=emoji; if(onclick){ a.addEventListener('click', function(e){ e.preventDefault(); onclick(e); }); } const s=document.createElement('div'); s.className='icon-label'; s.textContent=label; wrap.appendChild(a); wrap.appendChild(s); return wrap; }

    // Initialize pane state on load
    applyPaneState();

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
      // Note: Main module not tracked in WIP, only sub-tabs are tracked
      
      // Create iconic tabs bar under the header for Accounting
      try{
        window.disableSafetyTopTabs = true;
        window.activeTopTabs = 'accounting';
        const hdrEl = document.querySelector('.dashboard-header');
        if(hdrEl){
          // Reuse existing row under the header if any, otherwise create
          let bar = document.getElementById('safety-top-tabs');
          if(!bar){
            const sibling = hdrEl.nextElementSibling;
            if(sibling && sibling.querySelector('button')){
              bar = sibling;
            }
          }
          if(!bar){
            bar = document.createElement('div');
            bar.id = 'safety-top-tabs';
            bar.className = 'top-safety-tabs';
            hdrEl.insertAdjacentElement('afterend', bar);
          }
          bar.style.display = '';
          bar.innerHTML = '';

          // All Accounting tabs with icons
          const tabs = [
            ['dashboard',      '📊', 'Dashboard',        '/accounting/dashboard.html'],
            ['receivable',     '📥', 'Receivable',       '/accounting/receivables.html'],
            ['payable',        '📤', 'Payable',          '/accounting/payables.html'],
            ['received',       '✅', 'Received',         '/accounting/received-paid.html?tab=received'],
            ['paid',           '💸', 'Paid',             '/accounting/received-paid.html?tab=paid'],
            ['petty-cash',     '💵', 'Petty Cash',       '/accounting/petty-cash.html'],
            ['transfer',       '🔄', 'Transfer',         '/accounting/transfer.html'],
            ['balance',        '⚖️', 'Accounts Balance', '/accounting/accounts-balance.html'],
            ['summary',        '📋', 'Summary',          '/accounting/bank-deposit-summary.html']
          ];
          
          tabs.forEach(function([key, emoji, label, href]){
            const btn = document.createElement('button');
            btn.className = 'sm-tab';
            btn.setAttribute('data-accounting-tab', key);
            
            const iconBox = document.createElement('div');
            iconBox.className = 'sm-icon-box';
            const span = document.createElement('span');
            span.className = 'sm-ico';
            span.textContent = emoji;
            iconBox.appendChild(span);
            
            const lbl = document.createElement('div');
            lbl.className = 'sm-lbl';
            lbl.textContent = label;
            
            btn.appendChild(iconBox);
            btn.appendChild(lbl);
            
            btn.addEventListener('click', function(ev){
              ev.preventDefault();
              // Track in WIP with format Accounting-{TabName}
              console.log('[Accounting Tab Click]', key, label);
              try{ 
                if(typeof window._mlAddToWIP === 'function') {
                  window._mlAddToWIP('accounting-'+key, 'Accounting-'+label);
                } else {
                  console.warn('[Accounting Tab] _mlAddToWIP not available');
                }
              }catch(e){ console.error('[Accounting Tab] WIP error:', e); }
              
              try {
                const url = href + (href.includes('?') ? '&' : '?') + 'embedded=1';
                if (window.mlOpenInWorkingArea) {
                  window.mlOpenInWorkingArea(url);
                } else {
                  location.href = href;
                }
              } catch (e) {
                console.error('[Accounting Tab] Navigation error:', e);
              }
            });
            
            bar.appendChild(btn);
          });
        }
      }catch(e){
        console.error('Error creating Accounting tabs:', e);
      }
      
      // Open default dashboard view
      if(window.mlOpenInWorkingArea && window.mlOpenInWorkingArea('/accounting/dashboard.html?embedded=1')) return;
      try{
        const f = document.getElementById('appFrame');
        if(f){ f.src = '/accounting/dashboard.html?embedded=1'; return; }
      }catch(e){}
      // Fallback: navigate directly
      location.href = '/accounting/dashboard.html';
    }
    function openSafetyInPlace(){
      // Note: Main module not tracked in WIP, only sub-tabs are tracked
      // Re-enable Safety top tabs when the Safety module is active
      try{ window.disableSafetyTopTabs = false; window.activeTopTabs = 'safety'; }catch(e){}
      try{ if(typeof window.showSafetyTabs === 'function'){ window.showSafetyTabs(); return; } }catch(e){}
      try{
        const f = document.getElementById('appFrame');
        if(f && f.contentWindow && typeof f.contentWindow.showSafetyTabs === 'function'){ f.contentWindow.showSafetyTabs(); return; }
        if(f){ f.src = '/masters/safety-office.html?embedded=1'; return; }
      }catch(e){}
      location.href = '/masters/safety-office.html';
    }
    function openTasksInPlace(){
      // Note: Main module not tracked in WIP, only sub-tabs are tracked
      // Prefer embedding the Task Planner in the current working area / app frame
      try{
        if (window.mlOpenInWorkingArea && window.mlOpenInWorkingArea('/tasks/planning.html?embedded=1')) return;
      }catch(e){}
      // Fallback: navigate directly
      location.href = '/tasks/planning.html';
    }
    function openCRMinPlace(){
      // Note: Main module not tracked in WIP, only sub-tabs are tracked
      // When CRM is active from the Safety dashboard (or any shell that
      // reuses the Safety layout), replace the shared top-tabs row just
      // under the header with CRM-specific icon tabs (Add Contact, Search
      // Contact, Phone Notes, Segments) and render the selected CRM page in
      // the center working pane.
      try {
        window.disableSafetyTopTabs = true;
        window.activeTopTabs = 'crm';
        const hdrEl = document.querySelector('.dashboard-header');
        if (hdrEl) {
          // Reuse the existing row under the header if any, otherwise create
          // #safety-top-tabs so the bar sits between module section and
          // working area.
          let bar = document.getElementById('safety-top-tabs');
          if (!bar) {
            const sibling = hdrEl.nextElementSibling;
            if (sibling && sibling.querySelector('button')) {
              bar = sibling;
            }
          }
          if (!bar) {
            bar = document.createElement('div');
            bar.id = 'safety-top-tabs';
            bar.className = 'top-safety-tabs';
            hdrEl.insertAdjacentElement('afterend', bar);
          }
          bar.style.display = '';
          bar.innerHTML = '';

          const tabs = [
            // key, emoji, label, target URL (without embedded=1)
            ['add',          '➕', 'Add Contact',     '/crm/add-contact-advanced.html'],
            ['search',       '🔎', 'Search Contact',  '/crm/search-contacts.html'],
            ['add-notes',    '📝', 'Phone Notes',     '/crm/add-phone-notes.html'],
            ['search-notes', '🔍', 'Search Notes',    '/crm/search-phone-notes.html'],
            ['segments',     '🏷️', 'Segments',        '/crm/segments.html']
          ];

          tabs.forEach(function([key, emoji, label, href]){
            const btn = document.createElement('button');
            btn.className = 'sm-tab';
            btn.setAttribute('data-crm-tab', key);

            const iconBox = document.createElement('div');
            iconBox.className = 'sm-icon-box';
            const span = document.createElement('span');
            span.className = 'sm-ico';
            span.textContent = emoji;
            iconBox.appendChild(span);

            const lbl = document.createElement('div');
            lbl.className = 'sm-lbl';
            lbl.textContent = label;

            btn.appendChild(iconBox);
            btn.appendChild(lbl);

            btn.addEventListener('click', function(ev){
              ev.preventDefault();
              // Track in WIP with format CRM-{TabName}
              console.log('[CRM Tab Click]', key, label);
              try{ 
                if(typeof window._mlAddToWIP === 'function') {
                  window._mlAddToWIP('crm-'+key, 'CRM-'+label);
                } else {
                  console.warn('[CRM Tab] _mlAddToWIP not available');
                }
              }catch(e){ console.error('[CRM Tab] WIP error:', e); }
              try {
                const url = href + (href.includes('?') ? '&' : '?') + 'embedded=1';
                if (window.mlOpenInWorkingArea) {
                  window.mlOpenInWorkingArea(url);
                  // After navigation, hide any inner CRM header/logo so the
                  // working area only shows the form body.
                  try {
                    const f = document.getElementById('ml-embed-frame');
                    if (f) {
                      f.addEventListener('load', function hideCrmHdr(){
                        try {
                          const doc = f.contentDocument || f.contentWindow.document;
                          const hdr = doc && (doc.getElementById('hdr') || doc.querySelector('.dashboard-header'));
                          if (hdr) hdr.style.display = 'none';
                        } catch (_) {}
                      }, { once: true });
                    }
                  } catch (_) {}
                } else {
                  location.href = href;
                }
              } catch (e) {}
            });

            bar.appendChild(btn);
          });
        }
      } catch (e) {}

      // Default view when clicking CRM icon: open Add Contact (advanced)
      // in the center working pane.
      try {
        if (window.mlOpenInWorkingArea && window.mlOpenInWorkingArea('/crm/add-contact-advanced.html?embedded=1')) {
          // Ensure the inner CRM header/logo is hidden once the frame loads.
          try {
            const f = document.getElementById('ml-embed-frame');
            if (f) {
              f.addEventListener('load', function hideCrmHdr(){
                try {
                  const doc = f.contentDocument || f.contentWindow.document;
                  const hdr = doc && (doc.getElementById('hdr') || doc.querySelector('.dashboard-header'));
                  if (hdr) hdr.style.display = 'none';
                } catch (_) {}
              }, { once: true });
            }
          } catch (_) {}
          return;
        }
      } catch (e) {}

      try {
        const f = document.getElementById('appFrame');
        if (f) {
          f.src = '/crm/add-contact-advanced.html?embedded=1';
          return;
        }
      } catch (e) {}

      // Fallback: open standalone CRM workspace page
      location.href = '/crm.html';
    }
    function openHRInPlace(){
      // Note: Main module not tracked in WIP, only sub-tabs are tracked
      // When HR & Payroll is active, replace the current top tabs row with
      // HR job-flow icons (Job Posting, List of Jobs, etc.) and open the HR
      // workspace in the working area.
      try{
        window.disableSafetyTopTabs = true;
        window.activeTopTabs = 'hr';
        const hdrEl = document.querySelector('.dashboard-header');
        if(hdrEl){
          // Reuse whatever bar currently sits under the header, or create one
          let bar = document.getElementById('safety-top-tabs');
          if(!bar){
            const sibling = hdrEl.nextElementSibling;
            if(sibling && sibling.querySelector('button')){
              bar = sibling;
            }
          }
          if(!bar){
            bar = document.createElement('div');
            bar.id = 'safety-top-tabs';
            bar.className = 'top-safety-tabs';
            hdrEl.insertAdjacentElement('afterend', bar);
          }
          bar.style.display = '';
          bar.innerHTML = '';

          const tabs = [
            ['jobposting','📄','Job Posting'],
            ['listjobs','📋','List of Jobs'],
            ['search','🔍','Search Applicants'],
            ['shortlist','⭐','Shortlisted'],
            ['addemp','➕','Add New Employee'],
            ['gensalary','💵','Generate Salary'],
            ['attendance','🕒','Attendance'],
            ['advance','💳','Advance Salary']
          ];
          tabs.forEach(function([key, emoji, label]){
            const btn = document.createElement('button');
            btn.className = 'sm-tab';
            const box = document.createElement('div'); box.className='sm-icon-box';
            const span = document.createElement('span'); span.className='sm-ico'; span.textContent=emoji;
            box.appendChild(span);
            const lbl = document.createElement('div'); lbl.className='sm-lbl'; lbl.textContent = label;
            btn.appendChild(box); btn.appendChild(lbl);
            btn.addEventListener('click', function(ev){
              ev.preventDefault();
              // Track in WIP with format HR-{TabName}
              console.log('[HR Tab Click]', key, label);
              try{ 
                if(typeof window._mlAddToWIP === 'function') {
                  window._mlAddToWIP('hr-'+key, 'HR-'+label);
                } else {
                  console.warn('[HR Tab] _mlAddToWIP not available');
                }
              }catch(e){ console.error('[HR Tab] WIP error:', e); }
              try{ if(window.triggerHrTab) window.triggerHrTab(key); }catch(e){}
            });
            bar.appendChild(btn);
          });
        }
      }catch(e){}

      // Prefer opening HR in working area (embedded)
      if(window.mlOpenInWorkingArea && window.mlOpenInWorkingArea('/hr/index.html?embedded=1')) return;
      try{
        const f = document.getElementById('appFrame');
        if(f){ f.src = '/hr/index.html?embedded=1'; return; }
      }catch(e){}
      location.href = '/hr/index.html?embedded=1';
    }
    function openAIInPlace(){
      // Note: Main module not tracked in WIP, only sub-tabs are tracked
      try{
        const f = document.getElementById('appFrame');
        if(f){ f.src = '/ai/analyst.html?embedded=1'; return; }
      }catch(e){}
      location.href = '/ai/analyst.html';
    }
    function openSupportInPlace(){
      // Note: Main module not tracked in WIP, only sub-tabs are tracked
      try{
        const f = document.getElementById('appFrame');
        if(f){ f.src = '/support.html?embedded=1'; return; }
      }catch(e){}
      location.href = '/support.html';
    }
    function openEmailInPlace(){
      // Note: Main module not tracked in WIP, only sub-tabs are tracked
      // Prefer using Email inbox/sent/drafts/compose tabs
      try{ if(typeof window.showEmailTabs === 'function'){ window.showEmailTabs(); return; } }catch(e){}
      try{
        const f = document.getElementById('appFrame');
        if(f && f.contentWindow && typeof f.contentWindow.showEmailTabs === 'function'){ f.contentWindow.showEmailTabs(); return; }
        if(f){ f.src = '/crm/mailbox.html?embedded=1'; return; }
      }catch(e){}
      // Fallback: open standalone mailbox page
      location.href = '/crm/mailbox.html';
    }

    // Helper: trigger actions inside the embedded HR & Payroll workspace
    // based on tab key (jobposting, listjobs, search, shortlist, addemp).
    window.triggerHrTab = function(action){
      function openHrUrl(url){
        try{
          if(window.mlOpenInWorkingArea && window.mlOpenInWorkingArea(url)) return;
        }catch(e){}
        try{
          const f = document.getElementById('ml-embed-frame') || document.getElementById('appFrame');
          if(f){ f.src = url; return; }
        }catch(e){}
        // Fallback: navigate top window
        try{ location.href = url.replace('?embedded=1',''); }catch(e){}
      }
      try{
        const frame = document.getElementById('ml-embed-frame') || document.getElementById('appFrame');
        const win = frame && frame.contentWindow;
        const doc = win && win.document;

        function clickByText(prefix){
          if(!doc) return false;
          prefix = prefix.toLowerCase();
          const candidates = doc.querySelectorAll('button, a, [role="button"]');
          for(const el of candidates){
            const txt = (el.textContent || '').trim().toLowerCase();
            if(txt.startsWith(prefix)){
              el.click();
              return true;
            }
          }
          return false;
        }

        if(action === 'jobposting'){
          if(!clickByText('job posting')) openHrUrl('/hr/job-posting.html?embedded=1');
        } else if(action === 'listjobs'){
          if(!clickByText('list of job')) openHrUrl('/hr/job-postings-list.html?embedded=1');
        } else if(action === 'search'){
          if(!clickByText('search applicants')) openHrUrl('/hr/search-applicants.html?embedded=1');
        } else if(action === 'shortlist'){
          if(!clickByText('shortlisted applicants')) openHrUrl('/hr/shortlisted.html?embedded=1');
        } else if(action === 'addemp'){
          if(!clickByText('add new employee')) openHrUrl('/hr/index.html?embedded=1');
        } else if(action === 'gensalary'){
          // Always open the Add Employee page with the Generate Salary (payroll)
          // tab preselected. We no longer rely on an inner "Generate Salary"
          // button since the shell controls the tab selection via ?tab=payroll.
          openHrUrl('/hr/index.html?tab=payroll&embedded=1');
        } else if(action === 'attendance'){
          // Open Attendance view within HR workspace (placeholder for now)
          if(!clickByText('attendance')){
            openHrUrl('/hr/index.html?tab=attendance&embedded=1');
          }
        } else if(action === 'advance'){
          // Open Advance Salary view within HR workspace (placeholder for now)
          if(!clickByText('advance salary')){
            openHrUrl('/hr/index.html?tab=advance-salary&embedded=1');
          }
        }
      }catch(e){ /* ignore */ }
    };
    function openChatInPlace(){
      // Note: Main module not tracked in WIP, only sub-tabs are tracked
      if(openInWorkingArea('/crm/chat.html')) return;
      location.href = '/app.html#/chat';
    }
    function openReportInPlace(){
      // Note: Main module not tracked in WIP, only sub-tabs are tracked
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
      // Note: Main module not tracked in WIP, only sub-tabs are tracked
      if(openInWorkingArea('/tracking.html?embedded=1')) return;
      location.href = '/app.html#/tracking';
    }
    function openEmployeesInPlace(){
      if(openInWorkingArea('/employees.html?embedded=1#add')) return;
      location.href = '/app.html#/employees-add';
    }
    function openSetupInPlace(){
      // Note: Main module not tracked in WIP, only sub-tabs are tracked
      // When Setup is active, replace the current top tabs row with
      // Profile/Setup icons in this shell.
      try{
        window.disableSafetyTopTabs = true;
        window.activeTopTabs = 'setup';
        const hdrEl = document.querySelector('.dashboard-header');
        if(hdrEl){
          // Reuse existing row under header if it already exists, otherwise
          // create #safety-top-tabs just under the header.
          let bar = document.getElementById('safety-top-tabs');
          if(!bar){
            const sibling = hdrEl.nextElementSibling;
            if(sibling && sibling.querySelector('button')){
              bar = sibling;
            }
          }
          if(!bar){
            bar = document.createElement('div');
            bar.id = 'safety-top-tabs';
            bar.className = 'top-safety-tabs';
            hdrEl.insertAdjacentElement('afterend', bar);
          }
          bar.style.display = '';
          bar.innerHTML = '';

          const tabs = [
            ['profile','🏢','Profile', '/profile.html?tab=profile'],
            ['company','⚙️','Setup', '/profile.html?tab=company']
          ];
          tabs.forEach(function([key, emoji, label, href]){
            const btn = document.createElement('button');
            btn.className = 'sm-tab';
            const box = document.createElement('div'); box.className='sm-icon-box';
            const span = document.createElement('span'); span.className='sm-ico'; span.textContent=emoji;
            box.appendChild(span);
            const lbl = document.createElement('div'); lbl.className='sm-lbl'; lbl.textContent = label;
            btn.appendChild(box); btn.appendChild(lbl);
            btn.addEventListener('click', function(ev){
              ev.preventDefault();
              // Track in WIP with format Setup-{TabName}
              console.log('[Setup Tab Click]', key, label);
              try{ 
                if(typeof window._mlAddToWIP === 'function') {
                  window._mlAddToWIP('setup-'+key, 'Setup-'+label);
                } else {
                  console.warn('[Setup Tab] _mlAddToWIP not available');
                }
              }catch(e){ console.error('[Setup Tab] WIP error:', e); }
              try{
                const url = href + (href.includes('?') ? '&' : '?') + 'embedded=1';
                if(window.mlOpenInWorkingArea){
                  window.mlOpenInWorkingArea(url);
                } else {
                  location.href = href;
                }
              }catch(e){}
            });
            bar.appendChild(btn);
          });
        }
      }catch(e){}
      // Prefer embedding the Business Setup page in the working area / app iframe
      try{
        if(window.mlOpenInWorkingArea && window.mlOpenInWorkingArea('/profile.html?tab=company&embedded=1')){
          // Trigger Setup sub-tabs view after iframe loads
          setTimeout(function(){
            try{
              const frame = document.getElementById('ml-embed-frame');
              if(frame && frame.contentWindow && typeof frame.contentWindow.showTopBarSetup === 'function'){
                frame.contentWindow.showTopBarSetup();
              }
            }catch(e){}
          }, 300);
          return;
        }
      }catch(e){}
      try{
        const f = document.getElementById('appFrame');
        if(f){ f.src = '/profile.html?tab=company&embedded=1'; return; }
      }catch(e){}
      // Fallback: navigate directly to standalone Business Setup page
      location.href = '/profile.html?tab=company';
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
      item('#','✉️','Email','Email', openEmailInPlace),
      item('#','💬','Chat','Chat', openChatInPlace),
      item('#','📊','Report','Report', openReportInPlace),
      item('#','📍','Tracking','Tracking', openTrackingInPlace),
      item('#','⚙️','Setup','Setup', openSetupInPlace)
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

// Global helper to render Profile/Setup tabs directly under any dashboard header.
// This is used when the Setup module is clicked from the master icon row.
window.showSetupTopTabs = function(){
  try{
    const hdr = document.querySelector('.dashboard-header');
    if(!hdr) return;
    let bar = document.getElementById('safety-top-tabs');
    if(!bar){
      bar = document.createElement('div');
      bar.id = 'safety-top-tabs';
      bar.className = 'top-safety-tabs';
      hdr.insertAdjacentElement('afterend', bar);
    }
    bar.style.display = '';
    bar.innerHTML = '';

    const tabs = [
      ['profile','🏢','Profile'],
      ['company','⚙️','Setup']
    ];
    tabs.forEach(function([key, emoji, label]){
      const btn = document.createElement('button');
      btn.className = 'sm-tab';
      const box = document.createElement('div'); box.className='sm-icon-box';
      const span = document.createElement('span'); span.className='sm-ico'; span.textContent=emoji;
      box.appendChild(span);
      const lbl = document.createElement('div'); lbl.className='sm-lbl'; lbl.textContent = label;
      btn.appendChild(box); btn.appendChild(lbl);
      btn.addEventListener('click', function(ev){
        ev.preventDefault();
        try{
          if(window.mlOpenInWorkingArea){
            window.mlOpenInWorkingArea('/profile.html?tab='+key+'&embedded=1');
          } else {
            location.href = '/profile.html?tab='+key;
          }
        }catch(e){}
      });
      bar.appendChild(btn);
    });
  }catch(e){ /* ignore */ }
};
