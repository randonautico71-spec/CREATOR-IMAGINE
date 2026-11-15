#!/usr/bin/env node
/* ESTILOS ANIMADOS (Canvas 2D en Chromium). Vertical 1080×1920.
   node bin/estilo.cjs <estilo> <carpeta> --stills 0,2,4            fotogramas de control (PNG)
   node bin/estilo.cjs <estilo> <salida.mp4> [--seg 8] [--fps 30] [--hilos 4] [--audio musica.wav] [--letrero @handle] [--letrero-s 5]
   --extra escena1.js,escena2.js   carga escenas propias (definen ESC.<nombre> = (ctx, t) => {...}) además de las del kit
   Estilos del kit: pixel voxel iso lowpoly wire toon paper galaxy dither ascii info sdf planet */
'use strict';
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const { args, lanzar, finalizar } = require('./comun.cjs');
(async () => {
  const a = args(process.argv.slice(2)), [est, sal] = a._;
  if (!est || !sal) { console.error(fs.readFileSync(__filename, 'utf8').split('*/')[0]); process.exit(1); }
  const b = await lanzar(), hilos = +a.hilos || Math.min(4, require('os').cpus().length), pages = [];
  for (let i = 0; i < (a.stills ? 1 : hilos); i++) {
    const p = await b.newPage(); p.on('pageerror', e => { console.error('Error en la escena:', e.message); process.exit(1); });
    await p.goto('file://' + path.join(__dirname, '../estilos/pagina.html'));
    if (a.extra) for (const f of String(a.extra).split(',')) await p.addScriptTag({ path: path.resolve(f) });
    pages.push(p);
  }
  const lista = await pages[0].evaluate(() => Object.keys(ESC));
  if (!lista.includes(est)) { console.error(`Estilo desconocido: ${est}. Hay: ${lista.join(', ')}`); process.exit(1); }
  if (a.stills) {
    fs.mkdirSync(sal, { recursive: true });
    for (const t of String(a.stills).split(',').map(Number)) { const u = await pages[0].evaluate(([e, t]) => renderStyle(e, t), [est, t]); const f = path.join(sal, `${est}_t${t}.png`); fs.writeFileSync(f, Buffer.from(u.split(',')[1], 'base64')); console.log(f); }
    await b.close(); return;
  }
  const seg = +(a.seg || 8), fps = +(a.fps || 30), N = Math.round(seg * fps), mudo = sal.replace(/\.mp4$/i, '') + '_mudo.mp4', t0 = Date.now();
  const enc = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-c:v', 'mjpeg', '-r', String(fps), '-i', '-', '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p', mudo], { stdio: ['pipe', 'inherit', 'inherit'] });
  const fin = new Promise(r => enc.on('close', r)), listos = new Map(); let sig = 0, esc = 0;
  const volcar = () => { let k = 0; while (listos.has(esc)) { enc.stdin.write(listos.get(esc)); listos.delete(esc); esc++; k++; } if (k && esc % 30 === 0) process.stdout.write(`\r${est}: ${esc}/${N}`); };
  await Promise.all(pages.map(async p => { while (sig < N) { const i = sig++; const u = await p.evaluate(([e, t]) => renderStyle(e, t, 'image/jpeg', .93), [est, i / fps]); listos.set(i, Buffer.from(u.split(',')[1], 'base64')); volcar(); } }));
  enc.stdin.end(); await fin; await b.close();
  console.log(`\r${est}: ${N} fotogramas en ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  await finalizar(mudo, sal, { seg, audio: a.audio, letrero: a.letrero, letreroS: a['letrero-s'] });
  console.log('Listo:', sal, (fs.statSync(sal).size / 1e6).toFixed(1), 'MB');
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
