'use strict';
// ESCENA 'sabana' · Texturas procedurales: jirafa, cebras y guepardo caminando por la sabana
const M = require('../../sdf/motor');
M.ESPECIES.leon = { bl: .62, bh: .26, bw: .22, L1: .4, L2: .42, lr: .07, amp: .4, fold: .6, freq: 1.0, gait: M.PASO, bob: .02, alto: 1.0, nx: .16, ny: .16, nr: .15, nod: .03, hl: .17, hh: .14, hw: .15, sl: .11, sd: .04, sr: .09, el: .06, er: .04, tx: -.75, ty: -.45, tw: .1, tr: .045, k: .1, zarpa: 1, borla: 1, colaPunta: .9, orejaPunta: .9, ojo: 1.0 };
const CERCA = process.env.LEON_PLANO === 'cerca';
const ROCAS = [[-.7, .12, -1.5, .5, .3, .4], [-1.15, .05, -1.05, .26, .16, .22], [2.4, .03, 1.2, .16, .1, .14], [-2.2, .04, .9, .2, .12, .18]];
const sueloH = (x, z) => sueloH0(x, z);
const nfbm = (x, y, z) => .5 * M.n3(x, y, z) + .3 * M.n3(x * 2.1, y * 2.1, z * 2.1) + .2 * M.n3(x * 4.3, y * 4.3, z * 4.3);
function rocas(x, y, z) { let d = 1e9; for (const [a, b, c, rx, ry, rz] of ROCAS) { const bb = Math.hypot(x - a, y - b, z - c) - Math.max(rx, ry, rz) - .1; if (bb > .3) { d = Math.min(d, bb); continue; } d = Math.min(d, (M.sdEll(x - a, y - b, z - c, rx, ry, rz) - .07 * nfbm(x * 5, y * 5, z * 5)) * .8); } return d; }
function melena(sc, x, y, z) { const m = sc.melena; if (!m) return 1e9; const bb = Math.hypot(x - m.bx, y - m.by, z - m.bz) - m.br; if (bb > .25) return bb;
  const d1 = M.sdEll(x - m.a[0], y - m.a[1], z - m.a[2], .22, .31, .31), d2 = M.sdEll(x - m.b[0], y - m.b[1], z - m.b[2], .27, .31, .28);
  const k = .1, h = Math.max(k - Math.abs(d1 - d2), 0) / k, d = Math.min(d1, d2) - h * h * k * .25;
  const r = (.5 * M.n3(x * 9, y * 9, z * 9) + .3 * M.n3(x * 19, y * 23, z * 19) + .2 * M.n3(x * 40, y * 52, z * 40));
  return (d - .07 * r + .02) * .65; }
