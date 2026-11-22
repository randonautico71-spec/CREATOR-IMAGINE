'use strict';
// Estilo REALISTA (SDF + texturas procedurales): ballena jorobada y tiburón blanco (o un delfín mular con MAR=delfin) sobre el fondo de arena.
// Luz que entra por la superficie con cáusticas, absorción del agua por color (el rojo se pierde antes), rayos volumétricos y sombras suaves.
const A = require('./animales'), AH = require('./animales_hd'), M = require('../../sdf/motor');
const { n3, sdEll } = A, clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x, mix = M.mix;
const SUP = 24, L = (() => { const v = [.25, 1, .35], l = Math.hypot(...v); return v.map(x => x / l); })();
const EXT = [.11, .042, .03], AGUA = [.03, .2, .27];            // extinción por metro (r, g, b) y color del agua dispersada
const fbm = (x, y, z, o = 4) => { let s = 0, a = .5, f = 1, n = 0; for (let i = 0; i < o; i++) { s += a * n3(x * f, y * f, z * f); n += a; a *= .5; f *= 2.03; } return s / n; };
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const COLOCA = { tiburon: { pos: [-.2, 2.8, -.8], dir: [1, 0, .45], pitch: .05, v: 1.1, R: 3.1 }, ballena: { pos: [1.4, 10.2, -14], dir: [-.7, 0, 1], pitch: -.1, v: 1.4, R: 8.6 } };
const DELFIN = process.env.MAR === 'delfin';   // tema delfín: un delfín mular en vez de la ballena y el tiburón
if (DELFIN) COLOCA.delfin = { pos: [.1, 2.9, 2.0], dir: [1, 0, .35], pitch: .16, v: 1.4, R: 1.8 };
for (const c of Object.values(COLOCA)) { const l = Math.hypot(...c.dir); c.d = c.dir.map(v => v / l); c.a = Math.atan2(-c.d[2], c.d[0]); }
// mundo → local del animal (inversa de colocaP del navegador: p = pos + rotY(rotZ(local, pitch), a))
function aLocal(c, t, x, y, z) { const px = x - c.pos[0] - c.d[0] * c.v * t, py = y - c.pos[1], pz = z - c.pos[2] - c.d[2] * c.v * t, ca = Math.cos(-c.a), sa = Math.sin(-c.a);
  const qx = px * ca + pz * sa, qz = -px * sa + pz * ca, cp = Math.cos(-c.pitch), sp = Math.sin(-c.pitch); return [qx * cp - py * sp, qx * sp + py * cp, qz]; }
const alturaFondo = (x, z) => 1.3 * (fbm(x * .045 + 3.1, 1.7, z * .045) - .5) + .045 * Math.sin(x * 4.6 + 1.6 * Math.sin(z * .55) + .4 * Math.sin(z * 2.1)) + (z < -18 ? (z + 18) * .05 : 0);
function causticas(x, z, t) { let v = 0; for (const [a, b, c] of [[1.3, .7, .9], [-.8, 1.4, 1.1], [.5, -1.6, .7]]) v += Math.sin((x * a + z * b) * 1.5 + t * c + 2 * Math.sin((x * b - z * a) * .8 + t * .6)); return Math.pow(Math.max(0, 1 - Math.abs(v) * .42), 5); }
const ROCAS = [[-4.2, -1, 1.6, 1], [-6.5, -6, 2.6, 2], [5.2, -3, 1.9, 3], [7.5, -11, 3.2, 4], [-9, -15, 3.6, 5], [2.4, 4.6, .7, 6], [-2.6, 5.5, .55, 7], [1, -9, 1.2, 8], [-12, -28, 5, 9], [12, -24, 4.5, 10], [4, -30, 3.4, 11], [-3.6, 1.6, .5, 12], [3.6, .8, .45, 13]].map(([x, z, r, s]) => ({ x, z, r, s, y: alturaFondo(x, z) - r * .18 }));
function sdRoca(R, x, y, z, fino) { const dx = x - R.x, dy = y - R.y, dz = z - R.z, d0 = sdEll(dx, dy, dz, R.r * 1.15, R.r * .62, R.r); if (d0 > R.r * .5) return d0 - R.r * .3;
  return d0 - R.r * .3 * (fbm(dx / R.r * 1.7 + R.s * 3, dy / R.r * 1.7, dz / R.r * 1.7, fino ? 5 : 3) - .5) * 2; }
