#!/usr/bin/env node
/**
 * render_worker.js — CREATOR IMAGINE Engine v1.1
 *
 * CORRECCIONES v1.1:
 * - El runtime se inyecta ANTES de inyectar window.__TIMELINE__
 *   para eliminar la race condition de inicialización.
 * - La inicialización del runtime se activa explícitamente desde fuera
 *   (window.__ENGINE_INIT__()) en lugar de hacerlo en DOMContentLoaded.
 * - page.waitForTimeout sustituido por una promesa nativa para
 *   compatibilidad con todas las versiones de Playwright.
 * - Audio re-muestreado a 48 kHz en FFmpeg para cumplir con el estándar MP4.
 * - Los frames se guardan en una carpeta timestamped para evitar colisiones
 *   entre renders paralelos.
 *
 * Uso:
 *   node engine/render_worker.js \
 *     --html    engine/base_template.html \
 *     --timeline projects/<slug>/timeline.json \
 *     --audio   projects/<slug>/music.wav \
 *     --output  projects/<slug>/video.mp4 \
 *     [--fps 60] [--width 1080] [--height 1920] [--preview]
 *
 *   O con atajo de proyecto:
 *   node engine/render_worker.js --project projects/<slug>/
 */

'use strict';

const { chromium } = require('playwright');
const { spawn }    = require('child_process');
const path         = require('path');
const fs           = require('fs');

// =========================================================
// HELPERS
// =========================================================
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// =========================================================
// ARGUMENTOS
// =========================================================
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    html:     null,
    timeline: null,
    audio:    null,
    output:   null,
    fps:      60,
    width:    1080,
    height:   1920,
    preview:  false,
    project:  null,
    keepFrames: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--html':       opts.html       = args[++i]; break;
      case '--timeline':   opts.timeline   = args[++i]; break;
      case '--audio':      opts.audio      = args[++i]; break;
      case '--output':     opts.output     = args[++i]; break;
      case '--fps':        opts.fps        = parseInt(args[++i], 10); break;
      case '--width':      opts.width      = parseInt(args[++i], 10); break;
      case '--height':     opts.height     = parseInt(args[++i], 10); break;
      case '--preview':    opts.preview    = true; break;
      case '--keep-frames':opts.keepFrames = true; break;
      case '--project': {
        opts.project  = args[++i];
        const slug    = path.basename(opts.project.replace(/[/\\]$/, ''));
        if (!opts.timeline) opts.timeline = path.join(opts.project, 'timeline.json');
        if (!opts.audio)    opts.audio    = path.join(opts.project, 'music.wav');
        if (!opts.output)   opts.output   = path.join(opts.project, opts.preview ? 'preview.mp4' : 'video.mp4');
        break;
      }
    }
  }

  // Defaults
  if (!opts.html)     opts.html = 'engine/base_template.html';
  if (!opts.timeline) { console.error('[Worker] ERROR: --timeline requerido'); process.exit(1); }
  if (!opts.output)   { console.error('[Worker] ERROR: --output requerido');   process.exit(1); }

  // Verificar que los archivos existen
  if (!fs.existsSync(opts.html)) {
    console.error(`[Worker] ERROR: HTML no encontrado: ${opts.html}`); process.exit(1);
  }
  if (!fs.existsSync(opts.timeline)) {
    console.error(`[Worker] ERROR: Timeline no encontrado: ${opts.timeline}`); process.exit(1);
  }

  return opts;
}

