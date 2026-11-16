'use strict';
// FONDO MARINO con ballena jorobada y tiburón blanco (escena compuesta para la imagen; no describe un encuentro real).
// Mundo: y = arriba, fondo en y ≈ 0, superficie en y = 24. Las mallas vienen de generado/animales_malla.js (MALLAS_MAR).
const LUZM = { light: norm([.25, 1, .35]), amb: .42, lightCol: [.95, 1.05, 1.1], ambCol: [.45, .72, .95] };
const NIEBLA = { col: [16, 88, 118], near: 2, far: 52, max: .93 };
const AGUA_SUP = 24;
const CAMM = (w, h, o = {}) => camera(o.eye || [0, 1.5, 9.5], o.target || [.4, 5.6, -6], { fov: o.fov || 62, w, h, ortho: o.ortho, cy: o.cy });
const TA = () => globalThis.T_ANIM || 0;
const COLOCA = {
  tiburon: { pos: [-.2, 2.8, -.8], dir: [1, 0, .45], pitch: .05, v: 1.1 },
  ballena: { pos: [1.4, 10.2, -14], dir: [-.7, 0, 1], pitch: -.1, v: 1.4 },
};
function colocaP(p, c, t = TA()) { const d = norm(c.dir), a = Math.atan2(-d[2], d[0]); return add(add(c.pos, mul(d, (c.v || 0) * t)), rotY(rotZ(mul(p, c.esc || 1), c.pitch || 0), a)); }
function animal(nombre, o = {}) { const m = MALLAS_MAR[nombre + (o.lp ? '_lp' : '')], c = (o.coloca || COLOCA)[nombre], F = [], V = [];
  for (let i = 0; i < m.v.length; i += 3) V.push(colocaP([m.v[i], m.v[i + 1], m.v[i + 2]], c));
  for (let i = 0; i < m.f.length; i += 3) F.push({ p: [V[m.f[i]], V[m.f[i + 1]], V[m.f[i + 2]]], col: [m.c[i], m.c[i + 1], m.c[i + 2]], part: nombre });
  return F; }

// --- fondo de arena: dunas suaves, ondas de arena y cáusticas ---
function alturaFondo(x, z) { return 1.3 * (fbm3(x * .045 + 3.1, 1.7, z * .045, 4) - .5) + .045 * Math.sin(x * 4.6 + 1.6 * Math.sin(z * .55) + .4 * Math.sin(z * 2.1)) + (z < -18 ? (z + 18) * .05 : 0); }
function causticas(x, z, t = TA()) { let v = 0; for (const [a, b, c] of [[1.3, .7, .9], [-.8, 1.4, 1.1], [.5, -1.6, .7]]) v += Math.sin((x * a + z * b) * 1.5 + t * c + 2 * Math.sin((x * b - z * a) * .8 + t * .6)); return Math.pow(Math.max(0, 1 - Math.abs(v) * .42), 5); }
function fondo(o = {}) { const F = [], t = TA(), paso = o.paso || 1;
  for (const [z0, z1, s] of [[11, 0, .22], [0, -14, .45], [-14, -70, 1.4]]) { const st = s * paso;
    for (let z = z0; z > z1; z -= st) { const half = 3 + .62 * (11 - z); for (let x = -half; x < half; x += st) {
      const P = [[x, z], [x + st, z], [x + st, z - st], [x, z - st]].map(([a, b]) => [a, alturaFondo(a, b), b]);
      const cx = x + st / 2, cz = z - st / 2, n = fbm3(cx * .3, 0, cz * .3, 3), m2 = hash3(Math.floor(cx * 9), Math.floor(cz * 9), 4);
      let col = mixc([206, 190, 146], [168, 150, 112], clamp(n * 1.6 - .3)); col = jit(col, .92 + .12 * m2);
      if (fbm3(cx * .12 + 9, 2, cz * .12, 3) > .62) col = mixc(col, [120, 128, 86], .55);            // manchas de algas finas
      if (o.causticas !== false) col = jit(col, 1 + (o.causticas || .75) * causticas(cx, cz, t) * clamp(1 - (11 - z) / 45));
      F.push({ p: [P[0], P[2], P[3]], col, fondo: 1 }, { p: [P[0], P[1], P[2]], col, fondo: 1 }); } } }
  return F; }