const ESTRELLAS = [[-1.2, 3.2, .2, .4, [.85, .3, .12]], [1.6, 2.4, .17, 1.3, [.8, .18, .22]], [-2.6, 1.0, .19, 2.2, [.9, .5, .15]], [.4, .9, .15, .7, [.85, .3, .12]], [2.9, 3.6, .16, 2.9, [.9, .5, .15]]].map(([x, z, r, a, col]) => ({ x, z, r, a, col, y: alturaFondo(x, z) }));
const ERIZOS = [[-3.1, 2.4], [-1.4, 3.6], [3.0, 1.4], [2.2, 4.2]].map(([x, z]) => ({ x, z, y: alturaFondo(x, z) + .07 }));
function sdEstrella(E, x, y, z) { const px = x - E.x, pz = z - E.z, py = y - E.y, r = Math.hypot(px, pz); if (r > E.r * 1.3 || py > .12) return Math.max(Math.hypot(Math.max(r - E.r, 0), py) - .02, .02);
  const th = Math.atan2(pz, px) - E.a, R = E.r * (.32 + .68 * Math.pow(Math.abs(Math.cos(th * 2.5)), 3)), alto = .035 * (1 - r / E.r * .7); return Math.max(r - R, Math.abs(py - alto * .5) - alto * .5) * .6; }
