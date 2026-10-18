#!/usr/bin/env node
/**
 * render_worker.js — CREATOR IMAGINE Engine v1.2
 *
 * CORRECCIONES v1.2 (optimización de rendimiento, sin cambiar el resultado
 * visual final):
 * - Tres modos de calidad seleccionables con --quality preview|final|master:
 *     preview : 540×960  @ 30fps · JPEG q82 · x264 ultrafast · CRF 25
 *     final   : 1080×1920 @ 60fps · JPEG q94 · x264 veryfast · CRF 18
 *     master  : 1080×1920 @ 60fps · PNG      · x264 medium   · CRF 16
 * - Los fotogramas ya NO se escriben a disco por defecto: cada captura se
 *   obtiene como Buffer en memoria y se envía directamente al stdin de
 *   FFmpeg (image2pipe), eliminando miles de operaciones de E/S.
 *   --keep-frames conserva además una copia en disco para depuración.
 * - --width/--height/--fps explícitos siguen pudiendo sobreescribir el
 *   preset de calidad elegido.
 * - Medición separada de tiempos: inicialización, seekFrame, captura,
 *   espera de stdin (backpressure) y codificación total.
 * - --preview (flag heredado) es equivalente a --quality preview.
 *
 * Uso:
 *   node engine/render_worker.js \
 *     --html    engine/base_template.html \
 *     --timeline projects/<slug>/timeline.json \
 *     --audio   projects/<slug>/music.wav \
 *     --output  projects/<slug>/video.mp4 \
 *     --quality final
 *
 *   O con atajo de proyecto:
 *   node engine/render_worker.js --project projects/<slug>/ --quality preview
 */

'use strict';

const { chromium } = require('playwright');
const { spawn }    = require('child_process');
const path         = require('path');
const fs           = require('fs');

// =========================================================
// PRESETS DE CALIDAD
// =========================================================
const QUALITY_PRESETS = {
  preview: {
    width: 540, height: 960, fps: 30,
    imageType: 'jpeg', jpegQuality: 82,
    ffmpegPreset: 'ultrafast', crf: '25',
    particleLimit: 30, label: 'PREVIEW'
  },
  final: {
    width: 1080, height: 1920, fps: 60,
    imageType: 'jpeg', jpegQuality: 94,
    ffmpegPreset: 'veryfast', crf: '18',
    particleLimit: 70, label: 'FINAL'
  },
  master: {
    width: 1080, height: 1920, fps: 60,
    imageType: 'png', jpegQuality: undefined,
    ffmpegPreset: 'medium', crf: '16',
    particleLimit: 100, label: 'MASTER'
  }
};

