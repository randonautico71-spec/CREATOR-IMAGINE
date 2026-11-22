'use strict';
// Ballena jorobada y tiburón blanco en el fondo marino: un fotograma por estilo (1080×1920)
const EM = {};
function bordesTinta(ctx, w, h, umbral = 30, col = [30, 20, 30], grosor = 2) {
  const img = ctx.getImageData(0, 0, w, h), d = img.data, L = new Float32Array(w * h); for (let i = 0; i < w * h; i++) L[i] = d[i * 4] * .3 + d[i * 4 + 1] * .59 + d[i * 4 + 2] * .11;
  const out = new Uint8Array(w * h); for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x, gx = -L[i - w - 1] - 2 * L[i - 1] - L[i + w - 1] + L[i - w + 1] + 2 * L[i + 1] + L[i + w + 1], gy = -L[i - w - 1] - 2 * L[i - w] - L[i - w + 1] + L[i + w - 1] + 2 * L[i + w] + L[i + w + 1]; if (Math.hypot(gx, gy) > umbral * 4) out[i] = 1; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let e = 0; for (let dy = -grosor + 1; dy < grosor && !e; dy++) for (let dx = -grosor + 1; dx < grosor && !e; dx++) { const yy = y + dy, xx = x + dx; if (yy >= 0 && yy < h && xx >= 0 && xx < w && out[yy * w + xx]) e = 1; } if (e) { const i = (y * w + x) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; } }
  ctx.putImageData(img, 0, 0); }
function posterizar(ctx, w, h, niv) { const img = ctx.getImageData(0, 0, w, h), d = img.data; for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) d[i + k] = Math.round(d[i + k] / 255 * niv) / niv * 255; ctx.putImageData(img, 0, 0); }
function grano(ctx, w, h, k = 14) { const nz = ctx.getImageData(0, 0, w, h), d = nz.data, Rn = rng(77); for (let i = 0; i < d.length; i += 4) { const v = (Rn() - .5) * k; d[i] += v; d[i + 1] += v; d[i + 2] += v; } ctx.putImageData(nz, 0, 0); }
function muestreaM(F, dens, R) { const out = []; for (const f of F) { const p = f.p, n = norm(newell(p)); for (let t = 1; t < p.length - 1; t++) { const a = p[0], b = p[t], c = p[t + 1], ar = Math.hypot(...cross(sub(b, a), sub(c, a))) / 2, k = ar * dens + R(); for (let j = 0; j < Math.floor(k); j++) { let u = R(), v = R(); if (u + v > 1) { u = 1 - u; v = 1 - v; } out.push({ p: add(a, add(mul(sub(b, a), u), mul(sub(c, a), v))), n, col: f.col }); } } } return out; }
const PAL_MAR = ['#04121c', '#082a3c', '#0c3c54', '#105270', '#16688a', '#1e82a4', '#2c9cbc', '#4cb8d0', '#7ed4e0', '#bfeef4', '#ffffff', '#1a1c20', '#2c3036', '#464c54', '#6a727c', '#959ca4', '#c4c8cc', '#e4e4e0',
  '#5a4a30', '#7e6a46', '#a48c60', '#c8b080', '#e2d0a0', '#3c4a22', '#566a2c', '#76883a', '#9aa84a', '#c05a3a', '#e08850', '#c06a80', '#e0a0b0', '#5a3a2a'].map(hex);

// 1 · PIXEL ART 3D
EM.pixel = ctx => { const lw = 270, lh = 480, c = mk(lw, lh), g = c.getContext('2d'), cam = CAMM(lw, lh);
  pintaMar(g, lw, lh, cam, { paso: 1.6, det: .7, nPeces: 200, nieveO: { n: 160, k: .5 }, seam: .9, seamA: .9, rayos: false }); quantize(g, lw, lh, PAL_MAR);
  ctx.imageSmoothingEnabled = false; ctx.drawImage(c, 0, 0, W, H); };

