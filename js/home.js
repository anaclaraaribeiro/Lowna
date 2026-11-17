// Home: grade do "por que", lista de serviços, linha do tempo e perguntas.
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const compact = matchMedia('(max-width: 1024px)');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const watch = (el, cb, threshold = 0.3) => {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { cb(true); return; }
    new IntersectionObserver(([e]) => cb(e.isIntersecting), { threshold }).observe(el);
  };

  /* ---------- por que ter um site: o arco do centro aponta para cada card ---------- */
  const grid = document.getElementById('why-grid');
  if (grid) {
    // sentido horário: cima-esquerda, cima-direita, baixo-direita, baixo-esquerda
    const cards = ['tl', 'tr', 'br', 'bl'].map((k) => grid.querySelector(`.why__card--${k}`));
    const arc = grid.querySelector('.why__arc');
    let cur = 0, angle = -45, timer = 0, hold = false;
    const set = (i) => {
      const step = ((i - cur) % 4 + 4) % 4; // sempre gira para frente
      angle += step * 90; cur = i;
      arc.style.setProperty('--a', `${angle}deg`);
      cards.forEach((c, k) => c.classList.toggle('is-on', k === i));
    };
    cards.forEach((c, k) => {
      c.addEventListener('mouseenter', () => { hold = true; set(k); });
      c.addEventListener('mouseleave', () => { hold = false; });
    });
    if (!reduce) watch(grid, (on) => {
      clearInterval(timer);
      if (on) timer = setInterval(() => { if (!hold) set((cur + 1) % 4); }, 2600);
    });
  }

  /* ---------- qual você precisa: abas que trocam sozinhas até a pessoa escolher ---------- */
  const tabsEl = document.getElementById('need-tabs');
  if (tabsEl) {
    const tabs = [...tabsEl.querySelectorAll('.tabs__tab')];
    const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
    const bar = tabsEl.querySelector('.tabs__bar');
    const DUR = 5200;
    let cur = 0, auto = !reduce, visible = false, timer = 0;
    // as páginas de exemplo rolam só até o fim do conteúdo
    const fitScroll = (panel) => panel.querySelectorAll('.scroll').forEach((s) => {
      const box = s.parentElement;
      s.style.setProperty('--sy', `${Math.min(0, box.clientHeight - s.scrollHeight - 12)}px`);
    });
    const set = (i, focus) => {
      tabs[cur].classList.remove('is-on'); tabs[cur].setAttribute('aria-selected', 'false'); tabs[cur].tabIndex = -1;
      panels[cur].classList.remove('is-on'); panels[cur].hidden = true;
      cur = i;
      tabs[i].classList.add('is-on'); tabs[i].setAttribute('aria-selected', 'true'); tabs[i].tabIndex = 0;
      panels[i].hidden = false; void panels[i].offsetWidth; panels[i].classList.add('is-on');
      fitScroll(panels[i]);
      bar.scrollTo({ left: tabs[i].offsetLeft - (bar.clientWidth - tabs[i].offsetWidth) / 2, behavior: reduce ? 'auto' : 'smooth' });
      if (focus) tabs[i].focus();
      schedule();
    };
    // a barra azul da aba enche em CSS; o JS só agenda a próxima troca
    function schedule() {
      clearTimeout(timer);
      tabs.forEach((t) => t.classList.remove('is-timing'));
      if (!auto || !visible) return;
      void tabs[cur].offsetWidth;
      tabs[cur].classList.add('is-timing');
      timer = setTimeout(() => set((cur + 1) % tabs.length), DUR);
    }
    const stop = () => { auto = false; clearTimeout(timer); tabsEl.classList.add('is-manual'); tabs.forEach((t) => t.classList.remove('is-timing')); };
    tabs.forEach((t, k) => {
      t.addEventListener('click', () => { stop(); if (k !== cur) set(k); });
      t.addEventListener('keydown', (e) => {
        const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (d) { e.preventDefault(); stop(); set((cur + d + tabs.length) % tabs.length, true); }
      });
    });
    if (!auto) tabsEl.classList.add('is-manual');
    fitScroll(panels[0]);
    addEventListener('resize', () => fitScroll(panels[cur]));
    watch(tabsEl, (on) => { visible = on; schedule(); });
  }

  /* ---------- como funciona: a seção fica parada e a lista desliza; o passo do meio acende ---------- */
  const pin = document.getElementById('how-pin');
  if (pin) {
    const track = pin.querySelector('.how__track');
    const view = pin.querySelector('.how__view');
    const steps = [...track.querySelectorAll('.how__step')];
    const bar = track.querySelector('.how__bar');
    let centers = [], cur = -1;
    const measure = () => { centers = steps.map((s) => s.offsetTop + s.offsetHeight / 2); };
    const small = matchMedia("(max-width: 1024px), (hover: none)");
    const update = () => {
      if (small.matches) {
        let best = 0, dist = Infinity;
        steps.forEach((s, k) => { const b = s.getBoundingClientRect(); const d = Math.abs(b.top + b.height / 2 - innerHeight / 2); if (d < dist) { dist = d; best = k; } });
        if (best === cur) return;
        cur = best;
        steps.forEach((s, k) => { s.classList.toggle("is-on", k === best); s.classList.toggle("is-done", k < best); });
        bar.style.setProperty("--p0", `${Math.max(0, centers[best] - bar.offsetTop - 28)}px`);
        return;
      }
      const r = pin.getBoundingClientRect();
      const p = clamp(-r.top / (r.height - innerHeight));
      const f = p * (steps.length - 1);
      const a = Math.floor(f), b = Math.min(steps.length - 1, a + 1);
      const c = centers[a] + (centers[b] - centers[a]) * (f - a);
      // o passo atual fica no meio da janela abaixo do título
      const lo = Math.min(0, view.clientHeight - track.offsetHeight - 48);
      track.style.transform = `translateY(${Math.max(lo, Math.min(16, view.clientHeight / 2 - c)).toFixed(1)}px)`;
      const i = Math.round(f);
      if (i === cur) return;
      cur = i;
      steps.forEach((s, k) => { s.classList.toggle('is-on', k === i); s.classList.toggle('is-done', k < i); });
      bar.style.setProperty('--p0', `${Math.max(0, centers[i] - bar.offsetTop - 28)}px`);
    };
    // um passo por gesto: enquanto a seção está presa, cada rolada leva ao passo seguinte ou anterior
    const stepTop = (k) => scrollY + pin.getBoundingClientRect().top + (pin.offsetHeight - innerHeight) * (k / (steps.length - 1));
    let lockUntil = 0, lockStart = 0;
    addEventListener("wheel", (e) => {
      if (small.matches || Math.abs(e.deltaY) < 2) return;
      const r = pin.getBoundingClientRect();
      if (r.top > 2 || r.bottom < innerHeight - 2) return;
      const dir = e.deltaY > 0 ? 1 : -1;
      const now = performance.now();
      if (now < lockUntil) { e.preventDefault(); if (now - lockStart > 450) lockUntil = now + 180; return; }
      const at = Math.round(clamp(-r.top / (r.height - innerHeight)) * (steps.length - 1));
      const next = at + dir;
      if (next < 0 || next > steps.length - 1) return;
      e.preventDefault();
      lockStart = now; lockUntil = now + 650;
      scrollTo({ top: stepTop(next), behavior: reduce ? "auto" : "smooth" });
    }, { passive: false });
    measure(); update();
    addEventListener("scroll", update, { passive: true });
    addEventListener('resize', () => { measure(); cur = -1; update(); });
    addEventListener('load', () => { measure(); cur = -1; update(); });
  }

  /* ---------- perguntas: uma aberta por vez ---------- */
  const faq = document.querySelector('.faq__list');
  if (faq) faq.addEventListener('toggle', (e) => {
    if (!e.target.open) return;
    faq.querySelectorAll('details[open]').forEach((d) => { if (d !== e.target) d.open = false; });
  }, true);
})();

