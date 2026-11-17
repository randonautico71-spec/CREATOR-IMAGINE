#!/usr/bin/env node
/* TRANSICIÓN ENTRE DOS ESTILOS (o entre dos clips cualesquiera), sin cortar el movimiento.
   Con un tema del kit: renderiza el mismo tema en los dos estilos con la misma cámara y pasa del uno al otro.
     node bin/tema.cjs ... no hace falta: este script lo llama.
     node bin/transicion.cjs <tema> <estiloA> <estiloB> salida.mp4 [--seg 6] [--cambio 3] [--dur 1] [--tipo pincel] [--fps 30] [--orbita 0.06] [--w 540 --h 960] [--audio m.wav] [--letrero @handle --letrero-s 5]
   Con dos vídeos ya hechos (deben tener el mismo tamaño):
     node bin/transicion.cjs a.mp4 b.mp4 salida.mp4 [--cambio 3] [--dur 1] [--tipo pincel] [--sincro]
   (sin --sincro, B empieza desde su principio; con --sincro, en el cambio se ve el mismo instante de A y de B)
   Tipos: fundido · barrido · cortina · circulo · pixeles · radial · disolver · pincel (borde ondulado, como una pincelada)
   El clip B entra «a la vez» que A: en el cambio se ve el mismo instante en los dos estilos (con un tema, el mismo encuadre;
   clay y fieltro tienen su propio plató, así que entre ellos sí coinciden y con los demás estilos no).
   Coste: el de renderizar el tema en los dos estilos (ver README). */
'use strict';
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const { args, finalizar } = require('./comun.cjs');
const TIPOS = { fundido: 'fade', barrido: 'wipeleft', cortina: 'slideup', circulo: 'circleopen', pixeles: 'pixelize', radial: 'radial', disolver: 'dissolve', pincel: 'custom' };
const PINCEL = "if(lt(X/W*0.8+0.1*sin(Y/H*25)+0.05*sin(Y/H*71+3),(1-P)*1.25-0.1),B,A)";
const dur = f => +spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).stdout.toString().trim();
(async () => {
  const a = args(process.argv.slice(2)), p = a._, tipo = a.tipo || 'pincel';
  if (!TIPOS[tipo] || p.length < 3) { console.error(fs.readFileSync(__filename, 'utf8').split('*/')[0]); process.exit(1); }
  let A, B, sal, tmp = [], sincro = !!a.sincro;
  if (p.length >= 4) {   // tema estiloA estiloB salida
    const [tema, ea, eb, s] = p; sal = path.resolve(s); const seg = +(a.seg || 6), base = sal.replace(/\.mp4$/i, '');
    for (const [e, f] of [[ea, base + '_A.mp4'], [eb, base + '_B.mp4']]) {
      console.log(`Renderizando ${tema} en estilo ${e}...`);
      const r = spawnSync('node', [path.join(__dirname, 'tema.cjs'), tema, e, f, '--seg', String(seg), '--fps', String(a.fps || 30), '--orbita', String(a.orbita ?? .06), ...(a.w ? ['--w', a.w, '--h', a.h] : [])], { stdio: 'inherit' });
      if (r.status) process.exit(r.status); tmp.push(f); }
    [A, B] = tmp; sincro = true;
  } else { [A, B] = p.slice(0, 2).map(f => path.resolve(f)); sal = path.resolve(p[2]); }
  const dA = dur(A), cambio = +(a.cambio ?? Math.max(.5, dA / 2 - .5)), d = +(a.dur || 1), desdeB = sincro ? cambio : 0, total = cambio + dur(B) - desdeB;
  const tr = tipo === 'pincel' ? `transition=custom:expr='${PINCEL}'` : `transition=${TIPOS[tipo]}`;
  const mudo = sal.replace(/\.mp4$/i, '') + '_mudo.mp4';
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', A, '-i', B, '-filter_complex',
    `[0:v]settb=AVTB,fps=${a.fps || 30},format=yuv420p[a];[1:v]trim=start=${desdeB},setpts=PTS-STARTPTS,settb=AVTB,fps=${a.fps || 30},format=yuv420p[b];[a][b]xfade=${tr}:duration=${d}:offset=${cambio}[v]`,
    '-map', '[v]', '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p', mudo], { stdio: 'inherit' });
  if (r.status) { console.error('ffmpeg falló. ¿Tienen los dos vídeos el mismo tamaño?'); process.exit(1); }
  await finalizar(mudo, sal, { seg: total, audio: a.audio, letrero: a.letrero, letreroS: a['letrero-s'] });
  for (const f of tmp) fs.unlinkSync(f);
  console.log('Listo:', sal, `(${total.toFixed(1)} s, cambio en ${cambio} s, ${tipo})`);
})().catch(e => { console.error('FALLO:', e.message); process.exit(1); });