// 2 · VÓXEL
function voxAnimal(F, nombre, coloca = COLOCA) { const V = VOX_MAR[nombre], u = VOX_MAR['u_' + nombre] || VOX_MAR.u, c = coloca[nombre], mapa = new Set(V.map(v => v[0] + ',' + v[1] + ',' + v[2])), dirs = [['top', 0, 1, 0], ['bottom', 0, -1, 0], ['right', 1, 0, 0], ['left', -1, 0, 0], ['front', 0, 0, 1], ['back', 0, 0, -1]];
  for (const v of V) { const sk = {}; let vis = 0; for (const [nm, a, b, cc] of dirs) { if (mapa.has((v[0] + a) + ',' + (v[1] + b) + ',' + (v[2] + cc))) sk[nm] = 1; else vis++; } if (!vis) continue;
    const L = []; box(L, v[0] * u - u / 2, v[1] * u - u / 2, v[2] * u - u / 2, v[0] * u + u / 2, v[1] * u + u / 2, v[2] * u + u / 2, [v[3], v[4], v[5]], { skip: sk }); for (const f of L) { f.p = f.p.map(p => colocaP(p, c)); F.push(f); } } }
EM.voxel = ctx => { const cam = CAMM(W, H); aguaFondo(ctx, W, H); render(ctx, cam, superficie(), { ...LUZM, fog: { ...NIEBLA, near: 20, far: 90, max: .75 } }); rayos(ctx, W, H);
  const F = [], u = .5, alt = {}, t = TA(); for (let i = -36; i < 36; i++) for (let k = -90; k < 22; k++) { const x = i * u, z = k * u; if (Math.abs(x) > 4 + .7 * (11 - z)) continue; alt[i + ',' + k] = Math.round(alturaFondo(x + u / 2, z + u / 2) / .25) * .25; }
  for (const key in alt) { const [i, k] = key.split(',').map(Number), y = alt[key], x = i * u, z = k * u, m = hash3(i, k, 3); let col = jit([206, 188, 142], .9 + .14 * m); if (fbm3(x * .12 + 9, 2, z * .12, 3) > .62) col = mixc(col, [120, 128, 86], .5); col = jit(col, 1 + .6 * causticas(x + .25, z + .25, t) * clamp(1 - (11 - z) / 45));
    const sk = {}; for (const [nm, a, b] of [['right', 1, 0], ['left', -1, 0], ['front', 0, 1], ['back', 0, -1]]) if ((alt[(i + a) + ',' + (k + b)] ?? -9) >= y) sk[nm] = 1; sk.bottom = 1; box(F, x, y - .5, z, x + u, y, z + u, col, { skip: sk, side: jit(col, .8) }); }
  for (const [rx, rz, r, s] of ROCAS) { const y0 = alturaFondo(rx, rz), uu = r > 2 ? .5 : .25; for (let x = -r * 1.2; x < r * 1.2; x += uu) for (let z = -r; z < r; z += uu) for (let y = 0; y < r * .8; y += uu) { const q = Math.hypot(x / 1.15, y / .62 * 1.2, z) / r * (1 - .35 * (fbm3((rx + x) * .8, y * .8, (rz + z) * .8, 3) - .5) * 2); if (q > 1) continue;
      const top = y + uu >= r * .62 * Math.sqrt(Math.max(0, 1 - (x / 1.15 / r) ** 2 - (z / r) ** 2)) - uu, n = fbm3((rx + x) * 1.2 + s, y, (rz + z) * 1.2, 3); let col = jit([96, 90, 82], .75 + .5 * n); if (top && n > .5) col = [76, 118, 64]; else if (top && n < .32) col = [196, 112, 128];
      box(F, rx + x, y0 - .2 + y, rz + z, rx + x + uu, y0 - .2 + y + uu, rz + z + uu, col); } }
  for (const [kx, kz, h, s] of KELPS) { const R = rng(s), y0 = alturaFondo(kx, kz), ph = R() * 6; for (let y = 0; y < h; y += .25) { const f = y / h, x = Math.round((kx + Math.sin(f * 3 + ph + t * .5) * .6 * f) / .25) * .25, z = Math.round(kz / .25) * .25; box(F, x, y0 + y, z, x + .25, y0 + y + .25, z + .25, [104, 96, 40]);
      if (Math.round(y / .25) % 3 === 1) { const sd = Math.round(y / .25) % 2 ? 1 : -1; for (let b = 1; b < 4; b++) box(F, x + sd * b * .25, y0 + y + b * .2, z, x + sd * b * .25 + .25, y0 + y + b * .2 + .12, z + .25, jit([132, 122, 50], .9 + .2 * R()), { f: { two: true } }); } } }
  const P = []; cardumen(P, [-5.5, 7.5, -9], 220, 5, t); for (const f of P) { const c = centroid(f.p); box(F, c[0] - .07, c[1] - .05, c[2] - .07, c[0] + .07, c[1] + .05, c[2] + .07, f.col); }
  for (let k = 0; k < 9; k++) { const R = rng(31 + k), x = (R() - .5) * 8, z = 7.5 - R() * 8, y = alt[Math.floor(x / u) + ',' + Math.floor(z / u)] ?? 0; for (const [a, b] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) box(F, x + a * .1, y, z + b * .1, x + a * .1 + .1, y + .05, z + b * .1 + .1, [226, 90, 50]); }
  voxAnimal(F, 'ballena'); voxAnimal(F, 'tiburon');
  render(ctx, cam, F, { ...LUZM, fog: NIEBLA, seam: .7 }); nieve(ctx, cam, { n: 500, k: 1.6 }); };

