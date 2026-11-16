'use strict';
// León en la sabana con el máximo detalle, un fotograma por estilo (1080×1920).
const LH = {};
const evitaLeon = (x, z) => Math.abs(z) < .45 && x > -2.3 && x < 1.8;   // sin hierba atravesando al león
function escenaSabana(F, R, o = {}) {
  sueloHD(F, -14, 14, -24, 9, o.st || .55, hSabHD, R);
  if (o.hierba !== false) hierba(F, R, o.nH || 5000, o.areaH || [-6, 6, -6, 5], hSabHD, { evita: (x, z) => evitaLeon(x - (o.lx || 0), z - (o.lz || 0)), h: o.hH || .4 });
  acaciaHD(F, -3.4, -4.2, 1.25, rng(3), o.acacia); acaciaHD(F, 5.5, -11, 1.5, rng(4), o.acacia); acaciaHD(F, -9, -17, 1.6, rng(5), o.acacia);
  roca(F, [2.4, .1, -1.6], .45); roca(F, [2.9, .05, -1.2], .28); roca(F, [-1.6, .02, 2.4], .22);
  if (o.termitero !== false) termitero(F, 3.6, -5.5, .8);
}
const OPT_SOL = { light: [-.55, .55, .6], amb: .42, lightCol: [1.18, .98, .78], ambCol: [.72, .78, 1.0] };

// 1 · PIXEL ART 3D (270×480 ×4, paleta de 40 colores)
LH.pixel = ctx => {
  const lw = 270, lh = 480, c = mk(lw, lh), g = c.getContext('2d'), R = rng(1);
  const cam = camera([3.9, 1.35, 6.0], [-.1, .95, 0], { fov: 38, w: lw, h: lh }), hz = cam.P([-1e4, 0, -1e4])[1];
  cieloSabana(g, lw, lh, hz, { stops: [['#2b1d4e', 0], ['#6b2a5e', .35], ['#d0506a', .6], ['#ff8a4a', .85], ['#ffc27a', 1]], sol: [.3, -.07], nubes: 0 });
  const F = []; escenaSabana(F, R, { nH: 2600, hH: .3, areaH: [-8, 7, -9, 1.0] }); leonMallaHD(F, { rot: -.35, lat: 10, lon: 14, resMecha: 5 });
  render(g, cam, F, { ...OPT_SOL, light: [-.7, .4, .5], lightCol: [1.3, .85, .6], ambCol: [.6, .45, .75], seam: .6 });
  quantize(g, lw, lh, ['#2b1d4e', '#3a1d5c', '#4a2463', '#6b2a5e', '#8e3466', '#b8406e', '#d0506a', '#e8705e', '#ff8a4a', '#ffa860', '#ffc27a', '#ffe0a8', '#fff3d6',
    '#2a1810', '#46281a', '#6a3e22', '#8a5a34', '#a8723e', '#c08a4c', '#d6a462', '#e8bf80', '#f2d8a8', '#f8ead0', '#3c2a3a', '#5a4048', '#7a5a50', '#9a7a62',
    '#4a5a2a', '#62722e', '#7a8a3a', '#96a04a', '#b0a050', '#c9a456', '#5a4a3a', '#7a6a58', '#9a8a76', '#1a1010', '#9a3a2a', '#c25a3a', '#e0c070'].map(hex));
  ctx.imageSmoothingEnabled = false; ctx.drawImage(c, 0, 0, W, H);
};