// --- rocas con algas coralinas, anémonas y erizos ---
const ROCAS = [[-4.2, -1, 1.6, 1], [-6.5, -6, 2.6, 2], [5.2, -3, 1.9, 3], [7.5, -11, 3.2, 4], [-9, -15, 3.6, 5], [2.4, 4.6, .7, 6], [-2.6, 5.5, .55, 7], [1, -9, 1.2, 8], [-12, -28, 5, 9], [12, -24, 4.5, 10], [4, -30, 3.4, 11], [-3.6, 1.6, .5, 12], [3.6, .8, .45, 13]];
function rocas(o = {}) { const F = [], k = o.det || 1;
  for (const [x, z, r, s] of ROCAS) { const y = alturaFondo(x, z) - r * .18, c = [x, y, z];
    sphere(F, c, r, Math.max(5, Math.round(16 * k)), Math.max(7, Math.round(26 * k)), p => {
      const up = (p[1] - y) / r, n = fbm3(p[0] * 1.5 + s, p[1] * 1.5, p[2] * 1.5, 3); let col = jit([92, 86, 78], .75 + .5 * n);
      if (up > .2 && n > .45) col = mixc(col, [74, 116, 62], .7); else if (up > .05 && n < .32) col = mixc(col, [196, 112, 128], .65);   // algas verdes y coralinas rosadas
      if (up < -.05) col = jit(col, .7); return col; }, { scale: [1.15, .62, 1], disp: d => 1 + .42 * (fbm3(d[0] * 1.7 + s * 3, d[1] * 1.7, d[2] * 1.7, 4) - .5) * 2 });
    if (o.adornos !== false && r > .9) { const R = rng(s * 13); for (let a = 0; a < Math.round(r * 2); a++) { const an = R() * 6.283, p = add(c, [Math.cos(an) * r * .55, r * .5, Math.sin(an) * r * .5]); anemona(F, p, .12 + R() * .08, R() > .5 ? [240, 120, 60] : [230, 210, 200], s * 7 + a); } } }
  return F; }
function anemona(F, p, r, col, seed) { const R = rng(seed); lathe(F, [[0, 0], [r * .55, 0], [r * .5, r * .9], [r * .6, r * 1.1], [0, r * 1.1]], 10, () => jit(col, .8), [p[0], r * .5, p[2]], p[0], p[2], q => [q[0], q[1] + p[1], q[2]]);
  for (let k = 0; k < 18; k++) { const a = k / 18 * 6.283 + R() * .3, b = [p[0] + Math.cos(a) * r * .5, p[1] + r * 1.1, p[2] + Math.sin(a) * r * .5], L = r * (1 + R() * .6), e = [b[0] + Math.cos(a) * L * .8, b[1] + L * .6, b[2] + Math.sin(a) * L * .8];
    F.push({ p: [b, e, add(b, [-Math.sin(a) * r * .1, 0, Math.cos(a) * r * .1])], col: jit(col, 1 + R() * .15), two: true }); } }
function erizo(F, p, r, seed) { const R = rng(seed); sphere(F, p, r, 5, 8, () => [52, 26, 60], { scale: [1, .7, 1] });
  for (let k = 0; k < 40; k++) { const d = norm([R() - .5, R() * .8, R() - .5]), b = add(p, mul(d, r * .8)), e = add(p, mul(d, r * 2.3)), s = mul(norm(cross(d, [0, 1, 0])), r * .07); F.push({ p: [add(b, s), e, sub(b, s)], col: [40, 18, 46], two: true }); } }
// --- estrellas de mar, conchas y hierba marina ---
function estrella(F, x, z, r, rot, col) { const y = alturaFondo(x, z) + .02, pts = [], c = [x, y + r * .25, z];
  for (let k = 0; k < 10; k++) { const a = rot + k / 10 * 6.283, rr = k % 2 ? r * .36 : r; pts.push([x + Math.cos(a) * rr, y + (k % 2 ? .03 : .005), z + Math.sin(a) * rr]); }
  const fs = []; for (let k = 0; k < 10; k++) fs.push({ p: [c, pts[k], pts[(k + 1) % 10]], col: jit(col, k % 2 ? .9 : 1.05) }); orientTo(fs, [x, y - 1, z]); F.push(...fs); }
function concha(F, x, z, r, rot) { const y = alturaFondo(x, z) + .01, c = [x - Math.cos(rot) * r * .5, y + r * .3, z - Math.sin(rot) * r * .5], fs = [];
  for (let k = 0; k < 9; k++) { const a0 = rot + (k / 9 - .5) * 2.4, a1 = rot + ((k + 1) / 9 - .5) * 2.4; fs.push({ p: [c, [x + Math.cos(a0) * r, y + .01, z + Math.sin(a0) * r], [x + Math.cos(a1) * r, y + .01, z + Math.sin(a1) * r]], col: k % 2 ? [236, 214, 196] : [214, 170, 150] }); }
  orientTo(fs, [x, y - 1, z]); F.push(...fs); }
