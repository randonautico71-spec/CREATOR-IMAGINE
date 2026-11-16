// Surface nets: volumen SDF → malla con color por triángulo. Genera generado/animales_malla.js (ballena + tiburón) y generado/vox_animales.js
// node temas/oceano/mallador.js
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const fs = require('fs'), path = require('path'), A = require('./animales');
const FN = { ballena: A.ballena, tiburon: A.tiburon };
if (!isMainThread) { const w = workerData, f = FN[w.cual], v = new Float32Array(w.nx * (w.j1 - w.j0) * w.nz); let i = 0;
  for (let j = w.j0; j < w.j1; j++) for (let k = 0; k < w.nz; k++) for (let a = 0; a < w.nx; a++) v[i++] = f(w.x0 + a * w.h, w.y0 + j * w.h, w.z0 + k * w.h, 0); parentPort.postMessage(v, [v.buffer]); return; }
async function rejilla(cual, x0, y0, z0, x1, y1, z1, h) {
  const nx = Math.ceil((x1 - x0) / h) + 1, ny = Math.ceil((y1 - y0) / h) + 1, nz = Math.ceil((z1 - z0) / h) + 1, n = require('os').cpus().length, partes = [];
  for (let k = 0; k < n; k++) { const j0 = Math.floor(ny * k / n), j1 = Math.floor(ny * (k + 1) / n); partes.push(new Promise(r => { const wk = new Worker(__filename, { workerData: { cual, x0, y0, z0, nx, ny, nz, h, j0, j1 } }); wk.on('message', v => { r({ j0, v }); wk.terminate(); }); })); }
  const res = await Promise.all(partes), V = new Float32Array(nx * ny * nz); for (const { j0, v } of res) V.set(v, j0 * nx * nz); return { V, nx, ny, nz, x0, y0, z0, h };
}
function nets(Gd) {
  const { V, nx, ny, nz, x0, y0, z0, h } = Gd, id = (a, j, k) => (j * nz + k) * nx + a, vid = new Int32Array(nx * ny * nz).fill(-1), out = { v: [], f: [] };
  const E = [[0, 0, 0, 1, 0, 0], [0, 1, 0, 1, 1, 0], [0, 0, 1, 1, 0, 1], [0, 1, 1, 1, 1, 1], [0, 0, 0, 0, 1, 0], [1, 0, 0, 1, 1, 0], [0, 0, 1, 0, 1, 1], [1, 0, 1, 1, 1, 1], [0, 0, 0, 0, 0, 1], [1, 0, 0, 1, 0, 1], [0, 1, 0, 0, 1, 1], [1, 1, 0, 1, 1, 1]];
  for (let j = 0; j < ny - 1; j++) for (let k = 0; k < nz - 1; k++) for (let a = 0; a < nx - 1; a++) { let cx = 0, cy = 0, cz = 0, cnt = 0;
    for (const e of E) { const v0 = V[id(a + e[0], j + e[1], k + e[2])], v1 = V[id(a + e[3], j + e[4], k + e[5])]; if ((v0 < 0) !== (v1 < 0)) { const t = v0 / (v0 - v1); cx += e[0] + (e[3] - e[0]) * t; cy += e[1] + (e[4] - e[1]) * t; cz += e[2] + (e[5] - e[2]) * t; cnt++; } }
    if (!cnt) continue; vid[id(a, j, k)] = out.v.length / 3; out.v.push(x0 + (a + cx / cnt) * h, y0 + (j + cy / cnt) * h, z0 + (k + cz / cnt) * h); }
  const quad = (q, flip) => { if (q.some(i => i < 0)) return; const o = flip ? q : [q[0], q[3], q[2], q[1]]; out.f.push(o[0], o[1], o[2], o[0], o[2], o[3]); };
  for (let j = 1; j < ny - 1; j++) for (let k = 1; k < nz - 1; k++) for (let a = 1; a < nx - 1; a++) { const v0 = V[id(a, j, k)];
    if ((v0 < 0) !== (V[id(a + 1, j, k)] < 0)) quad([vid[id(a, j - 1, k - 1)], vid[id(a, j, k - 1)], vid[id(a, j, k)], vid[id(a, j - 1, k)]], v0 < 0);
    if ((v0 < 0) !== (V[id(a, j + 1, k)] < 0)) quad([vid[id(a - 1, j, k - 1)], vid[id(a - 1, j, k)], vid[id(a, j, k)], vid[id(a, j, k - 1)]], v0 < 0);
    if ((v0 < 0) !== (V[id(a, j, k + 1)] < 0)) quad([vid[id(a - 1, j - 1, k)], vid[id(a, j - 1, k)], vid[id(a, j, k)], vid[id(a - 1, j, k)]], v0 < 0); }
  return out;
}
function colorear(cual, m) { const col = [];
  for (let i = 0; i < m.f.length; i += 3) { const c = [0, 1, 2].map(k => (m.v[m.f[i] * 3 + k] + m.v[m.f[i + 1] * 3 + k] + m.v[m.f[i + 2] * 3 + k]) / 3);
    let cc; if (cual === 'ballena') { const [, t, yb] = A.ballena(c[0], c[1], c[2], 0, true); cc = A.colorBallena(c[0], c[1], c[2], t, yb); } else { const [, t, zb] = A.tiburon(c[0], c[1], c[2], 0, true); cc = A.colorTiburon(c[0], c[1], zb, t); }
    col.push(...cc.map(v => Math.round(Math.max(0, Math.min(1, v)) * 255))); } return col; }
