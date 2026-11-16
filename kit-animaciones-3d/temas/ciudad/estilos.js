'use strict';
// Multitud andando por una ciudad: un fotograma por estilo (1080×1920)
const EC = {};
function escena(o = {}) { const S = construyeCiudad(o); anadeGente(S.calle, S.sombras, S.gente, { lat: o.latP || 6, lon: o.lonP || 9, t: o.t || 0 }); return S; }
function bordesTinta(ctx, w, h, umbral = 38, col = [20, 14, 30], grosor = 1) {
  const img = ctx.getImageData(0, 0, w, h), d = img.data, L = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) L[i] = d[i * 4] * .3 + d[i * 4 + 1] * .59 + d[i * 4 + 2] * .11;
  const out = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x, gx = -L[i - w - 1] - 2 * L[i - 1] - L[i + w - 1] + L[i - w + 1] + 2 * L[i + 1] + L[i + w + 1], gy = -L[i - w - 1] - 2 * L[i - w] - L[i - w + 1] + L[i + w - 1] + 2 * L[i + w] + L[i + w + 1]; if (Math.hypot(gx, gy) > umbral * 4) out[i] = 1; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let e = 0; for (let dy = -grosor + 1; dy < grosor && !e; dy++) for (let dx = -grosor + 1; dx < grosor && !e; dx++) { const yy = y + dy, xx = x + dx; if (yy >= 0 && yy < h && xx >= 0 && xx < w && out[yy * w + xx]) e = 1; } if (e) { const i = (y * w + x) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; } }
  ctx.putImageData(img, 0, 0);
}
function posterizar(ctx, w, h, niv) { const img = ctx.getImageData(0, 0, w, h), d = img.data; for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) d[i + k] = Math.round(d[i + k] / 255 * niv) / niv * 255; ctx.putImageData(img, 0, 0); }
function grano(ctx, w, h, k = 14, sem = 77) { const nz = ctx.getImageData(0, 0, w, h), d = nz.data, Rn = rng(sem); for (let i = 0; i < d.length; i += 4) { const v = (Rn() - .5) * k; d[i] += v; d[i + 1] += v; d[i + 2] += v; } ctx.putImageData(nz, 0, 0); }

// 1 · PIXEL ART 3D (270×480 ×4)
EC.pixel = ctx => {
  const lw = 270, lh = 480, c = mk(lw, lh), g = c.getContext('2d'), cam = CAMC(lw, lh);
  cieloCiudad(g, lw, lh, cam, { stops: [['#3a2a6e', 0], ['#c0507a', .55], ['#ffb070', 1]] }); const S = escena({ latP: 4, lonP: 6, luces: .45 });
  renderCiudad(g, cam, S, { seam: .5, luz: { light: norm([.8, .45, .2]), lightCol: [1.3, .95, .7], ambCol: [.6, .5, .8], amb: .45 } });
  quantize(g, lw, lh, ['#1a1430', '#2a2048', '#3a2a6e', '#5a3a8a', '#8a4a8a', '#c0507a', '#e8706a', '#ffb070', '#ffd8a0', '#fff4d8', '#202024', '#3a3a42', '#55555e', '#74747e', '#9a9aa4', '#c4c4cc', '#e8e8ee',
    '#5a2a22', '#8a3a2a', '#b05a3a', '#d08a5a', '#e8b080', '#f4d4b0', '#3a2418', '#6a4428', '#2a3a6a', '#3a5a9a', '#5a8ac8', '#8ab8e8', '#1e4a2a', '#2e6a36', '#4a8a40', '#7aa84a',
    '#8a1a2a', '#c02a3a', '#e8c040', '#f0e070', '#6a3a8a', '#a05ab8', '#e080a0', '#40a0a0', '#ffe0a0', '#ffc860', '#7a6a5a', '#a89880', '#d0c4b0'].map(hex));
  ctx.imageSmoothingEnabled = false; ctx.drawImage(c, 0, 0, W, H);
};

