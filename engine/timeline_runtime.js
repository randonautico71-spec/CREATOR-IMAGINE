/**
 * timeline_runtime.js — CREATOR IMAGINE Engine v1.1
 *
 * CORRECCIONES v1.1:
 * - init() ya NO se llama en DOMContentLoaded ni en módulo IIFE automático.
 *   Espera a que render_worker.js inyecte window.__TIMELINE__ primero,
 *   luego el propio script llama a init() al final de su evaluación.
 * - Todos los efectos de setTimeout para animaciones se eliminan: el control
 *   de tiempo es DETERMINISTA a través de seekTo(videoTime), no mediante
 *   reloj del sistema. Las animaciones basadas en delay usan el tiempo local
 *   de la escena en lugar de setTimeout.
 * - Se añaden los tipos 'emoji' y 'candle' para el smoke test.
 * - Se añade el tipo 'badge'.
 * - seekTo() hace un renderScene() completo en cada llamada para garantizar
 *   idempotencia: el mismo tiempo siempre produce el mismo frame.
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

    theme = THEMES[timeline.theme] || THEMES.documentary;
    applyTheme(theme);
    applyBranding();
    initParticles();
    applyGlobalEffects();

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
    const count = Math.floor((theme.effects.particleDensity || 0.35) * 200);
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
    document.querySelectorAll('#layer-bg .c-figure, #layer-bg .c-image').forEach(n => n.remove());

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
        case 'title':    renderTitle(el, localTime);   break;
        case 'badge':    renderBadge(el, localTime);   break;
        case 'counter':  renderCounter(el, localTime); break;
        case 'caption':  renderCaption(el, videoTime); break;
        case 'ranking':  renderRanking(el, localTime); break;
        case 'card':     renderCard(el, localTime);    break;
        case 'emoji':    renderEmoji(el, localTime);   break;
        case 'candle':   renderCandle(el, localTime);  break;
        case 'figure':   renderFigure(el, localTime);  break;
        case 'image':    renderImage(el, localTime);   break;
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

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeOutExpo(t)  { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }

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

  // --- COUNTER ---
  function renderCounter(el, lt) {
    const delay    = el.delay        || 0;
    const countDur = el.countDuration || 1.5;
    const progress = getAnimProgress(lt, delay, 0.4);       // visibilidad
    if (progress <= 0) return;

    const countProg = getAnimProgress(lt, delay, countDur); // valor
    const ease      = easeOutExpo(countProg);
    const from      = el.valueStart || 0;
    const to        = el.value      || 0;
    const current   = from + (to - from) * ease;
    const dec       = el.decimals   || 0;
    const formatted = formatNumber(current, dec);

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
    wrapper.style.transform = wrapper.style.transform + ` scale(${0.85 + vis * 0.15})`;
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

    positionElement(div, el.position, 'center');

    const baseScale = (el.scale || 1.0);
    const flipX = el.flip ? -1 : 1;
    let extraTransform = '';

    switch (el.motion) {
      case 'breathe': {
        const br = Math.sin(lt * 2.8) * 0.025;
        extraTransform = ` scale(${baseScale * flipX * (1 - br * 0.5)}, ${baseScale * (1 + br)})`;
        break;
      }
      case 'float': {
        const fl = Math.sin(lt * 2.0) * 14;
        extraTransform = ` scale(${baseScale * flipX}, ${baseScale}) translateY(${fl}px)`;
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