// 2 · VÓXEL (vóxel de 0,05)
LH.voxel = ctx => {
  ctx.fillStyle = lin(ctx, 0, 0, 0, H, [['#5aa8e6', 0], ['#a9d4f0', .45], ['#ffe2b0', .8], ['#ffc98a', 1]]); ctx.fillRect(0, 0, W, H);
  const R0 = rng(2); ctx.fillStyle = 'rgba(255,255,255,0.6)'; for (let i = 0; i < 8; i++) { const x = R0() * W, y = 150 + R0() * 700, w = 140 + R0() * 260; ctx.fillRect(x - w / 2, y, w, 30); ctx.fillRect(x - w / 3, y - 24, w * .6, 26); }
  const u = .05, vox = new Map(), key = (i, j, k) => i + ',' + j + ',' + k, set = (i, j, k, col) => vox.set(key(i, j, k), { i, j, k, col }), R = rng(8);
  for (let i = -48; i <= 48; i++) for (let k = -30; k <= 30; k++) {
    if ((i / 49) ** 2 + (k / 31) ** 2 > 1 + .08 * vnoise3(i * .1, k * .1, 1)) continue;
    const top = Math.round(vnoise3(i * .06, k * .06, 2) * 3), seco = vnoise3(i * .08, k * .08, 4) > .6;
    for (let j = -9 + Math.round(vnoise3(i * .2, k * .2, 3) * 3); j <= top; j++) set(i, j, k, j === top ? jit(hex(seco ? '#a89058' : '#cfa95a'), .9 + .15 * R()) : j > top - 3 ? hex('#8a6239') : j > top - 6 ? hex('#7a5a40') : hex('#8b7f72'));
    if (R() < .18 && Math.abs(k) > 7) { const hh = 1 + (R() * 3 | 0); for (let j = 1; j <= hh; j++) set(i, top + j, k, jit(hex('#d9b868'), .9 + .2 * R())); }
  }
  const P = leonPartesHD(.2, { mechas: 120 }), rot = -.35;
  for (let i = -48; i <= 40; i++) for (let j = 0; j <= 30; j++) for (let k = -9; k <= 9; k++) {
    const loc = rotY([i * u, j * u, k * u], -rot), r = leonDentroHD(loc[0] + .1, loc[1] + .03, loc[2], P);
    if (r) set(i, j + 1, k, leonColorHD([loc[0] + .1, loc[1] + .03, loc[2]], r[0], r[1]));
  }
  for (let j = 1; j <= 26; j++) { set(-30 + (j > 18 ? 1 : 0), j, -18, hex('#5a4030')); set(-31, j, -18, hex('#4a3426')); }
  for (let i = -46; i <= -14; i++) for (let k = -28; k <= -8; k++) { const d = ((i + 30) / 16) ** 2 + ((k + 18) / 10) ** 2; if (d < 1 && R() < .92) { set(i, 27, k, jit(hex('#6f8a3a'), .85 + .3 * R())); if (d < .55) set(i, 28, k, jit(hex('#7f9a46'), .85 + .3 * R())); } }
  for (const [ci, ck, rr] of [[30, -14, 5], [36, -10, 3]]) for (let i = -rr; i <= rr; i++) for (let j = 0; j <= rr; j++) for (let k = -rr; k <= rr; k++) if (i * i + (j * 1.6) ** 2 + k * k <= rr * rr) set(ci + i, j + 1, ck + k, jit(hex('#8a8070'), .85 + .3 * R()));
  for (let j = 1; j <= 20; j++) { const r = Math.max(1, Math.round(5 * (1 - j / 22))); for (let i = -r; i <= r; i++) for (let k = -r; k <= r; k++) if (i * i + k * k <= r * r) set(38 + i, j, -22 + k, jit(hex('#a8623c'), .85 + .3 * R())); }
  const F = [], dirs = [['top', 0, 1, 0], ['bottom', 0, -1, 0], ['right', 1, 0, 0], ['left', -1, 0, 0], ['front', 0, 0, 1], ['back', 0, 0, -1]], all = { top: 1, bottom: 1, right: 1, left: 1, front: 1, back: 1 };
  for (const v of vox.values()) for (const [nm, a, b, c] of dirs) { if (vox.get(key(v.i + a, v.j + b, v.k + c))) continue; const sk = { ...all }; delete sk[nm]; box(F, v.i * u, v.j * u, v.k * u, (v.i + 1) * u, (v.j + 1) * u, (v.k + 1) * u, v.col, { skip: sk }); }
  render(ctx, camera([3.4, 2.6, 4.4], [-.25, .35, 0], { fov: 44 }), F, { light: [.5, .8, .35], amb: .5, lightCol: [1.12, 1, .86], ambCol: [.78, .85, 1.08], seam: .7 });
};

// 3 · ISOMÉTRICO / DIORAMA
LH.iso = ctx => {
  ctx.fillStyle = lin(ctx, 0, 0, 0, H, [['#f7ecdf', 0], ['#eed6c0', 1]]); ctx.fillRect(0, 0, W, H);
  const cam = camera([30, 25, 30], [0, .55, 0], { ortho: 165, cy: H * .52 }), sh = cam.P([0, -1, 0]), R = rng(6);
  ctx.fillStyle = 'rgba(90,50,30,0.16)'; ctx.beginPath(); ctx.ellipse(sh[0], sh[1] + 170, 520, 180, 0, 0, 7); ctx.fill();
  const S = [], A = [], hf = (x, z) => 0;
  const estratos = [['#7a5034', -.75], ['#8e6040', -.5], ['#a87a50', -.28], ['#6e5a3a', -.1]];
  let y0 = -1.0; for (const [col, y1] of estratos) { box(S, -2.7, y0, -2.7, 2.7, y1, 2.7, hex(col), { skip: { top: 1 } }); y0 = y1; }
  for (let i = 0; i < 18; i++) for (let k = 0; k < 18; k++) { const x = -2.7 + i * .3, z = -2.7 + k * .3; box(S, x, -.1, z, x + .3, 0, z + .3, jit(hex(vnoise3(i * .3, k * .3, 1) > .6 ? '#b49a5a' : '#cfa95a'), .9 + .15 * R()), { skip: { bottom: 1 } }); }
  lathe(S, [[0, .005], [.75, .005], [.75, -.02], [0, -.02]], 24, () => hex('#5fa2c8'), [1.4, 0, 1.4], 1.4, 1.4).forEach(f => f.emit = true);
  lathe(S, [[0, .012], [.48, .012], [.48, 0], [0, 0]], 20, () => hex('#9ad0ea'), [1.45, 0, 1.3], 1.45, 1.3).forEach(f => { f.emit = true; f.zb = -.01; });
  hierba(A, R, 1600, [-2.6, 2.6, -2.6, 2.6], hf, { evita: (x, z) => (Math.hypot(x - 1.4, z - 1.4) < .85) || (Math.abs(z + .2 + x * .55) < .45 && x > -1.6 && x < 1.5), h: .28 });
  acaciaHD(A, -1.7, -1.7, .85, rng(3), { clumps: 22 }); termitero(A, 1.9, -1.8, .5);
  roca(A, [-1.9, .05, 1.4], .3); roca(A, [-1.5, .02, 1.75], .18); roca(A, [.6, .02, 2.2], .14);
  leonMallaHD(A, { pos: [.05, 0, -.15], rot: .55, esc: .78, lat: 12, lon: 16 });
  const o = { light: [.55, .85, .4], amb: .55, lightCol: [1.1, 1, .88], ambCol: [.95, .9, 1.02], seam: 1 };
  render(ctx, cam, S, o); render(ctx, cam, A, o);
};

