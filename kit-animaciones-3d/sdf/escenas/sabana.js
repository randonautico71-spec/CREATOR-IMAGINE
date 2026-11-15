'use strict';
// ESCENA 'sabana' · Texturas procedurales: jirafa, cebras y guepardo caminando por la sabana
const M = require('../motor');
const { clamp, mix, sstep, fract, h2, n2, n3, fbm2, voro3, cuadrupedo, sdAnimal, primCercana, sombra, sdEll, sdCap } = M;
const SUN = (() => { const v = [0.55, 0.42, 0.72], l = Math.hypot(...v); return v.map(a => a / l); })();
const sueloH = (x, z) => .12 * Math.sin(x * .3 + 1) * Math.cos(z * .25) + .06 * Math.sin(x * .9 + z * .7);
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
    const cx = .95 * t;
    const o = v => ({ v, suelo: sueloH });
    const an = [
      cuadrupedo('jirafa', 1.25 * t - 1.6, -3.0, t, 0, 1, o(1.25)),
      cuadrupedo('cebra', 1.1 * t + .9, -.7, t, 1.3, 1, o(1.1)),
      cuadrupedo('cebra', 1.1 * t - 1.5, .35, t, 2.6, .92, o(1.1)),
      cuadrupedo('guepardo', 1.05 * t + .4, 1.9, t, .4, 1, o(1.05)),
    ];
    return { t, an, eye: [cx + 4.2, 1.55, 8.2], target: [cx - .2, 2.0, -.6], fov: 54, far: 90 };
  },
  map(sc, x, y, z, sinSuelo) {
    let d = sinSuelo ? 1e9 : (y - sueloH(x, z)) * .9;
    const a = acacia(x, y, z); if (a < d) d = a;
    for (const an of sc.an) { const da = sdAnimal(an, x, y, z); if (da < d) d = da; }
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
    const ds = (y - sueloH(x, z)) * .9, dacc = acacia(x, y, z);
    let best = Math.min(ds, dacc), an = null;
    for (const a of sc.an) { const d = sdAnimal(a, x, y, z); if (d < best) { best = d; an = a; } }
    if (an) {
      const q = primCercana(an, x, y, z), S = an.S, c = an.cab, m = q.m, lx = (x - an.ox) / an.s, ly = (y - an.oy) / an.s, lz = (z - an.oz) / an.s;
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
      if (m === 'ojo') alb = an.nombre === 'guepardo' ? [.45, .3, .07] : [.02, .015, .015];
      if (m === 'nariz' || m === 'pezuna') alb = [.035, .03, .03];
      if (!['ojo', 'nariz', 'pezuna', 'asta', 'osicon'].includes(m)) alb = alb.map(v => v * M.pelo(x - an.ox, y, z - an.oz));
    } else if (dacc < ds) {
      alb = y > 2.6 ? [.12, .22, .07].map(v => v * (.7 + .6 * n3(x * 6, y * 6, z * 6))) : [.25, .18, .12];
    } else {
      const f = fbm2(x * .35, z * .35, 4), g = n2(x * 14, z * 3), tuft = n2(x * 2.2, z * 2.2);
      alb = [mix(.62, .82, f) * (.85 + .3 * g), mix(.46, .62, f) * (.85 + .3 * g), mix(.22, .3, f)];
      if (tuft > .75) alb = alb.map(v => v * .65);
    }
    const ndl = Math.max(0, nx * SUN[0] + ny * SUN[1] + nz * SUN[2]);
    const sh = ndl > 0 ? sombra((a, b, c) => E.map(sc, a, b, c, true), x + nx * .02, y + ny * .02, z + nz * .02, SUN[0], SUN[1], SUN[2], 12, 20) : 0;
    const sky = .5 + .5 * ny, bounce = .5 - .5 * ny;
    const sunC = [2.5, 1.85, 1.1], skyC = [.26, .32, .45], bC = [.22, .16, .08];
    const ao = M.oclusion(map, x, y, z, nx, ny, nz);
    const cl = [-dx * .4, .8, -dz * .4], cn = Math.hypot(...cl), CL = cl.map(v => v / cn);
    const esp = matAn ? M.brillo(matAn, nx, ny, nz, dx, dy, dz, SUN) * sh : 0, cat = matAn ? M.brillo(matAn, nx, ny, nz, dx, dy, dz, CL) * .5 : 0;
    const c = [0, 1, 2].map(k => alb[k] * (sunC[k] * ndl * sh + (skyC[k] * sky + bC[k] * bounce) * ao) + esp * sunC[k] + cat * .7);
    const fog = 1 - Math.exp(-T * .02), fc = E.cielo(sc, dx, Math.max(dy, .0), dz).map(v => v * .85);
    return c.map((v, k) => mix(v, fc[k], fog));
  },
};
E.info = { titulo: 'Texturas procedurales: jirafa, cebras y guepardo en la sabana', seg: 10, letrero_s: 7 };
module.exports = E;
