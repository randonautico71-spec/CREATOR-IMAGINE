'use strict';
// PERSONA DETALLADA (≈250 piezas: elipsoides orientados). x = delante, y = arriba, z = lado (+z = derecha del sujeto).
const BI = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
function baseDir(d) { d = norm(d); const a = Math.abs(d[1]) < .92 ? [0, 1, 0] : [1, 0, 0]; const u = norm(cross(a, d)), v = cross(d, u); return [u, d, v]; }
const aplicaB = (B, p) => [B[0][0] * p[0] + B[1][0] * p[1] + B[2][0] * p[2], B[0][1] * p[0] + B[1][1] * p[1] + B[2][1] * p[2], B[0][2] * p[0] + B[1][2] * p[1] + B[2][2] * p[2]];
const invB = (B, p) => [dot(B[0], p), dot(B[1], p), dot(B[2], p)];
function fib(i, n) { const y = 1 - (i + .5) / n * 2, r = Math.sqrt(1 - y * y), th = i * 2.39996; return [r * Math.cos(th), y, r * Math.sin(th)]; }
const PERSONA = { piel: [214, 164, 128], pelo: [52, 34, 22], iris: [92, 120, 64], labio: [178, 106, 96], camisa: [64, 104, 150], pantalon: [44, 50, 66], zapato: [236, 236, 232], suela: [70, 70, 74], cinturon: [70, 44, 28] };
function personaHD(t = .15, o = {}) {
  const P = [], E = (c, s, B, part, grupo, extra) => P.push({ c, s, B: B || BI, part, grupo, ...(extra || {}) }), C = PERSONA;
  const ph = 2 * Math.PI * t, bob = Math.abs(Math.cos(ph)) * .012, Y = y => y + bob, seg = (a, b, r1, r2, part, grupo) => { const d = sub(b, a), L = Math.hypot(...d), B = baseDir(d); E(mul(add(a, b), .5), [r1, L / 2 + Math.min(r1, r2) * .3, r2], B, part, grupo); };
  // --- piernas ---
  for (const sd of [-1, 1]) {
    const g = sd > 0 ? 'piernaD' : 'piernaI', f = ph + (sd > 0 ? 0 : Math.PI), a = Math.sin(f) * .38, kb = Math.max(0, -Math.cos(f)) * .55 + .05;
    const hip = [0, Y(.93), sd * .095], L1 = .43, L2 = .43, knee = [hip[0] + Math.sin(a) * L1, hip[1] - Math.cos(a) * L1, hip[2] - sd * .012];
    const a2 = a - kb, ank = [knee[0] + Math.sin(a2) * L2, knee[1] - Math.cos(a2) * L2, knee[2]];
    seg(hip, knee, .082, .078, 'pantalon', g); E(knee, [.06, .065, .062], 0, 'pantalon', g); seg(knee, ank, .058, .055, 'pantalon', g);
    E(add(ank, [0, .045, 0]), [.06, .05, .058], 0, 'pantalon', g);   // bajo del pantalón
    const pie = [ank[0] + .045, ank[1] - .045, ank[2]], fa = Math.max(-.35, Math.min(.35, a2 * .6));
    const Bp = [rotZ([1, 0, 0], fa), rotZ([0, 1, 0], fa), [0, 0, 1]], P2 = v => add(pie, aplicaB(Bp, v));
    E(P2([0, -.022, 0]), [.135, .022, .052], Bp, 'suela', g); E(P2([-.005, .015, 0]), [.12, .035, .047], Bp, 'zapato', g); E(P2([.085, .0, 0]), [.05, .028, .045], Bp, 'zapato', g);
    E(P2([-.11, .02, 0]), [.035, .045, .045], Bp, 'zapato', g);
    for (let k = 0; k < 4; k++) E(P2([.02 + k * .018, .048 - k * .008, 0]), [.005, .003, .025], Bp, 'cordon', g, { res: 4 });
  }
  // --- tronco ---
  E([0, Y(.98), 0], [.125, .11, .17], 0, 'pantalon', 'tronco');
  E([.005, Y(1.035), 0], [.128, .02, .168], 0, 'cinturon', 'tronco'); E([.13, Y(1.035), 0], [.008, .016, .022], 0, 'hebilla', 'tronco', { res: 5 });
  E([.01, Y(1.13), 0], [.115, .11, .158], 0, 'camisa', 'tronco'); E([.03, Y(1.3), 0], [.125, .15, .178], 0, 'camisa', 'tronco');
  for (const sd of [-1, 1]) { E([.075, Y(1.33), sd * .07], [.065, .07, .075], 0, 'camisa', 'tronco'); E([-.015, Y(1.43), sd * .19], [.062, .062, .066], 0, 'camisa', 'tronco'); }
  E([-.03, Y(1.45), 0], [.06, .04, .13], 0, 'camisa', 'tronco');
  for (let k = 0; k < 5; k++) E([.138 + (k < 2 ? .01 : 0) - (k > 3 ? .02 : 0), Y(1.18 + k * .065), 0], [.004, .007, .007], 0, 'boton', 'tronco', { res: 5 });
  for (const sd of [-1, 1]) { E([.045, Y(1.492), sd * .038], [.026, .009, .036], bZ(-.45), 'cuello_camisa', 'tronco'); E([-.03, Y(1.5), sd * .03], [.03, .012, .03], 0, 'cuello_camisa', 'tronco'); }
  E([.01, Y(1.53), 0], [.054, .07, .055], 0, 'piel', 'cabeza');
  // --- brazos y manos ---
  for (const sd of [-1, 1]) {
    const g = sd > 0 ? 'brazoD' : 'brazoI', f = ph + (sd > 0 ? Math.PI : 0), a = Math.sin(f) * .35, sh = [-.01, Y(1.42), sd * .2];
    const el = [sh[0] + Math.sin(a) * .29, sh[1] - Math.cos(a) * .29, sh[2] + sd * .03], a2 = a + .25 + Math.max(0, a) * .5, wr = [el[0] + Math.sin(a2) * .26, el[1] - Math.cos(a2) * .26, el[2] + sd * .01];
    seg(sh, el, .048, .046, 'piel', g); E(add(sh, mul(sub(el, sh), .25)), [.06, .085, .062], baseDir(sub(el, sh)), 'manga', g);
    E(el, [.04, .04, .04], 0, 'piel', g); seg(el, wr, .042, .03, 'piel', g);
    const dh = norm(sub(wr, el)), Bh = baseDir(dh), H = v => add(wr, aplicaB(Bh, v));   // eje y de la mano = antebrazo; x = palma hacia el cuerpo
    E(H([0, .045, 0]), [.016, .048, .04], Bh, 'piel', g);
    for (let k = 0; k < 4; k++) { const z0 = (k - 1.5) * .019, L = [.024, .021, .018].map(v => v * (k === 0 || k === 3 ? .85 : 1)); let p = H([.002, .09, z0]), dir = norm(aplicaB(Bh, [-.18 - k * .03, 1, 0]));
      for (let j = 0; j < 3; j++) { const q = add(p, mul(dir, L[j])); seg(p, q, .0085 - j * .001, .008 - j * .001, 'piel', g); p = q; dir = norm(add(dir, aplicaB(Bh, [-.35, 0, 0]))); } }
    let p = H([.012, .03, sd * .028]), dir = norm(aplicaB(Bh, [.25, .6, sd * .7]));
    for (let j = 0; j < 2; j++) { const q = add(p, mul(dir, .028)); seg(p, q, .011, .0095, 'piel', g); p = q; dir = norm(add(dir, aplicaB(Bh, [.0, .4, -sd * .3]))); }
  }
  // --- cabeza ---
  const hc = [0, Y(1.675), 0], Hd = v => add(hc, v), cab = 'cabeza';
  if (o.sinCabeza) { P.hc = hc; }
  if (!o.sinCabeza) {
  E(Hd([-.012, .01, 0]), [.1, .114, .087], 0, 'piel', cab);
  E(Hd([.033, -.045, 0]), [.07, .08, .066], 0, 'piel', cab);
  E(Hd([.07, -.098, 0]), [.032, .026, .036], 0, 'piel', cab);
  for (const sd of [-1, 1]) { E(Hd([.064, -.022, sd * .045]), [.026, .018, .024], 0, 'piel', cab); E(Hd([.025, -.07, sd * .042]), [.04, .022, .02], 0, 'piel', cab); }
  E(Hd([.08, .02, 0]), [.016, .011, .058], 0, 'piel', cab);
  E(Hd([.093, -.008, 0]), [.013, .028, .011], bZ(-.25), 'piel', cab); E(Hd([.108, -.04, 0]), [.017, .015, .016], 0, 'piel', cab);
  for (const sd of [-1, 1]) E(Hd([.1, -.047, sd * .012]), [.011, .008, .009], 0, 'aleta', cab, { res: 6 });
  E(Hd([.104, -.05, 0]), [.004, .003, .012], 0, 'fosa', cab, { res: 4 });
  for (const sd of [-1, 1]) {
    E(Hd([.079, .002, sd * .033]), [.0125, .0125, .0125], 0, 'esclera', cab, { res: 8 });
    E(Hd([.0905, .002, sd * .033]), [.0025, .0062, .0062], 0, 'iris', cab, { res: 6 }); E(Hd([.0925, .002, sd * .033]), [.0012, .003, .003], 0, 'pupila', cab, { res: 5 });
    E(Hd([.081, .0115, sd * .033]), [.0105, .0035, .0135], 0, 'parpado', cab, { res: 6 }); E(Hd([.081, -.0085, sd * .033]), [.0095, .0025, .0125], 0, 'parpado', cab, { res: 6 });
    E(Hd([.089, .024, sd * .034]), [.004, .0028, .019], bZ(sd * 0), 'ceja', cab, { res: 5 });
    E(Hd([-.005, -.012, sd * .089]), [.017, .03, .009], 0, 'oreja', cab, { res: 6 }); E(Hd([-.003, -.015, sd * .095]), [.008, .015, .004], 0, 'oreja_in', cab, { res: 5 });
  }
  E(Hd([.095, -.073, 0]), [.009, .0045, .02], 0, 'labio', cab, { res: 6 }); E(Hd([.092, -.081, 0]), [.009, .0055, .018], 0, 'labio', cab, { res: 6 });
  }
  // pelo: casquete + mechones peinados hacia atrás y al lado
  E(Hd([-.026, .036, 0]), [.1, .094, .086], 0, 'pelo', 'pelo');
  const R = rng(7), nM = o.mechones ?? 120;
  for (let i = 0; i < nM; i++) { const n = fib(i, nM * 1.6); if (n[1] < -.05 || (n[0] > .45 && n[1] < .65)) continue;
    const c = Hd([-.026 + n[0] * .096, .036 + n[1] * .09, n[2] * .085]), d = norm([-.5 + n[0] * .2, -.25 + R() * .1, n[2] * .6 + (R() - .5) * .3]), L = .035 + R() * .025;
    E(add(c, mul(d, L * .4)), [.018 + R() * .006, L, .009], baseDir(d), 'pelo', 'pelo', { res: o.resMechon || 6 }); }
  return P;
}
function bZ(a) { return [rotZ([1, 0, 0], a), rotZ([0, 1, 0], a), [0, 0, 1]]; }
function colorPersona(p, part, u) {
  const C = PERSONA, n = vnoise3(p[0] * 300, p[1] * 300, p[2] * 300), n2 = vnoise3(p[0] * 40, p[1] * 40, p[2] * 40);
  switch (part) {
    case 'piel': case 'aleta': return C.piel.map((v, k) => v * (.94 + .08 * n2) + (k === 0 ? 6 * n : 0));
    case 'oreja': return C.piel.map((v, k) => v * .95 + (k === 0 ? 8 : 0)); case 'oreja_in': return C.piel.map(v => v * .78);
    case 'fosa': case 'comisura': return [70, 40, 34]; case 'labio': return C.labio; case 'esclera': return [238, 236, 230]; case 'iris': return C.iris; case 'pupila': return [10, 8, 8];
    case 'parpado': return C.piel.map(v => v * .9); case 'ceja': return C.pelo.map(v => v * .9);
    case 'pelo': return C.pelo.map(v => v * (.8 + .4 * vnoise3(p[0] * 30, p[1] * 120, p[2] * 30)));
    case 'camisa': case 'manga': case 'cuello_camisa': { const tram = ((Math.floor(p[1] * 400) + Math.floor(p[2] * 400)) & 1) ? .97 : 1.03; return C.camisa.map(v => v * tram * (.9 + .14 * n2)); }
    case 'boton': return [235, 232, 220]; case 'hebilla': return [190, 176, 120]; case 'cinturon': return C.cinturon;
    case 'pantalon': return C.pantalon.map(v => v * (.9 + .16 * n2) * (.95 + .1 * n));
    case 'zapato': return C.zapato.map(v => v * (.94 + .06 * n2)); case 'suela': return C.suela; case 'cordon': return [250, 250, 250];
  }
  return [200, 0, 200];
}
// o: { pos, rot, t, lat, lon }
function personaMallaHD(F, o = {}) {
  const P = personaHD(o.t ?? .15, o), pos = o.pos || [0, 0, 0], W = q => add(pos, rotY(q, o.rot || 0));
  for (const q of P) { const r = q.res || null, lat = r ? Math.max(3, Math.round(r * .7)) : (o.lat || 12), lon = r ? r + 2 : (o.lon || 16);
    const tmp = []; sphere(tmp, [0, 0, 0], 1, lat, lon, () => [0, 0, 0]);
    for (const f of tmp) { const uc = centroid(f.p), loc = f.p.map(v => add(q.c, aplicaB(q.B, [v[0] * q.s[0], v[1] * q.s[1], v[2] * q.s[2]])));
      f.col = colorPersona(centroid(loc), q.part, uc); if (o.jit) f.col = jit(f.col, 1 - o.jit / 2 + o.jit * hash3(Math.round(loc[0] * 500), Math.round(loc[1] * 500), 3));
      f.p = loc.map(W); f.part = q.part; f.zb = q.s[0] < .02 ? -.004 : 0; F.push(f); } }
  return P;
}
function personaDentroHD(x, y, z, P) { let best = null, bd = 9; for (const q of P) { const d = invB(q.B, [x - q.c[0], y - q.c[1], z - q.c[2]]), v = (d[0] / q.s[0]) ** 2 + (d[1] / q.s[1]) ** 2 + (d[2] / q.s[2]) ** 2; if (v <= 1 && Math.max(...q.s) < bd) { bd = Math.max(...q.s); best = q; } } return best; }
function muestrea(F, dens, R) { const out = []; for (const f of F) { const p = f.p, n = newell(p); for (let t = 1; t < p.length - 1; t++) { const a = p[0], b = p[t], c = p[t + 1], ar = Math.hypot(...cross(sub(b, a), sub(c, a))) / 2, k = ar * dens + R(); for (let j = 0; j < Math.floor(k); j++) { let u = R(), v = R(); if (u + v > 1) { u = 1 - u; v = 1 - v; } out.push({ p: add(a, add(mul(sub(b, a), u), mul(sub(c, a), v))), n, col: f.col }); } } } return out; }
const CAMP = (w, h, o = {}) => camera(o.eye || [2.3, 1.3, 3.0], o.target || [0, .93, 0], { fov: o.fov || 36, w, h, ortho: o.ortho, cy: o.cy });
const SOLP = norm([.6, .75, .5]), LUZP = { light: SOLP, amb: .38, lightCol: [1.15, 1.05, .95], ambCol: [.75, .82, 1.0] };
