'use strict';

// 7 · 2.5D PAPERCRAFT — capas de papel de noche
ESC.paper = (ctx, t = 0) => {
  ctx.fillStyle = lin(ctx, 0, 0, 0, H, [['#1f2d55', 0], ['#3f5c94', .45], ['#9cb3d6', .75]]); ctx.fillRect(0, 0, W, H);
  const shadowFill = (path, n = 4, step = 5, a = .08) => { for (let k = n; k >= 1; k--) { ctx.save(); ctx.translate(0, -k * step); ctx.fillStyle = `rgba(10,15,40,${a})`; ctx.fill(path); ctx.restore(); } };
  const R = rng(21);
  const star = (x, y, r) => { const p = new Path2D(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * .45 : r; k ? p.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a)) : p.moveTo(x + rr * Math.cos(a), y + rr * Math.sin(a)); } p.closePath(); return p; };
  for (let i = 0; i < 34; i++) { const p = star(R() * W, 80 + R() * 800, 6 + R() * 12); ctx.save(); ctx.translate(3, 4); ctx.fillStyle = 'rgba(10,15,40,.25)'; ctx.fill(p); ctx.restore(); ctx.fillStyle = '#f8eecf'; ctx.fill(p); }
  const moon = new Path2D(); moon.arc(W * .7, 380, 125, 0, 7);
  ctx.save(); ctx.translate(12, 16); ctx.fillStyle = 'rgba(10,15,40,.3)'; ctx.fill(moon); ctx.restore(); ctx.fillStyle = '#f7efd6'; ctx.fill(moon);
  ctx.fillStyle = '#e6d9b4'; for (const [x, y, r] of [[-40, -30, 26], [35, 20, 18], [-10, 55, 14], [50, -45, 11]]) { ctx.beginPath(); ctx.arc(W * .7 + x, 380 + y, r, 0, 7); ctx.fill(); }
  const cloud = (cx, cy, s, col) => { const p = new Path2D(); for (const [x, y, r] of [[-1.3, .2, .6], [-.5, -.2, .85], [.45, -.3, .95], [1.3, .15, .65]]) { p.moveTo(cx + x * s + r * s, cy + y * s); p.arc(cx + x * s, cy + y * s, r * s, 0, 7); } p.rect(cx - 1.3 * s, cy + .1 * s, 2.6 * s, .6 * s); ctx.save(); ctx.translate(8, 12); ctx.fillStyle = 'rgba(10,15,40,.22)'; ctx.fill(p); ctx.restore(); ctx.fillStyle = col; ctx.fill(p); };
  cloud(250 + t * 18, 560, 80, '#dfe6f3'); cloud(820 - t * 12, 760, 60, '#cfd9ec'); cloud(180 + t * 9, 900, 50, '#c2cfe6');
  const layers = [
    { y: 1000, amp: 120, col: '#7d9cc6', f: [.004, .011, .023], ph: 1 },
    { y: 1170, amp: 110, col: '#5f86b2', f: [.005, .013, .031], ph: 2, trees: 1 },
    { y: 1340, amp: 95, col: '#4a7397', f: [.0045, .012, .027], ph: 3, houses: 1 },
    { y: 1500, amp: 85, col: '#36597a', f: [.006, .015, .03], ph: 4, trees: 1 },
    { y: 1660, amp: 70, col: '#26435e', f: [.005, .014, .033], ph: 5 },
    { y: 1810, amp: 55, col: '#182f44', f: [.007, .016, .029], ph: 6, trees: 1 }];
  const lights = [];
  for (const L of layers) {
    const off = t * 14 * (1 + layers.indexOf(L) * .9), ys = x0 => { const x = x0 + off; return L.y + L.amp * (.55 * Math.sin(x * L.f[0] + L.ph) + .3 * Math.sin(x * L.f[1] + L.ph * 2) + .15 * Math.sin(x * L.f[2])) + (vnoise3(x * .15, L.ph, 0) - .5) * 4; };
    const p = new Path2D(); p.moveTo(-20, H + 20); for (let x = -20; x <= W + 20; x += 6) p.lineTo(x, ys(x)); p.lineTo(W + 20, H + 20); p.closePath();
    if (L.trees) { const Rt = rng(L.ph * 13); for (let k = 0; k < 9; k++) { const x = ((Rt() * W - off) % W + W) % W, b = ys(x) + 6, h = 70 + Rt() * 90, w = h * .42; for (let t = 0; t < 3; t++) { const yb = b - t * h * .28, ww = w * (1 - t * .25); p.moveTo(x - ww, yb); p.lineTo(x, yb - h * .55); p.lineTo(x + ww, yb); p.closePath(); } } }
    if (L.houses) for (const [x0, s] of [[300, 1], [395, .8], [700, 1.1]]) { const x = ((x0 - off) % (W + 200) + W + 200) % (W + 200) - 100; const b = ys(x) + 10, w = 70 * s, h = 60 * s; p.rect(x - w / 2, b - h, w, h); p.moveTo(x - w / 2 - 10, b - h); p.lineTo(x, b - h - 45 * s); p.lineTo(x + w / 2 + 10, b - h); p.closePath(); lights.push([x - w * .2, b - h * .65, 16 * s, 20 * s]); }
    shadowFill(p);
    ctx.fillStyle = L.col; ctx.fill(p);
    if (L.houses) { for (const [x, y, w, h] of lights) { const gr = ctx.createRadialGradient(x + w / 2, y + h / 2, 2, x + w / 2, y + h / 2, 70); gr.addColorStop(0, 'rgba(255,210,122,.45)'); gr.addColorStop(1, 'rgba(255,210,122,0)'); ctx.fillStyle = gr; ctx.fillRect(x - 70, y - 70, 160, 160); ctx.fillStyle = '#ffd27a'; ctx.fillRect(x, y, w, h); } }
  }
  // grano de papel (horneado una vez)
  const nz = ctx.getImageData(0, 0, W, H), d = nz.data, Rn = rng(77);
  for (let i = 0; i < d.length; i += 4) { const v = (Rn() - .5) * 14; d[i] += v; d[i + 1] += v; d[i + 2] += v; }
  ctx.putImageData(nz, 0, 0);
  ctx.strokeStyle = 'rgba(255,255,255,0.035)'; ctx.lineWidth = 1; for (let i = 0; i < 500; i++) { const x = Rn() * W, y = Rn() * H, a = Rn() * 6.28; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 18, y + Math.sin(a) * 18); ctx.stroke(); }
};

