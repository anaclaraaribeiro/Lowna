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
