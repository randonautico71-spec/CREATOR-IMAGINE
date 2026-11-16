'use strict';
// BALLENA JOROBADA y TIBURÓN BLANCO como volúmenes SDF (Node). Coordenadas locales: x = hacia delante (cabeza), y = arriba, z = lateral.
// Se usan para: malla por surface nets (estilos de malla), vóxeles y la escena realista.
const sdEll = (x, y, z, a, b, c) => { const k0 = Math.hypot(x / a, y / b, z / c), k1 = Math.hypot(x / (a * a), y / (b * b), z / (c * c)) + 1e-12; return k0 * (k0 - 1) / k1; };
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * .25; };
const smax = (a, b, k) => -smin(-a, -b, k);
const fract = x => x - Math.floor(x), h3 = (x, y, z) => fract(Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453);
function n3(x, y, z) { const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z); let fx = x - ix, fy = y - iy, fz = z - iz; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz); const m = (a, b, t) => a + (b - a) * t;
  return m(m(m(h3(ix, iy, iz), h3(ix + 1, iy, iz), fx), m(h3(ix, iy + 1, iz), h3(ix + 1, iy + 1, iz), fx), fy), m(m(h3(ix, iy, iz + 1), h3(ix + 1, iy, iz + 1), fx), m(h3(ix, iy + 1, iz + 1), h3(ix + 1, iy + 1, iz + 1), fx), fy), fz); }
function sdRC(px, py, pz, ax, ay, az, bx, by, bz, r1, r2) { const bax = bx - ax, bay = by - ay, baz = bz - az, l2 = bax * bax + bay * bay + baz * baz, rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2, pax = px - ax, pay = py - ay, paz = pz - az, y = pax * bax + pay * bay + paz * baz, z = y - l2, qx = pax * l2 - bax * y, qy = pay * l2 - bay * y, qz = paz * l2 - baz * y, x2 = qx * qx + qy * qy + qz * qz, y2 = y * y * l2, z2 = z * z * l2, k = Math.sign(rr) * rr * rr * x2; if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2; if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1; return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1; }
// triángulo 2D (plano xy) extruido en z con grosor t y bordes redondeados
function sdTri2(px, py, a, b, c) { const e0 = [b[0] - a[0], b[1] - a[1]], e1 = [c[0] - b[0], c[1] - b[1]], e2 = [a[0] - c[0], a[1] - c[1]], v0 = [px - a[0], py - a[1]], v1 = [px - b[0], py - b[1]], v2 = [px - c[0], py - c[1]];
  const cl = (v, e) => { const h = Math.max(0, Math.min(1, (v[0] * e[0] + v[1] * e[1]) / (e[0] * e[0] + e[1] * e[1]))); return [v[0] - e[0] * h, v[1] - e[1] * h]; }, pq0 = cl(v0, e0), pq1 = cl(v1, e1), pq2 = cl(v2, e2), s = Math.sign(e0[0] * e2[1] - e0[1] * e2[0]);
  const d0 = [pq0[0] ** 2 + pq0[1] ** 2, s * (v0[0] * e0[1] - v0[1] * e0[0])], d1 = [pq1[0] ** 2 + pq1[1] ** 2, s * (v1[0] * e1[1] - v1[1] * e1[0])], d2 = [pq2[0] ** 2 + pq2[1] ** 2, s * (v2[0] * e2[1] - v2[1] * e2[0])];
  const dd = Math.min(d0[0], d1[0], d2[0]), sg = Math.min(d0[1], d1[1], d2[1]); return -Math.sqrt(dd) * Math.sign(sg); }
const aleta = (u, v, w, a, b, c, t) => { const d2 = sdTri2(u, v, a, b, c); return Math.hypot(Math.max(d2, 0), Math.max(Math.abs(w) - t, 0)) + Math.min(Math.max(d2, Math.abs(w) - t), 0) - t * .4; };

