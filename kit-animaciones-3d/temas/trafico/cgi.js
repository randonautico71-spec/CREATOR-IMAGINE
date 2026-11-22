'use strict';
// TRÁFICO · CGI REALISTA (SDF / ray marching en Node). Misma simulación de tráfico que temas/trafico/escena.js.
// Pintura con capa de barniz que refleja el entorno, cristales oscuros reflectantes, asfalto (mojado de noche) que refleja
// las luces, farolas como luces puntuales, faros y pilotos emisivos con halo, edificios con ventanas encendidas y oclusión ambiental.
// node bin/fotograma_sdf.cjs temas/trafico/cgi.js salida.png <t>      (TRAF_DIA=1 para de día · TOMA=plan (por defecto, los 6 planos) | seguimiento | cabeza | aerea)
// Desde el kit: node bin/tema.cjs trafico realista salida.mp4 --exacto [--dia]   (muy lento: 3–8 min por fotograma a 720×1280 en 4 CPU)
const vm = require('vm'), fs = require('fs'), path = require('path'), M = require('../../sdf/motor');
const KIT = path.resolve(__dirname, '../..');
const DIA = !!process.env.TRAF_DIA, TOMA = process.env.TOMA || 'plan';   // plan = los 6 planos del tema (como en low-poly)
// cargar la simulación del tema (código de navegador) en un contexto aislado
const ctxS = { console, Math, Float32Array }; ctxS.globalThis = ctxS; vm.createContext(ctxS);
vm.runInContext('var document={createElement:()=>({getContext:()=>({})})};' + fs.readFileSync(path.join(KIT, 'estilos/motor3d.js'), 'utf8') + ';var ESC={};' + fs.readFileSync(path.join(KIT, 'temas/trafico/escena.js'), 'utf8'), ctxS);
const TRAF = ctxS.TRAF;
const cl = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x, len = Math.hypot, mix = (a, b, t) => a + (b - a) * t;
const h1 = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
const sdBox = (x, y, z, bx, by, bz) => { const qx = Math.abs(x) - bx, qy = Math.abs(y) - by, qz = Math.abs(z) - bz; return len(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0); };
const sdRB = (x, y, z, bx, by, bz, r) => sdBox(x, y, z, bx - r, by - r, bz - r) - r;
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * .25; };
const PINT = [[.82, .84, .87], [.62, .06, .05], [.85, .55, .08], [.08, .22, .55], [.28, .2, .5], [.05, .38, .36], [.5, .52, .56], [.03, .035, .04]];
let S = null;
function prepara(t) {
  const coches = TRAF.coches.map(c => { const p = TRAF.pos(c, t); return { x: p[0], z: p[2], d: c.sent, col: c.heroe ? [.92, .93, .95] : PINT[c.col], heroe: !!c.heroe, frena: c.sent === 1 && (c.heroe ? TRAF.velHeroe(t) : 30) < 8 }; });
  const h = TRAF.heroe(t); let eye, target, fov = 46;
  if (TOMA === 'plan') { const P = TRAF.planos; let a = 0, i = 0; while (i < P.length - 1 && t >= a + P[i].dur) { a += P[i].dur; i++; }
    const r = P[i].cam(h, Math.min(1, (t - a) / P[i].dur)); eye = r[0]; target = r[1]; fov = r[2]; if (r[3]) eye = [eye[0], eye[1], eye[2] + eye[1] * .15]; }   // los planos cenitales se inclinan un poco
  else if (TOMA === 'cabeza') { eye = [6, 4.2, -362]; target = [4.5, 1.2, -300]; fov = 40; }
  else if (TOMA === 'aerea') { eye = [h[0] - 22, 48, h[2] + 46]; target = [h[0], 0, h[2] - 40]; fov = 48; }
  else { eye = [h[0] - .6, 3.1, h[2] + 10.5]; target = [h[0] - .3, 1.1, h[2] - 16]; fov = 44; }
  const cerca = coches.filter(c => Math.abs(c.z - eye[2]) < 220 + eye[1] * 2);
  const luces = [];
  for (let z = 485; z > -640; z -= 30) for (const s of [-1, 1]) if (Math.abs(z - eye[2]) < 260) luces.push({ p: [s * 10.6, 8.25, z], col: DIA ? [0, 0, 0] : [1.0, .78, .5], I: DIA ? 0 : 1, r: .25, tipo: 'farola' });
  if (!DIA || true) for (const c of cerca) for (const [u, col, I] of [[2.28, [1, .95, .85], DIA ? .35 : .9], [-2.24, [1, .08, .06], c.frena ? 1.1 : .55]]) for (const w of [-.62, .62]) luces.push({ p: [c.x + w, .6, c.z - c.d * u], col, I, r: .1, tipo: 'coche', dir: [0, 0, -c.d * Math.sign(u)] });
  S = { t, coches: cerca, luces, farolas: luces.filter(l => l.tipo === 'farola') };
  return { t, eye, target, fov, far: 700, pasos: 300 };
}
// ------------------------------------------------ geometría
function coche(c, x, y, z) {   // devuelve [d, parte]
  const lx = x - c.x, lz = z - c.z, u = -lz * c.d, w = lx;     // u hacia delante
  let d = sdRB(u, y - .62, w, 2.25, .3, .93, .22), p = 'pintura';
  const cab = sdRB(u + .25, y - 1.1, w, 1.25, .3, .8, .28); d = smin(d, cab, .18);
  d = Math.max(d, -(y - .08));
  for (const uu of [1.38, -1.38]) for (const ww of [-.86, .86]) { const r = len(u - uu, y - .34) - .33, ancho = Math.abs(w - ww) - .14, rueda = Math.min(Math.max(r, ancho), 0) + len(Math.max(r, 0), Math.max(ancho, 0)); if (rueda < d) { d = rueda; p = 'rueda'; } }
  if (p === 'pintura' && y > .9 && cab < .05) { const ny = y - 1.1; p = ny > .2 && Math.abs(w) < .62 && Math.abs(u + .25) < .95 ? 'pintura' : 'cristal'; }
  if (p === 'pintura') { if (u > 2.05 && y > .48 && y < .72 && Math.abs(w) > .35 && Math.abs(w) < .86) p = 'faro'; else if (u < -2.05 && y > .53 && y < .67 && Math.abs(w) > .45 && Math.abs(w) < .86) p = 'piloto'; }
  return [d, p];
}
function edificios(x, y, z) {
  const ax = Math.abs(x); if (ax < 14) return [ax - 14 + 1e-3 + 50, 0];
  const fila = Math.max(0, Math.min(3, Math.floor((ax - 15) / 18))); let d = 1e9, id = 0;
  for (let df = -1; df <= 1; df++) { const f = fila + df; if (f < 0 || f > 3) continue; const cx = 15 + f * 18 + 8;
    const ci = Math.floor(z / 17); for (let dc = -1; dc <= 1; dc++) { const i = ci + dc, n = i * 7 + f * 131 + (x > 0 ? 977 : 0), hh = 8 + Math.pow(h1(n), 1.6) * (f < 2 ? 42 : 26), cz = i * 17 + 8.5;
      const db = sdBox(ax - cx, y - hh / 2, z - cz, 7.2, hh / 2, 7.2); if (db < d) { d = db; id = n; } } }
  return [d, id];
}
function farolas(x, y, z) { const ax = Math.abs(x), zz = ((z - 485) % 30 + 30) % 30 - 15 + 0;   // poste en z = 485 - 15 - 30k
  const zr = ((z - 470) % 30 + 45) % 30 - 15; const poste = Math.max(len(ax - 12.2, zr) - .12, y - 8.5, -y), brazo = sdBox(ax - 11.4, y - 8.4, zr, .85, .07, .07), cab = sdRB(ax - 10.6, y - 8.3, zr, .35, .08, .18, .05);
  return Math.min(poste, brazo, cab); }