function sdErizo(U, x, y, z) { const px = x - U.x, py = y - U.y, pz = z - U.z, r = Math.hypot(px, py * 1.4, pz); if (r > .3) return r - .25; const sp = Math.pow(Math.abs(Math.sin(px * 90) * Math.sin(py * 90) * Math.sin(pz * 90)), 2); return (r - .07 - .09 * sp) * .35; }
let S = null;
function prepara(t) {   // kelp y peces del instante t
  const R = rng(21), kel = [];
  for (let k = 0; k < 46; k++) { const lado = k % 2 ? 1 : -1, z = 2 - R() * 34, x = lado * (5 + R() * 9 + Math.max(0, -z) * .25), alto = 6 + R() * 10; kel.push([x, z, alto, 100 + k]); }
  for (let k = 0; k < 10; k++) kel.push([(R() - .5) * 14, -24 - R() * 14, 8 + R() * 10, 300 + k]);
  const kelps = kel.filter(([x, z]) => z > -40 && Math.abs(x) < 4 + .7 * (12 - z)).map(([x0, z0, alto, seed]) => { const Rk = rng(seed), n = Math.ceil(alto / .4), y0 = alturaFondo(x0, z0), ph = Rk() * 6, P = [], hojas = [];
    for (let i = 0; i <= n; i++) { const f = i / n; P.push([x0 + Math.sin(f * 3 + ph + t * .5) * .6 * f + Math.sin(t * .9 + ph + f * 6) * .12 * f, y0 + f * alto, z0 + Math.cos(f * 2 + ph) * .4 * f]); }
    for (let i = 2; i < n; i++) { const sd = i % 2 ? 1 : -1; let d = [sd * (.7 + Rk() * .3), .9, (Rk() - .5) * .8]; const dl = Math.hypot(...d); d = d.map(v => v / dl); const Lh = .7 + Rk() * .5; let s = [d[1], -d[0], 0]; const sl = Math.hypot(...s); s = s.map(v => v / sl); const w = [d[1] * s[2] - d[2] * s[1], d[2] * s[0] - d[0] * s[2], d[0] * s[1] - d[1] * s[0]];
      Rk(); hojas.push({ c: [P[i][0] + d[0] * Lh * .55, P[i][1] + d[1] * Lh * .55 - .05, P[i][2] + d[2] * Lh * .55], d, s, w, L: Lh * .5, tono: .85 + Rk() * .3, fl: Rk() < .55 }); }
    let minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9; for (const p of P) { minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); minz = Math.min(minz, p[2]); maxz = Math.max(maxz, p[2]); }
    return { P, hojas, y0, alto, cx: (minx + maxx) / 2, cz: (minz + maxz) / 2, rad: Math.max(maxx - minx, maxz - minz) / 2 + 1.25 }; });
  const Rp = rng(5), peces = [], C = [-5.5, 7.5, -9];
  for (let i = 0; i < 150; i++) { const a = Rp() * 6.283 + t * .35, rad = 1 + Math.pow(Rp(), .7) * 2.6, h = (Rp() - .5) * 2.2, p = [C[0] + Math.cos(a) * rad * 1.5, C[1] + h + .4 * Math.sin(a * 2 + i), C[2] + Math.sin(a) * rad]; let d = [-Math.sin(a) * 1.5, .08 * Math.cos(a * 2), Math.cos(a)]; const l = Math.hypot(...d); d = d.map(v => v / l); const s = [d[2], 0, -d[0]], sl = Math.hypot(...s);
    peces.push({ p, d, s: s.map(v => v / sl), L: .12 * (.8 + .4 * Rp()) }); }
  let kl = kelps, pc = peces; const toma = process.env.TOMA;
  if (toma === 'ballena' || toma === 'tiburon') { const sc = E.prepara.call({ soloCam: true }, t, true), e = sc.eye, g = sc.target, v = [g[0] - e[0], g[1] - e[1], g[2] - e[2]], L2 = v[0] ** 2 + v[1] ** 2 + v[2] ** 2;
    const lejos = (x, y, z, r) => { const h = clamp(((x - e[0]) * v[0] + (y - e[1]) * v[1] + (z - e[2]) * v[2]) / L2, 0, 1.3); return Math.hypot(x - e[0] - v[0] * h, y - e[1] - v[1] * h, z - e[2] - v[2] * h) > r; };
    kl = kelps.filter(K => lejos(K.cx, Math.max(K.y0, Math.min(K.y0 + K.alto, e[1])), K.cz, K.rad + 3)); if (toma === 'ballena') pc = []; }
  S = { t, kelps: kl, peces: pc };
}
function sdKelp(K, x, y, z) { let d = 1e9; const P = K.P, n = P.length - 1, i0 = Math.max(0, Math.min(n - 1, Math.floor((y - K.y0) / K.alto * n)));
  for (let i = Math.max(0, i0 - 2); i <= Math.min(n - 1, i0 + 2); i++) { const a = P[i], b = P[i + 1], bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2], h = clamp(((x - a[0]) * bx + (y - a[1]) * by + (z - a[2]) * bz) / (bx * bx + by * by + bz * bz), 0, 1); d = Math.min(d, Math.hypot(x - a[0] - bx * h, y - a[1] - by * h, z - a[2] - bz * h) - .035); }
  for (let j = Math.max(0, i0 - 4); j < Math.min(K.hojas.length, i0 + 2); j++) { const H = K.hojas[j], px = x - H.c[0], py = y - H.c[1], pz = z - H.c[2], u = px * H.d[0] + py * H.d[1] + pz * H.d[2], v = px * H.s[0] + py * H.s[1] + pz * H.s[2], w = px * H.w[0] + py * H.w[1] + pz * H.w[2] - .04 * Math.sin(u * 6);
    d = Math.min(d, sdEll(u, v - .03 * Math.sin(u * 9), w, H.L * 1.25, .1 * (1 - .3 * u / H.L), .012)); if (H.fl) d = Math.min(d, Math.hypot(u + H.L, v, w) - .045); }
  return d; }
function sdPeces(x, y, z) { let d = 1e9; for (const f of S.peces) { const px = x - f.p[0], py = y - f.p[1], pz = z - f.p[2]; if (px * px + py * py + pz * pz > .09) { d = Math.min(d, Math.sqrt(px * px + py * py + pz * pz) - .2); continue; }
  const u = px * f.d[0] + py * f.d[1] + pz * f.d[2], v = px * f.s[0] + pz * f.s[2], w = py - u * f.d[1]; d = Math.min(d, sdEll(u, w, v, f.L, f.L * .3, f.L * .13), sdEll(u + f.L * 1.05, w, v, f.L * .22, f.L * .32, .006)); } return d; }