// 3 · ISOMÉTRICO / DIORAMA (bloque de fondo marino en corte, con la columna de agua de cristal)
const COLOCA_ISO = { tiburon: { pos: [.4, 3.0, 2.6], dir: [1, 0, -.55], pitch: .04, esc: .95 }, ballena: { pos: [.6, 7.4, -1.4], dir: [-1, 0, .3], pitch: -.06, esc: .62 } };
EM.iso = ctx => { ctx.fillStyle = lin(ctx, 0, 0, 0, H, [['#f4ecdc', 0], ['#e2d4bc', 1]]); ctx.fillRect(0, 0, W, H);
  const cam = camera([30, 22, 30], [0, 4.2, 0], { ortho: 64, cy: H * .5 }), B = [], F = [], S = 6, hb = y => y;
  const alt = (x, z) => .6 * (fbm3(x * .15 + 3, 1.7, z * .15, 3) - .5) + .04 * Math.sin(x * 4.6 + 1.6 * Math.sin(z * .55));
  const st = .4; for (let x = -S; x < S - 1e-6; x += st) for (let z = -S; z < S - 1e-6; z += st) { const P = [[x, z], [x + st, z], [x + st, z + st], [x, z + st]].map(([a, b]) => [a, alt(a, b), b]), m = hash3(x * 9, z * 9, 2);
    let col = jit([212, 194, 148], .92 + .12 * m); col = jit(col, 1 + .6 * causticas(x * 1.6, z * 1.6)); B.push({ p: [P[0], P[3], P[2]], col }, { p: [P[0], P[2], P[1]], col }); }
  for (const [ax, az, bx, bz] of [[-S, S, S, S], [S, S, S, -S]]) { const n = 30; for (let i = 0; i < n; i++) { const x0 = ax + (bx - ax) * i / n, z0 = az + (bz - az) * i / n, x1 = ax + (bx - ax) * (i + 1) / n, z1 = az + (bz - az) * (i + 1) / n;
      for (const [y0, y1, col] of [[-1.2, 0, [196, 176, 130]], [-2.2, -1.2, [150, 120, 86]], [-3.2, -2.2, [110, 88, 66]]]) { const yt0 = y1 === 0 ? alt(x0, z0) : y1, yt1 = y1 === 0 ? alt(x1, z1) : y1; B.push({ p: [[x0, y0, z0], [x1, y0, z1], [x1, yt1, z1], [x0, yt0, z0]], col: jit(col, .92 + .1 * hash3(i, y0 * 3, 5)), two: true }); } } }
  for (const [x, z, r, s] of [[-3.6, -3, 1.3, 1], [3.8, -2.6, 1.6, 2], [-4.2, 3.4, .7, 3], [4.4, 3.6, .55, 4]]) sphere(F, [x, alt(x, z) - .2, z], r, 8, 14, p => { const n = fbm3(p[0] * 1.5 + s, p[1] * 1.5, p[2] * 1.5, 3), up = p[1] - alt(x, z); let c = jit([96, 90, 82], .75 + .5 * n); if (up > .3 && n > .45) c = [76, 118, 64]; else if (up > .1 && n < .33) c = [196, 112, 128]; return c; }, { scale: [1.15, .65, 1], disp: d => 1 + .4 * (fbm3(d[0] * 1.7 + s, d[1] * 1.7, d[2] * 1.7, 3) - .5) * 2 });
  for (const [x, z, h, s] of [[-4.8, -4.6, 9, 1], [-3, -5, 8, 2], [-5.2, -1.6, 7, 3], [4.6, -4.8, 9.5, 4], [2.6, -5.2, 7.5, 5], [5.1, -.8, 6.5, 6], [-1, -5.3, 6, 7]]) kelp(F, x, z, h, s);
  const R = rng(4); for (let k = 0; k < 6; k++) estrella(F, (R() - .5) * 9, (R() - .2) * 7, .25, R() * 6, [[226, 90, 50], [214, 60, 80], [236, 150, 50]][k % 3]);
  for (const f of F) for (const p of f.p) if (f.fondoIso) p[1] = alt(p[0], p[2]);
  cardumen(F, [2.5, 5.5, 2.5], 90, 5); for (const f of [...animal('ballena', { coloca: COLOCA_ISO }), ...animal('tiburon', { coloca: COLOCA_ISO })]) F.push(f);
  const sh = []; for (let k = 0; k < 24; k++) { const a = k / 24 * 6.283; sh.push([.4 + Math.cos(a) * 1.8, alt(.4, 2.6) + .03, 2.6 + Math.sin(a) * .7]); } B.push({ p: sh.reverse(), col: [120, 110, 90], emit: true, two: true });
  render(ctx, cam, B, { ...LUZM, amb: .5 }); render(ctx, cam, F, { ...LUZM, amb: .45, seam: .45 });
  // columna de agua: cristal translúcido con aristas
  const Y = 11, caras = [[[-S, 0, S], [S, 0, S], [S, Y, S], [-S, Y, S]], [[S, 0, S], [S, 0, -S], [S, Y, -S], [S, Y, S]], [[-S, Y, -S], [-S, Y, S], [S, Y, S], [S, Y, -S]]];
  ctx.globalAlpha = .2; render(ctx, cam, caras.map((p, i) => ({ p, col: [[60, 170, 210], [40, 140, 190], [150, 220, 240]][i], emit: true, two: true })), {}); ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 3; for (const [a, b] of [[[-S, Y, S], [S, Y, S]], [[S, Y, S], [S, Y, -S]], [[S, Y, -S], [-S, Y, -S]], [[-S, Y, -S], [-S, Y, S]], [[-S, 0, S], [-S, Y, S]], [[S, 0, S], [S, Y, S]], [[S, 0, -S], [S, Y, -S]]]) { const p = cam.P(a), q = cam.P(b); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); }
  const Rr = rng(8); ctx.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < 260; i++) { const q = cam.P([(Rr() - .5) * 2 * S, Rr() * Y, (Rr() - .5) * 2 * S]); ctx.fillRect(q[0], q[1], 2.5, 2.5); } };

