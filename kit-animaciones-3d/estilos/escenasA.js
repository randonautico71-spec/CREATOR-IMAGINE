'use strict';
const ESC = {};

// 1 · PIXEL ART 3D — isla al atardecer calculada a 216×384 y escalada ×5
ESC.pixel = (ctx, t = 0) => {
  const lw = 216, lh = 384, c = mk(lw, lh), g = c.getContext('2d');
  const cam = camera(rotY([0, 7.5, 27], .22 * Math.sin(t * .35)), [0, 1.4, 0], { fov: 36, w: lw, h: lh });
  const hz = cam.P([0, 0, -4000])[1];
  const R = rng(7 + Math.floor(t * 6));
  g.fillStyle = lin(g, 0, 0, 0, hz, [['#1d1442', 0], ['#3a1d5c', .3], ['#8e3466', .62], ['#e0605e', .86], ['#ff9a5a', 1]]);
  g.fillRect(0, 0, lw, Math.ceil(hz));
  g.fillStyle = '#ffe9a8'; for (let i = 0; i < 45; i++) g.fillRect((R() * lw) | 0, (R() * hz * 0.45) | 0, 1, 1);
  const sx = lw * 0.27, sy = hz - 4;
  g.fillStyle = '#ffc27a'; g.beginPath(); g.arc(sx, sy, 30, 0, 7); g.fill();
  g.fillStyle = '#ffe9a8'; g.beginPath(); g.arc(sx, sy, 22, 0, 7); g.fill();
  g.fillStyle = '#e0605e'; for (let k = 0; k < 4; k++) g.fillRect(sx - 32, sy - 14 + k * 4, 64, 1 + (k >> 1));
  g.fillStyle = '#b8406e'; for (const [x, y, w] of [[120, -62, 64], [138, -57, 40], [14, -96, 52], [30, -92, 30], [150, -118, 40]]) g.fillRect(x, (hz + y) | 0, w, 3);
  g.fillStyle = lin(g, 0, hz, 0, lh, [['#8e3466', 0], ['#4a2463', .25], ['#1d1442', 1]]); g.fillRect(0, Math.floor(hz), lw, lh);
  for (let y = Math.ceil(hz); y < lh; y += 2) { const t = (y - hz) / (lh - hz); const w = (1 - t) * 30 + R() * 8; g.globalAlpha = 1 - t * .75; g.fillStyle = t < .3 ? '#ffc27a' : '#e0605e'; g.fillRect((sx - w / 2 + (R() - .5) * 6) | 0, y, w | 0, 1); }
  g.globalAlpha = 1; g.fillStyle = '#b8406e'; for (let i = 0; i < 70; i++) g.fillRect((R() * lw) | 0, (hz + R() * (lh - hz)) | 0, (2 + R() * 6) | 0, 1);
  const F = [];
  const hf = (x, z) => Math.max(-0.3, (1 - Math.hypot(x, z * 1.25) / 6.2) * 2.2 + (fbm3(x * .32 + 5, z * .32, 2.1, 4) - .5) * 2.4 + 3.6 * Math.exp(-((x + 1.6) ** 2 + (z + 1.2) ** 2) / 4.5));
  const N = 40, S = 7.5, st = 2 * S / N;
  const colH = (h, i, j) => h < -0.24 ? hex('#a8507a') : h < 0.45 ? hex('#e8c07a') : h < 2.2 ? hex(hash3(i, j, 3) > .5 ? '#5f9e3f' : '#528f3a') : h < 3.6 ? hex('#3e7a3a') : hex('#8a7a6e');
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const x0 = -S + i * st, x1 = x0 + st, z0 = -S + j * st, z1 = z0 + st;
    const a = [x0, hf(x0, z0), z0], b = [x0, hf(x0, z1), z1], cc = [x1, hf(x1, z0), z0], d = [x1, hf(x1, z1), z1];
    if (Math.max(a[1], b[1], cc[1], d[1]) < -0.25) continue;
    F.push(tri(a, b, cc, colH((a[1] + b[1] + cc[1]) / 3, i, j)), tri(cc, b, d, colH((cc[1] + b[1] + d[1]) / 3, i, j + 99)));
  }
  const palm = (bx, bz, lean, hgt, ang) => {
    lean += .12 * Math.sin(t * 1.6 + bx);
    const by = hf(bx, bz); let p = [bx, by, bz]; const segs = 7;
    for (let k = 0; k < segs; k++) { const t = (k + 1) / segs; const q = [bx + Math.cos(ang) * lean * t * t, by + hgt * t, bz + Math.sin(ang) * lean * t * t]; const w = .12 * (1 - t * .4), mx = (p[0] + q[0]) / 2, mz = (p[2] + q[2]) / 2; box(F, mx - w, p[1], mz - w, mx + w, q[1], mz + w, hex(k % 2 ? '#8a5a3a' : '#6e4630')); p = q; }
    for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283 + .3, cs = Math.cos(a), sn = Math.sin(a); const mid = add(p, [cs * .8, .25, sn * .8]), tip = add(p, [cs * 1.5, -.55, sn * 1.5]), sd = [-sn * .3, 0, cs * .3]; const col = hex(k % 2 ? '#3f8f3a' : '#2f7a35'); F.push(tri(p, add(mid, sd), tip, col, { two: true }), tri(p, tip, sub(mid, sd), col, { two: true })); }
  };
  palm(2.9, 1.6, 1.2, 2.6, 0.2); palm(3.8, 0.2, 0.9, 2.1, -0.4); palm(-3.4, 2.2, 1.0, 2.4, 2.9); palm(0.9, 3.4, 0.7, 2.0, 1.4);
  render(g, cam, F, { light: [-0.7, 0.5, 0.45], amb: .4, lightCol: [1.2, .82, .6], ambCol: [.6, .45, .8], seam: .6 });
  quantize(g, lw, lh, ['#1d1442', '#2e1d55', '#3a1d5c', '#4a2463', '#6b2a5e', '#8e3466', '#a8507a', '#b8406e', '#e0605e', '#ff9a5a', '#ffc27a', '#ffe9a8', '#e8c07a', '#c9955a', '#9a6a44', '#6e4630', '#4a3030', '#7fae4a', '#5f9e3f', '#4a8a3a', '#3e7a3a', '#2a5a35', '#1f3f30', '#8a7a6e', '#5a4e52'].map(hex));
  ctx.imageSmoothingEnabled = false; ctx.drawImage(c, 0, 0, W, H);
};

