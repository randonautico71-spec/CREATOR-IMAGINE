'use strict';
// Estilo REALISTA (SDF + texturas procedurales): calle con multitud. Para banda.js
const vm = require('vm'), fs = require('fs'), path = require('path');
if (typeof globalThis.personaPartes !== 'function') {
  globalThis.document = { createElement: () => ({ getContext: () => ({}) }) };
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../../estilos/motor3d.js'), 'utf8'));
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'modelo.js'), 'utf8'));
  vm.runInThisContext('Object.assign(globalThis,{norm,sub,mul,add,dot,cross,smooth,mix,clamp,fbm3,vnoise3,hash3,rng,rotY,personaPartes,construyeCiudad,CIU,invB,SOLC})');
}
const M = require('../../sdf/motor'), G = globalThis;
const SOL = G.SOLC, C = 4, A = 7, PZ = 5;
const sdBox = (x, y, z, bx, by, bz) => { const qx = Math.abs(x) - bx, qy = Math.abs(y) - by, qz = Math.abs(z) - bz; return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0); };
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * .25; };
const fmod = (a, b) => ((a % b) + b) % b;
let CACHE = null, T_DATOS = 0;
function datos(t) {
  if (t == null) t = T_DATOS;
  if (CACHE && CACHE.t === t) return CACHE;
  const S = G.construyeCiudad({}), gente = [];
  for (const g0 of S.gente) { const g = { ...g0, pos: G.add(g0.pos, G.rotY([1.25 * t * g0.P.paso, 0, 0], g0.rot)) }; const partes = G.personaPartes(g.P, t).map(q => ({ c: G.add(g.pos, G.rotY(q.c, g.rot)), B: q.B.map(v => G.rotY(v, g.rot)), s: q.s, col: q.col, part: q.part })); gente.push({ pos: g.pos, h: g.P.h, partes }); }
  const celda = 1.6, gx0 = -8, gz0 = -80, nx = 10, nz = 63, grid = Array.from({ length: nx * nz }, () => []);
  gente.forEach((p, idx) => { for (let i = Math.floor((p.pos[0] - .6 - gx0) / celda); i <= Math.floor((p.pos[0] + .6 - gx0) / celda); i++) for (let k = Math.floor((p.pos[2] - .6 - gz0) / celda); k <= Math.floor((p.pos[2] + .6 - gz0) / celda); k++) if (i >= 0 && i < nx && k >= 0 && k < nz) grid[k * nx + i].push(idx); });
  const R = G.rng(11), edif = { '-1': [], '1': [] }, cols = [[176, 92, 70], [214, 196, 170], [150, 150, 156], [196, 170, 130], [120, 130, 150], [230, 220, 200], [168, 120, 96]], tiendas = [[200, 60, 60], [40, 110, 70], [30, 70, 140], [220, 150, 40], [120, 50, 110]];
  for (const sd of [-1, 1]) { let z = -80; while (z < 20) { const w = 5 + R() * 5; edif[sd].push({ z0: z, z1: z + w, h: 12 + R() * 20, col: cols[R() * cols.length | 0], ladrillo: R() < .35, tienda: tiendas[R() * 5 | 0], balc: R() < .3, sem: R() * 100 }); z += w; } }
  CACHE = { t, gente, grid, celda, gx0, gz0, nx, nz, edif }; return CACHE;
}
// ---------- piezas ----------
function dPersona(p, x, y, z, exacto) {
  const dx = x - p.pos[0], dz = z - p.pos[2], yy = clampN(y - p.pos[1], .25, 1.6), db = Math.hypot(dx, y - p.pos[1] - yy, dz) - .42; if (db > (exacto ? .6 : .12)) return db;
  let d = 1e9; for (const q of p.partes) { const l = G.invB(q.B, [x - q.c[0], y - q.c[1], z - q.c[2]]); d = smin(d, M.sdEll(l[0], l[1], l[2], q.s[0], q.s[1], q.s[2]), .035); } return d;
}
function clampN(v, a, b) { return v < a ? a : v > b ? b : v; }
function gente(x, y, z, sinLimite) {
  const D = datos(); if (y > 2.3) return [y - 2.2, -1];
  const i = Math.floor((x - D.gx0) / D.celda), k = Math.floor((z - D.gz0) / D.celda); if (i < 0 || i >= D.nx || k < 0 || k >= D.nz) return [1e9, -1];
  const bx = Math.min(x - (D.gx0 + i * D.celda), D.gx0 + (i + 1) * D.celda - x), bz = Math.min(z - (D.gz0 + k * D.celda), D.gz0 + (k + 1) * D.celda - z);
  let d = sinLimite ? 1e9 : Math.min(bx, bz) + .02, who = -1; for (const idx of D.grid[k * D.nx + i]) { const dd = dPersona(D.gente[idx], x, y, z, sinLimite); if (dd < d) { d = dd; who = idx; } } return [d, who];
}
function edificio(b, sd, x, y, z) {   // fachada en |x| = A, hacia dentro
  const n = sd * x - A, u = z - b.z0, w = b.z1 - b.z0; let d = sdBox(n - 4, y - b.h / 2, z - (b.z0 + b.z1) / 2, 4, b.h / 2, w / 2);
  d = Math.min(d, sdBox(n + .1, y - b.h - .17, z - (b.z0 + b.z1) / 2, .2, .17, w / 2 + .05));   // cornisa
  if (Math.abs(n) < .6) {
    if (y > 4 && y < b.h - 1) { const cz = fmod(u - .3, 2.0) - 1.0, fy = fmod(y - 4.2, 3.1); if (fy < 2.2) d = Math.max(d, -sdBox(n - .1, fy - .95, cz, .12, .93, .55)); }
    if (y < 3.0 && u > .5 && u < w - .5) d = Math.max(d, -sdBox(n - .15, y - 1.6, z - (b.z0 + b.z1) / 2, .17, 1.25, w / 2 - .5));
    const an = .37, ny = (n + .65) * Math.cos(an) + (y - 2.85) * Math.sin(an), yy = -(n + .65) * Math.sin(an) + (y - 2.85) * Math.cos(an);
    if (u > .4 && u < w - .4) d = Math.min(d, sdBox(ny, yy, z - (b.z0 + b.z1) / 2, .7, .02, w / 2 - .4));
    if (b.balc && y > 4 && y < b.h - 1) { const cz = fmod(u - .3, 2.0) - 1.0, fy = fmod(y - 4.2, 3.1); if (Math.floor((y - 4.2) / 3.1) % 2 === 0) d = Math.min(d, sdBox(n + .35, fy, cz, .35, .06, .75), sdBox(n + .68, fy - .45, cz, .02, .45, .75)); }
  }
  return d;
}
function edificios(x, y, z) { const D = datos(), sd = x > 0 ? 1 : -1; if (sd * x < A - 1.5) return [(A - 1.5) - sd * x + .05, null]; const L = D.edif[sd]; let best = 1e9, bb = null;
  for (let i = 0; i < L.length; i++) { const b = L[i]; if (z < b.z0 - 3 || z > b.z1 + 3) continue; const d = edificio(b, sd, x, y, z); if (d < best) { best = d; bb = b; } } return [best, bb]; }
