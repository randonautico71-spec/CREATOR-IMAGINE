'use strict';
// CLAYMOTION (plastilina en stop-motion) por SDF: un león en la playa y una ballena jorobada asomando del mar con su chorro.
// Plató de estudio: arena y mar de plastilina, palmera, rocas, cangrejo y estrella de mar, y fondo de cartón pintado con sol y nubes en relieve.
// Aspecto de plastilina: bultos de modelado a mano, huellas dactilares, mezcla irregular del color, luz cálida de estudio con sombras blandas.
// Stop-motion: el vídeo va a 12 imágenes/s y las huellas y bultos cambian un poco en cada imagen («hervido»).
// node bin/fotograma_sdf.cjs temas/clay/leon_ballena.js salida.png 0
const M = require('../../sdf/motor');
const { n3, sdEll, smin } = M, cl = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x, len = Math.hypot, mix = (a, b, t) => a + (b - a) * t;
const smax = (a, b, k) => -smin(-a, -b, k);
const cap = (px, py, pz, ax, ay, az, bx, by, bz, r) => { const bax = bx - ax, bay = by - ay, baz = bz - az, h = cl(((px - ax) * bax + (py - ay) * bay + (pz - az) * baz) / (bax * bax + bay * bay + baz * baz)); return len(px - ax - bax * h, py - ay - bay * h, pz - az - baz * h) - r; };
const sph = (px, py, pz, cx, cy, cz, r) => len(px - cx, py - cy, pz - cz) - r;
let F = 0;   // número de imagen (12 por segundo): semilla del «hervido» de la plastilina
const hs = (a, b, c) => { const v = Math.sin(a * 127.1 + b * 311.7 + c * 74.7 + F * 19.19) * 43758.5453; return v - Math.floor(v); };
const bulto = (x, y, z, a) => a * (n3(x * 6 + F * 1.7, y * 6 + F * .3, z * 6 + F * .9) - .5);
const L = (() => { const v = [-.55, .8, .6], l = len(...v); return v.map(q => q / l); })();       // luz principal (foco cálido)