// 2 · VÓXEL — isla flotante de cubos
ESC.voxel = (ctx, t = 0) => {
  ctx.fillStyle = lin(ctx, 0, 0, 0, H, [['#5fb8f5', 0], ['#a9dcfb', .55], ['#e9f7ff', 1]]); ctx.fillRect(0, 0, W, H);
  const R0 = rng(2); ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (let i = 0; i < 9; i++) { const x = (R0() * W + t * 25 * (1 + i % 3)) % (W + 400) - 200, y = 200 + R0() * 1500, w = 160 + R0() * 260; ctx.beginPath(); ctx.roundRect(x - w / 2, y, w, 34 + R0() * 20, 20); ctx.fill(); }
  const vox = new Map(), key = (x, y, z) => x + ',' + y + ',' + z, set = (x, y, z, t) => vox.set(key(x, y, z), { x, y, z, t });
  const top = new Map();
  for (let x = -12; x <= 12; x++) for (let z = -12; z <= 12; z++) {
    const r = Math.hypot(x, z), m = 10.5 * (0.82 + 0.3 * vnoise3(x * .25 + 10, z * .25, 0)); if (r > m) continue; const e = 1 - r / m;
    let ht = Math.round(3 + e * 3 + (fbm3(x * .15, z * .15, 3, 3) - .45) * 6 + 4 * Math.exp(-((x + 4) ** 2 + (z + 3) ** 2) / 10));
    const bot = -Math.round(1 + Math.pow(e, 0.7) * 8 + vnoise3(x * .5, z * .5, 5) * 2);
    const pond = Math.hypot(x - 3, z - 3) < 2.6; if (pond) ht = 2;
    for (let y = bot; y <= ht; y++) set(x, y, z, y === ht ? (ht <= 3 ? 'sand' : 'grass') : y > ht - 3 ? 'dirt' : 'stone');
    if (pond) set(x, 3, z, 'water');
    top.set(x + ',' + z, ht);
  }
  const Rt = rng(5), trees = [];
  for (let k = 0; k < 400 && trees.length < 9; k++) {
    const x = Math.round((Rt() - .5) * 18), z = Math.round((Rt() - .5) * 18), ht = top.get(x + ',' + z);
    if (ht === undefined || ht < 4 || Math.hypot(x - 3, z - 3) < 4 || (x > -4 && x < 1 && z > 3 && z < 8) || trees.some(t => Math.hypot(t[0] - x, t[1] - z) < 3.6)) continue;
    trees.push([x, z]);
    const th = 3 + (Rt() > .5 ? 1 : 0);
    for (let y = 1; y <= th; y++) set(x, ht + y, z, 'wood');
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (let dy = 0; dy <= 2; dy++) if (Math.abs(dx) + Math.abs(dz) + dy <= 3 && !(dx === 0 && dz === 0 && dy === 0)) set(x + dx, ht + th + dy, z + dz, 'leaf');
  }
  // casita
  const hx = -3, hz0 = 4, g0 = top.get(hx + ',' + hz0) ?? 5;
  for (let x = hx; x < hx + 4; x++) for (let z = hz0; z < hz0 + 4; z++) { for (let y = (top.get(x + ',' + z) ?? g0); y <= g0; y++) set(x, y, z, 'dirt'); for (let y = g0 + 1; y <= g0 + 3; y++) set(x, y, z, 'plank'); }
  set(hx + 1, g0 + 1, hz0 + 3, 'door'); set(hx + 1, g0 + 2, hz0 + 3, 'door'); set(hx + 3, g0 + 2, hz0 + 1, 'glass'); set(hx + 3, g0 + 2, hz0 + 2, 'glass');
  for (let x = hx - 1; x < hx + 5; x++) for (let z = hz0 - 1; z < hz0 + 5; z++) set(x, g0 + 4, z, 'roof');
  for (let x = hx; x < hx + 4; x++) for (let z = hz0; z < hz0 + 4; z++) set(x, g0 + 5, z, 'roof');
  for (let x = hx + 1; x < hx + 3; x++) for (let z = hz0 + 1; z < hz0 + 3; z++) set(x, g0 + 6, z, 'roof');
  // nubes de cubos
  for (const [cx, cy, cz, n] of [[-14, 9, -6, 6], [12, 12, -10, 5], [-10, -6, 10, 4]]) for (let i = -n; i <= n; i++) for (let j = -2; j <= 2; j++) if (Math.abs(i) / n + Math.abs(j) / 2.5 < 1.1) { set(cx + i, cy, cz + j, 'cloud'); if (Math.abs(i) < n / 2 && Math.abs(j) < 2) set(cx + i, cy + 1, cz + j, 'cloud'); }
  const C = { grass: '#6cc04a', grassSide: '#7aa845', dirt: '#8a6239', stone: '#8b8d94', sand: '#e3cf8f', wood: '#7a4e2a', leaf: '#3f9a45', plank: '#c89a5b', roof: '#b5523b', glass: '#9fd8ff', door: '#6b3f22', water: '#4fa8e0', cloud: '#ffffff' };
  const F = [], dirs = [['top', 0, 1, 0], ['bottom', 0, -1, 0], ['right', 1, 0, 0], ['left', -1, 0, 0], ['front', 0, 0, 1], ['back', 0, 0, -1]];
  const all = { top: 1, bottom: 1, right: 1, left: 1, front: 1, back: 1 };
  for (const v of vox.values()) for (const [nm, dx, dy, dz] of dirs) {
    const nb = vox.get(key(v.x + dx, v.y + dy, v.z + dz));
    if (v.t === 'water' ? (nm !== 'top' || nb) : (nb && nb.t !== 'water' && !(nb.t === 'cloud') === !(v.t === 'cloud'))) continue;
    let col = hex(v.t === 'grass' && nm !== 'top' ? C.grassSide : C[v.t]);
    col = jit(col, 0.92 + 0.14 * hash3(v.x, v.y, v.z));
    if (v.t === 'stone' || v.t === 'dirt') col = jit(col, 0.75 + 0.25 * clamp((v.y + 9) / 14));
    const sk = { ...all }; delete sk[nm];
    box(F, v.x, v.y, v.z, v.x + 1, v.y + 1, v.z + 1, col, { skip: sk, f: (v.t === 'glass' ? { emit: true } : {}) });
  }
  const cam = camera(rotY([27, 21 + Math.sin(t * .8) * .6, 33], t * .2), [0, -0.5 + Math.sin(t * .8) * .6, 0], { fov: 44 });
  render(ctx, cam, F, { light: [0.45, 0.85, 0.3], amb: .5, lightCol: [1.05, 1, .92], ambCol: [.8, .88, 1.05], seam: .8 });
};

