#!/usr/bin/env node
/* ANIMALES 3D POR SDF / RAY MARCHING (Node en CPU, con hilos; no necesita navegador salvo para el letrero).
   node bin/sdf.cjs <escena> <carpeta> --stills 0,3,6                 fotogramas de control (PNG)
   node bin/sdf.cjs <escena> <salida.mp4> [--seg 10] [--w 540 --h 960] [--fps 30] [--hilos N] [--audio musica.wav] [--letrero @handle] [--letrero-s 7]
   Escenas: sdf/escenas/<escena>.js (bosque, sabana, o las tuyas). Coste medido (4 CPU, 540×960): ~3–3,5 s por fotograma ⇒ 10 s de vídeo ≈ 15–20 min. */
'use strict';
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const path = require('path'), fs = require('fs'), { spawn, spawnSync } = require('child_process');
if (!isMainThread) {
  const M = require('../sdf/motor'), E = require(workerData.escena);
  const orb = +(process.env.ORBITA || 0); if (orb) { const p0 = E.prepara.bind(E); E.prepara = t => { const sc = p0(t), a2 = t * orb, d = [sc.eye[0] - sc.target[0], sc.eye[1] - sc.target[1], sc.eye[2] - sc.target[2]]; sc.eye = [sc.target[0] + d[0] * Math.cos(a2) + d[2] * Math.sin(a2), sc.eye[1], sc.target[2] - d[0] * Math.sin(a2) + d[2] * Math.cos(a2)]; return sc; }; }
  parentPort.on('message', ({ i, t }) => { const buf = M.renderFrame(E, t, workerData.w, workerData.h); parentPort.postMessage({ i, buf }, [buf.buffer]); });
  return;
}
const { args, finalizar } = require('./comun.cjs');
const a = args(process.argv.slice(2)), [nombre, sal] = a._;
if (!nombre || !sal) { console.error(fs.readFileSync(__filename, 'utf8').split('*/')[0]); process.exit(1); }
const escena = fs.existsSync(nombre) ? path.resolve(nombre) : path.resolve(__dirname, '../sdf/escenas', nombre + '.js');
if (!fs.existsSync(escena)) { console.error('No existe la escena', escena, '· hay:', fs.readdirSync(path.join(__dirname, '../sdf/escenas')).join(', ')); process.exit(1); }
const info = require(escena).info || {};
const w = +(a.w || 540), h = +(a.h || 960), fps = +(a.fps || 30), seg = +(a.seg || info.seg || 10), hilos = +(a.hilos || require('os').cpus().length);
const tiempos = a.stills ? String(a.stills).split(',').map(Number) : Array.from({ length: Math.round(seg * fps) }, (_, i) => i / fps);
const N = tiempos.length, t0 = Date.now(), listos = new Map(), mudo = sal.replace(/\.mp4$/i, '') + '_mudo.mp4';
let sig = 0, esc = 0, enc = null, fin = null;
if (a.stills) fs.mkdirSync(sal, { recursive: true });
else { enc = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${w}x${h}`, '-r', String(fps), '-i', '-', '-vf', 'scale=1080:1920:flags=lanczos', '-c:v', 'libx264', '-crf', '17', '-preset', 'slow', '-pix_fmt', 'yuv420p', mudo], { stdio: ['pipe', 'inherit', 'inherit'] }); fin = new Promise(r => enc.on('close', r)); }
const ws = Array.from({ length: Math.min(hilos, N) }, () => new Worker(__filename, { workerData: { escena, w, h } }));
const lanzarUno = wk => { if (sig < N) { const i = sig++; wk.postMessage({ i, t: tiempos[i] }); } };
for (const wk of ws) {
  wk.on('message', async ({ i, buf }) => {
    listos.set(i, Buffer.from(buf)); const antes = esc;
    while (listos.has(esc)) {
      const b = listos.get(esc); listos.delete(esc);
      if (enc) enc.stdin.write(b);
      else { const f = path.join(sal, `${nombre}_t${tiempos[esc]}.png`); spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${w}x${h}`, '-i', '-', '-vf', 'scale=1080:1920:flags=lanczos', f], { input: b }); console.log(f); }
      esc++;
    }
    if (enc && esc > antes && Math.floor(esc / 15) > Math.floor(antes / 15)) process.stdout.write(`\r${nombre}: ${esc}/${N} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    if (esc < N) return lanzarUno(wk);
    if (esc === N && !wk._fin) {
      ws.forEach(x => { x._fin = true; x.terminate(); }); if (!enc) return;
      enc.stdin.end(); await fin; console.log(`\r${nombre}: ${N} fotogramas en ${((Date.now() - t0) / 1000).toFixed(0)} s`);
      await finalizar(mudo, sal, { seg, audio: a.audio, letrero: a.letrero, letreroS: a['letrero-s'] ?? info.letrero_s });
      console.log('Listo:', sal, (fs.statSync(sal).size / 1e6).toFixed(1), 'MB');
    }
  });
  lanzarUno(wk);
}
