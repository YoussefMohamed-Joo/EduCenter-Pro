/* ===== Theme ===== */
const saved = localStorage.getItem('theme')||'light';
const isDark = saved === 'dark';
document.documentElement.classList.toggle('dark', isDark);
const themeBtn = document.getElementById('themeBtn');
themeBtn.textContent = isDark ? '☀️' : '🌙';

function toggleTheme(){
  const d = document.documentElement.classList.toggle('dark');
  themeBtn.textContent = d ? '☀️' : '🌙';
  localStorage.setItem('theme', d ? 'dark' : 'light');
}

/* ===== Mobile Menu ===== */
function toggleMobile(){
  document.getElementById('mobileMenu').classList.toggle('active');
}

/* ===== Particles ===== */
(function initParticles(){
  const c = document.getElementById('particles');
  for(let i=0;i<30;i++){
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random()*100+'%';
    p.style.animationDelay = Math.random()*8+'s';
    p.style.animationDuration = (6+Math.random()*6)+'s';
    p.style.width = p.style.height = (2+Math.random()*3)+'px';
    c.appendChild(p);
  }
})();

/* ===== Scroll Reveal ===== */
(function(){
  const els = document.querySelectorAll('.feature-card, .showcase-item, .download-card, .contact-card, .stat-card');
  const observer = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        const delay = e.target.dataset.delay||0;
        setTimeout(()=>e.target.classList.add('visible'),+delay);
        observer.unobserve(e.target);
      }
    });
  },{threshold:.1});
  els.forEach(el=>observer.observe(el));
})();

/* ===== Animated Counters ===== */
(function(){
  const nums = document.querySelectorAll('.stat-num, .stat-value span[data-target]');
  const observer = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        const el = e.target;
        const target = +el.dataset.target;
        if(!target) return;
        const dur = 2000, start = performance.now();
        function tick(now){
          const t = Math.min((now-start)/dur,1);
          el.textContent = Math.floor(t*target);
          if(t<1) requestAnimationFrame(tick);
          else el.textContent = target;
        }
        requestAnimationFrame(tick);
        observer.unobserve(el);
      }
    });
  },{threshold:.5});
  nums.forEach(el=>observer.observe(el));
})();

/* ===== Navbar Scroll Effect ===== */
(function(){
  const nav = document.getElementById('navbar');
  let last = 0;
  window.addEventListener('scroll',()=>{
    const y = window.scrollY;
    nav.style.borderBottomColor = y>20 ? 'var(--border)' : 'transparent';
    if(y>300 && y>last) nav.style.transform = 'translateY(-100%)';
    else if(y<last) nav.style.transform = 'translateY(0)';
    last = y;
  });
})();