// 4 · LOW-POLY
EM.lowpoly = ctx => { const cam = CAMM(W, H), R = rng(4), S = escenaMar({ lp: true, paso: 3.2, det: .55, nPeces: 140, causticas: false });
  for (const g of ['fondo', 'rocas', 'vida', 'peces', 'ballena', 'tiburon']) for (const f of S[g]) f.col = jit(f.col, .92 + .14 * R());
  aguaFondo(ctx, W, H, [['#5ccbe0', 0], ['#2a92b0', .4], ['#14607e', .75], ['#0c4060', 1]]); render(ctx, cam, superficie(0, 6), { seam: 1, fog: { ...NIEBLA, near: 20, far: 90, max: .7 } }); rayos(ctx, W, H, { n: 7, alfa: .12 });
  const L = { ...LUZM, fog: NIEBLA, seam: 1 }; render(ctx, cam, S.fondo, L); render(ctx, cam, [...S.rocas, ...S.vida, ...S.peces, ...S.ballena, ...S.tiburon], L); };

// 5 · WIREFRAME RETRO
EM.wire = ctx => { ctx.fillStyle = lin(ctx, 0, 0, 0, H, [['#000814', 0], ['#001a2c', .55], ['#00263a', 1]]); ctx.fillRect(0, 0, W, H); const cam = CAMM(W, H), t = TA();
  ctx.lineWidth = 1.4; for (let z = 11; z > -60; z -= .8) { ctx.strokeStyle = `rgba(0,255,200,${.45 * clamp(1 - (11 - z) / 70)})`; ctx.beginPath(); for (let x = -40; x <= 40; x += .8) { const q = cam.P([x, alturaFondo(x, z), z]); if (q[2] < .1) continue; x === -40 ? ctx.moveTo(q[0], q[1]) : ctx.lineTo(q[0], q[1]); } ctx.stroke(); }
  for (let x = -40; x <= 40; x += .8) { ctx.strokeStyle = 'rgba(0,255,200,.22)'; ctx.beginPath(); let ini = 1; for (let z = 11; z > -60; z -= .8) { const q = cam.P([x, alturaFondo(x, z), z]); if (q[2] < .1) continue; ini ? ctx.moveTo(q[0], q[1]) : ctx.lineTo(q[0], q[1]); ini = 0; } ctx.stroke(); }
  for (let z = 14; z > -90; z -= 3) { ctx.strokeStyle = 'rgba(80,180,255,.25)'; ctx.beginPath(); for (let x = -70; x <= 70; x += 3) { const q = cam.P([x, AGUA_SUP + .3 * Math.sin(x * .7 + t), z]); x === -70 ? ctx.moveTo(q[0], q[1]) : ctx.lineTo(q[0], q[1]); } ctx.stroke(); }
  const kel = []; for (const [x, z, h, s] of KELPS) kelp(kel, x, z, h, s); render(ctx, cam, kel, { two: true, wire: { fill: 'rgba(0,0,0,0)', line: 'rgba(120,255,120,.55)', lw: 1, glow: 'rgba(120,255,120,.08)', gw: 3 } });
  const qz = (m, q) => { const F = []; for (const f of m) { const P = f.p.map(p => p.map(v => Math.round(v / q) * q)); if (Math.hypot(...cross(sub(P[1], P[0]), sub(P[2], P[0]))) < 1e-6) continue; F.push({ p: P, col: [0, 0, 0] }); } return F; };
  const ro = rocas({ det: .8, adornos: false }); render(ctx, cam, ro, { wire: { fill: '#00121e', line: 'rgba(0,200,255,.6)', lw: 1, glow: 'rgba(0,200,255,.1)', gw: 3 } });
  render(ctx, cam, qz(animal('ballena'), .16), { wire: { fill: '#030a1c', line: '#ff4fd8', lw: 1, glow: 'rgba(255,79,216,.14)', gw: 4 } });
  render(ctx, cam, qz(animal('tiburon'), .07), { wire: { fill: '#030a1c', line: '#38f6ff', lw: 1, glow: 'rgba(56,246,255,.16)', gw: 4 } });
  const P = []; cardumen(P, [-5.5, 7.5, -9], 240, 5); render(ctx, cam, P, { wire: { fill: '#001020', line: 'rgba(255,230,120,.8)', lw: 1, glow: 'rgba(0,0,0,0)', gw: 0 } });
  nieve(ctx, cam, { n: 600, col: a => `rgba(120,255,240,${a})` }); };