// =========================================================
// MAIN
// =========================================================
async function main() {
  const opts = parseArgs();

  // Preview: resolución y fps reducidos
  if (opts.preview) {
    opts.fps    = 15;
    opts.width  = 360;
    opts.height = 640;
    console.log('[Worker] Modo PREVIEW — 360×640 @ 15fps');
  } else {
    console.log(`[Worker] Modo FINAL — ${opts.width}×${opts.height} @ ${opts.fps}fps`);
  }

  // ---- Cargar y validar timeline ----
  let timeline;
  try {
    timeline = JSON.parse(fs.readFileSync(opts.timeline, 'utf-8'));
  } catch (err) {
    console.error(`[Worker] ERROR: No se pudo parsear timeline: ${err.message}`);
    process.exit(1);
  }

  const totalDuration = (timeline.scenes || []).reduce((acc, s) => acc + (s.duration || 0), 0);
  if (totalDuration <= 0) {
    console.error('[Worker] ERROR: Duración total del timeline es 0');
    process.exit(1);
  }

  const totalFrames   = Math.ceil(totalDuration * opts.fps);
  const frameDuration = 1 / opts.fps;

  console.log(`[Worker] Timeline: ${(timeline.scenes||[]).length} escenas | Duración: ${totalDuration.toFixed(2)}s | Frames: ${totalFrames}`);

  // ---- Carpeta de frames ----
  const timestamp  = Date.now();
  const outputDir  = path.dirname(path.resolve(opts.output));
  fs.mkdirSync(outputDir, { recursive: true });
  const framesDir  = path.join(outputDir, `frames_${timestamp}`);
  fs.mkdirSync(framesDir, { recursive: true });

  // ---- Cargar runtime JS (para inyectarlo) ----
  const runtimePath = path.resolve('engine/timeline_runtime.js');
  if (!fs.existsSync(runtimePath)) {
    console.error(`[Worker] ERROR: Runtime no encontrado: ${runtimePath}`);
    process.exit(1);
  }
  // Leer el runtime como texto para inyectarlo vía evaluate (evita problemas de path en file:// URLs)
  const runtimeSource = fs.readFileSync(runtimePath, 'utf-8');

  // =========================================================
  // PLAYWRIGHT — Render frames
  // =========================================================
  console.log('[Worker] Iniciando Chromium...');
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',                   // en entornos cloud sin GPU
      '--disable-dev-shm-usage',
      '--font-render-hinting=none'       // render de fuentes consistente
    ]
  });

  const context = await browser.newContext({
    viewport: { width: opts.width, height: opts.height },
    deviceScaleFactor: 1,
    // Desactivar animaciones CSS para control determinista de frames
    reducedMotion: 'reduce'
  });

  const page = await context.newPage();

  // Silenciar errores de carga de fuentes (Google Fonts puede no estar disponible)
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Solo logear errores que no sean de fuentes
      if (!text.includes('fonts.googleapis') && !text.includes('fonts.gstatic')) {
        console.warn(`[Browser] ${text}`);
      }
    }
  });

  // Cargar la plantilla HTML
  const htmlPath = path.resolve(opts.html);
  await page.goto(`file://${htmlPath}`, { waitUntil: 'domcontentloaded' });

  // --- PASO CRÍTICO: Inyectar el timeline PRIMERO ---
  // Esto asegura que window.__TIMELINE__ está disponible cuando el runtime inicie
  await page.evaluate((tl) => {
    window.__TIMELINE__ = tl;
    window.__RUNTIME_READY__ = false;
  }, timeline);

  // --- Inyectar y ejecutar el runtime ---
  // Usamos addScriptTag con content (no path) para evitar problemas de file:// en cloud
  await page.addScriptTag({ content: runtimeSource });

  // Esperar a que el runtime señale que está listo (máx 15s)
  try {
    await page.waitForFunction(
      () => window.__RUNTIME_READY__ === true,
      { timeout: 15000, polling: 100 }
    );
  } catch (err) {
    console.error('[Worker] ERROR: Runtime no inicializó en 15s');
    await browser.close();
    process.exit(1);
  }

  console.log('[Worker] Runtime listo. Capturando frames...');

  // ---- Captura frame a frame ----
  let rendered = 0;
  const logEvery = Math.max(1, Math.floor(opts.fps / 2)); // log cada 0.5s

  for (let f = 0; f < totalFrames; f++) {
    const videoTime = f * frameDuration;

    // Mover el motor al tiempo exacto del frame
    await page.evaluate((t) => {
      window.__ENGINE__.seekTo(t);
    }, videoTime);

    // Espera mínima para que el DOM se actualice (≈1 frame de composición)
    await sleep(8);

    const framePath = path.join(framesDir, `frame_${String(f).padStart(6, '0')}.png`);
    await page.screenshot({
      path: framePath,
      type: 'png',
      clip: { x: 0, y: 0, width: opts.width, height: opts.height }
    });

    rendered++;

    if (f % logEvery === 0 || f === totalFrames - 1) {
      const pct = Math.round((f / (totalFrames - 1)) * 100);
      process.stdout.write(`\r[Worker] ${videoTime.toFixed(2)}s / ${totalDuration.toFixed(2)}s (${pct}%)`);
    }
  }

  console.log(`\n[Worker] ${rendered}/${totalFrames} frames capturados`);
  await browser.close();

  // =========================================================
  // FFMPEG — Muxear video
  // =========================================================
  console.log('[Worker] Muxeando con FFmpeg...');
  await muxVideo(framesDir, opts);

  // Limpiar frames temporales (salvo --keep-frames)
  if (!opts.keepFrames) {
    fs.rmSync(framesDir, { recursive: true, force: true });
  } else {
    console.log(`[Worker] Frames conservados en: ${framesDir}`);
  }

  // Verificar que el output existe y tiene tamaño
  const outputStat = fs.statSync(opts.output);
  if (outputStat.size < 1024) {
    console.error('[Worker] ERROR: El MP4 generado parece vacío');
    process.exit(1);
  }

  const sizeMB = (outputStat.size / 1024 / 1024).toFixed(1);
  console.log(`[Worker] ✓ MP4 generado: ${opts.output} (${sizeMB} MB)`);
}

