'use strict';
// Una persona lo más realista posible: un fotograma por estilo (1080×1920)
const EPx = {};
const persona = (o = {}) => cargaPersona(PERSONA_MALLA, { invertir: true, ...o });
function entorno(o = {}) {   // acera con baldosas, bordillo, fachada al fondo con ventanas y escaparate
  const S = [], A = [], R = rng(5);
  for (let x = -3; x < 3.5; x += .5) for (let z = -2.2; z < 3; z += .5) { const c = jit(o.baldosa || [178, 172, 162], .9 + .14 * R()); S.push({ p: [[x, 0, z], [x, 0, z + .48], [x + .48, 0, z + .48], [x + .48, 0, z]], col: c }); S.push({ p: [[x + .48, -.003, z], [x + .48, -.003, z + .5], [x + .5, -.003, z + .5], [x + .5, -.003, z]], col: [120, 116, 110], two: true }); }
  box(S, -3, -.2, 3, 3.5, 0, 3.4, [200, 198, 192]);
  box(A, -3.2, 0, -2.6, 3.6, 4.4, -2.2, o.pared || [196, 120, 92]);
  const lad = o.ladrillo !== false; if (lad) for (let y = .1; y < 4.3; y += .16) for (let x = -3.2 + ((y * 6.25 | 0) % 2) * .14; x < 3.6; x += .28) A.push({ p: [[x + .01, y + .01, -2.19], [x + .26, y + .01, -2.19], [x + .26, y + .14, -2.19], [x + .01, y + .14, -2.19]], col: jit(o.pared || [196, 120, 92], .86 + .22 * R()), zb: -.01, two: true });
  box(A, -2.6, .3, -2.19, .2, 2.7, -2.12, [40, 40, 44]); box(A, -2.45, .45, -2.13, .05, 2.55, -2.1, [250, 226, 186], { f: { emit: true, zb: -.02 } });
  for (const [x0, y0] of [[1.0, 1.1], [1.0, 3.1]]) { box(A, x0, y0, -2.19, x0 + 1.3, y0 + 1.4, -2.13, [236, 232, 224]); box(A, x0 + .08, y0 + .08, -2.13, x0 + 1.22, y0 + 1.32, -2.11, [70, 96, 124], { f: { zb: -.02 } }); }
  for (let k = 0; k < 10; k++) A.push({ p: [[-2.6 + k * .28, 2.75, -2.1], [-2.6 + (k + 1) * .28, 2.75, -2.1], [-2.6 + (k + 1) * .28, 2.35, -1.3], [-2.6 + k * .28, 2.35, -1.3]], col: k % 2 ? [245, 240, 230] : [40, 110, 70], two: true });
  return { S, A };
}
function sombraPie(F) { const sh = []; for (let k = 0; k < 24; k++) { const a = k / 24 * 6.283; sh.push([.02 + Math.cos(a) * .45 - .15, .004, Math.sin(a) * .26 - .1]); } F.push({ p: sh.reverse(), col: [40, 34, 30], emit: true, two: true, zb: .5 }); }
function cielo(ctx, w, h, st) { ctx.fillStyle = lin(ctx, 0, 0, 0, h, st || [['#9cc4e4', 0], ['#e8e2d6', 1]]); ctx.fillRect(0, 0, w, h); }
function bordesTinta(ctx, w, h, umbral = 30, col = [30, 20, 30], grosor = 2) {
  const img = ctx.getImageData(0, 0, w, h), d = img.data, L = new Float32Array(w * h); for (let i = 0; i < w * h; i++) L[i] = d[i * 4] * .3 + d[i * 4 + 1] * .59 + d[i * 4 + 2] * .11;
  const out = new Uint8Array(w * h); for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x, gx = -L[i - w - 1] - 2 * L[i - 1] - L[i + w - 1] + L[i - w + 1] + 2 * L[i + 1] + L[i + w + 1], gy = -L[i - w - 1] - 2 * L[i - w] - L[i - w + 1] + L[i + w - 1] + 2 * L[i + w] + L[i + w + 1]; if (Math.hypot(gx, gy) > umbral * 4) out[i] = 1; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let e = 0; for (let dy = -grosor + 1; dy < grosor && !e; dy++) for (let dx = -grosor + 1; dx < grosor && !e; dx++) { const yy = y + dy, xx = x + dx; if (yy >= 0 && yy < h && xx >= 0 && xx < w && out[yy * w + xx]) e = 1; } if (e) { const i = (y * w + x) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; } }
  ctx.putImageData(img, 0, 0); }