// 8 · PARTÍCULAS 3D — galaxia espiral
ESC.galaxy = (ctx, t = 0) => {
  ctx.fillStyle = '#02010a'; ctx.fillRect(0, 0, W, H);
  const R = rng(31); for (let i = 0; i < 1600; i++) { ctx.fillStyle = `rgba(255,255,255,${R() * .6})`; ctx.fillRect(R() * W, R() * H, R() < .05 ? 2 : 1, R() < .05 ? 2 : 1); }
  const g = () => { let s = 0; for (let k = 0; k < 4; k++) s += R(); return (s - 2) / 1.15; };
  const buckets = { core: [], arm: [], blue: [], pink: [] };
  const arms = 2, Nn = 120000;
  for (let i = 0; i < Nn; i++) {
    let p, b;
    if (i < Nn * .18) { const r = Math.abs(g()) * .2; const v = norm([g(), g() * .55, g()]); p = mul(v, r); b = 'core'; }
    else { const r = Math.pow(R(), .75), arm = (i % arms) * Math.PI, ang = arm + r * 4.6 + g() * .75 * (1.3 - r); const rr = r * (1 + g() * .08); p = [rr * Math.cos(ang), g() * .04 * (1.2 - r), rr * Math.sin(ang)]; const q = R(); b = q < .03 ? 'pink' : q < .08 ? 'blue' : r < .25 ? 'core' : 'arm'; }
    p = rotY(p, t * .12); p = rotX(p, 0.95); p = rotZ(p, 1.15);
    buckets[b].push(p);
  }
  ctx.globalCompositeOperation = 'lighter';
  const S = 520, cx = W / 2, cy = H / 2;
  const draw = (arr, col, a, s) => { ctx.fillStyle = `rgba(${col},${a})`; for (const p of arr) { const k = 1 / (1 + p[2] * .25); ctx.fillRect(cx + p[0] * S * k - s / 2, cy + p[1] * S * k - s / 2, s, s); } };
  draw(buckets.arm, '170,200,255', .22, 2); draw(buckets.core, '255,226,180', .3, 2.4); draw(buckets.blue, '120,170,255', .6, 3); draw(buckets.pink, '255,110,170', .25, 6);
  const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, 230); gr.addColorStop(0, 'rgba(255,240,210,.9)'); gr.addColorStop(.25, 'rgba(255,200,140,.35)'); gr.addColorStop(1, 'rgba(255,160,100,0)');
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
};

