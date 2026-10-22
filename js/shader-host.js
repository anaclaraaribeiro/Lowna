// Host WebGPU mínimo para os shaders exportados do Figma (js/effects/*).
// Segue o contrato setup(device, frame) / render(device, frame) dos arquivos de efeito:
// frame.input = textura da arte (pré-multiplicada), frame.output = textura do canvas,
// frame.params = parâmetros do Figma, frame.time = ms desde o início.
// Sem WebGPU, o <img> original continua visível (a arte sem o efeito).
(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let devicePromise = null;

  function getDevice() {
    if (!devicePromise) {
      devicePromise = (async () => {
        if (!('gpu' in navigator)) return null;
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) return null;
        return adapter.requestDevice();
      })().catch(() => null);
    }
    return devicePromise;
  }

  async function rasterize(svgText, width, height) {
    const url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      return canvas;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function createInputTexture(device, svgKey, width, height) {
    const source = await rasterize(window.LOWNA_SVG[svgKey], width, height);
    const texture = device.createTexture({
      size: [width, height, 1],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    device.queue.copyExternalImageToTexture(
      { source },
      { texture, premultipliedAlpha: true },
      [width, height]
    );
    return texture;
  }

  async function mount(el) {
    const effect = window.LownaEffects && window.LownaEffects[el.dataset.shader];
    const device = await getDevice();
    if (!effect || !device) return null;

    const animated = !!effect.manifest.isAnimated;
    // Parâmetros em pixels (tamanho de ponto, bloco do dither) foram ajustados no Figma em unidades de design,
    // então os efeitos estáticos rodam na resolução de design. O animado usa a densidade da tela.
    const scale = animated ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    // Tamanho declarado no style (vem do Figma), para funcionar mesmo com o elemento oculto no celular.
    const width = Math.max(1, Math.round((parseFloat(el.style.width) || el.offsetWidth) * scale));
    const height = Math.max(1, Math.round((parseFloat(el.style.height) || el.offsetHeight) * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.className = 'fx__canvas';
    const context = canvas.getContext('webgpu');
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: 'premultiplied' });

    const frame = {
      state: {},
      params: JSON.parse(el.dataset.params),
      input: await createInputTexture(device, el.dataset.src, width, height),
      output: null,
      time: 0,
      outputPadding: 0,
      inputPadding: 0,
    };
    effect.setup(device, frame);
    el.appendChild(canvas);

    const start = performance.now();
    function draw(now) {
      frame.output = context.getCurrentTexture();
      frame.time = now - start;
      effect.render(device, frame);
    }
    draw(start);
    el.classList.add('fx--live');

    const instance = {
      async setSource(svgKey) {
        const next = await createInputTexture(device, svgKey, width, height);
        const prev = frame.input;
        frame.input = next;
        prev.destroy();
        if (!animated || reduceMotion.matches) draw(performance.now());
      },
    };

    if (animated && !reduceMotion.matches) {
      let visible = false;
      let raf = 0;
      const loop = (now) => {
        draw(now);
        raf = visible ? requestAnimationFrame(loop) : 0;
      };
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(loop);
      }).observe(el);
    }
    return instance;
  }

  window.LownaShaders = {
    async mountAll(root = document) {
      const nodes = [...root.querySelectorAll('[data-shader]')];
      const results = await Promise.all(nodes.map((el) => mount(el).catch((err) => {
        console.warn('Shader não pôde ser iniciado, mostrando a arte original:', el.dataset.shader, err);
        return null;
      })));
      nodes.forEach((el, i) => { el.lownaShader = results[i]; });
      return results;
    },
  };
})();
