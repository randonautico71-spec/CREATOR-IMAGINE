'use strict';
/* MOTOR SDF DE ANIMALES — ray marching en CPU (Node, sin GPU ni dependencias).
   - Cuadrúpedos paramétricos (ESPECIES) hechos de elipsoides y conos redondeados, con ojos, nariz, pezuñas/zarpas, borlas...
   - Marcha con cinemática inversa: cada pata se apoya en el suelo y avanza a la velocidad real del animal (sin patinar).
   - renderFrame(escena, t, w, h) devuelve RGB; la escena (engine/sdf/escenas/*.js) define prepara/map/shade/cielo.
   Uso: python3 pipeline/vid.py sdf <escena>  ·  guía: docs/SDF_ANIMALES.md */
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const mix = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const fract = x => x - Math.floor(x);
const h2 = (x, y) => fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);
const h3 = (x, y, z) => fract(Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453);
function n2(x, y) { const ix = Math.floor(x), iy = Math.floor(y); let fx = x - ix, fy = y - iy; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); return mix(mix(h2(ix, iy), h2(ix + 1, iy), fx), mix(h2(ix, iy + 1), h2(ix + 1, iy + 1), fx), fy); }
function n3(x, y, z) { const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z); let fx = x - ix, fy = y - iy, fz = z - iz; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
  return mix(mix(mix(h3(ix, iy, iz), h3(ix + 1, iy, iz), fx), mix(h3(ix, iy + 1, iz), h3(ix + 1, iy + 1, iz), fx), fy), mix(mix(h3(ix, iy, iz + 1), h3(ix + 1, iy, iz + 1), fx), mix(h3(ix, iy + 1, iz + 1), h3(ix + 1, iy + 1, iz + 1), fx), fy), fz); }
function fbm2(x, y, o) { let s = 0, a = .5, n = 0; for (let i = 0; i < o; i++) { s += a * n2(x, y); n += a; a *= .5; x *= 2.03; y *= 2.03; } return s / n; }
function voro3(x, y, z) { const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z); let f1 = 9, f2 = 9, id = 0;
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) { const cx = ix + a, cy = iy + b, cz = iz + c; const dx = cx + h3(cx, cy, cz) - x, dy = cy + h3(cx + 5.1, cy, cz) - y, dz = cz + h3(cx, cy + 9.7, cz) - z; const d = Math.sqrt(dx * dx + dy * dy + dz * dz); if (d < f1) { f2 = f1; f1 = d; id = h3(cx + 1.3, cy + 2.1, cz + 3.7); } else if (d < f2) f2 = d; }
  return [f1, f2, id]; }
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * .25; };
function sdEll(px, py, pz, rx, ry, rz) { const ax = px / rx, ay = py / ry, az = pz / rz, k0 = Math.sqrt(ax * ax + ay * ay + az * az), bx = ax / rx, by = ay / ry, bz = az / rz, k1 = Math.sqrt(bx * bx + by * by + bz * bz) + 1e-9; return k0 * (k0 - 1) / k1; }
function sdCap(px, py, pz, ax, ay, az, bx, by, bz, r) { const pax = px - ax, pay = py - ay, paz = pz - az, bax = bx - ax, bay = by - ay, baz = bz - az; const h = clamp((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz), 0, 1); const dx = pax - bax * h, dy = pay - bay * h, dz = paz - baz * h; return Math.sqrt(dx * dx + dy * dy + dz * dz) - r; }
const primD = (q, x, y, z) => q.t === 0 ? sdEll(x - q.cx, y - q.cy, z - q.cz, q.rx, q.ry, q.rz) : q.t === 1 ? sdCap(x, y, z, q.ax, q.ay, q.az, q.bx, q.by, q.bz, q.r) : sdRC(x, y, z, q.ax, q.ay, q.az, q.bx, q.by, q.bz, q.r1, q.r2);

