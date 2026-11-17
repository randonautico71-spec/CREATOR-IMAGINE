'use strict';
// CLAYMOTION · león de plastilina caminando por la sabana: acacias, termitero, matas de hierba, rocas y fondo de cartón al atardecer.
const C = require('../clay/arcilla'), Fg = require('../clay/figuras');
const { sdEll, smin, len, cap, sph, bulto, hfijo, figura, crearEscena, dirYaw, n3, cl, mix } = C;
let LEON = { pos: [-.35, 0, .55], yaw: dirYaw(1, .45), esc: 1 }, T = 0;
const suelo = (x, z) => .03 * (n3(x * 1.2, 0, z * 1.2) - .5) + .01 * Math.sin(x * 7 + z * 2);
const ACACIAS = [{ pos: [-1.5, 0, -2.4], yaw: .4, esc: 1.5 }, { pos: [2.4, 0, -4.2], yaw: 1.2, esc: 1.15 }];
const MATAS = (() => { const r = []; for (let k = 0; k < 14; k++) { const a = hfijo(k, 3, 1), b = hfijo(k, 5, 2); r.push([-2.2 + a * 4.6, 1.8 - b * 5.5, .18 + .12 * hfijo(k, 9, 9)]); } return r; })();
function mata(x, y, z, cx, cz, h) { let d = 1e9; for (let k = 0; k < 7; k++) { const a = k / 7 * 6.283, tip = [cx + Math.cos(a) * h * .45, h * (.8 + .4 * hfijo(k, cx * 10, 1)), cz + Math.sin(a) * h * .45]; d = smin(d, cap(x, y, z, cx, 0, cz, tip[0], tip[1], tip[2], .018), .02); } return d; }
function escena(x, y, z) {
  let d = y - suelo(x, z), m = 'tierra'; const c = (dd, mm) => { if (dd < d) { d = dd; m = mm; } };
  c(figura(LEON, (a, b, e) => Fg.leon(a, b, e, T, true), x, y, z, [.1, .6, 0], 1.05)[0], 'leon');
  for (const A of ACACIAS) c(figura(A, Fg.acacia, x, y, z, [0, 1, 0], 1.3)[0], 'acacia_f');
  c(sdEll(x - 1.35, y - .35, z + 1.4, .3, .55, .3) + .08 * Math.max(0, y - .3) + bulto(x * 3, y * 3, z * 3, .06), 'termitero');
  c(smin(sdEll(x - 1.55, y - .2, z + 1.25, .14, .3, .14), sdEll(x - 1.18, y - .15, z + 1.5, .1, .22, .1), .1) + bulto(x * 3, y * 3, z * 3, .05), 'termitero');
  c(Fg.roca(x + 1.15, y - .05, z - 1.3, .32, .2, .26), 'roca'); c(Fg.roca(x - 1.55, y - .02, z - .9, .2, .12, .16), 'roca');
  for (const [mx, mz, h] of MATAS) { if (len(x - mx, z - mz) < h * .7 + .1 && y < h * 1.3) c(mata(x, y, z, mx, mz, h), 'hierba'); }
  // fondo de cartón: cielo de atardecer, sol, colinas y nubes en relieve
  c(z + 7, 'carton'); c(sdEll(x - .9, y - 1.6, z + 7, .75, .75, .1), 'sol');
  for (const [hx, hr, hh] of [[-3, 2.4, .9], [1.2, 2.8, .6], [4.2, 2.2, 1.0]]) c(sdEll(x - hx, y + .2, z + 6.8, hr, hh + .2, .3) + bulto(x, y, z, .04), 'colina');
  for (const [cx, cy, s] of [[-1.9, 3.0, 1], [2.3, 2.6, .8], [.2, 3.6, .7]]) { let dn = 1e9; for (let k = 0; k < 5; k++) dn = smin(dn, sdEll(x - cx - (k - 2) * .32 * s, y - cy - .12 * s * Math.sin(k * 1.9 + 1), z + 6.95, .3 * s, .18 * s, .1), .12); c(dn + bulto(x, y, z, .03), 'nube'); }
  return [d, m];
}
module.exports = crearEscena({
  escena, lejos: 25,
  prepara(t) { T = t; LEON = { ...LEON, pos: [-.35 + Math.cos(LEON.yaw) * .25 * t, 0, .55 - Math.sin(LEON.yaw) * .25 * t] }; },
  parte(m, x, y, z) { if (m === 'leon') return figura(LEON, (a, b, e) => Fg.leon(a, b, e, T, true), x, y, z, [.1, .6, 0], 1.05)[1]; if (m === 'acacia_f') { for (const A of ACACIAS) { const r = figura(A, Fg.acacia, x, y, z, [0, 1, 0], 1.3); if (r[1] && r[0] < .05) return r[1]; } return 'tronco'; } return m; },
  colores: { ...Fg.COLORES, tierra: [.82, .6, .34], termitero: [.62, .32, .18], hierba: [.78, .7, .3], carton: [.9, .6, .4], sol: [1, .62, .2], colina: [.62, .45, .3], nube: [1, .9, .82] },
  pinta(part, x, y, z, alb) { if (part === 'carton') { const h = cl((y + .2) / 4.5); return [mix(1, .55, h), mix(.72, .55, h), mix(.42, .75, h)]; } if (part === 'tierra') return alb.map(v => v * (.9 + .12 * n3(x * 25, 0, z * 25))); },
  luz: [-.65, .7, .55], luzColor: [1.35, 1.08, .85],
  camara: () => ({ eye: [.1, 1.0, 5.4], target: [.2, .8, -1], fov: 42 }),
});
