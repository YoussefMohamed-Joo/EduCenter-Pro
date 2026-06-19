/* ===== WATERMARK ===== */
(function(){
  const el = document.getElementById('watermark');
  if(!el)return;
  const txt = 'برمجة وتطوير مهندس يوسف محمد 01033448125';
  const span = document.createElement('span');
  span.className = 'watermark-txt';
  span.textContent = txt;
  el.appendChild(span);
})();

/* ===== PLATFORM DETECTION ===== */
(function(){
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const isArm = navigator.platform.toUpperCase().indexOf('ARM') >= 0;
  const heroBtn = document.querySelector('.hero-actions .btn-primary');
  if (isMac) {
    if (heroBtn) {
      heroBtn.setAttribute('href', 'https://github.com/YoussefMohamed-Joo/EduCenter-Pro/releases/download/v1.0.2/EduCenter-Pro-1.0.2-arm64.dmg');
      heroBtn.textContent = 'تحميل مجاني (DMG)';
    }
  } else {
    if (heroBtn) {
      heroBtn.setAttribute('href', 'https://github.com/YoussefMohamed-Joo/EduCenter-Pro/releases/download/v1.0.2/EduCenter-Pro-Setup-1.0.2.exe');
      heroBtn.textContent = 'تحميل مجاني (EXE)';
    }
  }
})();

/* ===== THEME ===== */
(function(){
  const saved = localStorage.getItem('theme')||'light';
  const isDark = saved === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  const btn = document.getElementById('themeBtn');
  btn.textContent = isDark ? '☀️' : '🌙';
  window.toggleTheme = ()=>{
    const d = document.documentElement.classList.toggle('dark');
    btn.textContent = d ? '☀️' : '🌙';
    localStorage.setItem('theme', d ? 'dark' : 'light');
  };
  btn.addEventListener('click', toggleTheme);
})();

/* ===== MOBILE MENU ===== */
(function(){
  const hamburger = document.getElementById('hamburger');
  const menu = document.getElementById('navMenu');
  window.addEventListener('click', e=>{
    if(e.target === hamburger || hamburger.contains(e.target)){
      menu.classList.toggle('active');
    } else if(!menu.contains(e.target)){
      menu.classList.remove('active');
    }
  });
  document.querySelectorAll('.nav-link').forEach(link=>{
    link.addEventListener('click', ()=>menu.classList.remove('active'));
  });
})();

/* ===== NAVBAR SCROLL ===== */
(function(){
  const nav = document.getElementById('navbar');
  let last = 0;
  window.addEventListener('scroll', ()=>{
    const y = window.scrollY;
    nav.classList.toggle('scrolled', y > 20);
    if(y > 300 && y > last + 10){
      nav.classList.add('hidden');
    } else if(y < last - 10 || y < 100){
      nav.classList.remove('hidden');
    }
    last = y;
  }, {passive: true});
})();

/* ===== SCROLL REVEAL ===== */
(function(){
  const els = document.querySelectorAll('.feat-card, .show-item, .download-card, .contact-card');
  const obs = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        const delay = +(e.target.dataset.delay||0);
        setTimeout(()=>e.target.classList.add('show'), delay);
        obs.unobserve(e.target);
      }
    });
  }, {threshold: .08, rootMargin: '0px 0px -40px 0px'});
  els.forEach((el, i)=>{
    el.dataset.delay = i * 60;
    obs.observe(el);
  });
})();

/* ===== COUNTERS ===== */
(function(){
  const nums = document.querySelectorAll('[data-count]');
  const obs = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        const el = e.target;
        const target = +el.dataset.count;
        const dur = 1800;
        const start = performance.now();
        function tick(now){
          const t = Math.min((now-start)/dur, 1);
          el.textContent = Math.floor(t * target);
          if(t < 1) requestAnimationFrame(tick);
          else el.textContent = target;
        }
        requestAnimationFrame(tick);
        obs.unobserve(el);
      }
    });
  }, {threshold: .5});
  nums.forEach(el=>obs.observe(el));
})();
