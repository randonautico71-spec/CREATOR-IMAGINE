'use strict';
// ESTILOS EXTRA (pruebas): la misma escena de la ballena y el tiburón en el fondo marino, con 14 tratamientos nuevos sobre las mallas.
// Todo se calcula por píxel en JavaScript (sin ctx.filter ni shadowBlur). Uso: renderExtra('<estilo>').
const EX = {};
const lienzo = (w, h) => { const c = mk(w, h); return [c, c.getContext('2d')]; };
function base(w, h, o = {}) { const [c, g] = lienzo(w, h), cam = CAMM(w, h, o.cam || {}); pintaMar(g, w, h, cam, { nieve: false, ...o }); return [c, g, cam]; }
const aF = (d, n) => { const A = new Float32Array(n * 3); for (let i = 0; i < n; i++) { A[i * 3] = d[i * 4]; A[i * 3 + 1] = d[i * 4 + 1]; A[i * 3 + 2] = d[i * 4 + 2]; } return A; };
function caja1(A, w, h, r, ch = 3) {   // desenfoque de caja separable (dos pasadas ≈ gaussiano)
  const B = new Float32Array(A.length), Cc = new Float32Array(A.length);
  for (let y = 0; y < h; y++) for (let k = 0; k < ch; k++) { let s = 0; for (let x = -r; x <= r; x++) s += A[(y * w + Math.min(w - 1, Math.max(0, x))) * ch + k];
    for (let x = 0; x < w; x++) { B[(y * w + x) * ch + k] = s / (2 * r + 1); s += A[(y * w + Math.min(w - 1, x + r + 1)) * ch + k] - A[(y * w + Math.max(0, x - r)) * ch + k]; } }
  for (let x = 0; x < w; x++) for (let k = 0; k < ch; k++) { let s = 0; for (let y = -r; y <= r; y++) s += B[(Math.min(h - 1, Math.max(0, y)) * w + x) * ch + k];
    for (let y = 0; y < h; y++) { Cc[(y * w + x) * ch + k] = s / (2 * r + 1); s += B[(Math.min(h - 1, y + r + 1) * w + x) * ch + k] - B[(Math.max(0, y - r) * w + x) * ch + k]; } }
  return Cc; }
const desenfoca = (A, w, h, r, ch = 3) => caja1(caja1(A, w, h, r, ch), w, h, r, ch);
const lumA = (A, n) => { const L = new Float32Array(n); for (let i = 0; i < n; i++) L[i] = (A[i * 3] * .3 + A[i * 3 + 1] * .59 + A[i * 3 + 2] * .11) / 255; return L; };
function sobel(L, w, h) { const G = new Float32Array(w * h), Ang = new Float32Array(w * h); for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x, gx = -L[i - w - 1] - 2 * L[i - 1] - L[i + w - 1] + L[i - w + 1] + 2 * L[i + 1] + L[i + w + 1], gy = -L[i - w - 1] - 2 * L[i - w] - L[i - w + 1] + L[i + w - 1] + 2 * L[i + w] + L[i + w + 1]; G[i] = Math.hypot(gx, gy); Ang[i] = Math.atan2(gy, gx); } return [G, Ang]; }
const vuelca = (ctx, w, h, f) => { const img = ctx.createImageData(w, h), d = img.data; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4, c = f(x, y, y * w + x); d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; } return img; };
const escala = (ctx, img, w, h, suave = true) => { const [c, g] = lienzo(w, h); g.putImageData(img, 0, 0); ctx.imageSmoothingEnabled = suave; ctx.drawImage(c, 0, 0, W, H); };

// 1 · ACUARELA: veladuras transparentes que se corren, bordes con más pigmento, flores de agua, brillos de papel blanco
EX.acuarela = ctx => { const w = 540, h = 960, [, g] = base(w, h, { rayos: false, luz: { amb: .6 }, agua: [['#cdeef5', 0], ['#7cc2d8', .5], ['#3a8ab0', 1]] }), n = w * h, A = aF(g.getImageData(0, 0, w, h).data, n), C = desenfoca(A, w, h, 3), D = desenfoca(A, w, h, 9), LC = lumA(C, n), LD = lumA(D, n);
  const img = vuelca(ctx, w, h, (x, y, i) => { const sx = Math.min(w - 1, Math.max(0, Math.round(x + (fbm3(x * .012, y * .012, 1, 4) - .5) * 18))), sy = Math.min(h - 1, Math.max(0, Math.round(y + (fbm3(x * .012, y * .012, 7, 4) - .5) * 18))), j = sy * w + sx;
    const borde = clamp(Math.abs(LC[j] - LD[j]) * 5), flor = .78 + .45 * fbm3(x * .008, y * .008, 4, 4), anillo = Math.abs(fbm3(x * .01, y * .01, 11, 3) - .5) < .012 ? .25 : 0, gran = .95 + .08 * vnoise3(x * .15, y * .15, 3);
    const papel = [253, 250, 243].map(v => v * (.965 + .035 * fbm3(x * .06, y * .06, 9, 4)));
    return [0, 1, 2].map(k => { let t = 1 - C[j * 3 + k] / 255; t = clamp(t * .8 * flor * gran * (1 + 1.2 * borde + anillo)); if (LC[j] > .82) t *= .25; return papel[k] * (1 - t); }); });
  escala(ctx, img, w, h); grano(ctx, W, H, 5); };