// Textura de pontos (a mesma dos cards de contato) para qualquer elemento com data-dots="r,g,b".
// data-focal="x,y" = de onde os pontos nascem; data-dots-base = intensidade parado (0 = só no hover/ativo).
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const els = [...document.querySelectorAll('[data-dots]')];
  const live = new Set();
  let raf = 0;
  const items = els.map((el) => {
    const canvas = document.createElement('canvas');
    canvas.className = 'dots';
    canvas.setAttribute('aria-hidden', 'true');
    el.prepend(canvas);
    const [r, g, b] = el.dataset.dots.split(',').map(Number);
    const [fx, fy] = (el.dataset.focal || '.5,.5').split(',').map(Number);
    const base = el.dataset.dotsBase !== undefined ? Number(el.dataset.dotsBase) : 1;
    const it = { el, canvas, ctx: canvas.getContext('2d'), r, g, b, fx, fy, base, sp: Number(el.dataset.dotsSp) || 15, amp: base, mouse: { x: -1e4, y: -1e4, k: 0, on: false }, w: 0, h: 0, dpr: 1 };
    el.addEventListener('pointermove', (e) => { const q = el.getBoundingClientRect(); it.mouse.x = e.clientX - q.left; it.mouse.y = e.clientY - q.top; it.mouse.on = true; });
    el.addEventListener('pointerleave', () => { it.mouse.on = false; });
    return it;
  });
  function size(it) {
    it.dpr = Math.min(devicePixelRatio || 1, 2);
    it.w = it.el.clientWidth; it.h = it.el.clientHeight;
    it.canvas.width = Math.round(it.w * it.dpr); it.canvas.height = Math.round(it.h * it.dpr);
  }
  function draw(it, t) {
    const { ctx, w, h, sp } = it;
    const target = it.el.matches(':hover') || it.el.classList.contains('is-on') ? 1 : it.base;
    it.amp += reduce ? target - it.amp : (target - it.amp) * 0.08;
    it.mouse.k += ((it.mouse.on ? 1 : 0) - it.mouse.k) * 0.1;
    ctx.setTransform(it.dpr, 0, 0, it.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (it.amp < 0.02 && it.mouse.k < 0.02) return;
    const maxD = Math.hypot(w, h) * 0.75;
    const time = reduce ? 0 : t / 1000;
    for (let x = sp / 2; x < w; x += sp) {
      for (let y = sp / 2; y < h; y += sp) {
        const d = Math.hypot(x - it.fx * w, y - it.fy * h) / maxD;
        let k = Math.max(0, 1 - d) * it.amp;
        k *= 0.88 + 0.12 * Math.sin(time * 1.6 - d * 9);
        const md = Math.hypot(x - it.mouse.x, y - it.mouse.y);
        if (md < 140) k += (1 - md / 140) * 0.6 * it.mouse.k;
        if (k < 0.08) continue;
        k = Math.min(k, 1.2);
        ctx.fillStyle = `rgba(${it.r},${it.g},${it.b},${Math.min(1, 0.12 + k * 0.9)})`;
        ctx.beginPath();
        ctx.arc(x, y, 0.7 + 1.7 * Math.min(k, 1), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  let last = 0;
  const loop = (t) => { if (t - last > 32) { last = t; live.forEach((it) => draw(it, t)); } raf = live.size && !reduce ? requestAnimationFrame(loop) : 0; };
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => {
    es.forEach((e) => { const it = items.find((i) => i.el === e.target); if (e.isIntersecting) { size(it); live.add(it); draw(it, performance.now()); } else live.delete(it); });
    if (live.size && !raf && !reduce) raf = requestAnimationFrame(loop);
  }) : null;
  items.forEach((it) => { if (io) io.observe(it.el); else { size(it); draw(it, 0); } });
  addEventListener('resize', () => items.forEach((it) => { size(it); draw(it, performance.now()); }));
  // no modo sem movimento, redesenha quando o card ativo muda
  if (reduce) items.forEach((it) => new MutationObserver(() => draw(it, 0)).observe(it.el, { attributes: true, attributeFilter: ['class'] }));
})();