// 6 · TOON / CEL SHADING
EM.toon = ctx => { const cam = CAMM(W, H);
  pintaMar(ctx, W, H, cam, { nieve: false, causticas: .3, agua: [['#6ad8ec', 0], ['#2aa4c8', .35], ['#167aa6', .7], ['#0e5480', 1]], luz: { amb: .3, toon: d => d > .6 ? 1 : d > .25 ? .78 : .55 }, niebla: { far: 70, max: .8 }, seamA: .6 });
  bordesTinta(ctx, W, H, 40, [10, 30, 50], 2); nieve(ctx, cam, { n: 500, k: 1.4 }); };

// 7 · 2.5D PAPERCRAFT
EM.paper = ctx => { const cam = CAMM(W, H), S = escenaMar({ nPeces: 160 }), toon = d => d > .55 ? 1 : d > .2 ? .86 : .72, L = { ...LUZM, amb: .4, toon, seam: .6, fog: { ...NIEBLA, far: 75, max: .75 } };
  aguaFondo(ctx, W, H, [['#8ad8e8', 0], ['#3ea6c4', .4], ['#1e7aa0', .8], ['#16608a', 1]]); superficie2D(ctx, cam, W, H); rayos(ctx, W, H, { n: 8, alfa: .1 });
  const capa = (F, sh) => { const c = mk(W, H), g = c.getContext('2d'); render(g, cam, F, L); const s2 = mk(W, H), sg = s2.getContext('2d'); sg.drawImage(c, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = 'rgba(0,25,40,.4)'; sg.fillRect(0, 0, W, H); for (let k = sh; k >= 1; k--) { ctx.globalAlpha = .35; ctx.drawImage(s2, k * 2.5, k * 3); } ctx.globalAlpha = 1; ctx.drawImage(c, 0, 0); };
  const lejos = f => centroid(f.p)[2] < -12; capa(S.vida.filter(lejos), 2); capa(S.fondo, 0); capa([...S.rocas, ...S.vida.filter(f => !lejos(f))], 4); capa(S.peces, 3); capa(S.ballena, 6); capa(S.tiburon, 8);
  posterizar(ctx, W, H, 12); grano(ctx, W, H, 16); };

// 8 · PARTÍCULAS 3D (bioluminiscencia)
EM.galaxy = ctx => { ctx.fillStyle = lin(ctx, 0, 0, 0, H, [['#03182a', 0], ['#020c18', .5], ['#01060e', 1]]); ctx.fillRect(0, 0, W, H);
  const cam = CAMM(W, H), R = rng(5), bin = 2, bw = Math.ceil(W / bin), zb = new Float32Array(bw * Math.ceil(H / bin)).fill(1e9), pts = [], S = escenaMar({ causticas: false, nPeces: 260 });
  const grupos = [[S.fondo, 30, [40, 170, 190]], [S.rocas, 90, [70, 140, 230]], [S.vida, 500, [90, 255, 140]], [S.peces, 900, [255, 220, 120]], [S.ballena, 260, [80, 220, 255]], [S.tiburon, 2200, [235, 245, 255]]];
  for (const [G, dens, tint] of grupos) for (const pt of muestreaM(G, dens, R)) { const q = cam.P(pt.p); if (q[2] <= .1 || q[0] < 0 || q[0] >= W || q[1] < 0 || q[1] >= H) continue; const k = Math.floor(q[1] / bin) * bw + Math.floor(q[0] / bin); if (q[2] < zb[k]) zb[k] = q[2]; pts.push([q, pt, k, tint]); }
  ctx.globalCompositeOperation = 'lighter';
  for (const [q, pt, k, tint] of pts) { if (q[2] > zb[k] + .05 * q[2]) continue; const l = (.35 + .65 * Math.max(0, dot(pt.n, LUZM.light))) * clamp(1.15 - q[2] / 55), c = mixc(tint, pt.col, .35); ctx.fillStyle = `rgba(${c[0] * l | 0},${c[1] * l | 0},${c[2] * l | 0},.5)`; const r = q[2] < 6 ? 2.4 : 1.8; ctx.fillRect(q[0] - r / 2, q[1] - r / 2, r, r); }
  for (let i = 0; i < 3000; i++) { const q = cam.P([(R() - .5) * 40, R() * 22, 9 - R() * 50]); if (q[2] < .3) continue; ctx.fillStyle = `rgba(120,220,255,${.35 * clamp(1 - q[2] / 40)})`; const r = Math.max(1, 14 / q[2]); ctx.fillRect(q[0], q[1], r, r); }
  ctx.globalCompositeOperation = 'source-over'; rayos(ctx, W, H, { n: 6, alfa: .07, col: '120,220,255' }); };

// 9 · RETRO DE CONSOLA
EM.dither = ctx => { const lw = 270, lh = 480, c = mk(lw, lh), g = c.getContext('2d'), cam = CAMM(lw, lh); pintaMar(g, lw, lh, cam, { paso: 1.6, det: .7, nPeces: 200, nieveO: { n: 120, k: .5 } });
  const img = g.getImageData(0, 0, lw, lh), d = img.data, bay = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], pal = ['#081820', '#1e5a6e', '#58b4b4', '#e0f8d0'].map(hex);
  for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) { const i = (y * lw + x) * 4, l = clamp(Math.pow((d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11) / 255, .95) * 1.15), v = l * 3, k = Math.min(3, Math.floor(v) + ((v - Math.floor(v)) > (bay[y & 3][x & 3] + .5) / 16 ? 1 : 0)); d[i] = pal[k][0]; d[i + 1] = pal[k][1]; d[i + 2] = pal[k][2]; }
  g.putImageData(img, 0, 0); ctx.imageSmoothingEnabled = false; ctx.drawImage(c, 0, 0, W, H); };