function posterizar(ctx, w, h, niv) { const img = ctx.getImageData(0, 0, w, h), d = img.data; for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) d[i + k] = Math.round(d[i + k] / 255 * niv) / niv * 255; ctx.putImageData(img, 0, 0); }
function grano(ctx, w, h, k = 14) { const nz = ctx.getImageData(0, 0, w, h), d = nz.data, Rn = rng(77); for (let i = 0; i < d.length; i += 4) { const v = (Rn() - .5) * k; d[i] += v; d[i + 1] += v; d[i + 2] += v; } ctx.putImageData(nz, 0, 0); }
function escenaComun(ctx, w, h, cam, o = {}) { cielo(ctx, w, h, o.cielo); const { S, A } = entorno(o); sombraPie(S); const L = { ...LUZP, ...(o.luz || {}), seam: o.seam ?? .5 };
  render(ctx, cam, S.filter(f => !f.emit), L); ctx.globalAlpha = .35; render(ctx, cam, S.filter(f => f.emit), L); ctx.globalAlpha = 1; render(ctx, cam, A, L); render(ctx, cam, persona(), { ...L, seam: o.seamP ?? .4 }); }

// 1 · PIXEL ART 3D
EPx.pixel = ctx => { const lw = 270, lh = 480, c = mk(lw, lh), g = c.getContext('2d'), cam = CAMP(lw, lh);
  escenaComun(g, lw, lh, cam, { cielo: [['#3a2a6e', 0], ['#ffb070', 1]], luz: { light: norm([.8, .5, .3]), lightCol: [1.3, .95, .75], ambCol: [.6, .5, .8], amb: .45 } });
  quantize(g, lw, lh, ['#1a1430', '#2a2048', '#3a2a6e', '#8a4a8a', '#c0507a', '#ffb070', '#ffd8a0', '#fff4d8', '#202024', '#3a3a42', '#55555e', '#9a9aa4', '#c4c4cc', '#e8e8ee',
    '#5a2a22', '#8a3a2a', '#b05a3a', '#c87a5a', '#e0a080', '#f0c0a0', '#f8dcc4', '#3a2418', '#5a3a26', '#2a3a6a', '#3a5a9a', '#4a70b0', '#6a90c8', '#1a2030', '#2c3448', '#3e4a66', '#8a1a2a', '#e8c040', '#5a8a40', '#ffffff', '#d0c4b0', '#a89880', '#7a6a5a'].map(hex));
  ctx.imageSmoothingEnabled = false; ctx.drawImage(c, 0, 0, W, H); };