// 2 · ÓLEO / EMPASTE: pinceladas que siguen la forma, con relieve de pintura
EX.oleo = ctx => { const w = 540, h = 960, [, g] = base(w, h, {}), n = w * h, A = aF(g.getImageData(0, 0, w, h).data, n), B = desenfoca(A, w, h, 3), [G, Ang] = sobel(lumA(B, n), w, h), R = rng(11);
  ctx.fillStyle = '#b8a888'; ctx.fillRect(0, 0, W, H); for (let y = 0; y < H; y += 4) { ctx.fillStyle = `rgba(0,0,0,${.03 + .03 * (y % 8 === 0)})`; ctx.fillRect(0, y, W, 2); }
  ctx.lineCap = 'round';
  for (const [s, fuente, prob] of [[16, B, 1], [9, B, .95], [5, A, .7]]) { const st = s * .85;
    for (let py = 0; py < H; py += st) for (let px = 0; px < W; px += st) { const x = px + (R() - .5) * st, y = py + (R() - .5) * st, ix = Math.min(w - 1, Math.max(0, Math.round(x / 2))), iy = Math.min(h - 1, Math.max(0, Math.round(y / 2))), i = iy * w + ix;
      if (s === 5 && G[i] < .08 && R() > .3) continue; if (R() > prob) continue;
      const a = Ang[i] + Math.PI / 2, L = s * (1.8 + R()), dx = Math.cos(a) * L / 2, dy = Math.sin(a) * L / 2, j = 1 + (R() - .5) * .14, c = [0, 1, 2].map(k => clamp(fuente[i * 3 + k] * j, 0, 255) | 0);
      ctx.strokeStyle = `rgb(${c})`; ctx.lineWidth = s; ctx.beginPath(); ctx.moveTo(x - dx, y - dy); ctx.lineTo(x + dx, y + dy); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,240,.18)'; ctx.lineWidth = s * .25; ctx.beginPath(); ctx.moveTo(x - dx - s * .2, y - dy - s * .2); ctx.lineTo(x + dx - s * .2, y + dy - s * .2); ctx.stroke();
      ctx.strokeStyle = 'rgba(40,25,10,.16)'; ctx.beginPath(); ctx.moveTo(x - dx + s * .25, y - dy + s * .25); ctx.lineTo(x + dx + s * .25, y + dy + s * .25); ctx.stroke(); } } };

// 3 · LÁPIZ / BOCETO: rayado y rayado cruzado según la sombra, contornos de grafito y papel
EX.lapiz = ctx => { const w = W, h = H, [, g] = base(w, h, { rayos: false, fog: false, agua: [['#d8e8ee', 0], ['#a8c4d0', 1]] }), n = w * h, A = aF(g.getImageData(0, 0, w, h).data, n), L = lumA(desenfoca(A, w, h, 1), n), [G] = sobel(L, w, h);
  const capas = [[.18, .78, 9], [.36, -.78, 8], [.56, 0, 7], [.74, 1.57, 6]].map(([u, a, s]) => [u, Math.cos(a), Math.sin(a), s]);
  ctx.putImageData(vuelca(ctx, w, h, (x, y, i) => { const D = 1 - Math.pow(L[i], .9), wob = 2.5 * vnoise3(x * .01, y * .01, 5); let gr = 0;
    for (const [u, ca, sa, s] of capas) if (D > u) { const v = ((x * ca + y * sa + wob) % s + s) % s; if (Math.abs(v - s / 2) < .7 + D) gr += .32 * (.6 + .4 * vnoise3(x * .3, y * .3, u * 10)); }
    if (G[i] > .35) gr += .55; gr = Math.min(.88, gr); const p = .95 + .05 * vnoise3(x * .5, y * .5, 1); return [246 * p - gr * 190, 244 * p - gr * 188, 238 * p - gr * 176]; }), 0, 0); };