// ---------- cuadrúpedo paramétrico ----------
// Marchas: fase de cada pata en fracción de ciclo [del-izq, del-der, tras-izq, tras-der] y 'beta' = fracción del ciclo con la pata apoyada
const GALOPE = { f: [0, .1, .55, .65], beta: .38 }, GALOPE_CORTO = { f: [0, .1, .55, .65], beta: .3 }, PASO = { f: [0, .5, .75, .25], beta: .65 };
const ESPECIES = {
  ciervo: { bl: .42, bh: .25, bw: .2, L1: .42, L2: .5, lr: .045, amp: .75, fold: 1.2, freq: 2.8, gait: GALOPE, bob: .07, nx: .28, ny: .34, nr: .085, nod: .05, hl: .16, hh: .09, hw: .08, sl: .14, sd: .04, sr: .055, el: .15, er: .032, tx: -.08, ty: .14, tw: .06, tr: .055, k: .07, astas: 1, colaBase: 1.1, colaPunta: .7, ojo: 1.15 },
  zorro: { bl: .3, bh: .14, bw: .12, L1: .2, L2: .22, lr: .032, amp: .85, fold: 1.3, freq: 4.2, gait: GALOPE_CORTO, bob: .05, nx: .1, ny: .14, nr: .07, nod: .03, hl: .12, hh: .08, hw: .08, sl: .14, sd: .025, sr: .035, el: .11, er: .03, tx: -.55, ty: -.06, tw: .08, tr: .085, k: .06, zarpa: 1, colaBase: .6, colaPunta: 1.25, orejaPunta: .35, ojo: .9 },
  jirafa: { bl: .65, bh: .33, bw: .27, L1: .95, L2: 1.0, lr: .07, amp: .32, fold: .5, freq: .9, gait: PASO, bob: .03, alto: 1.03, nx: .6, ny: 1.75, nr: .13, nod: .06, hl: .28, hh: .12, hw: .11, sl: .18, sd: .05, sr: .08, el: .14, er: .035, tx: -.12, ty: -.65, tw: .08, tr: .03, k: .1, osic: 1, crin: .55, cruz: .55, borla: 1, colaPunta: .7, ojo: 1.15 },
  cebra: { bl: .62, bh: .3, bw: .25, L1: .48, L2: .52, lr: .06, amp: .4, fold: .6, freq: 1.3, gait: PASO, bob: .025, alto: 1.03, nx: .3, ny: .5, nr: .15, nod: .05, hl: .24, hh: .12, hw: .11, sl: .2, sd: .08, sr: .085, el: .15, er: .035, tx: -.12, ty: -.5, tw: .08, tr: .035, k: .09, crin: 1, borla: 1, colaPunta: .8, orejaPunta: .45 },
  guepardo: { bl: .5, bh: .17, bw: .15, L1: .36, L2: .38, lr: .045, amp: .45, fold: .7, freq: 1.2, gait: PASO, bob: .02, alto: 1.0, nx: .16, ny: .12, nr: .09, nod: .03, hl: .13, hh: .1, hw: .11, sl: .07, sd: .02, sr: .065, el: .06, er: .035, tx: -.62, ty: -.42, tw: .1, tr: .04, k: .07, zarpa: 1, colaPunta: .8, orejaPunta: .8, ojo: 1.1 },
};
function sdRC(px, py, pz, ax, ay, az, bx, by, bz, r1, r2) {
  const bax = bx - ax, bay = by - ay, baz = bz - az, l2 = bax * bax + bay * bay + baz * baz, rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
  const pax = px - ax, pay = py - ay, paz = pz - az, y = pax * bax + pay * bay + paz * baz, z = y - l2;
  const qx = pax * l2 - bax * y, qy = pay * l2 - bay * y, qz = paz * l2 - baz * y, x2 = qx * qx + qy * qy + qz * qz, y2 = y * y * l2, z2 = z * z * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}
/* o.v = velocidad de avance en m/s (hacia +x) y o.suelo(x, z) = altura del terreno: con ambos, las pezuñas se quedan clavadas al apoyar.
   Los animales pequeños dan pasos más rápidos (freq / sqrt(escala)). */