// 3 · ISOMÉTRICO / DIORAMA — habitación en corte
ESC.iso = (ctx, t = 0) => {
  ctx.fillStyle = lin(ctx, 0, 0, 0, H, [['#f6e9dc', 0], ['#ecd3bf', 1]]); ctx.fillRect(0, 0, W, H);
  const rv = rotY([30, 26, 30], .18 * Math.sin(t * .5)), cam = camera([4 + rv[0], 1.6 + rv[1], 4 + rv[2]], [4, 1.6, 4], { ortho: 92, cy: H * 0.5 });
  const sh = cam.P([4, -0.6, 4]); ctx.fillStyle = 'rgba(90,50,30,0.18)'; ctx.beginPath(); ctx.ellipse(sh[0], sh[1] + 140, 560, 200, 0, 0, 7); ctx.fill();
  const c = h => hex(h);
  const L1 = [], L2 = [];
  box(L1, 0, -0.6, 0, 8, -0.02, 8, c('#a8744a'), { side: c('#7a4e30') });
  for (let i = 0; i < 8; i++) box(L1, i, -0.02, 0, i + 1, 0, 8, c(i % 2 ? '#c8925a' : '#bd864f'), { skip: { bottom: 1 } });
  box(L1, -0.3, -0.6, 0, 0, 5, 8, c('#e9d6bd'), { right: c('#efdcc4') });
  box(L1, -0.3, -0.6, -0.3, 8, 5, 0, c('#f2e3cf'));
  box(L1, 0, 0, 0, 0.06, 0.35, 8, c('#fff7ec'));
  box(L1, 0, 0, 0, 8, 0.35, 0.06, c('#fff7ec'));
  box(L1, 2.0, 0.01, 3.7, 6.6, 0.04, 7.2, c('#c75b5b'));
  box(L1, 2.3, 0.04, 4.0, 6.3, 0.06, 6.9, c('#e8a35b'));
  box(L1, 2.6, 0.06, 4.3, 6.0, 0.07, 6.6, c('#c75b5b'));
  box(L1, 2.2, 1.8, 0, 5.4, 4.2, 0.08, c('#fbf6ef'));
  box(L1, 2.4, 2.0, 0.08, 5.2, 4.0, 0.09, c('#a8dcf5'), { f: { emit: true } });
  box(L1, 2.4, 2.9, 0.09, 5.2, 3.05, 0.12, c('#fbf6ef')); box(L1, 3.72, 2.0, 0.09, 3.88, 4.0, 0.12, c('#fbf6ef'));
  box(L1, 0, 2.3, 5.2, 0.05, 3.9, 6.9, c('#3e6ea8')); box(L1, 0.05, 2.5, 5.4, 0.07, 3.7, 6.7, c('#f2c14e'), { f: { emit: true } });
  // estantería con libros
  box(L2, 0, 2.6, 1.0, 0.7, 2.7, 4.2, c('#8a5a3a'));
  const bc = ['#d9534f', '#5bc0de', '#f0ad4e', '#5cb85c', '#7a5ac8', '#e07a5f', '#3d8bd9', '#e9c46a'];
  let zz = 1.1; for (let k = 0; k < 11; k++) { const w = 0.16 + hash3(k, 1, 1) * 0.12, hh = 0.5 + hash3(k, 2, 1) * 0.35; box(L2, 0.05, 2.7, zz, 0.6, 2.7 + hh, zz + w, c(bc[k % bc.length])); zz += w + 0.02; }
  // escritorio
  box(L2, 1.5, 1.6, 0.25, 5.6, 1.75, 2.0, c('#8a5a3a'), { top: c('#9a6844') });
  for (const [x, z] of [[1.6, 0.35], [5.4, 0.35], [1.6, 1.8], [5.4, 1.8]]) box(L2, x, 0, z, x + 0.12, 1.6, z + 0.12, c('#6b4228'));
  box(L2, 3.4, 1.75, 0.5, 3.8, 1.95, 0.8, c('#3a3a48'));
  box(L2, 2.7, 1.95, 0.5, 4.5, 3.0, 0.62, c('#2a2a35'));
  box(L2, 2.78, 2.03, 0.62, 4.42, 2.92, 0.63, c('#5ec8ff'), { f: { emit: true } });
  box(L2, 2.95, 1.75, 1.15, 4.25, 1.8, 1.6, c('#d8d8e0'));
  box(L2, 4.9, 1.75, 0.5, 5.3, 1.82, 0.9, c('#444'));
  box(L2, 5.05, 1.82, 0.65, 5.13, 2.6, 0.73, c('#555'));
  box(L2, 4.8, 2.5, 0.5, 5.4, 2.85, 1.0, c('#ffd166'), { f: { emit: true } });
  // silla
  box(L2, 2.9, 1.0, 2.3, 4.0, 1.12, 3.4, c('#3d8bd9'));
  box(L2, 2.9, 1.12, 3.28, 4.0, 2.3, 3.4, c('#3d8bd9'));
  for (const [x, z] of [[3.0, 2.4], [3.8, 2.4], [3.0, 3.2], [3.8, 3.2]]) box(L2, x, 0, z, x + 0.1, 1.0, z + 0.1, c('#333'));
  // cama
  box(L2, 0.2, 0, 4.9, 2.7, 0.7, 7.9, c('#8a5a3a'));
  box(L2, 0.25, 0.7, 4.95, 2.65, 1.0, 7.85, c('#f7f4ef'));
  box(L2, 0.2, 0.75, 6.1, 2.7, 1.06, 7.9, c('#4f7fbf'));
  box(L2, 0.45, 1.0, 5.15, 2.4, 1.25, 5.8, c('#ffffff'));
  box(L2, 0.2, 0.7, 4.9, 2.7, 1.8, 5.05, c('#7a4e30'));
  // planta
  box(L2, 6.6, 0, 0.5, 7.4, 0.8, 1.3, c('#c96f4a'));
  sphere(L2, [7.0, 1.5, 0.9], 0.75, 5, 8, (p, i, j) => c(hash3(i, j, 9) > .5 ? '#4caf50' : '#3b8f43'), { scale: [1, 1.2, 1] });
  // mesita y taza
  box(L2, 6.2, 0, 5.4, 7.6, 1.0, 6.6, c('#9a6844'));
  box(L2, 6.6, 1.0, 5.8, 6.9, 1.25, 6.1, c('#ffffff'));
  const opt = { light: [0.55, 0.85, 0.4], amb: .55, lightCol: [1.08, 1.0, .9], ambCol: [.95, .9, 1.0], seam: 1 };
  render(ctx, cam, L1, opt); render(ctx, cam, L2, opt);
};

