'use strict';
// Versiones de alto detalle para el estilo REALISTA (SDF):
//  · ballena jorobada alimentándose: boca abierta, barbas colgando del maxilar, lengua, bolsa de la garganta dilatada con pliegues
//  · tiburón blanco con la boca abierta: encías salientes y filas de dientes triangulares, narinas, poros en el morro
// Coordenadas locales como en animales.js: x = hacia la cabeza, y = arriba, z = lateral.
const A = require('./animales'), { sdEll, smin, smax, n3, h3, sdRC, sdTri2, aleta } = A;
const cl = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;

// ---------------- BALLENA JOROBADA (≈13 m) ----------------
const GB = .62, HB = [3.0, -.32], cgB = Math.cos(GB), sgB = Math.sin(GB);   // apertura de la boca (rad) y bisagra de la mandíbula
const mlinea = x => -.32 + .3 * Math.sin(Math.PI * cl((x - 3) / 3.75));     // borde del maxilar superior (línea de la boca)
const anchoBoca = x => 1.02 * Math.sqrt(Math.max(0, 1 - ((x - 4.75) / 2.0) ** 2)) * (1 - .3 * cl((x - 4) / 2.8));
function ballenaHD(x, y, z, tag) {
  const az = Math.abs(z), curva = .3 * Math.sin(x * .32) * cl((2.5 - x) / 6), yb = y - curva;
  const dx = x - HB[0], dy = yb - HB[1], xj = HB[0] + dx * cgB - dy * sgB, yj = HB[1] + dx * sgB + dy * cgB;   // coordenadas de la mandíbula cerrada
  // tronco
  let d = sdEll(x - 1.8, yb, z, 2.9, 1.6, 1.7);
  d = smin(d, sdEll(x + .9, yb + .05, z, 2.8, 1.45, 1.5), .9);
  d = smin(d, sdEll(x + 3.4, yb + .05, z, 2.2, .95, .9), .8);
  d = smin(d, sdEll(x + 5.3, yb, z, 1.4, .5, .32), .6);
  d = smin(d, sdEll(x - 3.3, yb - .2, z, 1.4, 1.0, 1.3), .7);
  // maxilar superior: ancho y plano, se estrecha hacia la punta
  const tap = 1 - .3 * cl((x - 4) / 2.8), sup = Math.max(sdEll(x - 4.7, yb - .02, z / tap, 2.25, .6, 1.12) * Math.min(1, tap + .1), mlinea(x) - yb);
  d = smin(d, sup, .45);
  // bolsa de la garganta dilatada (sigue a la mandíbula) y mandíbula en cuenco
  const tapj = 1 - .22 * cl((xj - 4.2) / 2.6), rim = mlinea(xj) - .02;
  const bolsa = sdEll(xj - 3.2, yj + .98, z, 3.1, .86, 1.36);
  const mand = Math.max(sdEll(xj - 4.55, yj + .55, z / tapj, 2.3, .52, 1.18) * Math.min(1, tapj + .1), yj - rim);
  d = smin(d, bolsa, .9); d = smin(d, mand, .3);
  if (yj < -1.0 && xj > -.8 && xj < 6.0) d += .03 * Math.max(0, Math.sin(az * 24)) * cl((-1.0 - yj) * 2);            // pliegues ventrales
  // hueco de la boca: entre el maxilar y el borde de la mandíbula, y el interior del cuenco
  const Wc = anchoBoca(x), cav = Math.max(yb - mlinea(x) + .03, rim - .02 - yj, 3.05 - x, az - Wc + .1);
  const inner = Math.max(sdEll(xj - 4.5, yj + .5, z / tapj, 2.12, .4, 1.04), 3.05 - xj), hueco = Math.min(cav, inner);
  d = smax(d, -hueco, .06);
  const lengua = sdEll(xj - 4.0, yj + .74, z, 1.9, .2, .7); d = smin(d, lengua, .15);
  // barbas: cortina de láminas colgando a cada lado del maxilar, con flecos al final
  let barba = 1e9;
  if (x > 3.15 && x < 6.4) { const ml = mlinea(x); if (yb < ml + .05 && yb > ml - .9) { const Lb = .62 * Math.pow(Math.sin(Math.PI * cl((x - 3.15) / 3.25)), .7) + .04, Wb = Wc - .16 - (ml - yb) * .25, fr = .06 * n3(x * 70, yb * 9, az * 5);
    barba = Math.max(Math.abs(az - Wb) - .035, yb - ml - .05, ml - Lb + fr - yb) * .8; } }
  d = Math.min(d, barba);
  // tubérculos del maxilar y del mentón
  if (yb > mlinea(x) + .3 && x > 3.6 && x < 6.6 && d < .2) { const cx = Math.round((x - 3.6) / .42), cz = Math.round(z / .36); if (h3(cx, cz, 2) > .35 && Math.abs(cz) < 3) { const tb = Math.hypot(x - 3.6 - cx * .42, z - cz * .36); d -= .045 * Math.max(0, 1 - tb / .14) ** 2; } }
  if (xj > 5.7 && yj < rim - .05 && d < .2) { const cx = Math.round(xj / .3), cy = Math.round(yj / .3), cz = Math.round(z / .3); if (h3(cx, cy, cz) > .5) d -= .06 * Math.max(0, 1 - Math.hypot(xj - cx * .3, yj - cy * .3, z - cz * .3) / .1) ** 2; }
  // espiráculos con su cresta
  { const sp = Math.min(sdEll(x - 2.6, yb - 1.42, az - .13, .26, .1, .05), 1e9); d = smax(d, -sp, .04); d = smin(d, sdEll(x - 2.95, yb - 1.36, z, .12, .08, .3), .12); }
  // aletas pectorales largas (≈4 m) con borde ondulado
  { const px = x - 2.4, py = yb + .75, pz = az - 1.35, ang = -.28, ry = py * Math.cos(ang) - pz * Math.sin(ang), rz = py * Math.sin(ang) + pz * Math.cos(ang);
    const lz = rz, L = 4.2, t = cl(lz / L), ancho = .62 * (1 - t * .5) + .04 * Math.sin(lz * 9) * (lz > 0 ? 1 : 0);
    const da = Math.max(Math.hypot(Math.max(Math.abs(px + lz * .55) - ancho, 0), Math.max(Math.abs(ry) - .09 * (1 - t * .6), 0)) - .04, -lz, lz - L);
    d = smin(d, da, .35); }
  d = smin(d, aleta(x + 2.6, yb - 1.25, z, [-1.0, -.4], [.9, -.4], [-.6, .45], .08), .35);                              // dorsal
  { const tx = x + 6.3, ser = .07 * Math.sin(az * 14) * (tx < -.3 ? 1 : 0); d = smin(d, aleta(tx, az, yb, [.6, 0], [-1.3, 2.3 + ser], [-.4, 0], .07), .3); }   // cola
  const eye = Math.hypot(x - 3.3, yb - .02, az - 1.53) - .085; d = Math.min(d, eye);
  d = smin(d, sdEll(x - 3.3, yb - .02, az - 1.49, .19, .13, .08), .06);                                                    // párpados
  if (tag) { let t = 'piel'; if (eye < .015) t = 'ojo'; else if (barba < .02) t = 'barba'; else if (lengua < .03) t = 'lengua'; else if (inner < .08 || (cav < .07 && yb < mlinea(x) + .08)) t = 'boca'; return [d, t, x, x > HB[0] ? Math.min(yb, yj) : yb, yb]; }
  return d;
}
function colorBallenaHD(x, y, z, t, xe, ye, yb = ye) {
  if (t === 'ojo') return [.02, .02, .025];
  if (t === 'barba') { const f = cl((mlinea(x) - yb) / .6), r = .5 + .5 * Math.sin(x * 140); return [.1, .1, .11].map((v, k) => v * (.7 + .5 * r) + f * f * [.38, .34, .27][k]); }
  if (t === 'lengua') return [.66, .3, .32].map(v => v * (.85 + .25 * n3(x * 8, y * 8, z * 8)));
  if (t === 'boca') return [.6, .33, .34].map(v => v * (.8 + .3 * n3(x * 10, y * 10, z * 10)));
  const az = Math.abs(z), m = n3(x * 1.3, y * 1.3, z * 1.3), m2 = n3(x * 6, y * 6, z * 6), m3 = n3(x * 25, y * 25, z * 25);
  const aleta = az > 1.75 && x > -1.9 && x < 3.4 && yb < .3;
  let blanco = cl((-.3 + (m - .5) * .9 - ye) * 4); if (x < -4.5) blanco *= cl((x + 5.5) / 1); if (aleta) blanco = cl(.4 + (m - .4) * 3 + (yb < -1 ? .5 : 0));
  if (x < -5.2 && yb < 0) blanco = m > .55 ? 1 : 0;
  const oscuro = [.1, .11, .13].map(v => v * (.85 + .3 * m2)), claro = [.82, .83, .8].map(v => v * (.86 + .14 * m3));
  let c = oscuro.map((v, k) => v + (claro[k] - v) * blanco);
  if (!aleta && ye < -.9 && x > -1 && x < 6.2 && Math.sin(az * 24) > .8) c = c.map(v => v * .72);                       // surcos de los pliegues
  const perc = n3(x * 9, y * 9, z * 9); if (((x > 5.9 && ye < mlinea(x) - .1) || x > 6.3 || aleta) && perc > .78) c = [.7, .68, .6].map(v => v * (.7 + .5 * m2));   // percebes
  if (yb > mlinea(x) + .3 && x > 3.6) { const cx = Math.round((x - 3.6) / .42), cz = Math.round(z / .36); if (Math.hypot(x - 3.6 - cx * .42, z - cz * .36) < .12 && h3(cx, cz, 2) > .35) c = c.map(v => v * 1.3); }
  if (blanco < .5 && n3(x * 3, y * 14, z * 3) > .87) c = c.map(v => v + .12);                                             // cicatrices
  return c;
}
// ---------------- TIBURÓN BLANCO (≈4,5 m) con la boca abierta ----------------
const GT = .5, HT = [1.42, -.25], cgT = Math.cos(GT), sgT = Math.sin(GT);
function dienteSup(s, v, r, k) { const w = .024 * k, h = .058 * k, d2 = sdTri2(s, v, [-w, 0], [w, 0], [s * .1, -h]); return Math.hypot(Math.max(d2, 0), Math.max(Math.abs(r) - .006, 0)) + Math.min(Math.max(d2, Math.abs(r) - .006), 0); }
function dienteInf(s, v, r, k) { const w = .016 * k, h = .052 * k, d2 = sdTri2(s, v, [-w, 0], [w, 0], [0, h]); return Math.hypot(Math.max(d2, 0), Math.max(Math.abs(r) - .006, 0)) + Math.min(Math.max(d2, Math.abs(r) - .006), 0); }
function filaDientes(xr, yr, zb, y0, ax, azr, inf) {   // dientes a lo largo del arco de la mandíbula (dos filas)
  const qx = (xr - HT[0]) / ax, qz = zb / azr, q = Math.hypot(qx, qz); if (Math.abs(yr - y0) > .1 || q < .7 || q > 1.25 || qx < -.15) return 1e9;
  const a = Math.atan2(qz, qx), D = Math.PI / 24, best = []; let d = 1e9;
  for (const [fila, ro, kk] of [[0, 0, 1], [1, -.032, .72]]) { const ai = Math.round((a - fila * D / 2) / D) * D + fila * D / 2; if (Math.abs(ai) > 1.6) continue;
    const R = Math.hypot(ax * Math.sin(ai), azr * Math.cos(ai)), s = (a - ai) * R, r = (q - 1) * (ax + azr) / 2 - ro, k = kk * (1 - .45 * (Math.abs(ai) / 1.6) ** 2);
    d = Math.min(d, inf ? dienteInf(s, yr - y0, r, k) : dienteSup(s, yr - y0, r, k)); }
  return d; }
