'use strict';
// CIUDAD CON MULTITUD (motor3d.js). Personas paramétricas de elipsoides + calle detallada.
const BI = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
function baseDir(d) { d = norm(d); const a = Math.abs(d[1]) < .92 ? [0, 1, 0] : [1, 0, 0]; const u = norm(cross(a, d)), v = cross(d, u); return [u, d, v]; }
const aplicaB = (B, p) => [B[0][0] * p[0] + B[1][0] * p[1] + B[2][0] * p[2], B[0][1] * p[0] + B[1][1] * p[1] + B[2][1] * p[2], B[0][2] * p[0] + B[1][2] * p[1] + B[2][2] * p[2]];
const invB = (B, p) => [dot(B[0], p), dot(B[1], p), dot(B[2], p)];

// ---------- PERSONAS ----------
const PIELES = [[244, 208, 178], [232, 186, 150], [210, 158, 118], [176, 122, 86], [138, 92, 62], [102, 66, 44]];
const PELOS = [[28, 22, 18], [58, 40, 26], [96, 62, 34], [150, 104, 56], [210, 178, 120], [120, 120, 120], [160, 54, 32]];
const ROPA = [[40, 60, 110], [180, 40, 50], [230, 230, 225], [30, 30, 34], [60, 120, 80], [210, 160, 40], [120, 70, 140], [80, 150, 190], [200, 110, 60], [150, 150, 150], [240, 120, 150], [70, 90, 60]];
const PANT = [[34, 44, 80], [30, 30, 34], [90, 80, 70], [60, 70, 100], [150, 130, 100], [110, 110, 115]];
function personaAleatoria(R) {
  const pick = a => a[R() * a.length | 0];
  return { h: 1.55 + R() * .4, ancho: .9 + R() * .25, piel: pick(PIELES), pelo: pick(PELOS), arriba: pick(ROPA), abajo: pick(PANT), zap: pick([[30, 30, 30], [240, 240, 240], [120, 70, 40], [60, 60, 70]]),
    peinado: pick(['corto', 'corto', 'largo', 'mono', 'gorra', 'calvo', 'largo']), falda: R() < .2, mochila: R() < .22, bolso: R() < .18, abrigo: R() < .25, fase: R() * 6.283, paso: .9 + R() * .3 };
}
function personaPartes(P, t = 0) {
  const out = [], s = P.h / 1.72, w = P.ancho, E = (c, sz, B, col, part, res) => out.push({ c: mul(c, 1), s: sz, B: B || BI, col, part, res });
  const ph = P.fase + t * 2 * Math.PI * P.paso, bob = Math.abs(Math.sin(ph)) * .025;
  const Y = y => y * s + bob;
  // piernas
  for (const sd of [-1, 1]) {
    const a = Math.sin(ph + (sd > 0 ? 0 : Math.PI)) * .42, kneeB = Math.max(0, -Math.cos(ph + (sd > 0 ? 0 : Math.PI))) * .5;
    const hip = [0, Y(.92), sd * .09 * w], L1 = .45 * s, L2 = .44 * s;
    const knee = [hip[0] + Math.sin(a) * L1, hip[1] - Math.cos(a) * L1, hip[2]], a2 = a - kneeB, ank = [knee[0] + Math.sin(a2) * L2, knee[1] - Math.cos(a2) * L2, hip[2]];
    if (!P.falda || true) E(mul(add(hip, knee), .5), [.075 * w, L1 * .55, .075 * w], baseDir(sub(knee, hip)), P.abajo, 'pierna');
    E(mul(add(knee, ank), .5), [.055 * w, L2 * .55, .055 * w], baseDir(sub(ank, knee)), P.falda ? P.piel : P.abajo, 'pierna');
    E([ank[0] + .05 * s, Math.max(.035, ank[1] - .03), ank[2]], [.12 * s, .045, .05 * w], BI, P.zap, 'zapato');
  }
  E([0, Y(.95), 0], [.13 * w, .11, .17 * w], BI, P.abajo, 'cadera');
  if (P.falda) E([0, Y(.8), 0], [.17 * w, .2, .2 * w], BI, P.abajo, 'falda');
  E([.01, Y(1.24), 0], [.12 * w, .25, .19 * w], BI, P.arriba, 'torso');
  E([.04, Y(1.33), 0], [.1 * w, .14, .17 * w], BI, P.arriba, 'pecho');
  if (P.abrigo) E([0, Y(1.1), 0], [.15 * w, .3, .21 * w], BI, P.arriba.map(v => v * .75), 'abrigo');
  E([0, Y(1.5), 0], [.05, .06, .05], BI, P.piel, 'cuello');
  // brazos
  for (const sd of [-1, 1]) {
    const a = -Math.sin(ph + (sd > 0 ? 0 : Math.PI)) * .45, sh = [0, Y(1.43), sd * .2 * w], L1 = .3 * s, L2 = .28 * s;
    const el = [sh[0] + Math.sin(a) * L1, sh[1] - Math.cos(a) * L1, sh[2] + sd * .02], a2 = a + .25 + Math.max(0, a) * .4, wr = [el[0] + Math.sin(a2) * L2, el[1] - Math.cos(a2) * L2, el[2]];
    E(mul(add(sh, el), .5), [.055 * w, L1 * .56, .055 * w], baseDir(sub(el, sh)), P.arriba, 'brazo');
    E(mul(add(el, wr), .5), [.045, L2 * .56, .045], baseDir(sub(wr, el)), P.abrigo ? P.arriba : P.piel, 'brazo');
    E(add(wr, [Math.sin(a2) * .04, -.04, 0]), [.035, .05, .03], BI, P.piel, 'mano');
    if (P.bolso && sd > 0) E(add(wr, [0, -.14, .03]), [.1, .09, .04], BI, P.arriba.map(v => 255 - v * .6), 'bolso');
  }
  // cabeza
  const hc = [.01, Y(1.635), 0];
  E(hc, [.1, .118, .088], BI, P.piel, 'cabeza');
  E(add(hc, [.097, -.005, 0]), [.022, .028, .016], BI, P.piel.map(v => v * .92), 'nariz', 4);
  for (const sd of [-1, 1]) E(add(hc, [.082, .025, sd * .036]), [.012, .012, .014], BI, [30, 24, 20], 'ojo', 4);
  if (P.peinado !== 'calvo') E(add(hc, [-.02, .038, 0]), [.104, .095, .094], BI, P.pelo, 'pelo');
  if (P.peinado === 'largo') E(add(hc, [-.055, -.07, 0]), [.065, .15, .095], BI, P.pelo, 'pelo');
  if (P.peinado === 'mono') E(add(hc, [-.09, .08, 0]), [.05, .05, .05], BI, P.pelo, 'pelo');
  if (P.peinado === 'gorra') { const g = P.arriba.map(v => 255 - v); E(add(hc, [-.005, .075, 0]), [.108, .055, .1], BI, g, 'gorra'); E(add(hc, [.1, .06, 0]), [.075, .012, .08], BI, g, 'gorra'); }
  if (P.mochila) E([-.2, Y(1.27), 0], [.08, .18, .15 * w], BI, P.arriba.map(v => v * .55 + 40), 'mochila');
  return out;
}
// malla de una persona en el mundo. o: { pos, rot, t, lat, lon }
function personaMalla(F, P, o = {}) {
  const partes = personaPartes(P, o.t || 0), pos = o.pos, W = q => add(pos, rotY(q, o.rot || 0));
  for (const q of partes) {
    const lat = q.res || o.lat || 6, lon = q.res ? q.res + 2 : (o.lon || 9), tmp = []; sphere(tmp, [0, 0, 0], 1, lat, lon, () => [0, 0, 0]);
    for (const f of tmp) { f.p = f.p.map(v => W(add(q.c, aplicaB(q.B, [v[0] * q.s[0], v[1] * q.s[1], v[2] * q.s[2]])))); f.col = q.col; f.part = q.part; F.push(f); }
  }
  if (o.sombra !== false) { const sh = []; for (let k = 0; k < 10; k++) { const a0 = k / 10 * 6.283, a1 = (k + 1) / 10 * 6.283; sh.push(add(pos, [Math.cos(a0) * .32, .012, Math.sin(a0) * .22])); }
    o.capaSombras ? o.capaSombras.push({ p: sh.reverse(), col: [0, 0, 0], sombra: true, emit: true }) : null; }
}