function animalD(nombre, x, y, z, lejos) { const c = COLOCA[nombre], t = S.t, cx = c.pos[0] + c.d[0] * c.v * t, cz = c.pos[2] + c.d[2] * c.v * t, db = Math.hypot(x - cx, y - c.pos[1], z - cz) - c.R; if (db > (lejos || .4)) return db;
  const [lx, ly, lz] = aLocal(c, t, x, y, z); return (nombre === 'delfin' ? A.delfin(lx, ly, lz) : nombre === 'ballena' ? AH.ballenaHD(lx, ly, lz) : AH.tiburonHD(lx, ly, lz)) * .75; }
function escena(x, y, z, lejos) { let d = y - alturaFondo(x, z), tipo = 0; const cand = (dd, k) => { if (dd < d) { d = dd; tipo = k; } };
  for (const R of ROCAS) { const db = Math.hypot((x - R.x) / 1.15, (y - R.y) / .62, z - R.z) - R.r * 1.3; cand(db > .5 ? db * .6 : sdRoca(R, x, y, z, !lejos) * .8, 1); }
  for (const K of S.kelps) { if (y > K.y0 + K.alto + 1.2) continue; const db = Math.hypot(x - K.cx, z - K.cz) - K.rad; cand(db > .3 ? Math.max(db, y - K.y0 - K.alto - 1.2) : sdKelp(K, x, y, z) * .9, 2); }
  if (z > -1 && y < .6) { for (const Es of ESTRELLAS) cand(sdEstrella(Es, x, y, z), 6); for (const U of ERIZOS) cand(sdErizo(U, x, y, z), 7); }
  { const db = Math.hypot(x + 5.5, y - 7.5, z + 9) - 5.2; cand(db > .3 ? db : sdPeces(x, y, z), 3); }
  if (DELFIN) cand(animalD('delfin', x, y, z, lejos), 8); else { cand(animalD('ballena', x, y, z, lejos), 4); cand(animalD('tiburon', x, y, z, lejos), 5); }
  return [d, tipo]; }
function colAgua(dx, dy, dz) { const up = clamp(dy * .5 + .5); return [mix(.005, .05, up ** 2), mix(.04, .3, up ** 1.6), mix(.07, .4, up ** 1.4)]; }
function rayosVol(sc, dx, dy, dz, T) {   // dispersión hacia la cámara con la luz filtrada por las cáusticas de la superficie
  const ex = sc.eye[0], ey = sc.eye[1], ez = sc.eye[2], N = 16, Tm = Math.min(T, 40); let acc = 0;
  for (let i = 0; i < N; i++) { const s = (i + .5) / N * Tm, x = ex + dx * s, y = ey + dy * s, z = ez + dz * s, h = Math.max(0, SUP - y), sx = x + L[0] / L[1] * h, sz = z + L[2] / L[1] * h;
    acc += Math.pow(causticas(sx * .16, sz * .16, sc.t * .5), 1.5) * Math.exp(-s * .045) * Math.exp(-h * .03); }
  return acc / N * Tm * .022; }