function cuadrupedo(nombre, ox, oz, t, ph, esc = 1, o = {}) {
  const S = ESPECIES[nombre], s = esc, freq = S.freq / Math.sqrt(s), T = 2 * Math.PI * freq * t + ph;
  const suelo = o.suelo || (() => 0), v = o.v || 0;
  const hb = (.35 * S.bh + (S.L1 + S.L2) * (S.alto || .93)) * s, oy = hb + S.bob * s * Math.sin(2 * T);
  const P = [];
  const E = (cx, cy, cz, rx, ry, rz, m, hard) => P.push({ t: 0, cx: ox + cx * s, cy: oy + cy * s, cz: oz + cz * s, rx: rx * s, ry: ry * s, rz: rz * s, m, hard });
  const C = (ax, ay, az, bx, by, bz, r, m, hard) => P.push({ t: 1, ax: ox + ax * s, ay: oy + ay * s, az: oz + az * s, bx: ox + bx * s, by: oy + by * s, bz: oz + bz * s, r: r * s, m, hard });
  const RC = (ax, ay, az, bx, by, bz, r1, r2, m, hard) => P.push({ t: 2, ax: ox + ax * s, ay: oy + ay * s, az: oz + az * s, bx: ox + bx * s, by: oy + by * s, bz: oz + bz * s, r1: r1 * s, r2: r2 * s, m, hard });
  // tronco: costillar, pecho, grupa, cruz y vientre
  E(0, 0, 0, S.bl, S.bh, S.bw, 'cuerpo');
  E(S.bl * .5, S.bh * .1, 0, S.bl * .48, S.bh * 1.05, S.bw * .95, 'cuerpo');
  E(-S.bl * .55, S.bh * .08, 0, S.bl * .42, S.bh, S.bw, 'cuerpo');
  E(S.bl * .5, S.bh * .62, 0, S.bl * .32, S.bh * (S.cruz || .35), S.bw * .55, 'cuerpo');
  E(-S.bl * .05, -S.bh * .3, 0, S.bl * .6, S.bh * .7, S.bw * .92, 'cuerpo');
  // cuello que se estrecha y cabeza con mandíbula
  const nbx = S.bl * .8, nby = S.bh * .35, nod = S.nod * Math.sin(2 * T), ntx = nbx + S.nx, nty = nby + S.ny + nod;
  RC(nbx, nby, 0, ntx, nty, 0, S.nr * 1.4, S.nr * .8, 'cuello');
  if (S.crin) RC(nbx - S.nr * .4, nby + S.nr * 1.05, 0, ntx - S.nr * .5, nty + S.nr * .75, 0, S.nr * (S.crin * .42), S.nr * (S.crin * .3), 'crin');
  const hx = ntx + S.hl * .55, hy = nty + .02;
  E(hx, hy, 0, S.hl, S.hh, S.hw, 'cabeza');
  E(hx + S.hl * .15, hy - S.hh * .35, 0, S.hl * .72, S.hh * .55, S.hw * .82, 'cabeza');
  const tipx = hx + S.sl + S.hl * .5, tipy = hy - S.sd;
  RC(hx, hy, 0, tipx, tipy, 0, S.sr * 1.25, S.sr * .85, 'hocico');
  E(tipx + S.sr * .62, tipy + S.sr * .12, 0, S.sr * .32, S.sr * .42, S.sr * .7, 'nariz', true);
  const ojx = hx + S.hl * .36, ojy = hy + S.hh * .32;
  for (const sd of [-1, 1]) E(ojx, ojy, sd * S.hw * .8, S.hh * .25 * (S.ojo || 1), S.hh * .23 * (S.ojo || 1), S.hh * .17, 'ojo', true);
  for (const sd of [-1, 1]) RC(hx - S.hl * .45, hy + S.hh * .6, sd * S.hw * .55, hx - S.hl * .45 - S.el * .45, hy + S.hh * .6 + S.el, sd * (S.hw * .55 + S.el * .45), S.er * 1.05, S.er * (S.orejaPunta || .55), 'oreja');
  if (S.astas && s > .9) for (const sd of [-1, 1]) { const bx0 = hx - S.hl * .3, by0 = hy + S.hh * .8, bz0 = sd * .05, mx = bx0 - .12, my = by0 + .3, mz = sd * .18; RC(bx0, by0, bz0, mx, my, mz, .028, .02, 'asta', true); RC(mx, my, mz, mx - .12, my + .22, mz + sd * .08, .02, .011, 'asta', true); RC(bx0 - .06, by0 + .15, bz0 + sd * .07, bx0 + .08, by0 + .3, sd * .14, .018, .009, 'asta', true); RC(mx - .05, my + .1, mz + sd * .03, mx + .08, my + .28, mz + sd * .04, .016, .008, 'asta', true); }
  if (S.osic) for (const sd of [-1, 1]) { const ax = hx - S.hl * .3, ay = hy + S.hh * .7, bx = hx - S.hl * .38, by = hy + S.hh * .7 + .14; RC(ax, ay, sd * .05, bx, by, sd * .06, .03, .02, 'osicon'); E(bx, by + .01, sd * .06, .032, .03, .032, 'borla', true); }
  // cola
  const rx = -S.bl * .95, ry = S.bh * .3, ex = rx + S.tx, ey = ry + S.ty + S.tw * Math.sin(T * 2);
  RC(rx, ry, 0, ex, ey, 0, S.tr * (S.colaBase || 1), S.tr * (S.colaPunta || 1), 'cola');
  if (S.borla) E(ex, ey - S.tr * 2, 0, S.tr * 1.6, S.tr * 3.5, S.tr * 1.6, 'borla', true);
  // patas: muslo, rodilla, caña y pezuña/zarpa
  const L1 = S.L1, L2 = S.L2, g = S.gait, zancada = v / (freq * s), alza = (L1 + L2) * .16, p0 = T / (2 * Math.PI);
  for (let i = 0; i < 4; i++) {
    const front = i < 2, sd = i % 2 ? 1 : -1, hipx = (front ? 1 : -1) * S.bl * .62, hipy = -S.bh * .35, hipz = sd * S.bw * .55;
    // trayectoria del pie: apoyado (retrocede respecto al cuerpo justo lo que avanza el animal) y en vuelo (vuelve adelante levantado)
    const p = fract(p0 + g.f[i]), half = zancada * g.beta / 2;
    let fxr, lift = 0;
    if (p < g.beta) fxr = half - p / g.beta * 2 * half;
    else { const q = (p - g.beta) / (1 - g.beta), e = q * q * (3 - 2 * q); fxr = -half + e * 2 * half; lift = Math.sin(Math.PI * q) * alza; }
    const fxl = hipx + fxr, wx = ox + fxl * s, wz = oz + hipz * s;
    let fx = fxl, fy = (suelo(wx, wz) - oy) / s + S.lr * .9 + lift;
    // ANATOMÍA DE TRES SEGMENTOS (como en perros, caballos, ciervos…):
    //  · delantera: hombro → codo (el codo queda ATRÁS) → muñeca → mano; al levantarla, la muñeca se flexiona y la mano queda detrás
    //  · trasera: cadera → rodilla (queda DELANTE) → corvejón (queda ATRÁS) → pie casi vertical
    const qv = p < g.beta ? 0 : Math.sin(Math.PI * (p - g.beta) / (1 - g.beta));   // 0 apoyado, 1 en mitad del vuelo
    const L3 = front ? L2 * .24 : L2 * .42, L2b = L2 - L3 * .85;
    const wx2 = front ? fx + L3 * (.05 + .75 * qv) : fx - L3 * (.28 - .15 * qv), wy2 = front ? fy + L3 * (1 - .35 * qv) : fy + L3 * .96;   // muñeca / corvejón
    let dx = wx2 - hipx, dy = wy2 - hipy, d = Math.hypot(dx, dy); const dmax = (L1 + L2b) * .999; let jx = wx2, jy = wy2;
    if (d > dmax) { dx *= dmax / d; dy *= dmax / d; jx = hipx + dx; jy = hipy + dy; d = dmax; }
    const a = (d * d + L1 * L1 - L2b * L2b) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a)), ux = dx / d, uy = dy / d, sg = front ? -1 : 1;
    const kx = hipx + ux * a - uy * h * sg, ky = hipy + uy * a + ux * h * sg;
    RC(hipx, hipy, hipz, kx, ky, hipz, S.lr * 1.9, S.lr * .95, 'pata');
    E(kx, ky, hipz, S.lr * 1.05, S.lr * 1.1, S.lr * 1.0, 'patab');
    RC(kx, ky, hipz, jx, jy, hipz, S.lr * .85, S.lr * .66, 'patab');
    E(jx, jy, hipz, S.lr * .75, S.lr * .75, S.lr * .72, 'patab');
    RC(jx, jy, hipz, fx, fy, hipz, S.lr * .62, S.lr * .55, 'patab');
    if (S.zarpa) E(fx + S.lr * .35, fy - S.lr * .15, hipz, S.lr * 1.1, S.lr * .6, S.lr * .85, 'zarpa');
    else E(fx + S.lr * .15, fy - S.lr * .15, hipz, S.lr * .95, S.lr * .9, S.lr * .9, 'pezuna', true);
  }
  let bx = 0, by = 0, bz = 0; for (const q of P) { bx += q.t ? (q.ax + q.bx) / 2 : q.cx; by += q.t ? (q.ay + q.by) / 2 : q.cy; bz += q.t ? (q.az + q.bz) / 2 : q.cz; }
  bx /= P.length; by /= P.length; bz /= P.length;
  let br = 0; for (const q of P) { const r = q.t === 1 ? q.r : q.t === 2 ? Math.max(q.r1, q.r2) : 0; const pts = q.t ? [[q.ax, q.ay, q.az, r], [q.bx, q.by, q.bz, r]] : [[q.cx, q.cy, q.cz, Math.max(q.rx, q.ry, q.rz)]]; for (const [x, y, z, rr] of pts) br = Math.max(br, Math.hypot(x - bx, y - by, z - bz) + rr); }
  return { nombre, P, bx, by, bz, br: br + .05, k: S.k * s, ox, oy, oz, s, S, cab: { hx, hy, ojx, ojy, tipx, tipy } };
}
function sdAnimal(a, x, y, z) { const dB = Math.hypot(x - a.bx, y - a.by, z - a.bz) - a.br; if (dB > .3) return dB; let d = 1e9, hd = 1e9; for (const q of a.P) { const di = primD(q, x, y, z); if (q.hard) { if (di < hd) hd = di; } else d = smin(d, di, a.k); } return Math.min(d, hd); }
function primCercana(a, x, y, z) { let best = null, bd = 1e9; for (const q of a.P) { const d = primD(q, x, y, z); if (d < bd) { bd = d; best = q; } } return best; }