// ---------- LEÓN (mira hacia +x, apoyado en y = 0) ----------
const LEON = { pos: [-.42, 0, .85], yaw: Math.atan2(-.75, 1), esc: .95 };
function leon(x, y, z) {
  const az = Math.abs(z); let d = sdEll(x, y - .52, z, .48, .27, .25), p = 'cuerpo';
  for (const [lx, sz] of [[.3, 1], [.3, -1], [-.28, 1], [-.28, -1]]) { d = smin(d, cap(x, y, z, lx, .48, sz * .12, lx + .02, .08, sz * .14, .085), .07); d = smin(d, sdEll(x - lx - .06, y - .045, z - sz * .14, .12, .05, .09), .05);
    for (const t of [-1, 0, 1]) d = smax(d, -sdEll(x - lx - .17, y - .05, z - sz * .14 - t * .03, .025, .03, .004), .01); }                  // dedos marcados
  d = smin(d, sdEll(x + .05, y - .38, z, .36, .1, .2), .1);                                                                                   // vientre
  const hx = .56, hy = .88; let cab = sph(x, y, z, hx, hy, 0, .2); cab = smin(cab, sdEll(x - .71, y - .8, z, .12, .09, .12), .06);
  const hoc = Math.min(sph(x, y, z, .78, .8, .055, .07), sph(x, y, z, .78, .8, -.055, .07)), barb = sdEll(x - .74, y - .72, z, .07, .045, .07);
  cab = smin(smin(cab, hoc, .03), barb, .03); d = smin(d, cab, .1); if (cab - .01 < d + .001) p = 'cara';
  if (Math.min(hoc, barb) < d + .004) p = 'hocico';
  let mel = 1e9; for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283 + .2; mel = smin(mel, sph(x, y, z, hx - .07 - .04 * Math.abs(Math.cos(a)), hy + Math.cos(a) * .25, Math.sin(a) * .26, .115 + .02 * hs(k, 1, 2)), .07); }
  for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283; mel = smin(mel, sph(x, y, z, hx - .2, hy + Math.cos(a) * .17, Math.sin(a) * .18, .14), .08); }
  mel = smin(mel, sdEll(x - .25, y - .72, z, .2, .2, .22), .12);
  const orejas = Math.min(sph(x, y, z, .53, 1.1, .14, .055), sph(x, y, z, .53, 1.1, -.14, .055));
  if (mel < d) p = 'melena'; d = smin(d, mel, .05); if (orejas < d) p = 'cara'; d = smin(d, orejas, .02);
  const nariz = sdEll(x - .845, y - .845, z, .04, .03, .05); if (nariz < d) p = 'nariz'; d = smin(d, nariz, .015);
  const ojo = Math.min(sph(x, y, z, .7, .94, .085, .042), sph(x, y, z, .7, .94, -.085, .042)), pup = Math.min(sph(x, y, z, .735, .945, .09, .021), sph(x, y, z, .735, .945, -.09, .021));
  if (ojo < d) { d = ojo; p = 'ojo'; } if (pup < d) { d = pup; p = 'pupila'; }
  const ceja = Math.min(cap(x, y, z, .7, 1.0, .05, .7, .99, .13, .016), cap(x, y, z, .7, 1.0, -.05, .7, .99, -.13, .016)); if (ceja < d) p = 'melena'; d = smin(d, ceja, .01);
  const boca = cap(x, y, z, .83, .755, -.05, .83, .755, .05, .008); d = smax(d, -boca, .01);
  let cola = Math.min(cap(x, y, z, -.45, .58, 0, -.72, .42, -.05, .04), cap(x, y, z, -.72, .42, -.05, -.86, .62, -.08, .035)); d = smin(d, cola, .05);
  const borla = sph(x, y, z, -.88, .7, -.08, .075); if (borla < d) p = 'melena'; d = smin(d, borla, .03);
  return [d + bulto(x, y, z, .018), p];
}
// ---------- BALLENA JOROBADA de plastilina (cabeza hacia +x) ----------
const BALL = { pos: [1.8, .02, -3.4], yaw: Math.atan2(-.45, -1), pitch: .38 };
function ballena(x, y, z) {
  const az = Math.abs(z); let d = sdEll(x, y, z, 1.5, .58, .62), p = 'lomo';
  d = smin(d, sdEll(x + 1.35, y + .02, z, .95, .32, .28), .35);
  d = smin(d, sdEll(x + 2.25, y, az - .32, .3, .05, .4), .1);                                                       // cola
  { const u = x - .4, v = y + .3, w = az - .72, c = Math.cos(.6), s = Math.sin(.6), v2 = v * c - w * s, w2 = v * s + w * c; d = smin(d, sdEll(u + w2 * .35, v2, w2, .16, .045, .5), .1); }   // pectorales largas
  d = smin(d, sdEll(x + .7, y - .55, z, .16, .1, .04), .08);                                                        // aleta dorsal
  d = smax(d, -sdEll(x - .85, y + .13, z, .7, .018, .7), .02);                                                      // línea de la boca
  if (y < -.22 && x > -.5 && x < 1.35) d += .014 * Math.max(0, Math.sin(az * 38));                                  // pliegues de la garganta
  if (y > .3 && x > .75) { const cx = Math.round(x / .16), cz = Math.round(z / .14); if (hs(cx, cz, 7) > .35) d -= .03 * Math.max(0, 1 - len(x - cx * .16, z - cz * .14) / .055) ** 2; }   // tubérculos
  d = smax(d, -Math.min(sdEll(x - .3, y - .58, z - .05, .08, .04, .025), sdEll(x - .3, y - .58, z + .05, .08, .04, .025)), .02);                                    // espiráculos
  if (y < -.18 && d < .05) p = 'vientre'; if ((az > .62 && x > -.2 && x < .8 && y < -.1)) p = 'aleta';
  const ojo = sph(x, y, z, .95, .08, Math.sign(z) * .45, .05), pup = sph(x, y, z, .985, .085, Math.sign(z) * .47, .026);
  if (ojo < d) { d = ojo; p = 'ojo'; } if (pup < d) { d = pup; p = 'pupila'; }
  return [d + bulto(x, y, z, .02), p];
}
// chorro: columna de gotas de plastilina blanca y azul claro que se abre arriba
const CHORRO = (() => { const r = []; for (let k = 0; k < 26; k++) { const t = k / 25; r.push([(Math.sin(k * 2.3) * .5) * t * t * .8, .62 + t * 1.45, (Math.cos(k * 1.7) * .5) * t * t * .8, .045 + .07 * t]); } for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; r.push([Math.cos(a) * .45, 2.05 + .12 * Math.sin(a * 3), Math.sin(a) * .4, .12]); } return r; })();
// ---------- plató ----------
const orilla = x => -.55 + .25 * Math.sin(x * 1.3 + .5);
const hArena = (x, z) => cl((z - orilla(x)) * .2, -.4, .05) + .02 * (n3(x * 1.5, 0, z * 1.5) - .5) + .012 * Math.sin(x * 9 + z * 3);
const hMar = (x, z) => -.06 + .025 * Math.sin(x * 3 + z * 1.2) + .018 * Math.sin(z * 4.1 - x * .7) + .01 * (n3(x * 3 + F, 0, z * 3) - .5);
function aLocal(o, x, y, z) { let px = x - o.pos[0], py = y - o.pos[1], pz = z - o.pos[2]; const e = o.esc || 1; px /= e; py /= e; pz /= e; const c = Math.cos(o.yaw), s = Math.sin(o.yaw), lx = px * c - pz * s, lz = px * s + pz * c;
  if (!o.pitch) return [lx, py, lz]; const cp = Math.cos(-o.pitch), sp = Math.sin(-o.pitch); return [lx * cp - py * sp, lx * sp + py * cp, lz]; }
