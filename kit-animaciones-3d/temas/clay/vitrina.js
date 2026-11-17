'use strict';
// MATERIALES DE ESTUDIO (pruebas): el león y la ballena de las figuras como piezas sobre peanas en un fondo infinito de estudio.
// MATERIAL=marmol (león de mármol, ballena de bronce) · cristal (león cromado, ballena de vidrio) · fieltro · plastico (juguete de vinilo)
const C = require('./arcilla'), Fg = require('./figuras'), M = C.M;
const { n3, sdEll, smin, cl, len, mix, cap, figura, dirYaw } = C;
const MAT = process.env.MATERIAL || 'marmol';
const LEON = { pos: [-.42, .45, .05], yaw: dirYaw(1, .55), esc: .68 }, BALL = { pos: [.42, 1.2, -.55], yaw: dirYaw(-1, .7), esc: .34 };
const Lk = (() => { const v = [-.5, .85, .65], l = len(...v); return v.map(q => q / l); })();
const fbm = (x, y, z, o = 4) => { let s = 0, a = .5, f = 1, nn = 0; for (let i = 0; i < o; i++) { s += a * n3(x * f, y * f, z * f); nn += a; a *= .5; f *= 2.03; } return s / nn; };
function ciclo(x, y, z) { return smin(y, z + 3, 1.2); }
const peana = (x, y, z, cx, cz, r, h) => { const dr = len(x - cx, z - cz) - r, dy = Math.abs(y - h / 2) - h / 2; return Math.min(Math.max(dr, dy), 0) + len(Math.max(dr, 0), Math.max(dy, 0)) - .02; };
function escena(x, y, z) {
  let d = ciclo(x, y, z), m = 'estudio'; const c = (dd, mm) => { if (dd < d) { d = dd; m = mm; } };
  c(peana(x, y, z, -.42, .05, .5, .45), 'peana'); c(peana(x, y, z, .42, -.55, .32, .35), 'peana'); c(cap(x, y, z, .42, .35, -.55, .42, 1.08, -.55, .022), 'varilla');
  c(figura(LEON, (a, b, e) => Fg.leon(a, b, e), x, y, z, [.1, .6, 0], 1.05)[0], 'leon');
  c(figura(BALL, (a, b, e) => Fg.ballena(a, b, e), x, y, z, [-.4, 0, 0], 2.7)[0], 'ballena');
  return [d, m]; }
const mapa = (x, y, z) => escena(x, y, z)[0];
const parte = (m, x, y, z) => m === 'leon' ? figura(LEON, (a, b, e) => Fg.leon(a, b, e), x, y, z, [.1, .6, 0], 1.05)[1] : m === 'ballena' ? figura(BALL, (a, b, e) => Fg.ballena(a, b, e), x, y, z, [-.4, 0, 0], 2.7)[1] : m;
function entorno(dx, dy, dz) {   // estudio: degradado y dos ventanas de luz (para los reflejos)
  let c = [mix(.32, .55, cl(dy * .5 + .5)), mix(.34, .58, cl(dy * .5 + .5)), mix(.38, .62, cl(dy * .5 + .5))];
  if (dy > .55 && Math.abs(dx) < .45 && dz > -.6) c = c.map(v => v + 2.2); if (dx < -.75 && Math.abs(dy - .2) < .25) c = c.map(v => v + 1.2); return c; }