// 4 · LOW-POLY (facetado, con mucho entorno)
LH.lowpoly = ctx => {
  const cam = camera([4.8, 1.5, 7.6], [-.2, 1.05, -2], { fov: 42 }), hz = cam.P([0, 0, -1e4])[1], R = rng(3);
  cieloSabana(ctx, W, H, hz, { sol: [.22, -.12], nubes: 0, siluetas: false, aves: true, colinas: [] });
  const F = [], hf = (x, z) => Math.max(0, hSabHD(x, z) + smooth(16, 42, -z) * 9 * vnoise3(x * .07, 0, 3) + smooth(30, 50, -z) * 14 * Math.max(0, 1 - Math.abs(x - 8) / 14));
  for (let i = 0; i < 34; i++) for (let j = 0; j < 36; j++) {
    const P = (a, b) => { const x = -26 + a * 1.6 + (hash3(a, b, 1) - .5) * .9, z = -55 + b * 1.75 + (hash3(a, b, 2) - .5) * .9; return [x, hf(x, z), z]; };
    const a = P(i, j), b = P(i, j + 1), c = P(i + 1, j), d = P(i + 1, j + 1);
    const col = t => { const h = (t[0][1] + t[1][1] + t[2][1]) / 3, n = newell(t), sl = 1 - Math.abs(n[1]); if (h > 9 && sl < .5) return jit(hex('#f2f0ea'), .96 + .06 * R()); if (h > 1.5) return jit(hex(sl > .45 ? '#9a8a78' : '#b0a080'), .9 + .2 * R()); return jit(hex(['#d4b062', '#c9a456', '#bf9a4c', '#b8ad5a', '#a8a050'][R() * 5 | 0]), 1); };
    F.push(tri(a, b, c, col([a, b, c])), tri(c, b, d, col([c, b, d])));
  }
  for (const [x, z, s] of [[-4.2, -7, 1.5], [6, -15, 1.9], [-10, -21, 1.7], [12, -26, 2], [-2, -30, 1.8]]) acaciaHD(F, x, z, s, rng(x * 7 | 0), { seg: 4, latC: 2, lonC: 5, clumps: 14 });
  for (let i = 0; i < 40; i++) { const x = (R() - .5) * 16, z = -10 + R() * 14; if (evitaLeon(x, z)) continue; const y = hf(x, z), h = .25 + R() * .35; lathe(F, [[0, y + h], [.12 + R() * .08, y], [0, y]], 4, () => jit(hex('#d9b868'), .85 + .3 * R()), [x, y + h * .3, z], x, z); }
  for (const [x, z, r] of [[2.6, -1.5, .5], [3.1, -1.1, .3], [-2.2, 2.2, .3]]) roca(F, [x, .1, z], r, rng(x * 9 | 0), { lat: 3, lon: 5 });
  for (const [x, y, z, s] of [[-12, 13, -40, 3], [9, 15, -48, 4], [20, 12, -36, 2.5]]) sphere(F, [x, y, z], s, 3, 6, () => hex('#ffffff'), { scale: [2, .5, 1] });
  leonMallaHD(F, { rot: -.3, lat: 5, lon: 7, resMecha: 3, jit: .12 });
  render(ctx, cam, F, { ...OPT_SOL, fog: { near: 14, far: 70, col: hex('#f3dcb4'), max: .7 }, seam: 1 });
};

