// Simple client-side i18n plugin
(function(){
  const I18N = {
    current: 'en',
    dict: {},
    available: ['en','es'],
    async init(){
      try{
        const saved = localStorage.getItem('lang');
        if(saved) this.current = saved;
        await this.load(this.current);
        this.apply(document);
        this.injectSwitcher();
      }catch(e){ console.warn('i18n init failed', e); }
    },
    async load(lang){
      try{
        const res = await fetch(`/i18n/${lang}.json`,{cache:'no-store'});
        if(!res.ok) throw new Error('lang file not found');
        this.dict = await res.json();
        this.current = lang;
        localStorage.setItem('lang', lang);
      }catch(e){
        if(lang!=='en') { console.warn('i18n fallback to en'); return this.load('en'); }
      }
    },
    t(key, fallback){
      const v = key.split('.').reduce((o,k)=> (o&&o[k]!=null? o[k] : undefined), this.dict);
      return (v!=null? v : (fallback!=null? fallback : key));
    },
    apply(root){
      // text content
      root.querySelectorAll('[data-i18n]').forEach(el=>{
        const key = el.getAttribute('data-i18n');
        el.textContent = this.t(key, el.textContent);
      });
      // placeholders
      root.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{
        const key = el.getAttribute('data-i18n-placeholder');
        el.setAttribute('placeholder', this.t(key, el.getAttribute('placeholder')||''));
      });
      // titles
      root.querySelectorAll('[data-i18n-title]').forEach(el=>{
        const key = el.getAttribute('data-i18n-title');
        el.setAttribute('title', this.t(key, el.getAttribute('title')||''));
      });
    },
    async setLanguage(lang){
      await this.load(lang);
      this.apply(document);
      const ev = new CustomEvent('i18n:changed', { detail:{ lang }});
      document.dispatchEvent(ev);
    },
    injectSwitcher(){
      const box = document.createElement('div');
      box.style.cssText = 'position:fixed;top:10px;right:10px;z-index:3000;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:6px 8px;box-shadow:0 2px 8px rgba(0,0,0,.15);font-family:system-ui,Inter,Segoe UI,sans-serif;font-size:12px;color:#0f172a;display:flex;gap:6px;align-items:center;';
      const label = document.createElement('span'); label.textContent = 'Lang'; label.setAttribute('data-i18n','i18n.lang');
      const sel = document.createElement('select'); sel.style.cssText='padding:4px 6px;border:1px solid #e2e8f0;border-radius:6px';
      this.available.forEach(l=>{ const o=document.createElement('option'); o.value=l; o.textContent=l.toUpperCase(); if(l===this.current) o.selected=true; sel.appendChild(o); });
      sel.addEventListener('change', ()=> this.setLanguage(sel.value));
      box.appendChild(label); box.appendChild(sel);
      document.body.appendChild(box);
      // apply label
      this.apply(box);
    }
  };
  window.I18N = I18N;
  document.addEventListener('DOMContentLoaded', ()=> I18N.init());
})();
