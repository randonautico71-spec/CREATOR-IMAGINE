'use strict';
// CLAYMOTION · persona de plastilina saludando (o caminando, con ACCION=andar) en la acera: pared de ladrillo, ventana, puerta, maceta y farola.
const C = require('../clay/arcilla'), Fg = require('../clay/figuras');
const { sdEll, smin, smax, len, cap, sph, bulto, figura, crearEscena, dirYaw, n3, cl } = C;
const ANDA = process.env.ACCION === 'andar';   // ACCION=andar: la persona camina en vez de saludar
const P = { pos: [0, 0, 0], yaw: ANDA ? dirYaw(1, .3) : dirYaw(.25, 1), esc: 1 }; let T = 0;
const OPC = ANDA ? { anda: true } : { saluda: true };
const caja = (x, y, z, bx, by, bz, r) => { const qx = Math.abs(x) - bx + r, qy = Math.abs(y) - by + r, qz = Math.abs(z) - bz + r; return len(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r; };
const fmod = (a, b) => ((a % b) + b) % b;
function escena(x, y, z) {
  let d = y, m = 'baldosa'; const c = (dd, mm) => { if (dd < d) { d = dd; m = mm; } };
  { const gx = Math.abs(fmod(x + .3, .6) - .3), gz = Math.abs(fmod(z + .3, .6) - .3); if (Math.min(gx, gz) < .015) d += .008; }
  c(figura(P, (a, b, e) => Fg.persona(a, b, e, T, OPC), x, y, z, [0, 1, 0], 1.15)[0], 'persona');
  // pared de ladrillo con ventana y puerta
  let pared = z + 1.4; pared = smax(pared, -caja(x - 1.35, y - 1.55, z + 1.4, .55, .6, .12, .05), .02); pared = smax(pared, -caja(x + 1.45, y - 1.1, z + 1.4, .5, 1.1, .1, .05), .02);
  c(pared, 'ladrillo'); c(caja(x - 1.35, y - 1.55, z + 1.48, .55, .6, .03, .02), 'ventana'); c(caja(x - 1.35, y - 1.55, z + 1.36, .6, .03, .04, .02), 'marco'); c(caja(x - 1.35, y - 1.55, z + 1.36, .03, .63, .04, .02), 'marco');
  c(caja(x - 1.35, y - .9, z + 1.3, .65, .04, .1, .03), 'marco'); c(caja(x + 1.45, y - 1.1, z + 1.45, .48, 1.08, .04, .03), 'puerta'); c(sph(x, y, z, -1.1, 1.05, -1.38, .045), 'pomo');
  // maceta con planta y farola
  c(smax(sdEll(x - .95, y - .22, z + .7, .22, .25, .22), y - .4, .03), 'maceta'); for (let k = 0; k < 7; k++) { const a = k / 7 * 6.283; c(sdEll(x - .95 - Math.cos(a) * .15, y - .62 - .1 * (k % 2), z + .7 - Math.sin(a) * .15, .1, .2, .06) + bulto(x * 3, y * 3, z * 3, .02), 'planta'); }
  c(cap(x, y, z, -1.0, 0, .3, -1.0, 2.3, .3, .05), 'farola'); c(sdEll(x + 1.0, y - 2.38, z - .3, .16, .12, .16), 'farol');
  c(z + 4, 'carton');
  return [d, m];
}
module.exports = crearEscena({
  escena, lejos: 15,
  prepara(t) { T = t; },
  parte(m, x, y, z) { if (m === 'persona') return figura(P, (a, b, e) => Fg.persona(a, b, e, T, OPC), x, y, z, [0, 1, 0], 1.15)[1]; return m; },
  colores: { ...Fg.COLORES, baldosa: [.78, .76, .72], ladrillo: [.75, .38, .28], ventana: [.55, .78, .92], marco: [.95, .95, .92], puerta: [.25, .45, .35], pomo: [.95, .8, .3], maceta: [.78, .42, .25], planta: [.3, .62, .25], farola: [.2, .22, .25], farol: [1, .9, .6], carton: [.7, .85, .95] },
  pinta(part, x, y, z, alb) { if (part === 'ladrillo') { const fila = Math.floor(y / .14), off = fila % 2 ? .13 : 0, junta = fmod(y, .14) < .02 || fmod(x + off, .26) < .02; return junta ? [.85, .82, .76] : alb.map(v => v * (.85 + .25 * C.hfijo(Math.floor((x + off) / .26), fila, 3))); }
    if (part === 'baldosa') return alb.map(v => v * (.92 + .1 * C.hfijo(Math.floor(x / .6), Math.floor(z / .6), 2))); },
  emite(part) { return part === 'farol' ? .6 : 0; },
  camara: () => ({ eye: [.15, 1.2, 3.6], target: [.05, 1.0, 0], fov: 42 }),
});
