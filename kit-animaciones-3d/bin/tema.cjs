#!/usr/bin/env node
/* TEMAS DETALLADOS × 14 ESTILOS (fotograma o vídeo vertical 1080×1920)
   node bin/tema.cjs <tema> <estilo> <salida.png | salida.mp4> [opciones]
   Temas:   leon · planeta · ciudad · persona · oceano · delfin · trafico (estilos realista lowpoly info toon paper pixel dither ascii wire; --dia para de día; realista --exacto = CGI por ray marching)
   Estilos: pixel voxel iso lowpoly wire toon paper galaxy dither ascii info realista clay (13 · claymotion: plastilina en stop-motion, 12 imágenes/s) fieltro (14 · fieltro: mismas escenas en fieltro, 12 imágenes/s)
   Opciones de vídeo: --seg 8 --fps 30 --hilos 4 --orbita 0.06 (giro de cámara en rad/s; 0 = fija) --audio musica.wav --letrero @handle --letrero-s 5
   Movimiento en vídeo: la cámara orbita despacio; el león camina, el cohete recorre la órbita y el planeta gira, la gente de la ciudad avanza, la ballena y el tiburón nadan.
   (La persona va en pose fija en los estilos de malla: su malla se genera una vez; en 'realista' sí camina, pero cada fotograma tarda ~50 s.) */