// 2 · VÓXEL (vóxel de 0,18 m)
EC.voxel = ctx => {
  const cam = CAMC(W, H, { eye: [0, 7.5, 17], target: [0, 2, -6] }); cieloCiudad(ctx, W, H, cam);
  const u = .18, vox = new Map(), key = (i, j, k) => i + ',' + j + ',' + k, set = (i, j, k, col, emit) => vox.set(key(i, j, k), { i, j, k, col, emit }), R = rng(3);
  const I = x => Math.floor(x / u), Z0 = -26, Z1 = 15;
  for (let i = I(-7.6); i <= I(7.6); i++) for (let k = I(Z0); k <= I(Z1); k++) { const x = (i + .5) * u, z = (k + .5) * u, acera = Math.abs(x) > 4;
    let col = acera ? jit([176, 170, 160], .92 + .12 * R()) : jit([62, 64, 68], .92 + .14 * R());
    if (!acera && Math.abs(z - CIU.pz) < 1.6 && ((x + 4) % .8) < .45) col = [240, 240, 236]; if (!acera && Math.abs(x) < .12 && ((z % 2 + 2) % 2) < 1.2 && Math.abs(z - CIU.pz) > 2.5) col = [235, 220, 140];
    set(i, 0, k, col); if (acera) set(i, 1, k, col); }
  const RB = rng(4);
  for (const sd of [-1, 1]) { let z = Z0; while (z < Z1) { const w = 5 + RB() * 5, h = 10 + RB() * 14, cols = [[176, 92, 70], [214, 196, 170], [150, 150, 156], [196, 170, 130], [120, 130, 150]], cb = cols[RB() * cols.length | 0], tc = [[200, 60, 60], [40, 110, 70], [30, 70, 140], [220, 150, 40]][RB() * 4 | 0];
      for (let k = I(z); k < I(Math.min(Z1, z + w)); k++) for (let j = 1; j < I(h); j++) for (let dd = 0; dd < 2; dd++) { const i = sd > 0 ? I(7) + dd : I(-7) - 1 - dd, y = j * u, zz = (k + .5) * u;
        let col = cb, emit = false; const fz = ((zz - z) % 2 + 2) % 2, piso = ((y - 4.2) % 3.1 + 3.1) % 3.1;
        if (dd === 0 && y > 4 && piso < 1.9 && fz > .45 && fz < 1.55) { const lit = hash3(k / 8 | 0, j / 17 | 0, sd) > .7; col = lit ? [255, 214, 140] : [70, 96, 124]; emit = lit; }
        if (dd === 0 && y < 3.2 && y > .3) { col = y > 2.9 ? tc : [255, 228, 180]; emit = y <= 2.9; }
        set(i, j, k, jit(col, .95 + .08 * RB()), emit); }
      for (let k = I(z); k < I(Math.min(Z1, z + w)); k++) for (let a = 0; a < 6; a++) set(sd > 0 ? I(7) - 1 - a : I(-7) + a, I(3.1) - Math.floor(a / 2), k, (k % 2) ? [245, 240, 230] : tc);
      z += w; }
    for (let z2 = -22; z2 < 13; z2 += 9) { const xi = I(sd * 4.5); for (let j = 1; j < I(5.2); j++) set(xi, j, I(z2), [50, 54, 60]); set(xi - sd, I(5.2), I(z2), [255, 236, 190], true); set(xi - 2 * sd, I(5.2), I(z2), [255, 236, 190], true);
      if (Math.abs(z2 + 4.5 - CIU.pz) > 2.5) { const xt = I(sd * 5.6), zt = I(z2 + 4.5); for (let j = 1; j < I(2.4); j++) set(xt, j, zt, [96, 72, 52]); for (let a = -5; a <= 5; a++) for (let b = -4; b <= 5; b++) for (let c2 = -5; c2 <= 5; c2++) if (a * a + (b * 1.2) ** 2 + c2 * c2 < 26 + 6 * R()) set(xt + a, I(3.2) + b, zt + c2, jit([70, 128, 60], .8 + .35 * R())); } } }
  const S = construyeCiudad({ z0: Z0, z1: Z1 });
  for (const g of S.gente) { const P = personaPartes(g.P, 0); for (let a = -5; a <= 5; a++) for (let j = 0; j <= 11; j++) for (let b = -5; b <= 5; b++) { const w = [a * u, (j + .5) * u, b * u], l = rotY(w, -g.rot), q = personaDentro(l[0], l[1] - (g.pos[1] > 0 ? 0 : 0), l[2], P); if (q) set(I(g.pos[0]) + a, 1 + (g.pos[1] > 0 ? 1 : 0) + j, I(g.pos[2]) + b, q.col); } }
  const F = [], dirs = [['top', 0, 1, 0], ['bottom', 0, -1, 0], ['right', 1, 0, 0], ['left', -1, 0, 0], ['front', 0, 0, 1], ['back', 0, 0, -1]], all = { top: 1, bottom: 1, right: 1, left: 1, front: 1, back: 1 };
  for (const v of vox.values()) for (const [nm, a, b, c] of dirs) { if (vox.get(key(v.i + a, v.j + b, v.k + c))) continue; const sk = { ...all }; delete sk[nm]; box(F, v.i * u, v.j * u, v.k * u, (v.i + 1) * u, (v.j + 1) * u, (v.k + 1) * u, v.col, { skip: sk, f: v.emit ? { emit: true } : {} }); }
  render(ctx, cam, F, { ...LUZC, seam: .7 });
};