// 5 · WIREFRAME RETRO
LH.wire = ctx => {
  const cam = camera([4.4, 1.5, 7], [-.2, 1.1, -3], { fov: 52 }), hz = cam.P([0, 0, -1e5])[1], R = rng(4);
  ctx.fillStyle = lin(ctx, 0, 0, 0, hz, [['#090019', 0], ['#1c0638', .5], ['#5a0c5c', 1]]); ctx.fillRect(0, 0, W, hz + 1);
  for (let i = 0; i < 300; i++) { ctx.fillStyle = `rgba(255,255,255,${.3 + R() * .7})`; const s = R() < .1 ? 3 : 2; ctx.fillRect(R() * W, R() * hz * .85, s, s); }
  const sx = W * .7, sy = hz - 210, sr = 240, sc = mk(W, H), sg = sc.getContext('2d');
  let gr = ctx.createRadialGradient(sx, sy, sr * .8, sx, sy, sr * 1.7); gr.addColorStop(0, 'rgba(255,60,160,0.35)'); gr.addColorStop(1, 'rgba(255,60,160,0)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, hz);
  sg.fillStyle = lin(sg, 0, sy - sr, 0, sy + sr, [['#fff27a', 0], ['#ff9a3c', .5], ['#ff2e88', 1]]); sg.beginPath(); sg.arc(sx, sy, sr, 0, 7); sg.fill();
  sg.globalCompositeOperation = 'destination-out'; for (let k = 0; k < 9; k++) sg.fillRect(0, sy + sr * (.02 + k * .11), W, 3 + k * 3.2); ctx.drawImage(sc, 0, 0);
  ctx.fillStyle = lin(ctx, 0, hz, 0, H, [['#1a0233', 0], ['#05000f', 1]]); ctx.fillRect(0, hz, W, H - hz);
  const line = (a, b, al) => { const p = cam.P(a), q = cam.P(b); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.strokeStyle = `rgba(255,47,208,${al * .2})`; ctx.lineWidth = 7; ctx.stroke(); ctx.strokeStyle = `rgba(255,90,220,${al})`; ctx.lineWidth = 2; ctx.stroke(); };
  for (let z = 7; z > -220; z -= 1.5) line([-90, 0, z], [90, 0, z], clamp(1 - (7 - z) / 130));
  for (let x = -45; x <= 45; x += 1.5) line([x, 0, 7], [x, 0, -220], .8);
  const M = [], hm = (x, z) => { const n = fbm3(x * .05, z * .05, 1, 4), r = 1 - Math.abs(2 * n - 1); return smooth(8, 32, Math.abs(x)) * r * r * 26; };
  for (let x = -60; x < 60; x += 3) for (let z = -120; z < -25; z += 3) { const a = [x, hm(x, z), z], b = [x, hm(x, z + 3), z + 3], c = [x + 3, hm(x + 3, z), z], d = [x + 3, hm(x + 3, z + 3), z + 3]; if (Math.max(a[1], b[1], c[1], d[1]) < .3) continue; M.push(tri(a, b, c, [0, 0, 0]), tri(c, b, d, [0, 0, 0])); }
  render(ctx, cam, M, { two: true, wire: { fill: '#13002a', line: '#38f6ff', lw: 1.4, glow: 'rgba(56,246,255,0.14)', gw: 6 } });
  const A = []; acaciaHD(A, -3.8, -6, 1.7, rng(3), { seg: 5, latC: 3, lonC: 6, clumps: 16 });
  render(ctx, cam, A, { two: true, wire: { fill: '#0d0420', line: '#7cff9a', lw: 1.2, glow: 'rgba(124,255,154,0.14)', gw: 5 } });
  const T = []; leonMallaHD(T, { rot: -.3, lat: 10, lon: 14, resMecha: 5 });
  render(ctx, cam, T, { wire: { fill: '#1a0520', line: '#ffb03a', lw: 1.2, glow: 'rgba(255,160,40,0.22)', gw: 6 } });
};

// 6 · TOON / CEL SHADING
LH.toon = ctx => {
  ctx.fillStyle = lin(ctx, 0, 0, 0, H, [['#ffd98a', 0], ['#ffb870', .55], ['#ff9a5c', 1]]); ctx.fillRect(0, 0, W, H);
  const ink = '#2a1608', R = rng(9);
  ctx.lineWidth = 10; ctx.strokeStyle = ink;
  ctx.fillStyle = '#fff1c8'; ctx.beginPath(); ctx.arc(W * .74, 380, 130, 0, 7); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,240,200,.8)'; ctx.lineWidth = 8; for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; ctx.beginPath(); ctx.moveTo(W * .74 + Math.cos(a) * 160, 380 + Math.sin(a) * 160); ctx.lineTo(W * .74 + Math.cos(a) * 200, 380 + Math.sin(a) * 200); ctx.stroke(); }
  ctx.strokeStyle = ink;
  const nube = (x, y, s) => { const bs = [[-1.2, .2, .55], [-.5, -.2, .8], [.4, -.3, .85], [1.2, .1, .6]]; ctx.fillStyle = ink; for (const [a, b, r] of bs) { ctx.beginPath(); ctx.arc(x + a * s, y + b * s, r * s + 8, 0, 7); ctx.fill(); } ctx.fillStyle = '#fff6e6'; for (const [a, b, r] of bs) { ctx.beginPath(); ctx.arc(x + a * s, y + b * s, r * s, 0, 7); ctx.fill(); } };
  nube(260, 300, 70); nube(620, 620, 50);
  const hill = (y, col, a, f) => { ctx.beginPath(); ctx.moveTo(-20, H); for (let x = -20; x <= W + 20; x += 10) ctx.lineTo(x, y + a * Math.sin(x * f + y)); ctx.lineTo(W + 20, H); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 10; ctx.stroke(); };
  hill(960, '#c9a0a0', 40, .004); hill(1080, '#e6b064', 30, .006);
  const arbol = (x, y, s) => { ctx.lineWidth = 9; ctx.fillStyle = '#6a4630';
    ctx.beginPath(); ctx.moveTo(x - 10 * s, y); ctx.quadraticCurveTo(x - 4 * s, y - 80 * s, x + 4 * s, y - 130 * s); ctx.lineTo(x + 14 * s, y - 128 * s); ctx.quadraticCurveTo(x + 8 * s, y - 70 * s, x + 12 * s, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + 8 * s, y - 120 * s); ctx.lineTo(x + d * 90 * s, y - 175 * s); ctx.lineWidth = 12 * s; ctx.strokeStyle = ink; ctx.stroke(); ctx.lineWidth = 6 * s; ctx.strokeStyle = '#6a4630'; ctx.stroke(); }
    ctx.strokeStyle = ink; ctx.lineWidth = 9;
    for (let k = 0; k < 7; k++) { const cx = x + (k - 3) * 42 * s, cy = y - (185 + (k % 2) * 16) * s; ctx.fillStyle = k % 2 ? '#7a9a3c' : '#8aab48'; ctx.beginPath(); ctx.ellipse(cx, cy, 62 * s, 26 * s, 0, 0, 7); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = '#a6c45e'; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(x + (k - 2) * 46 * s, y - 196 * s, 30 * s, 8 * s, 0, 0, 7); ctx.fill(); } };
  arbol(200, 1150, 1.15); arbol(930, 1110, .75);
  ctx.lineWidth = 6; for (let i = 0; i < 70; i++) { const x = R() * W, y = 1300 + R() * 600, h = 30 + R() * 50; ctx.strokeStyle = ink; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 8, y - h * .6, x + (R() - .5) * 30, y - h); ctx.stroke(); ctx.strokeStyle = '#f2c070'; ctx.lineWidth = 3; ctx.stroke(); ctx.lineWidth = 6; }
  const rc = mk(W, H), rg = rc.getContext('2d'), F = []; leonMallaHD(F, { rot: -.45, lat: 18, lon: 26, resMecha: 8 });
  render(rg, camera([3.5, 1.25, 5.2], [-.15, .9, 0], { fov: 40, cy: H * .6 }), F, { light: [-.5, .7, .6], amb: 0, toon: d => d > .6 ? 1 : d > .22 ? .8 : .62, seam: 1 });
  const sil = mk(W, H), sg = sil.getContext('2d'); sg.drawImage(rc, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = ink; sg.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(42,22,8,.28)'; ctx.beginPath(); ctx.ellipse(W * .5, H * .815, 360, 55, 0, 0, 7); ctx.fill();
  for (let k = 0; k < 24; k++) { const a = k / 24 * 6.283; ctx.drawImage(sil, Math.cos(a) * 8, Math.sin(a) * 8); }
  ctx.drawImage(rc, 0, 0);
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(W * .62, H * .48, 60, 14, -.3, 0, 7); ctx.fill();
};