function hierba(F, x, z, n, seed, t = TA()) { const R = rng(seed);
  for (let k = 0; k < n; k++) { const bx = x + (R() - .5) * 1.4, bz = z + (R() - .5) * 1, y = alturaFondo(bx, bz), L = .35 + R() * .5, w = .025, ph = R() * 6, col = jit([96, 132, 64], .8 + R() * .4);
    let p = [bx, y, bz]; for (let s = 0; s < 4; s++) { const q = add(p, [Math.sin(t * 1.3 + ph + s * .5) * .05 * (s + 1), L / 4, .02 * s]); F.push({ p: [add(p, [-w * (1 - s / 4), 0, 0]), add(p, [w * (1 - s / 4), 0, 0]), add(q, [w * (1 - (s + 1) / 4), 0, 0]), add(q, [-w * (1 - (s + 1) / 4), 0, 0])], col, two: true }); p = q; } } }
// --- bosque de kelp (tallo, frondes y flotadores) ---
function kelp(F, x0, z0, alto, seed, t = TA()) { const R = rng(seed), n = Math.ceil(alto / .4), y0 = alturaFondo(x0, z0), ph = R() * 6;
  const P = i => { const f = i / n; return [x0 + Math.sin(f * 3 + ph + t * .5) * .6 * f + Math.sin(t * .9 + ph + f * 6) * .12 * f, y0 + f * alto, z0 + Math.cos(f * 2 + ph) * .4 * f]; };
  const base = jit([118, 104, 44], .85 + R() * .3);
  for (let i = 0; i < n; i++) { const a = P(i), b = P(i + 1), w = .035; F.push({ p: [add(a, [-w, 0, 0]), add(a, [w, 0, 0]), add(b, [w, 0, 0]), add(b, [-w, 0, 0])], col: jit(base, .8), two: true });
    if (i > 1 && i % 1 === 0) { const sd = i % 2 ? 1 : -1, dir = norm([sd * (.7 + R() * .3), .9, (R() - .5) * .8]), L = .7 + R() * .5, side = norm(cross(dir, [0, 0, 1])), col = jit(base, .9 + R() * .35);
      if (R() < .55) sphere(F, add(b, mul(dir, .08)), .05, 3, 5, () => jit(base, 1.2));
      let p = add(b, mul(dir, .1)); for (let s = 0; s < 4; s++) { const wv = [Math.sin(t * 1.4 + ph + i + s) * .06, -.05 * s, 0], q = add(add(p, mul(dir, L / 4)), wv), w0 = .11 * Math.sin((s + .3) / 4 * Math.PI), w1 = .11 * Math.sin((s + 1.3) / 4 * Math.PI);
        F.push({ p: [add(p, mul(side, -w0)), add(p, mul(side, w0)), add(q, mul(side, w1)), add(q, mul(side, -w1))], col: jit(col, 1 - s * .05), two: true }); p = q; } } } }
const KELPS = (() => { const R = rng(21), L = []; for (let k = 0; k < 46; k++) { const lado = k % 2 ? 1 : -1, z = 2 - R() * 34, x = lado * (5 + R() * 9 + Math.max(0, -z) * .25); L.push([x, z, 6 + R() * 10, 100 + k]); } for (let k = 0; k < 10; k++) L.push([(R() - .5) * 14, -24 - R() * 14, 8 + R() * 10, 300 + k]); return L; })();
// --- cardumen de peces ---
function pez(F, p, d, L, col) { const up = [0, 1, 0], s = norm(cross(d, up)), nose = add(p, mul(d, L * .5)), tl = add(p, mul(d, -L * .35)), top = add(p, mul(up, L * .17)), bot = add(p, mul(up, -L * .15)), lf = add(p, mul(s, L * .07)), rt = add(p, mul(s, -L * .07));
  const belly = jit(col, 1.9).map(v => Math.min(240, v)), fs = [{ p: [nose, top, lf], col }, { p: [nose, lf, bot], col: belly }, { p: [nose, rt, top], col }, { p: [nose, bot, rt], col: belly }, { p: [tl, lf, top], col }, { p: [tl, bot, lf], col: belly }, { p: [tl, top, rt], col }, { p: [tl, rt, bot], col: belly }];
  orientTo(fs, p); fs.push({ p: [tl, add(tl, add(mul(d, -L * .22), mul(up, L * .16))), add(tl, add(mul(d, -L * .22), mul(up, -L * .16)))], col, two: true }); F.push(...fs); }