// ---------- render genérico ----------
function renderFrame(E, t, w, h) {
  const sc = E.prepara(t), out = new Uint8Array(w * h * 3);
  const [ex, ey, ez] = sc.eye, [tx, ty, tz] = sc.target;
  let fx = tx - ex, fy = ty - ey, fz = tz - ez; const fl = Math.hypot(fx, fy, fz); fx /= fl; fy /= fl; fz /= fl;
  let rx = -fz, rz = fx; const rl = Math.hypot(rx, rz); rx /= rl; rz /= rl; const ry = 0;
  const ux = ry * fz - rz * fy, uy = rz * fx - rx * fz, uz = rx * fy - ry * fx;
  const foc = (h / 2) / Math.tan(sc.fov * Math.PI / 360);
  const map = (x, y, z) => E.map(sc, x, y, z);
  for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
    const sx = (px + .5 - w / 2) / foc, sy = -(py + .5 - h / 2) / foc;
    let dx = fx + rx * sx + ux * sy, dy = fy + ry * sx + uy * sy, dz = fz + rz * sx + uz * sy; const dl = Math.hypot(dx, dy, dz); dx /= dl; dy /= dl; dz /= dl;
    let T = .05, hit = false, dUlt = 1e9;
    for (let i = 0; i < (sc.pasos || 260); i++) { const d = map(ex + dx * T, ey + dy * T, ez + dz * T); dUlt = d; if (d < .0007 * T) { hit = true; break; } T += d * .85; if (T > sc.far) break; }
    if (!hit && T < sc.far && dUlt < .004 * T) hit = true;
    let c;
    if (hit) {
      const x = ex + dx * T, y = ey + dy * T, z = ez + dz * T, e = .0008 * T + .0005;
      let nx = map(x + e, y, z) - map(x - e, y, z), ny = map(x, y + e, z) - map(x, y - e, z), nz = map(x, y, z + e) - map(x, y, z - e); const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
      c = E.shade(sc, x, y, z, nx, ny, nz, dx, dy, dz, T, map);
    } else c = E.cielo(sc, dx, dy, dz);
    const vx = (px / w - .5), vy = (py / h - .5), vig = 1 - .35 * (vx * vx + vy * vy) * 2;
    const i = (py * w + px) * 3;
    for (let k = 0; k < 3; k++) { let v = c[k] * vig; v = 1 - Math.exp(-v * 1.25); v = Math.pow(v, .4545); v = mix(v, v * v * (3 - 2 * v), .4); out[i + k] = clamp(v * 255, 0, 255); }
  }
  return out;
}
function sombra(map, x, y, z, lx, ly, lz, k, maxT, n = 36) { let res = 1, t = .04; for (let i = 0; i < n; i++) { const h = map(x + lx * t, y + ly * t, z + lz * t); res = Math.min(res, k * h / t); t += clamp(h, .03, .6); if (res < .002 || t > maxT) break; } return clamp(res, 0, 1); }