// 9 · RETRO DE CONSOLA — tramado de 4 tonos
ESC.dither = (ctx, t = 0) => {
  const lw = 180, lh = 320, c = mk(lw, lh), g = c.getContext('2d');
  const cam = camera([t * .9 - 3, 2.6, 20], [t * .9 - 3, 3.4, 0], { fov: 48, w: lw, h: lh });
  const hz = cam.P([0, 0, -1e4])[1];
  g.fillStyle = lin(g, 0, 0, 0, hz, [['#707070', 0], ['#c8c8c8', .7], ['#f4f4f4', 1]]); g.fillRect(0, 0, lw, hz + 2);
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(lw * .72, hz - 85, 20, 0, 7); g.fill(); g.fillStyle = '#dcdcdc'; g.beginPath(); g.arc(lw * .72, hz - 85, 28, 0, 7); g.globalAlpha = .5; g.fill(); g.globalAlpha = 1;
  g.fillStyle = '#e8e8e8'; for (const [x, y, w] of [[20, 60, 50], [40, 66, 40], [110, 40, 30]]) g.fillRect(x, y, w, 5);
  g.fillStyle = '#303030'; for (const [x, y] of [[40, 110], [52, 104], [60, 116]]) { g.fillRect(x, y, 3, 1); g.fillRect(x + 1, y - 1, 1, 1); }
  const F = [];
  const hd = (x, z) => .9 * Math.sin(x * .25 + z * .1) + .6 * Math.sin(z * .35 - x * .1) + (fbm3(x * .1, z * .1, 1, 3) - .5) * 2;
  for (let x = -40; x < 40; x += 2) for (let z = -90; z < 18; z += 2) { const a = [x, hd(x, z), z], b = [x, hd(x, z + 2), z + 2], cc = [x + 2, hd(x + 2, z), z], d = [x + 2, hd(x + 2, z + 2), z + 2]; F.push(tri(a, b, cc, hex('#c9b48a')), tri(cc, b, d, hex('#c9b48a'))); }
  const pyr = (cx, cz, s, h) => { const y0 = -0.8, A = [cx, y0 + h, cz], q = [[cx - s, y0, cz - s], [cx + s, y0, cz - s], [cx + s, y0, cz + s], [cx - s, y0, cz + s]], fs = []; for (let k = 0; k < 4; k++) fs.push(tri(q[k], q[(k + 1) % 4], A, hex('#d8c08a'))); orientTo(fs, [cx, y0 + h * .25, cz]); F.push(...fs); };
  pyr(-4, -12, 6.5, 7.5); pyr(7, -26, 5, 5.5); pyr(-15, -42, 4, 4);
  render(g, cam, F, { light: [-0.7, 0.45, 0.35], amb: .25, fog: { near: 15, far: 90, col: [235, 235, 235], max: .8 }, seam: .5 });
  const img = g.getImageData(0, 0, lw, lh), d = img.data;
  const bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  const pal = ['#142b1f', '#3b6b3a', '#8fb34a', '#d3e6a5'].map(hex);
  for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
    const i = (y * lw + x) * 4, l = clamp(((d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11) / 255 - .08) * 1.15);
    const v = l * 3, k = Math.min(3, Math.floor(v) + ((v - Math.floor(v)) > (bayer[y & 3][x & 3] + .5) / 16 ? 1 : 0)), p = pal[k];
    d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2];
  }
  g.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = false; ctx.drawImage(c, 0, 0, W, H);
};