function normal(x, y, z) { const e = .0008, a = mapa(x + e, y, z) - mapa(x - e, y, z), b = mapa(x, y + e, z) - mapa(x, y - e, z), c = mapa(x, y, z + e) - mapa(x, y, z - e), l = len(a, b, c) || 1; return [a / l, b / l, c / l]; }
function marcha(ox, oy, oz, dx, dy, dz, signo = 1, max = 12) { let t = .02; for (let i = 0; i < 160; i++) { const d = signo * mapa(ox + dx * t, oy + dy * t, oz + dz * t); if (d < .0008) return t; t += Math.max(d * .9, .002); if (t > max) break; } return -1; }
function sencillo(x, y, z, dx, dy, dz) { const [, m] = escena(x, y, z), n = normal(x, y, z), p = parte(m, x, y, z), alb = albedo(m, p, x, y, z), dif = Math.max(0, n[0] * Lk[0] + n[1] * Lk[1] + n[2] * Lk[2]); return alb.map(v => v * (.25 + .9 * dif)); }
function albedo(m, p, x, y, z) {
  if (m === 'estudio') return [.62, .64, .68]; if (m === 'peana') return MAT === 'marmol' ? [.12, .12, .13] : MAT === 'fieltro' ? [.5, .32, .2] : [.92, .92, .9]; if (m === 'varilla') return [.75, .75, .78];
  if (MAT === 'marmol') { if (m === 'leon') { const v = Math.abs(Math.sin(x * 5 + y * 3 + 7 * fbm(x * 1.6, y * 1.6, z * 1.6))); return v < .06 ? [.55, .55, .58] : [.93, .91, .87].map(q => q * (.95 + .05 * n3(x * 9, y * 9, z * 9))); } return [.72, .48, .24]; }
  const col = (Fg.COLORES[p] || [.8, .8, .8]).slice(); if (MAT === 'plastico') { const L = col[0] * .3 + col[1] * .59 + col[2] * .11; return col.map(v => cl(L + (v - L) * 1.35)); } return col;
}
const E = {
  info: { seg: 4 },
  prepara(t) { return { t, eye: [0, 1.2, 4.2], target: [0, .85, -.25], fov: 42, far: 20, pasos: 260 }; },
  map: (sc, x, y, z) => mapa(x, y, z),
  cielo: (sc, dx, dy, dz) => entorno(dx, dy, dz),
  shade(sc, x, y, z, nx, ny, nz, dx, dy, dz) {
    const [, m] = escena(x, y, z), p = parte(m, x, y, z); let n = [nx, ny, nz], alb = albedo(m, p, x, y, z);
    const figuraM = m === 'leon' || m === 'ballena', ndv = -(n[0] * dx + n[1] * dy + n[2] * dz), fres = Math.pow(1 - Math.max(0, ndv), 5);
    if (MAT === 'fieltro' && (figuraM || m === 'peana')) { const e = .002, f = (a, b, c) => n3(a * 160, b * 160, c * 160) * .6 + n3(a * 45, b * 45, c * 45) * .4, f0 = f(x, y, z), g = [(f(x + e, y, z) - f0) / e, (f(x, y + e, z) - f0) / e, (f(x, y, z + e) - f0) / e]; n = n.map((v, k) => v - .0035 * g[k]); const l = len(...n); n = n.map(v => v / l); alb = alb.map(v => v * (.88 + .2 * n3(x * 60, y * 60, z * 60))); }
    const ndl = n[0] * Lk[0] + n[1] * Lk[1] + n[2] * Lk[2], sh = ndl > -.1 ? M.sombra(mapa, x + n[0] * .02, y + n[1] * .02, z + n[2] * .02, Lk[0], Lk[1], Lk[2], 7, 6, 40) : 0, ao = M.oclusion(mapa, x, y, z, n[0], n[1], n[2]);
    const hv = (() => { const v = [Lk[0] - dx, Lk[1] - dy, Lk[2] - dz], l = len(...v); return v.map(q => q / l); })(), nh = Math.max(0, n[0] * hv[0] + n[1] * hv[1] + n[2] * hv[2]);
    const dif = Math.max(0, ndl), amb = .3 + .2 * n[1], difuso = alb.map(v => v * (1.15 * dif * sh + amb * ao));
    const rd = dx - 2 * (dx * n[0] + dy * n[1] + dz * n[2]) * n[0], rdy = dy - 2 * (dx * n[0] + dy * n[1] + dz * n[2]) * n[1], rdz = dz - 2 * (dx * n[0] + dy * n[1] + dz * n[2]) * n[2];
    const reflejo = () => { const t = marcha(x + n[0] * .004, y + n[1] * .004, z + n[2] * .004, rd, rdy, rdz); return t > 0 ? sencillo(x + rd * t, y + rdy * t, z + rdz * t, rd, rdy, rdz) : entorno(rd, rdy, rdz); };
    if (!figuraM) { const r = m === 'peana' && MAT !== 'fieltro' ? reflejo().map(v => v * (.04 + .3 * fres)) : [0, 0, 0]; return difuso.map((v, k) => v + r[k] + Math.pow(nh, 40) * .2 * sh); }
    if (MAT === 'marmol') { if (m === 'leon') { const r = reflejo(); return difuso.map((v, k) => v * 1.05 + [.05, .03, .02][k] * Math.max(0, ndl + .3) + r[k] * (.05 + .25 * fres) + Math.pow(nh, 70) * .5 * sh); }
      const patina = cl((n3(x * 7, y * 7, z * 7) - .7) * 5 + (1 - ao) * 1.2), r = reflejo(), metal = r.map((v, k) => v * alb[k] * 1.1 + alb[k] * dif * sh * .35);
      return metal.map((v, k) => mix(v + Math.pow(nh, 30) * alb[k] * sh, [.28, .52, .44][k] * (dif * sh * .9 + amb * ao), patina)); }
    if (MAT === 'cristal') { if (m === 'leon') { const r = reflejo(); return r.map(v => v * .92 + Math.pow(nh, 120) * 2 * sh); }
      const ior = 1 / 1.5, cosi = Math.max(0, ndv), k0 = 1 - ior * ior * (1 - cosi * cosi), refl = reflejo(); if (k0 < 0) return refl;
      const tr = [ior * dx + (ior * cosi - Math.sqrt(k0)) * n[0], ior * dy + (ior * cosi - Math.sqrt(k0)) * n[1], ior * dz + (ior * cosi - Math.sqrt(k0)) * n[2]], ox = x - n[0] * .004, oy = y - n[1] * .004, oz = z - n[2] * .004;
      const ti = marcha(ox, oy, oz, ...tr, -1, 6); let col = [.5, .6, .7];
      if (ti > 0) { const ex = ox + tr[0] * ti, ey = oy + tr[1] * ti, ez = oz + tr[2] * ti, nn = normal(ex, ey, ez).map(v => -v), c2 = Math.max(0, -(tr[0] * nn[0] + tr[1] * nn[1] + tr[2] * nn[2])), io2 = 1.5, k2 = 1 - io2 * io2 * (1 - c2 * c2);
        const to = k2 < 0 ? tr : [io2 * tr[0] + (io2 * c2 - Math.sqrt(k2)) * nn[0], io2 * tr[1] + (io2 * c2 - Math.sqrt(k2)) * nn[1], io2 * tr[2] + (io2 * c2 - Math.sqrt(k2)) * nn[2]], lo = len(...to), td = to.map(v => v / lo);
        const t2 = marcha(ex - nn[0] * .006, ey - nn[1] * .006, ez - nn[2] * .006, ...td); col = t2 > 0 ? sencillo(ex + td[0] * t2, ey + td[1] * t2, ez + td[2] * t2, ...td) : entorno(...td); col = col.map((v, k) => v * [.82, .95, 1][k] * Math.exp(-ti * .25)); }
      const F = .04 + .96 * fres; return col.map((v, k) => v * (1 - F) + refl[k] * F + Math.pow(nh, 160) * 2.5 * sh); }
    if (MAT === 'fieltro') { const pelusa = Math.pow(1 - Math.max(0, ndv), 2.2) * .45; return difuso.map((v, k) => v * .95 + alb[k] * pelusa * (.6 + .4 * sh) + .02); }
    // plástico de juguete: difuso saturado, brillo duro y reflejo de barniz
    const r = reflejo(), F = .05 + .6 * fres; return difuso.map((v, k) => v * (1 - F * .5) + r[k] * F * .5 + Math.pow(nh, 140) * 1.4 * sh + Math.pow(nh, 20) * .12 * sh);
  },
};
module.exports = E;
