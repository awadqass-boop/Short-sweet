// Short & Sweet — shared nav, menu and scroll-reveal behaviour
(function () {
  const nav = document.querySelector('.site-nav');
  const menu = document.getElementById('mobileMenu');
  const btn = document.querySelector('.menu-btn');
  if (btn && menu) {
    btn.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
    menu.addEventListener('click', e => { if (e.target.closest('a')) { menu.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); } });
  }
  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 8);
    onScroll(); window.addEventListener('scroll', onScroll, {passive: true});
  }
  const els = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } }), {threshold: 0, rootMargin: '0px 0px -8% 0px'});
    els.forEach(el => io.observe(el));
  } else els.forEach(el => el.classList.add('visible'));
  const announce = document.querySelector('.announce');
  const msg = [window.SHORT_SWEET_SEASONAL_MESSAGE, window.SHORT_SWEET_ORDER_CUTOFF_MESSAGE].filter(Boolean).join(' · ');
  if (announce && msg) announce.textContent = msg;
  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
})();
