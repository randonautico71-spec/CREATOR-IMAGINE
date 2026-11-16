// Surface nets: SDF → malla (triángulos) con color por pieza. node mallador.js salida.json
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const fs = require('fs'), path = require('path');
const SP = require('./sdf_persona'), G = globalThis;
function muestreo(S, x0, y0, z0, nx, ny, nz, h, j0, j1) { const v = new Float32Array(nx * (j1 - j0) * nz); let i = 0; for (let j = j0; j < j1; j++) for (let k = 0; k < nz; k++) for (let a = 0; a < nx; a++) v[i++] = SP.sdf(S, x0 + a * h, y0 + j * h, z0 + k * h); return v; }
if (!isMainThread) { const w = workerData, S = SP.construye(w.t); const v = muestreo(S, w.x0, w.y0, w.z0, w.nx, w.ny, w.nz, w.h, w.j0, w.j1); parentPort.postMessage(v, [v.buffer]); return; }
async function rejilla(t, x0, y0, z0, x1, y1, z1, h) {
  const nx = Math.ceil((x1 - x0) / h) + 1, ny = Math.ceil((y1 - y0) / h) + 1, nz = Math.ceil((z1 - z0) / h) + 1, n = require('os').cpus().length, partes = [];
  for (let k = 0; k < n; k++) { const j0 = Math.floor(ny * k / n), j1 = Math.floor(ny * (k + 1) / n); partes.push(new Promise(r => { const wk = new Worker(__filename, { workerData: { t, x0, y0, z0, nx, ny, nz, h, j0, j1 } }); wk.on('message', v => { r({ j0, v }); wk.terminate(); }); })); }
  const res = await Promise.all(partes), V = new Float32Array(nx * ny * nz); for (const { j0, v } of res) V.set(v, j0 * nx * nz);
  return { V, nx, ny, nz, x0, y0, z0, h };
}
function nets(Gd, S, filtro, out) {
  const { V, nx, ny, nz, x0, y0, z0, h } = Gd, id = (a, j, k) => (j * nz + k) * nx + a, vid = new Int32Array(nx * ny * nz).fill(-1), base = out.v.length / 3;
  const E = [[0, 0, 0, 1, 0, 0], [0, 1, 0, 1, 1, 0], [0, 0, 1, 1, 0, 1], [0, 1, 1, 1, 1, 1], [0, 0, 0, 0, 1, 0], [1, 0, 0, 1, 1, 0], [0, 0, 1, 0, 1, 1], [1, 0, 1, 1, 1, 1], [0, 0, 0, 0, 0, 1], [1, 0, 0, 1, 0, 1], [0, 1, 0, 0, 1, 1], [1, 1, 0, 1, 1, 1]];
  for (let j = 0; j < ny - 1; j++) for (let k = 0; k < nz - 1; k++) for (let a = 0; a < nx - 1; a++) {
    let s = 0, cx = 0, cy = 0, cz = 0, cnt = 0;
    for (const e of E) { const v0 = V[id(a + e[0], j + e[1], k + e[2])], v1 = V[id(a + e[3], j + e[4], k + e[5])]; if ((v0 < 0) !== (v1 < 0)) { const t = v0 / (v0 - v1); cx += e[0] + (e[3] - e[0]) * t; cy += e[1] + (e[4] - e[1]) * t; cz += e[2] + (e[5] - e[2]) * t; cnt++; } }
    if (!cnt) continue; const p = [x0 + (a + cx / cnt) * h, y0 + (j + cy / cnt) * h, z0 + (k + cz / cnt) * h]; vid[id(a, j, k)] = out.v.length / 3; out.v.push(...p);
  }
  const quad = (q, flip) => { if (q.some(i => i < 0)) return; const P = q.map(i => [out.v[i * 3], out.v[i * 3 + 1], out.v[i * 3 + 2]]); const c = [0, 1, 2].map(k => (P[0][k] + P[1][k] + P[2][k] + P[3][k]) / 4); if (!filtro(c)) return; const o = flip ? [q[0], q[3], q[2], q[1]] : q; out.f.push(o[0], o[1], o[2], o[0], o[2], o[3]); };
  for (let j = 1; j < ny - 1; j++) for (let k = 1; k < nz - 1; k++) for (let a = 1; a < nx - 1; a++) { const v0 = V[id(a, j, k)];
    if (a < nx - 1) { const v1 = V[id(a + 1, j, k)]; if ((v0 < 0) !== (v1 < 0)) quad([vid[id(a, j - 1, k - 1)], vid[id(a, j, k - 1)], vid[id(a, j, k)], vid[id(a, j - 1, k)]], v0 < 0); }
    if (j < ny - 1) { const v1 = V[id(a, j + 1, k)]; if ((v0 < 0) !== (v1 < 0)) quad([vid[id(a - 1, j, k - 1)], vid[id(a - 1, j, k)], vid[id(a, j, k)], vid[id(a, j, k - 1)]], v0 < 0); }
    if (k < nz - 1) { const v1 = V[id(a, j, k + 1)]; if ((v0 < 0) !== (v1 < 0)) quad([vid[id(a - 1, j - 1, k)], vid[id(a, j - 1, k)], vid[id(a, j, k)], vid[id(a - 1, j, k)]], v0 < 0); }
  }
}
(async () => {
  const t = .15, S = SP.construye(t), out = { v: [], f: [] }, t0 = Date.now(), YH = 1.56;
  const cuerpo = await rejilla(t, -.42, -.03, -.36, .45, 1.62, .36, .0065); console.log('cuerpo', ((Date.now() - t0) / 1000).toFixed(1), 's');
  nets(cuerpo, S, c => c[1] < YH + .004, out);
  const cab = await rejilla(t, -.165, 1.52, -.12, .145, 1.84, .12, .0016); console.log('cabeza', ((Date.now() - t0) / 1000).toFixed(1), 's');
  nets(cab, S, c => c[1] >= YH - .004, out);
  // color por triángulo según la pieza más cercana
  const col = [];
  for (let i = 0; i < out.f.length; i += 3) { const c = [0, 1, 2].map(k => (out.v[out.f[i] * 3 + k] + out.v[out.f[i + 1] * 3 + k] + out.v[out.f[i + 2] * 3 + k]) / 3); const r = SP.sdf(S, c[0], c[1], c[2], true), q = r.parte;
    const cc = SP.color(S, c[0], c[1], c[2], q); col.push(cc.map(v => Math.round(Math.max(0, Math.min(255, v))))); }
  const dst = process.argv[2] || path.join(__dirname, 'generado', 'persona_malla.js'); fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.writeFileSync(dst, 'const PERSONA_MALLA=' + JSON.stringify({ v: out.v.map(x => +x.toFixed(4)), f: out.f, c: col.flat() }) + ';');
  console.log('vértices', out.v.length / 3, 'triángulos', out.f.length / 3, 'total', ((Date.now() - t0) / 1000).toFixed(1), 's');
})();
