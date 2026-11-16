#!/usr/bin/env node
/* TEMAS DETALLADOS × 12 ESTILOS (fotograma o vídeo vertical 1080×1920)
   node bin/tema.cjs <tema> <estilo> <salida.png | salida.mp4> [opciones]
   Temas:   leon · planeta · ciudad · persona · oceano
   Estilos: pixel voxel iso lowpoly wire toon paper galaxy dither ascii info realista
   Opciones de vídeo: --seg 8 --fps 30 --hilos 4 --orbita 0.06 (giro de cámara en rad/s; 0 = fija) --audio musica.wav --letrero @handle --letrero-s 5
   Movimiento en vídeo: la cámara orbita despacio; el león camina, el cohete recorre la órbita y el planeta gira, la gente de la ciudad avanza, la ballena y el tiburón nadan.
   (La persona va en pose fija en los estilos de malla: su malla se genera una vez; en 'realista' sí camina, pero cada fotograma tarda ~50 s.) */
'use strict';
const fs = require('fs'), path = require('path'), { spawn, spawnSync } = require('child_process');
const { args, lanzar, finalizar } = require('./comun.cjs');
const KIT = path.resolve(__dirname, '..'), TEMAS = ['leon', 'planeta', 'ciudad', 'persona', 'oceano'];
const ESTILOS = ['pixel', 'voxel', 'iso', 'lowpoly', 'wire', 'toon', 'paper', 'galaxy', 'dither', 'ascii', 'info', 'realista'];
const RENDER = { leon: 'renderHD', planeta: 'renderP', ciudad: 'renderC', persona: 'renderPx', oceano: 'renderMar' };
(async () => {
  const a = args(process.argv.slice(2)), [tema, estilo, sal] = a._;
  if (!TEMAS.includes(tema) || !ESTILOS.includes(estilo) || !sal) { console.error(fs.readFileSync(__filename, 'utf8').split('*/')[0]); process.exit(1); }
  const video = /\.mp4$/i.test(sal), dir = path.join(KIT, 'temas', tema);
  if (tema === 'persona' && estilo !== 'realista' && !fs.existsSync(path.join(dir, 'generado', 'persona_malla.js'))) {
    console.log('Generando la malla de la persona (una vez, ~15 s)...'); spawnSync('node', [path.join(dir, 'mallador.js')], { stdio: 'inherit' }); spawnSync('node', [path.join(dir, 'voxeles.js')], { stdio: 'inherit' }); }
  if (tema === 'oceano' && !fs.existsSync(path.join(dir, 'generado', 'animales_malla.js'))) { console.log('Generando las mallas de la ballena y el tiburón (una vez, ~15 s)...'); spawnSync('node', [path.join(dir, 'mallador.js')], { stdio: 'inherit' }); }
  if (estilo === 'realista') {
    const esc = path.join(dir, 'realista.js');
    if (!video) { const r = spawnSync('node', [path.join(__dirname, 'fotograma_sdf.cjs'), esc, path.resolve(sal), String(a.t || 0)], { stdio: 'inherit', env: { ...process.env } }); process.exit(r.status); }
    const r = spawnSync('node', [path.join(__dirname, 'sdf.cjs'), esc, path.resolve(sal), '--seg', String(a.seg || 8), '--fps', String(a.fps || 30), ...(a.audio ? ['--audio', a.audio] : []), ...(a.letrero ? ['--letrero', a.letrero] : []), ...(a['letrero-s'] ? ['--letrero-s', a['letrero-s']] : []), ...(a.w ? ['--w', a.w, '--h', a.h] : [])], { stdio: 'inherit', env: { ...process.env, ORBITA: a.orbita ?? '0.06' } });
    process.exit(r.status);
  }
  const scripts = [path.join(KIT, 'estilos/motor3d.js'), path.join(dir, 'modelo.js'), ...(tema === 'persona' ? [path.join(dir, 'malla.js'), path.join(dir, 'generado/persona_malla.js'), path.join(dir, 'generado/vox_persona.js')] : []), ...(tema === 'oceano' ? [path.join(dir, 'generado/animales_malla.js'), path.join(dir, 'generado/vox_animales.js')] : []), path.join(dir, 'estilos.js')];
  const html = path.join(dir, '.pagina.html');
  fs.writeFileSync(html, '<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">' + scripts.map(s => `<script src="file://${s}"></script>`).join('') +
    `<script>const _cam = camera; camera = (eye, target, o) => { const a = (globalThis.T_ANIM || 0) * (globalThis.ORBITA || 0); if (!a) return _cam(eye, target, o); return _cam(add(target, rotY(sub(eye, target), a)), target, o); };</script></body></html>`);
  const b = await lanzar(), orbita = +(a.orbita ?? .06), hilos = video ? +(a.hilos || Math.min(3, require('os').cpus().length)) : 1, pages = [];
  for (let i = 0; i < hilos; i++) { const p = await b.newPage(); p.on('pageerror', e => { console.error('Error en la escena:', e.message); process.exit(1); }); await p.goto('file://' + html); await p.evaluate(o => { globalThis.ORBITA = o; }, orbita); pages.push(p); }
  const fn = RENDER[tema], foto = (p, t) => p.evaluate(([fn, est, t]) => { globalThis.T_ANIM = t; return window[fn](est); }, [fn, estilo, t]);
  if (!video) { const u = await foto(pages[0], +(a.t || 0)); fs.writeFileSync(sal, Buffer.from(u.split(',')[1], 'base64')); await b.close(); console.log('Listo:', sal); return; }
  const seg = +(a.seg || 8), fps = +(a.fps || 30), N = Math.round(seg * fps), mudo = sal.replace(/\.mp4$/i, '') + '_mudo.mp4', t0 = Date.now();
  const enc = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-c:v', 'png', '-r', String(fps), '-i', '-', '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p', mudo], { stdio: ['pipe', 'inherit', 'inherit'] });
  const fin = new Promise(r => enc.on('close', r)), listos = new Map(); let sig = 0, esc = 0;
  await Promise.all(pages.map(async p => { while (sig < N) { const i = sig++; const u = await foto(p, i / fps); listos.set(i, Buffer.from(u.split(',')[1], 'base64'));
    while (listos.has(esc)) { enc.stdin.write(listos.get(esc)); listos.delete(esc); esc++; if (esc % 15 === 0) process.stdout.write(`\r${tema}/${estilo}: ${esc}/${N} (${((Date.now() - t0) / 1000).toFixed(0)} s)`); } } }));
  enc.stdin.end(); await fin; await b.close(); fs.unlinkSync(html);
  console.log(`\n${tema}/${estilo}: ${N} fotogramas en ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  await finalizar(mudo, sal, { seg, audio: a.audio, letrero: a.letrero, letreroS: a['letrero-s'] });
  console.log('Listo:', sal, (fs.statSync(sal).size / 1e6).toFixed(1), 'MB');
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