// 10 · ASCII 3D
EM.ascii = ctx => { const lw = 360, lh = 640, c = mk(lw, lh), g = c.getContext('2d'), cam = CAMM(lw, lh); pintaMar(g, lw, lh, cam, { paso: 1.4, nPeces: 220, nieve: false });
  const d = g.getImageData(0, 0, lw, lh).data, cw = 9, ch = 15, cols = 120, rows = 128, chars = ' .`,:;~-=+*!?%#&$@';
  ctx.fillStyle = '#02070c'; ctx.fillRect(0, 0, W, H); ctx.font = 'bold 14px "DejaVu Sans Mono", monospace'; ctx.textBaseline = 'top';
  for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) { let A = 0, Gg = 0, B = 0, n = 0; for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) { const yy = Math.floor(r * lh / rows) + y; if (yy >= lh) continue; const i = (yy * lw + q * 3 + x) * 4; A += d[i]; Gg += d[i + 1]; B += d[i + 2]; n++; }
    A /= n; Gg /= n; B /= n; const l = (A * .3 + Gg * .59 + B * .11) / 255, k = Math.min(chars.length - 1, Math.round(Math.pow(l, .55) * (chars.length - 1)));
    ctx.fillStyle = `rgba(${A | 0},${Gg | 0},${B | 0},.45)`; ctx.fillRect(q * cw, r * ch, cw, ch); ctx.fillStyle = `rgb(${Math.min(255, A * 1.7 + 40) | 0},${Math.min(255, Gg * 1.7 + 40) | 0},${Math.min(255, B * 1.7 + 40) | 0})`; ctx.fillText(chars[k], q * cw, r * ch); }
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1); };