// 4 · TINTA / GRABADO: líneas paralelas cuyo grosor sigue la sombra, sobre papel antiguo
EX.tinta = ctx => { const w = W, h = H, [, g] = base(w, h, { rayos: false, fog: false, agua: [['#e0e0e0', 0], ['#909090', 1]] }), n = w * h, A = aF(g.getImageData(0, 0, w, h).data, n), L = lumA(desenfoca(A, w, h, 2), n), [G] = sobel(L, w, h);
  ctx.putImageData(vuelca(ctx, w, h, (x, y, i) => { const D = 1 - L[i], s = 7, v = ((y + 3 * Math.sin(x * .025) + 6 * L[i]) % s + s) % s; let tin = Math.abs(v - s / 2) < D * 3.4 ? 1 : 0;
    if (D > .62) { const u = ((x * .5 + y * .87) % 6 + 6) % 6; if (Math.abs(u - 3) < (D - .62) * 6) tin = 1; } if (G[i] > .45) tin = 1;
    const p = .92 + .08 * fbm3(x * .01, y * .01, 3, 3); return tin ? [38, 26, 20] : [238 * p, 224 * p, 192 * p]; }), 0, 0);
  const v = ctx.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .75); v.addColorStop(0, 'rgba(120,80,30,0)'); v.addColorStop(1, 'rgba(120,80,30,.35)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H); };

// 5 · CÓMIC CON TRAMAS: colores planos, contorno de tinta y puntos de imprenta
EX.comic = ctx => { const cam = CAMM(W, H); pintaMar(ctx, W, H, cam, { nieve: false, rayos: false, agua: [['#5ad2ee', 0], ['#1a8cc0', .6], ['#0c5a90', 1]], luz: { amb: .35, toon: d => d > .55 ? 1 : d > .2 ? .75 : .5 }, niebla: { far: 90, max: .6 } });
  posterizar(ctx, W, H, 5); bordesTinta(ctx, W, H, 34, [12, 10, 20], 3);
  const d = ctx.getImageData(0, 0, W, H).data, s = 12; ctx.save(); ctx.globalCompositeOperation = 'multiply';
  for (let y = 0; y < H; y += s) for (let x = (y / s) % 2 ? s / 2 : 0; x < W; x += s) { const i = ((y | 0) * W + (x | 0)) * 4, L = (d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11) / 255; if (L > .85) continue; const r = (1 - L) * s * .42;
    ctx.fillStyle = L < .35 ? 'rgba(10,10,30,.55)' : `rgba(${d[i] * .55 | 0},${d[i + 1] * .55 | 0},${d[i + 2] * .55 | 0},.6)`; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
  ctx.restore(); ctx.lineWidth = 10; ctx.strokeStyle = '#111'; ctx.strokeRect(30, 30, W - 60, H - 60); };

// 6 · ORIGAMI: papel plegado con aristas marcadas y fibra de papel
EX.origami = ctx => { const cam = CAMM(W, H), S = escenaMar({ lp: true, paso: 3.4, det: .5, nPeces: 90, causticas: false }), R = rng(7);
  const papel = { fondo: [214, 196, 160], rocas: [150, 140, 128], vida: [96, 150, 90], peces: [240, 200, 80], ballena: null, tiburon: null };
  for (const k in papel) for (const f of S[k]) { if (papel[k]) f.col = jit(papel[k], .95 + .1 * R()); else f.col = jit(f.col.map(v => v * .75 + 55), .97 + .06 * R()); }
  ctx.fillStyle = lin(ctx, 0, 0, 0, H, [['#bfe0ea', 0], ['#5aa8c8', .7], ['#3a88aa', 1]]); ctx.fillRect(0, 0, W, H);
  const L = { ...LUZM, amb: .3, light: norm([-.4, .8, .5]), seam: 0 }, todas = [...S.fondo, ...S.rocas, ...S.vida, ...S.peces, ...S.ballena, ...S.tiburon];
  const it = render(ctx, cam, todas, { ...L, fog: { ...NIEBLA, col: [70, 150, 180], far: 70, max: .7 } });
  ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,250,.1)'; for (const q of it) { ctx.beginPath(); ctx.moveTo(q.ps[0][0], q.ps[0][1]); for (let k = 1; k < q.ps.length; k++) ctx.lineTo(q.ps[k][0], q.ps[k][1]); ctx.closePath(); ctx.stroke(); }
  const nz = ctx.getImageData(0, 0, W, H), d = nz.data; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4, f = .94 + .08 * vnoise3(x * .9, y * .15, 2) + .03 * vnoise3(x * .05, y * .05, 4); d[i] *= f; d[i + 1] *= f; d[i + 2] *= f; } ctx.putImageData(nz, 0, 0); };