// 3 · ISOMÉTRICO / DIORAMA (manzana en corte)
EC.iso = ctx => {
  ctx.fillStyle = lin(ctx, 0, 0, 0, H, [['#f2ead8', 0], ['#e4d6c0', 1]]); ctx.fillRect(0, 0, W, H);
  const cam = camera([16, 34, 46], [1.5, 2, 3], { ortho: 33, cy: H * .52 }), S = escena({ z0: -9, z1: 15, hMax: 11, escalaH: .75, n: 200, latP: 6, lonP: 9 }), base = [];
  const sh = cam.P([0, -2, 3]); ctx.fillStyle = 'rgba(80,60,40,.18)'; ctx.beginPath(); ctx.ellipse(sh[0], sh[1] + 150, 520, 200, 0, 0, 7); ctx.fill();
  box(base, -15.5, -2, -9, 15.5, -.01, 15, [120, 96, 72], { top: [90, 88, 86] }); box(base, -15.5, -1.2, -9, 15.5, -.6, 15, [150, 120, 90], { skip: { top: 1, bottom: 1 } });
  render(ctx, cam, base, { ...LUZC, amb: .55 }); renderCiudad(ctx, cam, S, { luz: { amb: .5 } });
};

// 4 · LOW-POLY
EC.lowpoly = ctx => {
  const cam = CAMC(W, H); cieloCiudad(ctx, W, H, cam, { stops: [['#7ab0dc', 0], ['#bcdcf0', .5], ['#f6e4c8', 1]] });
  const S = escena({ latP: 3, lonP: 4 }); const R = rng(9);
  for (const capa of [S.suelo, S.edif, S.fach, S.calle]) for (const f of capa) if (!f.emit) f.col = jit(f.col, .9 + .2 * R());
  S.fach = S.fach.filter(f => !(f.col[0] > 225 && f.col[1] > 225 && f.col[2] > 215 && !f.emit));
  renderCiudad(ctx, cam, S, { seam: 1, luz: { amb: .45 } });
  const g = ctx.createLinearGradient(0, 0, 0, H * .45); g.addColorStop(0, 'rgba(240,226,206,.0)'); g.addColorStop(1, 'rgba(240,226,206,.35)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * .45);
};

// 5 · WIREFRAME RETRO (noche de neón)
EC.wire = ctx => {
  ctx.fillStyle = lin(ctx, 0, 0, 0, H, [['#05000f', 0], ['#1a0036', .5], ['#3a0a4a', 1]]); ctx.fillRect(0, 0, W, H); estrellasC(ctx);
  const cam = CAMC(W, H), S = escena({ latP: 4, lonP: 6 });
  render(ctx, cam, S.suelo.filter(f => f.col[0] > 200), { wire: { fill: '#200a30', line: '#ffffff', lw: 1.5, glow: 'rgba(255,255,255,.15)', gw: 5 } });
  for (let z = 18; z > -75; z -= 2) { const a = cam.P([-7, 0, z]), b = cam.P([7, 0, z]); ctx.strokeStyle = 'rgba(255,60,200,.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  for (const x of [-7, -4, 0, 4, 7]) { const a = cam.P([x, 0, 18]), b = cam.P([x, 0, -75]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  render(ctx, cam, S.edif, { wire: { fill: '#0a0420', line: '#38f6ff', lw: 1.3, glow: 'rgba(56,246,255,.14)', gw: 5 } });
  render(ctx, cam, S.fach.filter(f => f.emit), { wire: { fill: '#3a1a10', line: '#ffcf6a', lw: 1, glow: 'rgba(255,200,100,.2)', gw: 4 } });
  render(ctx, cam, S.calle, { wire: { fill: '#14031f', line: '#ff6ad5', lw: 1.1, glow: 'rgba(255,106,213,.18)', gw: 4 } });
};
function estrellasC(ctx) { const R = rng(3); for (let i = 0; i < 700; i++) { ctx.fillStyle = `rgba(255,255,255,${R() * .8})`; ctx.fillRect(R() * W, R() * H * .4, 2, 2); } }

// 6 · TOON / CEL SHADING (sombreado en bandas + tinta)
EC.toon = ctx => {
  const cam = CAMC(W, H); ctx.fillStyle = lin(ctx, 0, 0, 0, H * .5, [['#4fa8f0', 0], ['#a8dcff', 1]]); ctx.fillRect(0, 0, W, H);
  const R = rng(4); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1e1430'; ctx.lineWidth = 8; for (let i = 0; i < 4; i++) { const x = R() * W, y = 120 + R() * 400; ctx.beginPath(); for (const [a, b, r] of [[-60, 10, 45], [0, -15, 60], [60, 5, 50]]) { ctx.moveTo(x + a + r, y + b); ctx.arc(x + a, y + b, r, 0, 7); } ctx.fill(); }
  const S = escena({ latP: 7, lonP: 10 }); renderCiudad(ctx, cam, S, { luz: { amb: .25, toon: d => d > .55 ? 1 : d > .2 ? .82 : .62 }, alfaSombra: .5 });
  bordesTinta(ctx, W, H, 30, [30, 20, 40], 2);
};

// 7 · 2.5D PAPERCRAFT (capas de papel con sombra)
EC.paper = ctx => {
  const cam = CAMC(W, H); ctx.fillStyle = lin(ctx, 0, 0, 0, H * .5, [['#9cc8e8', 0], ['#f4e6d0', 1]]); ctx.fillRect(0, 0, W, H);
  const S = escena({ latP: 6, lonP: 8 }), toon = d => d > .5 ? 1 : d > .15 ? .85 : .7, L = { ...LUZC, amb: .35, toon, seam: 1 };
  const capa = (F, sh) => { const c = mk(W, H), g = c.getContext('2d'); render(g, cam, F, L); const s2 = mk(W, H), sg = s2.getContext('2d'); sg.drawImage(c, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = 'rgba(40,25,10,.35)'; sg.fillRect(0, 0, W, H); for (let k = sh; k >= 1; k--) { ctx.globalAlpha = .45; ctx.drawImage(s2, k * 2, k * 2.5); } ctx.globalAlpha = 1; ctx.drawImage(c, 0, 0); };
  capa(S.suelo, 0); capa(S.edif, 4); capa(S.fach, 2);
  const lejos = S.calle.filter(f => centroid(f.p)[2] < -10), medio = S.calle.filter(f => { const z = centroid(f.p)[2]; return z >= -10 && z < 3; }), cerca = S.calle.filter(f => centroid(f.p)[2] >= 3);
  capa(lejos, 2); capa(medio, 3); capa(cerca, 5); posterizar(ctx, W, H, 9); grano(ctx, W, H, 16);
};

// 8 · PARTÍCULAS 3D (ciudad de noche hecha de puntos)
EC.galaxy = ctx => {
  ctx.fillStyle = lin(ctx, 0, 0, 0, H, [['#02010a', 0], ['#0c0820', .5], ['#140a24', 1]]); ctx.fillRect(0, 0, W, H); estrellasC(ctx);
  const cam = CAMC(W, H), S = escena({ latP: 6, lonP: 8, luces: .5 }), R = rng(5), bin = 2, bw = Math.ceil(W / bin), zb = new Float32Array(bw * Math.ceil(H / bin)).fill(1e9), pts = [];
  const todas = [...S.suelo, ...S.edif, ...S.fach, ...S.calle];
  for (const pt of muestreaCaras(todas, 90, R)) { const q = cam.P(pt.p); if (q[2] <= .1 || q[0] < 0 || q[0] >= W || q[1] < 0 || q[1] >= H) continue; const dens = 1 / (q[2] * q[2]); const k = Math.floor(q[1] / bin) * bw + Math.floor(q[0] / bin); if (q[2] < zb[k]) zb[k] = q[2]; pts.push([q, pt, k]); }
  ctx.globalCompositeOperation = 'lighter';
  for (const [q, pt, k] of pts) { if (q[2] > zb[k] + .25) continue; const l = pt.emit ? 1 : .55 + .45 * Math.abs(dot(pt.n, SOLC)); const c = pt.col, s = Math.max(1.4, 3.4 - q[2] * .05);
    ctx.fillStyle = `rgba(${c[0] * l | 0},${c[1] * l | 0},${c[2] * l | 0},${pt.emit ? .8 : .5})`; ctx.fillRect(q[0] - s / 2, q[1] - s / 2, s, s); }
  ctx.globalCompositeOperation = 'source-over';
};

// 9 · RETRO DE CONSOLA (tramado de 4 tonos)
EC.dither = ctx => {
  const lw = 270, lh = 480, c = mk(lw, lh), g = c.getContext('2d'), cam = CAMC(lw, lh); cieloCiudad(g, lw, lh, cam); const S = escena({ latP: 4, lonP: 6 });
  renderCiudad(g, cam, S, { seam: .5 });
  const img = g.getImageData(0, 0, lw, lh), d = img.data, bay = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], pal = ['#2a1a10', '#7a4a2a', '#c8925a', '#f4dcae'].map(hex);
  for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) { const i = (y * lw + x) * 4, l = clamp(Math.pow((d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11) / 255, 1.05)), v = l * 3, k = Math.min(3, Math.floor(v) + ((v - Math.floor(v)) > (bay[y & 3][x & 3] + .5) / 16 ? 1 : 0)); d[i] = pal[k][0]; d[i + 1] = pal[k][1]; d[i + 2] = pal[k][2]; }
  g.putImageData(img, 0, 0); ctx.imageSmoothingEnabled = false; ctx.drawImage(c, 0, 0, W, H);
};

// 10 · ASCII 3D
EC.ascii = ctx => {
  const lw = 360, lh = 640, c = mk(lw, lh), g = c.getContext('2d'), cam = CAMC(lw, lh); cieloCiudad(g, lw, lh, cam); const S = escena({ latP: 5, lonP: 7 });
  renderCiudad(g, cam, S, { seam: .5 });
  const d = g.getImageData(0, 0, lw, lh).data, cw = 9, ch = 15, cols = 120, rows = 128, chars = ' .`,:;~-=+*!?%#&$@';
  ctx.fillStyle = '#05070a'; ctx.fillRect(0, 0, W, H); ctx.font = 'bold 14px "DejaVu Sans Mono", monospace'; ctx.textBaseline = 'top';
  for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
    let A = 0, G = 0, B = 0, n = 0; for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) { const yy = Math.floor(r * lh / rows) + y; if (yy >= lh) continue; const i = (yy * lw + q * 3 + x) * 4; A += d[i]; G += d[i + 1]; B += d[i + 2]; n++; }
    A /= n; G /= n; B /= n; const l = (A * .3 + G * .59 + B * .11) / 255, k = Math.min(chars.length - 1, Math.round(Math.pow(l, .8) * (chars.length - 1)));
    ctx.fillStyle = `rgba(${A | 0},${G | 0},${B | 0},.3)`; ctx.fillRect(q * cw, r * ch, cw, ch); ctx.fillStyle = `rgb(${Math.min(255, A * 1.2 + 25) | 0},${Math.min(255, G * 1.2 + 25) | 0},${Math.min(255, B * 1.2 + 25) | 0})`; ctx.fillText(chars[k], q * cw, r * ch);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
};

