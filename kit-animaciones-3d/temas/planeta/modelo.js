'use strict';
// Planeta tipo Tierra (continentes procedurales, no el mapa real) + cohete + órbita, para motor3d.js
const PL = { R: 3, tilt: .41, giro: 1.1, inclina: 0 };
const SOL = norm([-.75, .35, .55]);
const aplicaB = (B, p) => [B[0][0] * p[0] + B[1][0] * p[1] + B[2][0] * p[2], B[0][1] * p[0] + B[1][1] * p[1] + B[2][1] * p[2], B[0][2] * p[0] + B[1][2] * p[1] + B[2][2] * p[2]];
const texN = n => rotZ(rotY(rotX(n, PL.inclina), PL.giro + (globalThis.T_ANIM || 0) * .05), PL.tilt);   // dirección en coordenadas de la «textura» del planeta
function tierra(n) {   // n: normal unitaria (mundo) → { col, tierra, alt, hielo }
  const q = texN(n), h = fbm3(q[0] * 1.5 + 7, q[1] * 1.5 + 2, q[2] * 1.5, 6), lat = Math.abs(q[1]);
  const det = fbm3(q[0] * 7, q[1] * 7, q[2] * 7, 3), desierto = fbm3(q[0] * 2.2 + 30, q[1] * 2.2, q[2] * 2.2, 3);
  const mar = .5; let col, esTierra = h > mar;
  if (!esTierra) { const p = clamp((mar - h) / .12); col = mixc([40, 120, 170], [10, 40, 96], p); if (p < .12) col = mixc([80, 170, 190], col, p / .12); }
  else { const a = (h - mar) / .25;
    const veg = fbm3(q[0] * 3.5 + 9, q[1] * 3.5, q[2] * 3.5, 4), bosque = mixc([44, 98, 42], [26, 72, 34], det), pradera = mixc([108, 142, 64], [88, 124, 58], det);
    col = mixc(pradera, bosque, smooth(.42, .62, veg));
    col = mixc(col, mixc([112, 120, 82], [138, 134, 104], det), smooth(.45, .65, lat));
    const wd = smooth(.06, .16, lat) * smooth(.44, .3, lat) * smooth(.44, .6, desierto + (det - .5) * .25);
    col = mixc(col, mixc([218, 188, 124], [186, 140, 90], det), wd);
    if (a > .55) col = mixc(col, [132, 112, 92], clamp((a - .55) * 3)); if (a > .85) col = [236, 238, 242]; }
  const hielo = lat > .87 + (vnoise3(q[0] * 5, q[2] * 5, 1) - .5) * .1;
  if (hielo) col = [236, 242, 250];
  return { col, tierra: esTierra && !hielo, hielo };
}
const nube = n => { const q = texN(rotY(n, .35)); return smooth(.6, .72, fbm3(q[0] * 3.2 + 40, q[1] * 6.4, q[2] * 3.2, 6)); };
const luzCiudad = n => { const q = texN(n); return vnoise3(q[0] * 38, q[1] * 38, q[2] * 38) > .72 && vnoise3(q[0] * 6, q[1] * 6, q[2] * 6) > .45; };