function tiburonHD(x, y, z, tag) {
  const curva = .1 * Math.sin(x * 1.1) * cl((1.4 - x) / 2.5), zb = z - curva, azb = Math.abs(zb);
  const dx = x - HT[0], dy = y - HT[1], xj = HT[0] + dx * cgT - dy * sgT, yj = HT[1] + dx * sgT + dy * cgT;
  let d = sdRC(x, y, zb, 1.5, .03, 0, 2.3, -.03, 0, .37, .035);                 // morro cónico y puntiagudo
  d = smin(d, sdEll(x - 1.0, y, zb, .92, .45, .43), .25);
  d = smin(d, sdEll(x - .05, y + .01, zb, 1.08, .52, .48), .3);
  d = smin(d, sdEll(x + 1.0, y, zb, .86, .35, .3), .3);
  d = smin(d, sdEll(x + 1.75, y, zb, .55, .16, .12), .2);
  d = smin(d, sdEll(x + 1.9, y, zb, .22, .09, .17), .1);
  { const ang = .6, py = y + .2, pz = azb - .32, ry = py * Math.cos(ang) + pz * Math.sin(ang), rz = -py * Math.sin(ang) + pz * Math.cos(ang);
    d = smin(d, aleta(x - .55, rz, ry, [.35, 0], [-.6, .98], [-.35, 0], .026), .12); }                             // pectorales falciformes
  d = smin(d, aleta(x - .05, y - .43, zb, [.45, 0], [-.38, .74], [-.42, 0], .034), .12);
  d = smin(d, aleta(x + 1.32, y - .27, zb, [.1, 0], [-.12, .14], [-.12, 0], .015), .05);
  d = smin(d, aleta(x + 1.28, -(y + .26), zb, [.1, 0], [-.12, .14], [-.12, 0], .015), .05);
  d = smin(d, aleta(x + 1.15, -(y + .32), zb, [.15, 0], [-.15, .22], [-.15, 0], .016), .06);
  d = smin(d, aleta(x + 2.0, y, zb, [.12, -.02], [-.55, .95], [-.18, .02], .03), .08);
  d = smin(d, aleta(x + 2.0, -y, zb, [.12, -.02], [-.42, .72], [-.18, .02], .03), .08);
  for (let k = 0; k < 5; k++) d = smax(d, -sdEll(x - (1.18 - k * .085), y + .02 + k * .01, azb - .37 + k * .012, .009, .19 - k * .012, .05), .012);   // 5 hendiduras
  d = smax(d, -sdEll(x - 2.02, y + .1, azb - .1, .035, .012, .025), .01);                                             // narinas
  // mandíbula inferior: placa en U que baja con la boca abierta
  const qL = Math.hypot((xj - HT[0]) / .42, zb / .29), jaw = Math.max((qL - 1) * .3, Math.abs(yj + .37) - .075, HT[0] - .25 - xj);
  d = smin(d, jaw, .06);
  // hueco de la boca y encías
  const qC = Math.hypot((x - HT[0]) / .4, zb / .26), cav = Math.max((qC - 1) * .28, y + .21, -.295 - yj, 1.05 - x); d = smax(d, -cav, .025);
  const qU = Math.hypot((x - HT[0]) / .43, zb / .29), encS = Math.max(Math.hypot((qU - 1) * .32, y + .235) - .034, HT[0] - .12 - x), encI = Math.max(Math.hypot((qL - 1) * .32, yj + .3) - .034, HT[0] - .12 - xj);
  const enc = Math.min(encS, encI); d = smin(d, enc, .02);
  const dS = filaDientes(x, y, zb, -.262, .43, .29, false), dI = filaDientes(xj, yj, zb, -.27, .42, .29, true), dientes = Math.min(dS, dI); d = Math.min(d, dientes);
  const eye = Math.hypot(x - 1.63, y - .1, azb - .372) - .03; d = Math.min(d, eye);
  if (tag) { let t = 'piel'; if (eye < .006) t = 'ojo'; else if (dientes < .004) t = 'diente'; else if (enc < .006) t = 'encia'; else if (cav > -.03 && cav < .02) t = 'boca'; return [d, t, zb]; }
  return d;
}
function colorTiburonHD(x, y, zb, t) {
  if (t === 'ojo') return [.008, .008, .01]; if (t === 'diente') return [.94, .92, .85].map(v => v * (.9 + .1 * n3(x * 200, y * 200, zb * 200)));
  if (t === 'encia') return [.72, .4, .42].map(v => v * (.85 + .2 * n3(x * 60, y * 60, zb * 60))); if (t === 'boca') return [.5, .26, .28];
  let c = A.colorTiburon(x, y, zb, 'piel'); if (x > 1.0 && y < -.24) c = [.88, .88, .86].map(v => v * (.92 + .1 * n3(x * 30, y * 30, zb * 30)));   // mandíbula inferior blanca
  if (x > 1.6 && y < .15 && y > -.25) { const s = .03, cx = Math.floor(x / s), cy = Math.floor(y / s), cz = Math.floor(zb / s); if (h3(cx, cy, cz) > .82 && Math.hypot(x - (cx + .5) * s, y - (cy + .5) * s, zb - (cz + .5) * s) < .006) c = c.map(v => v * .35); }   // poros (ampollas de Lorenzini)
  if (y < -.62 && Math.abs(zb) > .45 && x > 0 && x < 1.0) c = c.map(v => v * .35);                                       // puntas oscuras bajo las pectorales
  return c;
}
module.exports = { ballenaHD, colorBallenaHD, tiburonHD, colorTiburonHD, mlinea, HB, GB };