function cardumen(F, c, n, seed, t = TA()) { const R = rng(seed);
  for (let i = 0; i < n; i++) { const a = R() * 6.283 + t * .35, rad = 1 + Math.pow(R(), .7) * 2.6, h = (R() - .5) * 2.2, p = add(c, [Math.cos(a) * rad * 1.5, h + .4 * Math.sin(a * 2 + i), Math.sin(a) * rad]), d = norm([-Math.sin(a) * 1.5, .08 * Math.cos(a * 2), Math.cos(a)]);
    pez(F, p, d, .24 * (.8 + .4 * R()), jit([70, 104, 132], .85 + .3 * R())); } }
// --- superficie vista desde abajo (ventana de Snell) ---
function superficie(t = TA(), paso = 1.2) { const F = [], R0 = 46;
  for (let z = 14; z > -60; z -= paso) for (let x = -R0; x < R0; x += paso) { const cx = x + paso / 2, cz = z - paso / 2, dist = Math.hypot(cx, cz + 4); if (dist > R0) continue;
    const P = [[x, z], [x + paso, z], [x + paso, z - paso], [x, z - paso]].map(([a, b]) => [a, AGUA_SUP + .25 * Math.sin(a * .7 + t) + .2 * Math.sin(b * .9 - t * .8), b]);
    const snell = clamp(1 - dist / R0), ola = .5 + .5 * Math.sin(cx * .9 + 2 * Math.sin(cz * .5 + t * .7)) * Math.sin(cz * .8 - t * .5), brillo = Math.pow(causticas(cx * .35, cz * .35, t), .5);
    const col = mixc([60, 178, 206], [214, 250, 255], clamp(snell * snell * (.45 + .35 * ola + .4 * brillo))); F.push({ p: P, col, emit: true, two: true }); }
  return F; }
function superficie2D(ctx, cam, w, h, o = {}) { const k = o.k || 4, lw = Math.ceil(w / k), lh = Math.ceil(h / k), c = mk(lw, lh), g = c.getContext('2d'), img = g.createImageData(lw, lh), d = img.data, t = TA(), R0 = 48;
  for (let py = 0; py < lh; py++) for (let px = 0; px < lw; px++) { const sx = (px * k - w / 2) / cam.focal, sy = -(py * k - h / 2) / cam.focal, dir = norm(add(cam.f, add(mul(cam.r, sx), mul(cam.u, sy)))); if (dir[1] <= .02) continue;
    const T = (AGUA_SUP - cam.eye[1]) / dir[1], x = cam.eye[0] + dir[0] * T, z = cam.eye[2] + dir[2] * T, dist = Math.hypot(x, z + 4), win = clamp(1 - dist / R0); if (win <= 0) continue;
    const pat = causticas(x * .3, z * .3, t), ola = .5 + .5 * Math.sin(x * .8 + 2 * Math.sin(z * .45 + t * .7)) * Math.sin(z * .7 - t * .5), a = clamp(win * win * (.35 + .25 * ola + .55 * Math.pow(pat, .6))), i = (py * lw + px) * 4;
    d[i] = 214; d[i + 1] = 250; d[i + 2] = 255; d[i + 3] = a * 255; }
  g.putImageData(img, 0, 0); ctx.imageSmoothingEnabled = true; ctx.drawImage(c, 0, 0, w, h); }
// --- escena completa en grupos (cada estilo decide cómo pintarlos) ---
function escenaMar(o = {}) { const t = TA(), A = [], E = [];
  for (const [x, z, h, s] of KELPS) kelp(A, x, z, h * (o.kelpK || 1), s, t);
  for (const [x, z, n, s] of [[-1.8, 3.2, 22, 1], [2.2, 2.6, 18, 2], [-3.4, 1.4, 18, 3], [3.6, .4, 16, 4], [.4, -.6, 12, 5], [-5.5, -2, 22, 6], [5.6, -3, 20, 7]]) hierba(A, x, z, n, s, t);
  const R = rng(31); for (let k = 0; k < 9; k++) estrella(A, (R() - .5) * 7, 4 - R() * 7, .14 + R() * .1, R() * 6, [[226, 90, 50], [214, 60, 80], [236, 150, 50]][k % 3]);
  for (let k = 0; k < 10; k++) concha(A, (R() - .5) * 7, 4 - R() * 6, .06 + R() * .05, R() * 6);
  for (const [x, z] of [[-3.1, 2.4], [-1.4, 3.6], [3.0, 1.4], [4.6, -1.8]]) erizo(A, [x, alturaFondo(x, z) + .06, z], .09, x * 10);
  if (o.peces !== false) cardumen(E, [-5.5, 7.5, -9], o.nPeces || 320, 5, t);
  return { fondo: fondo(o), rocas: rocas(o), vida: A, peces: E, ballena: o.animales === false ? [] : animal('ballena', o), tiburon: o.animales === false ? [] : animal('tiburon', o) }; }