const aMundoB = (lx, ly, lz) => { const cp = Math.cos(BALL.pitch), sp = Math.sin(BALL.pitch), x1 = lx * cp - ly * sp, y1 = lx * sp + ly * cp, c = Math.cos(-BALL.yaw), s = Math.sin(-BALL.yaw); return [BALL.pos[0] + x1 * c - lz * s, BALL.pos[1] + y1, BALL.pos[2] + x1 * s + lz * c]; };
const SOPLO = aMundoB(.3, .6, 0);
function palmera(x, y, z) { let d = 1e9, p = 'tronco'; const b = [-1.25, 0, -1.9];
  for (let k = 0; k < 11; k++) { const t = k / 10, c = [b[0] + .35 * t * t, b[1] + t * 2.1, b[2] - .1 * t]; d = smin(d, sdEll(x - c[0], y - c[1], z - c[2], .11 - .025 * t, .1, .11 - .025 * t), .03); }
  const top = [b[0] + .35, 2.15, b[2] - .1];
  for (let k = 0; k < 7; k++) { const a = k / 7 * 6.283 + .3, dx = Math.cos(a), dz = Math.sin(a), u = x - top[0] - dx * .42, w = z - top[2] - dz * .42, v = y - top[1] + .12 * ((x - top[0]) * dx + (z - top[2]) * dz) ** 2 * 3 - .05;
    const lf = sdEll(u * dx + w * dz, v, -u * dz + w * dx, .48, .025, .13 + .03 * Math.sin((u * dx + w * dz) * 30)); if (lf < d) p = 'hoja'; d = smin(d, lf, .03); }
  for (let k = 0; k < 3; k++) { const a = k * 2.1, co = sph(x, y, z, top[0] + Math.cos(a) * .1, top[1] - .1, top[2] + Math.sin(a) * .1, .065); if (co < d) p = 'coco'; d = Math.min(d, co); }
  return [d + bulto(x, y, z, .015), p]; }