const E = {
  prepara(t, soloCam) { if (!soloCam && (!S || S.t !== t)) prepara(t); const toma = process.env.TOMA;
    if (toma === 'ballena' || toma === 'tiburon') { const c = COLOCA[toma], W = p => { const cp = Math.cos(c.pitch), sp = Math.sin(c.pitch), x1 = p[0] * cp - p[1] * sp, y1 = p[0] * sp + p[1] * cp, ca = Math.cos(c.a), sa = Math.sin(c.a); return [c.pos[0] + c.d[0] * c.v * t + x1 * ca + p[2] * sa, c.pos[1] + y1, c.pos[2] + c.d[2] * c.v * t - x1 * sa + p[2] * ca]; };
      return toma === 'ballena' ? { t, eye: W([12.5, -2.4, 3.2]), target: W([3.8, -1.2, 0]), fov: 50, far: 75, pasos: 320 } : { t, eye: W([3.6, -.55, 2.3]), target: W([.9, -.12, 0]), fov: 46, far: 75, pasos: 320 }; }
    return { t, eye: [0, 1.5, 9.5], target: [.4, 5.6, -6], fov: 62, far: 75, pasos: 300 }; },
  map(sc, x, y, z, lejos) { return escena(x, y, z, lejos)[0]; },
  cielo(sc, dx, dy, dz) { let c = colAgua(dx, dy, dz);
    if (dy > .02) { const T = (SUP - sc.eye[1]) / dy, x = sc.eye[0] + dx * T, z = sc.eye[2] + dz * T, ventana = clamp((dy - .5) / .3) ** 1.5, ola = .5 + .5 * Math.sin(x * .8 + 2 * Math.sin(z * .45 + sc.t * .7)) * Math.sin(z * .7 - sc.t * .5), pat = causticas(x * .3, z * .3, sc.t);
      const luz = ventana * (.35 + .25 * ola + .5 * Math.pow(pat, .7)) * Math.exp(-T * .015); c = [c[0] + .4 * luz, c[1] + .85 * luz, c[2] + .9 * luz]; }
    const v = rayosVol(sc, dx, dy, dz, 60); return [c[0] + v * .35, c[1] + v * .9, c[2] + v * 1.0]; },
  shade(sc, x, y, z, nx, ny, nz, dx, dy, dz, T) {
    const [, tipo] = escena(x, y, z); let alb = [.7, .65, .5], spec = .05, rough = 20, n = [nx, ny, nz], relleno = 1;
    const bump = (f, k) => { const e = .004, f0 = f(x, y, z), g = [(f(x + e, y, z) - f0) / e, (f(x, y + e, z) - f0) / e, (f(x, y, z + e) - f0) / e]; let m = [n[0] - k * g[0], n[1] - k * g[1], n[2] - k * g[2]]; const l = Math.hypot(...m); n = m.map(v => v / l); };
    if (tipo === 0) { const nn = fbm(x * .3, 0, z * .3, 3), g = n3(x * 40, 0, z * 40); alb = [.78, .7, .52].map((v, k) => v * (.8 + .25 * g) * (1 - .25 * clamp(nn * 1.6 - .3)));
      if (fbm(x * .12 + 9, 2, z * .12, 3) > .62) alb = alb.map((v, k) => mix(v, [.42, .48, .3][k], .5)); bump((a, b, c) => n3(a * 30, 0, c * 30) * .6 + n3(a * 90, 0, c * 90) * .25, .004); }
    else if (tipo === 1) { const R = ROCAS.reduce((m, r) => Math.hypot(x - r.x, z - r.z) - r.r < Math.hypot(x - m.x, z - m.z) - m.r ? r : m), up = (y - R.y) / R.r, nn = fbm(x * 1.5 + R.s, y * 1.5, z * 1.5, 4);
      alb = [.34, .32, .29].map(v => v * (.7 + .6 * nn)); if (ny > .35 && nn > .45) alb = [.24, .4, .2].map(v => v * (.8 + .4 * n3(x * 20, y * 20, z * 20))); else if (ny > .1 && nn < .33) alb = [.66, .36, .42];
      bump((a, b, c) => fbm(a * 6, b * 6, c * 6, 3), .03); spec = .15; rough = 30; }
    else if (tipo === 2) { alb = [.46, .38, .12].map(v => v * (.7 + .5 * n3(x * 3, y * 3, z * 3)) * (.85 + .3 * n3(x * 40, y * 8, z * 40))); spec = .35; rough = 25; }
    else if (tipo === 6) { const Es = ESTRELLAS.reduce((m, e) => Math.hypot(x - e.x, z - e.z) < Math.hypot(x - m.x, z - m.z) ? e : m), g = n3(x * 160, y * 160, z * 160); alb = Es.col.map(v => v * (.75 + .45 * g)); bump((a, b, c) => Math.pow(n3(a * 140, b * 140, c * 140), 3), .006); spec = .3; rough = 30; }
    else if (tipo === 7) { alb = [.16, .05, .2]; spec = .8; rough = 50; }
    else if (tipo === 3) { alb = ny > 0 ? [.28, .38, .46] : [.75, .8, .82]; spec = 1.6; rough = 60; }
    else if (tipo === 8) { const c = COLOCA.delfin, [lx, ly, lz] = aLocal(c, S.t, x, y, z), r = A.delfin(lx, ly, lz, 0, true); alb = A.colorDelfin(lx, ly, lz, r[1]).map(v => clamp(v, 0, 1)); spec = r[1] === 'ojo' ? 3 : .7; rough = r[1] === 'ojo' ? 300 : 55; bump((a, b, cc) => n3(a * 60, b * 60, cc * 60), .0015); }
    else { const nom = tipo === 4 ? 'ballena' : 'tiburon', c = COLOCA[nom], [lx, ly, lz] = aLocal(c, S.t, x, y, z);
      if (tipo === 4) { const r = AH.ballenaHD(lx, ly, lz, true); alb = AH.colorBallenaHD(lx, ly, lz, r[1], r[2], r[3], r[4]).map(v => clamp(v, 0, 1)); spec = r[1] === 'ojo' ? 3 : r[1] === 'lengua' || r[1] === 'boca' ? .7 : .45; rough = r[1] === 'ojo' ? 300 : 45; if (r[1] !== 'piel' && r[1] !== 'ojo') relleno = 1.4; if (r[1] === 'piel') bump((a, b, cc) => n3(a * 25, b * 25, cc * 25), .006); }
      else { const r = AH.tiburonHD(lx, ly, lz, true); alb = AH.colorTiburonHD(lx, ly, r[2], r[1]).map(v => clamp(v, 0, 1)); spec = r[1] === 'ojo' ? 3 : r[1] === 'diente' ? 1.2 : r[1] === 'encia' ? .8 : .5; rough = r[1] === 'ojo' ? 300 : 60; bump((a, b, cc) => n3(a * 120, b * 120, cc * 120), .0012); } }
    const [Nx, Ny, Nz] = n, ndl = Nx * L[0] + Ny * L[1] + Nz * L[2], prof = Math.max(0, SUP - y);
    const mapS = (a, b, c) => escena(a, b, c, .8)[0], sh = ndl > -.1 ? M.sombra(mapS, x + Nx * .01, y + Ny * .01, z + Nz * .01, L[0], L[1], L[2], 10, 18, 40) : 0, ao = M.oclusion(mapS, x, y, z, Nx, Ny, Nz);
    const h = prof, cau = .45 + 1.9 * causticas((x + L[0] / L[1] * h) * .95, (z + L[2] / L[1] * h) * .95, sc.t), sol = [0, 1, 2].map(k => [1.05, 1.0, .95][k] * Math.exp(-EXT[k] * prof * .4) * cau);
    const amb = [.07, .24, .31].map(v => v * (.55 + .45 * Ny)), hv = (() => { const v = [L[0] - dx, L[1] - dy, L[2] - dz], l = Math.hypot(...v); return v.map(q => q / l); })(), sp = Math.pow(Math.max(0, Nx * hv[0] + Ny * hv[1] + Nz * hv[2]), rough) * spec;
    let c = [0, 1, 2].map(k => alb[k] * (sol[k] * Math.max(0, ndl) * sh + amb[k] * Math.max(ao, relleno > 1 ? .7 : 0) * relleno) + sp * sh * sol[k] * .6);
    // absorción y dispersión a lo largo del rayo de la cámara
    const ag = colAgua(dx, dy, dz); c = c.map((v, k) => v * Math.exp(-EXT[k] * T * .38) + ag[k] * (1 - Math.exp(-.03 * T)));
    const vv = rayosVol(sc, dx, dy, dz, T); return [c[0] + vv * .35, c[1] + vv * .9, c[2] + vv]; },
};
module.exports = E;
