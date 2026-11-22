/* TEMA TRÁFICO (estilo 4 · Low-poly) con gráficos de infografía anclados al 3D. De noche o de día (globalThis.TRAF_DIA).
   - Ciudad estilizada: manzanas con edificios, azoteas, ventanas, parques y río; autopista de 3 carriles por sentido con mediana, arcenes y farolas.
   - Tráfico SIMULADO (modelo de seguimiento de coches): cada coche ajusta su velocidad al de delante; en un tramo la velocidad
     máxima baja y se forma un atasco con su cola (donde llegan y frenan) y su cabeza (donde salen y aceleran). Nada se atraviesa.
   - El coche protagonista va a 108 km/h, alcanza la cola y frena. La banda de color de la carretera sale de la velocidad real de los coches.
   - ESC.trafico(ctx, t): plan de 6 planos de 4,5–5 s (28,5 s) con cámara en movimiento y fundidos cortos, de general a detalle y vuelta.
   Las cifras en pantalla son ilustrativas. Mundo en metros: x a lo ancho, y arriba, nuestro sentido avanza hacia -z. */
(function () {
  const TR = globalThis.TRAF = {};
  const dia = () => !!globalThis.TRAF_DIA, wire = () => !!globalThis.TRAF_WIRE, cgi = () => !!globalThis.TRAF_CGI;   // TRAF_CGI: acabado CGI (brillos, reflejos, bloom)
  const CARRIL = [2.15, 5.65, 9.15], J0 = -150, J1 = -330, ZMAX = 500, ZMIN = -640, LC = 4.4, Z0 = 470;
  const DT = 1 / 30, TMAX = 34, NP = Math.ceil(TMAX / DT) + 1;
  const R = rng(7);
  const PAL_N = [[226, 230, 238], [222, 96, 92], [236, 184, 84], [92, 150, 230], [138, 116, 214], [70, 182, 170], [178, 186, 200], [70, 78, 98]];
  const PAL_D = [[246, 246, 244], [232, 110, 96], [244, 196, 92], [96, 156, 226], [150, 128, 210], [76, 184, 168], [196, 202, 212], [72, 82, 104]];
  // ------------------------------------------------ simulación de tráfico (modelo de seguimiento IDM simplificado)
  const vLim = z => (z < J0 && z > J1) ? 3.2 : 31;
  const COCHES = [];
  for (const x of CARRIL) { let z = ZMAX; while (z > ZMIN) { const jam = z < J0 && z > J1; z -= jam ? 9.6 + R() * 2.2 : 30 + R() * 26; if (x === CARRIL[1] && z > 300) continue;
      COCHES.push({ x, sent: 1, z: [z], v: [(z < J0 && z > J1) ? 3.2 : (z > J0 && z < J0 + 160) ? 3.2 + (z - J0) / 160 * 26 : 29 + R() * 3], col: Math.floor(R() * 8), heroe: false }); } }
  const HEROE = { x: CARRIL[1], sent: 1, z: [Z0], v: [30], col: 0, heroe: true }; COCHES.push(HEROE);
  { const lanes = CARRIL.map(x => COCHES.filter(c => c.sent === 1 && c.x === x)), A = 1.6, B = 3, S0 = 2.2, TH = 1.2;
    for (let k = 1; k < NP; k++) for (const L of lanes) { L.sort((p, q) => p.z[k - 1] - q.z[k - 1]);
      for (let i = 0; i < L.length; i++) { const c = L[i], z = c.z[k - 1], v = c.v[k - 1], v0 = c.heroe ? Math.min(30, vLim(z)) : vLim(z);
        let acc = A * (1 - Math.pow(v / Math.max(v0, .5), 4));
        if (i > 0) { const l = L[i - 1], s = Math.max(.3, z - l.z[k - 1] - LC), dv = v - l.v[k - 1], ss = S0 + Math.max(0, v * TH + v * dv / (2 * Math.sqrt(A * B))); acc -= A * (ss / s) * (ss / s); }
        acc = Math.max(-9, Math.min(A, acc)); const nv = Math.max(0, v + acc * DT); c.v.push(nv); c.z.push(z - nv * DT); } } }
  for (const x of CARRIL.map(v => -v)) { let z = ZMIN; while (z < ZMAX) { z += 34 + R() * 40; COCHES.push({ x, sent: -1, z0: z, vc: 27 + R() * 7, col: Math.floor(R() * 8) }); } }
  const muestra = (c, t, k) => { const f = Math.max(0, Math.min(NP - 1.001, t / DT)), i = Math.floor(f), u = f - i; return c[k][i] + (c[k][i + 1] - c[k][i]) * u; };
  const pos = (c, t) => c.sent === 1 ? [c.x, 0, muestra(c, t, 'z')] : [c.x, 0, c.z0 + c.vc * t];
  const vel = (c, t) => c.sent === 1 ? muestra(c, t, 'v') : c.vc;
  TR.heroe = t => pos(HEROE, t); TR.velHeroe = t => vel(HEROE, t); TR.coches = COCHES; TR.pos = pos;
  TR.llegada = () => { for (let k = 0; k < NP; k++) if (HEROE.v[k] < 10) return k * DT; return null; };
  const delante = (c, t) => { const p = pos(c, t)[2]; let m = null; for (const o of COCHES) if (o !== c && o.sent === 1 && o.x === c.x) { const q = pos(o, t)[2]; if (q < p && (!m || q > m[1])) m = [o, q]; } return m; };
  function velTramos(t) { const n = Math.ceil((ZMAX - ZMIN) / 8), s = new Float32Array(n), c = new Float32Array(n); for (const o of COCHES) if (o.sent === 1) { const z = pos(o, t)[2], i = Math.floor((ZMAX - z) / 8); if (i >= 0 && i < n) { s[i] += vel(o, t); c[i]++; } }
    const v = new Float32Array(n); for (let i = 0; i < n; i++) { let a = 0, b = 0; for (let j = Math.max(0, i - 2); j <= Math.min(n - 1, i + 2); j++) { a += s[j]; b += c[j]; } v[i] = b ? a / b : 31; } return v; }
  // ------------------------------------------------ geometría
  const tono = (c, k) => c.map(v => Math.max(0, Math.min(255, v * k)));
  const quadO = (F, pts, col, centro, x = {}) => { const f = [{ p: pts, col, ...x }]; orientTo(f, centro); F.push(f[0]); };
  // brillo de pintura / cristal: color por cara con difusa + especular + reflejo del cielo (Fresnel); se marca como emisiva
  function brillo(fs, cristal) { if (!cgi() || !TR._cam) return; const cam = TR._cam, Lx = TR._luz;
    for (const f of fs) { const n = norm(newell(f.p)), c0 = centroid(f.p), v = norm(sub(cam.eye, c0)), h = norm(add(Lx, v)), nl = Math.max(0, dot(n, Lx)), nv = Math.max(0, dot(n, v)), fr = Math.pow(1 - nv, 3);
      const cielo = dia() ? [205, 225, 245] : [40, 50, 90], amb = dia() ? .55 : .35, dif = dia() ? .75 : .45, sp = Math.pow(Math.max(0, dot(n, h)), cristal ? 80 : 30) * (cristal ? 1.4 : .9) * 255;
      const k = cristal ? .25 + .6 * fr : .08 + .45 * fr, sube = Math.max(0, n[1]);
      f.col = f.col.map((q, i) => Math.min(255, q * (amb + dif * nl) * (1 - k) + cielo[i] * k * (.5 + .5 * sube) + sp)); f.emit = true; } }
  function coche(F, c, t) { const [xc, , zc] = pos(c, t), d = c.sent, col = c.heroe ? (dia() ? [255, 255, 255] : [238, 242, 250]) : (dia() ? PAL_D : PAL_N)[c.col], vidrio = dia() ? [70, 96, 124] : [22, 30, 52];
    const P = (u, y, w) => [xc + w, y, zc - d * u], cen = [xc, .6, zc];
    const perfil = [[2.2, .32], [2.25, .62], [2.0, .86], [-2.0, .9], [-2.22, .66], [-2.2, .32]], W1 = .95, lados = [];
    for (let i = 0; i < perfil.length; i++) { const a = perfil[i], b = perfil[(i + 1) % perfil.length]; lados.push({ p: [P(a[0], a[1], -W1), P(b[0], b[1], -W1), P(b[0], b[1], W1), P(a[0], a[1], W1)], col: i === 2 || i === 3 ? tono(col, 1.06) : col }); }
    lados.push({ p: perfil.map(q => P(q[0], q[1], -W1)), col: tono(col, .82) }, { p: perfil.map(q => P(q[0], q[1], W1)), col: tono(col, .82) }); orientTo(lados, cen); brillo(lados, false); F.push(...lados);
    const cab = [[1.15, .86], [.45, 1.42], [-.85, 1.42], [-1.35, .88]], W2 = .8, cc = [xc, 1.15, zc], cabF = [];
    for (let i = 0; i < 4; i++) { const a = cab[i], b = cab[(i + 1) % 4]; cabF.push({ p: [P(a[0], a[1], -W2), P(b[0], b[1], -W2), P(b[0], b[1], W2), P(a[0], a[1], W2)], col: i === 1 ? (c.heroe ? [90, 170, 255] : tono(col, 1.1)) : i === 3 ? tono(col, .9) : vidrio }); }
    cabF.push({ p: cab.map(q => P(q[0], q[1], -W2)), col: vidrio }, { p: cab.map(q => P(q[0], q[1], W2)), col: vidrio }); orientTo(cabF, cc); brillo(cabF, true); F.push(...cabF);
    if (cgi()) { const sh = []; for (let k = 0; k < 14; k++) { const a = k / 14 * 6.283; sh.push(P(Math.cos(a) * 2.7, .03, Math.sin(a) * 1.35)); } F.push({ p: sh, col: dia() ? [70, 72, 80] : [4, 5, 10], emit: true, two: true, zb: .6, alfa: .55 }); }
    for (const u of [1.35, -1.35]) for (const s of [-1, 1]) quadO(F, [P(u - .33, .02, s * .97), P(u + .33, .02, s * .97), P(u + .33, .46, s * .97), P(u - .33, .46, s * .97)], [24, 26, 32], [xc, .3, zc]);
    for (const s of [-.6, .6]) { quadO(F, [P(2.255, .5, s - .2), P(2.255, .5, s + .2), P(2.255, .64, s + .2), P(2.255, .64, s - .2)], [255, 246, 220], cen, { emit: true, zb: -.02 });
      quadO(F, [P(-2.235, .48, s - .22), P(-2.235, .48, s + .22), P(-2.235, .6, s + .22), P(-2.235, .6, s - .22)], c.sent === 1 && vel(c, t) < 8 ? [255, 50, 60] : [180, 38, 50], cen, { emit: true, zb: -.02 }); } }
  const EDIF = [], SUELO = [], R2 = rng(11);
  for (let zb = ZMAX - 10; zb > ZMIN; zb -= 34) for (const lado of [-1, 1]) for (let k = 0; k < 8; k++) {
    const x0 = lado * (17 + k * 34), rio = lado < 0 && k === 3, parque = !rio && R2() < .13; SUELO.push({ x0, z0: zb, rio, parque, k });
    if (rio || parque) continue;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const w = 11 + R2() * 3.5, dd = 11 + R2() * 3.5, h = 7 + Math.pow(R2(), 1.8) * (k < 2 ? 38 : k < 4 ? 26 : 18), bx = x0 + lado * (2 + i * 15), bz = zb - 2 - j * 15;
      EDIF.push({ x0: Math.min(bx, bx + lado * w), x1: Math.max(bx, bx + lado * w), z0: bz - dd, z1: bz, h, k, n: Math.floor(R2() * 4), nd: Math.floor(R2() * 5), s: R2() * 1000, azotea: R2() < .55 }); } }
  const NOCHE_ED = [[46, 56, 96], [54, 50, 100], [40, 62, 100], [62, 58, 108]], DIA_ED = [[236, 220, 198], [206, 218, 232], [242, 204, 180], [218, 226, 210], [230, 230, 236]];
  function ciudad(F, D) {
    for (const s of SUELO) { const x0 = Math.min(s.x0, s.x0 + Math.sign(s.x0) * 32), x1 = Math.max(s.x0, s.x0 + Math.sign(s.x0) * 32);
      const c = s.rio ? (D ? [92, 160, 214] : [18, 40, 82]) : s.parque ? (D ? [126, 190, 112] : [34, 86, 60]) : (D ? [196, 198, 204] : [32, 38, 62]);
      F.push({ p: [[x0, 0, s.z0], [x1, 0, s.z0], [x1, 0, s.z0 - 32], [x0, 0, s.z0 - 32]], col: c, two: true, zb: .5, suelo: 1 });
      if (s.parque) for (let k = 0; k < 7; k++) { const tx = x0 + 4 + hash3(k, s.z0, 1) * 24, tz = s.z0 - 4 - hash3(k, s.z0, 2) * 24, r = 1.4 + hash3(k, s.z0, 4); sphere(F, [tx, 2.6 + r * .6, tz], r, 3, 6, () => D ? [92, 160, 90] : [38, 110, 70]); box(F, tx - .2, 0, tz - .2, tx + .2, 2.4, tz + .2, D ? [130, 96, 70] : [70, 52, 40]); } }
    for (const e of EDIF) { const col = D ? DIA_ED[e.nd] : NOCHE_ED[e.n]; box(F, e.x0, 0, e.z0, e.x1, e.h, e.z1, col, { top: tono(col, D ? .92 : 1.3), side: col });
      box(F, e.x0, e.h, e.z0, e.x1, e.h + .5, e.z0 + .5, tono(col, D ? 1.06 : 1.45)); box(F, e.x0, e.h, e.z1 - .5, e.x1, e.h + .5, e.z1, tono(col, D ? 1.06 : 1.45));
      if (e.azotea) box(F, e.x0 + 2, e.h, e.z0 + 2, e.x0 + 5, e.h + 1.6, e.z0 + 4.5, tono(col, .8));
      if (e.k > 4) continue;
      const lado = (e.x0 + e.x1) / 2 > 0 ? -1 : 1, xf = lado < 0 ? e.x0 - .03 : e.x1 + .03, fil = Math.floor((e.h - 2.5) / 3.2), ven = cal => D ? (cal ? [128, 160, 192] : [176, 206, 230]) : cal ? [255, 210, 130] : [150, 210, 255];
      for (let f = 0; f < fil; f++) for (let c = 0; c < Math.floor((e.z1 - e.z0 - 1.5) / 2.6); c++) { if (hash3(e.s, f, c) > (D ? .75 : .45)) continue; const y = 2.2 + f * 3.2, z = e.z1 - 1.4 - c * 2.6;
        F.push({ p: [[xf, y, z], [xf, y, z - 1.4], [xf, y + 1.6, z - 1.4], [xf, y + 1.6, z]], col: ven(hash3(c, f, e.s) > .2), emit: true, two: true, zb: -.08 }); }
      for (let f = 0; f < fil; f++) for (let c = 0; c < Math.floor((e.x1 - e.x0 - 1.5) / 2.6); c++) { if (hash3(e.s + 5, f, c) > (D ? .75 : .42)) continue; const y = 2.2 + f * 3.2, x = e.x0 + 1.4 + c * 2.6;
        F.push({ p: [[x, y, e.z1 + .03], [x + 1.4, y, e.z1 + .03], [x + 1.4, y + 1.6, e.z1 + .03], [x, y + 1.6, e.z1 + .03]], col: ven(hash3(c, f, e.s + 9) > .2), emit: true, two: true, zb: -.08 }); } } }
  function autopista(F, D) { const asf = D ? [104, 108, 120] : [40, 44, 62], li = D ? [245, 246, 250] : [196, 202, 220];
    for (let z = ZMAX; z > ZMIN; z -= 10) { F.push({ p: [[-11.6, .02, z], [11.6, .02, z], [11.6, .02, z - 10], [-11.6, .02, z - 10]], col: asf, two: true, zb: .3, suelo: 1 });
      for (const x of [3.9, 7.4, -3.9, -7.4]) if (Math.floor((ZMAX - z) / 10) % 2 === 0) F.push({ p: [[x - .09, .03, z], [x + .09, .03, z], [x + .09, .03, z - 5], [x - .09, .03, z - 5]], col: li, emit: true, two: true, zb: .1, suelo: 1 });
      for (const x of [.85, 10.85, -.85, -10.85]) F.push({ p: [[x - .08, .03, z], [x + .08, .03, z], [x + .08, .03, z - 10], [x - .08, .03, z - 10]], col: li, emit: true, two: true, zb: .1, suelo: 1 }); }
    for (let z = ZMAX; z > ZMIN; z -= 20) { box(F, -.35, .02, z - 20, .35, .75, z, D ? [214, 216, 222] : [86, 92, 118]); for (const s of [-1, 1]) box(F, s * 11.6 - .25, .02, z - 20, s * 11.6 + .25, .9, z, D ? [200, 204, 212] : [74, 80, 104]); }
    for (let z = ZMAX - 15; z > ZMIN; z -= 30) for (const s of [-1, 1]) { box(F, s * 12.2 - .12, 0, z - .12, s * 12.2 + .12, 8.5, z + .12, D ? [150, 156, 168] : [70, 76, 98]); const xa = Math.min(s * 12.2 + .12, s * 12.2 - s * 1.7), xb = Math.max(s * 12.2 + .12, s * 12.2 - s * 1.7); box(F, xa, 8.3, z - .15, xb, 8.55, z + .15, D ? [150, 156, 168] : [70, 76, 98]); } }
  function banda(F, t) { const v = velTramos(t); for (let i = 0; i < v.length; i++) { const z = ZMAX - i * 8, k = clamp((24 - v[i]) / 18), col = mixc(mixc([64, 224, 150], [255, 196, 70], clamp(k * 2)), [255, 70, 84], clamp(k * 2 - 1));
      F.push({ p: [[1.05, .05, z], [10.65, .05, z], [10.65, .05, z - 8], [1.05, .05, z - 8]], col, emit: true, two: true }); } }
  TR.FONDO = { dia: [['#4f9ee6', 0], ['#9fcdf2', .5], ['#e6f1f8', 1]], noche: [['#03050e', 0], ['#0b1130', .35], ['#191b44', .62], ['#0a0e22', 1]] };
  function escena(ctx, cam, t, o = {}) { const D = dia(), g = ctx.createLinearGradient(0, 0, 0, H); for (const [c, s] of TR.FONDO[D ? 'dia' : 'noche']) g.addColorStop(s, c); ctx.fillStyle = wire() ? '#03040c' : g; ctx.fillRect(0, 0, W, H);
    const fog = { col: D ? [204, 224, 240] : [12, 16, 42], near: o.near ?? 80, far: o.far ?? 560, max: D ? (o.alto > 100 ? .5 : .8) : .92 };
    const L = D ? { light: norm([-.45, .85, .35]), amb: .52, lightCol: [1.12, 1.06, .96], ambCol: [.78, .86, 1], seam: .8, fog } : { light: norm([-.3, .9, .4]), amb: .56, lightCol: [.6, .64, .9], ambCol: [.46, .5, .86], seam: .8, fog };
    if (wire()) { L.wire = { fill: '#05081a', line: 'rgba(80,220,255,.5)', lw: 1, glow: 'rgba(80,220,255,.07)', gw: 3 }; L.fog = null; }
    TR._cam = cam; TR._luz = L.light;
    const S = [], F = []; ciudad(S, D); autopista(S, D);
    if (cgi()) {   // reflejo: la escena reflejada bajo el suelo, suavizada, y la carretera semitransparente encima
      const RF = []; for (const f of S) if (!f.suelo) RF.push({ ...f, p: f.p.map(q => [q[0], -q[1], q[2]]).reverse() });
      for (const c of COCHES) { const p = pos(c, t); if (p[2] > ZMIN && p[2] < ZMAX && cam.toCam([p[0], 1, p[2]])[2] > -10 && Math.abs(p[2] - cam.eye[2]) < 260) { const T = []; coche(T, c, t); for (const f of T) if (!f.alfa) RF.push({ ...f, p: f.p.map(q => [q[0], -q[1], q[2]]).reverse() }); } }
      const k = 4, rc = mk(W / k | 0, H / k | 0), rg = rc.getContext('2d'), cr = mk(W, H), cg = cr.getContext('2d'); cg.fillStyle = D ? '#9fb4c8' : '#05070f'; cg.fillRect(0, 0, W, H); render(cg, cam, RF, { ...L, seam: .6 });
      if (!D) { cg.save(); cg.globalCompositeOperation = 'lighter'; for (let z = ZMAX - 15; z > ZMIN; z -= 30) for (const sx of [-1, 1]) { const q = cam.P([sx * 10.8, -8.3, z]); if (q[2] < 1) continue; const r = 900 / q[2], hh = cg.createRadialGradient(q[0], q[1], 0, q[0], q[1], r); hh.addColorStop(0, 'rgba(255,214,150,.5)'); hh.addColorStop(1, 'rgba(255,214,150,0)'); cg.fillStyle = hh; cg.fillRect(q[0] - r, q[1] - r, 2 * r, 2 * r); } cg.restore(); }
      rg.drawImage(cr, 0, 0, rc.width, rc.height); const r2 = mk(W / 8 | 0, H / 8 | 0); r2.getContext('2d').drawImage(rc, 0, 0, r2.width, r2.height);
      render(ctx, cam, S.filter(f => f.suelo && f.zb !== .1), L);
      // recorte a la calzada (polígono proyectado de sus dos bordes) y reflejo encima: aditivo de noche (solo suman las luces), suave de día
      const borde = sx => { const r = []; for (let z = ZMAX; z > ZMIN; z -= 6) { const q = cam.toCam([sx, 0, z]); if (q[2] > .3) r.push(cam.proj(q)); } return r; }, iz = borde(-11.6), de = borde(11.6).reverse();
      if (iz.length > 1) { ctx.save(); ctx.beginPath(); [...iz, ...de].forEach((q, k) => k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.clip(); ctx.imageSmoothingEnabled = true;
        ctx.globalCompositeOperation = D ? 'source-over' : 'lighter'; ctx.globalAlpha = D ? .22 : .85; ctx.drawImage(rc, 0, 0, W, H); ctx.globalAlpha = D ? .15 : .6; ctx.drawImage(r2, 0, 0, W, H); ctx.restore(); }
      render(ctx, cam, S.filter(f => f.suelo && f.zb === .1), L); }
    else render(ctx, cam, S.filter(f => f.suelo), L);
    if (o.banda !== false) { const B = []; banda(B, t); ctx.globalAlpha = cgi() ? (D ? .26 : .2) : D ? .55 : .48; render(ctx, cam, B, { ...L, wire: null, fog: L.fog ? { ...L.fog, max: .55 } : null }); ctx.globalAlpha = 1; }
    for (const c of COCHES) { const p = pos(c, t); if (p[2] > ZMIN && p[2] < ZMAX && cam.toCam([p[0], 1, p[2]])[2] > -10) coche(F, c, t); }
    if (cgi()) { ctx.globalAlpha = D ? .35 : .6; render(ctx, cam, F.filter(f => f.alfa), L); ctx.globalAlpha = 1; }
    render(ctx, cam, [...S.filter(f => !f.suelo), ...F.filter(f => !f.alfa)], L);
    if (cgi() && !D) { ctx.save(); ctx.globalCompositeOperation = 'lighter';   // haces de los faros sobre el asfalto
      for (const c of COCHES) { const [x, , z] = pos(c, t), d = c.sent; if (Math.abs(z - cam.eye[2]) > 140) continue; const a = cam.P([x - .8, .02, z - d * 2.3]), b = cam.P([x + .8, .02, z - d * 2.3]), e = cam.P([x + 3, .02, z - d * 22]), f = cam.P([x - 3, .02, z - d * 22]); if ([a, b, e, f].some(q => q[2] < 1)) continue;
        const g2 = ctx.createLinearGradient(a[0], a[1], (e[0] + f[0]) / 2, (e[1] + f[1]) / 2); g2.addColorStop(0, 'rgba(255,240,200,.22)'); g2.addColorStop(1, 'rgba(255,240,200,0)'); ctx.fillStyle = g2; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(e[0], e[1]); ctx.lineTo(f[0], f[1]); ctx.fill(); }
      ctx.restore(); }
    if (!D && !wire()) { ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let z = ZMAX - 15; z > ZMIN; z -= 30) for (const s of [-1, 1]) { const q = cam.P([s * 10.8, 8.3, z]); if (q[2] < 1) continue; const r = 1100 / q[2], h = ctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], r); h.addColorStop(0, 'rgba(255,214,150,.42)'); h.addColorStop(1, 'rgba(255,214,150,0)'); ctx.fillStyle = h; ctx.fillRect(q[0] - r, q[1] - r, 2 * r, 2 * r); }
      for (const c of COCHES) { const [x, , z] = pos(c, t), d = c.sent; for (const [u, rgb, a] of [[2.3, '255,240,210', .5], [-2.3, '255,60,70', .38]]) for (const s of [-.6, .6]) { const q = cam.P([x + s, .56, z - d * u]); if (q[2] < 1 || q[2] > 160) continue;
          const nf = cam.toCam([x, .56, z - d * u * 1.5])[2] - cam.toCam([x, .56, z])[2]; if ((u > 0) !== (nf * d * (u > 0 ? 1 : -1) < 0 ? true : false) && false) continue;
          const vistaDelante = (cam.eye[2] - z) * -d > 0; if ((u > 0) !== vistaDelante) continue;                                     // solo se ve el halo de la cara que mira a la cámara
          const r = 200 / q[2], h = ctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], r); h.addColorStop(0, `rgba(${rgb},${a})`); h.addColorStop(1, `rgba(${rgb},0)`); ctx.fillStyle = h; ctx.fillRect(q[0] - r, q[1] - r, 2 * r, 2 * r); } }
      ctx.restore(); }
    if (cgi()) postCGI(ctx, D); }
  // bloom (resplandor de las zonas brillantes, a dos escalas) + gradación de color y viñeta. Sin ctx.filter: se reduce y se amplía con suavizado.
  function postCGI(ctx, D) { const w = W / 6 | 0, h = H / 6 | 0, a = mk(w, h), g = a.getContext('2d'); g.drawImage(ctx.canvas, 0, 0, w, h); const im = g.getImageData(0, 0, w, h), d = im.data, um = D ? 215 : 150;
    for (let i = 0; i < d.length; i += 4) { const l = d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11, k = Math.max(0, l - um) / (255 - um); d[i] *= k; d[i + 1] *= k; d[i + 2] *= k; } g.putImageData(im, 0, 0);
    const b = mk(w / 3 | 0, h / 3 | 0); b.getContext('2d').drawImage(a, 0, 0, b.width, b.height); const c2 = mk(w / 9 | 0, h / 9 | 0); c2.getContext('2d').drawImage(b, 0, 0, c2.width, c2.height);
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = D ? .35 : .7; ctx.drawImage(a, 0, 0, W, H); ctx.globalAlpha = D ? .3 : .6; ctx.drawImage(b, 0, 0, W, H); ctx.globalAlpha = D ? .25 : .5; ctx.drawImage(c2, 0, 0, W, H);
    ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = .35; const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, D ? '#3b6ea5' : '#1b3c7a'); gr.addColorStop(1, D ? '#f0a860' : '#e0784a'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; const v = ctx.createRadialGradient(W / 2, H * .5, H * .3, W / 2, H * .5, H * .78); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, D ? 'rgba(10,20,40,.28)' : 'rgba(0,0,8,.5)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  TR.escena = escena;
  // ------------------------------------------------ gráficos (un solo diseño en todo el vídeo)
  const COL = { azul: '94,200,255', verde: '64,224,150', ambar: '255,196,70', rojo: '255,80,92' }, colVel = v => v > 22 ? COL.verde : v > 9 ? COL.ambar : COL.rojo;
  const pastilla = (ctx, x, y, txt, o = {}) => { ctx.save(); const tam = o.tam || 38; ctx.font = `700 ${tam}px "DejaVu Sans", sans-serif`; const w = ctx.measureText(txt).width + tam * 1.6, h = tam * 1.6;
    x = Math.max(w / 2 + 24, Math.min(W - w / 2 - 24, x)); ctx.fillStyle = 'rgba(8,12,30,.82)'; ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, h / 2); ctx.fill();
    ctx.fillStyle = `rgb(${o.col || COL.azul})`; ctx.beginPath(); ctx.arc(x - w / 2 + h / 2, y, tam * .22, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x + tam * .3, y + 2); ctx.restore(); return [x, y, w]; };
  const anillo = (ctx, cam, c, r, t, col = COL.azul) => { for (let k = 0; k < 3; k++) { const f = ((t * .7 + k / 3) % 1), rr = r * (.35 + f * 1.3); ctx.strokeStyle = `rgba(${col},${(1 - f) * .85})`; ctx.lineWidth = 4; ctx.beginPath();
      for (let a = 0; a <= 48; a++) { const q = cam.P([c[0] + Math.cos(a / 48 * 6.283) * rr, .1, c[2] + Math.sin(a / 48 * 6.283) * rr]); a ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); } ctx.stroke(); } };
  const punto = (ctx, q, col = COL.azul, r = 12) => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], r * 3.5); g.addColorStop(0, `rgba(${col},.85)`); g.addColorStop(1, `rgba(${col},0)`); ctx.fillStyle = g; ctx.fillRect(q[0] - r * 3.5, q[1] - r * 3.5, r * 7, r * 7); ctx.restore();
    ctx.fillStyle = `rgb(${col})`; ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3.5; ctx.stroke(); };
  const linea = (ctx, a, b, col = COL.azul, disc = true) => { ctx.save(); ctx.strokeStyle = `rgba(${col},.9)`; ctx.lineWidth = 4; if (disc) ctx.setLineDash([12, 10]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.restore(); };
  const regla = (ctx, a, b, txt, dx = 70) => { ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a[0] + dx, a[1]); ctx.lineTo(b[0] + dx, b[1]); for (const p of [a, b]) { ctx.moveTo(p[0] + dx - 14, p[1]); ctx.lineTo(p[0] + dx + 14, p[1]); } ctx.stroke(); ctx.restore();
    pastilla(ctx, (a[0] + b[0]) / 2 + dx + 100 * Math.sign(dx), (a[1] + b[1]) / 2, txt, { tam: 34, col: '255,255,255' }); };
  const kmh = v => `${Math.round(v * 3.6)} km/h`;
  const DESTINO = [CARRIL[1], 0, -470];
  const pin = (ctx, cam, p, t) => { const q = cam.P([p[0], 0, p[2]]), top = cam.P([p[0], 12, p[2]]); if (q[2] < 1) return; const r = Math.max(16, (q[1] - top[1]) * .55), b = Math.sin(t * 3) * r * .08;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const hz = ctx.createLinearGradient(0, 0, 0, q[1]); hz.addColorStop(0, `rgba(${COL.verde},0)`); hz.addColorStop(1, `rgba(${COL.verde},.32)`); ctx.fillStyle = hz;
    ctx.beginPath(); ctx.moveTo(q[0] - r * .7, 0); ctx.lineTo(q[0] + r * .7, 0); ctx.lineTo(q[0] + r * .3, q[1]); ctx.lineTo(q[0] - r * .3, q[1]); ctx.fill(); ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(q[0], q[1], r * .5, r * .16, 0, 0, 7); ctx.fill();
    const y = q[1] - r * 1.5 - b; ctx.fillStyle = `rgb(${COL.rojo})`; ctx.beginPath(); ctx.moveTo(q[0], q[1] - b); ctx.bezierCurveTo(q[0] - r * .25, y + r * .4, q[0] - r * .7, y + r * .2, q[0] - r * .7, y - r * .2); ctx.arc(q[0], y - r * .2, r * .7, Math.PI, 0); ctx.bezierCurveTo(q[0] + r * .7, y + r * .2, q[0] + r * .25, y + r * .4, q[0], q[1] - b); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(2, r * .08); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(q[0], y - r * .2, r * .28, 0, 7); ctx.fill(); };
  const etiquetaCoche = (ctx, cam, c, t, dx = 140, dy = -46) => { const p = pos(c, t), q = cam.P([p[0], 2.2, p[2]]); if (q[2] < 1 || q[1] < 260 || q[1] > H - 420 || q[0] < 0 || q[0] > W) return; const v = vel(c, t), col = colVel(v); punto(ctx, q, col, 11); const e = pastilla(ctx, q[0] + dx, q[1] + dy, kmh(v), { tam: 36, col }); linea(ctx, q, [e[0] - Math.sign(dx) * e[2] / 2, e[1]], col, false); };
  const cerca = (z, t, x = null) => COCHES.filter(c => c.sent === 1 && !c.heroe && (x === null || c.x === x)).reduce((m, c) => !m || Math.abs(pos(c, t)[2] - z) < Math.abs(pos(m, t)[2] - z) ? c : m, null);
  // ------------------------------------------------ PLAN: de general a detalle y vuelta a general (6 planos)
  const lerp = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k), sv = k => k * k * (3 - 2 * k);
  const PLANOS = [
    { nombre: 'general', dur: 5, cam: (h, k) => [lerp([-190, 380, 330], [-150, 300, 270], sv(k)), [0, 0, -110], 44], extra: (ctx, cam, t) => {
        [[150, 150], [-30, -170], [-230, 160], [-400, -160]].forEach(([z, dx]) => { const c = cerca(z, t, CARRIL[2]); if (c) etiquetaCoche(ctx, cam, c, t, dx, -40); }); } },
    { nombre: 'aerea', dur: 4.5, cam: (h, k) => [lerp([h[0] - 34, 150, h[2] + 100], [h[0] - 26, 120, h[2] + 76], sv(k)), [h[0] - 2, 0, h[2] - 100], 48], extra: (ctx, cam, t, h) => {
        anillo(ctx, cam, h, 9, t); const q = cam.P([h[0], 2, h[2]]); punto(ctx, q); pastilla(ctx, q[0] - 200, q[1] - 30, kmh(TR.velHeroe(t)), { col: colVel(TR.velHeroe(t)) });
        [[h[2] - 90, 160], [h[2] - 190, -170]].forEach(([z, dx]) => { const c = cerca(z, t, CARRIL[2]); if (c) etiquetaCoche(ctx, cam, c, t, dx, -40); }); } },
    { nombre: 'seguimiento', dur: 5, cam: (h, k) => [lerp([h[0] + 5, 7, h[2] + 15], [h[0] - 3, 13, h[2] + 21], sv(k)), [h[0] + .4, 0, h[2] - 18], 48], extra: (ctx, cam, t, h) => {
        anillo(ctx, cam, h, 4.5, t); const v = TR.velHeroe(t), a = cam.P([h[0], 1.8, h[2]]), b = cam.P([h[0], 1.8, h[2] - v]); linea(ctx, a, b); punto(ctx, a); punto(ctx, b, COL.azul, 9); regla(ctx, a, b, `${Math.round(v)} m`, 80);   // en 1 s recorre v metros
        pastilla(ctx, a[0] - 240, a[1] + 10, '8:14:21', { tam: 34 }); pastilla(ctx, b[0] - 230, b[1], '8:14:22', { tam: 34 }); pastilla(ctx, W / 2, 360, kmh(TR.velHeroe(t)), { tam: 58, col: colVel(TR.velHeroe(t)) }); } },
    { nombre: 'cola', dur: 4.5, cam: (h, k) => [[h[0] - 1.5, 95 - 25 * sv(k), h[2] - 14.99], [h[0] - 1.5, 0, h[2] - 15], 42, [0, 0, -1]], extra: (ctx, cam, t, h) => {
        const cv = colVel(TR.velHeroe(t)); anillo(ctx, cam, h, 4, t, cv); const q = cam.P([h[0], 2, h[2]]); punto(ctx, q, cv); pastilla(ctx, q[0] - 230, q[1], kmh(TR.velHeroe(t)), { col: cv });
        const dl = delante(HEROE, t); if (dl && dl[1] > h[2] - 70) { const a = cam.P([h[0], .5, h[2] - 2.2]), b = cam.P([h[0], .5, dl[1] + 2.2]); regla(ctx, a, b, `${Math.max(1, Math.round(h[2] - dl[1] - LC))} m`, 90); } } },
    { nombre: 'cabeza', dur: 4.5, cam: (h, k) => [lerp([7.5, 6, J1 - 26], [6, 8.5, J1 - 34], sv(k)), [4.5, 0, J1 + 40], 52], extra: (ctx, cam, t) => {   // de frente a la cabeza del atasco: los coches salen hacia la cámara
        const nuestros = COCHES.filter(c => c.sent === 1 && !c.heroe).map(c => [c, pos(c, t)[2]]);
        const sale = nuestros.filter(([, z]) => z < J1 && z > J1 - 22).sort((a, b) => a[1] - b[1])[0], dentro = nuestros.filter(([c, z]) => z > J1 + 12 && z < J1 + 45 && c.x === CARRIL[2]).sort((a, b) => a[1] - b[1])[0];
        if (dentro) etiquetaCoche(ctx, cam, dentro[0], t, 180, -60); if (sale) etiquetaCoche(ctx, cam, sale[0], t, -190, -70); } },
    { nombre: 'final', dur: 5, cam: (h, k) => [lerp([h[0] - 10, 34, h[2] + 36], [-170, 360, h[2] + 170], sv(k)), [DESTINO[0], 0, lerp([h[2] - 40], [(h[2] + DESTINO[2]) / 2], sv(k))[0]], 48], extra: (ctx, cam, t, h) => {
        anillo(ctx, cam, h, 8, t); punto(ctx, cam.P([h[0], 2, h[2]])); pin(ctx, cam, DESTINO, t); } },
  ];
  TR.planos = PLANOS; TR.dur = PLANOS.reduce((s, p) => s + p.dur, 0);
  function plano(ctx, i, t, tl) { const P = PLANOS[i], h = TR.heroe(t), [eye, target, fov, up] = P.cam(h, Math.min(1, tl / P.dur)), cam = camera(eye, target, { fov, up }), alto = eye[1];
    escena(ctx, cam, t, { alto, near: alto > 200 ? 260 : alto > 80 ? 130 : 50, far: alto > 200 ? 900 : 560 }); P.extra(ctx, cam, t, h); }
  ESC.trafico = (ctx, t = 0) => { t = Math.max(0, Math.min(TR.dur - 1e-3, t)); let a = 0, i = 0; while (i < PLANOS.length - 1 && t >= a + PLANOS[i].dur) { a += PLANOS[i].dur; i++; } const tl = t - a;
    plano(ctx, i, t, tl); if (i > 0 && tl < .4) { const c = mk(W, H), g = c.getContext('2d'); plano(g, i - 1, t, PLANOS[i - 1].dur); ctx.globalAlpha = 1 - sv(tl / .4); ctx.drawImage(c, 0, 0); ctx.globalAlpha = 1; } };
})();