// 7 · 2.5D PAPERCRAFT
LH.paper = ctx => {
  ctx.fillStyle = lin(ctx, 0, 0, 0, H, [['#f7c27a', 0], ['#f9dca6', .45], ['#f4cf92', 1]]); ctx.fillRect(0, 0, W, H);
  const sombra = (p, n = 5, st = 4) => { for (let k = n; k >= 1; k--) { ctx.save(); ctx.translate(k * 1.5, -k * st); ctx.fillStyle = 'rgba(70,35,10,.07)'; ctx.fill(p); ctx.restore(); } };
  const pieza = (p, col) => { sombra(p); ctx.fillStyle = col; ctx.fill(p); };
  const sol = new Path2D(); sol.arc(W * .7, 470, 150, 0, 7); pieza(sol, '#fff1cc');
  const rayos = new Path2D(); for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283; rayos.moveTo(W * .7 + Math.cos(a) * 175, 470 + Math.sin(a) * 175); rayos.lineTo(W * .7 + Math.cos(a + .08) * 240, 470 + Math.sin(a + .08) * 240); rayos.lineTo(W * .7 + Math.cos(a + .16) * 175, 470 + Math.sin(a + .16) * 175); rayos.closePath(); }
  pieza(rayos, '#ffe2a0');
  const nube = (x, y, s, col) => { const p = new Path2D(); for (const [a, b, r] of [[-1.3, .2, .6], [-.5, -.2, .85], [.45, -.3, .95], [1.3, .15, .65]]) { p.moveTo(x + a * s + r * s, y + b * s); p.arc(x + a * s, y + b * s, r * s, 0, 7); } p.rect(x - 1.3 * s, y + .1 * s, 2.6 * s, .6 * s); pieza(p, col); };
  nube(250, 330, 70, '#fff4e4'); nube(800, 760, 50, '#fde8cc');
  const R = rng(11);
  const capas = [[930, 80, '#d9a8a0', 1], [1060, 90, '#e8b56c', 2], [1230, 70, '#dba058', 3], [1430, 60, '#c98a40', 4], [1650, 50, '#b0722e', 5], [1820, 40, '#94602a', 6]];
  for (const [y, a, col, ph] of capas) {
    const ys = x => y + a * (.6 * Math.sin(x * .005 + ph) + .4 * Math.sin(x * .013 + ph * 2)) + (vnoise3(x * .15, ph, 0) - .5) * 4;
    const p = new Path2D(); p.moveTo(-20, H); for (let x = -20; x <= W + 20; x += 6) p.lineTo(x, ys(x)); p.lineTo(W + 20, H); p.closePath();
    if (ph === 2 || ph === 3) for (const [x, s] of (ph === 2 ? [[180, .8], [940, .55]] : [[90, 1.15]])) { const b = ys(x) + 10; p.moveTo(x - 9 * s, b); p.lineTo(x - 4 * s, b - 150 * s); p.lineTo(x + 6 * s, b - 150 * s); p.lineTo(x + 11 * s, b); p.closePath(); p.moveTo(x, b - 140 * s); p.lineTo(x - 80 * s, b - 190 * s); p.lineTo(x - 74 * s, b - 198 * s); p.lineTo(x + 4 * s, b - 150 * s); p.closePath(); p.moveTo(x, b - 140 * s); p.lineTo(x + 80 * s, b - 190 * s); p.lineTo(x + 86 * s, b - 182 * s); p.lineTo(x + 8 * s, b - 132 * s); p.closePath(); for (let k = 0; k < 6; k++) p.ellipse(x + (k - 2.5) * 40 * s, b - (200 + (k % 2) * 14) * s, 52 * s, 20 * s, 0, 0, 7); }
    if (ph >= 4) for (let k = 0; k < 40; k++) { const x = R() * W, b = ys(x) + 8, h = 40 + R() * 60; p.moveTo(x - 6, b); p.lineTo(x + (R() - .5) * 20, b - h); p.lineTo(x + 6, b); p.closePath(); }
    pieza(p, col);
    if (ph === 4) {
      const rc = mk(W, H), rg = rc.getContext('2d'), F = []; leonMallaHD(F, { rot: -.3, lat: 12, lon: 16, resMecha: 6 });
      render(rg, camera([3.2, 1.05, 5.8], [.35, 1.0, 0], { fov: 40, cy: H * .56 }), F, { light: [-.4, .8, .5], amb: .5, toon: d => d > .55 ? 1 : d > .2 ? .82 : .66, seam: 1 });
      const sil = mk(W, H), sg = sil.getContext('2d'); sg.drawImage(rc, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = 'rgba(70,35,10,.3)'; sg.fillRect(0, 0, W, H);
      for (let k = 4; k >= 1; k--) { ctx.globalAlpha = .35; ctx.drawImage(sil, k * 2.5, k * 3.5); } ctx.globalAlpha = 1; ctx.drawImage(rc, 0, 0);
    }
  }
  const nz = ctx.getImageData(0, 0, W, H), d = nz.data, Rn = rng(77); for (let i = 0; i < d.length; i += 4) { const v = (Rn() - .5) * 14 + (vnoise3((i >> 2) % W * .02, Math.floor((i >> 2) / W) * .02, 9) - .5) * 10; d[i] += v; d[i + 1] += v; d[i + 2] += v; } ctx.putImageData(nz, 0, 0);
  ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1; for (let i = 0; i < 800; i++) { const x = Rn() * W, y = Rn() * H, a = Rn() * 6.28; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 16, y + Math.sin(a) * 16); ctx.stroke(); }
};