// 2 · VÓXEL
EPx.voxel = ctx => { const cam = CAMP(W, H, { eye: [2.5, 1.5, 3.1], target: [0, .95, 0] }); cielo(ctx, W, H, [['#7ab8e8', 0], ['#e4eef6', 1]]);
  const F = [], u = VOX_PERSONA.u, mapa = new Map(), key = (i, j, k) => i + ',' + j + ',' + k; for (const v of VOX_PERSONA.v) mapa.set(key(v[0], v[1], v[2]), v);
  const R = rng(3), uS = .1; for (let i = -12; i < 14; i++) for (let k = -10; k < 12; k++) { const tile = ((i >> 2) + (k >> 2)) & 1; box(F, i * uS, -uS, k * uS, (i + 1) * uS, 0, (k + 1) * uS, jit(tile ? [180, 174, 164] : [166, 160, 150], .93 + .1 * R())); }
  for (let i = -14; i < 16; i++) for (let j = 0; j < 30; j++) { const lad = ((j % 2) ? (i + 1) >> 1 : i >> 1); let c = jit([196, 120, 92], .88 + .2 * hash3(lad, j, 1)); if (j % 4 === 3) c = [214, 204, 190]; if (i > -10 && i < 0 && j > 2 && j < 22) c = j > 20 ? [40, 110, 70] : [250, 226, 186]; box(F, i * uS, j * uS, -1.1 - uS, (i + 1) * uS, (j + 1) * uS, -1.1, c, { f: (i > -10 && i < 0 && j > 2 && j < 20) ? { emit: true } : {} }); }
  const dirs = [['top', 0, 1, 0], ['bottom', 0, -1, 0], ['right', 1, 0, 0], ['left', -1, 0, 0], ['front', 0, 0, 1], ['back', 0, 0, -1]], all = { top: 1, bottom: 1, right: 1, left: 1, front: 1, back: 1 };
  for (const v of VOX_PERSONA.v) for (const [nm, a, b, c] of dirs) { if (mapa.get(key(v[0] + a, v[1] + b, v[2] + c))) continue; const sk = { ...all }; delete sk[nm]; box(F, v[0] * u, v[1] * u, v[2] * u, (v[0] + 1) * u, (v[1] + 1) * u, (v[2] + 1) * u, [v[3], v[4], v[5]], { skip: sk }); }
  render(ctx, cam, F, { ...LUZP, seam: .7 }); };

// 3 · ISOMÉTRICO / DIORAMA (pedestal con trozo de acera, farola y banco)
EPx.iso = ctx => { ctx.fillStyle = lin(ctx, 0, 0, 0, H, [['#f2ead8', 0], ['#e4d6c0', 1]]); ctx.fillRect(0, 0, W, H);
  const cam = camera([20, 12, 20], [0, .85, 0], { ortho: 460, cy: H * .52 }), F = [], B = [];
  lathe(B, [[0, -.02], [1.15, -.02], [1.15, -.25], [1.2, -.3], [0, -.3]], 48, y => y > -.1 ? [176, 170, 160] : [120, 96, 72], [0, -.15, 0]);
  for (let x = -1.1; x < 1.1; x += .25) for (let z = -1.1; z < 1.1; z += .25) if (Math.hypot(x + .125, z + .125) < 1.08) B.push({ p: [[x + .01, 0, z + .01], [x + .01, 0, z + .24], [x + .24, 0, z + .24], [x + .24, 0, z + .01]], col: jit([186, 180, 170], .92 + .1 * hash3(x * 8, z * 8, 2)), zb: -.01 });
  tubo2(F, [-.75, 0, -.55], [-.75, 2.3, -.55], .035, .03, 8, [50, 54, 60]); tubo2(F, [-.75, 2.3, -.55], [-.45, 2.38, -.55], .02, .02, 6, [50, 54, 60]); box(F, -.55, 2.3, -.62, -.35, 2.38, -.48, [255, 236, 190], { f: { emit: true } });
  box(F, .35, .4, -.8, .95, .44, -.55, [120, 80, 50]); box(F, .35, .44, -.82, .95, .72, -.79, [120, 80, 50]); for (const a of [.4, .9]) box(F, a - .02, 0, -.8, a + .02, .4, -.55, [40, 40, 44]);
  sombraPie(B); render(ctx, cam, B, { ...LUZP, amb: .5 }); render(ctx, cam, [...F, ...persona({ rot: .3 })], { ...LUZP, amb: .45, seam: .4 }); };
function tubo2(F, a, b, r1, r2, seg, col) { const d = norm(sub(b, a)), Bb = baseDir(d), ring = (c, r, k) => { const an = k / seg * 6.283; return add(c, add(mul(Bb[0], Math.cos(an) * r), mul(Bb[2], Math.sin(an) * r))); }; const fs = []; for (let k = 0; k < seg; k++) fs.push({ p: [ring(a, r1, k), ring(a, r1, k + 1), ring(b, r2, k + 1), ring(b, r2, k)], col }); orientTo(fs, mul(add(a, b), .5)); F.push(...fs); }