// Malla del planeta: caras con color de la textura; noche con luces de ciudades (emisivas)
function planetaMalla(F, o = {}) {
  const R = o.R || PL.R, c = o.c || [0, 0, 0], tmp = [];
  sphere(tmp, c, R, o.lat || 40, o.lon || 80, () => [0, 0, 0], { disp: o.relieve ? d => { const t = tierra(d); return t.tierra ? 1 + o.relieve : 1; } : null });
  for (const f of tmp) { const n = norm(sub(centroid(f.p), c)), t = tierra(n); f.col = o.jit ? jit(t.col, 1 - o.jit / 2 + o.jit * hash3(f.p[0][0] * 99 | 0, f.p[0][1] * 99 | 0, 5)) : t.col;
    if (o.ciudades !== false && t.tierra && dot(n, SOL) < -.08 && luzCiudad(n)) { f.col = [255, 196, 110]; f.emit = true; } F.push(f); }
  if (o.nubes !== false) { const nb = []; sphere(nb, c, R * (o.altNubes || 1.025), o.latN || o.lat || 40, o.lonN || o.lon || 80, () => [255, 255, 255]);
    const destino = o.capaNubes || F; for (const f of nb) { const n = norm(sub(centroid(f.p), c)), k = nube(n); if (k > .5) { f.col = [250, 252, 255]; destino.push(f); } } }
}
// Órbita inclinada: puntos y estado del cohete (posición, tangente, radial)
const ORB = (() => { const nO = norm([.12, .42, .9]), a = norm(cross([0, 1, 0], nO)), b = cross(nO, a); return { nO, a, b, r: 4.4 }; })();
function orbitaPunto(th) { return add(mul(ORB.a, Math.cos(th) * ORB.r), mul(ORB.b, Math.sin(th) * ORB.r)); }
function estadoCohete(th) { th += (globalThis.T_ANIM || 0) * .12; const p = orbitaPunto(th), t = norm(sub(orbitaPunto(th + .01), p)), u = norm(p); return { p, t, u }; }
const TH_COHETE = 1.55;
// Cohete: eje local y = dirección de avance, x = radial hacia fuera
function coheteMalla(F, est, s = .62, o = {}) {
  const ey = est.t, ex = norm(sub(est.u, mul(ey, dot(est.u, ey)))), ez = cross(ex, ey), B = [ex, ey, ez];
  const W = p => add(est.p, mul(aplicaB(B, p), s)), L = [], blanco = hex('#f2f0ea'), rojo = hex('#e8414a'), gris = hex('#7a7f96');
  lathe(L, [[0, 1.05], [.13, .9], [.2, .65], [.23, .3], [.23, -.25], [.2, -.45], [0, -.45]], o.seg || 24, y => (y > .62 || (y > -.22 && y < -.1)) ? rojo : blanco, [0, .2, 0]);
  lathe(L, [[.15, -.42], [.2, -.62], [0, -.62]], o.seg || 18, () => gris, [0, -.5, 0]);
  for (const a of [0, 2.094, 4.189]) { const sh = [[.2, -.05], [.45, -.42], [.45, -.6], [.21, -.42]], t = .025, P = (u2, y, sg) => rotY([u2, y, sg * t], -a);
    const fr = sh.map(([u2, y]) => P(u2, y, 1)), bk = sh.map(([u2, y]) => P(u2, y, -1)), fin = [{ p: fr, col: rojo }, { p: bk, col: rojo }];
    for (let k = 0; k < 4; k++) fin.push({ p: [fr[k], fr[(k + 1) % 4], bk[(k + 1) % 4], bk[k]], col: rojo }); orientTo(fin, centroid([...fr, ...bk])); L.push(...fin); }
  sphere(L, [.2, .38, 0], .075, 6, 10, () => hex('#5cc8ff'), { scale: [.5, 1, 1] });
  if (o.llama !== false) { const ll = []; lathe(ll, [[0, -.6], [.14, -.72], [.1, -1.1], [0, -1.55]], 14, () => hex('#ff8a2a'), [0, -.9, 0]); lathe(ll, [[0, -.62], [.08, -.72], [0, -1.15]], 12, () => hex('#fff1a8'), [0, -.8, 0]); ll.forEach(f => f.emit = true); L.push(...ll); }
  for (const f of L) { f.p = f.p.map(W); F.push(f); }
  return { B, W };
}
function estrellas(ctx, w, h, n, R = rng(3), o = {}) { for (let i = 0; i < n; i++) { const a = R(), s = R() < .03 ? 2.5 : R() < .2 ? 1.6 : 1; ctx.fillStyle = `rgba(${o.col || '255,255,255'},${.25 + a * .75})`; ctx.fillRect(R() * w, R() * h, s * (w / 1080), s * (w / 1080)); } }
// Línea de órbita en discontinua, ocultando lo que queda detrás del planeta
function dibujaOrbita(ctx, cam, o = {}) {
  const n = 220, eye = cam.eye; ctx.lineWidth = o.lw || 3; ctx.strokeStyle = o.col || 'rgba(255,255,255,.6)';
  for (let i = 0; i < n; i++) { if (o.discont !== false && i % 2) continue; const a = orbitaPunto(i / n * 6.283), b = orbitaPunto((i + 1) / n * 6.283);
    const oculto = p => { const d = sub(p, eye), L = Math.hypot(...d), u = mul(d, 1 / L), tc = -dot(eye, u), dmin = Math.hypot(...add(eye, mul(u, tc))); return tc > 0 && tc < L && dmin < PL.R; };
    if (oculto(a)) continue; const p = cam.P(a), q = cam.P(b); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); }
}
function halo(ctx, cam, R = PL.R, col = '90,160,255', k = 1) {
  const c = cam.P([0, 0, 0]), e = cam.P(add([0, 0, 0], mul(cam.u, R))), r = Math.abs(c[1] - e[1]);
  const g = ctx.createRadialGradient(c[0], c[1], r * .96, c[0], c[1], r * 1.18); g.addColorStop(0, `rgba(${col},${.55 * k})`); g.addColorStop(.35, `rgba(${col},${.22 * k})`); g.addColorStop(1, `rgba(${col},0)`);
  ctx.fillStyle = g; ctx.fillRect(c[0] - r * 1.3, c[1] - r * 1.3, r * 2.6, r * 2.6); return { c, r };
}
const CAM = (w, h, o = {}) => camera(o.eye || [.8, 1.4, 13.8], o.target || [0, 2.6, 0], { fov: o.fov || 40, w, h, ortho: o.ortho, cy: o.cy });
const LUZ = { light: SOL, amb: .1, lightCol: [1.25, 1.18, 1.08], ambCol: [.5, .6, .9] };
function fib(i, n) { const y = 1 - (i + .5) / n * 2, r = Math.sqrt(1 - y * y), th = i * 2.39996; return [r * Math.cos(th), y, r * Math.sin(th)]; }
// Planeta píxel a píxel (rayo-esfera exacto): textura nítida, terminador suave, reflejo del océano,
// sombras de nubes, ciudades nocturnas y atmósfera. o: { R, C, amb, toon, poster, nubes, atm, plano }
function planetaPixel(ctx, w, h, cam, o = {}) {
  const R = o.R || PL.R, C = o.C || [0, 0, 0], img = ctx.getImageData(0, 0, w, h), D = img.data, amb = o.amb ?? .06;
  const eye = cam.eye, f = cam.f, r = cam.r, u = cam.u, foc = cam.focal, cx = w / 2, cy = (o.cy ?? h / 2), orto = cam.ortho;
  const cc = cam.P(C), dist = Math.hypot(...sub(C, eye)), rs = orto ? R * orto : R * foc / Math.sqrt(dist * dist - R * R), ext = rs * (o.atm === false ? 1.02 : 1.2);
  const x0 = Math.max(0, Math.floor(cc[0] - ext)), x1 = Math.min(w, Math.ceil(cc[0] + ext)), y0 = Math.max(0, Math.floor(cc[1] - ext)), y1 = Math.min(h, Math.ceil(cc[1] + ext));
  const px2w = orto ? 1 / orto : dist / foc;
  for (let py = y0; py < y1; py++) for (let px = x0; px < x1; px++) {
    let O, dir;
    if (orto) { O = add(eye, add(mul(r, (px + .5 - cx) / orto), mul(u, -(py + .5 - cy) / orto))); dir = f; }
    else { O = eye; dir = norm(add(f, add(mul(r, (px + .5 - cx) / foc), mul(u, -(py + .5 - cy) / foc)))); }
    const oc = sub(O, C), b = dot(oc, dir), c2 = dot(oc, oc) - R * R, disc = b * b - c2, dm = Math.sqrt(Math.max(0, dot(oc, oc) - b * b)), i = (py * w + px) * 4;
    if (disc < 0 || -b - Math.sqrt(Math.max(0, disc)) < 0) {
      if (o.atm === false || b > 0) continue;
      const q = norm(add(oc, mul(dir, -b))), g = Math.exp(-(dm - R) / (R * .045)) * (.15 + .85 * smooth(-.3, .6, dot(q, SOL)));
      D[i] = Math.min(255, D[i] + 90 * g); D[i + 1] = Math.min(255, D[i + 1] + 150 * g); D[i + 2] = Math.min(255, D[i + 2] + 255 * g); continue;
    }
    const t = -b - Math.sqrt(disc), p = add(oc, mul(dir, t)), n = mul(p, 1 / R), tx = tierra(n), dl = dot(n, SOL);
    let col = tx.col.map(v => v / 255), dif = smooth(-.1, .4, dl);
    if (o.toon) dif = dif > .65 ? 1 : dif > .2 ? .68 : .3;
    let cl = o.nubes === false ? 0 : nube(n); const sombraN = o.nubes === false ? 0 : nube(norm(add(n, mul(SOL, .025)))) * .5;
    let s = col.map(v => v * (amb + (1 - amb) * dif * (1 - sombraN)));
    if (!tx.tierra && !tx.hielo) { const hv = norm(sub(SOL, dir)), sp = Math.pow(Math.max(0, dot(n, hv)), 70) * dif; s = s.map((v, k) => v + sp * [1, .92, .8][k] * .9); }
    if (tx.tierra && dl < -.04 && luzCiudad(n)) { const k = smooth(-.04, -.25, dl) * (1 - cl); s = [s[0] + 1.0 * k, s[1] + .72 * k, s[2] + .36 * k]; }
    const lc = o.toon ? (dif > .5 ? 1 : dif > .15 ? .7 : .3) : (.05 + .95 * dif); s = s.map((v, k) => mix(v, [.98, .99, 1][k] * lc, cl * .92));
    const rim = Math.pow(1 - Math.max(0, -dot(n, dir)), 3) * (.15 + .85 * smooth(-.2, .5, dl)); s = [s[0] + .25 * rim, s[1] + .5 * rim, s[2] + .95 * rim];
    if (o.poster) s = s.map(v => Math.round(v * o.poster) / o.poster);
    const a = clamp((R - dm) / (px2w * 1.2));
    for (let k = 0; k < 3; k++) D[i + k] = mix(D[i + k], clamp(Math.pow(clamp(s[k]), .9) * 255, 0, 255), a);
  }
  ctx.putImageData(img, 0, 0); return { c: cc, r: rs };
}
function coheteSolo(ctx, cam, o = {}) { const Rk = []; coheteMalla(Rk, estadoCohete(TH_COHETE), o.s || .66, { seg: o.seg || 32, llama: o.llama }); render(ctx, cam, Rk, { ...LUZ, amb: .32, toon: o.toon, seam: .8 }); }