// ---------- CIUDAD ----------
const CIU = { calle: 4, acera: 7, z0: -75, z1: 18, pz: 5 };
const hashC = (a, b, c) => hash3(a * 97 | 0, b * 57 | 0, c);
function quadF(F, a, b, c, d, col, x = {}) { F.push({ p: [a, b, c, d], col, ...x }); }
// fachada en el plano x = X (mirando hacia el centro de la calle: lado = -1 si X>0)
function edificio(F, Fd, X, z0, z1, h, lado, R, o = {}) {
  const prof = 8, xin = X, xout = X + (lado < 0 ? prof : -prof), tipo = R() * 4 | 0;
  const cols = [[176, 92, 70], [214, 196, 170], [150, 150, 156], [196, 170, 130], [120, 130, 150], [230, 220, 200], [168, 120, 96]], col = cols[R() * cols.length | 0];
  const x0 = Math.min(xin, xout), x1 = Math.max(xin, xout);
  box(F, x0, 0, z0, x1, h, z1, col, { top: col.map(v => v * .8) });
  // cornisa y azotea
  box(F, lado < 0 ? xin - .25 : xin - .05, h, z0 - .1, lado < 0 ? xin + .05 : xin + .25, h + .35, z1 + .1, col.map(v => v * .85));
  if (R() < .7) box(F, x0 + 2, h, z0 + 1, x0 + 3.2, h + 1.6, z0 + 2.2, [150, 140, 130]);
  if (R() < .5) lathe(F, [[0, h + 2.6], [.6, h + 2.4], [.6, h + 1], [0, h + 1]], 8, () => [120, 90, 70], [x0 + 5, h + 1.8, z0 + 2], x0 + 5, z0 + 2);
  const sx = lado < 0 ? -1 : 1, fx = xin + sx * .02;   // plano de fachada, un poco hacia la calle
  const pisoH = 3.1, nPisos = Math.floor((h - 4) / pisoH), anchoV = 1.1, sep = 2.0, nV = Math.max(1, Math.floor((z1 - z0 - .6) / sep));
  for (let p = 0; p < nPisos; p++) {
    const y = 4.2 + p * pisoH;
    box(Fd, Math.min(fx, fx + sx * .08), y - .25, z0, Math.max(fx, fx + sx * .08), y - .12, z1, col.map(v => v * .8), { f: { zb: -.02 } });   // línea de forjado
    for (let k = 0; k < nV; k++) {
      const zc = z0 + (z1 - z0) / (nV) * (k + .5), luz = R() < (o.luces || .28);
      const marco = [235, 232, 225], vid = luz ? [255, 214, 140] : jit([70, 96, 124], .8 + .4 * R());
      const P = (dy, dz, e) => [fx + sx * e, y + dy, zc + dz];
      quadF(Fd, P(0, -anchoV / 2 - .08, .03), P(0, anchoV / 2 + .08, .03), P(1.9, anchoV / 2 + .08, .03), P(1.9, -anchoV / 2 - .08, .03), marco, { zb: -.04, two: true });
      quadF(Fd, P(.07, -anchoV / 2, .05), P(.07, anchoV / 2, .05), P(1.83, anchoV / 2, .05), P(1.83, -anchoV / 2, .05), vid, { zb: -.06, two: true, emit: luz });
      quadF(Fd, P(.07, -.025, .06), P(.07, .025, .06), P(1.83, .025, .06), P(1.83, -.025, .06), marco, { zb: -.07, two: true });
      if (tipo === 1 && p % 2 === 0) box(Fd, Math.min(fx, fx + sx * .7), y - .05, zc - .75, Math.max(fx, fx + sx * .7), y + .08, zc + .75, [60, 60, 64], { f: { zb: -.08 } });
      if (tipo === 1 && p % 2 === 0) box(Fd, Math.min(fx + sx * .66, fx + sx * .7), y + .08, zc - .75, Math.max(fx + sx * .66, fx + sx * .7), y + .9, zc + .75, [40, 40, 44], { f: { zb: -.09 } });
    }
  }
  // planta baja: escaparates y toldos
  const tienda = [[200, 60, 60], [40, 110, 70], [30, 70, 140], [220, 150, 40], [120, 50, 110]][R() * 5 | 0];
  quadF(Fd, [fx + sx * .03, .15, z0 + .3], [fx + sx * .03, .15, z1 - .3], [fx + sx * .03, 3.2, z1 - .3], [fx + sx * .03, 3.2, z0 + .3], [40, 40, 44], { zb: -.03, two: true });
  quadF(Fd, [fx + sx * .05, .35, z0 + .5], [fx + sx * .05, .35, z1 - .5], [fx + sx * .05, 2.8, z1 - .5], [fx + sx * .05, 2.8, z0 + .5], R() < .6 ? [255, 228, 180] : [150, 180, 200], { zb: -.05, two: true, emit: true });
  quadF(Fd, [fx + sx * .06, 2.95, z0 + .4], [fx + sx * .06, 2.95, z1 - .4], [fx + sx * .06, 3.55, z1 - .4], [fx + sx * .06, 3.55, z0 + .4], tienda, { zb: -.06, two: true });
  const nr = Math.max(2, Math.round((z1 - z0) / .5));
  for (let k = 0; k < nr; k++) { const za = z0 + .4 + (z1 - z0 - .8) * k / nr, zb2 = z0 + .4 + (z1 - z0 - .8) * (k + 1) / nr;
    quadF(F, [fx, 3.1, za], [fx, 3.1, zb2], [fx + sx * 1.3, 2.6, zb2], [fx + sx * 1.3, 2.6, za], k % 2 ? [245, 240, 230] : tienda, { two: true, zb: -.1 }); }
}
function farola(F, x, z, lado) { tubo(F, [x, 0, z], [x, 5.2, z], .07, .05, 6, [50, 54, 60]); tubo(F, [x, 5.2, z], [x + lado * 1.1, 5.4, z], .04, .04, 5, [50, 54, 60]); box(F, x + lado * 1.1 - .25, 5.15, z - .15, x + lado * 1.1 + .25, 5.35, z + .15, [255, 236, 190], { f: { emit: true } }); }
function arbolCalle(F, x, z, R) { tubo(F, [x, 0, z], [x + .1, 2.4, z], .12, .08, 6, [96, 72, 52]); box(F, x - .6, 0, z - .6, x + .6, .18, z + .6, [130, 120, 110]);
  for (let i = 0; i < 9; i++) { const c = [x + (R() - .5) * 1.5, 3.1 + (R() - .3) * 1.4, z + (R() - .5) * 1.5]; sphere(F, c, .65 + R() * .35, 4, 7, (p, a, b) => jit([70 + R() * 30, 120 + R() * 30, 60], (p[1] < c[1] ? .75 : 1) * (.9 + .2 * hash3(a, b, i)))); } }