// =========================================================
// FFMPEG — función de muxeo
// =========================================================
function muxVideo(framesDir, opts) {
  return new Promise((resolve, reject) => {
    const framePattern = path.join(framesDir, 'frame_%06d.png');
    const hasAudio     = opts.audio && fs.existsSync(opts.audio);

    // Argumentos base de FFmpeg
    const args = [
      '-y',                              // sobreescribir output
      '-framerate',  String(opts.fps),
      '-i',          framePattern        // input: frames
    ];

    if (hasAudio) {
      args.push('-i', opts.audio);       // input: audio
    }

    args.push(
      '-c:v',      'libx264',
      '-preset',   'medium',
      '-crf',      '18',
      '-pix_fmt',  'yuv420p',           // compatibilidad universal
      '-movflags', '+faststart',         // streaming-friendly
      '-vf',       `scale=${opts.width}:${opts.height}`  // forzar resolución exacta
    );

    if (hasAudio) {
      args.push(
        '-c:a',      'aac',
        '-b:a',      '192k',
        '-ar',       '48000',           // 48 kHz estándar para MP4
        '-ac',       '2',               // stereo
        '-shortest'                      // cortar al más corto (video vs audio)
      );
    }

    args.push(opts.output);

    console.log(`[FFmpeg] ffmpeg ${args.join(' ')}`);

    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let stderr = '';
    proc.stderr.on('data', d => { stderr += d.toString(); });
    proc.stdout.on('data', d => { /* silencio */ });

    proc.on('close', code => {
      if (code === 0) {
        resolve();
      } else {
        // Mostrar las últimas líneas de FFmpeg para diagnóstico
        const lastLines = stderr.split('\n').slice(-8).join('\n');
        reject(new Error(`FFmpeg terminó con código ${code}:\n${lastLines}`));
      }
    });

    proc.on('error', (err) => {
      if (err.code === 'ENOENT') {
        reject(new Error('FFmpeg no encontrado en PATH. Instala FFmpeg: https://ffmpeg.org'));
      } else {
        reject(err);
      }
    });
  });
}

// =========================================================
// ENTRY POINT
// =========================================================
main().catch(err => {
  console.error('\n[Worker] ERROR FATAL:', err.message);
  process.exit(1);
});