function barreras(x, y, z) { const ax = Math.abs(x); return Math.min(sdRB(ax - 11.6, y - .45, 0, .25, .45, 1e6, .08), sdRB(x, y - .4, 0, .3, .4, 1e6, .1)); }
function escena(x, y, z) {
  let d = y, m = 'suelo'; const c = (dd, mm) => { if (dd < d) { d = dd; m = mm; } };
  c(barreras(x, y, z), 'barrera'); c(farolas(x, y, z), 'farola'); c(edificios(x, y, z)[0], 'edificio');
  for (const k of S.coches) { const db = len(x - k.x, y - .8, z - k.z) - 2.9; if (db > d) continue; if (db > .2) { c(db, 'coche'); continue; } const [dc] = coche(k, x, y, z); c(dc, 'coche'); }
  return [d, m];
}
const mapa = (x, y, z) => escena(x, y, z)[0];
// ------------------------------------------------ materiales y luz
const LUNA = (() => { const v = [.4, .8, -.45], l = len(...v); return v.map(q => q / l); })();
const L = DIA ? (() => { const v = [-.5, .75, .35], l = len(...v); return v.map(q => q / l); })() : null;
function cielo(dx, dy, dz) { if (DIA) { const k = cl(dy * 1.6 + .1); return [mix(.86, .32, k), mix(.9, .55, k), mix(.95, .9, k)]; } const k = cl(dy * 2.5 + .1); return [mix(.07, .012, k), mix(.07, .018, k), mix(.14, .05, k)]; }
function halo(ox, oy, oz, dx, dy, dz, T) {   // brillo de las luces a lo largo del rayo (efecto de lente / bloom)
  const acc = [0, 0, 0]; for (const l of S.luces) { if (!l.I) continue; const px = l.p[0] - ox, py = l.p[1] - oy, pz = l.p[2] - oz, tt = px * dx + py * dy + pz * dz; if (tt < .5 || tt > T + .3) continue;
    const qx = px - dx * tt, qy = py - dy * tt, qz = pz - dz * tt, d2 = (qx * qx + qy * qy + qz * qz) / (tt * tt * 2.5e-4);
    let k = l.I * (1 / (1 + d2 * 1.6) * .55 + Math.exp(-d2 * .8) * 1.2); if (l.dir) { const v = -(px * l.dir[0] + py * l.dir[1] + pz * l.dir[2]) / (len(px, py, pz) || 1); k *= cl(v * 1.5 + .1); }
    k *= cl((l.tipo === 'farola' ? 60 : 28) / tt, .08, 1); for (let i = 0; i < 3; i++) acc[i] += l.col[i] * k * (l.tipo === 'farola' ? .4 : .5); } return acc; }
