'use strict';
// CLAYMOTION · fondo marino de plastilina: ballena jorobada y tiburón blanco con la boca abierta, algas, rocas con coral y anémonas,
// estrellas de mar, peces pequeños y burbujas, delante de un fondo de cartón azul con rayos de luz pintados.
const C = require('../clay/arcilla'), Fg = require('../clay/figuras');
const { sdEll, smin, len, cap, sph, bulto, hfijo, figura, crearEscena, dirYaw, n3, cl, mix } = C;
let T = 0;
const BALL0 = { pos: [.9, 2.5, -4.2], yaw: dirYaw(-1, .45), esc: .85 }, TIB0 = { pos: [-.35, 1.05, .2], yaw: dirYaw(1, .35), esc: .8 };
let BALL = BALL0, TIB = TIB0;
const DELFIN = process.env.MAR === 'delfin', DEL0 = { pos: [.1, 1.9, -.6], yaw: dirYaw(1, .45), pitch: .12, esc: 1.25 }; let DEL = DEL0;   // tema delfín
const suelo = (x, z) => .04 * (n3(x * 1.1, 0, z * 1.1) - .5) + .015 * Math.sin(x * 6 + z * 1.5);
const ALGAS = [[-1.9, -1.6, 2.6, 1], [-1.4, -2.6, 3.2, 2], [2.0, -2.0, 2.4, 3], [2.5, -3.4, 3.0, 4], [-2.6, -4, 3.4, 5], [-.6, -5.5, 2.8, 6]];
const PECES = (() => { const r = []; for (let k = 0; k < 9; k++) r.push([-2.2 + hfijo(k, 1, 4) * 1.6, 2.4 + hfijo(k, 2, 4) * 1.3, -2.2 - hfijo(k, 3, 4) * 1.6, k]); return r; })();
function alga(x, y, z, ax, az, h, s) { let d = 1e9; const n = 9; let pr = [ax, 0, az];
  for (let i = 1; i <= n; i++) { const f = i / n, q = [ax + .25 * Math.sin(f * 3 + s + T * 1.2) * f, f * h, az + .12 * Math.cos(f * 2 + s) * f]; d = smin(d, cap(x, y, z, ...pr, ...q, .035), .02);
    if (i > 1) { const sd = i % 2 ? 1 : -1; d = smin(d, sdEll(x - q[0] - sd * .16, y - q[1] + .02, z - q[2], .17, .05, .03), .03); } pr = q; }
  return d; }
