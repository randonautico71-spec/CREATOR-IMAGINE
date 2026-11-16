'use strict';
// Estilo REALISTA (SDF + texturas procedurales): planeta tipo Tierra, Luna y cohete en órbita. Para banda.js
const vm = require('vm'), fs = require('fs'), path = require('path');
if (typeof globalThis.tierra !== 'function') {
  globalThis.document = { createElement: () => ({ getContext: () => ({}) }) };
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../../estilos/motor3d.js'), 'utf8'));
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'modelo.js'), 'utf8'));
  vm.runInThisContext('Object.assign(globalThis,{norm,sub,mul,add,dot,cross,smooth,mix,clamp,fbm3,vnoise3,hash3,tierra,nube,luzCiudad,estadoCohete,texN,SOL,TH_COHETE})');
}
const M = require('../../sdf/motor');
const G = globalThis, Rp = 3, S = .66, LUNA = [-4.2, 7.2, -6], RL = .7;
const lin_ = c => c.map(v => Math.pow(Math.max(0, v), 2.2) * 1.35);
function base(sc) { return sc.B; }
function local(sc, x, y, z) { const d = [(x - sc.pos[0]) / S, (y - sc.pos[1]) / S, (z - sc.pos[2]) / S], B = sc.B; return [d[0] * B[0][0] + d[1] * B[0][1] + d[2] * B[0][2], d[0] * B[1][0] + d[1] * B[1][1] + d[2] * B[1][2], d[0] * B[2][0] + d[1] * B[2][1] + d[2] * B[2][2]]; }
const sdBox = (x, y, z, bx, by, bz) => { const qx = Math.abs(x) - bx, qy = Math.abs(y) - by, qz = Math.abs(z) - bz; return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0); };
function coheteL(q) {   // SDF del cohete en coordenadas locales (y = eje)
  const [x, y, z] = q, rr = Math.hypot(x, z);
  let d = M.sdRC(x, y, z, 0, -.2, 0, 0, .3, 0, .23, .23);
  d = Math.min(d, M.sdRC(x, y, z, 0, .3, 0, 0, 1.0, 0, .23, .02));
  d = Math.min(d, M.sdRC(x, y, z, 0, -.44, 0, 0, -.2, 0, .19, .23));
  d = Math.min(d, Math.max(M.sdRC(x, y, z, 0, -.44, 0, 0, -.63, 0, .14, .2), -(M.sdRC(x, y, z, 0, -.47, 0, 0, -.68, 0, .1, .16))));
  for (const a of [0, 2.094, 4.189]) { const c = Math.cos(a), s = Math.sin(a), fx = x * c - z * s, fz = x * s + z * c; d = Math.min(d, sdBox(fx - .33, y + .4 - (fx - .33) * .5, fz, .12, .15, .018) - .006); }
  d = Math.min(d, Math.hypot(x - .2, y - .38, z) - .075);
  return d;
}
function matCohete(q) { const [x, y, z] = q, rr = Math.hypot(x, z);
  if (Math.hypot(x - .2, y - .38, z) < .085 && x > .19) return 'cristal';
  if (y < -.43) return 'tobera';
  if (rr > .245 && y < -.15) return 'aleta';
  if (y > .62 || (y > -.22 && y < -.1)) return 'rojo';
  return 'blanco'; }