// 8 · PARTÍCULAS 3D (con z-buffer: solo la superficie visible)
LH.galaxy = ctx => {
  ctx.fillStyle = lin(ctx, 0, 0, 0, H, [['#02010a', 0], ['#0e0820', .55], ['#2a1430', 1]]); ctx.fillRect(0, 0, W, H);
  const R = rng(31); for (let i = 0; i < 2500; i++) { ctx.fillStyle = `rgba(255,255,255,${R() * .8})`; const s = R() < .04 ? 2 : 1; ctx.fillRect(R() * W, R() * H * .7, s, s); }
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9000; i++) { const t = R(), x = W * (t * 1.2 - .1) + (R() - .5) * 90, y = H * (.05 + t * .5) + (R() - .5) * 90; ctx.fillStyle = `rgba(${180 + R() * 70},${170 + R() * 60},255,${.05 + R() * .12})`; ctx.fillRect(x, y, 2, 2); }
  const cam = camera([3.5, 1.4, 5.4], [-.1, .9, 0], { fov: 40, cy: H * .58 }), pts = [], bin = 3, zb = new Float32Array(Math.ceil(W / bin) * Math.ceil(H / bin)).fill(1e9), bw = Math.ceil(W / bin);
  for (const pt of leonPuntosHD(180000, { rot: -.35 }, R)) { const q = cam.P(pt.p); if (q[2] <= 0) continue; const k = Math.floor(q[1] / bin) * bw + Math.floor(q[0] / bin); if (q[2] < zb[k]) zb[k] = q[2]; pts.push([q, pt.col, k, Math.max(.25, -dot(pt.n, norm(sub(pt.p, cam.eye))))]); }
  for (const [q, c, k, l] of pts) { if (q[2] > zb[k] + .04) continue; ctx.fillStyle = `rgba(${c[0] * 1.15 | 0},${c[1] * 1.05 | 0},${c[2] * .95 | 0},${.18 + .3 * l})`; ctx.fillRect(q[0] - 1.2, q[1] - 1.2, 2.4, 2.4); }
  const dot2 = (p, col, a, s) => { const q = cam.P(p); if (q[2] <= 0) return; ctx.fillStyle = `rgba(${col},${a})`; ctx.fillRect(q[0] - s / 2, q[1] - s / 2, s, s); };
  for (let i = 0; i < 26000; i++) { const x = (R() - .5) * 18, z = -10 + R() * 14, y = hSabHD(x, z) + (R() < .4 ? R() * .35 : 0); dot2([x, y, z], '220,180,100', .14, 2); }
  const Pa = []; acaciaHD(Pa, -2.8, -3.2, 1.2, rng(3)); for (const f of Pa) for (let k = 0; k < 3; k++) { const a = R(), b = R() * (1 - a), p = add(add(mul(f.p[0], 1 - a - b), mul(f.p[1], a)), mul(f.p[2], b)); dot2(p, f.col[1] > f.col[0] ? '130,220,130' : '220,170,120', .3, 2); }
  ctx.globalCompositeOperation = 'source-over';
};