// 10 · ASCII 3D — toro y esfera con caracteres
ESC.ascii = (ctx, t = 0) => {
  ctx.fillStyle = '#030a05'; ctx.fillRect(0, 0, W, H);
  const cw = 12, ch = 20, cols = 90, rows = 96, N = cols * rows;
  const lum = new Float32Array(N).fill(-1), zb = new Float32Array(N);
  const A = 0.95 + t * 1.1, B = 0.45 + t * .6, cA = Math.cos(A), sA = Math.sin(A), cB = Math.cos(B), sB = Math.sin(B), K1 = 720, K2 = 5, cyT = 640;
  for (let th = 0; th < 6.283; th += 0.012) for (let ph = 0; ph < 6.283; ph += 0.005) {
    const ct = Math.cos(th), st = Math.sin(th), cp = Math.cos(ph), sp = Math.sin(ph), ox = 2 + ct, oy = st;
    const x = ox * (cB * cp + sA * sB * sp) - oy * cA * sB, y = ox * (sB * cp - sA * cB * sp) + oy * cA * cB, z = K2 + cA * ox * sp + oy * sA, ooz = 1 / z;
    const ci = Math.floor((W / 2 + K1 * ooz * x) / cw), ri = Math.floor((cyT - K1 * ooz * y) / ch);
    if (ci < 0 || ci >= cols || ri < 0 || ri >= rows) continue;
    const L = cp * ct * sB - cA * ct * sp - sA * st + cB * (cA * st - ct * sA * sp), idx = ri * cols + ci;
    if (ooz > zb[idx]) { zb[idx] = ooz; lum[idx] = Math.max(.02, (L + .35) / 1.77); }
  }
  const Ls = norm([-0.55, 0.6, 0.6]), scy = 1450, sr = 360;
  for (let ri = 0; ri < rows; ri++) for (let ci = 0; ci < cols; ci++) {
    const dx = ((ci + .5) * cw - W / 2) / sr, dy = ((ri + .5) * ch - scy) / sr, q = dx * dx + dy * dy; if (q >= 1) continue;
    const n = [dx, -dy, Math.sqrt(1 - q)], lat = Math.asin(n[1]), lon = Math.atan2(n[0], n[2]) + 0.6 + t * .9;
    const band = .82 + .18 * Math.sin(lat * 9 + Math.sin(lon * 3) * .8);
    lum[ri * cols + ci] = Math.max(.01, dot(n, Ls)) * band;
  }
  const chars = '.,-~:;=!*#$@';
  ctx.font = 'bold 19px "DejaVu Sans Mono", monospace'; ctx.textBaseline = 'top';
  for (let i = 0; i < N; i++) { const L = lum[i]; if (L < 0) continue; const k = Math.min(11, Math.max(0, Math.floor(L * 12))); ctx.fillStyle = `rgba(110,255,150,${.5 + .5 * Math.min(1, L * 1.3)})`; ctx.fillText(chars[k], (i % cols) * cw, Math.floor(i / cols) * ch); }
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 2);
  const gr = ctx.createRadialGradient(W / 2, H / 2, H * .25, W / 2, H / 2, H * .7); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.65)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
};