// 7 · SOMBRAS CHINESCAS: siluetas recortadas a contraluz sobre una tela iluminada, con varillas
EX.sombras = ctx => { const cam = CAMM(W, H), S = escenaMar({ nPeces: 160, causticas: false });
  const g = ctx.createRadialGradient(W * .5, H * .38, 40, W * .5, H * .45, H * .75); g.addColorStop(0, '#fff2b8'); g.addColorStop(.35, '#ffb84a'); g.addColorStop(.75, '#c8561a'); g.addColorStop(1, '#4a1606'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const tela = ctx.getImageData(0, 0, W, H), td = tela.data; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4, f = .93 + .05 * ((x % 4 < 2) ^ (y % 4 < 2)) + .04 * vnoise3(x * .02, y * .02, 1); td[i] *= f; td[i + 1] *= f; td[i + 2] *= f; } ctx.putImageData(tela, 0, 0);
  const sil = f => ({ ...f, col: [24, 10, 4], emit: true, two: true }), [c2, g2] = lienzo(W, H);
  render(g2, cam, [...S.fondo, ...S.rocas, ...S.vida, ...S.peces, ...S.ballena, ...S.tiburon].map(sil), { seam: 1 });
  const d2 = g2.getImageData(0, 0, W, H).data, n = W * H, Aa = new Float32Array(n); for (let i = 0; i < n; i++) Aa[i] = d2[i * 4 + 3] / 255; const Bl = desenfoca(Aa, W, H, 6, 1);
  const out = ctx.getImageData(0, 0, W, H), o = out.data; for (let i = 0; i < n; i++) { const a = Math.max(Aa[i], Bl[i] * .45); o[i * 4] *= 1 - a * .93; o[i * 4 + 1] *= 1 - a * .95; o[i * 4 + 2] *= 1 - a * .96; } ctx.putImageData(out, 0, 0);
  ctx.strokeStyle = 'rgba(30,12,4,.85)'; ctx.lineWidth = 6; for (const nm of ['ballena', 'tiburon']) { const p = cam.P(colocaP([0, -.4, 0], COLOCA[nm])); ctx.beginPath(); ctx.moveTo(p[0] + 40, H); ctx.lineTo(p[0], p[1]); ctx.stroke(); }
  ctx.lineWidth = 46; ctx.strokeStyle = '#3a2210'; ctx.strokeRect(0, 0, W, H); ctx.lineWidth = 8; ctx.strokeStyle = '#6a4424'; ctx.strokeRect(26, 26, W - 52, H - 52); };

// 8 · PLANO TÉCNICO (blueprint): alzados y plantas con líneas blancas sobre azul, sin cifras
function vistaOrto(nombre, ojo, arriba, escalaPx, cx, cy, tamW, tamH) { const m = MALLAS_MAR[nombre], F = []; for (let i = 0; i < m.f.length; i += 3) F.push({ p: [0, 1, 2].map(k => { const j = m.f[i + k] * 3; return [m.v[j], m.v[j + 1], m.v[j + 2]]; }), col: [255, 255, 255] });
  const [c, g] = lienzo(tamW, tamH); g.fillStyle = '#000'; g.fillRect(0, 0, tamW, tamH); const cam = camera(ojo, [0, 0, 0], { ortho: escalaPx, w: tamW, h: tamH, up: arriba }); render(g, cam, F, { light: norm([.3, .8, .5]), amb: .25, seam: .6 });
  const n = tamW * tamH, L = lumA(aF(g.getImageData(0, 0, tamW, tamH).data, n), n), [G] = sobel(L, tamW, tamH), img = g.createImageData(tamW, tamH), d = img.data;
  for (let i = 0; i < n; i++) { const e = G[i] > .25 ? 1 : 0, sil = L[i] > .02; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = 255; d[i * 4 + 3] = e ? 235 : sil ? 18 : 0; } g.putImageData(img, 0, 0); return [c, cam]; }
