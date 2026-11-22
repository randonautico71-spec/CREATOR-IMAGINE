'use strict';
// PERSONAJES Y OBJETOS DE PLASTILINA (SDF). Cada función recibe coordenadas locales (x = delante, y = arriba, z = lateral)
// y devuelve [distancia, parte]. La parte da el color en la escena (colores de COLORES).
const { sdEll, smin, smax, cl, len, cap, sph, hs, hfijo, bulto } = require('./arcilla');
const A = require('../oceano/animales');   // aleta(): triángulo extruido para aletas
const COLORES = {
  cuerpo: [.88, .62, .26], cara: [.9, .66, .3], hocico: [.97, .88, .68], melena: [.62, .3, .1], nariz: [.36, .16, .12], ojo: [.97, .97, .95], pupila: [.04, .03, .03],
  lomo: [.2, .24, .32], vientre: [.88, .9, .92], del_lomo: [.48, .58, .7], del_vientre: [.92, .9, .92], aleta: [.85, .87, .9], tib_lomo: [.45, .5, .56], tib_vientre: [.93, .93, .9], diente: [.98, .97, .92], encia: [.85, .45, .5],
  piel: [.93, .72, .58], mejilla: [.95, .55, .5], pelo: [.32, .18, .1], jersey: [.82, .25, .22], pantalon: [.22, .35, .62], zapato: [.95, .95, .92], suela: [.3, .3, .32], boca: [.42, .12, .14],
  tronco: [.55, .36, .2], hoja: [.3, .62, .22], coco: [.42, .27, .14], roca: [.5, .48, .46], acacia: [.38, .55, .2],
  cohete: [.95, .95, .93], punta: [.88, .2, .18], ventana: [.35, .7, .95], llama: [1.0, .7, .15], llama2: [1.0, .35, .1] };