function escena(x, y, z) {
  let d = (y - hArena(x, z)) * .8, m = 'arena'; const c = (dd, mm) => { if (dd < d) { d = dd; m = mm; } };
  c(y - hMar(x, z), 'mar');
  { const zf = orilla(x) - .3; c(len(z - zf + .03 * Math.sin(x * 7), y + .04) - .04 + bulto(x, y, z, .02), 'espuma'); }
  { const q = aLocal(LEON, x, y, z), db = len(q[0] - .1, q[1] - .6, q[2]) - 1.05; c(db > .1 ? db * LEON.esc : leon(...q)[0] * LEON.esc * .8, 'leon'); }
  { const q = aLocal(BALL, x, y, z), db = len(q[0] + .3, q[1], q[2]) - 2.7; c(db > .1 ? db : ballena(...q)[0] * .8, 'ballena'); }
  { const db = len(x - SOPLO[0], (y - SOPLO[1] - 1.1) * .6, z - SOPLO[2]) - 1.1; if (db > .1) c(db * .6, 'chorro'); else { let dc = 1e9; for (const [a, b, e, r] of CHORRO) dc = smin(dc, sph(x, y, z, SOPLO[0] + a, SOPLO[1] + b - .62, SOPLO[2] + e, r), .09); c(dc + bulto(x, y, z, .03), 'chorro'); } }
  { const db = len(x - 1.8, z + 3.4) - 1.25; if (db < .5) { const dd = len(len(x - 1.85, z + 3.25) - 1.05, y + .03) - .07 + bulto(x * 2, y, z * 2, .05); c(dd, 'espuma'); } }   // salpicadura alrededor de la ballena
  { const db = len(x + .9, y - 1.2, z + 1.95) - 1.6; c(db > .1 ? db : palmera(x, y, z)[0] * .8, 'palmera'); }
  c(sdEll(x - 1.35, y - .05, z - .55, .32, .2, .26) + bulto(x * 2, y * 2, z * 2, .06), 'roca'); c(sdEll(x - 1.0, y - .02, z - .2, .18, .12, .16) + bulto(x * 3, y * 3, z * 3, .04), 'roca');
  { const px = x - .55, pz = z - 2.05, r = len(px, pz); if (r < .3 && y < .15) { const a = Math.atan2(pz, px), R = .19 * (.35 + .65 * Math.pow(Math.abs(Math.cos(a * 2.5 + .4)), 2.5)); c(Math.max(r - R, Math.abs(y - hArena(x, z) - .02) - .025) * .6, 'estrella'); } else c(len(Math.max(r - .2, 0), y - .03) - .02, 'estrella'); }
  { const k = [.75, 0, 2.3]; let cr = sdEll(x - k[0], y - .09, z - k[2], .11, .06, .085); for (const s of [-1, 1]) { cr = smin(cr, sph(x, y, z, k[0] + .14, .12, k[2] + s * .1, .045), .03); cr = smin(cr, cap(x, y, z, k[0], .08, k[2] + s * .06, k[0] - .02, .02, k[2] + s * .16, .015), .02); cr = Math.min(cr, sph(x, y, z, k[0] + .07, .17, k[2] + s * .035, .02)); } c(cr, 'cangrejo'); }
  // fondo de cartón pintado con sol, nubes e isla en relieve
  c(z + 7.5, 'carton');
  c(sdEll(x - 1.9, y - 3.0, z + 7.5, .55, .55, .1), 'sol');
  for (const [cx, cy, s] of [[-1.9, 3.1, 1], [-.3, 2.5, .6], [2.8, 2.3, .8], [1.0, 4.1, .9]]) { let dn = 1e9; for (let k = 0; k < 5; k++) dn = smin(dn, sdEll(x - cx - (k - 2) * .32 * s, y - cy - .12 * s * Math.sin(k * 1.9 + 1), z + 7.45, .3 * s, .2 * s, .1), .12); c(dn + bulto(x, y, z, .03), 'nube'); }
  c(sdEll(x + 2.4, y + .05, z + 7.3, 1.3, .55, .25) + bulto(x * 2, y * 2, z, .05), 'isla');
  return [d, m];
}
// relieve de la plastilina: bultos y huellas dactilares (cambian un poco en cada imagen)
function huella(x, y, z) { const s = .2, ix = Math.floor(x / s), iy = Math.floor(y / s), iz = Math.floor(z / s); if (hs(ix, iy, iz) < .5) return 0;
  const cx = (ix + .3 + .4 * hs(iy, iz, ix)) * s, cy = (iy + .3 + .4 * hs(iz, ix, iy)) * s, cz = (iz + .3 + .4 * hs(ix, iz, iy)) * s, r = len(x - cx, (y - cy) * 1.3, z - cz), R = s * .42; if (r > R) return 0;
  return Math.sin(r * 380 + 2 * Math.sin((x + z) * 40)) * (1 - r / R); }
const lumpy = (x, y, z) => .6 * n3(x * 12 + F * .7, y * 12, z * 12 + F * .4) + .25 * n3(x * 40, y * 40 + F, z * 40);
const BASE = { arena: [.86, .7, .45], mar: [.18, .48, .78], espuma: [.93, .95, .97], chorro: [.95, .98, 1.0], carton: [.6, .8, .95], sol: [1.0, .78, .25], nube: [.98, .97, .95], isla: [.35, .55, .3],
  tronco: [.55, .36, .2], hoja: [.3, .62, .22], coco: [.42, .27, .14], roca: [.5, .48, .46], estrella: [.95, .45, .2], cangrejo: [.86, .22, .15],
  cuerpo: [.88, .62, .26], cara: [.9, .66, .3], hocico: [.97, .88, .68], melena: [.62, .3, .1], nariz: [.36, .16, .12], ojo: [.97, .97, .95], pupila: [.04, .03, .03],
  lomo: [.2, .24, .32], vientre: [.88, .9, .92], aleta: [.85, .87, .9] };