// =========================================================
// ARGUMENTOS
// =========================================================
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    html:       null,
    timeline:   null,
    audio:      null,
    output:     null,
    fps:        null,
    width:      null,
    height:     null,
    quality:    null,
    legacyPreview: false,
    project:    null,
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
      case '--quality':    opts.quality    = args[++i]; break;
      case '--preview':    opts.legacyPreview = true; break;
      case '--keep-frames':opts.keepFrames = true; break;
      case '--project': {
        opts.project  = args[++i];
        if (!opts.timeline) opts.timeline = path.join(opts.project, 'timeline.json');
        if (!opts.audio)    opts.audio    = path.join(opts.project, 'music.wav');
        break;
      }
    }
  }

  // Resolver modo de calidad (--quality explícito > --preview heredado > 'final' por defecto)
  if (!opts.quality) opts.quality = opts.legacyPreview ? 'preview' : 'final';
  if (!QUALITY_PRESETS[opts.quality]) {
    console.error(`[Worker] ERROR: --quality desconocido "${opts.quality}" (usa preview|final|master)`);
    process.exit(1);
  }
  const preset = QUALITY_PRESETS[opts.quality];

  // Aplicar preset, respetando overrides explícitos de --width/--height/--fps
  if (opts.width  == null) opts.width  = preset.width;
  if (opts.height == null) opts.height = preset.height;
  if (opts.fps    == null) opts.fps    = preset.fps;
  opts.imageType    = preset.imageType;
  opts.jpegQuality  = preset.jpegQuality;
  opts.ffmpegPreset = preset.ffmpegPreset;
  opts.crf          = preset.crf;
  opts.particleLimit = preset.particleLimit;
  opts.qualityLabel = preset.label;

  // Salida por defecto según proyecto + modo
  if (opts.project && !opts.output) {
    const defaultName = opts.quality === 'preview' ? 'preview.mp4' : 'video.mp4';
    opts.output = path.join(opts.project, defaultName);
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
  const tStart = Date.now();
  const opts = parseArgs();

  console.log(`[Worker] Modo ${opts.qualityLabel} — ${opts.width}×${opts.height} @ ${opts.fps}fps · ${opts.imageType.toUpperCase()}${opts.jpegQuality ? ' q' + opts.jpegQuality : ''} · x264 ${opts.ffmpegPreset} CRF${opts.crf}`);

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

  // ---- Carpeta de output / frames opcionales de depuración ----
  const timestamp  = Date.now();
  const outputDir  = path.dirname(path.resolve(opts.output));
  fs.mkdirSync(outputDir, { recursive: true });
  let framesDir = null;
  if (opts.keepFrames) {
    framesDir = path.join(outputDir, `frames_${timestamp}`);
    fs.mkdirSync(framesDir, { recursive: true });
  }

  // ---- Cargar runtime JS (para inyectarlo) ----
  const runtimePath = path.resolve('engine/timeline_runtime.js');
  if (!fs.existsSync(runtimePath)) {
    console.error(`[Worker] ERROR: Runtime no encontrado: ${runtimePath}`);
    process.exit(1);
  }
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
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--font-render-hinting=none'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: opts.width, height: opts.height },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce'
  });

  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('fonts.googleapis') && !text.includes('fonts.gstatic')) {
        console.warn(`[Browser] ${text}`);
      }
    }
  });

  const htmlPath = path.resolve(opts.html);
  await page.goto(`file://${htmlPath}`, { waitUntil: 'domcontentloaded' });

  await page.evaluate((payload) => {
    window.__TIMELINE__ = payload.timeline;
    window.__RUNTIME_READY__ = false;
    window.__RENDER_QUALITY__ = payload.quality;
    window.__PARTICLE_LIMIT__ = payload.particleLimit;
  }, { timeline, quality: opts.quality, particleLimit: opts.particleLimit });

  await page.addScriptTag({ content: runtimeSource });

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

  const tInitDone = Date.now();
  console.log('[Worker] Runtime listo. Capturando frames (streaming directo a FFmpeg)...');

  // =========================================================
  // FFMPEG — proceso de muxeo en streaming (stdin)
  // =========================================================
  const hasAudio = opts.audio && fs.existsSync(opts.audio);
  const ffmpeg = spawnFfmpegStreaming(opts, hasAudio);
  let ffmpegExitPromise = new Promise((resolve, reject) => {
    let stderr = '';
    ffmpeg.stderr.on('data', d => { stderr += d.toString(); });
    ffmpeg.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg terminó con código ${code}:\n${stderr.split('\n').slice(-12).join('\n')}`));
    });
    ffmpeg.on('error', (err) => {
      if (err.code === 'ENOENT') reject(new Error('FFmpeg no encontrado en PATH. Instala FFmpeg: https://ffmpeg.org'));
      else reject(err);
    });
  });

  // ---- Captura frame a frame (buffer en memoria -> stdin de FFmpeg) ----
  let seekMs = 0, screenshotMs = 0, pipeMs = 0;
  let rendered = 0;
  const logEvery = Math.max(1, Math.floor(opts.fps / 2));

  for (let f = 0; f < totalFrames; f++) {
    const videoTime = f * frameDuration;

    let t0 = Date.now();
    await page.evaluate((t) => { window.__ENGINE__.seekTo(t); }, videoTime);
    seekMs += Date.now() - t0;

    t0 = Date.now();
    const shotOpts = {
      type: opts.imageType,
      clip: { x: 0, y: 0, width: opts.width, height: opts.height },
      animations: 'disabled',
      caret: 'hide'
    };
    if (opts.imageType === 'jpeg') shotOpts.quality = opts.jpegQuality;
    const buffer = await page.screenshot(shotOpts);
    screenshotMs += Date.now() - t0;

    if (framesDir) {
      const ext = opts.imageType === 'jpeg' ? 'jpg' : 'png';
      fs.writeFileSync(path.join(framesDir, `frame_${String(f).padStart(6, '0')}.${ext}`), buffer);
    }

    t0 = Date.now();
    const ok = ffmpeg.stdin.write(buffer);
    if (!ok) {
      await new Promise(resolve => ffmpeg.stdin.once('drain', resolve));
    }
    pipeMs += Date.now() - t0;

    rendered++;

    if (f % logEvery === 0 || f === totalFrames - 1) {
      const pct = Math.round((f / (totalFrames - 1)) * 100);
      process.stdout.write(`\r[Worker] ${videoTime.toFixed(2)}s / ${totalDuration.toFixed(2)}s (${pct}%)`);
    }
  }

  console.log(`\n[Worker] ${rendered}/${totalFrames} frames capturados`);
  ffmpeg.stdin.end();
  await browser.close();

  console.log('[Worker] Esperando a que FFmpeg termine de codificar...');
  const tEncodeStart = Date.now();
  await ffmpegExitPromise;
  const tEncodeDone = Date.now();

  if (framesDir) {
    console.log(`[Worker] Copia de depuración de frames conservada en: ${framesDir}`);
  }

  // Verificar que el output existe y tiene tamaño
  const outputStat = fs.statSync(opts.output);
  if (outputStat.size < 1024) {
    console.error('[Worker] ERROR: El MP4 generado parece vacío');
    process.exit(1);
  }

  const sizeMB = (outputStat.size / 1024 / 1024).toFixed(1);
  const tTotal = Date.now() - tStart;

  console.log(`[Worker] ✓ MP4 generado: ${opts.output} (${sizeMB} MB)`);
  console.log('[Worker] ---- Tiempos ----');
  console.log(`  Inicialización      : ${((tInitDone - tStart) / 1000).toFixed(2)}s`);
  console.log(`  seekFrame (total)   : ${(seekMs / 1000).toFixed(2)}s`);
  console.log(`  Captura (total)     : ${(screenshotMs / 1000).toFixed(2)}s`);
  console.log(`  Espera stdin (total): ${(pipeMs / 1000).toFixed(2)}s`);
  console.log(`  Codificación final  : ${((tEncodeDone - tEncodeStart) / 1000).toFixed(2)}s`);
  console.log(`  TOTAL               : ${(tTotal / 1000).toFixed(2)}s  (${(tTotal / rendered).toFixed(1)}ms/frame, ${(rendered / (tTotal / 1000)).toFixed(2)} fps efectivos)`);
}

// =========================================================
// FFMPEG — proceso de streaming (recibe imágenes por stdin)
// =========================================================
function spawnFfmpegStreaming(opts, hasAudio) {
  const vcodecIn = opts.imageType === 'jpeg' ? 'mjpeg' : 'png';

  const args = [
    '-y',
    '-f',          'image2pipe',
    '-vcodec',     vcodecIn,
    '-framerate',  String(opts.fps),
    '-i',          'pipe:0'
  ];

  if (hasAudio) {
    args.push('-i', opts.audio);
  }

  args.push(
    '-c:v',      'libx264',
    '-preset',   opts.ffmpegPreset,
    '-crf',      opts.crf,
    '-pix_fmt',  'yuv420p',
    '-movflags', '+faststart',
    '-vf',       `scale=${opts.width}:${opts.height}`
  );

  if (hasAudio) {
    args.push(
      '-c:a', 'aac',
      '-b:a', '192k',
      '-ar',  '48000',
      '-ac',  '2',
      '-shortest'
    );
  }

  args.push(opts.output);

  console.log(`[FFmpeg] ffmpeg ${args.join(' ')}`);

  return spawn('ffmpeg', args, { stdio: ['pipe', 'pipe', 'pipe'] });
}

// =========================================================
// ENTRY POINT
// =========================================================
main().catch(err => {
  console.error('\n[Worker] ERROR FATAL:', err.message);
  process.exit(1);
});
