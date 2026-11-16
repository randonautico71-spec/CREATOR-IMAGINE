'use strict';
// Planeta tipo Tierra con cohete en órbita: un fotograma por estilo (1080×1920)
const EP = {};
function escenaBase(ctx, w, h, cam, o = {}) {   // planeta + nubes semitransparentes + cohete
  const F = [], N = []; planetaMalla(F, { capaNubes: N, lat: o.lat || 48, lon: o.lon || 96, latN: o.latN || 64, lonN: o.lonN || 128, jit: o.jit, relieve: o.relieve, ciudades: o.ciudades });
  render(ctx, cam, F, { ...LUZ, ...(o.luz || {}), seam: o.seam ?? .8 });
  if (o.nubes !== false) { const cn = mk(w, h); render(cn.getContext('2d'), cam, N, { ...LUZ, amb: .15, ...(o.luz || {}), seam: o.seam ?? .8 }); ctx.globalAlpha = o.alfaNubes ?? .85; ctx.drawImage(cn, 0, 0); ctx.globalAlpha = 1; }
  const Rk = []; coheteMalla(Rk, estadoCohete(TH_COHETE), .62, { seg: o.segC }); render(ctx, cam, Rk, { ...LUZ, amb: .32, ...(o.luz || {}), seam: o.seam ?? .8 });
}
function fondoEspacio(ctx, w, h, R = rng(3), o = {}) {
  ctx.fillStyle = lin(ctx, 0, 0, 0, h, o.stops || [['#01020a', 0], ['#060a1e', .6], ['#0a1230', 1]]); ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5000 * (w / 1080); i++) { const t = R(), x = w * (t * 1.1 - .05) + (R() - .5) * w * .12, y = h * (.45 - t * .4) + (R() - .5) * w * .1; ctx.fillStyle = `rgba(${170 + R() * 80},${160 + R() * 60},255,${.04 + R() * .08})`; ctx.fillRect(x, y, 2 * w / 1080, 2 * w / 1080); }
  ctx.globalCompositeOperation = 'source-over';
  estrellas(ctx, w, h, 1800 * (w / 1080), R);
  const sx = w * .05, sy = h * .1, g = ctx.createRadialGradient(sx, sy, 0, sx, sy, w * .5); g.addColorStop(0, 'rgba(255,240,210,.55)'); g.addColorStop(.15, 'rgba(255,220,170,.18)'); g.addColorStop(1, 'rgba(255,200,150,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}
function luna(F, R = rng(2)) { sphere(F, [-4.2, 7.2, -6], .7, 14, 24, (p) => jit([168, 166, 160], .7 + .45 * fbm3(p[0] * 3, p[1] * 3, p[2] * 3, 4))); }

// 1 · PIXEL ART 3D
EP.pixel = ctx => {
  const lw = 270, lh = 480, c = mk(lw, lh), g = c.getContext('2d'), cam = CAM(lw, lh);
  fondoEspacio(g, lw, lh); dibujaOrbita(g, cam, { lw: 1, col: 'rgba(255,255,255,.7)' });
  const L = []; luna(L); render(g, cam, L, { ...LUZ, seam: .5 }); planetaPixel(g, lw, lh, cam); coheteSolo(g, cam, { seg: 16 });
  quantize(g, lw, lh, ['#01020a', '#0a1230', '#1a2450', '#2a3a78', '#ffffff', '#c8d0e0', '#8890a8', '#0a2860', '#14408a', '#2a6ab0', '#3a90c8', '#60b8d8', '#1e5a2a', '#2e7a36', '#4a9a40', '#6aa858', '#8a9a5a', '#c8b078', '#a8885a', '#7a6a52', '#e8eef6', '#ffd08a', '#ff8a2a', '#fff1a8', '#e8414a', '#7a7f96', '#5cc8ff', '#203040', '#405060', '#a0a8b0', '#3a5aa0', '#6a8ad0'].map(hex));
  ctx.imageSmoothingEnabled = false; ctx.drawImage(c, 0, 0, W, H);
};

// 2 · VÓXEL
EP.voxel = ctx => {
  fondoEspacio(ctx, W, H);
  const u = .12, vox = new Map(), key = (i, j, k) => i + ',' + j + ',' + k, set = (i, j, k, col) => vox.set(key(i, j, k), { i, j, k, col }), Rv = PL.R / u;
  for (let i = -27; i <= 27; i++) for (let j = -27; j <= 27; j++) for (let k = -27; k <= 27; k++) {
    const p = [(i + .5) * u, (j + .5) * u, (k + .5) * u], r = Math.hypot(...p), n = mul(p, 1 / r), t = tierra(n);
    const R2 = PL.R + (t.tierra ? u * .9 : 0); if (r > R2 || r < PL.R - 2.2 * u) continue;
    let col = t.col; if (t.tierra && r > PL.R) col = jit(col, .92);
    if (t.tierra && dot(n, SOL) < -.1 && luzCiudad(n)) col = [255, 200, 120];
    set(i, j, k, col);
    if (nube(n) > .75 && r > PL.R - u) set(Math.round(n[0] * (PL.R + .5) / u - .5), Math.round(n[1] * (PL.R + .5) / u - .5), Math.round(n[2] * (PL.R + .5) / u - .5), [248, 250, 255]);
  }
  const F = [], dirs = [['top', 0, 1, 0], ['bottom', 0, -1, 0], ['right', 1, 0, 0], ['left', -1, 0, 0], ['front', 0, 0, 1], ['back', 0, 0, -1]], all = { top: 1, bottom: 1, right: 1, left: 1, front: 1, back: 1 };
  for (const v of vox.values()) for (const [nm, a, b, c] of dirs) { if (vox.get(key(v.i + a, v.j + b, v.k + c))) continue; const sk = { ...all }; delete sk[nm]; box(F, v.i * u, v.j * u, v.k * u, (v.i + 1) * u, (v.j + 1) * u, (v.k + 1) * u, v.col, { skip: sk, f: (v.col[0] === 255 ? { emit: true } : {}) }); }
  const est = estadoCohete(TH_COHETE), ey = est.t, ex = norm(sub(est.u, mul(ey, dot(est.u, ey)))), ez = cross(ex, ey), uc = .09;
  const vc = (a, b, c2, col) => { const p = add(est.p, add(add(mul(ex, a * uc), mul(ey, b * uc)), mul(ez, c2 * uc))); const hs = uc / 2; box(F, p[0] - hs, p[1] - hs, p[2] - hs, p[0] + hs, p[1] + hs, p[2] + hs, hex(col)); };
  for (let b = -5; b <= 7; b++) { const r = b > 4 ? 0 : 1; for (let a = -r; a <= r; a++) for (let c2 = -r; c2 <= r; c2++) vc(a, b, c2, b > 3 ? '#e8414a' : b === -3 ? '#e8414a' : '#f2f0ea'); }
  vc(2, 1, 0, '#5cc8ff'); for (const [a, c2] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) { vc(a, -5, c2, '#e8414a'); vc(a, -4, c2, '#e8414a'); }
  for (let b = -6; b >= -10; b--) vc(0, b, 0, b > -8 ? '#fff1a8' : '#ff8a2a');
  const cam = CAM(W, H, { eye: [2.4, 3.6, 13.6] }); halo(ctx, cam); dibujaOrbita(ctx, cam, { lw: 3 });
  render(ctx, cam, F, { ...LUZ, amb: .18, seam: .7 });
};

// 3 · ISOMÉTRICO / DIORAMA (maqueta del sistema sobre un pedestal)
EP.iso = ctx => {
  ctx.fillStyle = lin(ctx, 0, 0, 0, H, [['#f2ead8', 0], ['#e4d6c0', 1]]); ctx.fillRect(0, 0, W, H);
  const cam = camera([30, 22, 30], [0, 1.2, 0], { ortho: 118, cy: H * .52 }), sh = cam.P([0, -4.6, 0]);
  ctx.fillStyle = 'rgba(80,60,40,.18)'; ctx.beginPath(); ctx.ellipse(sh[0], sh[1] + 120, 520, 170, 0, 0, 7); ctx.fill();
  const S = [], A = [];
  box(S, -4.6, -4.6, -4.6, 4.6, -4.0, 4.6, hex('#2a2f45'), { top: hex('#3a4160') });
  box(S, -4.4, -4.0, -4.4, 4.4, -3.96, 4.4, hex('#0b1024'));
  for (let i = 0; i < 160; i++) { const x = -4.2 + hash3(i, 1, 2) * 8.4, z = -4.2 + hash3(i, 2, 2) * 8.4; box(S, x, -3.96, z, x + .05, -3.95, z + .05, [255, 255, 255], { f: { emit: true } }); }
  lathe(S, [[0, -3.95], [.25, -3.95], [.12, -3.6], [.08, -.2], [0, -.2]], 16, () => hex('#c9a456'), [0, -2, 0]);
  
  const anillo = []; for (let i = 0; i < 120; i++) { const a0 = i / 120 * 6.283, a1 = (i + 1) / 120 * 6.283, P = (a, r) => add(mul(ORB.a, Math.cos(a) * r), mul(ORB.b, Math.sin(a) * r)); anillo.push({ p: [P(a0, 3.6), P(a1, 3.6), P(a1, 3.66), P(a0, 3.66)], col: hex('#c9a456'), two: true }); }
  A.push(...anillo);
  const est = estadoCohete(TH_COHETE); est.p = mul(norm(est.p), 3.63); coheteMalla(A, est, .55);
  sphere(A, [-3.1, 2.6, -2.2], .5, 12, 20, p => jit([170, 168, 160], .75 + .4 * fbm3(p[0] * 3, p[1] * 3, p[2] * 3, 3)));
  lathe(A, [[.04, 2.6], [.04, -3.95], [0, -3.95]], 6, () => hex('#c9a456'), [-3.1, 0, -2.2], -3.1, -2.2);
  render(ctx, cam, S, { ...LUZ, amb: .5, seam: 1 }); const atras = A.filter(f => dot(centroid(f.p), cam.f) > 0), delante = A.filter(f => dot(centroid(f.p), cam.f) <= 0);
  render(ctx, cam, atras, { ...LUZ, light: norm([.5, .7, .6]), amb: .35, seam: 1 }); planetaPixel(ctx, W, H, cam, { R: PL.R * .8, cy: H * .52, amb: .25 }); render(ctx, cam, delante, { ...LUZ, light: norm([.5, .7, .6]), amb: .35, seam: 1 });
};

// 4 · LOW-POLY
EP.lowpoly = ctx => {
  fondoEspacio(ctx, W, H); const cam = CAM(W, H); halo(ctx, cam, PL.R, '120,180,255', .8);
  const F = [], N = [], R = rng(4);
  const tmp = []; sphere(tmp, [0, 0, 0], PL.R, 22, 40, () => [0, 0, 0], { disp: d => { const t = tierra(d); return t.tierra ? 1.03 + .02 * hash3(d[0] * 30 | 0, d[1] * 30 | 0, 1) : 1; } });
  for (const f of tmp) { const n = norm(centroid(f.p)), t = tierra(n); f.col = jit(t.col, .92 + .16 * R()); if (t.tierra && dot(n, SOL) < -.1 && luzCiudad(n)) { f.col = [255, 196, 110]; f.emit = true; } F.push(f); }
  for (let i = 0; i < 60; i++) { const n = fib(i, 60); if (nube(n) < .3 && R() > .25) continue; const c = mul(n, PL.R * 1.08); sphere(N, c, 1, 2, 5, () => [252, 252, 255], { scale: [.35 + R() * .3, .14, .3 + R() * .2] }); }
  render(ctx, cam, F, { ...LUZ, seam: 1 }); render(ctx, cam, N, { ...LUZ, amb: .25, seam: 1 });
  dibujaOrbita(ctx, cam, { lw: 3 });
  const Rk = []; coheteMalla(Rk, estadoCohete(TH_COHETE), .62, { seg: 6 }); render(ctx, cam, Rk, { ...LUZ, amb: .3, seam: 1 });
  const L = []; sphere(L, [-4.2, 7.2, -6], .7, 4, 7, () => jit([170, 168, 160], .8 + .3 * R())); render(ctx, cam, L, { ...LUZ, seam: 1 });
};

// 5 · WIREFRAME RETRO
EP.wire = ctx => {
  ctx.fillStyle = lin(ctx, 0, 0, 0, H, [['#05000f', 0], ['#14002b', .6], ['#2a0040', 1]]); ctx.fillRect(0, 0, W, H); estrellas(ctx, W, H, 1500, rng(7), { col: '255,200,255' });
  const cam = CAM(W, H);
  ctx.strokeStyle = 'rgba(255,60,200,.25)'; ctx.lineWidth = 2; for (let k = 0; k < 18; k++) { const y = H * .97 - k * k * 2.2; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  halo(ctx, cam, PL.R, '255,60,200', .9);
  const tmp = []; sphere(tmp, [0, 0, 0], PL.R, 36, 72, () => [0, 0, 0]); const T = [], M = [];
  for (const f of tmp) { const t = tierra(norm(centroid(f.p))); (t.tierra || t.hielo ? T : M).push(f); }
  render(ctx, cam, M, { wire: { fill: '#0a0420', line: '#38f6ff', lw: 1.2, glow: 'rgba(56,246,255,0.12)', gw: 5 } });
  render(ctx, cam, T, { wire: { fill: '#0f4a24', line: '#7cff9a', lw: 1.8, glow: 'rgba(124,255,154,0.25)', gw: 6 } });
  ctx.shadowColor = 'transparent'; dibujaOrbita(ctx, cam, { lw: 3, col: 'rgba(255,90,220,.9)' });
  const Rk = []; coheteMalla(Rk, estadoCohete(TH_COHETE), .62, { seg: 12, llama: false });
  render(ctx, cam, Rk, { wire: { fill: '#1a0520', line: '#ffb03a', lw: 1.4, glow: 'rgba(255,160,40,0.25)', gw: 6 } });
  const est = estadoCohete(TH_COHETE), q = cam.P(sub(est.p, mul(est.t, .62 * .9)));
  for (let k = 0; k < 14; k++) { const p = cam.P(sub(est.p, mul(est.t, .62 * (.7 + k * .12)))); ctx.strokeStyle = `rgba(255,${150 + k * 6},60,${.8 - k * .05})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p[0], p[1], 6 + k * 3, 0, 7); ctx.stroke(); }
};

// 6 · TOON / CEL SHADING
EP.toon = ctx => {
  ctx.fillStyle = lin(ctx, 0, 0, 0, H, [['#1d1450', 0], ['#3b2e8e', .6], ['#5b48b0', 1]]); ctx.fillRect(0, 0, W, H);
  const ink = '#140c30', R = rng(9);
  const sparkle = (x, y, s) => { ctx.beginPath(); ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x, y, x + s, y); ctx.quadraticCurveTo(x, y, x, y + s); ctx.quadraticCurveTo(x, y, x - s, y); ctx.quadraticCurveTo(x, y, x, y - s); ctx.fill(); };
  ctx.fillStyle = '#fff6c9'; for (let i = 0; i < 60; i++) sparkle(R() * W, R() * H * .6, 3 + R() * 12);
  ctx.lineWidth = 9; ctx.strokeStyle = ink; ctx.fillStyle = '#e8e4d8'; ctx.beginPath(); ctx.arc(200, 330, 90, 0, 7); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(200, 330, 90, 0, 7); ctx.clip(); ctx.fillStyle = '#b8b2a6'; ctx.beginPath(); ctx.arc(250, 370, 95, 0, 7); ctx.fill(); ctx.fillStyle = '#cfc9bc'; for (const [x, y, r] of [[170, 300, 16], [220, 350, 11], [180, 360, 8]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); } ctx.restore(); ctx.beginPath(); ctx.arc(200, 330, 90, 0, 7); ctx.stroke();
  const cam = CAM(W, H), pl = planetaPixel(ctx, W, H, cam, { toon: true, amb: .12, atm: false });
  ctx.lineWidth = 16; ctx.strokeStyle = ink; ctx.beginPath(); ctx.arc(pl.c[0], pl.c[1], pl.r + 6, 0, 7); ctx.stroke();
  ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(140,200,255,.8)'; ctx.beginPath(); ctx.arc(pl.c[0], pl.c[1], pl.r + 20, -2.6, -.9); ctx.stroke();
  const rc = mk(W, H), rg = rc.getContext('2d'), toon = d => d > .55 ? 1 : d > .12 ? .78 : .42;
  coheteSolo(rg, cam, { seg: 36, toon });
  const sil = mk(W, H), sg = sil.getContext('2d'); sg.drawImage(rc, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = ink; sg.fillRect(0, 0, W, H);
  for (let k = 0; k < 24; k++) { const a = k / 24 * 6.283; ctx.drawImage(sil, Math.cos(a) * 7, Math.sin(a) * 7); }
  ctx.drawImage(rc, 0, 0);
  ctx.setLineDash([22, 18]); dibujaOrbita(ctx, cam, { lw: 6, col: '#fff6c9', discont: false }); ctx.setLineDash([]);
  const est = estadoCohete(TH_COHETE), b = cam.P(sub(est.p, mul(est.t, .9)));
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineCap = 'round'; ctx.lineWidth = 9; for (const [dx, dy, l] of [[0, -22, 90], [0, 0, 130], [0, 22, 80]]) { const d = norm(sub(cam.P(est.p), b)); ctx.beginPath(); ctx.moveTo(b[0] - d[0] * 20 + dx, b[1] - d[1] * 20 + dy); ctx.lineTo(b[0] - d[0] * (20 + l) + dx, b[1] - d[1] * (20 + l) + dy); ctx.stroke(); }
};

// 7 · 2.5D PAPERCRAFT
EP.paper = ctx => {
  ctx.fillStyle = lin(ctx, 0, 0, 0, H, [['#1b2550', 0], ['#2c3a74', .6], ['#3a4a8a', 1]]); ctx.fillRect(0, 0, W, H);
  const sombra = (p, n = 5, st = 4) => { for (let k = n; k >= 1; k--) { ctx.save(); ctx.translate(k * 1.6, k * st); ctx.fillStyle = 'rgba(5,8,25,.12)'; ctx.fill(p); ctx.restore(); } };
  const pieza = (p, col) => { sombra(p); ctx.fillStyle = col; ctx.fill(p); };
  const R = rng(11);
  const star = (x, y, r) => { const p = new Path2D(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * .45 : r; k ? p.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a)) : p.moveTo(x + rr * Math.cos(a), y + rr * Math.sin(a)); } p.closePath(); return p; };
  for (let i = 0; i < 40; i++) pieza(star(R() * W, R() * H * .55, 6 + R() * 14), '#f8eecf');
  const lu = new Path2D(); lu.arc(210, 330, 85, 0, 7); pieza(lu, '#efe8d6'); ctx.fillStyle = '#ddd4bf'; for (const [x, y, r] of [[180, 300, 18], [235, 350, 12], [195, 365, 9]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
  const cam = CAM(W, H), hl = halo(ctx, cam, PL.R, '140,190,255', .7);
  for (const [k, col] of [[1.12, '#3f5fa8'], [1.06, '#5b7fd0']]) { const p = new Path2D(); p.arc(hl.c[0], hl.c[1], hl.r * k, 0, 7); pieza(p, col); }
  planetaPixel(ctx, W, H, cam, { poster: 5, amb: .2, atm: false });
  const orb = new Path2D(); for (let i = 0; i <= 200; i++) { const q = cam.P(orbitaPunto(i / 200 * 6.283)); i ? orb.lineTo(q[0], q[1]) : orb.moveTo(q[0], q[1]); }
  ctx.save(); ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(5,8,25,.25)'; ctx.translate(3, 6); ctx.stroke(orb); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(hl.c[0], hl.c[1], hl.r * 1.0, 0, 7, true); ctx.clip('evenodd'); ctx.lineWidth = 8; ctx.strokeStyle = '#f2c94c'; ctx.stroke(orb); ctx.restore();
  const rr = mk(W, H), rrg = rr.getContext('2d'); coheteSolo(rrg, cam, { seg: 28, toon: d => d > .45 ? 1 : d > .1 ? .82 : .55 });
  const s2 = mk(W, H), s2g = s2.getContext('2d'); s2g.drawImage(rr, 0, 0); s2g.globalCompositeOperation = 'source-in'; s2g.fillStyle = 'rgba(5,8,25,.4)'; s2g.fillRect(0, 0, W, H);
  ctx.drawImage(s2, 6, 10); ctx.drawImage(rr, 0, 0);
  const nz = ctx.getImageData(0, 0, W, H), d = nz.data, Rn = rng(77); for (let i = 0; i < d.length; i += 4) { const v = (Rn() - .5) * 14; d[i] += v; d[i + 1] += v; d[i + 2] += v; } ctx.putImageData(nz, 0, 0);
};

// 8 · PARTÍCULAS 3D
EP.galaxy = ctx => {
  fondoEspacio(ctx, W, H, rng(5)); const cam = CAM(W, H), R = rng(8);
  ctx.globalCompositeOperation = 'lighter';
  const dot2 = (p, c, a, s) => { const q = cam.P(p); if (q[2] <= 0) return; ctx.fillStyle = `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`; ctx.fillRect(q[0] - s / 2, q[1] - s / 2, s, s); };
  const vis = p => { const d = sub(p, cam.eye), L = Math.hypot(...d), u = mul(d, 1 / L), tc = -dot(cam.eye, u), dm = Math.hypot(...add(cam.eye, mul(u, tc))); if (dm >= PL.R) return true; const th = tc - Math.sqrt(PL.R * PL.R - dm * dm); return !(th > 0 && th < L - .03); };
  for (let i = 0; i < 520000; i++) { const u = R() * 2 - 1, th = R() * 6.283, r = Math.sqrt(1 - u * u), n = [r * Math.cos(th), u, r * Math.sin(th)], p = mul(n, PL.R); if (!vis(p)) continue;
    const t = tierra(n), dl = dot(n, SOL); let col = t.col.map(v => v * (.25 + 1.0 * smooth(-.1, .5, dl))), a = .55;
    if (t.tierra && dl < -.08 && luzCiudad(n)) { col = [255, 190, 100]; a = .8; } dot2(p, col, a, 2.4); }
  for (let i = 0; i < 160000; i++) { const u = R() * 2 - 1, th = R() * 6.283, r = Math.sqrt(1 - u * u), n = [r * Math.cos(th), u, r * Math.sin(th)]; if (nube(n) < .5) continue; const p = mul(n, PL.R * 1.03); if (!vis(p)) continue; const dl = Math.max(0, dot(n, SOL)); dot2(p, [240, 245, 255].map(v => v * (.1 + .9 * dl)), .3, 2); }
  for (let i = 0; i < 9000; i++) { const u = R() * 2 - 1, th = R() * 6.283, r = Math.sqrt(1 - u * u), n = [r * Math.cos(th), u, r * Math.sin(th)], p = mul(n, PL.R * (1.04 + R() * .08)); if (!vis(p)) continue; dot2(p, [90, 160, 255], .12, 2); }
  for (let i = 0; i < 2600; i++) { const th = R() * 6.283, p = add(orbitaPunto(th), [(R() - .5) * .05, (R() - .5) * .05, (R() - .5) * .05]); if (vis(p)) dot2(p, [255, 255, 255], .25, 2); }
  const est = estadoCohete(TH_COHETE), Rk = []; coheteMalla(Rk, est, .62, { llama: false });
  for (const f of Rk) for (let k = 0; k < 14; k++) { const a = R(), b = R() * (1 - a), p = add(add(mul(f.p[0], 1 - a - b), mul(f.p[1], a)), mul(f.p[2], b)); dot2(p, f.col, .5, 2.2); }
  for (let i = 0; i < 5000; i++) { const s = R(), p = add(sub(est.p, mul(est.t, .62 * (.7 + s * 2.2))), mul([(R() - .5), (R() - .5), (R() - .5)], .1 + s * .5)); dot2(p, [255, 150 + 100 * (1 - s), 60], .35 * (1 - s), 2.4); }
  ctx.globalCompositeOperation = 'source-over';
};

// 9 · RETRO DE CONSOLA (tramado 4 tonos)
EP.dither = ctx => {
  const lw = 270, lh = 480, c = mk(lw, lh), g = c.getContext('2d'), cam = CAM(lw, lh);
  g.fillStyle = '#000'; g.fillRect(0, 0, lw, lh); estrellas(g, lw, lh, 500, rng(3)); dibujaOrbita(g, cam, { lw: 1, col: 'rgba(255,255,255,.8)' });
  const L = []; luna(L); render(g, cam, L, { ...LUZ, seam: .5 }); planetaPixel(g, lw, lh, cam, { amb: .1 }); coheteSolo(g, cam, { seg: 16 });
  const img = g.getImageData(0, 0, lw, lh), d = img.data, bay = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], pal = ['#0f1b2e', '#2e4a6e', '#7aa0c0', '#dceaf4'].map(hex);
  for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) { const i = (y * lw + x) * 4, l = clamp(Math.pow((d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11) / 255, 1.1) * .95), v = l * 3, k = Math.min(3, Math.floor(v) + ((v - Math.floor(v)) > (bay[y & 3][x & 3] + .5) / 16 ? 1 : 0)); d[i] = pal[k][0]; d[i + 1] = pal[k][1]; d[i + 2] = pal[k][2]; }
  g.putImageData(img, 0, 0); ctx.imageSmoothingEnabled = false; ctx.drawImage(c, 0, 0, W, H);
};

// 10 · ASCII 3D (120×128 caracteres de color)
EP.ascii = ctx => {
  const lw = 360, lh = 640, c = mk(lw, lh), g = c.getContext('2d'), cam = CAM(lw, lh);
  g.fillStyle = '#000'; g.fillRect(0, 0, lw, lh); estrellas(g, lw, lh, 300, rng(3)); dibujaOrbita(g, cam, { lw: 1.5 });
  planetaPixel(g, lw, lh, cam, { amb: .12 }); coheteSolo(g, cam, { seg: 20 });
  const d = g.getImageData(0, 0, lw, lh).data, cw = 9, ch = 15, cols = 120, rows = 128, chars = ' .`,:;~-=+*!?%#&$@';
  ctx.fillStyle = '#02030a'; ctx.fillRect(0, 0, W, H); ctx.font = 'bold 14px "DejaVu Sans Mono", monospace'; ctx.textBaseline = 'top';
  for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
    let A = 0, G = 0, B = 0, n = 0; for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) { const yy = Math.floor(r * lh / rows) + y; if (yy >= lh) continue; const i = (yy * lw + q * 3 + x) * 4; A += d[i]; G += d[i + 1]; B += d[i + 2]; n++; }
    A /= n; G /= n; B /= n; const l = (A * .3 + G * .59 + B * .11) / 255; if (l < .02) continue; const k = Math.min(chars.length - 1, Math.round(Math.pow(l, .7) * (chars.length - 1))), gm = v => 255 * Math.pow(v / 255, .75);
    ctx.fillStyle = `rgba(${A | 0},${G | 0},${B | 0},.3)`; ctx.fillRect(q * cw, r * ch, cw, ch);
    ctx.fillStyle = `rgb(${Math.min(255, gm(A) * 1.25 + 25) | 0},${Math.min(255, gm(G) * 1.25 + 25) | 0},${Math.min(255, gm(B) * 1.25 + 25) | 0})`; ctx.fillText(chars[k], q * cw, r * ch);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
};

// 11 · INFOGRAFÍA 3D (partes señaladas, sin cifras)
EP.info = ctx => {
  ctx.fillStyle = lin(ctx, 0, 0, 0, H, [['#0a0f1e', 0], ['#15203a', 1]]); ctx.fillRect(0, 0, W, H); estrellas(ctx, W, H, 600, rng(2));
  ctx.fillStyle = '#fff'; ctx.font = 'bold 66px "DejaVu Sans", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Un planeta como la Tierra', W / 2, 170);
  ctx.fillStyle = '#9fb0d8'; ctx.font = '34px "DejaVu Sans", sans-serif'; ctx.fillText('continentes generados por código, no el mapa real', W / 2, 228);
  const cam = CAM(W, H, { eye: [.8, 1.4, 15.5], target: [0, 1.6, 0] }); dibujaOrbita(ctx, cam, { lw: 3, col: 'rgba(255,194,60,.75)' });
  planetaPixel(ctx, W, H, cam); coheteSolo(ctx, cam);
  ctx.font = 'bold 40px "DejaVu Sans", sans-serif'; ctx.textAlign = 'left';
  const marca = (p, tx, ty, txt) => { const q = cam.P(p), w = ctx.measureText(txt).width, lx = tx + (q[0] < tx ? -10 : w + 10);
    ctx.strokeStyle = '#ffc23c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(lx, ty - 12); ctx.stroke(); ctx.fillStyle = '#ffc23c'; ctx.beginPath(); ctx.arc(q[0], q[1], 8, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(10,15,30,.8)'; ctx.fillRect(tx - 12, ty - 44, w + 24, 60); ctx.strokeStyle = 'rgba(255,194,60,.6)'; ctx.lineWidth = 2; ctx.strokeRect(tx - 12, ty - 44, w + 24, 60); ctx.fillStyle = '#fff'; ctx.fillText(txt, tx, ty); };
  const busca = (cond, desde) => { for (let i = 0; i < 4000; i++) { const n = fib((i * 7 + desde) % 4000, 4000); if (n[2] > .35 && cond(n)) return mul(n, PL.R); } return [0, PL.R, 0]; };
  const est = estadoCohete(TH_COHETE);
  marca(est.p, 640, 470, 'Cohete en órbita'); marca(orbitaPunto(.4), 680, 640, 'Órbita');
  marca(busca(n => { const t = tierra(n); return !t.tierra && !t.hielo && dot(n, SOL) > .3 && nube(n) < .3; }, 11), 60, 1320, 'Océano');
  marca(busca(n => { const t = tierra(n); return t.tierra && dot(n, SOL) > .3 && nube(n) < .3; }, 377), 60, 1080, 'Continente');
  marca(busca(n => nube(n) > .7 && dot(n, SOL) > .2, 900), 70, 860, 'Nubes'); marca(busca(n => tierra(n).hielo, 5), 60, 680, 'Casquete polar');
  marca(busca(n => tierra(n).tierra && dot(n, SOL) < -.15 && luzCiudad(n), 1500), 620, 1600, 'Ciudades de noche');
  { const c = cam.P([0, 0, 0]), e = cam.P(mul(cam.u, PL.R * 1.06)), r = Math.abs(c[1] - e[1]); marca(add([0, 0, 0], mul(norm([.75, .55, .3]), PL.R * 1.06)), 690, 860, 'Atmósfera'); }
};

const NOMBRES_P = { pixel: 'Pixel art 3D', voxel: 'Vóxel', iso: 'Isométrico / diorama', lowpoly: 'Low-poly', wire: 'Wireframe retro', toon: 'Toon / cel shading', paper: '2.5D papercraft', galaxy: 'Partículas 3D', dither: 'Retro de consola', ascii: 'ASCII 3D', info: 'Infografía 3D' };
function renderP(nm) { const c = mk(W, H); EP[nm](c.getContext('2d')); return c.toDataURL('image/png'); }