function escena(x, y, z) {
  let d = y - suelo(x, z), m = 'arena'; const c = (dd, mm) => { if (dd < d) { d = dd; m = mm; } };
  if (DELFIN) c(figura(DEL, (a, b, e) => Fg.delfin(a, b, e, T, 1), x, y, z, [0, 0, 0], 1.05)[0], 'delfin');
  else { c(figura(BALL, (a, b, e) => Fg.ballena(a, b, e, T, 1), x, y, z, [-.4, 0, 0], 2.7)[0], 'ballena');
  c(figura(TIB, (a, b, e) => Fg.tiburon(a, b, e, T, 1), x, y, z, [-.2, 0, 0], 1.75)[0], 'tiburon'); }
  for (const [ax, az, h, s] of ALGAS) if (len(x - ax, z - az) < 1 && y < h + .3) c(alga(x, y, z, ax, az, h, s) + bulto(x, y, z, .01), 'alga');
  // rocas con coral y anémonas
  c(Fg.roca(x + 1.55, y - .1, z - .3, .5, .32, .4), 'roca'); c(Fg.roca(x - 1.6, y - .05, z + .4, .42, .26, .35), 'roca');
  { let co = 1e9; for (let k = 0; k < 6; k++) co = smin(co, sph(x, y, z, -1.55 + .12 * Math.cos(k * 1.3), .32 + .1 * (k % 3), -.4 + .12 * Math.sin(k * 1.3), .07), .05); c(co + bulto(x * 2, y * 2, z * 2, .03), 'coral'); }
  { let an = sph(x, y, z, 1.45, .4, -.25, .06); for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283 + T; an = smin(an, cap(x, y, z, 1.45, .42, -.25, 1.45 + Math.cos(a) * .12, .55 + .03 * Math.sin(T * 3 + k), -.25 + Math.sin(a) * .12, .018), .02); } c(an, 'anemona'); }
  c(Math.max(len(x - .45, z - 1.6) - .16 * (.35 + .65 * Math.pow(Math.abs(Math.cos(Math.atan2(z - 1.6, x - .45) * 2.5)), 2.5)), Math.abs(y - .02) - .025) * .6, 'estrella');
  for (const [px, py, pz, k] of PECES) { const q = [px + .3 * Math.sin(T * .8 + k), py + .05 * Math.sin(T * 2 + k), pz], dd = Math.min(sdEll(x - q[0], y - q[1], z - q[2], .12, .06, .035), sdEll(x - q[0] + .13, y - q[1], z - q[2], .04, .06, .01)); if (dd < .3) c(dd, 'pez'); else c(dd, 'pez'); }
  for (let k = 0; k < 10; k++) { const by = ((.4 + k * .37 + T * .5) % 3.6), bx = -.9 + .05 * Math.sin(by * 4 + k), bz = .9; c(sph(x, y, z, bx + (k % 3) * .06, by, bz - (k % 2) * .05, .035 + .01 * (k % 3)), 'burbuja'); }
  c(z + 7, 'carton');
  return [d, m];
}
module.exports = crearEscena({
  escena, lejos: 25,
  prepara(t) { T = t; DEL = { ...DEL0, pos: [DEL0.pos[0] + .3 * t, DEL0.pos[1] + .05 * Math.sin(t * 2), DEL0.pos[2] + .12 * t] }; BALL = { ...BALL0, pos: [BALL0.pos[0] - .3 * t, BALL0.pos[1], BALL0.pos[2] + .13 * t] }; TIB = { ...TIB0, pos: [TIB0.pos[0] + .35 * t, TIB0.pos[1], TIB0.pos[2] + .12 * t] }; },
  parte(m, x, y, z) { if (m === 'delfin') return figura(DEL, (a, b, e) => Fg.delfin(a, b, e, T, 1), x, y, z, [0, 0, 0], 1.05)[1]; if (m === 'ballena') return figura(BALL, (a, b, e) => Fg.ballena(a, b, e, T, 1), x, y, z, [-.4, 0, 0], 2.7)[1]; if (m === 'tiburon') return figura(TIB, (a, b, e) => Fg.tiburon(a, b, e, T, 1), x, y, z, [-.2, 0, 0], 1.75)[1]; return m; },
  colores: { ...Fg.COLORES, arena: [.86, .76, .55], alga: [.3, .6, .28], roca: [.45, .45, .48], coral: [.95, .45, .55], anemona: [1, .55, .2], estrella: [.95, .4, .2], pez: [1, .82, .2], burbuja: [.75, .9, 1], carton: [.2, .5, .75] },
  pinta(part, x, y, z, alb) { if (part === 'carton') { const h = cl((y + .3) / 5), r = Math.pow(Math.max(0, Math.sin(x * 1.3 + y * .4)), 8) * h; return [mix(.06, .3, h) + r * .3, mix(.25, .62, h) + r * .35, mix(.45, .85, h) + r * .3]; } },
  brillantes: new Set(['ojo', 'pupila', 'burbuja', 'diente']),
  luz: [-.3, 1, .45], luzColor: [1.05, 1.15, 1.2], ambiente: [.22, .38, .5], niebla: { col: [.1, .3, .48], k: .07, desde: 3 },
  camara: () => ({ eye: [0, 1.4, 5.2], target: [.15, 1.4, -1], fov: 44 }),
});