const E = {
  prepara(t) { G.T_ANIM = t; const est = G.estadoCohete(G.TH_COHETE), ey = est.t, ex = G.norm(G.sub(est.u, G.mul(ey, G.dot(est.u, ey)))), ez = G.cross(ex, ey);
    return { t, pos: est.p, B: [ex, ey, ez], ey, eye: [.8, 1.4, 13.8], target: [0, 2.6, 0], fov: 40, far: 60, pasos: 220 }; },
  map(sc, x, y, z) {
    let d = Math.hypot(x, y, z) - Rp;
    d = Math.min(d, Math.hypot(x - LUNA[0], y - LUNA[1], z - LUNA[2]) - RL);
    const db = Math.hypot(x - sc.pos[0], y - sc.pos[1], z - sc.pos[2]) - 1.0 * S;
    d = Math.min(d, db > .2 ? db : coheteL(local(sc, x, y, z)) * S);
    return d;
  },
  brillo(sc, dx, dy, dz, Tmax) {   // resplandor del escape (volumétrico aproximado)
    let g = [0, 0, 0]; const e = sc.eye;
    for (let k = 0; k < 14; k++) { const u = k / 13, p = G.sub(sc.pos, G.mul(sc.ey, S * (.62 + u * 1.3))), v = G.sub(p, e), tt = v[0] * dx + v[1] * dy + v[2] * dz; if (tt <= 0 || tt > Tmax) continue;
      const q = [e[0] + dx * tt - p[0], e[1] + dy * tt - p[1], e[2] + dz * tt - p[2]], d2 = q[0] * q[0] + q[1] * q[1] + q[2] * q[2], sg = (.045 + u * .16) * S, w = Math.exp(-d2 / (sg * sg)) * (1 - u * .8);
      g = [g[0] + w * 1.4, g[1] + w * (1.1 - u * .55), g[2] + w * (.6 - u * .5)]; }
    return g.map(v => v * .55);
  },
  cielo(sc, dx, dy, dz) {
    const e = sc.eye, b = e[0] * dx + e[1] * dy + e[2] * dz, dm = Math.sqrt(Math.max(0, G.dot(e, e) - b * b));
    let c = [.004, .006, .016];
    const mw = G.fbm3(dx * 3 + 4, dy * 3, dz * 3, 5), banda = Math.exp(-Math.pow((dy + dx * .55 - .15) / .22, 2)); c = c.map((v, k) => v + banda * Math.pow(mw, 2.5) * [.06, .055, .08][k]);
    const sx = Math.floor(dx * 700), sy = Math.floor(dy * 700), sz = Math.floor(dz * 700), h = G.hash3(sx, sy, sz); if (h > .9975) { const k = (h - .9975) / .0025; c = c.map((v, i) => v + k * 1.6 * [1, .95, .9 + .2 * G.hash3(sx, sz, 1)][i]); }
    if (b < 0 && dm < Rp * 1.25) { const q = G.norm(G.add(e, G.mul([dx, dy, dz], -b))), g2 = Math.exp(-(dm - Rp) / (Rp * .045)) * (.12 + .88 * G.smooth(-.3, .6, G.dot(q, G.SOL))); c = c.map((v, k) => v + g2 * [.12, .3, .95][k]); }
    const gl = E.brillo(sc, dx, dy, dz, 1e9); return c.map((v, k) => v + gl[k]);
  },
  shade(sc, x, y, z, nx, ny, nz, dx, dy, dz, T, map) {
    const SOL = G.SOL, dir = [dx, dy, dz], gl = E.brillo(sc, dx, dy, dz, T);
    const rp = Math.hypot(x, y, z);
    if (Math.abs(rp - Rp) < .03) {   // PLANETA
      let n = [x / rp, y / rp, z / rp]; const tx = G.tierra(n);
      if (tx.tierra) { const q = G.texN(n), e = .004, hf = (a, b, c) => G.fbm3(a * 9, b * 9, c * 9, 4), h0 = hf(...q), gx = (hf(q[0] + e, q[1], q[2]) - h0) / e, gy = (hf(q[0], q[1] + e, q[2]) - h0) / e, gz = (hf(q[0], q[1], q[2] + e) - h0) / e;
        n = G.norm([n[0] - .012 * gx, n[1] - .012 * gy, n[2] - .012 * gz]); }
      const dl = G.dot(n, SOL); let dif = G.smooth(-.1, .4, dl);
      const cl = G.nube(n), sombraN = G.nube(G.norm(G.add(n, G.mul(SOL, .025)))) * .55;
      const qd = G.texN(n), fino = tx.tierra ? .78 + .4 * G.fbm3(qd[0] * 34, qd[1] * 34, qd[2] * 34, 4) : 1;
      let s = tx.col.map(v => v / 255 * fino * (.03 + .97 * dif * (1 - sombraN)));
      if (!tx.tierra && !tx.hielo) { const hv = G.norm(G.sub(SOL, dir)), fr = Math.pow(1 - Math.max(0, -G.dot(n, dir)), 5), sp = Math.pow(Math.max(0, G.dot(n, hv)), 120) * dif * .8 + fr * .25 * dif; s = s.map((v, k) => v + sp * [1, .93, .82][k]); }
      if (tx.tierra && dl < -.04 && G.luzCiudad(n)) { const k = G.smooth(-.04, -.25, dl) * (1 - cl) * (.6 + .4 * G.vnoise3(n[0] * 120, n[1] * 120, n[2] * 120)); s = [s[0] + 1.1 * k, s[1] + .75 * k, s[2] + .35 * k]; }
      s = s.map((v, k) => G.mix(v, (.03 + .97 * dif) * [.98, .99, 1][k], cl * .93));
      const rim = Math.pow(1 - Math.max(0, -G.dot(n, dir)), 3) * (.12 + .88 * G.smooth(-.2, .5, dl)); s = [s[0] + .18 * rim, s[1] + .42 * rim, s[2] + .9 * rim];
      return lin_(s).map((v, k) => v + gl[k]);
    }
    if (Math.hypot(x - LUNA[0], y - LUNA[1], z - LUNA[2]) < RL + .03) {   // LUNA
      const n = G.norm([x - LUNA[0], y - LUNA[1], z - LUNA[2]]), m = G.fbm3(n[0] * 3, n[1] * 3, n[2] * 3, 5), cr = G.vnoise3(n[0] * 14, n[1] * 14, n[2] * 14);
      const a = (.42 + .35 * m) * (cr > .75 ? .75 : 1), dif = Math.max(0, G.dot(n, SOL)); return lin_([a * dif + .01, a * dif * .98 + .01, a * dif * .95 + .012]).map((v, k) => v + gl[k]);
    }
    // COHETE
    const q = local(sc, x, y, z), m = matCohete(q), n = [nx, ny, nz];
    let alb = { blanco: [.86, .85, .82], rojo: [.78, .14, .16], aleta: [.74, .13, .15], tobera: [.18, .18, .2], cristal: [.05, .1, .16] }[m];
    if (m === 'blanco') { const panel = Math.abs(((q[1] + 1) * 6.5) % 1 - .5) > .47 ? .7 : 1, rem = (Math.abs(((q[1] + 1) * 6.5) % 1 - .5) > .4 && G.vnoise3(Math.atan2(q[2], q[0]) * 12, q[1] * 40, 1) > .7) ? .75 : 1; alb = alb.map(v => v * panel * rem * (.92 + .1 * G.vnoise3(q[0] * 30, q[1] * 30, q[2] * 30))); }
    const dl = Math.max(0, G.dot(n, SOL)), hv = G.norm(G.sub(SOL, dir)), sp = Math.pow(Math.max(0, G.dot(n, hv)), m === 'cristal' ? 200 : 40) * (m === 'cristal' ? 3 : m === 'tobera' ? .8 : .5);
    const tierraLuz = Math.max(0, -G.dot(n, G.norm([sc.pos[0], sc.pos[1], sc.pos[2]]))) * .22, sky = .06;
    const fr = Math.pow(1 - Math.max(0, -G.dot(n, dir)), 4) * (m === 'cristal' ? .6 : .15);
    const s = alb.map((v, k) => v * (dl * [1.25, 1.18, 1.08][k] + tierraLuz * [.5, .7, 1.1][k] + sky) + sp * dl + fr * [.3, .5, .9][k]);
    return lin_(s).map((v, k) => v + gl[k]);
  },
};
module.exports = E;
