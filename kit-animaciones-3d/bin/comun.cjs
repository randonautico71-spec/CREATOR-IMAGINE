/* Utilidades comunes del kit: argumentos, Playwright, letrero final y acabado (audio + letrero) con ffmpeg. */
'use strict';
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');

function args(v) {
  const o = { _: [] };
  for (let i = 0; i < v.length; i++) { if (v[i].startsWith('--')) { const k = v[i].slice(2); o[k] = (v[i + 1] && !v[i + 1].startsWith('--')) ? v[++i] : true; } else o._.push(v[i]); }
  return o;
}
function playwright() {
  for (const m of ['playwright', '@playwright/test']) { try { return require(m); } catch (e) { /* siguiente */ } }
  console.error('Falta Playwright: npm i -D playwright && npx playwright install chromium'); process.exit(1);
}
function lanzar() {
  const { chromium } = playwright(), o = {};
  if (process.env.CHROME_PATH) o.executablePath = process.env.CHROME_PATH;
  return chromium.launch(o);
}
function ff(argv) { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...argv], { stdio: 'inherit' }); if (r.status) throw new Error('ffmpeg falló: ' + argv.join(' ').slice(0, 200)); }

/* Letrero «SIGUE A @handle» como PNG 1080×1920 con alfa (velo oscuro + tarjeta). */
async function letreroPNG(handle, ruta, W = 1080, H = 1920) {
  const b = await lanzar(), p = await b.newPage();
  const url = await p.evaluate(([handle, W, H]) => {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    x.fillStyle = 'rgba(4,8,20,0.38)'; x.fillRect(0, 0, W, H);
    const cw = Math.min(800, W * .78), ch = cw / 2, cx = W / 2, cy = H * .36;
    const g = x.createRadialGradient(cx, cy, 10, cx, cy, cw * .75); g.addColorStop(0, 'rgba(255,194,60,0.35)'); g.addColorStop(1, 'rgba(255,194,60,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.beginPath(); x.roundRect(cx - cw / 2, cy - ch / 2, cw, ch, 60);
    const lg = x.createLinearGradient(cx - cw / 2, cy - ch / 2, cx + cw / 2, cy + ch / 2); lg.addColorStop(0, '#1B2A5E'); lg.addColorStop(1, '#0A1030');
    x.fillStyle = lg; x.fill(); x.lineWidth = 12; x.strokeStyle = '#FFC23C'; x.stroke();
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
    const txt = (t, y, tam, col) => { let s = tam; do { x.font = `800 ${s}px "DejaVu Sans", Arial, sans-serif`; s -= 4; } while (x.measureText(t).width > cw * .86 && s > 30);
      x.lineWidth = 10; x.strokeStyle = '#000'; x.strokeText(t, cx, y); x.fillStyle = col; x.fillText(t, cx, y); };
    txt('SIGUE A', cy - ch * .2, 80, '#ffffff'); txt(handle, cy + ch * .16, 92, '#FFC23C');
    return c.toDataURL('image/png');
  }, [handle, W, H]);
  fs.writeFileSync(ruta, Buffer.from(url.split(',')[1], 'base64')); await b.close();
}

/* Acabado: añade audio (normalizado a 'lufs' con entrada/salida suave) y/o el letrero desde 'letreroS'. Sin nada que añadir, solo renombra. */
async function finalizar(mudo, salida, { seg, audio, letrero, letreroS, lufs = -14 } = {}) {
  if (!audio && !letrero) { fs.renameSync(mudo, salida); return salida; }
  const ent = ['-i', mudo]; let fv = '[0:v]null[v]', mapA = [];
  if (letrero) {
    const png = mudo.replace(/\.mp4$/, '_letrero.png'); await letreroPNG(letrero === true ? '@randonautico' : letrero, png);
    const t0 = letreroS != null ? +letreroS : Math.max(0, seg - 3);
    ent.push('-loop', '1', '-t', String(Math.max(.1, seg - t0)), '-i', png);
    fv = `[1:v]format=rgba,fade=t=in:st=0:d=0.5:alpha=1,setpts=PTS-STARTPTS+${t0}/TB[l];[0:v][l]overlay=eof_action=pass[v]`;
  }
  let fa = '';
  if (audio) { const k = ent.filter(e => e === '-i').length; ent.push('-i', audio); fa = `;[${k}:a]afade=t=in:d=0.3,afade=t=out:st=${Math.max(0, seg - 1.5)}:d=1.5,loudnorm=I=${lufs}:TP=-1.5,atrim=0:${seg}[a]`; mapA = ['-map', '[a]', '-c:a', 'aac', '-b:a', '192k']; }
  ff([...ent, '-filter_complex', fv + fa, '-map', '[v]', ...mapA, '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-t', String(seg), '-movflags', '+faststart', salida]);
  fs.unlinkSync(mudo); return salida;
}
module.exports = { args, lanzar, ff, letreroPNG, finalizar };
