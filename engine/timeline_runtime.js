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
      inner.textContent = el.text;
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