const ZL = z => clampN(Math.round((z + 60) / 9), 0, 8) * 9 - 60;
function farolas(x, y, z) { const sd = x > 0 ? 1 : -1, zl = ZL(z), px = sd * (C + .5); let d = M.sdCap(x, y, z, px, 0, zl, px, 5.2, zl, .07); d = Math.min(d, M.sdCap(x, y, z, px, 5.2, zl, px - sd * 1.1, 5.4, zl, .045), sdBox(x - (px - sd * 1.1), y - 5.27, z - zl, .25, .09, .15));
  const zs = PZ + sd * 2.2, sx = sd * (C + .45); d = Math.min(d, M.sdCap(x, y, z, sx, 0, zs, sx, 3.4, zs, .07), sdBox(x - sx, y - 2.85, z - zs, .16, .45, .14)); return d; }
function arboles(x, y, z) { const sd = x > 0 ? 1 : -1, zt = clampN(Math.round((z + 55.5) / 9), 0, 7) * 9 - 55.5; if (Math.abs(zt - PZ) < 2.5) return 1e9; const tx = sd * (C + 1.6);
  const db = Math.hypot(x - tx, y - 3, z - zt) - 1.9; if (db > .5) return db; let d = M.sdCap(x, y, z, tx, 0, zt, tx + .1, 2.4, zt, .12);
  let f = 1e9; for (const [a, b, c, r] of [[0, 3.1, 0, .95], [.6, 3.6, .3, .7], [-.5, 3.4, -.4, .75], [.2, 4.1, -.2, .6], [-.3, 2.8, .6, .6]]) f = smin(f, Math.hypot(x - tx - a, y - b, z - zt - c) - r, .3);
  f = (f - .18 * G.vnoise3(x * 4, y * 4, z * 4) - .08 * G.vnoise3(x * 11, y * 11, z * 11)) * .7; return Math.min(d, f); }
