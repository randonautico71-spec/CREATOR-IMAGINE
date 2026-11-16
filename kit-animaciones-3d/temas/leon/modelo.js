'use strict';
// LEÓN DETALLADO (≈150 piezas) + entorno de sabana detallado, para el motor 3D del kit (motor3d.js).
// Coordenadas locales del león: x hacia delante, y arriba, z a los lados. Largo ≈ 2,6 (sin cola).
const BI = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
function baseDir(d) { d = norm(d); const a = Math.abs(d[1]) < .92 ? [0, 1, 0] : [1, 0, 0]; const u = norm(cross(a, d)), v = cross(d, u); return [u, d, v]; } // eje largo = y
function bZ(a) { return [rotZ([1, 0, 0], a), rotZ([0, 1, 0], a), [0, 0, 1]]; }
const aplicaB = (B, p) => [B[0][0] * p[0] + B[1][0] * p[1] + B[2][0] * p[2], B[0][1] * p[0] + B[1][1] * p[1] + B[2][1] * p[2], B[0][2] * p[0] + B[1][2] * p[1] + B[2][2] * p[2]];
const invB = (B, p) => [dot(B[0], p), dot(B[1], p), dot(B[2], p)];
function fib(i, n) { const y = 1 - (i + .5) / n * 2, r = Math.sqrt(1 - y * y), th = i * 2.39996; return [r * Math.cos(th), y, r * Math.sin(th)]; }