// 4 · LOW-POLY — valle de montaña con lago
ESC.lowpoly = (ctx, t = 0) => {
  const cam = camera([0, 9, 34 - t * 1.4], [0, 5, -20 - t * 1.4], { fov: 46 });
  const hz = cam.P([0, 0, -1e4])[1];
  ctx.fillStyle = lin(ctx, 0, 0, 0, hz + 200, [['#7fb6df', 0], ['#bcdcec', .6], ['#f6e7c9', 1]]); ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,246,216,0.35)'; ctx.beginPath(); ctx.arc(W * 0.73, hz - 300, 170, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff6d8'; ctx.beginPath(); ctx.arc(W * 0.73, hz - 300, 95, 0, 7); ctx.fill();
  const hL = (x, z) => { const d = Math.abs(x + 3 * Math.sin(z * .06)) + Math.max(0, -(z + 38)) * .9; const mf = smooth(5, 24, d); const n = fbm3(x * .045, z * .045, 7, 5); const ridge = 1 - Math.abs(2 * n - 1); return mf * Math.pow(ridge, 1.6) * 30 + (fbm3(x * .12, z * .12, 2, 3) - .5) * 3 - 0.8; };
  const F = [], st = 2.6, xs = [], P = [];
  for (let i = 0; i <= 30; i++) { P[i] = []; for (let j = 0; j <= 38; j++) { const x = -39 + i * st + (hash3(i, j, 1) - .5) * 1.5, z = -75 + j * st + (hash3(i, j, 2) - .5) * 1.5; P[i][j] = [x, Math.max(0, hL(x, z)), z]; } }
  const colT = (pts) => {
    const h = (pts[0][1] + pts[1][1] + pts[2][1]) / 3, n = newell(pts), slope = 1 - Math.abs(n[1]), r = hash3(pts[0][0] * 10 | 0, pts[0][2] * 10 | 0, 4);
    if (pts.every(p => p[1] <= 0.001)) return jit(hex('#5aa7cf'), .95 + r * .1);
    if (h < .7) return hex('#d8c48e');
    if (h > 17 && slope < .55) return jit(hex('#f2f5fa'), .97 + r * .05);
    if (slope > .5 || h > 11) return jit(hex('#8f877a'), .88 + r * .2);
    return hex(['#86b552', '#74a548', '#93bf5c'][r * 3 | 0]);
  };
  for (let i = 0; i < 30; i++) for (let j = 0; j < 38; j++) { const a = P[i][j], b = P[i][j + 1], c = P[i + 1][j], d = P[i + 1][j + 1]; const t1 = [a, b, c], t2 = [c, b, d]; F.push(tri(...t1, colT(t1)), tri(...t2, colT(t2))); }
  const R = rng(11); let n = 0;
  for (let k = 0; k < 2000 && n < 85; k++) {
    const x = (R() - .5) * 60, z = -50 + R() * 70, h = hL(x, z); if (h < .9 || h > 8) continue;
    if (Math.abs(hL(x + 1, z) - h) + Math.abs(hL(x, z + 1) - h) > 1.2) continue;
    const s = .8 + R() * .7; n++;
    box(F, x - .12 * s, h - .3, z - .12 * s, x + .12 * s, h + .7 * s, z + .12 * s, hex('#6b4a2e'));
    const g1 = hex(R() > .5 ? '#2f6b3f' : '#3b7d47');
    lathe(F, [[0, h + 2.4 * s], [.95 * s, h + .6 * s], [0, h + .6 * s]], 6, () => g1, [x, h + 1.0 * s, z], x, z);
    lathe(F, [[0, h + 3.3 * s], [.7 * s, h + 1.6 * s], [0, h + 1.6 * s]], 6, () => g1, [x, h + 2.0 * s, z], x, z);
  }
  for (const [x, y, z, r] of [[-14, 26, -60, 5], [-8, 27, -62, 4], [18, 30, -70, 6], [24, 29, -66, 4]]) sphere(F, [x, y, z], r, 4, 7, () => hex('#ffffff'), { scale: [1.6, .55, 1] });
  render(ctx, cam, F, { light: [0.65, 0.55, 0.45], amb: .45, lightCol: [1.12, 1.0, .85], ambCol: [.75, .85, 1.05], fog: { near: 25, far: 120, col: hex('#f1e4cc'), max: .8 }, seam: 1 });
};