const E = {
  prepara(t) { F = Math.floor(t * 12); const j = [hs(F, 1, 1) - .5, hs(F, 2, 2) - .5].map(v => v * .012);      // leve temblor de cámara de stop-motion
    return { t, eye: [0 + j[0], .95 + j[1], 5.6], target: [.3, .75, -1.2], fov: 42, far: 30, pasos: 260 }; },
  map(sc, x, y, z) { return escena(x, y, z)[0]; },
  cielo() { return [.6, .8, .95]; },
  shade(sc, x, y, z, nx, ny, nz, dx, dy, dz) {
    let [, m] = escena(x, y, z), part = m;
    if (m === 'leon') part = leon(...aLocal(LEON, x, y, z))[1]; else if (m === 'ballena') part = ballena(...aLocal(BALL, x, y, z))[1]; else if (m === 'palmera') part = palmera(x, y, z)[1];
    let alb = (BASE[part] || [.8, .8, .8]).slice(), n = [nx, ny, nz];
    const g = (f, e) => { const f0 = f(x, y, z); return [(f(x + e, y, z) - f0) / e, (f(x, y + e, z) - f0) / e, (f(x, y, z + e) - f0) / e]; };
    const ka = m === 'carton' ? .004 : .02, kh = (m === 'carton' || part === 'ojo' || part === 'pupila') ? 0 : .00032;
    const g1 = g(lumpy, .004), g2 = kh ? g(huella, .0015) : [0, 0, 0]; n = n.map((v, k) => v - ka * g1[k] - kh * g2[k]); const nl = len(...n); n = n.map(v => v / nl);
    // color de plastilina mezclada a mano (vetas) y detalles pintados
    const veta = .9 + .18 * n3(x * 3.5 + 7, y * 3.5, z * 3.5) + .06 * Math.sin((x + y * .5) * 25 + 3 * n3(x * 2, y * 2, z * 2));
    alb = alb.map(v => v * veta);
    if (m === 'carton') { const h = cl((y + .2) / 4); alb = [mix(.98, .45, h), mix(.86, .7, h), mix(.68, .95, h)].map(v => v * (.96 + .04 * Math.sin(y * 23 + 4 * n3(x * .8, y * .8, 0)))); }   // cielo pintado con pinceladas
    if (m === 'mar') { const prof = cl((orilla(x) - .3 - z) / 3); alb = [mix(.3, .1, prof), mix(.66, .36, prof), mix(.85, .7, prof)]; if (Math.sin(x * 3 + z * 1.2) > .85) alb = alb.map(v => v * 1.25); }
    if (m === 'arena') { if (z < orilla(x) - .05) alb = alb.map(v => v * .82); alb = alb.map(v => v * (.92 + .1 * n3(x * 30, 0, z * 30))); }
    const [Nx, Ny, Nz] = n, ndl = Nx * L[0] + Ny * L[1] + Nz * L[2], mapS = (a, b, c) => escena(a, b, c)[0];
    const sh = ndl > -.2 ? M.sombra(mapS, x + Nx * .01, y + Ny * .01, z + Nz * .01, L[0], L[1], L[2], 9, 8, 50) : 0, ao = M.oclusion(mapS, x, y, z, Nx, Ny, Nz);
    const wrap = Math.max(0, (ndl + .3) / 1.3), fill = Math.max(0, Nx * .7 + Ny * .3 - Nz * .1) * .25, sky = .5 + .5 * Ny;
    const hv = (() => { const v = [L[0] - dx, L[1] - dy, L[2] - dz], l = len(...v); return v.map(q => q / l); })(), brillo = (part === 'ojo' || part === 'pupila' || part === 'nariz') ? Math.pow(Math.max(0, Nx * hv[0] + Ny * hv[1] + Nz * hv[2]), 90) * 1.2 : Math.pow(Math.max(0, Nx * hv[0] + Ny * hv[1] + Nz * hv[2]), 14) * .14;
    const rim = Math.pow(1 - Math.max(0, -(Nx * dx + Ny * dy + Nz * dz)), 3) * .12;
    const sss = [.25, .1, .04].map(v => v * Math.max(0, wrap - Math.max(0, ndl)));                                     // la plastilina deja pasar un poco de luz cálida
    return [0, 1, 2].map(k => alb[k] * ([1.25, 1.12, .95][k] * wrap * (.25 + .75 * sh) + [.32, .36, .45][k] * sky * ao + [.28, .3, .38][k] * fill + sss[k] * 1.5) + brillo * sh + rim * ao);
  },
};
module.exports = E;
