// FOTOGRAMA SDF a máxima calidad (suavizado 2×, filas repartidas entre hilos).
// node bin/fotograma_sdf.cjs <escena.js> <salida.png> <t> [w=1080] [h=1920]   (AA=0 para desactivar el suavizado)
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const { execFileSync } = require('child_process');
if (!isMainThread) {
  const M = require('../sdf/motor'), E = require(workerData.esc), { w, h, t, y0, y1 } = workerData;
  const clamp = M.clamp, mix = M.mix, sc = E.prepara(t), out = new Uint8Array(w * (y1 - y0) * 3);
  const [ex, ey, ez] = sc.eye, [tx, ty, tz] = sc.target;
  let fx = tx - ex, fy = ty - ey, fz = tz - ez; const fl = Math.hypot(fx, fy, fz); fx /= fl; fy /= fl; fz /= fl;
  let rx = -fz, rz = fx; const rl = Math.hypot(rx, rz); rx /= rl; rz /= rl; const ry = 0;
  const ux = ry * fz - rz * fy, uy = rz * fx - rx * fz, uz = rx * fy - ry * fx, foc = (h / 2) / Math.tan(sc.fov * Math.PI / 360);
  const map = (x, y, z) => E.map(sc, x, y, z);
  for (let py = y0; py < y1; py++) for (let px = 0; px < w; px++) {
    let acc = [0, 0, 0];
    const subs = workerData.aa ? [[.25, .25], [.75, .75]] : [[.5, .5]];
    for (const [ox, oy] of subs) {
      const sx = (px + ox - w / 2) / foc, sy = -(py + oy - h / 2) / foc;
      let dx = fx + rx * sx + ux * sy, dy = fy + ry * sx + uy * sy, dz = fz + rz * sx + uz * sy; const dl = Math.hypot(dx, dy, dz); dx /= dl; dy /= dl; dz /= dl;
      let T = .05, hit = false, dU = 1e9;
      for (let i = 0; i < (sc.pasos || 260); i++) { const d = map(ex + dx * T, ey + dy * T, ez + dz * T); dU = d; if (d < .0005 * T) { hit = true; break; } T += d * .85; if (T > sc.far) break; }
      if (!hit && T < sc.far && dU < .004 * T) hit = true;
      let c;
      if (hit) { const x = ex + dx * T, y = ey + dy * T, z = ez + dz * T, e = .0006 * T + .0004;
        let nx = map(x + e, y, z) - map(x - e, y, z), ny = map(x, y + e, z) - map(x, y - e, z), nz = map(x, y, z + e) - map(x, y, z - e); const nl = Math.hypot(nx, ny, nz) || 1;
        c = E.shade(sc, x, y, z, nx / nl, ny / nl, nz / nl, dx, dy, dz, T, map); } else c = E.cielo(sc, dx, dy, dz);
      acc = acc.map((v, k) => v + c[k] / subs.length);
    }
    const vx = px / w - .5, vy = py / h - .5, vig = 1 - .35 * (vx * vx + vy * vy) * 2, i = ((py - y0) * w + px) * 3;
    for (let k = 0; k < 3; k++) { let v = acc[k] * vig; v = 1 - Math.exp(-v * 1.25); v = Math.pow(v, .4545); v = mix(v, v * v * (3 - 2 * v), .4); out[i + k] = clamp(v * 255, 0, 255); }
    if (px === 0 && py % 64 === 0) parentPort.postMessage({ prog: py });
  }
  parentPort.postMessage({ out }, [out.buffer]); return;
}
const [esc, sal, t = '0', w = '1080', h = '1920'] = process.argv.slice(2), W = +w, Hh = +h, n = require('os').cpus().length, partes = [];
const t0 = Date.now(); let fin = 0;
// filas intercaladas en bloques para repartir la carga (el cielo es barato, el león caro)
const bloques = []; const bs = 16; for (let y = 0; y < Hh; y += bs) bloques.push([y, Math.min(Hh, y + bs)]);
let sig = 0; const res = new Array(bloques.length);
function lanzar() { if (sig >= bloques.length) return; const k = sig++, [y0, y1] = bloques[k];
  const wk = new Worker(__filename, { workerData: { esc: require('path').resolve(esc), w: W, h: Hh, t: +t, y0, y1, aa: process.env.AA !== '0' } });
  wk.on('message', m => { if (m.out) { res[k] = Buffer.from(m.out); wk.terminate(); fin++; if (fin % 10 === 0) process.stdout.write(`\r${fin}/${bloques.length} bloques (${((Date.now() - t0) / 1000).toFixed(0)} s)`); if (fin === bloques.length) terminar(); else lanzar(); } }); }
function terminar() { const buf = Buffer.concat(res); execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${W}x${Hh}`, '-i', '-', sal], { input: buf }); console.log(`\n${sal} en ${((Date.now() - t0) / 1000).toFixed(0)} s`); }
for (let i = 0; i < n; i++) lanzar();