// 9 · RETRO DE CONSOLA (270×480, 4 tonos tramados)
LH.dither = ctx => {
  const lw = 270, lh = 480, c = mk(lw, lh), g = c.getContext('2d'), R = rng(5);
  const cam = camera([4.2, 1.35, 6.4], [-.2, 1.0, 0], { fov: 42, w: lw, h: lh }), hz = cam.P([-1e4, 0, -1e4])[1];
  cieloSabana(g, lw, lh, hz, { stops: [['#606060', 0], ['#a0a0a0', .5], ['#e8e8e8', 1]], sol: [.25, -.12], nubes: 4, colinas: [['#b0b0b0', .04, .02]], silCol: 'rgba(120,120,120,.9)' });
  const F = []; escenaSabana(F, R, { nH: 2400, hH: .3, areaH: [-8, 7, -9, 1.0] }); leonMallaHD(F, { rot: -.3, lat: 10, lon: 14, resMecha: 5 });
  render(g, cam, F, { ...OPT_SOL, fog: { near: 8, far: 45, col: [232, 232, 232], max: .7 }, seam: .5 });
  const img = g.getImageData(0, 0, lw, lh), d = img.data, bay = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], pal = ['#142b1f', '#3b6b3a', '#8fb34a', '#d3e6a5'].map(hex);
  for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) { const i = (y * lw + x) * 4, l = clamp(((d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11) / 255 - .05) * 1.12), v = l * 3, k = Math.min(3, Math.floor(v) + ((v - Math.floor(v)) > (bay[y & 3][x & 3] + .5) / 16 ? 1 : 0)); d[i] = pal[k][0]; d[i + 1] = pal[k][1]; d[i + 2] = pal[k][2]; }
  g.putImageData(img, 0, 0); ctx.imageSmoothingEnabled = false; ctx.drawImage(c, 0, 0, W, H);
};

// 10 · ASCII 3D (celdas de 9×15: 120×128 caracteres de color)
LH.ascii = ctx => {
  const lw = 360, lh = 640, c = mk(lw, lh), g = c.getContext('2d'), R = rng(7);
  const cam = camera([3.6, 1.35, 5.4], [-.1, .95, 0], { fov: 40, w: lw, h: lh, cy: lh * .56 }), hz = cam.P([-1e4, 0, -1e4])[1];
  cieloSabana(g, lw, lh, hz, { sol: [.75, -.15], nubes: 3, aves: false });
  const F = []; escenaSabana(F, R, { nH: 1600, hH: .3, areaH: [-8, 7, -9, 1.0] }); leonMallaHD(F, { rot: -.35, lat: 12, lon: 16, resMecha: 6 });
  render(g, cam, F, { ...OPT_SOL, amb: .62, seam: .5 });
  const d = g.getImageData(0, 0, lw, lh).data, cw = 9, ch = 15, cols = 120, rows = 128, chars = ' .`,:;~-=+*!?%#&$@';
  ctx.fillStyle = '#05070a'; ctx.fillRect(0, 0, W, H); ctx.font = 'bold 14px "DejaVu Sans Mono", monospace'; ctx.textBaseline = 'top';
  for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
    let A = 0, G = 0, B = 0, n = 0; const gam = v => 255 * Math.pow(v / 255, .75); for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) { const yy = Math.floor(r * lh / rows) + y, xx = q * 3 + x; if (yy >= lh) continue; const i = (yy * lw + xx) * 4; A += d[i]; G += d[i + 1]; B += d[i + 2]; n++; }
    A /= n; G /= n; B /= n; const l = (A * .3 + G * .59 + B * .11) / 255, k = Math.min(chars.length - 1, Math.round(Math.pow(l, .8) * (chars.length - 1)));
    ctx.fillStyle = `rgba(${A | 0},${G | 0},${B | 0},.32)`; ctx.fillRect(q * cw, r * ch, cw, ch); ctx.fillStyle = `rgb(${Math.min(255, gam(A) * 1.25 + 30) | 0},${Math.min(255, gam(G) * 1.25 + 30) | 0},${Math.min(255, gam(B) * 1.25 + 25) | 0})`; ctx.fillText(chars[k], q * cw, r * ch);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
};