function oclusion(map, x, y, z, nx, ny, nz) { let o = 0, w = 1; for (let i = 1; i <= 4; i++) { const h = .02 + .06 * i, d = map(x + nx * h, y + ny * h, z + nz * h); o += (h - d) * w; w *= .7; } return clamp(1 - 2.8 * o, .25, 1); }
// brillo especular de materiales húmedos (ojos y nariz) y matiz de pelaje
function brillo(m, nx, ny, nz, dx, dy, dz, L) { const ks = m === 'ojo' ? 4 : m === 'nariz' ? 1.2 : m === 'pezuna' ? .35 : 0; if (!ks) return 0; const hx = L[0] - dx, hy = L[1] - dy, hz = L[2] - dz, hl = Math.hypot(hx, hy, hz); const sp = Math.pow(Math.max(0, (nx * hx + ny * hy + nz * hz) / hl), m === 'ojo' ? 140 : 40); const fr = Math.pow(1 - Math.max(0, -(nx * dx + ny * dy + nz * dz)), 4); return ks * sp + (m === 'ojo' ? .25 * fr : 0); }
const pelo = (x, y, z) => .86 + .28 * n3(x * 22, y * 140, z * 140);
function lagrima(a, lx, ly, lz) { const c = a.cab, ax = c.ojx + .01, ay = c.ojy - .025, bx = c.tipx - .04, by = c.tipy - .07; const vx = bx - ax, vy = by - ay, h = clamp(((lx - ax) * vx + (ly - ay) * vy) / (vx * vx + vy * vy), 0, 1); return Math.hypot(lx - ax - vx * h, ly - ay - vy * h); }
module.exports = { ESPECIES, GALOPE, PASO, sdRC, oclusion, brillo, pelo, lagrima, clamp, mix, sstep, fract, h2, h3, n2, n3, fbm2, voro3, smin, sdEll, sdCap, cuadrupedo, sdAnimal, primCercana, renderFrame, sombra };
