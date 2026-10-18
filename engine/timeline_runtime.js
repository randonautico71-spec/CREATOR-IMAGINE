/**
 * timeline_runtime.js — CREATOR IMAGINE Engine v1.2
 *
 * CORRECCIONES v1.1:
 * - init() ya NO se llama en DOMContentLoaded ni en módulo IIFE automático.
 * - Render determinista a través de seekTo(videoTime).
 * - Se añaden los tipos 'emoji' y 'candle' para el smoke test.
 * - Se añade el tipo 'badge'.
 *
 * MEJORAS v1.2 (Task B):
 * - Fondos procedurales Canvas2D: 'radar' y 'waves' (sin librerías externas).
 * - Animación orgánica 'wiggle' para figuras/imágenes (oscilación sinusoidal compuesta).
 * - Spring/elastic physics en renderCounter (rebote elástico en la entrada del valor).
 * - Nuevo tipo de elemento 'canvas-bg' para fondos de partículas/geométricos custom.
 * - Función easeOutElastic y easeOutSpring para físicas de resorte.
 */

(function () {
  'use strict';

  // =========================================================
  // TEMAS VISUALES INLINE
  // =========================================================
  const THEMES = {
    documentary: {
      colors: { bg: ['#160D28','#07131F','#02050A'], primary:'#FFFFFF', accent:'#FFD43B', secondary:'#55E6FF' },
      motion:  { cameraIntensity: 0.04 },
      effects: { particleDensity: 0.35, glowIntensity: 0.25 }
    },
    luxury: {
      colors: { bg: ['#0A0A0A','#111008','#0D0B00'], primary:'#F5F0E8', accent:'#C9A84C', secondary:'#E8D5A3' },
      motion:  { cameraIntensity: 0.02 },
      effects: { particleDensity: 0.2, glowIntensity: 0.15 }
    },
    sports: {
      colors: { bg: ['#0D0000','#1A0500','#0A0000'], primary:'#FFFFFF', accent:'#FF4C1A', secondary:'#FFB347' },
      motion:  { cameraIntensity: 0.07 },
      effects: { particleDensity: 0.5, glowIntensity: 0.4 }
    },
    technology: {
      colors: { bg: ['#010812','#020E1A','#000508'], primary:'#E0F0FF', accent:'#00D4FF', secondary:'#7B61FF' },
      motion:  { cameraIntensity: 0.05 },
      effects: { particleDensity: 0.6, glowIntensity: 0.5 }
    },
    dramatic: {
      colors: { bg: ['#0C0014','#130020','#060008'], primary:'#FFFFFF', accent:'#BF5CFF', secondary:'#FF6B9D' },
      motion:  { cameraIntensity: 0.06 },
      effects: { particleDensity: 0.45, glowIntensity: 0.55 }
    }
  };

  // =========================================================
  // ESTADO GLOBAL
  // =========================================================
  let timeline  = null;
  let theme     = null;
  let particles = [];
  const lottieInstances = new Map();
  const motionPathCache = new Map();

  // Referencias DOM
  const stage         = document.getElementById('stage');
  const layerContent  = document.getElementById('layer-content');
  const layerCaptions = document.getElementById('layer-captions');
  const pCanvas       = document.getElementById('particles-canvas');
  const pCtx          = pCanvas ? pCanvas.getContext('2d') : null;

  // =========================================================
  // INIT — llamado DESPUÉS de que render_worker inyecte __TIMELINE__
  // =========================================================
  function init() {
    timeline = window.__TIMELINE__;
    if (!timeline) {
      console.error('[Runtime] window.__TIMELINE__ no definido al llamar init()');
      return;
    }

    // Modo de calidad (preview reduce efectos costosos: blur, backdrop-filter,
    // sombras grandes) sin alterar el resultado visual de los modos final/master.
    if (window.__RENDER_QUALITY__ === 'preview') {
      document.body.classList.add('render-preview');
    }

    theme = THEMES[timeline.theme] || THEMES.documentary;
    applyTheme(theme);
    applyBranding();
    initParticles();
    applyGlobalEffects();

    // Registrar plugins GSAP si están disponibles
    if (typeof gsap !== 'undefined' && typeof MotionPathPlugin !== 'undefined') {
      try {
        gsap.registerPlugin(MotionPathPlugin);
      } catch (e) {}
    }

    // Señal para Playwright
    window.__RUNTIME_READY__ = true;
    console.log('[Runtime] Listo. Escenas:', (timeline.scenes || []).length);
  }

  // =========================================================
  // APLICAR TEMA
  // =========================================================
  function applyTheme(t) {
    const r = document.documentElement;
    r.style.setProperty('--accent',    t.colors.accent);
    r.style.setProperty('--primary',   t.colors.primary);
    r.style.setProperty('--secondary', t.colors.secondary);
    r.style.setProperty('--bg-1', t.colors.bg[0] || '#160D28');
    r.style.setProperty('--bg-2', t.colors.bg[1] || '#07131F');
    r.style.setProperty('--bg-3', t.colors.bg[2] || '#02050A');
    stage.style.background =
      `linear-gradient(180deg, ${t.colors.bg[0]} 0%, ${t.colors.bg[1]} 50%, ${t.colors.bg[2]} 100%)`;
  }

  // =========================================================
  // BRANDING
  // =========================================================
  function applyBranding() {
    const bn = document.getElementById('brand-name');
    const bt = document.getElementById('brand-tag');
    if (bn && timeline.meta) bn.textContent = timeline.meta.brand || 'CREATOR IMAGINE';
    if (bt && timeline.meta) bt.textContent = timeline.meta.brandTag || '';
  }

  // =========================================================
  // PARTÍCULAS
  // =========================================================
  function initParticles() {
    if (!pCtx) return;
    pCanvas.width  = 1080;
    pCanvas.height = 1920;
    let count = Math.floor((theme.effects.particleDensity || 0.35) * 200);
    const particleLimit = window.__PARTICLE_LIMIT__;
    if (typeof particleLimit === 'number') count = Math.min(count, particleLimit);
    particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x:       Math.random() * 1080,
        y:       Math.random() * 1920,
        r:       Math.random() * 2.5 + 0.5,
        speed:   Math.random() * 0.4 + 0.1,
        opacity: Math.random() * 0.6 + 0.1,
        color:   Math.random() > 0.7 ? theme.colors.accent : '#FFFFFF',
        seed:    Math.random() * 1000   // semilla para posición determinista
      });
    }
  }

  /**
   * Dibuja las partículas en una posición determinista para el tiempo t.
   * No modifica el estado global para que el mismo t → mismo frame.
   */
  function drawParticles(t) {
    if (!pCtx) return;
    pCtx.clearRect(0, 0, 1080, 1920);
    const glow = theme.effects.glowIntensity > 0.3;

    particles.forEach(p => {
      // Posición determinista: seed + tiempo
      const drift  = (p.seed + t * p.speed * 60) % 1920;
      const py     = 1920 - drift;
      const px     = p.x;

      pCtx.beginPath();
      pCtx.arc(px, py, p.r, 0, Math.PI * 2);
      if (glow) {
        pCtx.shadowBlur  = p.r * 5;
        pCtx.shadowColor = p.color;
      }
      pCtx.fillStyle = hexToRgba(p.color, p.opacity);
      pCtx.fill();
    });
    pCtx.shadowBlur = 0;
  }

  // =========================================================
  // EFECTOS GLOBALES
  // =========================================================
  function applyGlobalEffects() {
    const fx = timeline.globalEffects || {};
    const v  = document.querySelector('.fx-vignette');
    if (v && fx.vignette != null) v.style.opacity = fx.vignette;
  }

  // =========================================================
  // seekTo — API pública principal
  // Render determinista: el mismo videoTime → mismo frame
  // =========================================================
  function seekTo(videoTime) {
    // 1. Determinar qué escena está activa
    let elapsed  = 0;
    let sceneIdx = 0;
    for (let i = 0; i < (timeline.scenes || []).length; i++) {
      const dur = timeline.scenes[i].duration || 0;
      if (videoTime < elapsed + dur) {
        sceneIdx = i;
        break;
      }
      elapsed += dur;
      sceneIdx = i;
    }

    const localTime = videoTime - elapsed;
    const scene     = timeline.scenes[sceneIdx];

    // 2. Limpiar capas mutables
    layerContent.innerHTML  = '';
    layerCaptions.innerHTML = '';
    const overlay = document.getElementById('layer-overlay');
    if (overlay) overlay.innerHTML = '';
    document.querySelectorAll('#layer-bg .c-figure, #layer-bg .c-image, #layer-bg .c-lottie').forEach(n => n.remove());

    // 3. Reset cámara
    stage.style.transform = '';

    // 4. Renderizar fondo y efecto de cámara
    (scene.elements || []).forEach(el => {
      switch (el.type) {
        case 'background': renderBackground(el); break;
        case 'camera':     applyCameraEffect(el, localTime); break;
      }
    });

    // 5. Partículas (deterministas)
    drawParticles(videoTime);

    // 6. Renderizar resto de elementos
    (scene.elements || []).forEach(el => {
      switch (el.type) {
        case 'title':      renderTitle(el, localTime);   break;
        case 'badge':      renderBadge(el, localTime);   break;
        case 'counter':    renderCounter(el, localTime); break;
        case 'caption':    renderCaption(el, videoTime); break;
        case 'ranking':    renderRanking(el, localTime); break;
        case 'card':       renderCard(el, localTime);    break;
        case 'emoji':      renderEmoji(el, localTime);   break;
        case 'candle':     renderCandle(el, localTime);  break;
        case 'figure':     renderFigure(el, localTime);  break;
        case 'image':      renderImage(el, localTime);   break;
        case 'lottie':     renderLottie(el, localTime, sceneIdx); break;
        case 'canvas-bg':  renderCanvasBg(el, localTime, videoTime); break;
        // background y camera ya procesados
      }
    });
  }

  // =========================================================
  // UTILIDAD: visibilidad determinista por delay
  // Un elemento aparece cuando localTime > delay
  // La "animación" se calcula como progreso desde el delay
  // =========================================================
  function getAnimProgress(localTime, delay, animDuration) {
    delay       = delay       || 0;
    animDuration= animDuration || 0.5;
    if (localTime < delay) return 0;
    return Math.min((localTime - delay) / animDuration, 1);
  }

  function easeOutCubic(t)   { return 1 - Math.pow(1 - t, 3); }
  function easeOutExpo(t)    { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }

  /**
   * Spring elástico: simula un resorte amortiguado.
   * amplitude: amplitud del rebote (0.3–0.6 recomendado)
   * period: longitud del período de oscilación
   */
  function easeOutElastic(t, amplitude, period) {
    amplitude = amplitude || 0.4;
    period    = period    || 0.5;
    if (t === 0 || t === 1) return t;
    const s = (period / (2 * Math.PI)) * Math.asin(1 / amplitude);
    return amplitude * Math.pow(2, -10 * t) * Math.sin(((t - s) * (2 * Math.PI)) / period) + 1;
  }

  /**
   * Damped spring physics: x = 1 - e^(-zeta*omega*t) * cos(omega_d * t)
   * Produce un overshooting natural con decay exponencial.
   */
  function easeOutSpring(t, tension, friction) {
    tension = tension || 180;
    friction = friction || 12;
    const omega0 = Math.sqrt(tension);
    const zeta   = friction / (2 * Math.sqrt(tension));
    if (zeta < 1) {
      // Sub-amortiguado (rebota)
      const omegaD = omega0 * Math.sqrt(1 - zeta * zeta);
      return 1 - Math.exp(-zeta * omega0 * t) * (
        Math.cos(omegaD * t) + (zeta / Math.sqrt(1 - zeta * zeta)) * Math.sin(omegaD * t)
      );
    }
    // Sobreamortiguado (sin rebote)
    return 1 - Math.exp(-omega0 * t);
  }

  // =========================================================
  // RENDERIZADORES — deterministas
  // =========================================================

  // --- TÍTULO ---
  function renderTitle(el, lt) {
    const delay    = el.delay    || 0;
    const animDur  = 0.5;
    const progress = getAnimProgress(lt, delay, animDur);
    if (progress <= 0) return;

    const ease = easeOutCubic(progress);
    const div  = document.createElement('div');
    div.className = `c-title size-${el.size || 'lg'}`;
    positionElement(div, el.position, 'center');

    // Construir texto con accentWords
    const accentSet = new Set(el.accentWords || []);
    const words     = (el.text || '').split(' ');
    let html = words.map(w => {
      const clean = w.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9]/g, '');
      return accentSet.has(clean)
        ? `<span class="accent-word">${w}</span>`
        : w;
    }).join(' ');
    if (el.subtext) html += `<span class="subtext">${el.subtext}</span>`;
    div.innerHTML = html;

    // Animación determinista: rise
    const translateY  = (1 - ease) * 60;
    div.style.opacity   = String(ease);
    div.style.transform = div.style.transform.replace(/translateY\([^)]+\)/, '')
      + ` translateY(${translateY}px)`;

    layerContent.appendChild(div);
  }

  // --- BADGE ---
  function renderBadge(el, lt) {
    const progress = getAnimProgress(lt, el.delay || 0, 0.4);
    if (progress <= 0) return;

    const span = document.createElement('div');
    span.className = `c-badge${el.style ? ' style-' + el.style : ''}`;
    if (el.color) span.style.background = el.color;
    span.textContent = el.text || '';
    positionElement(span, el.position, 'top-center');

    const ease = easeOutCubic(progress);
    span.style.opacity   = String(ease);
    span.style.transform = span.style.transform + ` scale(${0.7 + ease * 0.3})`;
    layerContent.appendChild(span);
  }

  // --- COUNTER (con spring physics en la entrada) ---
  function renderCounter(el, lt) {
    const delay    = el.delay         || 0;
    const countDur = el.countDuration || 1.5;
    const progress = getAnimProgress(lt, delay, 0.4);
    if (progress <= 0) return;

    const countProg = getAnimProgress(lt, delay, countDur);
    const ease      = easeOutExpo(countProg);
    const from      = el.valueStart || 0;
    const to        = el.value      || 0;
    const current   = from + (to - from) * ease;
    const dec       = el.decimals   || 0;
    const formatted = formatNumber(current, dec);

    // Spring physics en la entrada: rebote elástico en escala al aparecer
    const entryDur    = el.entryDuration || 0.8;
    const entryProg   = getAnimProgress(lt, delay, entryDur);
    const useTension  = el.springTension  || 180;
    const useFriction = el.springFriction || 12;
    const springScale = entryProg < 1
      ? easeOutSpring(Math.min(entryProg, 1), useTension, useFriction)
      : 1;
    const entryScale  = 0.65 + springScale * 0.35;

    const wrapper = document.createElement('div');
    wrapper.className = 'c-counter counter-card';
    positionElement(wrapper, el.position, 'center');

    const prefix = el.prefix ? `<span class="prefix">${el.prefix}</span>` : '';
    const suffix = el.suffix ? `<span class="suffix">${el.suffix}</span>` : '';
    wrapper.innerHTML = `
      <div class="value">${prefix}<span class="num">${formatted}</span>${suffix}</div>
      <div class="label">${el.label || ''}</div>
      ${el.sublabel ? `<div class="sublabel">${el.sublabel}</div>` : ''}
    `;

    const vis = easeOutCubic(Math.min(progress, 1));
    wrapper.style.opacity   = String(vis);
    wrapper.style.transform = (wrapper.style.transform || '') + ` scale(${entryScale})`;
    layerContent.appendChild(wrapper);
  }

  // --- CAPTION ---
  function renderCaption(el, videoTime) {
    const box = document.createElement('div');
    box.className = `c-captions style-${el.style || 'standard'}`;
    positionElement(box, el.position || { y: 0.85, anchor: 'bottom-center' }, 'bottom-center');

    const inner = document.createElement('div');
    inner.className = 'caption-box';

    if (el.words && el.words.length > 0) {
      el.words.forEach(w => {
        const span = document.createElement('span');
        span.className = 'caption-word' + (videoTime >= w.start && videoTime < w.end ? ' active' : '');
        if (w.accent && !(videoTime >= w.start && videoTime < w.end)) {
          // accentWords que no están activas se muestran con color secundario
        }
        span.textContent = w.word + ' ';
        inner.appendChild(span);
      });
    } else if (el.text) {
      // Fix: el texto plano (captions sin "words") no heredaba el estilo de
      // .caption-word (color/tamaño/text-shadow), por lo que se renderizaba
      // en negro invisible sobre el fondo oscuro. Se envuelve igual que las
      // palabras con timestamp para que use el mismo estilo visible.
      const span = document.createElement('span');
      span.className = 'caption-word';
      span.textContent = el.text;
      inner.appendChild(span);
    }

    box.appendChild(inner);
    layerCaptions.appendChild(box);
  }

  // --- RANKING ---
  function renderRanking(el, lt) {
    const baseDelay = el.delay   || 0;
    const stagger   = el.stagger || 0.15;

    const wrapper = document.createElement('div');
    wrapper.className = 'c-ranking';
    positionElement(wrapper, el.position || { x: 0.5, y: 0.3, anchor: 'top-center' }, 'top-center');

    if (el.title) {
      const t = document.createElement('div');
      t.className   = 'ranking-title';
      t.textContent = el.title;
      wrapper.appendChild(t);
    }

    (el.items || []).forEach((item, idx) => {
      const row = document.createElement('div');
      const itemDelay = baseDelay + idx * stagger;
      const progress  = getAnimProgress(lt, itemDelay, 0.4);

      row.className = `ranking-item${item.highlight ? ' highlight' : ''}`;

      const rankClass = idx === 0 ? ' top-1' : idx === 1 ? ' top-2' : idx === 2 ? ' top-3' : '';
      row.innerHTML = `
        <div class="rank-num${rankClass}">#${item.rank}</div>
        ${item.flag ? `<div class="rank-flag">${item.flag}</div>` : ''}
        <div class="rank-label">${item.label}</div>
        <div class="rank-value">${item.value}</div>
      `;

      const ease = easeOutCubic(Math.max(0, Math.min(progress, 1)));
      row.style.opacity   = String(ease);
      row.style.transform = `translateX(${(1 - ease) * -40}px)`;
      // Quitar transición CSS para render determinista
      row.style.transition = 'none';
      wrapper.appendChild(row);
    });

    layerContent.appendChild(wrapper);
  }

  // --- CARD ---
  function renderCard(el, lt) {
    const progress = getAnimProgress(lt, el.delay || 0, 0.5);
    if (progress <= 0) return;
    const ease = easeOutCubic(progress);

    const card = document.createElement('div');
    card.className = 'c-card';
    positionElement(card, el.position, 'center');

    card.innerHTML = `
      ${el.icon  ? `<div class="card-icon">${el.icon}</div>`   : ''}
      ${el.badge ? `<div class="card-badge">${el.badge}</div>` : ''}
      <div class="card-title">${el.title || ''}</div>
      ${el.value       ? `<div class="card-value">${el.value}</div>` : ''}
      ${el.description ? `<div class="card-desc">${el.description}</div>` : ''}
    `;

    if (el.accentColor) card.style.borderColor = el.accentColor + '40';
    card.style.opacity   = String(ease);
    card.style.transform = card.style.transform + ` translateY(${(1 - ease) * 40}px)`;
    layerContent.appendChild(card);
  }

  // --- EMOJI ---
  function renderEmoji(el, lt) {
    const progress = getAnimProgress(lt, el.delay || 0, 0.4);
    if (progress <= 0) return;
    const ease = easeOutCubic(progress);

    // Animación de float determinista (sin CSS animation — usamos sin(t))
    const floatY = Math.sin(lt * 2 * Math.PI / 3) * 14;

    const div = document.createElement('div');
    div.className = 'c-emoji';
    div.textContent = el.emoji || '⭐';
    positionElement(div, el.position, 'center');

    div.style.opacity   = String(ease);
    div.style.transform = div.style.transform
      + ` scale(${0.6 + ease * 0.4}) translateY(${floatY}px)`;
    if (el.size) div.style.fontSize = el.size;
    layerContent.appendChild(div);
  }

  // --- CANDLE ---
  function renderCandle(el, lt) {
    const progress = getAnimProgress(lt, el.delay || 0, 0.5);
    if (progress <= 0) return;
    const ease = easeOutCubic(progress);

    // Flicker determinista: sin con alta frecuencia
    const flicker    = 1 + Math.sin(lt * 12.3) * 0.06 + Math.sin(lt * 7.7) * 0.04;
    const flickerX   = Math.sin(lt * 9.1) * 5;

    const wrapper = document.createElement('div');
    wrapper.className = 'c-candle';
    positionElement(wrapper, el.position, 'center');

    wrapper.innerHTML = `
      <div class="flame" style="transform:scaleX(${flicker}) translateX(${flickerX}px);"></div>
      <div class="body" style="height:${el.height || 120}px; width:${el.width || 36}px; background:${el.color||'linear-gradient(180deg,#e8e8e8,#c8c8c8)'};"></div>
    `;

    wrapper.style.opacity   = String(ease);
    wrapper.style.transform = wrapper.style.transform + ` scale(${0.7 + ease * 0.3})`;
    layerContent.appendChild(wrapper);
  }

  // =========================================================
  // BIBLIOTECA VECTORIAL DE SILUETAS (FIGURAS Y PAISAJES)
  // =========================================================
  const SVG_SHAPES = {
    'dinosaur-trex': `<svg viewBox="0 0 800 600" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M120 460 C150 420 190 410 230 420 C280 430 330 400 370 350 C410 300 450 260 520 240 C550 230 600 210 630 150 C650 120 680 70 730 60 C760 55 800 50 820 70 C840 90 830 130 800 145 C770 160 780 180 810 190 C790 210 750 220 710 210 C680 200 670 230 640 260 C620 290 600 340 570 380 C540 410 500 440 450 460 C400 480 430 510 440 550 C410 555 390 540 380 520 C370 490 350 460 330 450 C300 440 270 510 260 550 C240 550 220 540 225 515 C230 475 250 450 220 435 C170 425 130 440 80 470 C60 480 40 480 30 470 C25 460 60 460 120 460 Z M560 310 C580 300 600 320 590 335 C580 345 565 340 555 325 Z M750 100 C740 100 735 90 745 85 C755 80 760 90 750 100 Z"/>
    </svg>`,

    'dinosaur-brachiosaurus': `<svg viewBox="0 0 800 600" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M100 480 C130 460 180 450 220 450 C250 410 270 360 300 330 C340 310 400 290 450 240 C500 190 530 130 560 70 C570 50 585 30 610 25 C630 20 650 30 655 45 C660 65 640 85 620 95 C590 150 565 220 535 290 C510 350 480 380 470 410 C460 450 460 500 470 550 C445 550 435 540 430 510 C425 470 410 440 380 440 C350 440 340 490 335 550 C310 550 300 540 300 505 C300 470 280 445 250 450 C200 455 160 470 120 490 C90 500 80 490 100 480 Z M630 50 C625 50 620 45 625 40 C630 35 635 40 630 50 Z"/>
    </svg>`,

    'dinosaur-raptor': `<svg viewBox="0 0 800 500" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 310 C100 290 160 280 220 280 C260 270 300 240 340 210 C390 170 430 130 480 110 C510 100 550 90 580 60 C600 40 630 30 660 35 C680 40 690 60 670 75 C650 90 660 105 680 110 C660 120 630 125 610 120 C580 135 560 160 540 190 C510 230 480 260 430 280 C390 300 370 330 370 370 C370 410 380 440 390 470 C370 470 350 460 340 430 C330 400 320 370 300 350 C280 340 260 380 250 420 C235 435 220 430 220 400 C220 370 230 340 200 325 C150 320 100 325 50 340 C35 345 25 335 35 325 C40 320 45 315 50 310 Z M460 220 C480 210 495 230 485 240 C475 250 460 240 455 230 Z M640 65 C635 65 630 60 635 55 C640 50 645 55 640 65 Z"/>
    </svg>`,

    'mountains': `<svg viewBox="0 0 1000 500" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 500 L0 380 L120 280 L220 340 L380 180 L490 270 L620 120 L750 260 L850 190 L1000 330 L1000 500 Z"/>
      <path d="M220 340 L380 180 L430 220 L350 340 Z" fill="rgba(255,255,255,0.15)"/>
      <path d="M490 270 L620 120 L670 180 L590 290 Z" fill="rgba(255,255,255,0.18)"/>
      <path d="M750 260 L850 190 L900 230 L840 310 Z" fill="rgba(255,255,255,0.12)"/>
    </svg>`,

    'volcano': `<svg viewBox="0 0 800 600" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 600 L180 500 L320 320 L380 280 L440 280 L500 320 L640 500 L800 600 Z"/>
      <path d="M380 280 L350 220 C340 180 370 140 400 120 C430 100 450 130 460 170 C470 200 450 250 440 280 Z" fill="#FF4C1A"/>
      <path d="M390 240 C370 190 380 120 410 70 C430 40 460 70 450 110 C440 150 430 200 420 240 Z" fill="#FFD43B"/>
      <path d="M375 285 C390 330 380 380 370 420 C360 460 340 520 330 600 L410 600 C420 530 430 470 430 420 C430 360 420 320 435 285 Z" fill="#FF6B1A" opacity="0.8"/>
    </svg>`,

    'city-skyline': `<svg viewBox="0 0 1000 500" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 500 L0 390 L40 390 L40 420 L90 420 L90 320 L130 320 L130 360 L180 360 L180 250 L220 250 L220 180 L230 140 L235 140 L240 180 L240 250 L270 250 L270 370 L320 370 L320 290 L380 290 L380 210 L440 210 L440 160 L445 110 L450 110 L455 160 L455 210 L500 210 L500 350 L560 350 L560 270 L620 270 L620 190 L680 190 L680 310 L730 310 L730 230 L790 230 L790 360 L850 360 L850 280 L910 280 L910 400 L950 400 L950 370 L1000 370 L1000 500 Z"/>
    </svg>`,

    'planet': `<svg viewBox="0 0 600 600" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <circle cx="300" cy="300" r="160"/>
      <ellipse cx="300" cy="300" rx="270" ry="40" fill="none" stroke="currentColor" stroke-width="18" transform="rotate(-22 300 300)" opacity="0.9"/>
      <path d="M140 300 A160 160 0 0 0 460 300 Z" fill="rgba(0,0,0,0.35)"/>
    </svg>`,

    'meteor': `<svg viewBox="0 0 600 400" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M60 340 C140 280 260 210 460 90 C340 160 220 230 160 280 Z" fill="#FF8C00" opacity="0.6"/>
      <path d="M120 300 C200 240 340 170 510 70 C390 140 280 200 210 260 Z" fill="#FFD43B" opacity="0.8"/>
      <circle cx="520" cy="65" r="45" fill="#FFF"/>
      <circle cx="520" cy="65" r="35" fill="#FFD43B"/>
      <circle cx="520" cy="65" r="22" fill="#FF4C1A"/>
    </svg>`,

    // =======================================================
    // FIGURAS HUMANAS Y ENTIDADES
    // =======================================================
    'person-standing': `<svg viewBox="0 0 300 650" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="150" cy="80" rx="55" ry="60" fill="#F2C49B"/>
      <path d="M150 140 C95 140 70 180 70 232 L70 420 L230 420 L230 232 C230 180 205 140 150 140 Z" fill="#3B6EA8"/>
      <path d="M70 232 C45 250 30 300 28 360 L55 365 C58 310 68 265 85 240 Z" fill="#345F93"/>
      <path d="M230 232 C255 250 270 300 272 360 L245 365 C242 310 232 265 215 240 Z" fill="#345F93"/>
      <path d="M90 420 L90 615 C90 632 104 644 121 644 L131 644 C142 644 147 632 147 615 L147 440 L153 440 L153 615 C153 632 158 644 169 644 L179 644 C196 644 210 632 210 615 L210 420 Z" fill="#2B2B35"/>
      <ellipse cx="118" cy="644" rx="26" ry="8" fill="#17171C"/>
      <ellipse cx="182" cy="644" rx="26" ry="8" fill="#17171C"/>
    </svg>`,

    'person-sitting': `<svg viewBox="0 0 400 350" xmlns="http://www.w3.org/2000/svg">
      <circle cx="150" cy="60" r="48" fill="#F2C49B"/>
      <path d="M150 108 C105 108 85 140 85 178 L85 230 L215 230 L215 178 C215 140 195 108 150 108 Z" fill="#3B6EA8"/>
      <path d="M85 178 C62 192 50 220 50 250 L72 255 C73 228 80 205 92 192 Z" fill="#345F93"/>
      <path d="M215 178 C238 192 250 220 250 250 L228 255 C227 228 220 205 208 192 Z" fill="#345F93"/>
      <path d="M85 230 L85 258 C85 273 96 283 113 283 L160 283 L160 230 Z" fill="#2B2B35"/>
      <path d="M215 230 L215 258 C215 273 204 283 187 283 L160 283 L160 230 Z" fill="#2B2B35"/>
      <rect x="100" y="283" width="26" height="55" rx="7" fill="#2B2B35"/>
      <rect x="194" y="283" width="26" height="55" rx="7" fill="#2B2B35"/>
      <ellipse cx="113" cy="340" rx="24" ry="8" fill="#17171C"/>
      <ellipse cx="207" cy="340" rx="24" ry="8" fill="#17171C"/>
    </svg>`,

    'entity-glow': `<svg viewBox="0 0 300 650" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="entityGlowGrad" cx="50%" cy="32%" r="68%">
          <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.95"/>
          <stop offset="55%" stop-color="#8FD9FF" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="#8FD9FF" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <path d="M150 55 C182 55 207 85 207 125 C207 157 190 180 172 194 C222 216 248 272 251 342 L257 520 C259 562 230 602 189 617 C163 626 137 626 111 617 C70 602 41 562 43 520 L49 342 C52 272 78 216 128 194 C110 180 93 157 93 125 C93 85 118 55 150 55 Z" fill="url(#entityGlowGrad)"/>
    </svg>`,

    // =======================================================
    // CASA, HABITACIÓN Y MOBILIARIO
    // =======================================================
    'house': `<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="560" width="800" height="40" fill="#5E8A4A"/>
      <rect x="180" y="280" width="440" height="280" fill="#D9B48F"/>
      <path d="M140 300 L400 120 L660 300 Z" fill="#8B3A2A"/>
      <path d="M170 296 L400 155 L630 296 Z" fill="#A6472F"/>
      <rect x="520" y="140" width="50" height="95" fill="#8B5A45"/>
      <rect x="360" y="420" width="80" height="140" rx="6" fill="#5A3324"/>
      <circle cx="420" cy="495" r="5" fill="#FFD43B"/>
      <rect x="230" y="340" width="70" height="70" rx="4" fill="#BFEFFF"/>
      <rect x="500" y="340" width="70" height="70" rx="4" fill="#BFEFFF"/>
      <g stroke="#5A3324" stroke-width="6" fill="none">
        <rect x="230" y="340" width="70" height="70" rx="4"/>
        <rect x="500" y="340" width="70" height="70" rx="4"/>
        <line x1="265" y1="340" x2="265" y2="410"/>
        <line x1="230" y1="375" x2="300" y2="375"/>
        <line x1="535" y1="340" x2="535" y2="410"/>
        <line x1="500" y1="375" x2="570" y2="375"/>
      </g>
    </svg>`,

    'room-interior': `<svg viewBox="0 0 1080 1200" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="1080" height="820" fill="#2E2A3D"/>
      <rect x="0" y="820" width="1080" height="380" fill="#3B2E22"/>
      <rect x="0" y="815" width="1080" height="14" fill="#241C29"/>
      <rect x="140" y="160" width="320" height="420" rx="10" fill="#140E1E"/>
      <rect x="162" y="182" width="276" height="376" fill="#4C6FA5" opacity="0.55"/>
      <g stroke="#140E1E" stroke-width="10">
        <line x1="300" y1="182" x2="300" y2="558"/>
        <line x1="162" y1="370" x2="438" y2="370"/>
      </g>
      <rect x="650" y="90" width="20" height="500" fill="#4A3C2C" opacity="0.4"/>
    </svg>`,

    'sofa': `<svg viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg">
      <rect x="40" y="330" width="720" height="50" rx="10" fill="#4B3160"/>
      <rect x="60" y="180" width="680" height="160" rx="30" fill="#7A4E9E"/>
      <rect x="60" y="120" width="680" height="110" rx="28" fill="#8E5FB5"/>
      <rect x="40" y="140" width="90" height="190" rx="24" fill="#6F4690"/>
      <rect x="670" y="140" width="90" height="190" rx="24" fill="#6F4690"/>
      <rect x="150" y="150" width="200" height="90" rx="20" fill="#9A6FC2"/>
      <rect x="380" y="150" width="200" height="90" rx="20" fill="#9A6FC2"/>
      <rect x="40" y="370" width="36" height="28" rx="5" fill="#2E1E3D"/>
      <rect x="724" y="370" width="36" height="28" rx="5" fill="#2E1E3D"/>
    </svg>`,

    'table': `<svg viewBox="0 0 700 400" xmlns="http://www.w3.org/2000/svg">
      <rect x="60" y="120" width="580" height="30" rx="6" fill="#B98554"/>
      <rect x="60" y="150" width="580" height="8" fill="#8A5F3B" opacity="0.5"/>
      <rect x="88" y="158" width="26" height="200" fill="#8A5F3B"/>
      <rect x="586" y="158" width="26" height="200" fill="#8A5F3B"/>
      <rect x="150" y="158" width="20" height="186" fill="#6E4A2C" opacity="0.35"/>
      <rect x="530" y="158" width="20" height="186" fill="#6E4A2C" opacity="0.35"/>
    </svg>`,

    'lamp-floor': `<svg viewBox="0 0 300 700" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="lampGlowGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#FFE9A8" stop-opacity="0.9"/>
          <stop offset="100%" stop-color="#FFE9A8" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="150" cy="235" r="130" fill="url(#lampGlowGrad)"/>
      <ellipse cx="150" cy="650" rx="60" ry="14" fill="#2B2B35"/>
      <rect x="142" y="300" width="16" height="350" fill="#3B3B46"/>
      <path d="M80 220 L220 220 L250 300 L50 300 Z" fill="#E8C98A"/>
      <ellipse cx="150" cy="235" rx="55" ry="60" fill="#FFF3CE" opacity="0.9"/>
    </svg>`,

    'bush': `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="260" width="400" height="40" fill="#375C2B"/>
      <ellipse cx="120" cy="190" rx="110" ry="90" fill="#3F7D3A"/>
      <ellipse cx="230" cy="160" rx="130" ry="110" fill="#4C9348"/>
      <ellipse cx="320" cy="200" rx="90" ry="75" fill="#3F7D3A"/>
      <ellipse cx="220" cy="140" rx="50" ry="35" fill="#5FAE56" opacity="0.6"/>
    </svg>`,

    'entrance-gate': `<svg viewBox="0 0 700 500" xmlns="http://www.w3.org/2000/svg">
      <rect x="60" y="80" width="26" height="380" fill="#6B4A32"/>
      <rect x="614" y="80" width="26" height="380" fill="#6B4A32"/>
      <path d="M86 150 C86 55 614 55 614 150 L588 150 C588 85 112 85 112 150 Z" fill="#6B4A32"/>
      <path d="M110 150 C110 90 590 90 590 150" stroke="#2E7D4F" stroke-width="16" fill="none" stroke-linecap="round"/>
      <path d="M150 140 C150 100 250 95 300 125" stroke="#4C9348" stroke-width="8" fill="none" stroke-linecap="round" opacity="0.8"/>
      <path d="M400 125 C450 95 550 100 550 140" stroke="#4C9348" stroke-width="8" fill="none" stroke-linecap="round" opacity="0.8"/>
    </svg>`,

    'grass': `<svg viewBox="0 0 1080 200" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 200 L0 70 L40 100 L80 60 L120 95 L160 55 L200 90 L240 50 L280 85 L320 58 L360 92 L400 55 L440 88 L480 52 L520 90 L560 58 L600 95 L640 55 L680 90 L720 58 L760 95 L800 55 L840 90 L880 58 L920 95 L960 55 L1000 90 L1040 60 L1080 85 L1080 200 Z" fill="#4C8A3B"/>
      <path d="M0 200 L0 110 L50 135 L100 100 L150 140 L200 105 L250 138 L300 100 L350 140 L400 105 L450 138 L500 100 L550 140 L600 105 L650 138 L700 100 L750 140 L800 105 L850 138 L900 100 L950 140 L1000 105 L1050 138 L1080 110 L1080 200 Z" fill="#3B6E2D"/>
    </svg>`,

    // =======================================================
    // FAUNA MARINA
    // =======================================================
    'whale': `<svg viewBox="0 0 900 500" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M80 250 C80 180 130 130 220 120 C330 108 480 115 600 125 C700 133 780 150 820 190 C855 225 850 270 810 300 C770 330 700 340 620 338 C540 336 440 330 360 340 C280 350 200 380 150 390 C110 398 80 370 80 340 Z"/>
      <path d="M820 190 C845 175 870 160 890 150 C875 160 875 180 870 200 C865 220 855 235 840 240 C835 215 830 200 820 190 Z" opacity="0.8"/>
      <path d="M150 390 C140 420 110 460 80 480 C70 485 60 470 65 455 C72 435 90 415 110 400 Z" opacity="0.75"/>
      <path d="M150 390 C160 418 180 455 200 475 C190 480 178 468 165 450 C152 432 146 410 150 390 Z" opacity="0.6"/>
      <ellipse cx="755" cy="200" rx="12" ry="8" fill="rgba(255,255,255,0.9)"/>
      <path d="M380 295 C430 275 500 270 560 285 C580 295 570 315 550 320 C500 325 440 320 390 310 Z" fill="rgba(255,255,255,0.2)"/>
    </svg>`,

    'shark': `<svg viewBox="0 0 900 450" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 280 C120 260 220 250 350 245 C480 240 620 238 750 250 C820 256 870 270 890 290 C870 305 820 315 750 318 C620 322 480 318 350 315 C220 312 120 310 50 295 Z"/>
      <path d="M480 245 C500 220 510 180 505 145 C515 155 530 185 530 215 C545 195 555 165 552 135 C565 150 575 185 568 220 C580 205 585 180 582 155 C595 165 600 195 590 240 Z" opacity="0.9"/>
      <path d="M50 280 C30 275 10 265 5 260 C15 255 35 255 55 265 Z"/>
      <path d="M50 295 C30 305 8 310 5 318 C15 322 35 318 55 308 Z" opacity="0.7"/>
      <ellipse cx="820" cy="280" rx="16" ry="10" fill="rgba(255,255,255,0.85)"/>
      <path d="M820 285 C830 285 840 287 845 290 C840 293 830 293 820 291 Z" fill="rgba(0,0,0,0.4)"/>
      <path d="M600 285 C620 275 650 270 680 272 C700 280 695 300 670 302 C645 304 620 298 605 290 Z" fill="rgba(255,255,255,0.15)"/>
    </svg>`,

    'dolphin': `<svg viewBox="0 0 800 500" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M100 300 C130 260 190 240 280 235 C390 228 520 235 640 250 C720 260 770 280 790 305 C770 325 720 335 640 338 C520 342 390 338 280 345 C190 350 130 345 100 325 Z"/>
      <path d="M400 235 C415 205 425 168 420 130 C430 145 445 175 440 210 Z" opacity="0.85"/>
      <path d="M100 300 C75 290 45 275 25 265 C30 258 50 258 70 268 Z"/>
      <path d="M100 325 C75 338 45 350 20 355 C25 362 50 360 75 348 Z" opacity="0.75"/>
      <path d="M100 308 C90 310 80 318 85 325 C95 322 102 315 100 308 Z" opacity="0.6"/>
      <ellipse cx="730" cy="296" rx="14" ry="10" fill="rgba(255,255,255,0.9)"/>
      <path d="M280 288 C340 272 440 268 520 278 C540 290 532 308 510 312 C450 316 370 312 290 302 Z" fill="rgba(255,255,255,0.18)"/>
    </svg>`,

    'octopus': `<svg viewBox="0 0 700 700" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="350" cy="220" rx="160" ry="150"/>
      <path d="M200 340 C170 380 140 430 100 470 C80 490 60 510 50 540 C65 545 80 535 95 518 C110 498 130 468 150 440 C165 418 180 400 195 390 Z"/>
      <path d="M240 370 C220 420 200 480 185 530 C175 558 168 580 170 605 C185 606 198 594 205 574 C215 546 230 488 248 430 C258 398 268 375 275 365 Z"/>
      <path d="M295 385 C285 440 278 505 275 555 C272 578 270 598 275 618 C290 618 302 605 306 585 C312 555 318 490 322 432 C325 400 330 378 335 370 Z"/>
      <path d="M355 385 C358 440 360 505 358 555 C357 578 356 598 360 618 C375 616 386 602 387 582 C389 552 388 487 386 430 C385 398 382 376 378 368 Z"/>
      <path d="M415 375 C428 428 440 490 448 540 C453 565 456 585 455 607 C440 610 428 598 423 578 C415 548 406 484 400 428 C396 396 392 373 390 363 Z"/>
      <path d="M465 360 C490 408 515 462 530 510 C540 535 545 558 542 580 C527 584 514 574 508 555 C497 528 476 472 458 420 C446 386 440 362 440 350 Z"/>
      <path d="M505 340 C545 378 580 420 605 460 C620 482 632 502 628 528 C614 534 600 525 592 508 C578 484 550 444 520 406 C504 383 490 365 482 352 Z"/>
      <ellipse cx="295" cy="195" rx="20" ry="25" fill="rgba(0,0,0,0.7)"/>
      <ellipse cx="405" cy="195" rx="20" ry="25" fill="rgba(0,0,0,0.7)"/>
      <ellipse cx="300" cy="192" rx="8" ry="10" fill="rgba(255,255,255,0.9)"/>
      <ellipse cx="410" cy="192" rx="8" ry="10" fill="rgba(255,255,255,0.9)"/>
    </svg>`,

    'manta-ray': `<svg viewBox="0 0 900 500" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M450 250 C380 210 250 170 120 185 C50 193 10 215 5 240 C10 265 50 285 120 293 C250 308 380 280 450 250 Z"/>
      <path d="M450 250 C520 210 650 170 780 185 C850 193 890 215 895 240 C890 265 850 285 780 293 C650 308 520 280 450 250 Z"/>
      <path d="M430 250 C440 300 445 360 440 420 C448 422 455 420 460 415 C462 355 460 295 450 250 Z"/>
      <path d="M430 255 C390 265 350 270 320 265 C330 278 350 285 375 282 C400 278 418 268 430 255 Z" fill="rgba(255,255,255,0.15)"/>
      <path d="M465 255 C505 265 545 270 575 265 C565 278 545 285 520 282 C495 278 477 268 465 255 Z" fill="rgba(255,255,255,0.15)"/>
      <path d="M420 210 C430 200 445 195 455 200 C445 205 438 200 430 205 C422 210 420 218 420 210 Z"/>
      <path d="M480 210 C470 200 455 195 445 200 C455 205 462 200 470 205 C478 210 480 218 480 210 Z"/>
      <ellipse cx="418" cy="240" rx="10" ry="7" fill="rgba(0,0,0,0.5)"/>
      <ellipse cx="482" cy="240" rx="10" ry="7" fill="rgba(0,0,0,0.5)"/>
    </svg>`,

    'fish-school': `<svg viewBox="0 0 900 600" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <g opacity="0.95">
        <ellipse cx="200" cy="200" rx="55" ry="25" transform="rotate(-15 200 200)"/>
        <path d="M155 193 C140 185 130 195 140 205 Z" transform="rotate(-15 200 200)"/>
        <ellipse cx="5" cy="0" rx="6" ry="4" fill="rgba(0,0,0,0.7)" transform="translate(200 200) rotate(-15) translate(40 -8)"/>
      </g>
      <g opacity="0.9">
        <ellipse cx="320" cy="160" rx="48" ry="22" transform="rotate(-8 320 160)"/>
        <path d="M278 156 C263 148 253 158 263 168 Z" transform="rotate(-8 320 160)"/>
        <ellipse cx="5" cy="0" rx="5" ry="3.5" fill="rgba(0,0,0,0.7)" transform="translate(320 160) rotate(-8) translate(36 -6)"/>
      </g>
      <g opacity="0.85">
        <ellipse cx="450" cy="230" rx="60" ry="26" transform="rotate(-20 450 230)"/>
        <path d="M405 220 C388 210 378 222 390 233 Z" transform="rotate(-20 450 230)"/>
        <ellipse cx="5" cy="0" rx="6" ry="4" fill="rgba(0,0,0,0.7)" transform="translate(450 230) rotate(-20) translate(44 -9)"/>
      </g>
      <g opacity="0.8">
        <ellipse cx="580" cy="180" rx="52" ry="23" transform="rotate(-12 580 180)"/>
        <path d="M534 174 C519 165 509 176 521 186 Z" transform="rotate(-12 580 180)"/>
        <ellipse cx="5" cy="0" rx="5" ry="3.5" fill="rgba(0,0,0,0.7)" transform="translate(580 180) rotate(-12) translate(38 -7)"/>
      </g>
      <g opacity="0.7">
        <ellipse cx="680" cy="280" rx="44" ry="20" transform="rotate(-5 680 280)"/>
        <path d="M640 277 C626 270 617 280 628 288 Z" transform="rotate(-5 680 280)"/>
        <ellipse cx="5" cy="0" rx="5" ry="3" fill="rgba(0,0,0,0.7)" transform="translate(680 280) rotate(-5) translate(32 -6)"/>
      </g>
      <g opacity="0.6">
        <ellipse cx="270" cy="340" rx="40" ry="18" transform="rotate(-22 270 340)"/>
        <path d="M234 330 C220 322 211 332 222 341 Z" transform="rotate(-22 270 340)"/>
      </g>
      <g opacity="0.55">
        <ellipse cx="770" cy="210" rx="36" ry="16" transform="rotate(-10 770 210)"/>
        <path d="M736 206 C723 199 715 208 725 216 Z" transform="rotate(-10 770 210)"/>
      </g>
    </svg>`,

    // =======================================================
    // OCEANO, PAISAJES COSTEROS Y NAVEGACION
    // =======================================================
    'island-palm': `<svg viewBox="0 0 800 600" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="400" cy="520" rx="340" ry="80" fill="#D4A84B"/>
      <ellipse cx="400" cy="510" rx="290" ry="55" fill="#E8BF65"/>
      <rect x="372" y="200" width="30" height="310" rx="15" fill="#6B4A1C"/>
      <path d="M402 200 C395 185 385 170 390 160" stroke="#6B4A1C" stroke-width="26" fill="none" stroke-linecap="round"/>
      <path d="M402 200 C412 215 425 210 410 190" stroke="#6B4A1C" stroke-width="20" fill="none" stroke-linecap="round"/>
      <path d="M395 210 C380 220 340 210 320 195 C350 185 380 195 395 210 Z" fill="#2D7A2D"/>
      <path d="M395 210 C410 200 450 195 470 185 C460 200 435 215 395 210 Z" fill="#3A9A3A"/>
      <path d="M395 195 C380 175 350 155 330 150 C345 165 368 180 395 195 Z" fill="#2D7A2D"/>
      <path d="M405 195 C415 175 445 158 465 155 C450 168 430 182 405 195 Z" fill="#3A9A3A"/>
      <path d="M390 205 C370 225 330 240 310 250 C328 238 358 220 390 205 Z" fill="#258025"/>
      <path d="M410 205 C430 225 470 240 490 250 C472 238 442 220 410 205 Z" fill="#2D9A2D"/>
      <path d="M395 208 C385 230 372 265 370 285 C380 268 390 245 395 208 Z" fill="#1E6E1E"/>
    </svg>`,

    'lighthouse': `<svg viewBox="0 0 400 700" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="600" width="400" height="100" fill="#1A4A6B"/>
      <path d="M140 600 L160 200 L240 200 L260 600 Z" fill="#F5F0E8"/>
      <path d="M140 600 L155 480 L245 480 L260 600 Z" fill="#CC3333" opacity="0.9"/>
      <path d="M155 360 L165 240 L235 240 L245 360 Z" fill="#CC3333" opacity="0.9"/>
      <rect x="150" y="185" width="100" height="30" rx="5" fill="#8B7355"/>
      <rect x="155" y="130" width="90" height="60" rx="6" fill="#2B2B35"/>
      <ellipse cx="200" cy="130" rx="55" ry="18" fill="#8B7355"/>
      <path d="M155 130 L130 95 L270 95 L245 130 Z" fill="#CC3333"/>
      <ellipse cx="200" cy="95" rx="70" ry="15" fill="#8B7355"/>
      <rect x="180" y="140" width="40" height="45" rx="4" fill="#FFE066"/>
      <circle cx="200" cy="163" r="16" fill="#FFD700" opacity="0.6"/>
      <rect x="135" y="478" width="130" height="12" rx="4" fill="#8B7355"/>
      <rect x="150" y="358" width="100" height="10" rx="4" fill="#8B7355"/>
      <rect x="160" y="238" width="80" height="8" rx="4" fill="#8B7355"/>
    </svg>`,

    'sailboat': `<svg viewBox="0 0 700 600" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M100 420 C150 380 250 360 350 355 C450 360 550 380 600 420 C570 445 480 460 350 462 C220 460 130 445 100 420 Z" fill="#C8A96E"/>
      <path d="M100 420 C80 430 60 445 50 460 L650 460 C640 445 620 430 600 420 Z" fill="#8B6A3E"/>
      <line x1="350" y1="100" x2="350" y2="420" stroke="#5A3A1A" stroke-width="10" stroke-linecap="round"/>
      <path d="M350 110 C350 110 200 180 160 340 L350 355 Z" fill="rgba(255,255,255,0.92)"/>
      <path d="M350 110 C350 110 500 180 540 340 L350 355 Z" fill="rgba(220,230,255,0.85)"/>
      <path d="M350 230 C350 230 430 255 480 330 L350 355 Z" fill="rgba(200,215,245,0.7)"/>
      <path d="M50 460 L650 460 L680 495 L20 495 Z" fill="#1A5A8A" opacity="0.5"/>
      <path d="M20 495 L0 530 L700 530 L680 495 Z" fill="#1A5A8A" opacity="0.35"/>
    </svg>`,

    'ship-cargo': `<svg viewBox="0 0 1000 500" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 350 L80 300 L920 300 L950 350 C920 380 800 400 500 402 C200 400 80 380 50 350 Z" fill="#4A4A5A"/>
      <rect x="80" y="220" width="840" height="85" rx="8" fill="#5A5A6A"/>
      <rect x="120" y="185" width="760" height="38" rx="6" fill="#6A6A7A"/>
      <rect x="180" y="140" width="200" height="50" rx="5" fill="#4A4A5A"/>
      <rect x="620" y="120" width="180" height="70" rx="5" fill="#3A3A4A"/>
      <rect x="200" y="200" width="60" height="55" rx="4" fill="#CC4422"/>
      <rect x="280" y="200" width="60" height="55" rx="4" fill="#2255AA"/>
      <rect x="360" y="200" width="60" height="55" rx="4" fill="#CC4422"/>
      <rect x="440" y="200" width="60" height="55" rx="4" fill="#2255AA"/>
      <rect x="520" y="200" width="60" height="55" rx="4" fill="#228833"/>
      <rect x="600" y="200" width="60" height="55" rx="4" fill="#CC4422"/>
      <path d="M640" y="110" width="6" height="80" stroke="#888" stroke-width="5" fill="none"/>
      <line x1="640" y1="108" x2="640" y2="125" stroke="#888" stroke-width="5"/>
      <rect x="630" y="88" width="50" height="24" rx="3" fill="#FF4444"/>
      <path d="M50 350 C30 360 10 375 5 390 L995 390 C990 375 970 360 950 350 Z" fill="#2A3A5A"/>
      <path d="M5 390 L0 420 L1000 420 L995 390 Z" fill="#1A2A4A" opacity="0.7"/>
    </svg>`,

    'ocean-waves': `<svg viewBox="0 0 1080 400" preserveAspectRatio="none" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 400 L0 280 C80 260 160 240 240 260 C320 280 400 300 480 280 C560 260 640 230 720 250 C800 270 880 295 960 275 C1010 262 1045 250 1080 260 L1080 400 Z" fill="#1A5A8A" opacity="0.9"/>
      <path d="M0 400 L0 310 C70 290 150 310 230 330 C310 350 390 340 470 310 C550 280 630 265 710 285 C790 305 870 330 950 310 C990 299 1035 285 1080 295 L1080 400 Z" fill="#1A4A7A" opacity="0.8"/>
      <path d="M0 400 L0 340 C90 320 180 345 270 360 C350 373 430 365 510 340 C590 315 670 300 750 320 C830 340 910 358 990 338 C1025 328 1055 315 1080 325 L1080 400 Z" fill="#0E3460" opacity="0.9"/>
    </svg>`,

    // =======================================================
    // NATURALEZA Y FLORA
    // =======================================================
    'tree-pine': `<svg viewBox="0 0 400 700" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <rect x="175" y="580" width="50" height="120" rx="8" fill="#6B4A1C"/>
      <path d="M200 50 L100 240 L140 240 L60 400 L110 400 L40 560 L360 560 L290 400 L340 400 L260 240 L300 240 Z" fill="#2D6E2D"/>
      <path d="M200 50 L115 240 L150 240 L75 400 L122 400 L55 560 L340 560 L280 400 L322 400 L248 240 L285 240 Z" fill="#3A8A3A"/>
      <path d="M200 50 L150 200 L175 200 L120 340 L155 340 L100 490 L300 490 L245 340 L280 340 L225 200 L250 200 Z" fill="#44A044"/>
    </svg>`,

    'tree-oak': `<svg viewBox="0 0 600 700" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <rect x="265" y="480" width="70" height="220" rx="18" fill="#7A5230"/>
      <ellipse cx="300" cy="280" rx="240" ry="220" fill="#2E7A2E"/>
      <ellipse cx="180" cy="200" rx="160" ry="140" fill="#368A36"/>
      <ellipse cx="420" cy="210" rx="150" ry="130" fill="#368A36"/>
      <ellipse cx="300" cy="160" rx="140" ry="120" fill="#42A042"/>
      <ellipse cx="190" cy="280" rx="130" ry="110" fill="#339933"/>
      <ellipse cx="400" cy="300" rx="125" ry="105" fill="#339933"/>
      <ellipse cx="300" cy="350" rx="160" ry="110" fill="#2D8C2D"/>
      <ellipse cx="220" cy="170" rx="80" ry="65" fill="#52B852" opacity="0.6"/>
      <ellipse cx="390" cy="180" rx="70" ry="60" fill="#52B852" opacity="0.5"/>
    </svg>`,

    'tree-palm-tall': `<svg viewBox="0 0 500 800" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M230 780 C235 720 245 640 255 560 C265 480 270 400 268 320 C266 240 255 170 250 100" stroke="#8B6A2A" stroke-width="36" fill="none" stroke-linecap="round"/>
      <path d="M250 100 C240 90 230 82 225 76" stroke="#8B6A2A" stroke-width="30" fill="none" stroke-linecap="round"/>
      <ellipse cx="235" cy="780" rx="50" ry="18" fill="#5A3A0A" opacity="0.5"/>
      <path d="M250 100 C220 65 160 45 100 55 C130 75 175 80 210 100 Z" fill="#2D8A2D"/>
      <path d="M250 100 C280 65 340 45 400 55 C370 75 325 80 290 100 Z" fill="#3A9A3A"/>
      <path d="M250 100 C215 80 155 90 120 115 C155 118 198 105 250 100 Z" fill="#2A7A2A"/>
      <path d="M250 100 C285 80 345 90 380 115 C345 118 302 105 250 100 Z" fill="#2A7A2A"/>
      <path d="M250 100 C225 120 195 148 180 180 C208 165 232 140 250 100 Z" fill="#258025"/>
      <path d="M250 100 C275 120 305 148 320 180 C292 165 268 140 250 100 Z" fill="#258025"/>
      <path d="M250 100 C238 130 228 170 232 205 C240 180 248 148 250 100 Z" fill="#1E6E1E"/>
      <circle cx="252" cy="108" r="15" fill="#D4A84B"/>
      <circle cx="235" cy="120" r="12" fill="#C89840"/>
      <circle cx="268" cy="118" r="11" fill="#D4A84B"/>
    </svg>`,

    'eagle': `<svg viewBox="0 0 900 500" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M450 220 C430 200 400 185 360 180 C280 170 180 190 100 220 C60 234 30 250 10 265 C40 258 80 248 130 242 C185 235 250 232 310 238 C340 241 368 248 388 258 C368 268 340 272 310 270 C250 265 185 260 130 264 C80 268 40 275 10 285 C30 295 60 308 100 318 C180 342 280 355 360 342 C400 335 430 322 450 305 Z"/>
      <path d="M450 220 C470 200 500 185 540 180 C620 170 720 190 800 220 C840 234 870 250 890 265 C860 258 820 248 770 242 C715 235 650 232 590 238 C560 241 532 248 512 258 C532 268 560 272 590 270 C650 265 715 260 770 264 C820 268 860 275 890 285 C870 295 840 308 800 318 C720 342 620 355 540 342 C500 335 470 322 450 305 Z"/>
      <ellipse cx="450" cy="260" rx="65" ry="50"/>
      <path d="M415 240 C415 225 450 218 485 240 L475 250 C462 240 438 240 425 250 Z" fill="#F5C518"/>
      <ellipse cx="425" cy="252" rx="10" ry="12" fill="rgba(0,0,0,0.8)"/>
      <ellipse cx="475" cy="252" rx="10" ry="12" fill="rgba(0,0,0,0.8)"/>
      <path d="M450 295 C440 310 438 330 450 340 C462 330 460 310 450 295 Z" fill="#F5C518"/>
      <circle cx="428" cy="248" r="4" fill="#fff"/>
      <circle cx="478" cy="248" r="4" fill="#fff"/>
    </svg>`,

    'bird-flock': `<svg viewBox="0 0 900 500" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M200 200 C215 188 235 182 250 188 C235 195 220 200 215 210 C210 200 205 195 200 200 Z"/>
      <path d="M250 188 C265 182 285 188 300 200 C285 195 270 200 265 210 C260 200 255 195 250 188 Z"/>
      <path d="M380 150 C395 138 415 132 430 138 C415 145 400 150 395 160 C390 150 385 145 380 150 Z"/>
      <path d="M430 138 C445 132 465 138 480 150 C465 145 450 150 445 160 C440 150 435 145 430 138 Z"/>
      <path d="M540 220 C553 210 570 205 582 210 C570 215 558 220 554 228 C550 220 545 216 540 220 Z"/>
      <path d="M582 210 C595 205 611 210 624 220 C611 215 600 220 596 228 C592 220 587 216 582 210 Z"/>
      <path d="M680 170 C692 161 707 156 718 161 C707 166 696 170 693 178 C689 170 685 166 680 170 Z"/>
      <path d="M718 161 C729 156 744 161 756 170 C744 166 734 170 731 178 C727 170 722 166 718 161 Z"/>
      <path d="M100 280 C111 272 124 268 134 272 C124 276 114 280 111 287 C108 280 104 276 100 280 Z"/>
      <path d="M134 272 C144 268 157 272 168 280 C157 276 148 280 145 287 C142 280 138 276 134 272 Z"/>
      <path d="M810 250 C820 243 832 239 841 243 C832 247 823 250 820 257 C817 250 813 247 810 250 Z"/>
      <path d="M841 243 C850 239 862 243 872 250 C862 247 854 250 851 257 C848 250 845 247 841 243 Z"/>
      <path d="M460 310 C468 304 478 301 486 304 C478 308 470 310 468 316 C465 310 462 307 460 310 Z" opacity="0.7"/>
      <path d="M486 304 C494 301 504 304 512 310 C504 307 496 310 494 316 C491 310 488 307 486 304 Z" opacity="0.7"/>
    </svg>`,

    // =======================================================
    // COSMOS Y ESPACIO
    // =======================================================
    'rocket': `<svg viewBox="0 0 400 800" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M200 30 C160 80 130 160 120 260 L280 260 C270 160 240 80 200 30 Z" fill="#E8E8F0"/>
      <rect x="120" y="255" width="160" height="280" rx="10" fill="#D0D0E0"/>
      <path d="M120 380 L60 460 L60 535 L120 535 Z" fill="#CC3333"/>
      <path d="M280 380 L340 460 L340 535 L280 535 Z" fill="#CC3333"/>
      <ellipse cx="200" cy="360" rx="55" ry="55" fill="#BFEFFF" opacity="0.9"/>
      <ellipse cx="200" cy="350" rx="35" ry="38" fill="#4488CC" opacity="0.8"/>
      <rect x="135" y="535" width="130" height="50" rx="8" fill="#AA2222"/>
      <path d="M155 585 C130 620 110 660 100 700 C130 680 160 645 175 610 Z" fill="#FF6600" opacity="0.8"/>
      <path d="M245 585 C270 620 290 660 300 700 C270 680 240 645 225 610 Z" fill="#FF6600" opacity="0.8"/>
      <path d="M178 585 C165 610 160 640 162 670 C175 648 182 618 178 585 Z" fill="#FFAA00" opacity="0.9"/>
      <path d="M222 585 C235 610 240 640 238 670 C225 648 218 618 222 585 Z" fill="#FFAA00" opacity="0.9"/>
      <path d="M200 585 C193 615 192 645 196 672 C200 648 207 618 200 585 Z" fill="#FFE066"/>
      <rect x="162" y="280" width="16" height="14" rx="3" fill="#4488CC"/>
      <rect x="222" y="280" width="16" height="14" rx="3" fill="#4488CC"/>
    </svg>`,

    'satellite': `<svg viewBox="0 0 700 500" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <rect x="280" y="200" width="140" height="100" rx="12" fill="#8888AA"/>
      <rect x="290" y="210" width="120" height="80" rx="8" fill="#6666AA"/>
      <rect x="300" y="220" width="100" height="60" rx="5" fill="#4455AA"/>
      <rect x="310" y="230" width="35" height="40" rx="3" fill="#3366CC"/>
      <rect x="355" y="230" width="35" height="40" rx="3" fill="#3366CC"/>
      <rect x="60" y="215" width="220" height="70" rx="8" fill="#3344AA"/>
      <rect x="80" y="225" width="180" height="50" rx="5" fill="#2255BB"/>
      <rect x="420" y="215" width="220" height="70" rx="8" fill="#3344AA"/>
      <rect x="440" y="225" width="180" height="50" rx="5" fill="#2255BB"/>
      <line x1="60" y1="250" x2="280" y2="250" stroke="#6688CC" stroke-width="10"/>
      <line x1="420" y1="250" x2="640" y2="250" stroke="#6688CC" stroke-width="10"/>
      <ellipse cx="350" cy="250" rx="28" ry="28" fill="#AABBDD"/>
      <ellipse cx="350" cy="250" rx="18" ry="18" fill="#6688AA"/>
      <line x1="350" y1="300" x2="350" y2="380" stroke="#8888AA" stroke-width="8"/>
      <path d="M310 380 C310 360 390 360 390 380 C390 400 310 400 310 380 Z" fill="#8888AA"/>
    </svg>`,

    'astronaut': `<svg viewBox="0 0 400 700" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <rect x="115" y="310" width="170" height="220" rx="40" fill="#E8E8F0"/>
      <ellipse cx="200" cy="220" rx="90" ry="100" fill="#E8E8F0"/>
      <ellipse cx="200" cy="215" rx="68" ry="75" fill="#BFEFFF" opacity="0.9"/>
      <ellipse cx="200" cy="210" rx="50" ry="58" fill="#88CCEE" opacity="0.7"/>
      <path d="M152 180 C155 160 200 150 248 180" stroke="rgba(255,255,255,0.5)" stroke-width="5" fill="none" stroke-linecap="round"/>
      <rect x="85" y="330" width="55" height="120" rx="28" fill="#D0D0E0"/>
      <rect x="260" y="330" width="55" height="120" rx="28" fill="#D0D0E0"/>
      <rect x="75" y="345" width="30" height="80" rx="15" fill="#C0C0D0"/>
      <rect x="295" y="345" width="30" height="80" rx="15" fill="#C0C0D0"/>
      <rect x="145" y="528" width="55" height="120" rx="28" fill="#D0D0E0"/>
      <rect x="200" y="528" width="55" height="120" rx="28" fill="#D0D0E0"/>
      <ellipse cx="170" cy="648" rx="34" ry="15" fill="#B0B0C0"/>
      <ellipse cx="228" cy="648" rx="34" ry="15" fill="#B0B0C0"/>
      <rect x="160" y="320" width="80" height="45" rx="8" fill="#AABBCC"/>
      <rect x="170" y="328" width="60" height="28" rx="5" fill="#6688AA"/>
      <rect x="155" y="430" width="90" height="60" rx="6" fill="#CCCCDD"/>
      <rect x="163" y="438" width="36" height="44" rx="4" fill="#2255CC"/>
      <rect x="205" y="438" width="32" height="44" rx="4" fill="#2255CC"/>
    </svg>`,

    'black-hole': `<svg viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bhGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#000000"/>
          <stop offset="40%" stop-color="#0A0015"/>
          <stop offset="65%" stop-color="#1A0035"/>
          <stop offset="85%" stop-color="#3A0060" stop-opacity="0.8"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <ellipse cx="300" cy="300" rx="290" ry="60" fill="none" stroke="#7B00FF" stroke-width="18" opacity="0.35" transform="rotate(-20 300 300)"/>
      <ellipse cx="300" cy="300" rx="240" ry="45" fill="none" stroke="#AA44FF" stroke-width="12" opacity="0.45" transform="rotate(-20 300 300)"/>
      <ellipse cx="300" cy="300" rx="180" ry="28" fill="none" stroke="#CC88FF" stroke-width="8" opacity="0.6" transform="rotate(-20 300 300)"/>
      <ellipse cx="300" cy="300" rx="120" ry="16" fill="#330044" opacity="0.95" transform="rotate(-20 300 300)"/>
      <circle cx="300" cy="300" r="280" fill="url(#bhGrad)"/>
      <circle cx="300" cy="300" r="95" fill="#000000"/>
      <circle cx="300" cy="300" r="110" fill="none" stroke="#9B30FF" stroke-width="5" opacity="0.6"/>
    </svg>`,

    // =======================================================
    // EXPLORACION E HISTORIA
    // =======================================================
    'compass': `<svg viewBox="0 0 500 500" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <circle cx="250" cy="250" r="240" fill="none" stroke="currentColor" stroke-width="20"/>
      <circle cx="250" cy="250" r="210" fill="none" stroke="currentColor" stroke-width="4" opacity="0.3"/>
      <path d="M250 30 L262 240 L250 250 L238 240 Z" fill="#CC3333"/>
      <path d="M250 470 L262 260 L250 250 L238 260 Z"/>
      <path d="M30 250 L240 238 L250 250 L240 262 Z"/>
      <path d="M470 250 L260 238 L250 250 L260 262 Z"/>
      <circle cx="250" cy="250" r="28" fill="currentColor"/>
      <circle cx="250" cy="250" r="16" fill="rgba(0,0,0,0.4)"/>
      <text x="250" y="72" text-anchor="middle" font-size="38" font-weight="bold" fill="currentColor" font-family="sans-serif">N</text>
      <text x="250" y="455" text-anchor="middle" font-size="32" fill="currentColor" font-family="sans-serif" opacity="0.7">S</text>
      <text x="60" y="262" text-anchor="middle" font-size="32" fill="currentColor" font-family="sans-serif" opacity="0.7">W</text>
      <text x="448" y="262" text-anchor="middle" font-size="32" fill="currentColor" font-family="sans-serif" opacity="0.7">E</text>
    </svg>`,

    'pyramid': `<svg viewBox="0 0 900 600" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="480" width="900" height="120" fill="#C8A84A" opacity="0.4"/>
      <path d="M450 50 L820 480 L80 480 Z"/>
      <path d="M450 50 L820 480 L640 480 L450 120 Z" fill="rgba(255,255,255,0.12)"/>
      <path d="M450 50 L80 480 L260 480 L450 120 Z" fill="rgba(0,0,0,0.2)"/>
      <path d="M80 480 L820 480 L820 500 L80 500 Z" fill="rgba(255,255,255,0.1)"/>
      <path d="M370 240 L530 240 L560 280 L340 280 Z" fill="rgba(0,0,0,0.4)"/>
      <path d="M390 250 L510 250 L535 275 L365 275 Z" fill="rgba(0,0,0,0.6)"/>
    </svg>`,

    'ancient-temple': `<svg viewBox="0 0 1000 600" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="500" width="1000" height="100" fill="#8B7355" opacity="0.5"/>
      <rect x="50" y="460" width="900" height="50" rx="4"/>
      <rect x="80" y="380" width="840" height="85"/>
      <rect x="100" y="340" width="800" height="45" rx="3"/>
      <rect x="100" y="200" width="140" height="145"/>
      <rect x="290" y="200" width="140" height="145"/>
      <rect x="480" y="200" width="140" height="145"/>
      <rect x="670" y="200" width="140" height="145"/>
      <path d="M100 200 L170 100 L240 200 Z" fill="rgba(0,0,0,0.2)"/>
      <path d="M290 200 L360 100 L430 200 Z" fill="rgba(0,0,0,0.2)"/>
      <path d="M480 200 L550 100 L620 200 Z" fill="rgba(0,0,0,0.2)"/>
      <path d="M670 200 L740 100 L810 200 Z" fill="rgba(0,0,0,0.2)"/>
      <rect x="80" y="190" width="840" height="18"/>
      <rect x="60" y="90" width="880" height="30" rx="4"/>
      <path d="M60 90 L500 30 L940 90 Z"/>
    </svg>`,

    'map-scroll': `<svg viewBox="0 0 700 500" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="80" cy="250" rx="80" ry="240" fill="#C8A068"/>
      <ellipse cx="620" cy="250" rx="80" ry="240" fill="#C8A068"/>
      <rect x="80" y="10" width="540" height="480" fill="#E8C88A"/>
      <rect x="80" y="10" width="540" height="480" fill="none" stroke="#B89050" stroke-width="4"/>
      <path d="M120 100 C200 80 300 120 350 100 C400 80 500 110 580 90" stroke="#8B6A30" stroke-width="3" fill="none" opacity="0.6"/>
      <path d="M120 150 C180 140 260 160 350 145 C420 132 510 155 580 140" stroke="#8B6A30" stroke-width="2.5" fill="none" opacity="0.5"/>
      <path d="M140 200 C220 185 320 210 380 195 C450 178 530 205 580 190" stroke="#8B6A30" stroke-width="2" fill="none" opacity="0.4"/>
      <path d="M150 280 C180 260 240 250 280 260 C320 270 360 250 400 260 C440 270 480 255 510 265" stroke="#6B4A20" stroke-width="3" fill="none"/>
      <path d="M280 260 C290 230 310 220 320 240" stroke="#6B4A20" stroke-width="2.5" fill="none"/>
      <path d="M400 258 C415 235 435 225 445 245" stroke="#6B4A20" stroke-width="2.5" fill="none"/>
      <circle cx="350" cy="300" r="18" fill="none" stroke="#AA3333" stroke-width="5"/>
      <line x1="350" y1="282" x2="350" y2="258" stroke="#AA3333" stroke-width="4"/>
      <path d="M330 258 L350 235 L370 258" fill="#AA3333"/>
      <rect x="200" y="370" width="100" height="70" rx="6" fill="rgba(0,0,0,0.1)" stroke="#8B6A30" stroke-width="2"/>
      <text x="250" y="411" text-anchor="middle" font-size="22" fill="#5A3A10" font-family="serif" font-style="italic">Mapa</text>
    </svg>`,

    // =======================================================
    // ICONOS DE DATOS Y ALERTAS
    // =======================================================
    'alert-triangle': `<svg viewBox="0 0 600 550" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M300 40 L560 500 L40 500 Z"/>
      <path d="M300 40 L540 490 L60 490 Z" fill="rgba(255,200,0,0.08)"/>
      <rect x="272" y="200" width="56" height="170" rx="14" fill="rgba(0,0,0,0.55)"/>
      <circle cx="300" cy="420" r="32" fill="rgba(0,0,0,0.55)"/>
    </svg>`,

    'data-chart': `<svg viewBox="0 0 700 500" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <rect x="40" y="40" width="620" height="380" rx="16" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" stroke-width="2"/>
      <line x1="80" y1="380" x2="660" y2="380" stroke="currentColor" stroke-width="3" opacity="0.4"/>
      <line x1="80" y1="380" x2="80" y2="80" stroke="currentColor" stroke-width="3" opacity="0.4"/>
      <polyline points="80,380 160,320 240,290 320,200 400,230 480,150 560,120 640,90" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M80,380 L160,320 L240,290 L320,200 L400,230 L480,150 L560,120 L640,90 L640,380 Z" fill="currentColor" opacity="0.15"/>
      <circle cx="160" cy="320" r="8" fill="currentColor"/>
      <circle cx="240" cy="290" r="8" fill="currentColor"/>
      <circle cx="320" cy="200" r="10" fill="currentColor"/>
      <circle cx="400" cy="230" r="8" fill="currentColor"/>
      <circle cx="480" cy="150" r="10" fill="currentColor"/>
      <circle cx="560" cy="120" r="8" fill="currentColor"/>
      <circle cx="640" cy="90" r="10" fill="currentColor"/>
    </svg>`,

    'dna-helix': `<svg viewBox="0 0 300 800" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M80 50 C200 100 200 150 80 200 C200 250 200 300 80 350 C200 400 200 450 80 500 C200 550 200 600 80 650 C200 700 200 750 80 800" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round"/>
      <path d="M220 50 C100 100 100 150 220 200 C100 250 100 300 220 350 C100 400 100 450 220 500 C100 550 100 600 220 650 C100 700 100 750 220 800" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round" opacity="0.6"/>
      <line x1="80" y1="125" x2="220" y2="125" stroke="currentColor" stroke-width="7" stroke-linecap="round" opacity="0.8"/>
      <line x1="80" y1="275" x2="220" y2="275" stroke="currentColor" stroke-width="7" stroke-linecap="round" opacity="0.8"/>
      <line x1="80" y1="425" x2="220" y2="425" stroke="currentColor" stroke-width="7" stroke-linecap="round" opacity="0.8"/>
      <line x1="80" y1="575" x2="220" y2="575" stroke="currentColor" stroke-width="7" stroke-linecap="round" opacity="0.8"/>
      <line x1="80" y1="725" x2="220" y2="725" stroke="currentColor" stroke-width="7" stroke-linecap="round" opacity="0.8"/>
      <line x1="113" y1="80" x2="187" y2="170" stroke="currentColor" stroke-width="5" stroke-linecap="round" opacity="0.5"/>
      <line x1="150" y1="200" x2="150" y2="350" stroke="none"/>
      <line x1="113" y1="230" x2="187" y2="320" stroke="currentColor" stroke-width="5" stroke-linecap="round" opacity="0.5"/>
      <line x1="187" y1="380" x2="113" y2="470" stroke="currentColor" stroke-width="5" stroke-linecap="round" opacity="0.5"/>
      <line x1="113" y1="530" x2="187" y2="620" stroke="currentColor" stroke-width="5" stroke-linecap="round" opacity="0.5"/>
      <line x1="187" y1="680" x2="113" y2="770" stroke="currentColor" stroke-width="5" stroke-linecap="round" opacity="0.5"/>
    </svg>`,

    'radar-circle': `<svg viewBox="0 0 500 500" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <circle cx="250" cy="250" r="235" fill="none" stroke="currentColor" stroke-width="8" opacity="0.5"/>
      <circle cx="250" cy="250" r="175" fill="none" stroke="currentColor" stroke-width="5" opacity="0.35"/>
      <circle cx="250" cy="250" r="115" fill="none" stroke="currentColor" stroke-width="4" opacity="0.25"/>
      <circle cx="250" cy="250" r="55" fill="none" stroke="currentColor" stroke-width="3" opacity="0.2"/>
      <line x1="250" y1="15" x2="250" y2="485" stroke="currentColor" stroke-width="2" opacity="0.15"/>
      <line x1="15" y1="250" x2="485" y2="250" stroke="currentColor" stroke-width="2" opacity="0.15"/>
      <line x1="84" y1="84" x2="416" y2="416" stroke="currentColor" stroke-width="1.5" opacity="0.1"/>
      <line x1="416" y1="84" x2="84" y2="416" stroke="currentColor" stroke-width="1.5" opacity="0.1"/>
      <path d="M250 250 L430 130 A235 235 0 0 0 250 15 Z" fill="currentColor" opacity="0.2"/>
      <path d="M250 250 L430 130 A150 150 0 0 0 250 100 Z" fill="currentColor" opacity="0.15"/>
      <circle cx="250" cy="250" r="14" fill="currentColor"/>
      <circle cx="380" cy="150" r="10" fill="currentColor" opacity="0.9"/>
      <circle cx="180" cy="320" r="7" fill="currentColor" opacity="0.6"/>
      <circle cx="310" cy="380" r="5" fill="currentColor" opacity="0.4"/>
    </svg>`
  };

  // --- FIGURE (Siluetas y Formas Vectoriales) ---
  function renderFigure(el, lt) {
    const progress = getAnimProgress(lt, el.delay || 0, el.duration || 0.5);
    if (progress <= 0) return;
    const ease = easeOutCubic(progress);

    const div = document.createElement('div');
    div.className = 'c-figure' + (el.style ? ' style-' + el.style : ' style-silhouette');

    const svgContent = el.svg || SVG_SHAPES[el.shape] || SVG_SHAPES['mountains'];
    div.innerHTML = svgContent;

    div.style.width  = (el.width  || 450) + 'px';
    div.style.height = (el.height || 350) + 'px';
    if (el.color) div.style.color = el.color;
    if (el.primaryColor) {
      div.style.color = el.primaryColor;
      div.style.setProperty('--figure-primary', el.primaryColor);
    }
    if (el.secondaryColor) {
      div.style.setProperty('--figure-secondary', el.secondaryColor);
      div.querySelectorAll('[opacity], g:nth-child(even) path, path:nth-of-type(2)').forEach(node => {
        const fill = node.getAttribute('fill');
        if (!fill || fill === 'currentColor') {
          node.style.fill = el.secondaryColor;
        }
      });
    }
    if (el.accentColor) {
      div.style.setProperty('--figure-accent', el.accentColor);
    }
    if (el.stroke) {
      div.querySelectorAll('path, polygon, circle, ellipse, line, rect').forEach(node => {
        node.style.stroke = el.stroke;
        if (el.strokeWidth) node.style.strokeWidth = el.strokeWidth + 'px';
      });
    }

    positionElement(div, el.position, 'center');

    const baseScale = (el.scale || 1.0);
    const flipX = el.flip ? -1 : 1;
    let extraTransform = '';

    switch (el.motion) {
      case 'breathe': {
        // Oscilación orgánica compuesta (2 frecuencias para naturalidad)
        const br1 = Math.sin(lt * 2.8) * 0.025;
        const br2 = Math.sin(lt * 5.1) * 0.008;
        const br  = br1 + br2;
        extraTransform = ` scale(${baseScale * flipX * (1 - br * 0.5)}, ${baseScale * (1 + br)})`;
        break;
      }
      case 'float': {
        // Float con ligero balanceo lateral orgánico
        const fl  = Math.sin(lt * 2.0) * 14;
        const flX = Math.sin(lt * 1.3) * 5;
        extraTransform = ` scale(${baseScale * flipX}, ${baseScale}) translate(${flX}px, ${fl}px)`;
        break;
      }
      case 'rise': {
        const rise = (1 - ease) * 120;
        extraTransform = ` scale(${baseScale * flipX}, ${baseScale}) translateY(${rise}px)`;
        break;
      }
      case 'pan': {
        const pan = Math.sin(lt * 1.2) * 25;
        extraTransform = ` scale(${baseScale * flipX}, ${baseScale}) translateX(${pan}px)`;
        break;
      }
      case 'parallax': {
        const para = (lt * 18);
        extraTransform = ` scale(${baseScale * flipX}, ${baseScale}) translateX(${para}px)`;
        break;
      }
      case 'wiggle': {
        // Wiggle orgánico: rotación sinusoidal compuesta de alta frecuencia
        const deg1 = Math.sin(lt * 6.28) * (el.wiggleAmount || 8);
        const deg2 = Math.sin(lt * 11.4) * (el.wiggleAmount || 8) * 0.4;
        const wigDeg = deg1 + deg2;
        const wigY  = Math.sin(lt * 3.7) * 6;
        extraTransform = ` scale(${baseScale * flipX}, ${baseScale}) translateY(${wigY}px) rotate(${wigDeg}deg)`;
        break;
      }
      case 'sway': {
        // Balanceo suave como árbol al viento (desde la base)
        const swayDeg = Math.sin(lt * 1.8) * (el.swayAmount || 5) +
                        Math.sin(lt * 3.1) * (el.swayAmount || 5) * 0.3;
        extraTransform = ` scale(${baseScale * flipX}, ${baseScale}) rotate(${swayDeg}deg)`;
        break;
      }
      case 'pulse': {
        // Pulsación rítmica (corazón, impacto)
        const pulseRaw  = Math.sin(lt * (el.pulseFreq || 3.0) * Math.PI);
        const pulseHalf = Math.max(0, pulseRaw);
        const pulseScale = baseScale * (1 + pulseHalf * (el.pulseAmount || 0.08));
        extraTransform = ` scale(${pulseScale * flipX}, ${pulseScale})`;
        break;
      }
      default:
        extraTransform = ` scale(${baseScale * flipX * (0.8 + ease * 0.2)}, ${baseScale * (0.8 + ease * 0.2)})`;
    }

    div.style.transform = (div.style.transform || '') + extraTransform;
    const maxOpacity = el.opacity != null ? el.opacity : 1.0;
    div.style.opacity = String(ease * maxOpacity);

    const targetLayer = el.layer === 'background'
      ? document.getElementById('layer-bg')
      : (el.layer === 'foreground' ? document.getElementById('layer-overlay') : layerContent);
    if (targetLayer) targetLayer.appendChild(div);
  }

  // --- IMAGE (Ilustraciones y Assets Transparentes) ---
  function renderImage(el, lt) {
    const progress = getAnimProgress(lt, el.delay || 0, el.duration || 0.5);
    if (progress <= 0) return;
    const ease = easeOutCubic(progress);

    const div = document.createElement('div');
    div.className = 'c-image' + (el.glow ? ' with-glow' : '') + (el.shadow ? ' with-shadow' : '');

    const img = document.createElement('img');
    img.src = el.src;
    if (el.fit) img.style.objectFit = el.fit;
    div.appendChild(img);

    div.style.width  = (el.width  || 450) + 'px';
    div.style.height = (el.height || 450) + 'px';

    positionElement(div, el.position, 'center');

    const baseScale = (el.scale || 1.0);
    let extraTransform = '';

    switch (el.motion) {
      case 'breathe': {
        const br = Math.sin(lt * 2.8) * 0.025;
        extraTransform = ` scale(${baseScale * (1 - br * 0.5)}, ${baseScale * (1 + br)})`;
        break;
      }
      case 'float': {
        const fl = Math.sin(lt * 2.0) * 14;
        extraTransform = ` scale(${baseScale}) translateY(${fl}px)`;
        break;
      }
      case 'rise': {
        const rise = (1 - ease) * 100;
        extraTransform = ` scale(${baseScale}) translateY(${rise}px)`;
        break;
      }
      case 'zoom-in': {
        const z = baseScale * (0.85 + ease * 0.15);
        extraTransform = ` scale(${z})`;
        break;
      }
      case 'zoom-out': {
        const z = baseScale * (1.15 - ease * 0.15);
        extraTransform = ` scale(${z})`;
        break;
      }
      case 'pan-left': {
        const p = (1 - ease) * 80;
        extraTransform = ` scale(${baseScale}) translateX(${p}px)`;
        break;
      }
      case 'pan-right': {
        const p = (1 - ease) * -80;
        extraTransform = ` scale(${baseScale}) translateX(${p}px)`;
        break;
      }
      case 'wiggle': {
        const deg1 = Math.sin(lt * 6.28) * (el.wiggleAmount || 8);
        const deg2 = Math.sin(lt * 11.4) * (el.wiggleAmount || 8) * 0.4;
        const wigY = Math.sin(lt * 3.7) * 6;
        extraTransform = ` scale(${baseScale}) translateY(${wigY}px) rotate(${deg1 + deg2}deg)`;
        break;
      }
      case 'sway': {
        const swayDeg = Math.sin(lt * 1.8) * (el.swayAmount || 5) +
                        Math.sin(lt * 3.1) * (el.swayAmount || 5) * 0.3;
        extraTransform = ` scale(${baseScale}) rotate(${swayDeg}deg)`;
        break;
      }
      case 'pulse': {
        const pulseRaw  = Math.sin(lt * (el.pulseFreq || 3.0) * Math.PI);
        const pulseHalf = Math.max(0, pulseRaw);
        const pulseS    = baseScale * (1 + pulseHalf * (el.pulseAmount || 0.08));
        extraTransform = ` scale(${pulseS})`;
        break;
      }
      default:
        extraTransform = ` scale(${baseScale * (0.85 + ease * 0.15)})`;
    }

    div.style.transform = (div.style.transform || '') + extraTransform;
    const maxOpacity = el.opacity != null ? el.opacity : 1.0;
    div.style.opacity = String(ease * maxOpacity);

    const targetLayer = el.layer === 'background'
      ? document.getElementById('layer-bg')
      : (el.layer === 'foreground' ? document.getElementById('layer-overlay') : layerContent);
    if (targetLayer) targetLayer.appendChild(div);
  }

  // =========================================================
  // MOTION PATH HELPER (Curvas Bezier deterministas)
  // =========================================================
  function sampleMotionPath(pathD, progress) {
    let pEl = motionPathCache.get(pathD);
    if (!pEl) {
      pEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pEl.setAttribute('d', pathD);
      motionPathCache.set(pathD, pEl);
    }
    const totalLength = pEl.getTotalLength();
    const targetLength = Math.max(0, Math.min(progress, 1)) * totalLength;
    const pt = pEl.getPointAtLength(targetLength);

    const delta = 1.0;
    const pPrev = pEl.getPointAtLength(Math.max(0, targetLength - delta));
    const pNext = pEl.getPointAtLength(Math.min(totalLength, targetLength + delta));
    const angleRad = Math.atan2(pNext.y - pPrev.y, pNext.x - pPrev.x);
    const angleDeg = (angleRad * 180) / Math.PI;

    return { x: pt.x, y: pt.y, angle: angleDeg };
  }

  // --- LOTTIE (Animaciones After Effects deterministas) ---
  function renderLottie(el, lt, sceneIdx) {
    const progress = getAnimProgress(lt, el.delay || 0, el.duration || 1.0);
    if (progress <= 0) return;

    const div = document.createElement('div');
    div.className = 'c-lottie';

    div.style.width  = (el.width  || 500) + 'px';
    div.style.height = (el.height || 500) + 'px';

    if (el.motionPath && el.motionPath.path) {
      const sampled = sampleMotionPath(el.motionPath.path, progress);
      div.style.position = 'absolute';
      div.style.left = sampled.x + 'px';
      div.style.top  = sampled.y + 'px';
      div.style.transform = 'translate(-50%, -50%)' + (el.motionPath.autoRotate ? ` rotate(${sampled.angle}deg)` : '');
    } else {
      positionElement(div, el.position, 'center');
    }

    const baseScale = (el.scale || 1.0);
    div.style.transform = (div.style.transform || '') + ` scale(${baseScale})`;
    const maxOpacity = el.opacity != null ? el.opacity : 1.0;
    div.style.opacity = String(Math.min(progress / 0.15, 1) * maxOpacity);

    const targetLayer = el.layer === 'background'
      ? document.getElementById('layer-bg')
      : (el.layer === 'foreground' ? document.getElementById('layer-overlay') : layerContent);
    if (targetLayer) targetLayer.appendChild(div);

    // Carga e interpolación determinista vía lottie-web
    if (typeof lottie !== 'undefined') {
      const animKey = `scene_${sceneIdx}_${el.id || el.src || 'lottie'}`;
      let anim = lottieInstances.get(animKey);

      if (!anim || anim.__container !== div) {
        try {
          anim = lottie.loadAnimation({
            container: div,
            renderer: 'svg',
            loop: false,
            autoplay: false,
            animationData: el.data || null,
            path: el.src || null
          });
          anim.__container = div;
          lottieInstances.set(animKey, anim);
        } catch (err) {
          console.warn('[Lottie] Error al cargar animación:', err.message);
        }
      }

      if (anim && anim.totalFrames) {
        const total = anim.totalFrames;
        const localElTime = Math.max(0, lt - (el.delay || 0));
        let frame = localElTime * (el.speed || 1.0) * 60;
        if (el.loop) {
          frame = frame % total;
        } else {
          frame = Math.min(Math.max(0, frame), total - 1);
        }
        anim.goToAndStop(frame, true);
      }
    }
  }

  // --- FONDO ---
  function renderBackground(el) {
    const bg = document.getElementById('bg-element');
    if (!bg) return;
    if (el.style === 'space') {
      bg.className = 'bg-space';
    } else if (el.style === 'gradient' && el.colors) {
      bg.style.background = `linear-gradient(180deg, ${el.colors.join(', ')})`;
    } else if (el.style === 'solid' && el.colors) {
      bg.style.background = el.colors[0];
    }
  }

  // =========================================================
  // FONDOS PROCEDURALES CANVAS2D (Task B)
  // Radar pulsante y olas marinas — 100% deterministas (sin RAF)
  // =========================================================

  /**
   * Dibuja fondo de radar procedural en un canvas2D.
   * rings: número de anillos pulsantes
   * color: color base del radar (hex)
   * speed: velocidad de pulsación (ondas/s)
   */
  function drawRadarBackground(ctx, t, opts) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    opts = opts || {};
    const cx      = (opts.cx || 0.5) * W;
    const cy      = (opts.cy || 0.5) * H;
    const rings   = opts.rings   || 5;
    const color   = opts.color   || theme.colors.accent;
    const speed   = opts.speed   || 0.6;
    const maxR    = opts.maxR    || Math.max(W, H) * 0.8;
    const bgColor = opts.bgColor || theme.colors.bg[0] || '#160D28';

    // Fondo sólido
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, W, H);

    // Cuadrícula polar suave
    ctx.save();
    ctx.strokeStyle = hexToRgba(color, 0.06);
    ctx.lineWidth = 1.5;
    for (let r = maxR / rings; r <= maxR; r += maxR / rings) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Líneas cruzadas de radar
    ctx.strokeStyle = hexToRgba(color, 0.05);
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR);
      ctx.stroke();
    }
    ctx.restore();

    // Barrido girador (sweep)
    const sweepAngle = (t * speed * Math.PI * 2) % (Math.PI * 2);
    const sweepGrad  = ctx.createConicalGradient
      ? ctx.createConicalGradient(cx, cy, sweepAngle)
      : null;
    ctx.save();
    // Alternativa sin createConicalGradient (compatibilidad)
    const sweepArc = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.85);
    sweepArc.addColorStop(0,   hexToRgba(color, 0.0));
    sweepArc.addColorStop(0.6, hexToRgba(color, 0.08));
    sweepArc.addColorStop(1,   hexToRgba(color, 0.0));
    ctx.globalAlpha = 0.7;
    ctx.fillStyle   = sweepArc;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, maxR * 0.85, sweepAngle - 0.6, sweepAngle, false);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1.0;
    ctx.restore();

    // Anillos de pulso (propagación hacia afuera)
    for (let i = 0; i < rings; i++) {
      const phase  = ((t * speed * 0.8) + (i / rings)) % 1;
      const radius = phase * maxR;
      const alpha  = (1 - phase) * 0.35;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = hexToRgba(color, alpha);
      ctx.lineWidth   = 2.5 - phase * 1.5;
      ctx.stroke();
    }

    // Punto central brillante
    const glowR = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40);
    glowR.addColorStop(0,   hexToRgba(color, 0.9));
    glowR.addColorStop(0.3, hexToRgba(color, 0.4));
    glowR.addColorStop(1,   hexToRgba(color, 0.0));
    ctx.beginPath();
    ctx.arc(cx, cy, 40, 0, Math.PI * 2);
    ctx.fillStyle = glowR;
    ctx.fill();
  }

  /**
   * Dibuja fondo de olas oceánicas procedurales.
   * layers: número de capas de ola
   * amplitude: altura de las olas en px
   * speed: velocidad de movimiento lateral
   */
  function drawWavesBackground(ctx, t, opts) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    opts = opts || {};
    const layers    = opts.layers    || 4;
    const amplitude = opts.amplitude || 80;
    const speed     = opts.speed     || 0.3;
    const baseColor = opts.color     || '#1A4A6B';
    const skyColor  = opts.skyColor  || (theme.colors.bg[0] || '#160D28');
    const foamColor = opts.foamColor || 'rgba(255,255,255,0.15)';

    // Cielo / fondo superior
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.55);
    skyGrad.addColorStop(0,   skyColor);
    skyGrad.addColorStop(1,   baseColor);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    // Capas de ola (de atrás hacia adelante)
    for (let i = layers - 1; i >= 0; i--) {
      const layerRatio = i / (layers - 1);        // 0=fondo, 1=frente
      const baseY      = H * (0.45 + layerRatio * 0.35);
      const freq       = 0.003 + layerRatio * 0.004; // más frecuencia al frente
      const amp        = amplitude * (0.4 + layerRatio * 0.6);
      const layerSpeed = speed * (0.5 + layerRatio * 1.5);
      const phaseOff   = i * 1.3;

      // Alfa y color según profundidad
      const alpha   = 0.55 + layerRatio * 0.45;
      const hBias   = Math.round(26 + layerRatio * 20); // oscurece al frente
      const layerColor = `rgba(${hBias}, ${Math.round(74 + layerRatio * 30)}, ${Math.round(107 + layerRatio * 40)}, ${alpha})`;

      ctx.beginPath();
      ctx.moveTo(0, H);

      for (let x = 0; x <= W; x += 6) {
        const y1 = Math.sin(x * freq + t * layerSpeed * Math.PI * 2 + phaseOff) * amp;
        const y2 = Math.sin(x * freq * 1.7 + t * layerSpeed * 0.7 * Math.PI * 2) * amp * 0.4;
        ctx.lineTo(x, baseY + y1 + y2);
      }

      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fillStyle = layerColor;
      ctx.fill();

      // Espuma de cresta (línea superior de la ola)
      if (layerRatio > 0.5) {
        ctx.beginPath();
        for (let x = 0; x <= W; x += 6) {
          const y1 = Math.sin(x * freq + t * layerSpeed * Math.PI * 2 + phaseOff) * amp;
          const y2 = Math.sin(x * freq * 1.7 + t * layerSpeed * 0.7 * Math.PI * 2) * amp * 0.4;
          const yTop = baseY + y1 + y2;
          if (x === 0) ctx.moveTo(x, yTop);
          else ctx.lineTo(x, yTop);
        }
        ctx.strokeStyle = foamColor;
        ctx.lineWidth   = 2 + layerRatio * 3;
        ctx.stroke();
      }
    }
  }

  // --- CANVAS-BG (fondo procedural por tipo) ---
  function renderCanvasBg(el, lt, videoTime) {
    let cvs = document.getElementById('proc-bg-canvas');
    if (!cvs) {
      cvs = document.createElement('canvas');
      cvs.id     = 'proc-bg-canvas';
      cvs.width  = 1080;
      cvs.height = 1920;
      cvs.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
      const layerBg = document.getElementById('layer-bg');
      if (layerBg) layerBg.insertBefore(cvs, layerBg.firstChild);
    }
    const ctx2 = cvs.getContext('2d');
    if (!ctx2) return;
    ctx2.clearRect(0, 0, 1080, 1920);

    switch (el.bgType) {
      case 'radar':
        drawRadarBackground(ctx2, videoTime, el.options || {});
        break;
      case 'waves':
        drawWavesBackground(ctx2, videoTime, el.options || {});
        break;
      default:
        break;
    }
  }

  // --- CÁMARA ---
  function applyCameraEffect(el, lt) {
    const intensity = el.intensity != null ? el.intensity : (theme.motion.cameraIntensity || 0.04);
    const dur       = el.duration || 5;
    const prog      = Math.min(lt / dur, 1);
    const ease      = easeOutCubic(prog);
    const maxPx     = intensity * 80;

    let tx = 0, ty = 0, scale = 1;
    switch (el.effect) {
      case 'ken-burns': scale = 1 + intensity * 0.3 * ease; tx = maxPx * 0.5 * ease; ty = -maxPx * 0.3 * ease; break;
      case 'zoom-in':   scale = 1 + intensity * 0.5 * ease; break;
      case 'zoom-out':  scale = 1 - intensity * 0.15 * ease; break;
      case 'pan-left':  tx = -maxPx * ease; break;
      case 'pan-right': tx =  maxPx * ease; break;
    }

    stage.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  }

  // =========================================================
  // HELPERS
  // =========================================================
  function positionElement(el, pos, defaultAnchor) {
    const anchor = (pos && pos.anchor) ? pos.anchor : (defaultAnchor || 'center');
    const px     = ((pos && pos.x != null) ? pos.x : 0.5) * 1080;
    const py     = ((pos && pos.y != null) ? pos.y : 0.5) * 1920;

    el.style.position = 'absolute';
    el.style.left     = px + 'px';
    el.style.top      = py + 'px';

    // Mapeo de anchor a transform: no incluir translate para elements que
    // ya tienen transform de animación, sino acumular
    const tMap = {
      'top-left':      '',
      'top-center':    'translateX(-50%)',
      'top-right':     'translateX(-100%)',
      'center-left':   'translateY(-50%)',
      'center':        'translate(-50%, -50%)',
      'center-right':  'translate(-100%, -50%)',
      'bottom-left':   'translateY(-100%)',
      'bottom-center': 'translate(-50%, -100%)',
      'bottom-right':  'translate(-100%, -100%)'
    };
    el.style.transform = tMap[anchor] || 'translate(-50%, -50%)';
  }

  function formatNumber(n, dec) {
    return n.toFixed(dec).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function hexToRgba(hex, alpha) {
    const h = hex.replace('#','');
    const r = parseInt(h.slice(0,2), 16);
    const g = parseInt(h.slice(2,4), 16);
    const b = parseInt(h.slice(4,6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  // =========================================================
  // API PÚBLICA
  // =========================================================
  window.__ENGINE__ = {
    seekTo(videoTime) {
      seekTo(videoTime);
    },
    getDuration() {
      return (timeline.scenes || []).reduce((a, s) => a + (s.duration || 0), 0);
    },
    getMeta() {
      return timeline.meta || {};
    }
  };

  // =========================================================
  // ARRANQUE — DETERMINISTA
  // render_worker.js inyecta window.__TIMELINE__ ANTES de inyectar
  // este script, por lo que init() puede llamarse inmediatamente.
  // =========================================================
  init();

})();