function sombraTiburon() { const c = COLOCA.tiburon, p = colocaP([0, 0, 0], c), d = norm(c.dir), y = alturaFondo(p[0], p[2]) + .03, sh = [];
  for (let k = 0; k < 28; k++) { const a = k / 28 * 6.283, u = Math.cos(a) * 2.1, v = Math.sin(a) * .55; sh.push([p[0] + d[0] * u - d[2] * v + .5, y, p[2] + d[2] * u + d[0] * v - .4]); }
  return { p: sh.reverse(), col: [40, 70, 80], emit: true, two: true }; }
// --- capas 2D: degradado del agua, rayos de luz, nieve marina ---
function aguaFondo(ctx, w, h, st) { ctx.fillStyle = lin(ctx, 0, 0, 0, h, st || [['#4fc4dc', 0], ['#1d8aa8', .35], ['#0f5c80', .7], ['#0a3c5a', 1]]); ctx.fillRect(0, 0, w, h); }
function rayos(ctx, w, h, o = {}) { const t = TA(), R = rng(o.seed || 9), vx = w * .55, vy = -h * .5; ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < (o.n || 11); k++) { const x0 = w * (-.1 + 1.2 * R()) + Math.sin(t * .3 + k) * w * .02, ww = w * (.015 + .045 * R()), L = h * (.55 + .35 * R()), k1 = (L - vy) / (0 - vy);
    const a = [x0 - ww, 0], b = [x0 + ww, 0], c2 = [vx + (x0 + ww - vx) * k1, L], d = [vx + (x0 - ww - vx) * k1, L], g = ctx.createLinearGradient(0, 0, 0, L), al = (o.alfa || .16) * (.5 + .5 * R());
    g.addColorStop(0, `rgba(${o.col || '190,245,255'},${al})`); g.addColorStop(1, `rgba(${o.col || '190,245,255'},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineTo(...c2); ctx.lineTo(...d); ctx.closePath(); ctx.fill(); }
  ctx.restore(); }
function nieve(ctx, cam, o = {}) { const t = TA(), R = rng(o.seed || 17), sc = cam.w / 1080; ctx.save();
  for (let i = 0; i < (o.n || 900); i++) { const p = [(R() - .5) * 30, R() * 18 + .3 - (t * .05 % 1), 9 - R() * 34], q = cam.P(p); if (q[2] < .3 || q[0] < 0 || q[0] > cam.w || q[1] < 0 || q[1] > cam.h) continue;
    const r = clamp(26 / q[2], .6, 5) * sc * (o.k || 1), a = clamp(1 - q[2] / 30) * .55; ctx.fillStyle = o.col ? o.col(a) : `rgba(220,240,240,${a})`; ctx.fillRect(q[0] - r / 2, q[1] - r / 2, r, r); }
  ctx.restore(); }
function vineta(ctx, w, h) { const g = ctx.createRadialGradient(w / 2, h * .45, h * .25, w / 2, h * .5, h * .8); g.addColorStop(0, 'rgba(0,10,20,0)'); g.addColorStop(1, 'rgba(0,10,25,.55)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }
// pinta la escena entera con el motor de caras (estilos que usan sombreado normal)
function pintaMar(ctx, w, h, cam, o = {}) { const S = escenaMar(o), L = { ...LUZM, ...(o.luz || {}), fog: o.fog === false ? null : { ...NIEBLA, ...(o.niebla || {}) }, seam: o.seam ?? .6 };
  aguaFondo(ctx, w, h, o.agua); if (o.sup !== false) superficie2D(ctx, cam, w, h, { k: w > 600 ? 4 : 1 });
  if (o.rayos !== false) rayos(ctx, w, h, o.rayosO || {});
  render(ctx, cam, S.fondo, { ...L, fog: L.fog ? { ...L.fog, far: 36, max: 1 } : null }); ctx.globalAlpha = .3; render(ctx, cam, [sombraTiburon()], L); ctx.globalAlpha = 1;
  render(ctx, cam, [...S.rocas, ...S.vida, ...S.peces, ...S.ballena, ...S.tiburon], { ...L, seam: o.seamA ?? .45 });
  if (o.nieve !== false) nieve(ctx, cam, o.nieveO || { n: Math.round(900 * w / 1080) });
  if (o.rayos !== false) rayos(ctx, w, h, { n: 5, alfa: .06, seed: 4 }); return S; }