// ---------- BALLENA JOROBADA (≈13 m) ----------
function ballena(x, y, z, fase = 0, tag) {
  const az = Math.abs(z), curva = .32 * Math.sin(x * .32 + fase) * Math.min(1, (6.5 - x) / 6), yb = y - curva;   // ondulación de nado
  let d = sdEll(x - 4.3, yb + .15, z, 2.4, 1.25, 1.35);                       // cabeza
  d = smin(d, sdEll(x - 1.8, yb, z, 2.9, 1.6, 1.7), .9);                      // tórax
  d = smin(d, sdEll(x + .9, yb + .05, z, 2.8, 1.45, 1.5), .9);                // abdomen
  d = smin(d, sdEll(x + 3.4, yb + .05, z, 2.2, .95, .9), .8);                 // grupa
  d = smin(d, sdEll(x + 5.3, yb, z, 1.4, .5, .32), .6);                       // pedúnculo (comprimido)
  d = smin(d, sdEll(x - 3.2, yb + .75, z, 2.9, .75, 1.25), .7);               // garganta
  d = smin(d, sdEll(x - 6.2, yb + .25, z, .55, .45, .55), .5);                // morro
  if (yb < -.6 && x > -.5 && x < 5.8) d += .025 * Math.max(0, Math.sin(az * 26)) * Math.min(1, (-.6 - yb) * 2);   // pliegues ventrales
  if (yb > .3 && x > 3.0 && x < 6.6 && d < .2) { const cx = Math.round((x - 3.2) / .45), cz = Math.round(z / .38); if (h3(cx, cz, 2) > .4 && Math.abs(cz) < 3) { const tb = Math.hypot(x - 3.2 - cx * .45, z - cz * .38); d -= .07 * Math.max(0, 1 - tb / .11) ** 2; } }   // tubérculos
  // aletas pectorales largas (≈4 m), hacia abajo, atrás y afuera, con borde ondulado
  { const px = x - 2.6, py = yb + .7, pz = az - 1.3, u = px * .8 - py * .3 + .0, ang = -.28, ry = py * Math.cos(ang) - pz * Math.sin(ang), rz = py * Math.sin(ang) + pz * Math.cos(ang);
    const lx = -px * .9 + .2, lz = rz; const L = 4.2, t = Math.max(0, Math.min(1, lz / L)), ancho = .62 * (1 - t * .5) + .035 * Math.sin(lz * 9) * (lz > 0 ? 1 : 0);
    const da = Math.max(Math.hypot(Math.max(Math.abs(px + lz * .55) - ancho, 0), Math.max(Math.abs(ry) - .09 * (1 - t * .6), 0)) - .04, -lz, lz - L);
    d = smin(d, da, .35); }
  // aleta dorsal pequeña con joroba
  d = smin(d, aleta(x + 2.6, yb - 1.25, z, [-1.0, -.4], [.9, -.4], [-.6, .45], .08), .35);
  // aletas caudales (≈4,5 m de envergadura) con borde de fuga dentado
  { const tx = x + 6.3, ty = yb; const ser = .07 * Math.sin(az * 14) * (tx < -.3 ? 1 : 0);
    const df = aleta(tx, az, ty, [.6, 0], [-1.3, 2.3 + ser], [-.4, 0], .07); d = smin(d, df, .3); }
  // ojo y boca
  const eye = Math.hypot(x - 3.3, yb + .1, az - 1.17) - .085;
  d = smax(d, -sdEll(x - 4.5, yb + .12, az - 1.12, 2.4, .035, .3), .04);    // línea de la boca
  d = Math.min(d, eye);
  // percebes: bultitos en mentón y aletas
  if (tag) { let t = 'piel'; if (eye < .015) t = 'ojo'; return [d, t, yb, curva]; }
  return d;
}
function colorBallena(x, y, z, t, yb) {
  const az = Math.abs(z), m = n3(x * 1.3, y * 1.3, z * 1.3), m2 = n3(x * 6, y * 6, z * 6);
  if (t === 'ojo') return [.03, .03, .035];
  const oscuro = [.11, .12, .14].map(v => v * (.85 + .3 * m2));
  let blanco = (yb < -.35 + (m - .5) * .8 && x > -4.5) ? 1 : 0;
  const enAleta = az > 1.45 && x > -1.8 && x < 3.4 && yb < .2; if (enAleta) blanco = (yb < -.9 || m > .45) ? 1 : .6;
  if (x < -5.2 && yb < 0) blanco = m > .55 ? 1 : 0;
  let c = blanco ? [.82, .83, .8].map(v => v * (.85 + .2 * m2)) : oscuro;
  if (yb < -.6 && x > -.5 && x < 5.8 && Math.sin(az * 26) > .4) c = c.map(v => v * .75);
  const perc = n3(x * 9, y * 9, z * 9); if ((x > 5.6 || enAleta) && perc > .72) c = [.7, .68, .6].map(v => v * (.7 + .5 * m2));
  if (yb > .45 && x > 3.2) { const cx = Math.round((x - 3.2) / .45), cz = Math.round(z / .38); if (Math.hypot(x - 3.2 - cx * .45, z - cz * .38) < .12 && h3(cx, cz, 2) > .45) c = c.map(v => v * 1.35); }
  const cicat = n3(x * 3, y * 14, z * 3); if (!blanco && cicat > .82) c = c.map(v => v + .15);
  return c;
}
// ---------- TIBURÓN BLANCO (≈4,5 m) ----------
function tiburon(x, y, z, fase = 0, tag) {
  const az = Math.abs(z), curva = .12 * Math.sin(x * 1.1 + fase) * Math.min(1, (1.8 - x) / 2.5), zb = z - curva;
  let d = sdRC(x, y, zb, 1.55, .02, 0, 2.25, -.02, 0, .36, .05);            // morro cónico
  d = smin(d, sdEll(x - 1.0, y, zb, .9, .44, .42), .25);
  d = smin(d, sdEll(x - .05, y + .01, zb, 1.05, .5, .47), .3);
  d = smin(d, sdEll(x + 1.0, y, zb, .85, .34, .3), .3);
  d = smin(d, sdEll(x + 1.75, y, zb, .55, .16, .12), .2);                    // pedúnculo
  d = smin(d, sdEll(x + 1.9, y, zb, .22, .09, .17), .1);                     // quilla lateral
  const azb = Math.abs(zb);
  // aletas pectorales (grandes, hacia abajo y afuera)
  { const ang = .6, py = y + .2, pz = azb - .32, ry = py * Math.cos(ang) + pz * Math.sin(ang), rz = -py * Math.sin(ang) + pz * Math.cos(ang);
    d = smin(d, aleta(x - .55, rz, ry, [.35, 0], [-.55, .95], [-.35, 0], .028), .12); }
  d = smin(d, aleta(x - .05, y - .42, zb, [.45, 0], [-.35, .72], [-.42, 0], .035), .12);      // dorsal
  d = smin(d, aleta(x + 1.32, y - .27, zb, [.1, 0], [-.12, .14], [-.12, 0], .015), .05);       // 2.ª dorsal
  d = smin(d, aleta(x + 1.28, -(y + .26), zb, [.1, 0], [-.12, .14], [-.12, 0], .015), .05);    // anal
  d = smin(d, aleta(x + 1.15, -(y + .32), zb, [.15, 0], [-.15, .22], [-.15, 0], .016), .06);   // pélvica
  // caudal en media luna
  d = smin(d, aleta(x + 2.0, y, zb, [.12, -.02], [-.55, .95], [-.18, .02], .03), .08);
  d = smin(d, aleta(x + 2.0, -y, zb, [.12, -.02], [-.42, .72], [-.18, .02], .03), .08);
  // hendiduras branquiales (5) y boca entreabierta
  for (let k = 0; k < 5; k++) d = smax(d, -sdEll(x - (1.18 - k * .085), y + .02 + k * .01, azb - .37 + k * .012, .008, .17 - k * .01, .05), .012);
  const boca = sdEll(x - 1.75, y + .2, zb, .38, .045, .25); d = smax(d, -boca, .02);
  let dientes = 1e9; for (let k = -5; k <= 5; k++) { const a = k / 5 * 1.1, bx = 1.75 + Math.cos(a) * .3 - .05, bz = Math.sin(a) * .23; dientes = Math.min(dientes, sdRC(x, y, zb, bx, -.165, bz, bx + .01, -.215, bz, .017, .003), sdRC(x, y, zb, bx - .02, -.24, bz * .95, bx - .02, -.2, bz * .95, .015, .003)); }
  d = Math.min(d, dientes);
  const eye = Math.hypot(x - 1.62, y - .1, azb - .26) - .028; d = Math.min(d, eye);
  if (tag) { let t = 'piel'; if (eye < .006) t = 'ojo'; else if (dientes < .004) t = 'diente'; else if (boca < .02) t = 'boca'; return [d, t, zb, curva]; }
  return d;
}
function colorTiburon(x, y, z, t) {
  if (t === 'ojo') return [.01, .01, .012]; if (t === 'diente') return [.93, .92, .86]; if (t === 'boca') return [.55, .3, .3];
  const m = n3(x * 4, y * 4, z * 4), m2 = n3(x * 30, y * 30, z * 30), linea = -.06 + (m - .5) * .18 + .06 * Math.sin(x * 9);
  const gris = [.36, .39, .42].map(v => v * (.88 + .2 * m2)), blanco = [.9, .9, .88].map(v => v * (.92 + .1 * m2));
  let c = y > linea ? gris : blanco;
  if (Math.abs(y - linea) < .015) c = c.map(v => v * .8);
  if (x < -1.6 || (y > .5)) c = c.map(v => v * .85);
  if (n3(x * 8, y * 2, z * 8) > .8 && y > linea) c = c.map(v => v + .1);   // arañazos
  return c;
}
module.exports = { ballena, colorBallena, tiburon, colorTiburon, n3, h3, sdEll, smin, smax };