// 4 · LOW-POLY (malla simplificada a facetas)
EPx.lowpoly = ctx => { const cam = CAMP(W, H); cielo(ctx, W, H, [['#7ab0dc', 0], ['#f6e4c8', 1]]); const { S, A } = entorno({ ladrillo: false, pared: [214, 160, 120] }); sombraPie(S);
  const F = [], R = rng(4); personaMallaHD(F, { lat: 5, lon: 7 }); for (const f of F) f.col = jit(f.col, .93 + .12 * R());
  const L = { ...LUZP, seam: 1 }; render(ctx, cam, S.filter(f => !f.emit), L); ctx.globalAlpha = .35; render(ctx, cam, S.filter(f => f.emit), L); ctx.globalAlpha = 1; render(ctx, cam, A, L); render(ctx, cam, F, L); };

// 5 · WIREFRAME RETRO
EPx.wire = ctx => { ctx.fillStyle = lin(ctx, 0, 0, 0, H, [['#05000f', 0], ['#1a0036', .55], ['#3a0a4a', 1]]); ctx.fillRect(0, 0, W, H); const cam = CAMP(W, H), Rr = rng(3);
  for (let i = 0; i < 500; i++) { ctx.fillStyle = `rgba(255,255,255,${Rr() * .8})`; ctx.fillRect(Rr() * W, Rr() * H * .45, 2, 2); }
  for (let z = 3; z > -60; z -= .5) { const a = cam.P([-30, 0, z]), b = cam.P([30, 0, z]); ctx.strokeStyle = 'rgba(255,60,200,.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  for (let x = -6; x <= 6; x += .5) { const a = cam.P([x, 0, 3]), b = cam.P([x, 0, -60]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  const m = PERSONA_MALLA, F = [], qz = v => Math.round(v / .03) * .03; for (let i = 0; i < m.f.length; i += 3) { const P = [0, 2, 1].map(k => { const j = m.f[i + k] * 3; return [qz(m.v[j]), qz(m.v[j + 1]), qz(m.v[j + 2])]; }); if (Math.hypot(...cross(sub(P[1], P[0]), sub(P[2], P[0]))) < 1e-6) continue; F.push({ p: P, col: [0, 0, 0] }); }
  render(ctx, cam, F, { wire: { fill: '#14031f', line: '#38f6ff', lw: 1, glow: 'rgba(56,246,255,.16)', gw: 4 } }); };

// 6 · TOON / CEL SHADING
EPx.toon = ctx => { const cam = CAMP(W, H); escenaComun(ctx, W, H, cam, { cielo: [['#4fa8f0', 0], ['#bfe4ff', 1]], luz: { amb: .25, toon: d => d > .55 ? 1 : d > .18 ? .8 : .6 }, seamP: .6 }); bordesTinta(ctx, W, H, 44, [30, 22, 34], 2); };

// 7 · 2.5D PAPERCRAFT
EPx.paper = ctx => { const cam = CAMP(W, H); cielo(ctx, W, H, [['#9cc8e8', 0], ['#f4e6d0', 1]]); const { S, A } = entorno({ pared: [214, 150, 110] }), toon = d => d > .5 ? 1 : d > .15 ? .85 : .7, L = { ...LUZP, amb: .35, toon, seam: .6 };
  const capa = (F, sh) => { const c = mk(W, H), g = c.getContext('2d'); render(g, cam, F, L); const s2 = mk(W, H), sg = s2.getContext('2d'); sg.drawImage(c, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = 'rgba(40,25,10,.35)'; sg.fillRect(0, 0, W, H); for (let k = sh; k >= 1; k--) { ctx.globalAlpha = .4; ctx.drawImage(s2, k * 2.5, k * 3); } ctx.globalAlpha = 1; ctx.drawImage(c, 0, 0); };
  capa(S.filter(f => !f.emit), 0); capa(A, 3);
  const P = persona(), ropa = P.filter(f => f.col[2] > f.col[0] + 10 || (f.col[0] < 90 && f.col[1] < 90)), resto = P.filter(f => !ropa.includes(f));
  capa(P, 7); posterizar(ctx, W, H, 11); grano(ctx, W, H, 16); };

// 8 · PARTÍCULAS 3D
EPx.galaxy = ctx => { ctx.fillStyle = lin(ctx, 0, 0, 0, H, [['#02010a', 0], ['#0c0820', .5], ['#140a24', 1]]); ctx.fillRect(0, 0, W, H);
  const R = rng(5); for (let i = 0; i < 1500; i++) { ctx.fillStyle = `rgba(255,255,255,${R() * .7})`; ctx.fillRect(R() * W, R() * H, 1.5, 1.5); }
  const cam = CAMP(W, H), bin = 2, bw = Math.ceil(W / bin), zb = new Float32Array(bw * Math.ceil(H / bin)).fill(1e9), pts = [];
  for (const pt of muestrea(persona(), 260000, R)) { const q = cam.P(pt.p); if (q[2] <= .1) continue; const k = Math.floor(q[1] / bin) * bw + Math.floor(q[0] / bin); if (q[2] < zb[k]) zb[k] = q[2]; pts.push([q, pt, k]); }
  ctx.globalCompositeOperation = 'lighter';
  for (const [q, pt, k] of pts) { if (q[2] > zb[k] + .03) continue; const l = .35 + .65 * Math.max(0, -dot(pt.n, SOLP)); ctx.fillStyle = `rgba(${pt.col[0] * l | 0},${pt.col[1] * l | 0},${pt.col[2] * l | 0},.55)`; ctx.fillRect(q[0] - 1, q[1] - 1, 2, 2); }
  for (let i = 0; i < 40000; i++) { const x = (R() - .5) * 6, z = -3 + R() * 6, q = cam.P([x, 0, z]); ctx.fillStyle = 'rgba(160,140,220,.12)'; ctx.fillRect(q[0], q[1], 2, 2); }
  ctx.globalCompositeOperation = 'source-over'; };

// 9 · RETRO DE CONSOLA
EPx.dither = ctx => { const lw = 270, lh = 480, c = mk(lw, lh), g = c.getContext('2d'), cam = CAMP(lw, lh); escenaComun(g, lw, lh, cam, {});
  const img = g.getImageData(0, 0, lw, lh), d = img.data, bay = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], pal = ['#1b1b2f', '#4a4a7a', '#9a9ac8', '#e8e8f8'].map(hex);
  for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) { const i = (y * lw + x) * 4, l = clamp(Math.pow((d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11) / 255, 1.1)), v = l * 3, k = Math.min(3, Math.floor(v) + ((v - Math.floor(v)) > (bay[y & 3][x & 3] + .5) / 16 ? 1 : 0)); d[i] = pal[k][0]; d[i + 1] = pal[k][1]; d[i + 2] = pal[k][2]; }
  g.putImageData(img, 0, 0); ctx.imageSmoothingEnabled = false; ctx.drawImage(c, 0, 0, W, H); };