// 11 · INFOGRAFÍA 3D — barras y tarta extruidas (valores de ejemplo, sin datos reales)
ESC.info = (ctx, t = 0) => {
  ctx.fillStyle = lin(ctx, 0, 0, 0, H, [['#0e1424', 0], ['#1b2540', 1]]); ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 64px "DejaVu Sans", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Gráfico de ejemplo', W / 2, 170);
  const cam = camera([3.2 + 14, 2 + 12.5, 1 + 19.5], [3.2, 2, 1], { ortho: 118, cy: 650 });
  const F = [], P2 = [];
  box(P2, -0.4, -0.35, -0.6, 6.8, 0, 1.8, hex('#26324f'), { top: hex('#2c3a5c') });
  const hs = [2.0, 3.1, 2.6, 4.2, 3.6, 5.3], cols = ['#2ec4b6', '#4fc3a1', '#8bc98a', '#c7c86e', '#ecb85a', '#ffbf46'];
  hs.forEach((h, i) => { const c = hex(cols[i]), k = smooth(0, 1, t / 1.2 - i * .12), hh = Math.max(.02, h * (k < 1 ? k : 1)); box(F, i * 1.08, 0, 0, i * 1.08 + .72, hh, .72, c, { top: jit(c, 1.25) }); });
  const opt = { light: [0.4, 0.8, 0.55], amb: .5, seam: 1 };
  render(ctx, cam, P2, opt); render(ctx, cam, F, opt);
  ctx.font = 'bold 44px "DejaVu Sans", sans-serif'; ctx.fillStyle = '#c9d4f0';
  hs.forEach((h, i) => { const p = cam.P([i * 1.08 + .36, -0.35, 1.8]); ctx.fillText('ABCDEF'[i], p[0] + 10, p[1] + 55); });
  // tarta 3D
  const cam2 = camera([0, 9, 9], [0, 0, 0], { ortho: 155, cy: 1500 });
  const vals = [35, 25, 20, 12, 8], pc = ['#ffbf46', '#2ec4b6', '#ef6f6c', '#7a8cf0', '#b07ae6'], T = [];
  let a0 = -Math.PI / 2 + t * .15; const kp = smooth(0, 1, (t - .6) / 1.6);
  vals.forEach((v, k) => {
    const a1 = a0 + v / 100 * 6.283 * Math.max(.02, kp), am = (a0 + a1) / 2, ex = k === 0 ? .35 * kp : 0, c0 = [Math.cos(am) * ex, 0, Math.sin(am) * ex], r = 2.4, y0 = 0, y1 = .6, n = Math.max(2, Math.ceil((a1 - a0) / .1));
    const arc = []; for (let q = 0; q <= n; q++) { const a = a0 + (a1 - a0) * q / n; arc.push([c0[0] + r * Math.cos(a), c0[2] + r * Math.sin(a)]); }
    const col = hex(pc[k]), fs = [];
    fs.push({ p: [[c0[0], y1, c0[2]], ...arc.map(([x, z]) => [x, y1, z])], col: jit(col, 1.15) });
    fs.push({ p: [[c0[0], y0, c0[2]], ...arc.map(([x, z]) => [x, y0, z])], col });
    for (let q = 0; q < n; q++) fs.push({ p: [[arc[q][0], y0, arc[q][1]], [arc[q + 1][0], y0, arc[q + 1][1]], [arc[q + 1][0], y1, arc[q + 1][1]], [arc[q][0], y1, arc[q][1]]], col });
    for (const e of [arc[0], arc[n]]) fs.push({ p: [[c0[0], y0, c0[2]], [e[0], y0, e[1]], [e[0], y1, e[1]], [c0[0], y1, c0[2]]], col });
    orientTo(fs, [c0[0] + Math.cos(am) * r * .45, .3, c0[2] + Math.sin(am) * r * .45]);
    T.push(...fs); a0 = a1;
  });
  render(ctx, cam2, T, { light: [0.3, 0.9, 0.5], amb: .55, seam: 1 });
  ctx.textAlign = 'left';
};