function semaforo(F, x, z, lado) { tubo(F, [x, 0, z], [x, 3.4, z], .07, .06, 6, [40, 44, 48]); box(F, x - .16, 2.4, z - .14, x + .16, 3.3, z + .14, [30, 32, 36]);
  [[255, 60, 50], [255, 190, 40], [60, 230, 120]].forEach((c, i) => sphere(F, [x - lado * .17, 3.15 - i * .3, z], .09, 4, 6, () => i === 2 ? c : c.map(v => v * .3)).forEach(f => f.emit = i === 2)); }
function coche(F, x, z, rot, col) { const W = p => add([x, 0, z], rotY(p, rot)), L = [];
  box(L, -2.1, .35, -.9, 2.1, 1.0, .9, col); box(L, -1.1, 1.0, -.82, 1.0, 1.55, .82, col.map(v => v * .95));
  box(L, -1.0, 1.05, -.84, .9, 1.48, .84, [60, 80, 100]); box(L, 1.0, 1.02, -.75, 1.08, 1.48, .75, [70, 90, 110]); box(L, -1.18, 1.02, -.75, -1.1, 1.48, .75, [70, 90, 110]);
  for (const [a, b] of [[1.3, .9], [1.3, -.9], [-1.3, .9], [-1.3, -.9]]) lathe(L, [[0, .38], [.36, .38], [.36, -.38], [0, -.38]].map(([r, y]) => [r, y]), 10, () => [25, 25, 28], [0, 0, 0], 0, 0, p => [a + p[0], .36 + p[2], b * 1.0 + p[1] * .3]);
  box(L, 2.1, .55, -.7, 2.15, .75, -.4, [255, 250, 220], { f: { emit: true } }); box(L, 2.1, .55, .4, 2.15, .75, .7, [255, 250, 220], { f: { emit: true } });
  box(L, -2.15, .6, -.75, -2.1, .78, -.45, [220, 40, 40], { f: { emit: true } }); box(L, -2.15, .6, .45, -2.1, .78, .75, [220, 40, 40], { f: { emit: true } });
  for (const f of L) { f.p = f.p.map(W); F.push(f); } }
