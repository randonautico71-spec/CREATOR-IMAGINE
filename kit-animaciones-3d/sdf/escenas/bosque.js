'use strict';
// ESCENA 'bosque' · SDF ray marching: ciervos y un zorro corriendo por un bosque de pinos al atardecer
const M = require('../motor');
const { clamp, mix, sstep, fract, h2, n2, n3, fbm2, cuadrupedo, sdAnimal, primCercana, sombra } = M;
const V = 5.2; // velocidad de carrera (m/s)
const SUN = (() => { const v = [-0.55, 0.32, -0.77], l = Math.hypot(...v); return v.map(a => a / l); })();
const CELDA = 3.4;
const sueloH = (x, z) => .09 * Math.sin(x * .7) * Math.cos(z * .9) + .05 * Math.sin(x * 1.9 + z * 1.3);

function arbol(x, y, z, sinLimite) {
  if (y > 15.6) return [y - 15.5, 2];                          // por encima de todas las copas: el rayo sale de golpe
  const ix = Math.floor(x / CELDA), iz = Math.floor(z / CELDA), czc = (iz + .5) * CELDA;
  const bnd = sinLimite ? 1e9 : Math.min(x - ix * CELDA, (ix + 1) * CELDA - x, z - iz * CELDA, (iz + 1) * CELDA - z) + .04;
  if (czc > -2.4 && czc < 9) return [bnd, 0];
  const hh = h2(ix, iz), jx = (h2(ix + 7, iz) - .5) * 1.2, jz = (h2(ix, iz + 3) - .5) * 1.2;
  const lx = x - (ix + .5) * CELDA - jx, lz = z - czc - jz, rr = Math.hypot(lx, lz);
  const top = 11 + hh * 4, base = 2.0 + hh * 1.5;
  const dt = Math.max(rr - (.2 + .08 * hh) + y * .006, y - top);
  const capas = .8 + .2 * (.5 + .5 * Math.sin((top - y) * 4.7));
  const dc = Math.max((rr - Math.max(0, top - y) * .19 * capas) * .62, base - y, y - top - .3);
  return dt < dc ? [Math.min(dt, bnd), 1] : [Math.min(dc, bnd), 2];
}
const E = {
  prepara(t) {
    const o = { v: V, suelo: sueloH };
    const an = [
      cuadrupedo('ciervo', V * t, .15, t, 0, 1, o),
      cuadrupedo('ciervo', V * t - 1.9, -1.0, t, 1.7, .95, o),
      cuadrupedo('ciervo', V * t - 3.2, .9, t, 3.1, .72, o),
      cuadrupedo('zorro', V * t + 1.4, .75, t, .8, 1, o),
    ];
    const cx = V * t;
    return { t, an, eye: [cx + 6.2, 1.35, 4.4], target: [cx - .8, 1.15, -.2], fov: 52, far: 110 };
  },
  map(sc, x, y, z, sl, sinSuelo) {
    let d = sinSuelo ? 1e9 : (y - sueloH(x, z)) * .85;
    const a = arbol(x, y, z, sl)[0]; if (a < d) d = a;
    for (const an of sc.an) { const da = sdAnimal(an, x, y, z); if (da < d) d = da; }
    return d;
  },
  cielo(sc, dx, dy, dz) {
    const s = Math.max(0, dx * SUN[0] + dy * SUN[1] + dz * SUN[2]), sg = Math.pow(s, 8), up = clamp(dy * 1.5, 0, 1);
    return [.16 + .6 * sg - .06 * up + Math.pow(s, 300) * 3, .2 + .42 * sg - .04 * up + Math.pow(s, 300) * 2.4, .16 + .18 * sg + Math.pow(s, 300) * 1.5];
  },
  shade(sc, x, y, z, nx, ny, nz, dx, dy, dz, T, map) {
    const mapS = (a, b, c) => E.map(sc, a, b, c, true, true), mapA = (a, b, c) => E.map(sc, a, b, c, true);
    let matAn = null, alb, rough = 1, mat = 'suelo';
    const ds = (y - sueloH(x, z)) * .85, [da, tipo] = arbol(x, y, z);
    let best = ds; if (da < best) { best = da; mat = tipo === 1 ? 'tronco' : 'pino'; }
    let an = null; for (const a of sc.an) { const d = sdAnimal(a, x, y, z); if (d < best) { best = d; an = a; } }
    if (an) {
      const q = primCercana(an, x, y, z), S = an.S, c = an.cab, m = q.m, lx = (x - an.ox) / an.s, ly = (y - an.oy) / an.s, lz = (z - an.oz) / an.s;
      const contra = sstep(-S.bh, S.bh * .8, ly);
      const nbx = S.bl * .8, nby = S.bh * .35, garganta = m === 'cuello' && ((lx - nbx) * S.ny - (ly - nby) * S.nx) / Math.hypot(S.nx, S.ny) > S.nr * .45;
      const ojoD = Math.hypot(lx - c.ojx, ly - c.ojy), interior = nx * 1 > .15;
      matAn = m;
      if (an.nombre === 'ciervo') {
        alb = [mix(.6, .4, contra), mix(.42, .24, contra), mix(.28, .13, contra)];
        if (m === 'cuerpo' && ly < -S.bh * .75) alb = [.74, .66, .56];
        if (m === 'cuerpo' && lx < -S.bl * 1.0 && ly > -S.bh * .5) alb = [.9, .86, .8];
        if (m === 'cola') alb = ly > S.bh * .38 ? [.16, .1, .07] : [.92, .9, .85];
        if (garganta && ly > nby + S.ny * .65) alb = [.9, .87, .82];
        if (m === 'cabeza' && ly < c.hy - S.hh * .5 && lx > c.hx - S.hl * .2) alb = [.88, .84, .78];
        if (m === 'hocico') { const dt = c.tipx - lx; alb = dt < .055 ? [.08, .06, .06] : dt < .075 ? [.85, .82, .77] : [.5, .36, .24]; }
        if (m === 'cabeza' && ojoD < S.hh * .42 && ojoD > S.hh * .2) alb = [.82, .76, .68];
        if (m === 'oreja') alb = interior ? [.72, .6, .55] : [.4, .27, .17];
        if (m === 'patab') alb = [.42, .29, .18];
        if (m === 'asta') { const k = sstep(.2, .7, ly - c.hy); alb = [mix(.38, .85, k), mix(.3, .8, k), mix(.22, .7, k)]; }
        if (m === 'cuerpo' && an.s < .8 && ly > -S.bh * .2) { const [f1] = M.voro3(lx * 9, ly * 9, lz * 9); if (f1 < .17) alb = [.9, .86, .8]; }
      } else {
        alb = [mix(.88, .74, contra), mix(.44, .3, contra), mix(.16, .07, contra)];
        if (m === 'cuerpo' && ly < -S.bh * .3 && lx > 0) alb = [.93, .9, .85];
        if (garganta) alb = [.94, .92, .88];
        if (m === 'cabeza' && ly < c.hy - S.hh * .12 && lx > c.hx - S.hl * .4) alb = [.94, .92, .88];
        if (m === 'hocico') alb = ly < c.tipy - S.sr * .2 ? [.94, .92, .88] : [.82, .42, .15];
        if (m === 'cabeza' && Math.abs(ly - c.ojy + .01) < .012 && lx > c.ojx && lx < c.ojx + .07) alb = [.12, .07, .04];
        if (m === 'oreja') alb = interior ? [.86, .76, .66] : [.08, .05, .04];
        if (m === 'patab' || m === 'zarpa') alb = [.07, .05, .04];
        if (m === 'pata') alb = alb.map((v, k) => mix(v, [.2, .1, .05][k], sstep(-S.bh * 1.2, -S.bh * 2.2, ly)));
        if (m === 'cola') alb = lx < -.78 ? [.95, .93, .9] : [mix(.8, .6, contra), mix(.4, .28, contra), mix(.15, .08, contra)];
      }
      if (m === 'ojo') alb = an.nombre === 'zorro' ? [.3, .17, .04] : [.02, .015, .015];
      if (m === 'nariz' || m === 'pezuna') alb = [.035, .03, .03];
      if (!['ojo', 'nariz', 'pezuna', 'asta', 'osicon'].includes(m)) alb = alb.map(v => v * M.pelo(x - an.ox, y, z - an.oz));
    } else if (mat === 'tronco') {
      const b = .7 + .3 * n2(Math.atan2(z, x) * 3 + x * 4, y * 1.5) + .15 * Math.sin(y * 9 + n2(x * 5, z * 5) * 4);
      alb = [.2 * b, .14 * b, .1 * b];
    } else if (mat === 'pino') {
      const v = .7 + .5 * n3(x * 5, y * 5, z * 5); alb = [.05 * v, .14 * v, .08 * v];
    } else {
      const camino = sstep(1.9, 1.2, Math.abs(z - .1 + .4 * Math.sin(x * .25))), f = fbm2(x * 1.3, z * 1.3, 4), hoja = n2(x * 16, z * 16);
      const musgo = [mix(.1, .2, f), mix(.18, .3, f), mix(.06, .1, f)], tierra = [.36 + hoja * .12, .25 + hoja * .07, .15];
      alb = [mix(musgo[0], tierra[0], camino), mix(musgo[1], tierra[1], camino), mix(musgo[2], tierra[2], camino)];
      if (hoja > .84 && camino < .5) alb = [.5, .26, .08];
    }
    const ndl = Math.max(0, nx * SUN[0] + ny * SUN[1] + nz * SUN[2]);
    const sh = ndl > 0 ? sombra(mapS, x + nx * .02, y + ny * .02, z + nz * .02, SUN[0], SUN[1], SUN[2], 10, 18) : 0;
    const sky = .5 + .5 * ny, ndv = Math.max(0, -(nx * dx + ny * dy + nz * dz)), rim = Math.pow(1 - ndv, 3) * Math.max(0, -(dx * SUN[0] + dz * SUN[2])) * (an ? 2.2 : 0);
    const sunC = [3.0, 2.15, 1.15], skyC = [.16, .22, .2];
    const ao = M.oclusion(mapA, x, y, z, nx, ny, nz);
    const cl = [-dx * .4, .8, -dz * .4], cn = Math.hypot(...cl), CL = cl.map(v => v / cn);
    const esp = matAn ? M.brillo(matAn, nx, ny, nz, dx, dy, dz, SUN) * sh : 0, cat = matAn ? M.brillo(matAn, nx, ny, nz, dx, dy, dz, CL) * .5 : 0;
    let c = [0, 1, 2].map(k => alb[k] * (sunC[k] * ndl * sh + (skyC[k] * sky + .03) * ao) + rim * sunC[k] * .35 * sh + rim * .04 + esp * sunC[k] + cat * .6);
    const fog = 1 - Math.exp(-T * .024), fc = E.cielo(sc, dx, Math.min(dy, .1), dz);
    return c.map((v, k) => mix(v, fc[k], fog));
  },
};
E.info = { titulo: 'SDF ray marching: ciervos y zorro corriendo por el bosque', seg: 10, letrero_s: 7 };
module.exports = E;
