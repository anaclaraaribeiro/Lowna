(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /* ---------- Entrada da hero ---------- */
  $$('.hero__in').forEach((el, i) => el.style.setProperty('--i', i));
  $$('.wm > span').forEach((el, i) => el.style.setProperty('--i', i));
  const start = () => requestAnimationFrame(() => document.body.classList.add('is-loaded'));
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(start);
  setTimeout(start, 2500);

  /* ---------- Shaders do Figma ---------- */
  const shadersReady = window.LownaShaders ? window.LownaShaders.mountAll() : Promise.resolve([]);

  /* ---------- Revelação no scroll ---------- */
  const revealTargets = $$('[data-reveal], .about__manifesto');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    revealTargets.forEach((el) => io.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- Navbar: gruda no topo depois da hero ---------- */
  const nav = $('#nav');
  const hero = $('.hero');
  let stuck = false;
  function updateNav() {
    const shouldStick = window.scrollY > hero.offsetHeight * 0.55;
    if (shouldStick !== stuck) {
      stuck = shouldStick;
      nav.classList.toggle('is-stuck', stuck);
    }
  }

  const toggle = $('#nav-toggle');
  const links = $('#nav-links');
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    links.classList.toggle('is-open', open);
  });
  links.addEventListener('click', (e) => {
    if (e.target.closest('a')) {
      toggle.setAttribute('aria-expanded', 'false');
      links.classList.remove('is-open');
    }
  });

  /* ---------- Parallax de scroll (hero e sobre) ---------- */
  const heroGrad = $('.hero__grad');
  const about = $('.about');
  const footCard = $('.footer__card');
  const footWord = $('.footer__word span');
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      updateNav();
      if (reduceMotion) return;
      const y = window.scrollY;
      if (y < hero.offsetHeight) heroGrad.style.setProperty('--sy', `${y * 0.25}px`);
      const r = about.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight) {
        const progress = (window.innerHeight - r.top) / (window.innerHeight + r.height);
        about.style.setProperty('--about-y', `${(progress - 0.5) * 120}px`);
      }
      // a palavra do rodapé sobe conforme o card entra na tela e desce ao voltar
      const f = footCard.getBoundingClientRect();
      const fp = Math.min(1, Math.max(0, (window.innerHeight - f.top) / f.height));
      footWord.style.setProperty('--fw-y', `${((1 - fp) * 70).toFixed(2)}%`);
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (!reduceMotion && finePointer) {
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      heroGrad.style.setProperty('--px', `${nx * -28}px`);
      heroGrad.style.setProperty('--py', `${ny * -20}px`);
    });
  }

  /* ---------- Botões magnéticos ---------- */
  if (!reduceMotion && finePointer) {
    $$('[data-magnetic]').forEach((btn) => {
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        btn.style.transform = `translate(${dx * 0.22}px, ${dy * 0.32}px)`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });
  }

  /* ---------- Portfólio: vídeos tocam só quando estão na tela ---------- */
  const videos = $$('video[data-autoplay]');
  if ('IntersectionObserver' in window) {
    const vio = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (isIntersecting && !reduceMotion) target.play().catch(() => {});
        else target.pause();
      });
    }, { threshold: 0.25 });
    videos.forEach((v) => vio.observe(v));
  }
  if (reduceMotion) videos.forEach((v) => { v.preload = 'metadata'; });

  /* ---------- Slides empilhados: só o ativo aparece, e só ele toca vídeo quando está na tela ---------- */
  function slideshow(root) {
    const slides = $$('[data-slide]', root);
    let current = 0;
    let visible = false;
    const sync = () => slides.forEach((s, i) => $$('video', s).forEach((v) => {
      if (i === current && visible && !reduceMotion) v.play().catch(() => {});
      else v.pause();
    }));
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { threshold: 0.2 }).observe(root);
    }
    return {
      count: slides.length,
      show(i) {
        current = i;
        slides.forEach((s, k) => s.classList.toggle('is-active', k === i));
        sync();
      },
    };
  }

  /* ---------- Hero: carrossel de trabalhos, uma barrinha por slide ---------- */
  const reel = slideshow($('#showreel'));
  const bars = $$('.showreel__bars span');
  const SLIDE_MS = 4500;
  let reelIndex = 0;
  function showReel(i) {
    reelIndex = i;
    reel.show(i);
    bars.forEach((b, k) => {
      b.classList.toggle('is-done', k < i || (reduceMotion && k === i));
      b.classList.remove('is-run');
    });
    if (reduceMotion) return;
    void bars[i].offsetWidth; // reinicia a animação da barra
    bars[i].classList.add('is-run');
  }
  document.documentElement.style.setProperty('--slide-ms', `${SLIDE_MS}ms`);
  showReel(0);
  if (!reduceMotion) setInterval(() => showReel((reelIndex + 1) % reel.count), SLIDE_MS);

  /* ---------- O que fazemos: lista interativa ---------- */
  const stack = $('#services-stack');
  const items = $$('.svc', stack);
  const image = $('#services-image');
  const desc = $('#services-desc');
  const caption = $('#services-caption');
  const visual = slideshow($('#services-visual'));
  const mdesc = $('#services-mdesc');
  const compact = window.matchMedia('(max-width: 1024px)');
  let activeIndex = 0;
  let userTookOver = false;

  function placeImage(btn) {
    if (compact.matches) return;
    const li = btn.parentElement;
    const gap = 40;
    const w = image.offsetWidth;
    const h = image.offsetHeight;
    const centerY = li.offsetTop + li.offsetHeight / 2;
    // A imagem não pode cobrir nenhum item que ela cruza na vertical.
    let s = 1, available = 0, y = 0;
    for (let pass = 0; pass < 3; pass++) {
      y = centerY - (h * s) / 2;
      const minLeft = Math.min(...items
        .filter((b) => {
          const p = b.parentElement;
          return p.offsetTop < y + h * s && p.offsetTop + p.offsetHeight > y;
        })
        .map((b) => b.offsetLeft));
      available = minLeft - gap;
      s = Math.min(1, Math.max(0.5, available / w));
    }
    y = centerY - (h * s) / 2;
    const x = Math.max(0, available - w * s);
    image.style.setProperty('--img-y', `${y}px`);
    image.style.setProperty('--img-x', `${x}px`);
    image.style.setProperty('--img-s', s.toFixed(3));
  }

  function swapText(el, text) {
    if (el.textContent === text) return;
    if (reduceMotion) { el.textContent = text; return; }
    el.classList.add('is-swapping');
    setTimeout(() => { el.textContent = text; el.classList.remove('is-swapping'); }, 280);
  }

  function activate(index) {
    if (index === activeIndex && items[index].classList.contains('is-active')) return;
    activeIndex = index;
    const btn = items[index];
    items.forEach((b, i) => {
      b.classList.toggle('is-active', i === index);
      b.setAttribute('aria-pressed', String(i === index));
    });
    placeImage(btn);
    swapText(desc, btn.dataset.desc);
    swapText(mdesc, btn.dataset.desc);
    swapText(caption, btn.dataset.caption);
    visual.show(index);
  }

  items.forEach((btn, i) => {
    btn.setAttribute('aria-pressed', String(i === 0));
    const take = () => { userTookOver = true; activate(i); };
    btn.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') take(); });
    btn.addEventListener('focus', () => { if (!compact.matches) take(); });
    btn.addEventListener('click', () => {
      if (!compact.matches) { take(); return; }
      // no celular, tocar num item rola até a fatia dele, para não brigar com o scroll
      const travel = stack.offsetHeight - pin.offsetHeight;
      const stickyTop = parseFloat(getComputedStyle(pin).top) || 0;
      const top = stack.getBoundingClientRect().top + window.scrollY - stickyTop + travel * ((i + 0.5) / items.length);
      window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });
  placeImage(items[0]);
  window.addEventListener('resize', () => placeImage(items[activeIndex]));

  // Celular/tablet: imagem + lista ficam presas na tela (sticky) e o progresso da rolagem
  // dentro da seção decide a categoria ativa, uma fatia igual para cada uma.
  const pin = $('.services__pin', stack);
  function pickByScroll() {
    if (!compact.matches) return;
    const r = stack.getBoundingClientRect();
    const travel = r.height - pin.offsetHeight;
    if (travel <= 0) return;
    const stickyTop = parseFloat(getComputedStyle(pin).top) || 0;
    const progress = Math.min(1, Math.max(0, (stickyTop - r.top) / travel));
    activate(Math.min(items.length - 1, Math.floor(progress * items.length)));
  }
  window.addEventListener('scroll', pickByScroll, { passive: true });
  compact.addEventListener('change', pickByScroll);

  if (!reduceMotion) {
    let servicesVisible = false;
    new IntersectionObserver(([entry]) => { servicesVisible = entry.isIntersecting; }, { threshold: 0.4 }).observe(stack);
    shadersReady.then(() => {
      setInterval(() => {
        if (servicesVisible && !userTookOver && !compact.matches) activate((activeIndex + 1) % items.length);
      }, 3200);
    });
  }

  /* ---------- Contato: grade de pontos animada ---------- */
  $$('.ccard').forEach((card) => {
    const canvas = $('.ccard__dots', card);
    const ctx = canvas.getContext('2d');
    const [r, g, b] = card.dataset.dots.split(',').map(Number);
    const [fx, fy] = card.dataset.focal.split(',').map(Number);
    const mouse = { x: -9999, y: -9999, k: 0 };
    let w = 0, h = 0, dpr = 1, visible = false, raf = 0;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = card.clientWidth;
      h = card.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      draw(performance.now());
    }

    function draw(t) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const sp = 15;
      const maxD = Math.hypot(w, h) * 0.75;
      const time = reduceMotion ? 0 : t / 1000;
      for (let x = sp / 2; x < w; x += sp) {
        for (let y = sp / 2; y < h; y += sp) {
          const d = Math.hypot(x - fx * w, y - fy * h) / maxD;
          let k = Math.max(0, 1 - d);
          k *= 0.88 + 0.12 * Math.sin(time * 1.6 - d * 9);
          const md = Math.hypot(x - mouse.x, y - mouse.y);
          if (md < 140) k += (1 - md / 140) * 0.7 * mouse.k;
          if (k < 0.08) continue;
          k = Math.min(k, 1.2);
          const rad = 0.8 + 1.8 * Math.min(k, 1);
          ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(1, 0.15 + k * 0.95)})`;
          ctx.beginPath();
          ctx.arc(x, y, rad, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    function loop(t) {
      if (!mouse.active) mouse.k += (0 - mouse.k) * 0.08;
      else mouse.k += (1 - mouse.k) * 0.12;
      draw(t);
      raf = visible ? requestAnimationFrame(loop) : 0;
    }

    if (!reduceMotion) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(loop);
      }).observe(card);
      card.addEventListener('pointermove', (e) => {
        const rect = card.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
        mouse.active = true;
      });
      card.addEventListener('pointerleave', () => { mouse.active = false; });
    }
    new ResizeObserver(resize).observe(card);
  });

  /* ---------- Rodapé: brilho que segue o mouse ---------- */
  const footerCard = $('#footer-card');
  if (finePointer && !reduceMotion) {
    footerCard.addEventListener('pointermove', (e) => {
      const r = footerCard.getBoundingClientRect();
      footerCard.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
    });
  }
})();