// 11 · INFOGRAFÍA 3D (partes del león, sin cifras)
LH.info = ctx => {
  ctx.fillStyle = lin(ctx, 0, 0, 0, H, [['#0e1424', 0], ['#1b2540', 1]]); ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(120,150,220,.07)'; ctx.lineWidth = 1; for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); } for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.fillStyle = '#fff'; ctx.font = 'bold 70px "DejaVu Sans", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Anatomía del león', W / 2, 180);
  ctx.fillStyle = '#9fb0d8'; ctx.font = '36px "DejaVu Sans", sans-serif'; ctx.fillText('modelo 3D por código', W / 2, 240);
  const rot = -.25, cam = camera([.6, 2.5, 11.5], [-.2, .75, 0], { fov: 33, cy: H * .56 }), F = [], P2 = [];
  lathe(P2, [[0, -.02], [2.0, -.02], [2.05, -.08], [2.05, -.3], [0, -.3]], 48, (y) => y > -.05 ? hex('#2c3a5c') : hex('#1f2a46'), [0, -.16, 0]);
  lathe(P2, [[0, -.015], [1.98, -.015], [1.98, -.02], [0, -.02]], 48, () => hex('#4a7ad8'), [0, -.01, 0]).forEach(f => { f.emit = true; f.zb = .01; });
  leonMallaHD(F, { rot, lat: 16, lon: 22, resMecha: 8 });
  const o = { light: [.4, .8, .55], amb: .5, seam: 1 }; render(ctx, cam, P2, o); render(ctx, cam, F, o);
  ctx.font = 'bold 44px "DejaVu Sans", sans-serif'; ctx.textAlign = 'left';
  const W2 = p => rotY(p, rot);
  const marca = (p, tx, ty, txt) => { const q = cam.P(W2(p)), w = ctx.measureText(txt).width, lx = tx + (q[0] < tx ? -10 : w + 10);
    ctx.strokeStyle = '#ffc23c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(lx, ty - 14); ctx.stroke();
    ctx.fillStyle = 'rgba(255,194,60,.25)'; ctx.beginPath(); ctx.arc(q[0], q[1], 16, 0, 7); ctx.fill(); ctx.fillStyle = '#ffc23c'; ctx.beginPath(); ctx.arc(q[0], q[1], 8, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(14,20,36,.75)'; ctx.fillRect(tx - 12, ty - 48, w + 24, 64); ctx.strokeStyle = 'rgba(255,194,60,.6)'; ctx.lineWidth = 2; ctx.strokeRect(tx - 12, ty - 48, w + 24, 64);
    ctx.fillStyle = '#fff'; ctx.fillText(txt, tx, ty); };
  const P = leonPartesHD(.2), cola = P.filter(q => q.part === 'borla')[0].c;
  marca([.95, 1.45, .1], 620, 470, 'Melena'); marca([1.35, 1.2, .12], 760, 640, 'Ojos'); marca([1.45, 1.08, .1], 740, 1010, 'Bigoteras');
  marca(cola, 60, 520, 'Borla de la cola'); marca([-.7, .88, .29], 60, 760, 'Cuartos traseros'); marca([.6, .98, .3], 60, 1350, 'Hombros');
  marca([.68, .03, .2], 700, 1440, 'Zarpas'); marca([-.05, .55, .26], 330, 1520, 'Vientre claro');
  ctx.textAlign = 'left';
};

const NOMBRES_HD = { pixel: 'Pixel art 3D', voxel: 'Vóxel', iso: 'Isométrico / diorama', lowpoly: 'Low-poly', wire: 'Wireframe retro', toon: 'Toon / cel shading', paper: '2.5D papercraft', galaxy: 'Partículas 3D', dither: 'Retro de consola', ascii: 'ASCII 3D', info: 'Infografía 3D' };
function renderHD(nm) { const c = mk(W, H); LH[nm](c.getContext('2d')); return c.toDataURL('image/png'); }
