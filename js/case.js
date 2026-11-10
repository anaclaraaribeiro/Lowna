// Estudo de caso: entradas animadas ao rolar (mesmas classes do site principal)
// e índice lateral que marca a seção em leitura.
(function () {
  // os cantos em mira (.tick) só aparecem com o body "carregado", como na home
  document.body.classList.add('is-loaded');

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const targets = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window) || reduceMotion) {
    targets.forEach((el) => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    targets.forEach((el) => io.observe(el));
  }

  /* ---------- vídeos: tocam só quando estão na tela ---------- */
  const videos = document.querySelectorAll('video[data-autoplay]');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const vio = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (isIntersecting) target.play().catch(() => {});
        else target.pause();
      });
    }, { threshold: 0.3 });
    videos.forEach((v) => vio.observe(v));
  }
  if (reduceMotion) document.querySelectorAll('video[autoplay]').forEach((v) => { v.removeAttribute('autoplay'); v.pause(); });

  /* ---------- quadro de marca: animações só enquanto ele está na tela ---------- */
  const board = document.querySelector('.bb');
  if (board && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => board.classList.toggle('is-live', entry.isIntersecting), { threshold: 0.15 }).observe(board);
  }

  /* ---------- navbar igual à da home: gruda no topo depois da capa, menu no celular ---------- */
  const nav = document.getElementById('nav');
  const hero = document.querySelector('.cs-hero');
  const toggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');
  if (toggle && navLinks) {
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      navLinks.classList.toggle('is-open', open);
    });
    navLinks.addEventListener('click', (e) => {
      if (!e.target.closest('a')) return;
      toggle.setAttribute('aria-expanded', 'false');
      navLinks.classList.remove('is-open');
    });
  }

  /* ---------- rodapé igual ao da home: a palavra sobe com a rolagem e o brilho segue o mouse ---------- */
  const footCard = document.getElementById('footer-card');
  const footWord = document.querySelector('.footer__word span');
  if (footCard && matchMedia('(pointer: fine)').matches && !reduceMotion) {
    footCard.addEventListener('pointermove', (e) => {
      const r = footCard.getBoundingClientRect();
      footCard.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
    });
  }
  let stuck = false;
  function onFrame() {
    if (nav && hero) {
      const should = scrollY > hero.offsetHeight * 0.4;
      if (should !== stuck) { stuck = should; nav.classList.toggle('is-stuck', stuck); }
    }
    if (footCard && footWord) {
      const f = footCard.getBoundingClientRect();
      const fp = Math.min(1, Math.max(0, (innerHeight - f.top) / f.height));
      footWord.style.setProperty('--fw-y', `${((1 - fp) * 70).toFixed(2)}%`);
    }
  }
  let frameQueued = false;
  addEventListener('scroll', () => {
    if (frameQueued) return;
    frameQueued = true;
    requestAnimationFrame(() => { onFrame(); frameQueued = false; });
  }, { passive: true });
  onFrame();

  /* ---------- índice ---------- */
  const links = [...document.querySelectorAll('.cs-toc a')];
  const sections = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  if (!sections.length) return;
  let current = null;
  function setActive(id) {
    if (id === current) return;
    current = id;
    links.forEach((a) => {
      const on = a.getAttribute('href') === '#' + id;
      a.classList.toggle('is-active', on);
      if (on) {
        a.setAttribute('aria-current', 'true');
        // na faixa horizontal do celular, mantém a aba ativa à vista
        const bar = a.closest('ol');
        if (bar && bar.scrollWidth > bar.clientWidth) {
          bar.scrollTo({ left: a.offsetLeft - 24, behavior: reduceMotion ? 'auto' : 'smooth' });
        }
      } else {
        a.removeAttribute('aria-current');
      }
    });
  }
  // a seção ativa é a última cujo topo já passou de 35% da altura da tela
  function onScroll() {
    const line = innerHeight * 0.35;
    let id = sections[0].id;
    sections.forEach((s) => { if (s.getBoundingClientRect().top <= line) id = s.id; });
    setActive(id);
  }
  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { onScroll(); ticking = false; });
  }, { passive: true });
  onScroll();
})();