function leonPartesHD(t = .2, o = {}) {
  const P = [], E = (c, s, B, part, res) => P.push({ c, s, B: B || BI, part, res });
  const R = rng(17);
  // tronco y musculatura
  E([.25, .9, 0], [.56, .36, .31], 0, 'cuerpo'); E([.64, .86, 0], [.32, .41, .3], 0, 'pecho');
  E([-.05, .76, 0], [.6, .25, .27], 0, 'vientre'); E([-.36, .93, 0], [.42, .29, .27], 0, 'cuerpo'); E([-.7, .88, 0], [.33, .34, .29], 0, 'cuerpo');
  E([.05, 1.12, 0], [.82, .06, .1], 0, 'lomo');
  for (const sd of [-1, 1]) { E([.58, .96, sd * .2], [.22, .29, .1], bZ(.3), 'hombro'); E([-.7, .8, sd * .2], [.27, .31, .1], bZ(-.25), 'muslo'); E([.15, .86, sd * .25], [.4, .2, .07], 0, 'costado'); }
  // cuello y cabeza
  E([.88, 1.07, 0], [.27, .25, .21], bZ(.6), 'cuello');
  const hc = [1.18, 1.18, 0];
  E(hc, [.2, .19, .19], 0, 'craneo'); E([1.25, 1.25, 0], [.11, .05, .14], 0, 'frente');
  for (const sd of [-1, 1]) { E([1.25, 1.1, sd * .11], [.13, .11, .095], 0, 'mejilla'); E([1.435, 1.085, sd * .055], [.075, .062, .062], 0, 'bigotera');
    E([1.335, 1.205, sd * .1], [.04, .03, .03], 0, 'parpado', 8); E([1.343, 1.205, sd * .108], [.031, .024, .024], 0, 'ojo', 8); E([1.355, 1.205, sd * .125], [.009, .016, .006], 0, 'pupila', 6);
    E([1.1, 1.38, sd * .15], [.035, .065, .06], 0, 'oreja', 8); }
  E([1.38, 1.11, 0], [.13, .1, .12], 0, 'hocico'); E([1.36, 1.19, 0], [.12, .045, .065], bZ(-.15), 'puente');
  E([1.51, 1.13, 0], [.036, .036, .058], 0, 'nariz', 8); E([1.34, 1.0, 0], [.11, .05, .08], 0, 'barbilla'); E([1.47, 1.045, 0], [.035, .01, .065], 0, 'boca', 6);
  // melena: masa interior + ~90 mechas orientadas hacia atrás y fuera, dejando libre la cara
  const mc = [1.0, 1.12, 0], mr = [.27, .37, .36];
  E(mc, [.25, .34, .33], 0, 'melena'); E([.78, .95, 0], [.26, .3, .27], bZ(.5), 'melena');
  const nT = o.mechas ?? 170;
  for (let i = 0; i < nT; i++) {
    const n = fib(i, nT); if (n[0] > .42) continue;
    const c = [mc[0] + n[0] * mr[0] * .8, mc[1] + n[1] * mr[1] * .85, mc[2] + n[2] * mr[2] * .85];
    const d = norm([n[0] - 1.1, n[1] * .9 - .2, n[2] * 1.1]), L = .09 + R() * .06;
    E(add(c, mul(d, L * .35)), [.05 + R() * .015, L, .04 + R() * .015], baseDir(d), 'mecha', o.resMecha);
  }
  for (let i = 0; i < Math.round(nT * .25); i++) { // pechera de la melena
    const a = (R() - .5) * 1.6, c = [.86 + R() * .1, .92 - R() * .2, Math.sin(a) * .2], d = norm([.15, -1, Math.sin(a) * .4]);
    E(add(c, mul(d, .05)), [.05, .1 + R() * .05, .04], baseDir(d), 'mecha', o.resMecha);
  }
  // patas: muslo, rodilla, caña, pie y 4 dedos
  for (let i = 0; i < 4; i++) {
    const front = i < 2, sd = i % 2 ? 1 : -1, ph = [0, Math.PI, Math.PI * 1.5, Math.PI * .5][i];
    const sw = Math.sin(2 * Math.PI * t + ph) * .3, lift = Math.max(0, Math.cos(2 * Math.PI * t + ph));
    const hip = [front ? .52 : -.62, .76, sd * .18], L1 = .38, L2 = .37;
    const knee = [hip[0] + Math.sin(sw) * L1, hip[1] - Math.cos(sw) * L1, hip[2]];
    const sw2 = sw + (front ? -.1 - .5 * lift : .35 + .3 * lift), foot = [knee[0] + Math.sin(sw2) * L2, Math.max(.06 + .1 * lift, knee[1] - Math.cos(sw2) * L2), hip[2]];
    const dir = (a, b) => norm(sub(b, a)), mid = (a, b) => mul(add(a, b), .5);
    E(mid(hip, knee), [.12, .23, .105], baseDir(dir(hip, knee)), 'pata');
    E(knee, [.075, .07, .072], 0, 'pata');
    E(mid(knee, foot), [.075, .2, .07], baseDir(dir(knee, foot)), 'pata');
    E([foot[0] + .07, foot[1] - .01, foot[2]], [.115, .06, .095], 0, 'zarpa');
    for (let k = 0; k < 4; k++) E([foot[0] + .16, foot[1] - .025, foot[2] + (k - 1.5) * .045], [.035, .03, .026], 0, 'dedo', 6);
  }
  // cola en S con borla
  let p = [-1.0, .98, 0];
  for (let k = 0; k < 16; k++) {
    const u = k / 15, q = [-1.0 - u * 1.05, .98 - Math.sin(u * 2.6) * .55 + u * u * .25 + .04 * Math.sin(t * 6 + u * 4), .06 * Math.sin(u * 3 + t * 2)];
    const d = norm(sub(q, p)); E(mul(add(p, q), .5), [.06 - u * .022, .045 + Math.hypot(...sub(q, p)) * .55, .055 - u * .02], baseDir(d), 'cola', 8); p = q;
  }
  for (let k = 0; k < 9; k++) { const d = norm([-1 + (R() - .5) * .6, (R() - .3) * 1.2, (R() - .5) * 1.2]); E(add(p, mul(d, .05)), [.035, .09, .035], baseDir(d), 'borla', 6); }
  return P;
}

function leonColorHD(p, part, u) {
  const n1 = vnoise3(p[0] * 6 + 5, p[1] * 6, p[2] * 6), n2 = vnoise3(p[0] * 28, p[1] * 9, p[2] * 28), fur = .88 + .16 * n1 + .1 * n2;
  const tostado = [196, 138, 70], claro = [232, 207, 162], crema = [242, 230, 206];
  const g = v => v.map(x => x * fur);
  switch (part) {
    case 'nariz': return u[1] < -.25 ? [38, 24, 22] : [128, 66, 58];
    case 'boca': case 'parpado': return [34, 24, 18];
    case 'ojo': return [212, 158, 46];
    case 'pupila': return [12, 8, 6];
    case 'oreja': return u[0] > .1 ? [214, 186, 146] : [66, 44, 28];
    case 'borla': return [50, 32, 20].map(x => x * (.85 + .3 * n2));
    case 'mecha': case 'melena': { const k = clamp((u[1] + 1) / 2), dark = [70, 38, 16], light = [178, 112, 48]; return [0, 1, 2].map(i => mix(dark[i], light[i], k * .8 + .2 * n1) * (.85 + .3 * n2)); }
    case 'hocico': case 'barbilla': return g(crema);
    case 'bigotera': return (vnoise3(p[0] * 90, p[1] * 90, p[2] * 90) > .78 && u[1] > -.3) ? [70, 48, 36] : g(crema);
    case 'zarpa': case 'dedo': return g([222, 192, 144]);
    case 'puente': case 'frente': return g([186, 124, 60]);
    case 'vientre': return g(claro);
  }
  if (part === 'pata') { const kk = .55 + .45 * smooth(.05, .75, p[1]); return g([0, 1, 2].map(i => mix(claro[i], tostado[i], kk))); }
  const k = smooth(.62, .98, p[1]);
  return g([0, 1, 2].map(i => mix(claro[i], tostado[i], k)));
}