// 11 · INFOGRAFÍA 3D (rasgos señalados, sin cifras)
EM.info = ctx => { const cam = CAMM(W, H); pintaMar(ctx, W, H, cam, { nieveO: { n: 400 }, niebla: { far: 80, max: .8 } });
  ctx.fillStyle = 'rgba(4,16,30,.35)'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = lin(ctx, 0, 0, 0, 300, [['rgba(4,16,30,.85)', 0], ['rgba(4,16,30,0)', 1]]); ctx.fillRect(0, 0, W, 300);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 54px "DejaVu Sans", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Ballena jorobada y tiburón blanco', W / 2, 130); ctx.fillStyle = '#a8d8ec'; ctx.font = '34px "DejaVu Sans", sans-serif'; ctx.fillText('modelados por código, rasgo a rasgo', W / 2, 186);
  ctx.font = 'bold 32px "DejaVu Sans", sans-serif'; ctx.textAlign = 'left';
  const marca = (p, lado, dy, txt, col = '#ffc23c') => { const q = cam.P(p), w = ctx.measureText(txt).width, tx = lado < 0 ? 44 : W - 44 - w, ty = dy, lx = lado < 0 ? tx + w + 12 : tx - 12; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(lx, ty - 12); ctx.stroke(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(q[0], q[1], 7, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(6,20,36,.88)'; ctx.fillRect(tx - 12, ty - 40, w + 24, 56); ctx.strokeStyle = col; ctx.globalAlpha = .6; ctx.lineWidth = 2; ctx.strokeRect(tx - 12, ty - 40, w + 24, 56); ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.fillText(txt, tx, ty); };
  const B = p => colocaP(p, COLOCA.ballena), T = p => colocaP(p, COLOCA.tiburon);
  marca(B([5.4, 1.2, 0]), -1, 470, 'Tubérculos en la cabeza'); marca(B([-7, 0, 0]), 1, 770, 'Cola con borde dentado'); marca(B([.5, -1.9, 4.1]), -1, 1040, 'Aletas pectorales muy largas'); marca(B([3.4, -1.4, -.7]), 1, 630, 'Pliegues de la garganta');
  marca(T([1.05, 0, .38]), 1, 1450, 'Cinco hendiduras branquiales', '#7ee0ff'); marca(T([1.86, -.2, .12]), 1, 1310, 'Dientes aserrados', '#7ee0ff');
  marca(T([-2.3, .75, 0]), -1, 1250, 'Cola en media luna', '#7ee0ff'); marca(T([.1, -.32, .44]), -1, 1590, 'Dorso gris, vientre blanco', '#7ee0ff'); };
const LISTA_M = ['pixel', 'voxel', 'iso', 'lowpoly', 'wire', 'toon', 'paper', 'galaxy', 'dither', 'ascii', 'info'];
function renderMar(nm) { const c = mk(W, H); EM[nm](c.getContext('2d')); return c.toDataURL('image/png'); }