const sueloD = (x, z) => sueloH(x, z) + .018 * M.n2(x * 9, z * 9);
const { clamp, mix, sstep, fract, h2, n2, n3, fbm2, voro3, cuadrupedo, sdAnimal, primCercana, sombra, sdEll, sdCap } = M;
const SUN = (() => { const v = [0.55, 0.42, 0.72], l = Math.hypot(...v); return v.map(a => a / l); })();
const sueloH0 = (x, z) => .12 * Math.sin(x * .3 + 1) * Math.cos(z * .25) + .06 * Math.sin(x * .9 + z * .7);
const ACACIAS = [[-6, -9, 1.0], [5, -16, 1.3], [-14, -22, 1.1], [16, -28, 1.4], [1, -34, 1.2], [-24, -38, 1.3], [10, -10, .9]];
function acacia(x, y, z) {
  let d = 1e9;
  for (const [ax, az, s] of ACACIAS) {
    const b = Math.hypot(x - ax, z - az) - 3.2 * s; if (b > d || b > 1.5) { d = Math.min(d, b); continue; }
    let e = sdCap(x, y, z, ax, -.2, az, ax + .3 * s, 2.2 * s, az, .16 * s);
    e = Math.min(e, sdCap(x, y, z, ax + .3 * s, 2.2 * s, az, ax - .9 * s, 3.0 * s, az + .3 * s, .09 * s));
    e = Math.min(e, sdCap(x, y, z, ax + .3 * s, 2.2 * s, az, ax + 1.3 * s, 3.0 * s, az - .2 * s, .09 * s));
    const cp = sdEll(x - ax - .2 * s, y - 3.25 * s, z - az, 2.5 * s, .38 * s, 2.1 * s) - .12 * n2(x * 2.5, z * 2.5);
    d = Math.min(d, e, cp * .8);
  }
  return d;
}
const E = {
  prepara(t) {
    const cx = 1.05 * t;
    const L = cuadrupedo('leon', 1.05 * t, 0, t, .4, 1, { v: 1.05, suelo: sueloH }), c = L.cab;
    const P = (lx, ly, lz, rx, ry, rz, m, hard) => L.P.push({ t: 0, cx: L.ox + lx, cy: L.oy + ly, cz: L.oz + lz, rx, ry, rz, m, hard });
    for (const sd of [-1, 1]) { P(c.hx + .07, c.hy - .05, sd * .085, .1, .085, .075, 'mejilla'); P(c.tipx - .03, c.tipy - .025, sd * .045, .06, .05, .05, 'bigotera'); }
    P(c.hx + .07, c.hy + .095, 0, .095, .035, .115, 'frente'); P(c.hx + .14, c.hy - .12, 0, .08, .04, .06, 'barbilla');
    const ma = [L.ox + c.hx - .2, L.oy + c.hy + .03, L.oz], mb = [L.ox + c.hx - .42, L.oy + c.hy - .18, L.oz];
    const melenaInfo = { a: ma, b: mb, bx: (ma[0] + mb[0]) / 2, by: (ma[1] + mb[1]) / 2, bz: L.oz, br: .62 };
    const an = [L];
    if (CERCA) return { t, an, melena: melenaInfo, eye: [cx + 2.75, 1.22, 2.0], target: [cx + .55, 1.0, 0], fov: 30, far: 90, pasos: 320 };
    return { t, an, melena: melenaInfo, eye: [cx + 3.0, 1.15, 4.3], target: [cx - .15, .88, 0], fov: 44, far: 90, pasos: 300 };
  },
  map(sc, x, y, z, sinSuelo) {
    let d = sinSuelo ? 1e9 : (y - sueloD(x, z)) * .85;
    const a = Math.min(acacia(x, y, z), rocas(x, y, z)); if (a < d) d = a;
    const dm = melena(sc, x, y, z);
    for (const an of sc.an) { let da = sdAnimal(an, x, y, z); const k = .06, h = Math.max(k - Math.abs(da - dm), 0) / k; da = Math.min(da, dm) - h * h * k * .25; if (da < d) d = da; }
    return d;
  },
  cielo(sc, dx, dy, dz) {
    const az = Math.atan2(dx, -dz), hill = .035 + .022 * Math.sin(az * 6 + 1) + .012 * Math.sin(az * 15) + .008 * Math.sin(az * 31);
    const tt = clamp(dy * 2.2, 0, 1);
    let c = [mix(1.25, .38, tt), mix(.78, .52, tt), mix(.42, .78, tt)];
    if (dy < hill && dy > -.2) c = [.62, .5, .5].map((v, k) => mix(v, c[k], .35));
    const s = Math.max(0, dx * SUN[0] + dy * SUN[1] + dz * SUN[2]); c = c.map((v, k) => v + Math.pow(s, 8) * [.4, .25, .1][k]);
    return c;
  },
  shade(sc, x, y, z, nx, ny, nz, dx, dy, dz, T, map) {
    let matAn = null, alb;
    const ds = (y - sueloD(x, z)) * .85, dacc = acacia(x, y, z), drc = rocas(x, y, z), dmel = melena(sc, x, y, z);
    let best = Math.min(ds, dacc, drc), an = null, esMelena = false;
    for (const a of sc.an) { const d = sdAnimal(a, x, y, z); if (d < best || dmel < best) { an = a; esMelena = dmel < d; best = Math.min(d, dmel); } }
    // relieve de pelo (bump) sobre el animal
    if (an) { const fr = esMelena ? [10, 34, 10] : [42, 160, 42], kb = esMelena ? .02 : .0035, ff = (a, b, c) => M.n3(a * fr[0], b * fr[1], c * fr[2]), e = .003, f0 = ff(x, y, z);
      const gx = (ff(x + e, y, z) - f0) / e, gy = (ff(x, y + e, z) - f0) / e, gz = (ff(x, y, z + e) - f0) / e; nx -= kb * gx; ny -= kb * gy; nz -= kb * gz; const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl; }
    if (an) {
      const q = esMelena ? { m: 'melena' } : primCercana(an, x, y, z), S = an.S, c = an.cab, m = q.m, lx = (x - an.ox) / an.s, ly = (y - an.oy) / an.s, lz = (z - an.oz) / an.s;
      const contra = sstep(-S.bh, S.bh * .8, ly);
      const nbx = S.bl * .8, nby = S.bh * .35, garganta = m === 'cuello' && ((lx - nbx) * S.ny - (ly - nby) * S.nx) / Math.hypot(S.nx, S.ny) > S.nr * .45;
      const ojoD = Math.hypot(lx - c.ojx, ly - c.ojy), interior = nx * 1 > .15;
      matAn = m;
      const pata = m === 'pata' || m === 'patab', gy = y / an.s;
      if (an.nombre === 'cebra') {
        const warp = 1.6 * n3(lx * 1.3, ly * 1.3, lz * 1.3);
        let u;
        if (pata) u = gy * 15 + warp * .6;
        else if (m === 'crin') u = lx * 18;
        else if (m === 'cuello' || m === 'cabeza' || m === 'hocico') u = (ly * 7 - lx * 2.5) + warp;
        else u = lx * 7.5 + Math.abs(lz) * 2 + (ly + .3) * (lx < -.3 ? 4 : -1.5) + warp;
        const st = sstep(-.18, .18, Math.sin(u * Math.PI));
        alb = [mix(.04, .93, st), mix(.04, .91, st), mix(.05, .87, st)];
        if (m === 'hocico') { const dt = c.tipx - lx; if (dt < .17) alb = dt < .07 ? [.05, .045, .045] : [.32, .26, .22]; }
        if (m === 'cuerpo' && ly < -S.bh * .75 && lx > -.25 && lx < .35) alb = [.92, .9, .86];
        if (m === 'oreja') alb = interior ? [.92, .9, .87] : ly > c.hy + S.hh * .6 + S.el * .7 ? [.05, .05, .05] : alb;
        if (m === 'borla') alb = [.05, .045, .045];
      } else if (an.nombre === 'jirafa') {
        const sz = m === 'cabeza' || m === 'hocico' ? 7.5 : pata ? 6.5 : m === 'cuello' ? 4 : 3.4;
        const [f1, f2, id] = M.voro3(lx * sz, ly * sz, lz * sz), b = sstep(.07, .13, f2 - f1);
        const patch = [mix(.48, .66, id), mix(.22, .36, id), mix(.07, .14, id)], crema = [.94, .86, .66];
        alb = [mix(crema[0], patch[0], b), mix(crema[1], patch[1], b), mix(crema[2], patch[2], b)];
        if (pata && gy < .9) alb = crema;
        if (m === 'cuerpo' && ly < -S.bh * .8) alb = crema;
        if (m === 'hocico') alb = [.78, .64, .48];
        if (m === 'crin') alb = [.36, .2, .1];
        if (m === 'osicon') alb = [.86, .76, .58];
        if (m === 'borla') alb = [.1, .07, .05];
        if (m === 'cola') alb = [.5, .34, .2];
        if (m === 'oreja') alb = interior ? [.95, .9, .8] : [.8, .66, .45];
      } else if (an.nombre === 'leon') {
        const fino = n3(lx * 26, ly * 7, lz * 26), contra2 = pata || m === 'cola' ? 1 : sstep(-S.bh * 1.1, -S.bh * .2, ly);
        alb = [mix(.84, .64, contra2), mix(.66, .4, contra2), mix(.44, .16, contra2)];
        if (m === 'melena') { const mech = n3(x * 12, y * 40, z * 12), cap = sstep(c.hy - .45, c.hy + .25, ly), k = .5 + .45 * mech + .25 * cap; alb = [.4 * k, .2 * k, .07 * k]; if (lx > c.hx - .12) alb = alb.map((v, i) => mix(v, [.6, .38, .16][i], .35)); }
        if (m === 'mejilla') alb = ly < c.hy - .06 ? [.93, .88, .78] : [.78, .58, .32];
        if (m === 'barbilla') alb = [.95, .92, .86];
        if (m === 'frente') alb = [.66, .42, .18];
        if (m === 'bigotera') { const [f1] = voro3(x * 55, y * 55, z * 55); alb = f1 < .17 && ly > c.tipy - .045 ? [.2, .13, .09] : [.95, .92, .85]; }
        if (m === 'hocico') alb = ly < c.tipy ? [.95, .9, .8] : [.88, .74, .52];
        if (m === 'cabeza' && ojoD < S.hh * .34 && ojoD > S.hh * .25) alb = [.88, .78, .6];
        if (m === 'oreja') alb = interior ? [.9, .78, .6] : [.2, .12, .07];
        if (m === 'borla') alb = [.14, .08, .05];
        if (m === 'zarpa') alb = [.86, .72, .5];
      } else {
        const blanco = (!pata && m !== 'cola' && ly < -S.bh * .4) || garganta;
        const base = blanco ? [.95, .9, .8] : [.86, .56, .22];
        const sz = m === 'cabeza' || m === 'hocico' ? 22 : pata || m === 'zarpa' ? 16 : 11;
        const [f1, , id] = M.voro3(lx * sz, ly * sz, lz * sz);
        const spot = sstep(.24, .17, f1 * (.85 + .3 * id));
        alb = base.map(v => mix(v, .05, spot));
        if (m === 'hocico') alb = ly < c.tipy ? [.95, .92, .86] : [.9, .7, .4];
        if ((m === 'cabeza' || m === 'hocico') && Math.abs(lz) > S.hw * .3 && M.lagrima(an, lx, ly, lz) < .013) alb = [.03, .03, .03];
        if (m === 'cabeza' && ojoD < S.hh * .4 && ojoD > S.hh * .27) alb = [.95, .9, .82];
        if (m === 'cola' && lx < -.95) alb = sstep(-.3, .3, Math.sin(lx * 45)) > .5 ? [.05, .05, .05] : [.95, .9, .8];
        if (m === 'cola' && lx < -1.1) alb = [.95, .92, .86];
        if (m === 'oreja') alb = interior ? [.95, .9, .8] : [.1, .08, .06];
      }
      if (m === 'ojo') alb = an.nombre === 'guepardo' || an.nombre === 'leon' ? [.45, .3, .07] : [.02, .015, .015];
      if (m === 'nariz' || m === 'pezuna') alb = an.nombre === 'leon' && m === 'nariz' ? [.35, .18, .14] : [.035, .03, .03];
      if (!['ojo', 'nariz', 'pezuna', 'asta', 'osicon'].includes(m)) alb = alb.map(v => v * M.pelo(x - an.ox, y, z - an.oz));
    } else if (drc < ds && drc < dacc) {
      const v = .75 + .4 * nfbm(x * 3, y * 3, z * 3), liq = M.n3(x * 9, y * 9, z * 9) > .7 ? .8 : 1; alb = [.36 * v * liq, .31 * v * liq, .25 * v * liq];
    } else if (dacc < ds) {
      alb = y > 2.6 ? [.12, .22, .07].map(v => v * (.7 + .6 * n3(x * 6, y * 6, z * 6))) : [.25, .18, .12];
    } else {
      const f = fbm2(x * .35, z * .35, 4), g = n2(x * 14, z * 3), tuft = n2(x * 2.2, z * 2.2), brizna = n2(x * 95 + z * 20, z * 9) * .6 + n2(x * 40, z * 160) * .4;
      alb = [mix(.6, .84, f) * (.7 + .5 * brizna) * (.9 + .2 * g), mix(.44, .64, f) * (.7 + .5 * brizna) * (.9 + .2 * g), mix(.2, .3, f) * (.8 + .3 * brizna)];
      if (tuft > .72) alb = alb.map(v => v * .62);
      if (n2(x * 3.1 + 7, z * 3.1) > .78) alb = [alb[0] * .9, alb[1] * .95, alb[2] * .8];
    }
    const ndl = Math.max(0, nx * SUN[0] + ny * SUN[1] + nz * SUN[2]);
    const sh = ndl > 0 ? sombra((a, b, c) => E.map(sc, a, b, c, true), x + nx * .02, y + ny * .02, z + nz * .02, SUN[0], SUN[1], SUN[2], 12, 20) : 0;
    const sky = .5 + .5 * ny, bounce = .5 - .5 * ny;
    const sunC = [2.5, 1.85, 1.1], skyC = [.26, .32, .45], bC = [.22, .16, .08];
    const ao = M.oclusion(map, x, y, z, nx, ny, nz) * (an ? .85 + .15 * M.n3(x * 30, y * 30, z * 30) : 1);
    const cl = [-dx * .4, .8, -dz * .4], cn = Math.hypot(...cl), CL = cl.map(v => v / cn);
    const esp = matAn ? M.brillo(matAn, nx, ny, nz, dx, dy, dz, SUN) * sh : 0, cat = matAn ? M.brillo(matAn, nx, ny, nz, dx, dy, dz, CL) * .5 : 0;
    const c = [0, 1, 2].map(k => alb[k] * (sunC[k] * ndl * sh + (skyC[k] * sky + bC[k] * bounce) * ao) + esp * sunC[k] + cat * .7);
    const fog = 1 - Math.exp(-T * .012), fc = E.cielo(sc, dx, Math.max(dy, .0), dz).map(v => v * .85);
    return c.map((v, k) => mix(v, fc[k], fog));
  },
};
E.info = { titulo: 'León en la sabana (SDF, máximo detalle)', seg: 8 };
module.exports = E;
