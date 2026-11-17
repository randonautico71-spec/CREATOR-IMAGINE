'use strict';
// CLAYMOTION · planeta tipo Tierra de plastilina (continentes inventados en relieve, hielo en los polos, nubes en bolitas), Luna con cráteres
// y un cohete con su llama en órbita, delante de un cartón negro con estrellas en relieve.
const C = require('../clay/arcilla'), Fg = require('../clay/figuras');
const { sdEll, smin, smax, len, sph, bulto, hfijo, crearEscena, n3, cl } = C;
let T = 0, ROC = null;
const TIERRA = [0, .25, -1], R = 1.25, LUNA = [1.55, 1.85, -2.7], RL = .32;
const NUBES = (() => { const r = []; for (let k = 0; k < 30; k++) { const u = hfijo(k, 1, 1) * 2 - 1, a = hfijo(k, 2, 2) * 6.283, s = Math.sqrt(1 - u * u); r.push([s * Math.cos(a), u * .85, s * Math.sin(a), .07 + .07 * hfijo(k, 3, 3)]); } return r; })();
const CRATERES = (() => { const r = []; for (let k = 0; k < 9; k++) { const u = hfijo(k, 5, 1) * 2 - 1, a = hfijo(k, 6, 2) * 6.283, s = Math.sqrt(1 - u * u); r.push([s * Math.cos(a), u, s * Math.sin(a), .05 + .06 * hfijo(k, 7, 3)]); } return r; })();
const giro = (x, z, a) => [x * Math.cos(a) - z * Math.sin(a), x * Math.sin(a) + z * Math.cos(a)];
const tierraLoc = (x, y, z) => { const [a, b] = giro(x - TIERRA[0], z - TIERRA[2], T * .25 + .8); return [a, y - TIERRA[1], b]; };
const tierraN = (q) => { const r = len(...q) || 1, u = q.map(v => v / r); return [u, n3(u[0] * 2.2 + 3, u[1] * 2.2, u[2] * 2.2) * .7 + n3(u[0] * 5, u[1] * 5, u[2] * 5 + 7) * .3]; };
function cohetePos(t) { const a = 1.3 + t * .45, p = [TIERRA[0] + Math.cos(a) * 1.95, TIERRA[1] + .3 + .45 * Math.sin(a), TIERRA[2] + Math.sin(a) * 1.95], v = [-Math.sin(a), .45 * Math.cos(a) / 1.95, Math.cos(a)];
  const lv = len(...v), Y = v.map(q => q / lv), rad = [p[0] - TIERRA[0], 0, p[2] - TIERRA[2]], X0 = [Y[1] * rad[2] - Y[2] * rad[1], Y[2] * rad[0] - Y[0] * rad[2], Y[0] * rad[1] - Y[1] * rad[0]], lx = len(...X0), X = X0.map(q => q / lx), Z = [X[1] * Y[2] - X[2] * Y[1], X[2] * Y[0] - X[0] * Y[2], X[0] * Y[1] - X[1] * Y[0]];
  return { p, X, Y, Z, esc: .6 }; }
const cohLoc = (x, y, z) => { const d = [x - ROC.p[0], y - ROC.p[1], z - ROC.p[2]], dt = (A) => (A[0] * d[0] + A[1] * d[1] + A[2] * d[2]) / ROC.esc; return [dt(ROC.Z), dt(ROC.Y) + .35, -dt(ROC.X)]; };
function escena(x, y, z) {
  let d = 1e9, m = 'carton'; const c = (dd, mm) => { if (dd < d) { d = dd; m = mm; } };
  { const q = tierraLoc(x, y, z), r = len(...q); if (r > R + .4) c(r - R - .25, 'tierra'); else { const [u, nn] = tierraN(q), tierra = cl((nn - .52) * 12), dd = r - R - .045 * tierra; c(dd + bulto(x, y, z, .01), 'tierra');
      let nb = 1e9; for (const [a, b, e, s] of NUBES) nb = smin(nb, sdEll(q[0] - a * (R + .06), q[1] - b * (R + .06), q[2] - e * (R + .06), s * 1.3, s * .7, s * 1.3), .05); c(nb + bulto(x * 2, y * 2, z * 2, .015), 'nube'); } }
  { const q = [x - LUNA[0], y - LUNA[1], z - LUNA[2]]; let dl = len(...q) - RL; if (dl < .2) for (const [a, b, e, s] of CRATERES) dl = smax(dl, -sph(...q, a * RL * 1.02, b * RL * 1.02, e * RL * 1.02, s), .02); c(dl + bulto(x * 3, y * 3, z * 3, .01), 'luna'); }
  { const db = len(x - ROC.p[0], y - ROC.p[1], z - ROC.p[2]) - .65; c(db > .1 ? db : Fg.cohete(...cohLoc(x, y, z), T)[0] * ROC.esc * .8, 'cohete_f'); }
  c(z + 6, 'espacio');                                                    // cartón negro; las estrellas van pintadas en relieve de pintura
  return [d, m];
}
module.exports = crearEscena({
  escena, lejos: 20,
  prepara(t) { T = t; ROC = cohetePos(t); },
  parte(m, x, y, z) {
    if (m === 'tierra') { const q = tierraLoc(x, y, z), [u, nn] = tierraN(q); if (Math.abs(u[1]) > .86) return 'hielo'; if (nn < .52) return 'oceano'; return (Math.abs(u[1]) < .35 && n3(u[0] * 6, u[1] * 6, u[2] * 6) > .55) ? 'desierto' : 'continente'; }
    if (m === 'cohete_f') return Fg.cohete(...cohLoc(x, y, z), T)[1];
    if (m === 'espacio') { const sz = .16, ix = Math.floor(x / sz), iy = Math.floor(y / sz); if (hfijo(ix, iy, 4) > .88 && len(x - (ix + .3 + .4 * hfijo(iy, ix, 2)) * sz, y - (iy + .3 + .4 * hfijo(ix, iy, 5)) * sz) < .012 + .02 * hfijo(iy, ix, 9)) return 'estrella'; return 'espacio'; } return m; },
  colores: { ...Fg.COLORES, oceano: [.18, .42, .85], continente: [.35, .66, .3], desierto: [.86, .7, .4], hielo: [.96, .97, 1], nube: [1, 1, 1], luna: [.72, .72, .7], espacio: [.03, .03, .07], estrella: [1, .95, .7] },
  emite(part) { return part === 'estrella' ? 2.5 : part === 'llama' || part === 'llama2' ? 1.2 : 0; },
  luz: [-.85, .35, .45], luzColor: [1.4, 1.3, 1.15], ambiente: [.06, .07, .12], fondo: [.02, .02, .05],
  camara: () => ({ eye: [0, .55, 5.6], target: [.1, .55, -1], fov: 44 }),
});