(async () => {
  const t0 = Date.now(), dst = path.join(__dirname, 'generado'); fs.mkdirSync(dst, { recursive: true }); const res = {};
  for (const [cual, bb, h] of [['ballena', [-7.6, -3.6, -5.2, 7.0, 2.6, 5.2], +(process.env.RES_B || .045)], ['tiburon', [-2.6, -1.2, -1.4, 2.4, 1.3, 1.4], +(process.env.RES_T || .016)]]) {
    const g = await rejilla(cual, ...bb, h), m = nets(g); m.c = colorear(cual, m); res[cual] = { v: m.v.map(x => +x.toFixed(3)), f: m.f, c: m.c };
    console.log(cual, 'triángulos', m.f.length / 3, ((Date.now() - t0) / 1000).toFixed(1), 's'); }
  for (const [cual, bb, h] of [['ballena', [-7.6, -3.6, -5.2, 7.0, 2.6, 5.2], .2], ['tiburon', [-2.6, -1.2, -1.4, 2.4, 1.3, 1.4], .075]]) { const g = await rejilla(cual, ...bb, h), m = nets(g); m.c = colorear(cual, m); res[cual + '_lp'] = { v: m.v.map(x => +x.toFixed(3)), f: m.f, c: m.c }; }
  fs.writeFileSync(path.join(dst, 'animales_malla.js'), 'const MALLAS_MAR=' + JSON.stringify(res) + ';');
  // vóxeles (0,12 m) para el estilo vóxel
  const u = +(process.env.VOX_U || .12), vox = {};
  for (const [cual, f, cf, bb] of [['ballena', A.ballena, A.colorBallena, [-7.6, -3.6, -5.2, 7.0, 2.6, 5.2]], ['tiburon', A.tiburon, A.colorTiburon, [-2.6, -1.2, -1.4, 2.4, 1.3, 1.4]]]) { const L = [];
    for (let x = bb[0]; x < bb[3]; x += u) for (let y = bb[1]; y < bb[4]; y += u) for (let z = bb[2]; z < bb[5]; z += u) { const r = f(x + u / 2, y + u / 2, z + u / 2, 0, true); if (r[0] < 0) { const c = cual === 'ballena' ? cf(x, y, z, r[1], r[2]) : cf(x, y, r[2], r[1]); L.push([Math.round(x / u), Math.round(y / u), Math.round(z / u), ...c.map(v => Math.round(Math.max(0, Math.min(1, v)) * 255))]); } }
    vox[cual] = L; console.log('vóxeles', cual, L.length); }
  fs.writeFileSync(path.join(dst, 'vox_animales.js'), 'const VOX_MAR=' + JSON.stringify({ u, ...vox }) + ';');
  console.log('total', ((Date.now() - t0) / 1000).toFixed(1), 's');
})();