// 12 · SDF / RAY MARCHING — gotas que se fusionan
ESC.sdf = (ctx, t = 0) => {
  const lw = 360, lh = 640, c = mk(lw, lh), g = c.getContext('2d'), img = g.createImageData(lw, lh), D = img.data;
  const balls = [[-0.55, 1.45, 0, .85], [.75, 2.25, .1, .62], [.25, .72, .45, .58], [.98, 1.05, -.5, .45], [-.7, 2.55, -.3, .42]].map((b, i) => [b[0] + .35 * Math.sin(t * .9 + i * 1.7), b[1] + .25 * Math.sin(t * 1.1 + i * 2.3), b[2] + .2 * Math.cos(t * .7 + i), b[3]]);
  const smin = (a, b, k) => { const h = clamp(.5 + .5 * (b - a) / k); return mix(b, a, h) - k * h * (1 - h); };
  const sdB = (x, y, z) => { let d = 1e9; for (const b of balls) { const dd = Math.hypot(x - b[0], y - b[1], z - b[2]) - b[3]; d = d === 1e9 ? dd : smin(d, dd, .45); } return d; };
  const eye = [0, 1.7, 6.4], ta = [0, 1.45, 0], f = norm(sub(ta, eye)), r = norm(cross(f, [0, 1, 0])), u = cross(r, f), foc = (lh / 2) / Math.tan(21 * Math.PI / 180);
  const Lr = norm([-0.5, 0.9, 0.6]);
  const env = dv => { const t = Math.pow(clamp(dv[1] * .5 + .5), .8); return mixc([1, .84, .91], [.36, .31, .74], t); };
  const shadow = (p, k) => { let res = 1, t = .03; for (let i = 0; i < 40; i++) { const h = sdB(p[0] + Lr[0] * t, p[1] + Lr[1] * t, p[2] + Lr[2] * t); res = Math.min(res, k * h / t); t += clamp(h, .02, .3); if (res < .001 || t > 8) break; } return clamp(res); };
  for (let py = 0; py < lh; py++) for (let px = 0; px < lw; px++) {
    const dv = norm(add(f, add(mul(r, (px + .5 - lw / 2) / foc), mul(u, -(py + .5 - lh / 2) / foc))));
    let t = 0, hit = 0, p;
    for (let i = 0; i < 110; i++) { p = add(eye, mul(dv, t)); const d = Math.min(sdB(p[0], p[1], p[2]), p[1]); if (d < .0008 * (1 + t)) { hit = 1; break; } t += d; if (t > 40) break; }
    let col;
    if (!hit) col = env(dv);
    else if (sdB(p[0], p[1], p[2]) < p[1]) {
      const e = .002, n = norm([sdB(p[0] + e, p[1], p[2]) - sdB(p[0] - e, p[1], p[2]), sdB(p[0], p[1] + e, p[2]) - sdB(p[0], p[1] - e, p[2]), sdB(p[0], p[1], p[2] + e) - sdB(p[0], p[1], p[2] - e)]);
      const ndv = Math.max(0, -dot(n, dv)), fres = Math.pow(1 - ndv, 3.5), tt = .62 * n[1] + .5 * fres + .15;
      const base = [0, 1, 2].map(k => .62 + .34 * Math.cos(6.283 * (tt + [0, .33, .67][k])));
      const sh = shadow(add(p, mul(n, .01)), 10), dif = Math.max(0, dot(n, Lr)) * sh;
      const h = norm(sub(Lr, dv)), spec = Math.pow(Math.max(0, dot(n, h)), 70) * sh;
      const rd = sub(dv, mul(n, 2 * dot(dv, n))), refl = env(rd);
      col = [0, 1, 2].map(k => base[k] * (.28 + .72 * dif) * (1 - fres * .6) + refl[k] * fres * .9 + spec * 1.1);
    } else {
      const sh = shadow([p[0], .001, p[2]], 6);
      let ao = 1; for (const b of balls) { const dd = Math.hypot(p[0] - b[0], p[1] - b[1], p[2] - b[2]); ao *= clamp(.35 + .65 * (dd - b[3]) / 1.2); }
      const chk = ((Math.floor(p[0] * 1.2) + Math.floor(p[2] * 1.2)) & 1) ? 1 : .955;
      const b0 = [.96, .92, .97].map(v => v * chk * (.42 + .58 * sh) * (.55 + .45 * ao));
      col = mixc(b0, env(dv), clamp((t - 6) / 26));
    }
    const i = (py * lw + px) * 4; D[i] = clamp(col[0]) * 255; D[i + 1] = clamp(col[1]) * 255; D[i + 2] = clamp(col[2]) * 255; D[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(c, 0, 0, W, H);
};

// 13 · TEXTURAS PROCEDURALES — planeta inventado con nubes y luces nocturnas
ESC.planet = (ctx, t = 0) => {
  const lw = 540, lh = 960, c = mk(lw, lh), g = c.getContext('2d'), img = g.createImageData(lw, lh), D = img.data;
  const R = rng(41); for (let i = 0; i < lw * lh; i++) { const k = i * 4; const s = R() < .004 ? 120 + R() * 135 : 0; D[k] = D[k + 1] = s; D[k + 2] = s * 1.05; D[k + 3] = 255; D[k] = D[k] || 3; D[k + 1] = D[k + 1] || 4; D[k + 2] = D[k + 2] || 12; }
  const pcx = 270, pcy = 470, pr = 215, Lp = norm([-0.75, 0.35, 0.55]);
  const ramp = (h) => h < .44 ? mixc([10, 34, 86], [24, 92, 160], h / .44) : h < .47 ? [214, 196, 140] : h < .58 ? mixc([78, 138, 60], [120, 132, 70], (h - .47) / .11) : h < .66 ? mixc([130, 118, 80], [168, 158, 140], (h - .58) / .08) : [235, 235, 240];
  for (let py = 0; py < lh; py++) for (let px = 0; px < lw; px++) {
    const dx = (px - pcx) / pr, dy = -(py - pcy) / pr, q = dx * dx + dy * dy, i = (py * lw + px) * 4;
    if (q > 1.32) continue;
    if (q > 1) { const rr = Math.sqrt(q), a = Math.pow(clamp((1.15 - rr) / .15), 2.2), lit = clamp(dot(norm([dx, dy, 0]), Lp) * .8 + .4); const k = a * lit * .85; D[i] = mix(D[i], 110, k); D[i + 1] = mix(D[i + 1], 170, k); D[i + 2] = mix(D[i + 2], 255, k); continue; }
    const n = [dx, dy, Math.sqrt(1 - q)];
    let tq = rotX(rotY(n, 0.9 + t * .18), 0.35); const tc = rotX(rotY(n, 0.9 + t * .24), 0.35);
    const h = fbm3(tq[0] * 1.6 + 7, tq[1] * 1.6, tq[2] * 1.6, 6), lat = Math.abs(tq[1]);
    let col = ramp(h); const isLand = h >= .44;
    if (lat > .8 + (vnoise3(tq[0] * 6, tq[2] * 6, 1) - .5) * .12) col = [236, 242, 250];
    const cl = smooth(.5, .68, fbm3(tc[0] * 2.6 + 30, tc[1] * 5.2, tc[2] * 2.6, 5));
    const ndl = dot(n, Lp), dif = smooth(-.12, .5, ndl);
    let out = col.map(v => v * (.04 + .96 * dif));
    if (!isLand && lat <= .8) { const hv = norm(add(Lp, [0, 0, 1])), sp = Math.pow(Math.max(0, dot(n, hv)), 40) * dif; out = out.map(v => v + sp * 180); }
    if (isLand && ndl < -.05 && lat < .7) { const city = vnoise3(tq[0] * 40, tq[1] * 40, tq[2] * 40); if (city > .72) { const k = (city - .72) / .28 * smooth(-.05, -.3, ndl); out = [out[0] + 255 * k, out[1] + 170 * k, out[2] + 70 * k]; } }
    out = mixc(out, [255 * (.06 + .94 * dif), 255 * (.06 + .94 * dif), 255 * (.07 + .93 * dif)], cl * .92);
    const rim = Math.pow(1 - n[2], 3) * clamp(ndl + .3);
    out = [out[0] + 60 * rim, out[1] + 120 * rim, out[2] + 230 * rim];
    D[i] = clamp(out[0], 0, 255); D[i + 1] = clamp(out[1], 0, 255); D[i + 2] = clamp(out[2], 0, 255);
  }
  // luna
  const mcx = 420, mcy = 800, mr = 45;
  for (let py = mcy - mr; py <= mcy + mr; py++) for (let px = mcx - mr; px <= mcx + mr; px++) {
    const dx = (px - mcx) / mr, dy = -(py - mcy) / mr, q = dx * dx + dy * dy; if (q > 1) continue;
    const n = [dx, dy, Math.sqrt(1 - q)], cr = fbm3(n[0] * 4, n[1] * 4, n[2] * 4, 4), v = (110 + cr * 120) * (.05 + .95 * smooth(-.1, .6, dot(n, Lp))), i = (py * lw + px) * 4;
    D[i] = v; D[i + 1] = v * .97; D[i + 2] = v * .93;
  }
  g.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(c, 0, 0, W, H);
};

const NOMBRES = { pixel: 'Pixel art 3D', voxel: 'Vóxel', iso: 'Isométrico / diorama', lowpoly: 'Low-poly', wire: 'Wireframe retro', toon: 'Toon / cel shading', paper: '2.5D papercraft', galaxy: 'Partículas 3D', dither: 'Retro de consola', ascii: 'ASCII 3D', info: 'Infografía 3D', sdf: 'SDF / ray marching', planet: 'Texturas procedurales' };
const HECHOS = {};
function renderStyle(nm, t = 0, tipo = 'image/png', q = .92) { const c = mk(W, H), ctx = c.getContext('2d'); ESC[nm](ctx, t); HECHOS[nm] = c; return c.toDataURL(tipo, q); }
function hoja(list) {
  const cols = 4, tw = 252, th = 448, gap = 12, lab = 46, head = 110, rows = Math.ceil(list.length / cols);
  const c = mk(cols * tw + (cols + 1) * gap, head + rows * (th + lab + gap) + gap), g = c.getContext('2d');
  g.fillStyle = '#14141c'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#fff'; g.font = 'bold 44px "DejaVu Sans", sans-serif'; g.textAlign = 'center'; g.fillText('Estilos 3D por código', c.width / 2, 72);
  g.font = 'bold 18px "DejaVu Sans", sans-serif';
  list.forEach((nm, k) => { const x = gap + (k % cols) * (tw + gap), y = head + Math.floor(k / cols) * (th + lab + gap); g.imageSmoothingQuality = 'high'; g.drawImage(HECHOS[nm], x, y, tw, th); g.fillStyle = '#e6e6ee'; g.fillText((k + 1) + '. ' + NOMBRES[nm], x + tw / 2, y + th + 31); });
  return c.toDataURL('image/png');
}