function material(m, x, y, z, nx, ny, nz) {
  if (m === 'coche') { const k = S.coches.reduce((a, b) => len(x - b.x, z - b.z) < len(x - a.x, z - a.z) ? b : a), p = coche(k, x, y, z)[1];
    if (p === 'pintura') return { alb: k.col, spec: 1, rough: 120, refl: .32, coat: true };
    if (p === 'cristal') return { alb: [.02, .025, .03], spec: 2, rough: 300, refl: .55 };
    if (p === 'rueda') return { alb: [.03, .03, .035], spec: .1, rough: 20, refl: 0 };
    if (p === 'faro') return { alb: [1, 1, 1], emit: DIA ? [1.2, 1.15, 1.05] : [5, 4.7, 4.2], refl: .2 };
    if (p === 'piloto') return { alb: [.4, 0, 0], emit: k.frena ? [5, .25, .2] : (DIA ? [.9, .05, .04] : [2.6, .12, .1]), refl: .2 }; }
  if (m === 'suelo') { const ax = Math.abs(x);
    if (ax < 11.6) { const g = M.n3(x * 3, 0, z * 3) * .5 + M.n3(x * 17, 0, z * 17) * .5; let alb = DIA ? [.2, .2, .21] : [.06, .062, .07]; alb = alb.map(v => v * (.8 + .4 * g));
      const lin = (Math.abs(ax - 3.9) < .09 || Math.abs(ax - 7.4) < .09) && (((-z % 10) + 10) % 10) < 5 || Math.abs(ax - .85) < .08 || Math.abs(ax - 10.85) < .08; if (lin) alb = DIA ? [.85, .85, .82] : [.6, .6, .58];
      const charco = DIA ? 0 : cl((M.n3(x * .35, 0, z * .35) - .42) * 4);
      return { alb, spec: DIA ? .15 : .6, rough: DIA ? 20 : 200, refl: DIA ? .04 : .18 + .45 * charco }; }
    return { alb: DIA ? [.55, .55, .53] : [.09, .09, .1], spec: .1, rough: 20, refl: DIA ? 0 : .08 }; }
  if (m === 'barrera') return { alb: DIA ? [.7, .7, .68] : [.25, .26, .28], spec: .3, rough: 40, refl: .05 };
  if (m === 'farola') return { alb: [.18, .19, .21], spec: .6, rough: 60, refl: .1 };
  if (m === 'edificio') { const [, id] = edificios(x, y, z), base = DIA ? [[.78, .72, .64], [.62, .66, .72], [.82, .66, .56], [.7, .72, .66]][Math.floor(h1(id) * 4)] : [[.12, .13, .17], [.1, .11, .15], [.14, .13, .16]][Math.floor(h1(id) * 3)];
    const ax = Math.abs(x), fu = Math.abs(nx) > .5 ? z : x, fy = (y - 2) / 3.3, fx = fu / 2.8, ix = Math.floor(fx), iy = Math.floor(fy), en = Math.abs(ny) < .5 && y > 2 && (fx - ix) > .18 && (fx - ix) < .82 && (fy - iy) > .2 && (fy - iy) < .8;
    if (en) { const on = h1(ix * 13.7 + iy * 91.3 + id) > (DIA ? 2 : .55); return { alb: DIA ? [.25, .32, .4] : [.03, .04, .05], spec: 1.5, rough: 200, refl: .35, emit: on ? [1.6, 1.15, .6].map(v => v * (.6 + .6 * h1(ix + iy * 7 + id))) : null }; }
    return { alb: base.map(v => v * (.92 + .1 * M.n3(x * .5, y * .5, z * .5))), spec: .15, rough: 20, refl: 0 }; }
  return { alb: [.5, .5, .5], spec: 0, rough: 10, refl: 0 };
}
function iluminar(x, y, z, n, v, mat, conSombra) {   // luz directa (sol de día; farolas de noche) + ambiente
  const [nx, ny, nz] = n, ao = conSombra ? M.oclusion(mapa, x, y, z, nx, ny, nz) : 1, sky = .5 + .5 * ny; let c = [0, 0, 0];
  const amb = DIA ? [.32, .38, .48] : [.035, .04, .07]; for (let i = 0; i < 3; i++) c[i] = mat.alb[i] * amb[i] * sky * ao;
  const luces = DIA ? [{ dir: L, col: [1.5, 1.4, 1.25] }] : [{ dir: LUNA, col: [.16, .19, .3], sinSombra: true }, ...S.farolas.map(l => ({ p: l.p, col: l.col }))];
  for (const l of luces) { let lx, ly, lz, at = 1; if (l.dir) [lx, ly, lz] = l.dir; else { lx = l.p[0] - x; ly = l.p[1] - y; lz = l.p[2] - z; const d2 = lx * lx + ly * ly + lz * lz; if (d2 > 1600) continue; const dd = Math.sqrt(d2); lx /= dd; ly /= dd; lz /= dd; at = 26 / (1 + d2 * .9); }
    const ndl = nx * lx + ny * ly + nz * lz; if (ndl <= 0) continue; let sh = 1; if (conSombra && !l.sinSombra) sh = M.sombra(mapa, x + nx * .02, y + ny * .02, z + nz * .02, lx, ly, lz, 14, l.dir ? 60 : 30, 48);
    const hx = lx - v[0], hy = ly - v[1], hz = lz - v[2], hl = len(hx, hy, hz), sp = Math.pow(Math.max(0, (nx * hx + ny * hy + nz * hz) / hl), mat.rough || 20) * (mat.spec || 0);
    for (let i = 0; i < 3; i++) c[i] += (mat.alb[i] * ndl + sp) * l.col[i] * at * sh; }
  if (mat.emit) for (let i = 0; i < 3; i++) c[i] += mat.emit[i];
  return c; }