EX.plano = ctx => { ctx.fillStyle = '#123f86'; ctx.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x += 30) { ctx.fillStyle = x % 150 ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.14)'; ctx.fillRect(x, 0, 1, H); } for (let y = 0; y < H; y += 30) { ctx.fillStyle = y % 150 ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.14)'; ctx.fillRect(0, y, W, 1); }
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3; ctx.strokeRect(30, 30, W - 60, H - 60);
  const ponerVista = (nombre, ojo, arriba, esc, x, y, w, h, rot) => { const [c] = vistaOrto(nombre, ojo, arriba, esc, 0, 0, w, h); ctx.drawImage(c, x, y); return [x, y, w, h]; };
  ctx.fillStyle = '#fff'; ctx.font = 'bold 44px "DejaVu Sans Mono", monospace'; ctx.textAlign = 'left'; ctx.fillText('BALLENA JOROBADA', 70, 110); ctx.font = '26px "DejaVu Sans Mono", monospace'; ctx.fillText('ALZADO', 70, 150); ctx.fillText('PLANTA', 70, 560);
  const v1 = ponerVista('ballena', [0, 0, 40], [0, 1, 0], 64, 60, 170, 960, 340), v2 = ponerVista('ballena', [0, 40, .001], [0, 0, -1], 64, 60, 580, 960, 420);
  ctx.font = 'bold 44px "DejaVu Sans Mono", monospace'; ctx.fillText('TIBURÓN BLANCO', 70, 1080); ctx.font = '26px "DejaVu Sans Mono", monospace'; ctx.fillText('ALZADO', 70, 1120); ctx.fillText('PLANTA', 70, 1430);
  ponerVista('tiburon', [0, 0, 40], [0, 1, 0], 180, 60, 1140, 960, 270); ponerVista('tiburon', [0, 40, .001], [0, 0, -1], 180, 60, 1450, 960, 280);
  const cota = (x0, x1, y, txt) => { ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); for (const [x, s] of [[x0, 1], [x1, -1]]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + s * 16, y - 7); ctx.lineTo(x + s * 16, y + 7); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.beginPath(); ctx.moveTo(x, y - 18); ctx.lineTo(x, y + 18); ctx.stroke(); } ctx.font = '24px "DejaVu Sans Mono", monospace'; ctx.textAlign = 'center'; ctx.fillText(txt, (x0 + x1) / 2, y - 12); ctx.textAlign = 'left'; };
  cota(540 - 7.4 * 64, 540 + 7.0 * 64, 530, 'LONGITUD TOTAL'); cota(540 - 2.6 * 180, 540 + 2.35 * 180, 1418, 'LONGITUD TOTAL');
  ctx.strokeRect(W - 470, H - 190, 420, 140); ctx.font = '22px "DejaVu Sans Mono", monospace'; ctx.fillText('ESTUDIO DE FORMAS · NO A ESCALA', W - 455, H - 140); ctx.fillText('MODELADO POR CÓDIGO', W - 455, H - 100); ctx.fillText('LÁMINA ÚNICA', W - 455, H - 65); };