// 10 · ASCII 3D
EPx.ascii = ctx => { const lw = 360, lh = 640, c = mk(lw, lh), g = c.getContext('2d'), cam = CAMP(lw, lh); escenaComun(g, lw, lh, cam, {});
  const d = g.getImageData(0, 0, lw, lh).data, cw = 9, ch = 15, cols = 120, rows = 128, chars = ' .`,:;~-=+*!?%#&$@';
  ctx.fillStyle = '#05070a'; ctx.fillRect(0, 0, W, H); ctx.font = 'bold 14px "DejaVu Sans Mono", monospace'; ctx.textBaseline = 'top';
  for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) { let A = 0, Gg = 0, B = 0, n = 0; for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) { const yy = Math.floor(r * lh / rows) + y; if (yy >= lh) continue; const i = (yy * lw + q * 3 + x) * 4; A += d[i]; Gg += d[i + 1]; B += d[i + 2]; n++; }
    A /= n; Gg /= n; B /= n; const l = (A * .3 + Gg * .59 + B * .11) / 255, k = Math.min(chars.length - 1, Math.round(Math.pow(1 - l, .9) * (chars.length - 1)));
    ctx.fillStyle = `rgba(${A | 0},${Gg | 0},${B | 0},.35)`; ctx.fillRect(q * cw, r * ch, cw, ch); ctx.fillStyle = `rgb(${Math.min(255, A * 1.1 + 20) | 0},${Math.min(255, Gg * 1.1 + 20) | 0},${Math.min(255, B * 1.1 + 20) | 0})`; ctx.fillText(chars[k], q * cw, r * ch); }
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1); };