// 11 · INFOGRAFÍA 3D (elementos señalados, sin cifras)
EC.info = ctx => {
  const cam = CAMC(W, H); cieloCiudad(ctx, W, H, cam); const S = escena({ latP: 7, lonP: 10 }); renderCiudad(ctx, cam, S, {});
  const g = ctx.createLinearGradient(0, 0, 0, 300); g.addColorStop(0, 'rgba(10,15,30,.85)'); g.addColorStop(1, 'rgba(10,15,30,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 300);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 66px "DejaVu Sans", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Una calle con vida', W / 2, 120);
  ctx.font = 'bold 38px "DejaVu Sans", sans-serif'; ctx.textAlign = 'left';
  const marca = (p, tx, ty, txt) => { const q = cam.P(p), w = ctx.measureText(txt).width, lx = tx + (q[0] < tx ? -10 : w + 10);
    ctx.strokeStyle = '#ffc23c'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(lx, ty - 12); ctx.stroke(); ctx.fillStyle = '#ffc23c'; ctx.beginPath(); ctx.arc(q[0], q[1], 9, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(10,15,30,.85)'; ctx.fillRect(tx - 12, ty - 42, w + 24, 58); ctx.strokeStyle = 'rgba(255,194,60,.7)'; ctx.lineWidth = 2; ctx.strokeRect(tx - 12, ty - 42, w + 24, 58); ctx.fillStyle = '#fff'; ctx.fillText(txt, tx, ty); };
  const cerca = S.gente.filter(g2 => g2.pos[2] > CIU.pz - 1 && Math.abs(g2.pos[0]) < 3).sort((a, b) => b.pos[2] - a.pos[2])[0];
  marca([cerca.pos[0], 1.5, cerca.pos[2]], 600, 1880, 'Peatones'); marca([-2.5, 0, CIU.pz - 1.2], 40, 1500, 'Paso de cebra');
  marca([-(CIU.calle + .45), 3.0, CIU.pz - 2.2], 40, 1180, 'Semáforo'); marca([CIU.calle + .5 - 1.1, 5.3, -6], 640, 760, 'Farola');
  marca([-(CIU.calle + 1.6), 3.4, -9.5], 40, 860, 'Árboles'); marca([CIU.acera, 1.6, -18], 620, 1060, 'Escaparates'); marca([-CIU.acera, 12, -14], 40, 470, 'Ventanas y balcones'); marca([-1.9, 1.2, -12], 640, 1300, 'Coches');
};
const NOMBRES_C = ['pixel', 'voxel', 'iso', 'lowpoly', 'wire', 'toon', 'paper', 'galaxy', 'dither', 'ascii', 'info'];
function renderC(nm) { const c = mk(W, H); EC[nm](c.getContext('2d')); return c.toDataURL('image/png'); }