// 9 · HOLOGRAMA: proyección cian translúcida con líneas de barrido y fallos de señal
EX.holograma = ctx => { ctx.fillStyle = lin(ctx, 0, 0, 0, H, [['#02060c', 0], ['#04121e', 1]]); ctx.fillRect(0, 0, W, H); const cam = CAMM(W, H, { eye: [0, 3, 13], target: [.4, 5.2, -6] }), t = TA();
  const pr = cam.P([0, 0, 1]), g = ctx.createRadialGradient(pr[0], pr[1], 10, pr[0], pr[1] - 600, 900); g.addColorStop(0, 'rgba(60,220,255,.25)'); g.addColorStop(1, 'rgba(60,220,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(pr[0] - 80, pr[1]); ctx.lineTo(-200, 0); ctx.lineTo(W + 200, 0); ctx.lineTo(pr[0] + 80, pr[1]); ctx.fill();
  ctx.strokeStyle = 'rgba(80,230,255,.35)'; ctx.lineWidth = 1; for (let x = -10; x <= 10; x += 1) { const a = cam.P([x, 0, 4]), b = cam.P([x, 0, -20]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); } for (let z = 4; z >= -20; z -= 1) { const a = cam.P([-10, 0, z]), b = cam.P([10, 0, z]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  const [c2, g2] = lienzo(W, H); g2.globalCompositeOperation = 'lighter';
  for (const [nm, col] of [['ballena', '80,220,255'], ['tiburon', '140,255,240']]) { const F = animal(nm, { lp: true }), it = render(g2, cam, F, { two: true, wire: { fill: `rgba(${col},.05)`, line: `rgba(${col},.55)`, lw: 1, glow: `rgba(${col},.08)`, gw: 3 } }); }
  const P = []; cardumen(P, [-5.5, 7.5, -9], 120, 5); render(g2, cam, P, { wire: { fill: 'rgba(80,220,255,.1)', line: 'rgba(80,220,255,.6)', lw: 1, glow: 'rgba(0,0,0,0)', gw: 0 } });
  const R = rng(3 + Math.floor(t * 10)); for (let k = 0; k < 8; k++) { const y = R() * H | 0, hh = 4 + R() * 30 | 0, dx = (R() - .5) * 60; ctx.drawImage(c2, 0, y, W, hh, dx, y, W, hh); } ctx.globalAlpha = .95; ctx.drawImage(c2, 0, 0); ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(0,0,0,.28)'; for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 2);
  ctx.strokeStyle = 'rgba(80,230,255,.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(pr[0], pr[1], 220, 40, 0, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.ellipse(pr[0], pr[1], 160, 28, 0, 0, 7); ctx.stroke(); };

// 10 · CÁMARA TÉRMICA: colores de calor relativos (la ballena es un mamífero de sangre caliente; el tiburón blanco conserva parte de los músculos más calientes que el agua)
EX.termica = ctx => { const w = 540, h = 960, cam = CAMM(w, h), S = escenaMar({ causticas: false, nPeces: 200 }), [c, g] = lienzo(w, h), cB = colocaP([0, 0, 0], COLOCA.ballena), cT = colocaP([0, 0, 0], COLOCA.tiburon);
  g.fillStyle = lin(g, 0, 0, 0, h, [['rgb(40,40,40)', 0], ['rgb(18,18,18)', 1]]); g.fillRect(0, 0, w, h);
  const T = (F, f) => F.map(q => { const v = f(q) * 255 | 0; return { ...q, col: [v, v, v], emit: true }; });
  render(g, cam, [...T(S.fondo, q => .1), ...T(S.rocas, q => .12), ...T(S.vida, q => .11), ...T(S.peces, q => .14),
    ...T(S.ballena, q => { const p = centroid(q.p), r = Math.hypot(p[1] - cB[1], (p[0] - cB[0]) * .3, (p[2] - cB[2]) * .3); return .62 + .3 * clamp(1 - r / 2.2) + .05 * vnoise3(p[0], p[1], p[2]); }),
    ...T(S.tiburon, q => { const p = centroid(q.p), r = Math.hypot(p[0] - cT[0], p[1] - cT[1], p[2] - cT[2]); k = globalThis.TEMP_TIBURON || [.3, .18, 1.6]; return k[0] + k[1] * clamp(1 - r / k[2]); })], { seam: .8 });
  const n = w * h, A = desenfoca(aF(g.getImageData(0, 0, w, h).data, n), w, h, 2), R = rng(4);
  const pal = [[0, [0, 0, 10]], [.2, [40, 0, 90]], [.4, [140, 10, 120]], [.6, [220, 60, 30]], [.8, [255, 170, 0]], [1, [255, 255, 220]]], mapa = v => { for (let k = 1; k < pal.length; k++) if (v <= pal[k][0]) { const [a, ca] = pal[k - 1], [b, cb] = pal[k], f = (v - a) / (b - a); return ca.map((q, i) => q + (cb[i] - q) * f); } return pal[pal.length - 1][1]; };
  const img = vuelca(ctx, w, h, (x, y, i) => mapa(clamp(A[i * 3] / 255 + (R() - .5) * .03)));
  escala(ctx, img, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3; const cx = W / 2, cy = H / 2; ctx.beginPath(); ctx.moveTo(cx - 40, cy); ctx.lineTo(cx - 12, cy); ctx.moveTo(cx + 12, cy); ctx.lineTo(cx + 40, cy); ctx.moveTo(cx, cy - 40); ctx.lineTo(cx, cy - 12); ctx.moveTo(cx, cy + 12); ctx.lineTo(cx, cy + 40); ctx.stroke();
  const gb = ctx.createLinearGradient(0, 0, 0, 600); pal.slice().reverse().forEach(([v, c2]) => gb.addColorStop(1 - v, `rgb(${c2})`)); ctx.fillStyle = gb; ctx.fillRect(W - 80, 200, 30, 600); ctx.strokeRect(W - 80, 200, 30, 600);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 26px "DejaVu Sans", sans-serif'; ctx.textAlign = 'right'; ctx.fillText('CALIENTE', W - 92, 220); ctx.fillText('FRÍO', W - 92, 800); ctx.textAlign = 'left'; ctx.fillText('IR', 50, 80); };

// 11 · VHS / GLITCH: cinta antigua, colores desplazados, ruido y banda de arrastre
EX.vhs = ctx => { const w = 540, h = 960, [, g] = base(w, h, {}), n = w * h, A = aF(g.getImageData(0, 0, w, h).data, n), R = rng(9), banda = h * .62;
  const img = vuelca(ctx, w, h, (x, y, i) => { const tb = Math.abs(y - banda) < 14 ? 1 : 0, sx = Math.min(w - 1, Math.max(0, Math.round(x + tb * (8 + 6 * Math.sin(y)) + 1.2 * Math.sin(y * .3)))), j = y * w + sx, r = A[(y * w + Math.min(w - 1, sx + 3)) * 3], gg = A[j * 3 + 1], b = A[(y * w + Math.max(0, sx - 3)) * 3 + 2];
    const ruido = (R() - .5) * 28 + tb * (R() * 120), lin = y % 2 ? .82 : 1; return [r * lin + ruido, gg * lin + ruido, b * lin + ruido].map(v => clamp(v * 1.05 + 6, 0, 255)); });
  escala(ctx, img, w, h); ctx.fillStyle = '#fff'; ctx.font = 'bold 54px "DejaVu Sans Mono", monospace'; ctx.fillText('PLAY ▶', 60, 110); ctx.font = 'bold 40px "DejaVu Sans Mono", monospace'; ctx.fillText('SP', 60, H - 80); vineta(ctx, W, H); };

// 12 · 3D RETRO DE 32 BITS: baja resolución, vértices que tiemblan (sin decimales), color de 15 bits con tramado
EX.retro32 = ctx => { const w = 240, h = 426, [c, g] = lienzo(w, h), cam = CAMM(w, h), p0 = cam.proj; cam.proj = q => { const r = p0(q); return [Math.round(r[0]), Math.round(r[1]), r[2]]; };
  const S = escenaMar({ lp: true, paso: 3.4, det: .5, nPeces: 90, causticas: false }); g.fillStyle = lin(g, 0, 0, 0, h, [['#2a90b0', 0], ['#0a3050', 1]]); g.fillRect(0, 0, w, h);
  render(g, cam, [...S.fondo, ...S.rocas, ...S.vida, ...S.peces, ...S.ballena, ...S.tiburon], { ...LUZM, amb: .6, lightCol: [1.3, 1.3, 1.3], seam: 0, fog: { col: [40, 130, 160], near: 8, far: 40, max: 1 } });
  const img = g.getImageData(0, 0, w, h), d = img.data, bay = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4, t = (bay[y & 3][x & 3] / 16 - .5) * 8; for (let k = 0; k < 3; k++) d[i + k] = clamp(Math.round((d[i + k] + t * 2) / 16) * 16, 0, 255); }
  g.putImageData(img, 0, 0); ctx.imageSmoothingEnabled = false; ctx.drawImage(c, 0, 0, W, H); };

// 13 · MAPA TOPOGRÁFICO: el fondo visto desde arriba con curvas de nivel y relieve sombreado; los animales también en curvas
const relieveT = (x, z) => 1.3 * (fbm3(x * .045 + 3.1, 1.7, z * .045, 4) - .5) * 7 + 1.2 * (fbm3(x * .12, 5, z * .12, 3) - .5);
EX.topo = ctx => { const x0 = -9, x1 = 9, z0 = -26, z1 = 6, sx = W / (x1 - x0), sz = H / (z1 - z0), mx = px => x0 + px / sx, mz = py => z0 + py / sz;
  const img = vuelca(ctx, W, H, (px, py) => { const x = mx(px), z = mz(py), hh = relieveT(x, z), e = .05, dxh = (relieveT(x + e, z) - relieveT(x - e, z)) / (2 * e), dzh = (relieveT(x, z + e) - relieveT(x, z - e)) / (2 * e), sh = clamp(.7 - dxh * .5 + dzh * .4, .3, 1.1);
    const band = Math.floor(hh / .4), f = hh / .4 - band, linea = (f < .05 || f > .95) ? 1 : 0, mayor = linea && band % 5 === 0;
    const c0 = [[150, 200, 220], [170, 214, 226], [196, 226, 222], [222, 232, 206], [236, 226, 190], [226, 206, 168]][Math.max(0, Math.min(5, band + 3))].map(v => v * sh);
    return linea ? c0.map(v => v * (mayor ? .45 : .7)) : c0; });
  ctx.putImageData(img, 0, 0);
  const cam = camera([0, 60, (z0 + z1) / 2 + .001], [0, 0, (z0 + z1) / 2], { ortho: sx, up: [0, 0, -1] }), F = [];
  for (const nm of ['ballena', 'tiburon']) for (const f of animal(nm)) { const y = centroid(f.p)[1], b = Math.floor(y / .5); F.push({ ...f, col: [[120, 90, 60], [150, 110, 70], [180, 140, 90], [205, 170, 115], [225, 200, 150], [240, 225, 190]][Math.max(0, Math.min(5, b % 6))], b }); }
  for (const f of rocas({ det: .8, adornos: false })) { const y = centroid(f.p)[1]; F.push({ ...f, col: y > .8 ? [160, 150, 140] : [140, 130, 120] }); }
  render(ctx, cam, F, { light: norm([-.5, .8, -.3]), amb: .55, seam: .6 });
  ctx.fillStyle = 'rgba(40,30,20,.9)'; ctx.font = 'italic 34px "DejaVu Serif", serif'; ctx.textAlign = 'center';
  for (const [nm, txt] of [['ballena', 'Ballena jorobada'], ['tiburon', 'Tiburón blanco']]) { const p = cam.P(colocaP([0, 0, 0], COLOCA[nm])); ctx.fillText(txt, p[0], p[1] + (nm === 'ballena' ? 180 : 90)); }
  ctx.save(); ctx.translate(W - 120, 140); ctx.strokeStyle = '#3a2a1a'; ctx.fillStyle = '#3a2a1a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 60, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, -55); ctx.lineTo(14, 10); ctx.lineTo(0, 0); ctx.lineTo(-14, 10); ctx.closePath(); ctx.fill(); ctx.font = 'bold 30px "DejaVu Serif", serif'; ctx.fillText('N', 0, -70); ctx.restore();
  ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 6; ctx.strokeRect(20, 20, W - 40, H - 40); ctx.font = 'bold 40px "DejaVu Serif", serif'; ctx.fillStyle = '#3a2a1a'; ctx.fillText('FONDO MARINO · CURVAS DE NIVEL', W / 2, H - 60); ctx.textAlign = 'left'; };

// 14 · VIDRIERA: piezas de cristal de color con emplomado y luz que las atraviesa
EX.vidriera = ctx => { const w = 540, h = 960, [, g] = base(w, h, { rayos: false }), n = w * h, A = aF(g.getImageData(0, 0, w, h).data, n), [Gs] = sobel(lumA(desenfoca(A, w, h, 1), n), w, h), s = 9, R = rng(5), gx = Math.ceil(w / s) + 1, gy = Math.ceil(h / s) + 1, P = [];
  for (let j = 0; j < gy; j++) for (let i = 0; i < gx; i++) { const x = (i + .15 + .7 * R()) * s, y = (j + .15 + .7 * R()) * s, ix = Math.min(w - 1, x | 0), iy = Math.min(h - 1, y | 0), k = (iy * w + ix) * 3; P.push([x, y, A[k], A[k + 1], A[k + 2]]); }
  const img = vuelca(ctx, w, h, (x, y) => { const ci = Math.floor(x / s), cj = Math.floor(y / s); let d1 = 1e9, d2 = 1e9, b = null;
    for (let j = cj - 1; j <= cj + 1; j++) for (let i = ci - 1; i <= ci + 1; i++) { if (i < 0 || j < 0 || i >= gx || j >= gy) continue; const p = P[j * gx + i], dd = Math.hypot(x - p[0], y - p[1]); if (dd < d1) { d2 = d1; d1 = dd; b = p; } else if (dd < d2) d2 = dd; }
    if (d2 - d1 < 1.1 || Gs[y * w + x] > .55) return [22, 20, 24]; const L = (b[2] * .3 + b[3] * .59 + b[4] * .11), sat = [b[2], b[3], b[4]].map(v => clamp(L + (v - L) * 1.7, 0, 255)), luz = 1.1 - .35 * (d1 / s) + .08 * vnoise3(x * .3, y * .3, 1);
    return sat.map(v => clamp(v * luz + 18, 0, 255)); });
  escala(ctx, img, w, h); };
const LISTA_EXTRA = Object.keys(EX);
function renderExtra(nm) { const c = mk(W, H); EX[nm](c.getContext('2d')); return c.toDataURL('image/png'); }