// o: { pos, rot, esc, t, lat, lon, resMecha, jit, mechas }
function leonMallaHD(F, o = {}) {
  const P = leonPartesHD(o.t ?? (globalThis.T_ANIM ? .2 + globalThis.T_ANIM * .9 : .2), o), pos = o.pos || [0, 0, 0], esc = o.esc || 1;
  const W = q => add(pos, mul(rotY(q, o.rot || 0), esc));
  for (const q of P) {
    const r = q.res || (q.part === 'mecha' ? (o.resMecha || 7) : null), lat = r ? Math.max(3, Math.round(r * .7)) : (o.lat || 12), lon = r || (o.lon || 18);
    const tmp = []; sphere(tmp, [0, 0, 0], 1, lat, lon, () => [0, 0, 0]);
    for (const f of tmp) {
      const uc = centroid(f.p), loc = f.p.map(v => add(q.c, aplicaB(q.B, [v[0] * q.s[0], v[1] * q.s[1], v[2] * q.s[2]])));
      let col = leonColorHD(centroid(loc), q.part, uc);
      if (o.jit) col = jit(col, 1 - o.jit / 2 + o.jit * hash3(Math.round(loc[0] * 60), Math.round(loc[1] * 60), Math.round(loc[2] * 60)));
      f.col = col; f.p = loc.map(W); f.part = q.part; F.push(f);
    }
  }
  return P;
}
function leonDentroHD(x, y, z, P) {
  for (const q of P) { const d = invB(q.B, [x - q.c[0], y - q.c[1], z - q.c[2]]); const v = [d[0] / q.s[0], d[1] / q.s[1], d[2] / q.s[2]]; if (v[0] * v[0] + v[1] * v[1] + v[2] * v[2] <= 1) return [q.part, v]; }
  return null;
}
function leonPuntosHD(n, o = {}, R = rng(5)) {
  const P = leonPartesHD(o.t ?? .2, o), pos = o.pos || [0, 0, 0], esc = o.esc || 1, out = [];
  const area = P.map(q => q.s[0] * q.s[1] + q.s[1] * q.s[2] + q.s[0] * q.s[2]), tot = area.reduce((a, b) => a + b, 0);
  P.forEach((q, i) => { const k = Math.round(n * area[i] / tot);
    for (let j = 0; j < k; j++) { const uu = R() * 2 - 1, th = R() * 6.283, r = Math.sqrt(1 - uu * uu), dir = [r * Math.cos(th), uu, r * Math.sin(th)];
      const loc = add(q.c, aplicaB(q.B, [dir[0] * q.s[0], dir[1] * q.s[1], dir[2] * q.s[2]])), nrm = norm(aplicaB(q.B, [dir[0] / q.s[0], dir[1] / q.s[1], dir[2] / q.s[2]]));
      out.push({ p: add(pos, mul(rotY(loc, o.rot || 0), esc)), n: rotY(nrm, o.rot || 0), col: leonColorHD(loc, q.part, dir) }); } });
  return out;
}