'use strict';
const fs = require('fs'), path = require('path'), { spawn, spawnSync } = require('child_process');
const { args, lanzar, finalizar } = require('./comun.cjs');
const KIT = path.resolve(__dirname, '..'), TEMAS = ['leon', 'planeta', 'ciudad', 'persona', 'oceano', 'delfin', 'trafico'];
const ESTILOS = ['pixel', 'voxel', 'iso', 'lowpoly', 'wire', 'toon', 'paper', 'galaxy', 'dither', 'ascii', 'info', 'realista', 'clay', 'fieltro'];
const RENDER = { leon: 'renderHD', planeta: 'renderP', ciudad: 'renderC', persona: 'renderPx', oceano: 'renderMar', delfin: 'renderMar', trafico: 'renderTraf' };
(async () => {
  const a = args(process.argv.slice(2)), [tema, estilo, sal] = a._;
  if (!TEMAS.includes(tema) || !ESTILOS.includes(estilo) || !sal) { console.error(fs.readFileSync(__filename, 'utf8').split('*/')[0]); process.exit(1); }
  if (tema === 'trafico' && !['realista', 'lowpoly', 'info', 'toon', 'paper', 'pixel', 'dither', 'ascii', 'wire'].includes(estilo)) { console.error(`El tema tráfico aún no tiene el estilo "${estilo}". Hay: realista lowpoly info toon paper pixel dither ascii wire (y --dia para de día; realista --exacto = CGI por ray marching, muy lento). Para otro estilo hay que escribir su escena.`); process.exit(1); }
  const video = /\.mp4$/i.test(sal), DEL = tema === 'delfin', dir = path.join(KIT, 'temas', DEL ? 'oceano' : tema);
  if (DEL) process.env.MAR = 'delfin';   // las escenas SDF del océano ponen el delfín en vez de la ballena y el tiburón
  if (tema === 'persona' && estilo !== 'realista' && !fs.existsSync(path.join(dir, 'generado', 'persona_malla.js'))) {
    console.log('Generando la malla de la persona (una vez, ~15 s)...'); spawnSync('node', [path.join(dir, 'mallador.js')], { stdio: 'inherit' }); spawnSync('node', [path.join(dir, 'voxeles.js')], { stdio: 'inherit' }); }
  if ((tema === 'oceano' || DEL) && (!fs.existsSync(path.join(dir, 'generado', 'animales_malla.js')) || !fs.readFileSync(path.join(dir, 'generado', 'vox_animales.js'), 'utf8').includes('"delfin"'))) { console.log('Generando las mallas de la ballena y el tiburón (una vez, ~15 s)...'); spawnSync('node', [path.join(dir, 'mallador.js')], { stdio: 'inherit' }); }
  if (estilo === 'clay' || estilo === 'fieltro') {   // CLAYMOTION y FIELTRO: escena SDF de plastilina; el vídeo se calcula a 12 imágenes/s (stop-motion) y se pasa a los fps pedidos
    const esc = path.join(dir, 'clay.js'), envM = { ...process.env, MATERIAL: estilo === 'fieltro' ? 'fieltro' : '' };
    if (!video) { const r = spawnSync('node', [path.join(__dirname, 'fotograma_sdf.cjs'), esc, path.resolve(sal), String(a.t || 0)], { stdio: 'inherit', env: envM }); process.exit(r.status); }
    const seg = +(a.seg || 8), fps = +(a.fps || 30), tmp = path.resolve(sal).replace(/\.mp4$/i, '') + '_12ips.mp4', mudo = path.resolve(sal).replace(/\.mp4$/i, '') + '_mudo.mp4';
    const r = spawnSync('node', [path.join(__dirname, 'sdf.cjs'), esc, tmp, '--seg', String(seg), '--fps', '12', ...(a.w ? ['--w', a.w, '--h', a.h] : [])], { stdio: 'inherit', env: { ...envM, ORBITA: a.orbita ?? '0' } });
    if (r.status) process.exit(r.status);
    spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', tmp, '-vf', `fps=${fps}`, '-c:v', 'libx264', '-crf', '17', '-preset', 'slow', '-pix_fmt', 'yuv420p', mudo], { stdio: 'inherit' }); fs.unlinkSync(tmp);
    await finalizar(mudo, path.resolve(sal), { seg, audio: a.audio, letrero: a.letrero, letreroS: a['letrero-s'] });
    console.log('Listo:', sal, (fs.statSync(sal).size / 1e6).toFixed(1), 'MB'); return;
  }
  if (estilo === 'realista' && !(tema === 'trafico' && !a.exacto)) {
    const esc = path.join(dir, tema === 'trafico' ? 'cgi.js' : 'realista.js'); if (tema === 'trafico' && a.dia) process.env.TRAF_DIA = '1';
    if (!video) { const r = spawnSync('node', [path.join(__dirname, 'fotograma_sdf.cjs'), esc, path.resolve(sal), String(a.t || 0)], { stdio: 'inherit', env: { ...process.env } }); process.exit(r.status); }
    const r = spawnSync('node', [path.join(__dirname, 'sdf.cjs'), esc, path.resolve(sal), '--seg', String(a.seg || 8), '--fps', String(a.fps || 30), ...(a.audio ? ['--audio', a.audio] : []), ...(a.letrero ? ['--letrero', a.letrero] : []), ...(a['letrero-s'] ? ['--letrero-s', a['letrero-s']] : []), ...(a.w ? ['--w', a.w, '--h', a.h] : [])], { stdio: 'inherit', env: { ...process.env, ORBITA: a.orbita ?? '0.06' } });
    process.exit(r.status);
  }
  const TRAF = tema === 'trafico';
  if (TRAF) fs.writeFileSync(path.join(dir, '.previo.js'), 'globalThis.ESC = globalThis.ESC || {}; globalThis.TRAF_DIA = ' + !!a.dia + ';');
  const scripts = TRAF ? [path.join(dir, '.previo.js'), path.join(KIT, 'estilos/motor3d.js'), path.join(dir, 'escena.js'), path.join(dir, 'estilos.js')] : [path.join(KIT, 'estilos/motor3d.js'), path.join(dir, 'modelo.js'), ...(tema === 'persona' ? [path.join(dir, 'malla.js'), path.join(dir, 'generado/persona_malla.js'), path.join(dir, 'generado/vox_persona.js')] : []), ...((tema === 'oceano' || DEL) ? [path.join(dir, 'generado/animales_malla.js'), path.join(dir, 'generado/vox_animales.js')] : []), path.join(dir, 'estilos.js'), ...(DEL ? [path.join(KIT, 'temas/delfin/delfin.js')] : [])];
  const html = path.join(dir, '.pagina.html');
  fs.writeFileSync(html, '<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">' + scripts.map(s => `<script src="file://${s}"></script>`).join('') +
    `<script>globalThis.TRAF_DIA = ${!!a.dia}; globalThis.ESC = globalThis.ESC || {};</script><script>const _cam = camera; camera = (eye, target, o) => { const a = (globalThis.T_ANIM || 0) * (globalThis.ORBITA || 0); if (!a) return _cam(eye, target, o); return _cam(add(target, rotY(sub(eye, target), a)), target, o); };</script></body></html>`);
  const b = await lanzar(), orbita = tema === 'trafico' ? 0 : +(a.orbita ?? .06), hilos = video ? +(a.hilos || Math.min(3, require('os').cpus().length)) : 1, pages = [];
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
