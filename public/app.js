// Injects sidebar + topbar + logout button; highlights active link; persists sidebar state
(function(){
  function h(tag, attrs={}, children=[]) { const el = document.createElement(tag); Object.entries(attrs||{}).forEach(([k,v])=>{
    if(k==='class') el.className=v; else if(k==='html') el.innerHTML=v; else el.setAttribute(k,v);
  }); (children||[]).forEach(c=> el.appendChild(typeof c==='string'? document.createTextNode(c): c)); return el; }

  function buildLayout(){
    const body = document.body; if(!body) return;
    const original = document.createElement('div'); original.className='ct-content';
    while(body.firstChild){ original.appendChild(body.firstChild); }

    const sidebar = h('aside',{class:'ct-sidebar'});
    sidebar.appendChild(h('div',{class:'brand', html:'<img src="/logo.png" style="height:24px"> <span class="text">Complytex</span>'}));

    const nav = h('nav');
    const items = [
      ['Owner Dashboard','/dashboard','🏠'],
      ['Buyer','/masters/buyer.html','🛒'],
      ['Supplier','/masters/supplier.html','🚚'],
      ['Designer','/masters/designer.html','🎨'],
      ['Safety Office','/masters/safety-office.html','🛡️'],
      ['Safety Auditor','/masters/safety-auditor.html','🧪'],
      ['Inspection','/masters/inspection.html','🔎'],
      ['Employees','/employees','👥'],
      ['Roles','/roles','🔐'],
      ['Support','/support','💬'],
      ['Billing','/billing','💳']
    ];
    const loc = location.pathname.toLowerCase();
    items.forEach(([label,href,icon])=>{
      const a = h('a',{href}); a.innerHTML = `${icon} <span class="text">${label}</span>`;
      if(loc===href.toLowerCase()) a.classList.add('active');
      nav.appendChild(a);
    });
    sidebar.appendChild(nav);

    const main = h('div',{class:'ct-main'});
    const top = h('header',{class:'ct-topbar'});
    const left = h('div',{class:'left'});
    const right = h('div',{class:'right'});

    const toggleBtn = h('button',{class:'ct', title:'Toggle menu'}); toggleBtn.textContent='☰';
    toggleBtn.onclick = ()=>{
      if(window.innerWidth<=900){ sidebar.classList.toggle('open'); overlay.classList.toggle('show'); }
      else{ document.documentElement.classList.toggle('ct-collapsed'); localStorage.setItem('ct-collapsed', document.documentElement.classList.contains('ct-collapsed')?'1':'0'); }
    };

    const title = h('div',{class:'text'}); title.textContent = document.title || 'Dashboard';
    left.append(toggleBtn, title);

    const online = h('span',{class:'badge'}); online.textContent='Online';
    const me = h('span',{style:'opacity:.8'}); me.textContent='…';
    const logoutBtn = h('button',{class:'ct primary'}); logoutBtn.textContent='Logout';
    logoutBtn.onclick = async ()=>{ try{ await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin'}); }catch{} location.href='/login'; };
    right.append(online, me, logoutBtn);

    top.append(left,right); main.append(top, original);

    const overlay = h('div',{class:'ct-overlay'});

    const wrapper = h('div',{class:'ct-layout'}); wrapper.append(sidebar, main, overlay);
    body.appendChild(wrapper);

    // Persist collapsed state
    if(localStorage.getItem('ct-collapsed')==='1') document.documentElement.classList.add('ct-collapsed');

    // Load current user
    fetch('/api/auth/me',{credentials:'same-origin'}).then(r=>r.ok?r.json():null).then(j=>{
      if(j && j.success && j.data && j.data.user){ me.textContent = j.data.user.FullName || j.data.user.Email; }
    }).catch(()=>{});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', buildLayout); else buildLayout();
})();