// 11 · INFOGRAFÍA 3D (partes señaladas, sin cifras)
EPx.info = ctx => { ctx.fillStyle = lin(ctx, 0, 0, 0, H, [['#0e1424', 0], ['#1b2540', 1]]); ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(120,150,220,.07)'; for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); } for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.fillStyle = '#fff'; ctx.font = 'bold 64px "DejaVu Sans", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Una persona en 3D', W / 2, 150); ctx.fillStyle = '#9fb0d8'; ctx.font = '34px "DejaVu Sans", sans-serif'; ctx.fillText('modelada por código, pieza a pieza', W / 2, 205);
  const cam = CAMP(W, H, { eye: [2.6, 1.3, 2.9], target: [.05, .93, 0], fov: 40 }), B = []; lathe(B, [[0, -.01], [.6, -.01], [.62, -.06], [0, -.06]], 40, () => [44, 58, 92], [0, -.03, 0]);
  render(ctx, cam, B, { ...LUZP, amb: .5 }); render(ctx, cam, persona(), { ...LUZP, seam: .4 });
  ctx.font = 'bold 38px "DejaVu Sans", sans-serif'; ctx.textAlign = 'left';
  const marca = (p, tx, ty, txt) => { const q = cam.P(p), w = ctx.measureText(txt).width, lx = tx + (q[0] < tx ? -10 : w + 10); ctx.strokeStyle = '#ffc23c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(lx, ty - 12); ctx.stroke(); ctx.fillStyle = '#ffc23c'; ctx.beginPath(); ctx.arc(q[0], q[1], 7, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(14,20,36,.85)'; ctx.fillRect(tx - 12, ty - 42, w + 24, 58); ctx.strokeStyle = 'rgba(255,194,60,.6)'; ctx.lineWidth = 2; ctx.strokeRect(tx - 12, ty - 42, w + 24, 58); ctx.fillStyle = '#fff'; ctx.fillText(txt, tx, ty); };
  const Pp = personaHD(.15), busca = n => Pp.find(q => q.part === n), mano = Pp.filter(q => q.grupo === 'brazoD').slice(-6)[0];
  marca(add(busca('pelo').c, [0, .07, .03]), 640, 330, 'Pelo en mechones'); marca(busca('iris').c, 700, 470, 'Ojos con iris'); marca(add(busca('aleta').c, [.01, 0, .02]), 700, 610, 'Nariz');
  marca(busca('labio').c, 60, 560, 'Labios'); marca(Pp.filter(q => q.part === 'oreja')[1].c, 60, 400, 'Orejas'); marca(busca('boton').c, 640, 880, 'Camisa y botones');
  marca(busca('hebilla').c, 60, 1060, 'Cinturón'); marca(mano.c, 640, 1180, 'Manos con dedos'); marca(Pp.filter(q => q.part === 'zapato')[0].c, 60, 1640, 'Zapatillas con cordones');
  ctx.textAlign = 'left'; };
const LISTA_P = ['pixel', 'voxel', 'iso', 'lowpoly', 'wire', 'toon', 'paper', 'galaxy', 'dither', 'ascii', 'info'];
function renderPx(nm) { const c = mk(W, H); EPx[nm](c.getContext('2d')); return c.toDataURL('image/png'); }