const COCHES = [[-1.9, -12, [190, 30, 40]], [1.9, -22, [30, 60, 120]], [-1.9, -34, [230, 230, 225]], [1.9, -45, [240, 190, 40]]];
function coches(x, y, z) { let d = 1e9, c = null; for (const k of COCHES) { if (Math.abs(z - k[1]) > 4 || Math.abs(x - k[0]) > 3) { d = Math.min(d, Math.max(Math.abs(z - k[1]) - 2.5, Math.abs(x - k[0]) - 1.2)); continue; }
  let e = sdBox(x - k[0], y - .7, z - k[1], .88, .3, 2.05) - .08; e = smin(e, sdBox(x - k[0], y - 1.25, z - k[1] + .1, .78, .25, 1.05) - .08, .15); e = Math.min(e, Math.hypot(Math.hypot(Math.abs(x - k[0]) - .85 > 0 ? 0 : 0, 0), 0) + 1e9);
  for (const [a, b] of [[.85, 1.3], [-.85, 1.3], [.85, -1.3], [-.85, -1.3]]) e = Math.min(e, Math.max(Math.hypot(y - .36, z - k[1] - b) - .36, Math.abs(x - k[0] - a) - .12));
  if (e < d) { d = e; c = k; } } return [d, c]; }
function suelo(x, y, z) { const ax = Math.abs(x); return Math.min(y, sdBox(ax - 5.5, y - .08, 0, 1.5, .08, 1e3)); }
const E = {
  prepara(t) { T_DATOS = t; datos(t); return { t, eye: [0, 5.2, 16.5], target: [0, 1.8, -6], fov: 50, far: 140, pasos: 700 }; },
  map(sc, x, y, z, sl) { let d = suelo(x, y, z); d = Math.min(d, edificios(x, y, z)[0], farolas(x, y, z), arboles(x, y, z), coches(x, y, z)[0]); if (Math.abs(x) < A) d = Math.min(d, gente(x, y, z, sl)[0]); return d; },
  cielo(sc, dx, dy, dz) { const t = clampN(dy * 2, 0, 1); let c = [G.mix(.95, .32, t), G.mix(.9, .55, t), G.mix(.85, .92, t)];
    const cl = G.smooth(.5, .75, G.fbm3(dx * 3 / Math.max(dy, .05), dz * 3 / Math.max(dy, .05), 1, 5)); if (dy > 0) c = c.map((v, k) => G.mix(v, 1.05, cl * .7 * Math.min(1, dy * 5)));
    const s = Math.max(0, dx * SOL[0] + dy * SOL[1] + dz * SOL[2]); return c.map((v, k) => v + Math.pow(s, 300) * 6 + Math.pow(s, 8) * [.3, .2, .1][k]); },
  shade(sc, x, y, z, nx, ny, nz, dx, dy, dz, T, map) {
    const ds = suelo(x, y, z), [de, b] = edificios(x, y, z), dl = farolas(x, y, z), dt = arboles(x, y, z), [dc, car] = coches(x, y, z), [dg, who] = Math.abs(x) < A ? gente(x, y, z) : [1e9, -1];
    const m = Math.min(ds, de, dl, dt, dc, dg); let alb, spec = 0, refl = 0, emit = [0, 0, 0];
    const env = (rx, ry, rz) => E.cielo(sc, rx, Math.max(ry, .02), rz);
    if (m === dg && who >= 0) { const P = datos().gente[who]; let best = 1e9, q0 = null; for (const q of P.partes) { const l = G.invB(q.B, [x - q.c[0], y - q.c[1], z - q.c[2]]), dd = M.sdEll(l[0], l[1], l[2], q.s[0], q.s[1], q.s[2]); if (dd < best) { best = dd; q0 = q; } }
      alb = q0.col.map(v => v / 255); const tela = ['torso', 'pecho', 'abrigo', 'pierna', 'cadera', 'falda', 'brazo', 'mochila'].includes(q0.part);
      if (tela) alb = alb.map(v => v * (.88 + .18 * G.vnoise3(x * 60, y * 60, z * 60))); if (q0.part === 'pelo') alb = alb.map(v => v * (.8 + .3 * G.vnoise3(x * 90, y * 30, z * 90)));
      spec = q0.part === 'zapato' ? .3 : q0.part === 'cabeza' ? .12 : .05; }
    else if (m === dc && car) { alb = car[2].map(v => v / 255 * .6); spec = .7; refl = .1; if (y > 1.02 && y < 1.45) { alb = [.04, .05, .07]; refl = .22; spec = 1.2; } if (y < .72 && y > .1 && Math.hypot(y - .36, z - car[1] - (z > car[1] ? 1.3 : -1.3)) < .36) { alb = [.04, .04, .05]; refl = 0; spec = .1; } }
    else if (m === dt) { if (y > 2.2) { const v = .7 + .5 * G.vnoise3(x * 9, y * 9, z * 9); alb = [.16 * v, .32 * v, .12 * v]; } else alb = [.32, .24, .17]; }
    else if (m === dl) { alb = [.16, .17, .19]; spec = .4; if (y > 5.15 && y < 5.4 && Math.abs(x) < C + .3) emit = [1.6, 1.4, 1.0]; if (y > 2.4 && y < 3.3 && Math.abs(z - (PZ + (x > 0 ? 1 : -1) * 2.2)) < .2) { const k = (y - 2.4) / .3 | 0; if (k === 0) emit = [.2, 1.5, .5]; } }
    else if (m === de && b) { const sd = x > 0 ? 1 : -1, n = sd * x - A, u = z - b.z0, w = b.z1 - b.z0, cz = fmod(u - .3, 2.0) - 1.0, fy = fmod(y - 4.2, 3.1);
      alb = b.col.map(v => v / 255 * (.9 + .15 * G.vnoise3(x * 3, y * 3, z * 3)));
      if (b.ladrillo && n > -.01) { const fila = Math.floor(y / .09), off = fila % 2 ? .12 : 0, junta = fmod(y, .09) < .012 || fmod(z + off, .24) < .012; alb = junta ? [.75, .72, .66] : alb.map(v => v * (.85 + .25 * G.hash3(Math.floor((z + off) / .24), fila, 3))); }
      const enVentana = y > 4 && y < b.h - 1 && fy < 1.9 && Math.abs(cz) < .55, enMarco = y > 4 && y < b.h - 1 && fy < 2.0 && Math.abs(cz) < .63;
      if (enMarco && n > -.02 && n < .2) { alb = [.9, .89, .86]; if (enVentana && n > .15) { const lit = G.hash3(Math.floor(u / 2), Math.floor((y - 4.2) / 3.1), b.sem | 0) > .72; alb = [.05, .07, .09]; refl = .75; spec = 1.5; if (lit) emit = [1.0, .75, .42].map(v => v * (.6 + .4 * G.vnoise3(x * 3, y * 3, z * 3))); if (Math.abs(cz) < .03 || fy < .06) { alb = [.9, .89, .86]; refl = 0; } } }
      if (y < 3.0 && u > .5 && u < w - .5 && n > .05) { alb = [.06, .07, .08]; refl = .5; spec = 1.2; emit = G.vnoise3(z * .7, 1, b.sem) > .4 ? [.9, .75, .55] : [.5, .55, .6]; }
      if (y > 2.4 && y < 3.2 && n < -.05) { alb = Math.floor((z - b.z0) / .5) % 2 ? [.95, .93, .9] : b.tienda.map(v => v / 255); spec = .05; }
      if (y > b.h - .05 && n < .2) alb = alb.map(v => v * .85);
      if (b.balc && n < -.05 && y > 4) { alb = [.2, .2, .22]; spec = .5; } }
    else { const ax = Math.abs(x);
      if (ax < C) { const g = .85 + .2 * G.vnoise3(x * 4, 0, z * 4) + .1 * G.vnoise3(x * 30, 1, z * 30); alb = [.24 * g, .25 * g, .27 * g]; spec = .1;
        if (Math.abs(z - PZ) < 1.6 && fmod(x + C - .4, .8) < .45 && x > -C + .3 && x < C - .3) alb = [.86, .86, .84].map(v => v * (.85 + .15 * G.vnoise3(x * 20, 3, z * 20)));
        else if (Math.abs(x) < .08 && fmod(z, 6) < 1.6 && Math.abs(z - PZ) > 2.5) alb = [.82, .74, .38];
        if (G.vnoise3(x * 2, 5, z * .5) > .82) alb = alb.map(v => v * .8); }
      else { const tile = fmod(x * sgn(x), .69) < .02 || fmod(z, .69) < .02; const g = .9 + .12 * G.hash3(Math.floor(ax / .69), Math.floor(z / .69), 2); alb = tile ? [.48, .46, .43] : [.66 * g, .63 * g, .58 * g]; if (ax < C + .25) alb = [.72, .71, .68]; } }
    // iluminación
    const dl2 = Math.max(0, nx * SOL[0] + ny * SOL[1] + nz * SOL[2]);
    const mapS = (a, b2, c2) => E.map(sc, a, b2, c2, true); const sh = dl2 > 0 ? M.sombra(mapS, x + nx * .02, y + ny * .02, z + nz * .02, SOL[0], SOL[1], SOL[2], 10, 40, 56) : 0;
    const ao = M.oclusion(mapS, x, y, z, nx, ny, nz), sky = .5 + .5 * ny;
    const rdot = dx * nx + dy * ny + dz * nz, rx = dx - 2 * rdot * nx, ry = dy - 2 * rdot * ny, rz = dz - 2 * rdot * nz, fr = Math.pow(1 - Math.max(0, -rdot), 4);
    const hv = G.norm([SOL[0] - dx, SOL[1] - dy, SOL[2] - dz]), sp = Math.pow(Math.max(0, hv[0] * nx + hv[1] * ny + hv[2] * nz), 60) * spec * sh;
    const en = env(rx, ry, rz), sunC = [1.25, 1.14, .98], skyC = [.27, .31, .42], bounce = [.18, .16, .13];
    let c = [0, 1, 2].map(k => alb[k] * (sunC[k] * dl2 * sh + (skyC[k] * sky + bounce[k] * (1 - sky)) * ao) + sp * sunC[k] + en[k] * (refl + (refl ? fr * .5 : fr * .04)) * ao + emit[k]);
    const fog = 1 - Math.exp(-Math.max(0, T - 25) * .004), fc = E.cielo(sc, dx, .05, dz).map(v => v * .9);
    return c.map((v, k) => G.mix(v, fc[k], fog));
  },
};
function sgn(v) { return v < 0 ? -1 : 1; }
module.exports = E;