// ---------- entorno ----------
function tubo(F, a, b, r1, r2, seg, col) {
  const d = norm(sub(b, a)), B = baseDir(d), ring = (c, r, k) => { const an = k / seg * 6.283; return add(c, add(mul(B[0], Math.cos(an) * r), mul(B[2], Math.sin(an) * r))); };
  const fs = []; for (let k = 0; k < seg; k++) fs.push({ p: [ring(a, r1, k), ring(a, r1, k + 1), ring(b, r2, k + 1), ring(b, r2, k)], col: typeof col === 'function' ? col(k) : col });
  orientTo(fs, mul(add(a, b), .5)); F.push(...fs);
}
function acaciaHD(F, x, z, s = 1, R = rng(x * 13 + z * 7 | 0), o = {}) {
  const tr = o.tronco || [92, 68, 50], seg = o.seg || 7, base = [x, 0, z], fork = [x + .15 * s, 1.35 * s, z + .05 * s];
  const corteza = k => jit(tr, .85 + .3 * hash3(k, x * 10 | 0, z * 10 | 0));
  tubo(F, base, fork, .12 * s, .085 * s, seg, corteza);
  const ramas = o.ramas || 5, top = [];
  for (let i = 0; i < ramas; i++) { const an = i / ramas * 6.283 + R(), ext = (.7 + R() * .6) * s, e = [fork[0] + Math.cos(an) * ext, fork[1] + (.55 + R() * .25) * s, fork[2] + Math.sin(an) * ext * .8];
    tubo(F, fork, e, .06 * s, .03 * s, Math.max(4, seg - 2), corteza); top.push(e);
    const sub2 = [e[0] + Math.cos(an + .6) * .4 * s, e[1] + .2 * s, e[2] + Math.sin(an + .6) * .3 * s]; tubo(F, e, sub2, .03 * s, .015 * s, 4, corteza); top.push(sub2); }
  const verdes = (o.copas || [[96, 120, 52], [112, 138, 60], [84, 106, 46], [126, 146, 70]]);
  const nC = o.clumps || 26, cy = fork[1] + .85 * s;
  for (let i = 0; i < nC; i++) { const r = Math.sqrt(R()) * 1.9 * s, an = R() * 6.283, c = [fork[0] + Math.cos(an) * r, cy + (R() - .5) * .18 * s - r * r * .04, fork[2] + Math.sin(an) * r * .8];
    const col = verdes[R() * verdes.length | 0];
    sphere(F, c, 1, o.latC || 4, o.lonC || 7, (p, a, b) => jit(col, (p[1] < c[1] ? .72 : 1) * (.9 + .2 * hash3(a, b, i))), { scale: [(.45 + R() * .3) * s, (.13 + R() * .06) * s, (.4 + R() * .25) * s] }); }
}
function roca(F, c, r, R = rng(c[0] * 31 | 0), o = {}) {
  const col = o.col || [128, 116, 102], k = R() * 10;
  sphere(F, c, r, o.lat || 7, o.lon || 10, (p, a, b) => jit(col, .85 + .3 * vnoise3(p[0] * 3 + k, p[1] * 3, p[2] * 3)), { scale: [1.2, .7, 1], disp: d => .8 + .35 * vnoise3(d[0] * 2.5 + k, d[1] * 2.5, d[2] * 2.5) });
}
function termitero(F, x, z, s = 1) {
  const prof = [[0, 2.2 * s], [.12 * s, 2.0 * s], [.22 * s, 1.4 * s], [.38 * s, .7 * s], [.6 * s, .15 * s], [.7 * s, 0], [0, 0]];
  lathe(F, prof, 10, (y, a) => jit([168, 98, 60], .85 + .3 * vnoise3(a * 2, y * 3, x)), [x, .8 * s, z], x, z, p => [p[0] + Math.sin(p[1] * 3) * .05 * s, p[1], p[2]]);
  lathe(F, [[0, 1.5 * s], [.1 * s, 1.35 * s], [.2 * s, .7 * s], [0, .7 * s]], 8, () => [158, 92, 56], [x + .45 * s, 1.0 * s, z], x + .45 * s, z);
}
function hierba(F, R, n, area, hf, o = {}) {
  const cols = o.cols || [[214, 178, 92], [196, 160, 80], [226, 196, 120], [176, 146, 74], [160, 150, 80]];
  for (let i = 0; i < n; i++) {
    const x = area[0] + R() * (area[1] - area[0]), z = area[2] + R() * (area[3] - area[2]); if (o.evita && o.evita(x, z)) continue;
    const y = hf(x, z), h = (o.h || .45) * (.5 + R()), an = R() * 6.283, w = (o.w || .025) * (.7 + R() * .6), lean = (R() - .3) * .5;
    const tip = [x + Math.cos(an) * lean * h, y + h, z + Math.sin(an) * lean * h], px = Math.cos(an + 1.57) * w, pz = Math.sin(an + 1.57) * w;
    F.push(tri([x - px, y, z - pz], [x + px, y, z + pz], tip, jit(cols[R() * cols.length | 0], .85 + .3 * R()), { two: true }));
  }
}
const hSabHD = (x, z) => .14 * Math.sin(x * .35 + 1) * Math.cos(z * .3) + .07 * Math.sin(x * .9 + z * .7) + .03 * vnoise3(x * 2, z * 2, 7);
function sueloHD(F, x0, x1, z0, z1, st, hf, R) {
  for (let x = x0; x < x1; x += st) for (let z = z0; z < z1; z += st) {
    const j = (a, b) => [(hash3(a * 100 | 0, b * 100 | 0, 3) - .5) * st * .4, (hash3(a * 100 | 0, b * 100 | 0, 4) - .5) * st * .4];
    const P = (a, b) => { const q = j(a, b), xx = a + q[0], zz = b + q[1]; return [xx, hf(xx, zz), zz]; };
    const a = P(x, z), b = P(x, z + st), c = P(x + st, z), d = P(x + st, z + st);
    const col = (xx, zz) => { const f = vnoise3(xx * .4, zz * .4, 2), g2 = vnoise3(xx * 2.5, zz * 2.5, 5); const base = f > .62 ? [150, 128, 78] : [204, 168, 92]; return jit(base, .82 + .22 * g2 + .08 * R()); };
    F.push(tri(a, b, c, col(x, z)), tri(c, b, d, col(x + st * .6, z + st * .6)));
  }
}
function cieloSabana(ctx, w, h, hz, o = {}) {
  ctx.fillStyle = lin(ctx, 0, 0, 0, hz, o.stops || [['#3a6ea8', 0], ['#7fb0d8', .45], ['#f2cf96', .85], ['#ffb46a', 1]]); ctx.fillRect(0, 0, w, hz + 2);
  const sx = (o.sol || [.72, -.18])[0] * w, sy = hz + (o.sol || [.72, -.18])[1] * h;
  const gr = ctx.createRadialGradient(sx, sy, 4, sx, sy, w * .55); gr.addColorStop(0, 'rgba(255,236,190,.95)'); gr.addColorStop(.12, 'rgba(255,214,150,.55)'); gr.addColorStop(1, 'rgba(255,190,120,0)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, w, hz + 2);
  ctx.fillStyle = '#fff6e0'; ctx.beginPath(); ctx.arc(sx, sy, w * .055, 0, 7); ctx.fill();
  const R = rng(o.semilla || 9);
  for (let i = 0; i < (o.nubes ?? 7); i++) { const cx = R() * w, cy = hz * (.12 + R() * .5), s = w * (.06 + R() * .08);
    for (let k = 0; k < 9; k++) { const x = cx + (R() - .5) * s * 3, y = cy + (R() - .5) * s * .5, r = s * (.35 + R() * .5); const g = ctx.createRadialGradient(x, y - r * .3, 1, x, y, r); g.addColorStop(0, 'rgba(255,248,236,.85)'); g.addColorStop(.7, 'rgba(250,226,200,.55)'); g.addColorStop(1, 'rgba(240,200,170,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); } }
  const capas = o.colinas || [['#b49aa0', .05, .03], ['#a88a7c', .03, .02]];
  capas.forEach(([col, amp, base], i) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, hz + 2); for (let x = 0; x <= w; x += 4) ctx.lineTo(x, hz - h * (base + amp * (.5 + .5 * Math.sin(x / w * 6 + i * 2)) * (.6 + .4 * vnoise3(x / w * 8, i, 1)))); ctx.lineTo(w, hz + 2); ctx.fill(); });
  if (o.siluetas !== false) { ctx.fillStyle = o.silCol || 'rgba(96,78,70,.8)'; for (let i = 0; i < 6; i++) { const x = R() * w, s = (.4 + R() * .6) * w / 1080; ctx.fillRect(x - 3 * s, hz - 40 * s, 6 * s, 40 * s); ctx.beginPath(); ctx.ellipse(x, hz - 44 * s, 70 * s, 12 * s, 0, 0, 7); ctx.fill(); } }
  if (o.aves !== false) { ctx.strokeStyle = 'rgba(50,40,40,.8)'; ctx.lineWidth = Math.max(1, w / 400); for (let i = 0; i < 7; i++) { const x = w * (.15 + R() * .5), y = hz * (.25 + R() * .3), s = w / 90 * (.6 + R() * .5); ctx.beginPath(); ctx.moveTo(x - s, y); ctx.quadraticCurveTo(x - s * .4, y - s * .6, x, y); ctx.quadraticCurveTo(x + s * .4, y - s * .6, x + s, y); ctx.stroke(); } }
}
