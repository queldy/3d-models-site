// Simple reviews script: load/save reviews to localStorage and render them
(function(){
  const STORAGE_KEY = 'ff_reviews_v1';
  const reviewsList = document.getElementById('reviewsList');
  const form = document.getElementById('reviewForm');
  const THEME_KEY = 'ff_theme_v1';
  const themeToggle = document.getElementById('themeToggle');

  const sample = [
    {id: 'r1', name: 'Анна', rating: 5, message: 'Отличная работа! Детали идеально подошли.', date: Date.now()-1000*60*60*24*10},
    {id: 'r2', name: 'Oleg', rating: 4, message: 'Хорошее качество, быстрая доставка.', date: Date.now()-1000*60*60*24*3}
  ];

  function load(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return sample.slice();
      return JSON.parse(raw);
    }catch(e){
      console.error('Failed to load reviews', e);
      return sample.slice();
    }
  }

  function save(items){
    try{localStorage.setItem(STORAGE_KEY, JSON.stringify(items));}catch(e){console.error('Failed to save', e)}
  }

  function render(){
    const items = load().slice().reverse();
    reviewsList.innerHTML = '';
    items.forEach(it =>{
      const card = document.createElement('article');
      card.className = 'review-card';

      const meta = document.createElement('div');
      meta.className = 'review-meta';

      const who = document.createElement('strong');
      who.textContent = it.name || 'Anonymous';

      const time = document.createElement('small');
      time.className = 'muted';
      const d = new Date(it.date || Date.now());
      time.textContent = d.toLocaleDateString();

      const stars = document.createElement('div');
      stars.className = 'stars';
      stars.setAttribute('aria-hidden','true');
      stars.innerHTML = '★'.repeat(it.rating) + '☆'.repeat(5-it.rating);

      meta.appendChild(who);
      meta.appendChild(time);

      const msg = document.createElement('p');
      msg.textContent = it.message || '';

      card.appendChild(meta);
      card.appendChild(stars);
      card.appendChild(msg);

      reviewsList.appendChild(card);
    });
  }

  function addReview(review){
    const items = load();
    items.push(review);
    save(items);
    render();
  }

  if(form){
    form.addEventListener('submit', function(e){
      e.preventDefault();
      const name = document.getElementById('name').value.trim();
      const rating = parseInt(document.getElementById('rating').value,10) || 5;
      const message = document.getElementById('message').value.trim();
      if(!message) return;
      const review = {id: 'r'+Date.now(), name: name||'Guest', rating: rating, message: message, date: Date.now()};
      addReview(review);
      form.reset();
      // focus back to name for next review
      document.getElementById('name').focus();
    });
  }

  // initial render
  document.addEventListener('DOMContentLoaded', render);

  // THEME: light/dark switch with persistence and system pref fallback
  function applyTheme(theme){
    if(theme === 'light'){
      document.documentElement.setAttribute('data-theme','light');
      if(themeToggle){ themeToggle.textContent = '☀️'; themeToggle.setAttribute('aria-pressed','true'); }
    }else{
      document.documentElement.removeAttribute('data-theme');
      if(themeToggle){ themeToggle.textContent = '🌙'; themeToggle.setAttribute('aria-pressed','false'); }
    }
  }

  function getStoredTheme(){ return localStorage.getItem(THEME_KEY); }

  function getPreferredTheme(){
    const stored = getStoredTheme();
    if(stored) return stored;
    try{
      const m = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)');
      return (m && m.matches) ? 'light' : 'dark';
    }catch(e){return 'dark'}
  }

  function toggleTheme(){
    const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const next = current === 'light' ? 'dark' : 'light';
    applyTheme(next);
    try{ localStorage.setItem(THEME_KEY, next); }catch(e){/* ignore */}
  }

  document.addEventListener('DOMContentLoaded', function(){
    // initialize theme
    applyTheme(getPreferredTheme());
    if(themeToggle){
      themeToggle.addEventListener('click', function(){ toggleTheme(); });
    }
    // MOBILE NAV: toggle, accessibility handlers and relocation to body to avoid stacking context issues
    try{
      const nav = document.querySelector('.main-nav');
      const navToggle = document.getElementById('navToggle');
      const navDim = document.querySelector('[data-role="nav-dim"]');

      const closeNav = () => { document.body.classList.remove('nav-open'); if(navToggle) navToggle.setAttribute('aria-expanded','false'); };
      const openNav = () => { document.body.classList.add('nav-open'); if(navToggle) navToggle.setAttribute('aria-expanded','true'); };

      // relocate nav to document.body on small screens to avoid being covered by other stacking contexts
      const originalParent = nav ? nav.parentNode : null;
      const placeholder = document.createComment('nav-placeholder');

      function moveNavToBody(){
        if(!nav) return;
        if(nav.parentNode !== document.body){
          if(originalParent) originalParent.replaceChild(placeholder, nav);
          document.body.appendChild(nav);
          if(navDim) document.body.appendChild(navDim);
        }
      }
      function moveNavBack(){
        if(!nav || !originalParent) return;
        if(placeholder.parentNode){
          originalParent.replaceChild(nav, placeholder);
          // put dim back after header for semantics
          const header = document.querySelector('.site-header');
          if(header && navDim) header.parentNode.insertBefore(navDim, header.nextSibling);
        }
      }

      function handleResponsiveNav(){
        if(window.innerWidth <= 760){ moveNavToBody(); }
        else { moveNavBack(); closeNav(); }
      }

      // set initial placement
      handleResponsiveNav();

      // debounce resize handler
      let rT; window.addEventListener('resize', function(){ clearTimeout(rT); rT = setTimeout(handleResponsiveNav, 120); });

      if(navToggle){
        navToggle.addEventListener('click', function(e){ if(document.body.classList.contains('nav-open')) closeNav(); else openNav(); e.stopPropagation(); });
      }

      // close on dim click or outside click
      if(navDim){ navDim.addEventListener('click', closeNav); }
      document.addEventListener('click', function(e){ if(!document.body.classList.contains('nav-open')) return; const currentNav = document.querySelector('.main-nav'); if(currentNav && !currentNav.contains(e.target) && e.target !== navToggle){ closeNav(); } });

      // close on Escape and close when clicking a link
      document.addEventListener('keydown', function(e){ if(e.key === 'Escape') closeNav(); });
      document.querySelectorAll('.main-nav a').forEach(a => a.addEventListener('click', closeNav));
    }catch(e){/* ignore nav errors */}
    // Page entrance animation: add 'page-loaded' to body and stagger containers
    try{
      const prefersReduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const containers = Array.from(document.querySelectorAll('.container'));
      if(prefersReduce){
        document.body.classList.add('page-loaded');
      }else{
        // set small stagger delays
        containers.forEach((c,i)=>{ c.style.transitionDelay = (i * 70) + 'ms'; });
        // slight delay so CSS transitions feel natural
        setTimeout(()=> document.body.classList.add('page-loaded'), 80);
        // cleanup inline delays after animation completes
        setTimeout(()=> containers.forEach(c=>c.style.transitionDelay='0ms'), 1000);
      }
    }catch(e){ /* ignore */ }
  });

  // PORTFOLIO: enable toggle on touch devices / click to reveal overlay
  document.addEventListener('DOMContentLoaded', function(){
    const cards = document.querySelectorAll('.work-card');
    if(!cards || cards.length===0) return;

    // if device supports touch, allow click to toggle overlay visibility
    const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    if(isTouch){
      cards.forEach(card =>{
        card.addEventListener('click', function(e){
          // toggle active state
          if(card.classList.contains('active')){
            card.classList.remove('active');
          }else{
            // remove active from others
            document.querySelectorAll('.work-card.active').forEach(c=>c.classList.remove('active'));
            card.classList.add('active');
          }
          e.stopPropagation();
        });
      });

      // clicking outside closes any active card
      document.addEventListener('click', function(){
        document.querySelectorAll('.work-card.active').forEach(c=>c.classList.remove('active'));
      });
    }
  });

  // PRODUCTS: make product cards clickable and send to order page with product prefill
  document.addEventListener('DOMContentLoaded', function(){
    try{
      const productCards = document.querySelectorAll('.product-card');
      productCards.forEach(pc =>{
        pc.style.cursor = 'pointer';
        pc.addEventListener('click', function(){
          const product = (this.textContent || '').trim();
          const url = 'order.html' + (product ? ('?product=' + encodeURIComponent(product)) : '');
          window.location.href = url;
        });
      });
    }catch(e){}
  });
})();