// ---------- LEÓN (≈1 de alto). t: tiempo para caminar (0 = quieto) ----------
function leon(x, y, z, t = 0, anda = false) {
  let d = sdEll(x, y - .52, z, .48, .27, .25), p = 'cuerpo';
  const pasos = [[.3, 1, 0], [.3, -1, Math.PI], [-.28, 1, Math.PI], [-.28, -1, 0]];
  for (const [lx, sz, f] of pasos) { const ph = anda ? Math.sin(t * 7 + f) : 0, lev = anda ? Math.max(0, Math.cos(t * 7 + f)) * .05 : 0, fx = lx + .02 + ph * .1;
    d = smin(d, cap(x, y, z, lx, .48, sz * .12, fx, .08 + lev, sz * .14, .085), .07); d = smin(d, sdEll(x - fx - .06, y - .045 - lev, z - sz * .14, .12, .05, .09), .05);
    for (const k of [-1, 0, 1]) d = smax(d, -sdEll(x - fx - .17, y - .05 - lev, z - sz * .14 - k * .03, .025, .03, .004), .01); }
  d = smin(d, sdEll(x + .05, y - .38, z, .36, .1, .2), .1);
  const hx = .56, hy = .88 + (anda ? .015 * Math.sin(t * 14) : 0); let cab = sph(x, y, z, hx, hy, 0, .2); cab = smin(cab, sdEll(x - .71, y - hy + .08, z, .12, .09, .12), .06);
  const hoc = Math.min(sph(x, y, z, .78, hy - .08, .055, .07), sph(x, y, z, .78, hy - .08, -.055, .07)), barb = sdEll(x - .74, y - hy + .16, z, .07, .045, .07);
  cab = smin(smin(cab, hoc, .03), barb, .03); d = smin(d, cab, .1); if (cab - .01 < d + .001) p = 'cara'; if (Math.min(hoc, barb) < d + .004) p = 'hocico';
  let mel = 1e9; for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283 + .2; mel = smin(mel, sph(x, y, z, hx - .07 - .04 * Math.abs(Math.cos(a)), hy + Math.cos(a) * .25, Math.sin(a) * .26, .115 + .02 * hfijo(k, 1, 2)), .07); }
  for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283; mel = smin(mel, sph(x, y, z, hx - .2, hy + Math.cos(a) * .17, Math.sin(a) * .18, .14), .08); }
  mel = smin(mel, sdEll(x - .25, y - .72, z, .2, .2, .22), .12);
  const orejas = Math.min(sph(x, y, z, .53, hy + .22, .14, .055), sph(x, y, z, .53, hy + .22, -.14, .055));
  if (mel < d) p = 'melena'; d = smin(d, mel, .05); if (orejas < d) p = 'cara'; d = smin(d, orejas, .02);
  const nariz = sdEll(x - .845, y - hy + .035, z, .04, .03, .05); if (nariz < d) p = 'nariz'; d = smin(d, nariz, .015);
  const ojo = Math.min(sph(x, y, z, .7, hy + .06, .085, .042), sph(x, y, z, .7, hy + .06, -.085, .042)), pup = Math.min(sph(x, y, z, .735, hy + .065, .09, .021), sph(x, y, z, .735, hy + .065, -.09, .021));
  if (ojo < d) { d = ojo; p = 'ojo'; } if (pup < d) { d = pup; p = 'pupila'; }
  const ceja = Math.min(cap(x, y, z, .7, hy + .12, .05, .7, hy + .11, .13, .016), cap(x, y, z, .7, hy + .12, -.05, .7, hy + .11, -.13, .016)); if (ceja < d) p = 'melena'; d = smin(d, ceja, .01);
  d = smax(d, -cap(x, y, z, .83, hy - .125, -.05, .83, hy - .125, .05, .008), .01);
  const sw = anda ? .08 * Math.sin(t * 5) : 0, cola = Math.min(cap(x, y, z, -.45, .58, 0, -.72, .42, -.05 + sw, .04), cap(x, y, z, -.72, .42, -.05 + sw, -.86, .62, -.08 + sw * 2, .035)); d = smin(d, cola, .05);
  const borla = sph(x, y, z, -.88, .7, -.08 + sw * 2, .075); if (borla < d) p = 'melena'; d = smin(d, borla, .03);
  return [d + bulto(x, y, z, .018), p];
}
// ---------- BALLENA JOROBADA (≈4 de largo, cabeza hacia +x). nado: ondulación ----------
function ballena(x, y, z, t = 0, nado = 0) {
  const az = Math.abs(z); y -= nado * .12 * Math.sin(x * 1.2 - t * 3) * cl((.5 - x) / 2); let d = sdEll(x, y, z, 1.5, .58, .62), p = 'lomo';
  d = smin(d, sdEll(x + 1.35, y + .02, z, .95, .32, .28), .35);
  d = smin(d, sdEll(x + 2.25, y, az - .32, .3, .05, .4), .1);
  { const u = x - .4, v = y + .3, w = az - .72, c = Math.cos(.6), s = Math.sin(.6), v2 = v * c - w * s, w2 = v * s + w * c; d = smin(d, sdEll(u + w2 * .35, v2, w2, .16, .045, .5), .1); }
  d = smin(d, sdEll(x + .7, y - .55, z, .16, .1, .04), .08);
  d = smax(d, -sdEll(x - .85, y + .13, z, .7, .018, .7), .02);
  if (y < -.22 && x > -.5 && x < 1.35) d += .014 * Math.max(0, Math.sin(az * 38));
  if (y > .3 && x > .75) { const cx = Math.round(x / .16), cz = Math.round(z / .14); if (hfijo(cx, cz, 7) > .35) d -= .03 * Math.max(0, 1 - len(x - cx * .16, z - cz * .14) / .055) ** 2; }
  d = smax(d, -Math.min(sdEll(x - .3, y - .58, z - .05, .08, .04, .025), sdEll(x - .3, y - .58, z + .05, .08, .04, .025)), .02);
  if (y < -.18 && d < .05) p = 'vientre'; if (az > .62 && x > -.2 && x < .8 && y < -.1) p = 'aleta';
  const ojo = sph(x, y, z, .95, .08, Math.sign(z) * .45, .05), pup = sph(x, y, z, .985, .085, Math.sign(z) * .47, .026);
  if (ojo < d) { d = ojo; p = 'ojo'; } if (pup < d) { d = pup; p = 'pupila'; }
  return [d + bulto(x, y, z, .02), p];
}
// ---------- TIBURÓN BLANCO de plastilina (≈2,2 de largo, morro hacia +x), con la boca abierta y dientes ----------
function tiburon(x, y, z, t = 0, nado = 0) {
  z -= nado * .1 * Math.sin(x * 2 - t * 5) * cl((.4 - x) / 1.4); const az = Math.abs(z);
  let d = sdEll(x - .1, y, z, .95, .3, .28), p = 'tib_lomo';
  d = smin(d, sdEll(x - .85, y - .02, z, .35, .2, .2), .2); d = smin(d, sdEll(x + .9, y, z, .55, .14, .11), .2);
  d = smin(d, A.aleta(x - .05, y - .26, z, [.25, 0], [-.22, .42], [-.25, 0], .025), .07);                                       // dorsal
  d = smin(d, A.aleta(x + 1.4, y, z, [.08, 0], [-.3, .5], [-.12, 0], .025), .05); d = smin(d, A.aleta(x + 1.4, -y, z, [.08, 0], [-.25, .38], [-.12, 0], .025), .05);   // cola en media luna
  { const py = y + .12, pz = az - .2, c = Math.cos(.7), s = Math.sin(.7), ry = py * c + pz * s, rz = -py * s + pz * c; d = smin(d, A.aleta(x - .25, rz, ry, [.2, 0], [-.3, .5], [-.2, 0], .022), .06); }   // pectorales
  for (let k = 0; k < 5; k++) d = smax(d, -sdEll(x - (.62 - k * .05), y + .02, az - .25, .006, .1, .03), .01);                // hendiduras
  const bocaD = sdEll(x - .95, y + .12, z, .22, .07, .17); d = smax(d, -bocaD, .03);                                         // boca abierta
  let dien = 1e9; for (let k = -4; k <= 4; k++) { const a = k / 4 * 1.2, bx = .95 + Math.cos(a) * .19, bz = Math.sin(a) * .15; dien = Math.min(dien, sdEll(x - bx, y + .075, z - bz, .018, .035, .014), sdEll(x - bx + .01, y + .17, z - bz * .95, .016, .03, .013)); }
  if (y < -.06 && d < .03) p = 'tib_vientre'; if (bocaD < .02) p = 'encia'; if (dien < d) { d = dien; p = 'diente'; }
  const ojo = sph(x, y, z, .88, .08, Math.sign(z) * .17, .032), pup = sph(x, y, z, .9, .085, Math.sign(z) * .19, .02);
  if (ojo < d) { d = ojo; p = 'ojo'; } if (pup < d) { d = pup; p = 'pupila'; }
  return [d + bulto(x, y, z, .012), p];
}
// ---------- DELFÍN de plastilina (≈1,6 de largo, hocico hacia +x), sonriente ----------
function delfin(x, y, z, t = 0, nado = 0) {
  y -= nado * .06 * Math.sin(x * 2.2 - t * 4) * cl((.2 - x) / 1.1); const az = Math.abs(z);
  let d = sdEll(x - .05, y, z, .6, .22, .2), p = 'del_lomo';
  d = smin(d, sdEll(x + .45, y + .01, z, .38, .14, .12), .18); d = smin(d, sdEll(x + .72, y, z, .2, .06, .045), .1);
  d = smin(d, sdEll(x - .5, y - .01, z, .22, .17, .16), .14);                                    // cabeza
  d = smin(d, sdEll(x - .58, y - .05, z, .12, .11, .11), .07);                                   // melón
  d = smin(d, sdEll(x - .76, y + .055, z, .14, .045, .055), .05);                                // hocico
  d = smin(d, A.aleta(x + .03, y - .19, z, [.13, 0], [-.18, .2], [-.15, 0], .025), .05);          // dorsal
  { const py = y + .1, pz = az - .14, c = Math.cos(.8), s = Math.sin(.8), ry = py * c + pz * s, rz = -py * s + pz * c; d = smin(d, A.aleta(x - .28, rz, ry, [.08, 0], [-.12, .19], [-.08, 0], .018), .04); }
  d = smin(d, A.aleta(x + .88, az, y, [.08, 0], [-.13, .22], [-.08, .02], .02), .04);              // cola
  const boca = cap(x, y, z, .68, -.075, -.1, .86, -.065, 0, .007); d = smax(d, -Math.min(boca, cap(x, y, z, .86, -.065, 0, .68, -.075, .1, .007)), .01);
  if (y < -.04 && d < .03) p = 'del_vientre';
  const ojo = sph(x, y, z, .55, .03, Math.sign(z) * .15, .035), pup = sph(x, y, z, .575, .035, Math.sign(z) * .168, .019);
  if (ojo < d) { d = ojo; p = 'ojo'; } if (pup < d) { d = pup; p = 'pupila'; }
  return [d + bulto(x, y, z, .01), p];
}
// ---------- PERSONA de plastilina (≈1,8 de alto, mira hacia +x). saluda: mueve la mano. ropa: colores opcionales ----------
function persona(x, y, z, t = 0, o = {}) {
  const az = Math.abs(z), anda = !!o.anda, ph = t * 6 + (o.fase || 0); let d = 1e9, p = 'pantalon', c;
  const pega = (dd, pp, k) => { if (dd < d + (k || 0) * .25) p = pp; d = k ? smin(d, dd, k) : Math.min(d, dd); };
  for (const sd of [1, -1]) { const sw = anda ? Math.sin(ph + (sd > 0 ? 0 : Math.PI)) * .18 : 0, fx = sw, lev = anda ? Math.max(0, Math.cos(ph + (sd > 0 ? 0 : Math.PI))) * .05 : 0;
    pega(cap(x, y, z, 0, .88, sd * .1, fx * .9, .14 + lev, sd * .1, .088), 'pantalon', .03);
    pega(sdEll(x - fx - .05, y - .06 - lev, z - sd * .1, .13, .06, .07), 'zapato', .03); pega(sdEll(x - fx - .05, y - .015 - lev, z - sd * .1, .135, .02, .072), 'suela', .01); }
  pega(sdEll(x, y - .95, z, .14, .1, .2), 'pantalon', .06);
  pega(sdEll(x, y - 1.2, z, .18, .31, .26), 'jersey', .08); pega(sdEll(x - .02, y - 1.44, z, .1, .04, .1), 'jersey', .04);   // cuello vuelto
  for (const sd of [1, -1]) { const sal = o.saluda && sd > 0, a = sal ? 1.4 + .35 * Math.sin(t * 8) : (anda ? Math.sin(ph + (sd > 0 ? Math.PI : 0)) * .4 : 0);
    const sh = [0, 1.4, sd * .25], el = sal ? [.05, 1.42, sd * .5] : [Math.sin(a) * .28, 1.4 - Math.cos(a) * .28, sd * .3], wr = sal ? [.08 + .12 * Math.sin(t * 8), 1.75, sd * .52] : [el[0] + Math.sin(a) * .26 + .05, el[1] - Math.cos(a) * .26, sd * .31];
    pega(cap(x, y, z, ...sh, ...el, .065), 'jersey', .05); pega(cap(x, y, z, ...el, ...wr, .055), 'jersey', .02); pega(sph(x, y, z, ...wr.map((v, i) => i === 1 ? v + (sal ? .05 : -.04) : v), .06), 'piel', .02); }
  pega(cap(x, y, z, 0, 1.45, 0, 0, 1.58, 0, .065), 'piel', .04);
  const hy = 1.78; c = sph(x, y, z, .02, hy, 0, .21); pega(c, 'piel', .04);
  pega(sdEll(x - .2, y - hy + .02, z, .05, .055, .045), 'piel', .03);                                                      // nariz
  for (const sd of [1, -1]) { pega(sdEll(x - .01, y - hy, z - sd * .21, .04, .055, .025), 'piel', .02); const m = sdEll(x - .16, y - hy + .07, z - sd * .1, .02, .035, .045); if (m < d + .01) p = 'mejilla'; }
  { const s1 = cap(x, y, z, .2, hy - .085, -.065, .218, hy - .108, 0, .009), s2 = cap(x, y, z, .218, hy - .108, 0, .2, hy - .085, .065, .009), sonr = Math.min(s1, s2); d = smax(d, -sonr, .006); if (sonr < d + .003) p = 'boca'; }   // sonrisa
  for (const sd of [1, -1]) { const ojo = sph(x, y, z, .165, hy + .055, sd * .08, .05), pup = sph(x, y, z, .208, hy + .06, sd * .084, .024); if (ojo < d) { d = ojo; p = 'ojo'; } if (pup < d) { d = pup; p = 'pupila'; }
    pega(cap(x, y, z, .19, hy + .135, sd * .04, .18, hy + .145, sd * .13, .014), 'pelo', .005); }
  let pelo = sdEll(x + .02, y - hy - .03, z, .225, .18, .23); pelo = smax(pelo, x - .14 + (y - hy - .03) * .5, .03); pelo = smax(pelo, -(y - hy + .02 - Math.max(0, -x) * .4), .04);
  for (let k = 0; k < 6; k++) pelo = smin(pelo, sph(x, y, z, .13, hy + .14, (k - 2.5) * .055, .045), .03);                       // flequillo
  if (pelo < d + .005) p = 'pelo'; d = smin(d, pelo, .015);
  return [d + bulto(x, y, z, .012), p];
}
// ---------- COHETE (≈1 de alto, punta hacia +y) con llama ----------
function cohete(x, y, z, t = 0) {
  const r = len(x, z); let d = cap(x, y, z, 0, .15, 0, 0, .65, 0, .17), p = 'cohete';
  const punta = smax(sdEll(x, y - .7, z, .17, .32, .17), -(y - .68), .02); if (punta < d) p = 'punta'; d = smin(d, punta, .03);
  for (let k = 0; k < 3; k++) { const a = k / 3 * 6.283, u = x * Math.cos(a) + z * Math.sin(a), w = -x * Math.sin(a) + z * Math.cos(a), al = A.aleta(u - .14, y - .05, w, [-.05, .25], [.17, -.1], [-.05, -.08], .02); if (al < d) p = 'punta'; d = smin(d, al, .03); }
  const ven = Math.max(len(x - .17, y - .5, z) - .07, -(x - .1)); if (ven < d + .003) p = 'ventana'; d = smin(d, sdEll(x - .16, y - .5, z, .02, .085, .085), .01);
  if (Math.abs(len(y - .5, z) - .085) < .012 && x > .14) p = 'punta';
  let ll = 1e9; for (let k = 0; k < 7; k++) { const tt = k / 6, a = k * 2.4 + t * 9; ll = smin(ll, sph(x, y, z, .05 * Math.sin(a) * tt, .08 - tt * .45, .05 * Math.cos(a) * tt, .12 - .07 * tt + .02 * Math.sin(t * 20 + k)), .06); }
  if (ll < d) { p = (y < -.12 ? 'llama2' : 'llama'); } d = Math.min(d, ll);
  return [d + bulto(x, y, z, .008), p];
}
// ---------- vegetación y rocas ----------
function palmera(x, y, z) { let d = 1e9, p = 'tronco';
  for (let k = 0; k < 11; k++) { const t = k / 10; d = smin(d, sdEll(x - .35 * t * t, y - t * 2.1, z + .1 * t, .11 - .025 * t, .1, .11 - .025 * t), .03); }
  const top = [.35, 2.15, -.1];
  for (let k = 0; k < 7; k++) { const a = k / 7 * 6.283 + .3, dx = Math.cos(a), dz = Math.sin(a), u = x - top[0] - dx * .42, w = z - top[2] - dz * .42, v = y - top[1] + .12 * ((x - top[0]) * dx + (z - top[2]) * dz) ** 2 * 3 - .05;
    const lf = sdEll(u * dx + w * dz, v, -u * dz + w * dx, .48, .025, .13 + .03 * Math.sin((u * dx + w * dz) * 30)); if (lf < d) p = 'hoja'; d = smin(d, lf, .03); }
  for (let k = 0; k < 3; k++) { const a = k * 2.1, co = sph(x, y, z, top[0] + Math.cos(a) * .1, top[1] - .1, top[2] + Math.sin(a) * .1, .065); if (co < d) p = 'coco'; d = Math.min(d, co); }
  return [d + bulto(x, y, z, .015), p]; }
function acacia(x, y, z) { let d = Math.min(cap(x, y, z, 0, 0, 0, .1, .9, 0, .07), cap(x, y, z, .1, .9, 0, .45, 1.35, .1, .05), cap(x, y, z, .1, .9, 0, -.35, 1.3, -.1, .05)), p = 'tronco';
  let c = 1e9; for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283; c = smin(c, sdEll(x - Math.cos(a) * .55, y - 1.45 - .05 * Math.sin(k * 2), z - Math.sin(a) * .45, .35, .12, .3), .15); }
  c = smin(c, sdEll(x, y - 1.5, z, .6, .14, .5), .15); if (c < d) p = 'acacia'; d = smin(d, c, .05);
  return [d + bulto(x * 2, y * 2, z * 2, .03), p]; }
const roca = (x, y, z, rx, ry, rz) => sdEll(x, y, z, rx, ry, rz) + bulto(x * 2, y * 2, z * 2, Math.min(rx, ry) * .4);
module.exports = { COLORES, leon, ballena, tiburon, delfin, persona, cohete, palmera, acacia, roca };