// 5 · WIREFRAME RETRO — synthwave
ESC.wire = (ctx, t = 0) => {
  const cam = camera([0, 2.4, 14], [0, 3.4, -20], { fov: 58 });
  const hz = cam.P([0, 0, -1e5])[1];
  ctx.fillStyle = lin(ctx, 0, 0, 0, hz, [['#090019', 0], ['#1c0638', .45], ['#4a0c5c', .82], ['#8a1a6b', 1]]); ctx.fillRect(0, 0, W, hz + 1);
  const R = rng(4); for (let i = 0; i < 260; i++) { ctx.fillStyle = `rgba(255,255,255,${.3 + R() * .7})`; const s = R() < .1 ? 3 : 2; ctx.fillRect(R() * W, R() * hz * .8, s, s); }
  const sx = W / 2, sy = hz - 230, sr = 300;
  let gr = ctx.createRadialGradient(sx, sy, sr * .8, sx, sy, sr * 1.7); gr.addColorStop(0, 'rgba(255,60,160,0.35)'); gr.addColorStop(1, 'rgba(255,60,160,0)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, hz);
  const sc = mk(W, H), sg = sc.getContext('2d');
  sg.fillStyle = lin(sg, 0, sy - sr, 0, sy + sr, [['#fff27a', 0], ['#ff9a3c', .5], ['#ff2e88', 1]]); sg.beginPath(); sg.arc(sx, sy, sr, 0, 7); sg.fill();
  sg.globalCompositeOperation = 'destination-out'; for (let k = 0; k < 9; k++) sg.fillRect(0, sy + sr * (0.02 + k * 0.11), W, 3 + k * 3.4);
  ctx.drawImage(sc, 0, 0);
  ctx.fillStyle = lin(ctx, 0, hz, 0, H, [['#1a0233', 0], ['#05000f', 1]]); ctx.fillRect(0, hz, W, H - hz);
  const line = (a, b, al) => { const p = cam.P(a), q = cam.P(b); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.strokeStyle = `rgba(255,47,208,${al * .22})`; ctx.lineWidth = 7; ctx.stroke(); ctx.strokeStyle = `rgba(255,90,220,${al})`; ctx.lineWidth = 2; ctx.stroke(); };
  for (let z = 13 - 2.5 + ((t * 9) % 2.5); z > -400; z -= 2.5) line([-200, 0, z], [200, 0, z], clamp(1 - (14 - z) / 260));
  for (let x = -90; x <= 90; x += 3) line([x, 0, 13], [x, 0, -400], .85);
  const F = [], st = 3.5;
  const hm = (x, z) => { const n = fbm3(x * .04, z * .04, 1, 4), r = 1 - Math.abs(2 * n - 1); return smooth(9, 40, Math.abs(x)) * r * r * 34; };
  for (let x = -75; x < 75; x += st) for (let z = -150; z < -28; z += st) {
    const a = [x, hm(x, z), z], b = [x, hm(x, z + st), z + st], c = [x + st, hm(x + st, z), z], d = [x + st, hm(x + st, z + st), z + st];
    if (Math.max(a[1], b[1], c[1], d[1]) < .3) continue; F.push(tri(a, b, c, [0, 0, 0]), tri(c, b, d, [0, 0, 0]));
  }
  render(ctx, cam, F, { two: true, wire: { fill: '#13002a', line: '#38f6ff', lw: 1.6, glow: 'rgba(56,246,255,0.16)', gw: 6 } });
  ctx.fillStyle = lin(ctx, 0, hz - 6, 0, hz + 30, [['rgba(255,80,200,0)', 0], ['rgba(255,80,200,0.55)', .25], ['rgba(255,80,200,0)', 1]]); ctx.fillRect(0, hz - 6, W, 36);
};

// 6 · TOON / CEL SHADING — cohete
ESC.toon = (ctx, t = 0) => {
  ctx.fillStyle = lin(ctx, 0, 0, 0, H, [['#2b2170', 0], ['#5b48b0', .6], ['#8f78d8', 1]]); ctx.fillRect(0, 0, W, H);
  const R = rng(9), ink = '#1b1440';
  const sparkle = (x, y, s) => { ctx.beginPath(); ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x, y, x + s, y); ctx.quadraticCurveTo(x, y, x, y + s); ctx.quadraticCurveTo(x, y, x - s, y); ctx.quadraticCurveTo(x, y, x, y - s); ctx.fill(); };
  ctx.fillStyle = '#fff6c9'; for (let i = 0; i < 40; i++) { const x = R() * W, y = (R() * H * .7 + t * 60) % (H * .7), s = 4 + R() * 14; sparkle(x, y, s * (.7 + .3 * Math.sin(t * 4 + i))); }
  // planeta con anillo
  const px = 230, py = 380, pr = 120;
  ctx.lineWidth = 8; ctx.strokeStyle = ink;
  ctx.fillStyle = '#ff9f6b'; ctx.beginPath(); ctx.arc(px, py, pr, 0, 7); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(px, py, pr, 0, 7); ctx.clip(); ctx.fillStyle = '#e0744a'; ctx.beginPath(); ctx.arc(px + 60, py + 50, pr, 0, 7); ctx.fill(); ctx.fillStyle = '#ffc49c'; ctx.fillRect(px - pr, py - 30, 2 * pr, 22); ctx.restore();
  ctx.beginPath(); ctx.arc(px, py, pr, 0, 7); ctx.stroke();
  ctx.save(); ctx.translate(px, py); ctx.rotate(-0.35); ctx.beginPath(); ctx.ellipse(0, 0, pr * 1.75, pr * .45, 0, 0.12, Math.PI - 0.12); ctx.strokeStyle = ink; ctx.lineWidth = 22; ctx.stroke(); ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 10; ctx.stroke(); ctx.restore();
  // cohete 3D
  const bob = Math.sin(t * 2.2) * .25, F = [], tilt = p => { let q = rotY(p, -0.5 + t * .9); q = [q[0], q[1] + bob, q[2]]; q = sub(q, [0, 2.6, 0]); q = rotZ(q, -0.32); return add(q, [0, 2.6, 0]); };
  const prof = [[0, 6.3], [.45, 5.9], [.85, 5.2], [1.15, 4.3], [1.3, 3.3], [1.33, 2.1], [1.26, .9], [1.1, 0], [.8, -.5], [0, -.5]];
  const red = hex('#ef4b55'), cream = hex('#f6f0e4');
  lathe(F, prof, 48, (y) => (y > 4.6 || (y > .5 && y < .95)) ? red : cream, [0, 2.6, 0], 0, 0, tilt);
  lathe(F, [[.6, -.4], [.9, -1.1], [0, -1.1]], 24, () => hex('#7a7f96'), [0, -.7, 0], 0, 0, tilt);
  const ring = (zf, r, n) => Array.from({ length: n }, (_, k) => [r * Math.cos(-k / n * 6.283), 3.1 + r * Math.sin(-k / n * 6.283), zf]);
  F.push({ p: ring(1.38, .62, 28).reverse().map(tilt), col: hex('#c4cbe0') });
  F.push({ p: ring(1.39, .44, 28).reverse().map(tilt), col: hex('#5cc8ff'), zb: -0.02 });
  F.push({ p: Array.from({ length: 12 }, (_, k) => [-.17 + .1 * Math.cos(-k / 12 * 6.283), 3.27 + .1 * Math.sin(-k / 12 * 6.283), 1.4]).reverse().map(tilt), col: hex('#ffffff'), emit: true, zb: -0.04 });
  for (const a of [0, Math.PI, Math.PI / 2]) {
    const sh = [[1.15, 1.7], [2.45, -.5], [2.45, -1.2], [1.0, -.35]], t = .09;
    const P = (u, y, s) => tilt(rotY([u, y, s * t], -a));
    const fr = sh.map(([u, y]) => P(u, y, 1)), bk = sh.map(([u, y]) => P(u, y, -1)), fin = [{ p: fr, col: red }, { p: bk, col: red }];
    for (let k = 0; k < 4; k++) fin.push({ p: [fr[k], fr[(k + 1) % 4], bk[(k + 1) % 4], bk[k]], col: red });
    orientTo(fin, centroid([...fr, ...bk])); F.push(...fin);
  }
  const cam = camera([0, 1.8, 17], [0, 1.9, 0], { fov: 40 });
  const nz = cam.P(tilt([0, -1.1, 0]));
  // llama
  ctx.save(); ctx.translate(nz[0], nz[1]); ctx.rotate(-0.32);
  const flame = (w, h, col) => { ctx.beginPath(); ctx.moveTo(-w, 0); ctx.bezierCurveTo(-w, h * .45, -w * .2, h * .7, 0, h); ctx.bezierCurveTo(w * .2, h * .7, w, h * .45, w, 0); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); };
  ctx.lineWidth = 14; ctx.strokeStyle = ink; const fk = 1 + .12 * Math.sin(t * 23) + .06 * Math.sin(t * 37); flame(95, 470 * fk, '#ff7a2a'); ctx.stroke(); flame(62, 330 * fk, '#ffc93c'); flame(30, 190 * fk, '#fff7e0');
  ctx.restore();
  // estelas
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineCap = 'round';
  for (const [x, y0, l] of [[300, 1150, 160], [760, 1250, 200], [250, 1350, 110], [820, 1050, 120]]) { const y = 900 + ((y0 - 900 + t * 420) % 700); ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - l * .32, y + l); ctx.stroke(); }
  // cohete con contorno de silueta
  const rc = mk(W, H), rg = rc.getContext('2d');
  render(rg, cam, F, { light: [-0.55, 0.6, 0.6], amb: 0, toon: d => d > .55 ? 1 : d > .18 ? .8 : .6, seam: 1 });
  const sil = mk(W, H), sg = sil.getContext('2d'); sg.drawImage(rc, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = ink; sg.fillRect(0, 0, W, H);
  for (let k = 0; k < 20; k++) { const a = k / 20 * 6.283; ctx.drawImage(sil, Math.cos(a) * 8, Math.sin(a) * 8); }
  ctx.drawImage(rc, 0, 0);
  // nubes toon
  const cloud = (cx, cy, s) => {
    const bs = [[-1.4, .2, .7], [-.6, -.25, .95], [.4, -.4, 1.05], [1.3, .05, .8], [0, .35, .9]];
    ctx.fillStyle = ink; for (const [x, y, r] of bs) { ctx.beginPath(); ctx.arc(cx + x * s, cy + y * s, r * s + 9, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#c3c9f2'; for (const [x, y, r] of bs) { ctx.beginPath(); ctx.arc(cx + x * s, cy + y * s, r * s, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#ffffff'; for (const [x, y, r] of bs) { ctx.beginPath(); ctx.arc(cx + x * s - s * .08, cy + y * s - s * .16, r * s * .82, 0, 7); ctx.fill(); }
  };
  cloud(220, 1720, 120); cloud(860, 1780, 140); cloud(560, 1880, 150); cloud(900, 640, 70);
};