function tubo(F, a, b, r1, r2, seg, col) { const d = norm(sub(b, a)), B = baseDir(d), ring = (c, r, k) => { const an = k / seg * 6.283; return add(c, add(mul(B[0], Math.cos(an) * r), mul(B[2], Math.sin(an) * r))); };
  const fs = []; for (let k = 0; k < seg; k++) fs.push({ p: [ring(a, r1, k), ring(a, r1, k + 1), ring(b, r2, k + 1), ring(b, r2, k)], col }); orientTo(fs, mul(add(a, b), .5)); F.push(...fs); }
function banco(F, x, z, rot) { const L = []; box(L, -.8, .42, -.22, .8, .48, .22, [120, 80, 50]); box(L, -.8, .5, -.24, .8, .9, -.18, [120, 80, 50]); for (const a of [-.7, .7]) box(L, a - .04, 0, -.2, a + .04, .42, .2, [40, 40, 44]); for (const f of L) { f.p = f.p.map(p => add([x, 0, z], rotY(p, rot))); F.push(f); } }

// Construye la escena: capas [suelo, edificios, fachadas, calle(gente y mobiliario)], cámara y lista de personas
function construyeCiudad(o = {}) {
  const R = rng(o.semilla || 4), suelo = [], edif = [], fach = [], calle = [], sombras = [], gente = [], Z0 = o.z0 ?? CIU.z0, Z1 = o.z1 ?? CIU.z1, HM = o.hMax || 32;
  const C = CIU.calle, A = CIU.acera;
  for (let z = Z0; z < Z1; z += 2) {   // asfalto en tiras con textura
    for (let x = -C; x < C; x += 2) quadF(suelo, [x, 0, z], [x, 0, z + 2], [x + 2, 0, z + 2], [x + 2, 0, z], jit([62, 64, 68], .9 + .15 * hashC(x, z, 1)));
    if (((z / 2) | 0) % 3 === 0 && Math.abs(z - CIU.pz) > 2.5) quadF(suelo, [-.08, .005, z], [-.08, .005, z + 1.6], [.08, .005, z + 1.6], [.08, .005, z], [235, 220, 140], { zb: -.01 });
    for (const sd of [-1, 1]) { const x0 = sd * C, x1 = sd * A;   // aceras con baldosas y bordillo
      box(suelo, Math.min(x0, x0 + sd * .25), 0, z, Math.max(x0, x0 + sd * .25), .16, z + 2, [190, 188, 182]);
      for (let k = 0; k < 4; k++) { const xa = x0 + sd * (.25 + k * .69), xb = xa + sd * .69; quadF(suelo, [Math.min(xa, xb), .15, z], [Math.min(xa, xb), .15, z + 2], [Math.max(xa, xb), .15, z + 2], [Math.max(xa, xb), .15, z], jit([176, 170, 160], .9 + .15 * hashC(xa * 3, z, 2))); } }
  }
  for (let k = 0; k < 10; k++) { const x = -C + .4 + k * .8; quadF(suelo, [x, .006, CIU.pz - 1.6], [x, .006, CIU.pz + 1.6], [x + .45, .006, CIU.pz + 1.6], [x + .45, .006, CIU.pz - 1.6], [240, 240, 236], { zb: -.02 }); }   // paso de cebra
  for (const sd of [-1, 1]) {   // edificios
    let z = Z0; while (z < Z1 - 2) { const w = 5 + R() * 5, h = Math.min(HM, 12 + R() * 20) * (o.escalaH || 1); edificio(edif, fach, sd * A, z, Math.min(Z1, z + w), h, -sd, R, o); z += w; }
    for (let z2 = Math.max(-60, Z0 + 3); z2 < Z1 - 2; z2 += 9) { farola(calle, sd * (C + .5), z2, -sd); if (Math.abs(z2 + 4.5 - CIU.pz) > 2.5) arbolCalle(calle, sd * (C + 1.6), z2 + 4.5, R); }
    semaforo(calle, sd * (C + .45), CIU.pz + sd * 2.2, -sd); banco(calle, sd * (A - .6), -3, sd > 0 ? -Math.PI / 2 : Math.PI / 2);
    box(calle, sd * (A - .8) - .2, 0, -6.2, sd * (A - .8) + .2, .9, -5.8, [40, 70, 50]);
  }
  for (const [x, z, r, c] of [[-1.9, -12, Math.PI / 2, [190, 30, 40]], [1.9, -22, -Math.PI / 2, [30, 60, 120]], [-1.9, -34, Math.PI / 2, [230, 230, 225]], [1.9, -45, -Math.PI / 2, [240, 190, 40]]]) if (z > Z0 + 3 && z < Z1 - 3) coche(calle, x, z, r, c);
  // multitud
  const n = o.n || 380;
  for (let i = 0; i < n; i++) {
    const P = personaAleatoria(R); let x, z, rot;
    if (i < n * .22) { x = (R() - .5) * 2 * (C - .3); z = CIU.pz + (R() - .5) * 2.8; rot = (R() < .5 ? 0 : Math.PI) + (R() - .5) * .3; }
    else { const sd = R() < .5 ? -1 : 1; x = sd * (C + .5 + R() * (A - C - 1.2)); z = Math.min(Z1 - 1, 15) - Math.pow(R(), 1.4) * Math.min(62, Math.min(Z1 - 1, 15) - Z0 - 2); rot = (R() < .5 ? -Math.PI / 2 : Math.PI / 2) + (R() - .5) * .35; }
    if (gente.some(g => Math.hypot(g.pos[0] - x, g.pos[2] - z) < .55)) continue;
    const y = Math.abs(x) > C ? .16 : 0; gente.push({ P, pos: [x, y, z], rot });
  }
  return { suelo, edif, fach, calle, sombras, gente };
}
function anadeGente(capa, sombras, gente, o = {}) { const T = globalThis.T_ANIM || 0; for (const g of gente) personaMalla(capa, g.P, { pos: add(g.pos, rotY([1.25 * T * g.P.paso, 0, 0], g.rot)), rot: g.rot, t: (o.t || 0) + T, lat: o.lat, lon: o.lon, capaSombras: sombras }); }
const CAMC = (w, h, o = {}) => camera(o.eye || [0, 5.2, 16.5], o.target || [0, 1.8, -6], { fov: o.fov || 50, w, h, ortho: o.ortho, cy: o.cy });
const SOLC = norm([.55, .75, .35]), LUZC = { light: SOLC, amb: .42, lightCol: [1.15, 1.05, .92], ambCol: [.78, .85, 1.0] };
function cieloCiudad(ctx, w, h, cam, o = {}) {
  ctx.fillStyle = lin(ctx, 0, 0, 0, h * .6, o.stops || [['#5a90c8', 0], ['#9cc4e4', .5], ['#f2dcc0', 1]]); ctx.fillRect(0, 0, w, h);
  const R = rng(5); for (let i = 0; i < 6; i++) { const cx = R() * w, cy = h * (.05 + R() * .25), s = w * (.06 + R() * .07); for (let k = 0; k < 8; k++) { const x = cx + (R() - .5) * s * 3, y = cy + (R() - .5) * s * .5, r = s * (.35 + R() * .5), g = ctx.createRadialGradient(x, y - r * .3, 1, x, y, r); g.addColorStop(0, 'rgba(255,255,255,.85)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); } }
  const hz = cam.P([0, 0, -400])[1]; ctx.fillStyle = 'rgba(120,130,150,.6)'; for (let x = 0; x < w; x += w / 40) { const hh = h * (.03 + .05 * hash3(x | 0, 1, 2)); ctx.fillRect(x, hz - hh, w / 40 + 1, hh); }
}
function renderCiudad(ctx, cam, S, o = {}) {
  const L = { ...LUZC, ...(o.luz || {}), seam: o.seam ?? .8 };
  render(ctx, cam, S.suelo, L);
  if (S.sombras.length) { ctx.globalAlpha = o.alfaSombra ?? .35; render(ctx, cam, S.sombras, { ...L, two: true }); ctx.globalAlpha = 1; }
  render(ctx, cam, S.edif, L); render(ctx, cam, S.fach, L);
  render(ctx, cam, S.calle, L);
}

function personaDentro(x, y, z, partes) { for (const q of partes) { const d = invB(q.B, [x - q.c[0], y - q.c[1], z - q.c[2]]); if ((d[0] / q.s[0]) ** 2 + (d[1] / q.s[1]) ** 2 + (d[2] / q.s[2]) ** 2 <= 1) return q; } return null; }
function muestreaCaras(F, densidad, R) { const out = []; for (const f of F) { const p = f.p, n = newell(p); for (let t = 1; t < p.length - 1; t++) { const a = p[0], b = p[t], c = p[t + 1], ar = Math.hypot(...cross(sub(b, a), sub(c, a))) / 2, k = ar * densidad * (f.part ? 6 : 1) + R(); for (let j = 0; j < Math.floor(k); j++) { let u = R(), v = R(); if (u + v > 1) { u = 1 - u; v = 1 - v; } out.push({ p: add(a, add(mul(sub(b, a), u), mul(sub(c, a), v))), n, col: f.col, emit: f.emit }); } } } return out; }
