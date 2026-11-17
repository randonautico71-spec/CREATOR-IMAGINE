'use strict';
// CLAYMOTION · calle de plastilina: edificios de colores con ventanas y puertas, aceras, farolas, árboles, un coche y gente paseando.
const C = require('../clay/arcilla'), Fg = require('../clay/figuras');
const { sdEll, smin, smax, len, cap, sph, bulto, hfijo, figura, crearEscena, dirYaw, cl, mix } = C;
let T = 0;
const caja = (x, y, z, bx, by, bz, r) => { const qx = Math.abs(x) - bx + r, qy = Math.abs(y) - by + r, qz = Math.abs(z) - bz + r; return len(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r; };
const fmod = (a, b) => ((a % b) + b) % b;
const PASTEL = [[.95, .62, .55], [.98, .85, .5], [.6, .8, .7], [.62, .72, .92], [.9, .7, .85], [.98, .75, .45], [.75, .88, .55]];
const EDIF = (() => { const r = []; for (const sd of [-1, 1]) for (let k = 0; k < 7; k++) r.push({ sd, z: 1.6 - k * 1.75, h: 2.0 + 1.6 * hfijo(k, sd, 3), col: k * 2 + (sd > 0 ? 1 : 0) }); return r; })();
const GENTE = (() => { const r = []; for (let k = 0; k < 16; k++) { const sd = k % 2 ? 1 : -1, z0 = 2.4 - hfijo(k, 1, 7) * 11, dir = hfijo(k, 2, 7) > .5 ? 1 : -1; r.push({ k, sd, x: sd * (1.4 + .45 * hfijo(k, 3, 7)), z0, dir, v: .35 + .2 * hfijo(k, 4, 7) }); } return r; })();
const ARBOLES = [[-1.85, .2], [1.85, -1.8], [-1.85, -4.6], [1.85, -6.8]];
let PERS = [];
function escena(x, y, z) {
  let d = y, m = 'asfalto'; const c = (dd, mm) => { if (dd < d) { d = dd; m = mm; } };
  if (Math.abs(x) < .06 && fmod(z, 1.2) < .6) d += .004;
  c(caja(Math.abs(x) - 1.65, y - .05, z + 4, .55, .05, 9, .03), 'acera');
  for (const E of EDIF) { const bx = E.sd * 2.95, dz = z - E.z; if (Math.abs(dz) > 1.2 || Math.abs(x - bx) > 1.2) { c(Math.max(Math.abs(dz) - .85, Math.abs(x - bx) - .8, y - E.h), 'edif' + E.col); continue; }
    let e = caja(x - bx, y - E.h / 2, dz, .75, E.h / 2, .84, .06), fx = x - bx + E.sd * .75, fil = Math.floor((y - .55) / .55), col = Math.round(dz / .5);
    if (y > .55 && y < E.h - .2 && Math.abs(col) <= 1) { const wy = .55 + fil * .55 + .27; e = smax(e, -caja(fx, y - wy, dz - col * .5, .06, .15, .12, .03), .02); }
    e = smax(e, -caja(fx, y - .35, dz, .06, .35, .2, .04), .02); e = smin(e, caja(x - bx, y - E.h, dz, .8, .05, .88, .03), .02); c(e + bulto(x, y, z, .01), 'edif' + E.col);
    if (y > .55 && y < E.h - .2 && Math.abs(col) <= 1 && Math.abs(fx) < .1) { const wy = .55 + fil * .55 + .27; c(caja(fx - E.sd * .04, y - wy, dz - col * .5, .01, .14, .11, .01), 'ventana'); } }
  for (const [ax, az] of ARBOLES) { if (len(x - ax, z - az) > .8) { c(len(x - ax, z - az) - .5, 'copa'); continue; } c(cap(x, y, z, ax, .1, az, ax, 1.0, az, .06), 'tronco'); let cp = 1e9; for (let k = 0; k < 6; k++) cp = smin(cp, sph(x, y, z, ax + .2 * Math.cos(k), 1.25 + .12 * (k % 2), az + .2 * Math.sin(k), .25), .12); c(cp + bulto(x * 2, y * 2, z * 2, .03), 'copa'); }
  for (const lz of [1.2, -2.8, -6.2]) for (const sd of [-1, 1]) { const lx = sd * 1.2; if (len(x - lx, z - lz) > .4) { c(len(x - lx, z - lz) - .3, 'farola'); continue; } c(cap(x, y, z, lx, .1, lz, lx, 1.9, lz, .035), 'farola'); c(sdEll(x - lx + sd * .12, y - 1.95, z - lz, .14, .07, .1), 'farol'); }
  { const cz = -1.2 - T * .9, cx = -.5, dz = z - cz; if (Math.abs(dz) < 1.1 && Math.abs(x - cx) < .7 && y < 1) { let car = caja(x - cx, y - .32, dz, .38, .17, .8, .15); car = smin(car, caja(x - cx, y - .55, dz - .05, .32, .16, .42, .12), .08); c(car + bulto(x, y, z, .01), 'coche');
      for (const wz of [-.45, .45]) for (const wx of [-.36, .36]) c(Math.max(len(y - .15, dz - wz) - .15, Math.abs(x - cx - wx) - .06), 'rueda'); } else c(Math.max(Math.abs(dz) - .9, Math.abs(x - cx) - .5, y - .85), 'coche'); }
  for (const P of PERS) { const r = figura(P, (a, b, e) => Fg.persona(a, b, e, T, { anda: true, fase: P.k }), x, y, z, [0, 1, 0], 1.15); c(r[0], 'p' + P.k); }
  c(z + 13, 'cielo');
  return [d, m];
}
module.exports = crearEscena({
  escena, lejos: 25,
  prepara(t) { T = t; PERS = GENTE.map(g => ({ k: g.k, pos: [g.x, .1, g.z0 + g.dir * g.v * t], yaw: dirYaw(0, g.dir), esc: .55 })); },
  parte(m, x, y, z) { if (m[0] === 'p' && m !== 'pomo') { const k = +m.slice(1), P = PERS[k]; const part = figura(P, (a, b, e) => Fg.persona(a, b, e, T, { anda: true, fase: P.k }), x, y, z, [0, 1, 0], 1.15)[1]; return ['jersey', 'pantalon', 'pelo'].includes(part) ? part + (k % 6) : part; } if (m === 'coche' && y > .47) return 'cristal'; return m; },
  colores: (() => { const c = { ...Fg.COLORES, asfalto: [.32, .32, .35], acera: [.78, .76, .72], ventana: [.6, .82, .95], tronco: [.5, .33, .2], copa: [.35, .65, .3], farola: [.2, .22, .25], farol: [1, .9, .6], coche: [.85, .2, .2], rueda: [.12, .12, .13], cristal: [.6, .82, .95], cielo: [.6, .82, .98] };
    PASTEL.forEach((v, i) => { c['edif' + i] = v; c['edif' + (i + 7)] = v.map(q => q * .9); });
    const J = [[.82, .25, .22], [.25, .5, .85], [.95, .75, .2], [.35, .7, .4], [.6, .35, .75], [.95, .55, .3]], Pn = [[.22, .35, .62], [.3, .3, .32], [.55, .4, .3], [.2, .25, .45], [.45, .5, .35], [.15, .15, .2]], Pe = [[.32, .18, .1], [.1, .08, .06], [.85, .65, .3], [.55, .25, .1], [.25, .2, .18], [.9, .85, .8]];
    for (let i = 0; i < 6; i++) { c['jersey' + i] = J[i]; c['pantalon' + i] = Pn[i]; c['pelo' + i] = Pe[i]; } return c; })(),
  pinta(part, x, y, z, alb) { if (part === 'cielo') { const h = cl(y / 6); return [mix(.95, .5, h), mix(.88, .72, h), mix(.75, .95, h)]; } if (part === 'acera') return alb.map(v => v * (fmod(z, .5) < .02 ? .8 : 1)); },
  brillantes: new Set(['ojo', 'pupila', 'cristal', 'ventana', 'coche']),
  emite(part) { return part === 'farol' ? .5 : 0; },
  camara: () => ({ eye: [0, 1.55, 5.4], target: [0, 1.05, -3], fov: 46 }),
});