function marchar(ox, oy, oz, dx, dy, dz, max = 400) { let t = .05; for (let i = 0; i < 160; i++) { const d = mapa(ox + dx * t, oy + dy * t, oz + dz * t); if (d < .002 * t) return t; t += d * .9; if (t > max) break; } return -1; }
function normal(x, y, z) { const e = .004, a = mapa(x + e, y, z) - mapa(x - e, y, z), b = mapa(x, y + e, z) - mapa(x, y - e, z), c = mapa(x, y, z + e) - mapa(x, y, z - e), l = len(a, b, c) || 1; return [a / l, b / l, c / l]; }
function niebla(c, T, dx, dy, dz) { const k = 1 - Math.exp(-T * (DIA ? .0035 : .006)), f = DIA ? [.8, .86, .92] : [.05, .055, .1]; return c.map((v, i) => v + (f[i] - v) * k); }
module.exports = {
  info: { seg: 8 },
  prepara,
  map: (sc, x, y, z) => mapa(x, y, z),
  cielo(sc, dx, dy, dz) { const c = cielo(dx, dy, dz), g = halo(sc.eye[0], sc.eye[1], sc.eye[2], dx, dy, dz, 1e4); return c.map((v, i) => v + g[i]); },
  shade(sc, x, y, z, nx, ny, nz, dx, dy, dz, T) {
    const [, m] = escena(x, y, z), mat = material(m, x, y, z, nx, ny, nz), v = [dx, dy, dz];
    let n = [nx, ny, nz]; if (m === 'suelo' && Math.abs(x) < 11.6) { const e = .02, f = (a, b) => M.n3(a * 2.2, 0, b * 2.2) * .4 + M.n3(a * 9, 0, b * 9) * .15; n = [n[0] - (f(x + e, z) - f(x, z)) / e * .02, n[1], n[2] - (f(x, z + e) - f(x, z)) / e * .02]; const l = len(...n); n = n.map(q => q / l); }
    let c = iluminar(x, y, z, n, v, mat, true);
    // reflejo (pintura con barniz, cristal, asfalto mojado)
    const rd = dx * n[0] + dy * n[1] + dz * n[2], rx = dx - 2 * rd * n[0], ry = dy - 2 * rd * n[1], rz = dz - 2 * rd * n[2], fres = Math.pow(1 - Math.max(0, -rd), 5);
    const kr = mat.refl ? mat.refl + (1 - mat.refl) * fres * (mat.coat ? .9 : .5) : 0;
    if (kr > .02) { const ox = x + n[0] * .02, oy = y + n[1] * .02, oz = z + n[2] * .02, tr = marchar(ox, oy, oz, rx, ry, rz); let rc;
      if (tr > 0) { const px = ox + rx * tr, py = oy + ry * tr, pz = oz + rz * tr, nn = normal(px, py, pz), [, m2] = escena(px, py, pz); rc = niebla(iluminar(px, py, pz, nn, [rx, ry, rz], material(m2, px, py, pz, ...nn), false), tr, rx, ry, rz); }
      else rc = cielo(rx, ry, rz);
      const g = halo(ox, oy, oz, rx, ry, rz, tr > 0 ? tr : 1e4); for (let i = 0; i < 3; i++) c[i] = c[i] * (1 - kr * .6) + (rc[i] + g[i] * .8) * kr; }
    c = niebla(c, T, dx, dy, dz);
    const g = halo(sc.eye[0], sc.eye[1], sc.eye[2], dx, dy, dz, T); return c.map((q, i) => q + g[i]); },
};
