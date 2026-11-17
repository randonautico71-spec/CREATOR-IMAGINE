'use strict';
// MATERIAL DE PLASTILINA (13 · claymotion) y de FIELTRO (14, con MATERIAL=fieltro) para escenas SDF. Lo usan temas/<tema>/clay.js.
//  · bultos de modelado a mano y huellas dactilares, que cambian un poco en cada imagen («hervido» del stop-motion)
//  · color mezclado a mano con vetas, luz cálida de estudio, sombras blandas, brillo suave y algo de luz que atraviesa la plastilina
//  · temblor leve de cámara por imagen. El vídeo se renderiza a 12 imágenes/s (bin/tema.cjs lo pasa luego a los fps pedidos).
const M = require('../../sdf/motor');
const { n3, sdEll, smin } = M;
const cl = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x, len = Math.hypot, mix = (a, b, t) => a + (b - a) * t;
const smax = (a, b, k) => -smin(-a, -b, k);
const cap = (px, py, pz, ax, ay, az, bx, by, bz, r) => { const bax = bx - ax, bay = by - ay, baz = bz - az, h = cl(((px - ax) * bax + (py - ay) * bay + (pz - az) * baz) / (bax * bax + bay * bay + baz * baz)); return len(px - ax - bax * h, py - ay - bay * h, pz - az - baz * h) - r; };
const sph = (px, py, pz, cx, cy, cz, r) => len(px - cx, py - cy, pz - cz) - r;
const IPS = 12;                               // imágenes por segundo del stop-motion
const S = { F: 0 };                           // imagen actual: semilla del hervido
const hs = (a, b, c) => { const v = Math.sin(a * 127.1 + b * 311.7 + c * 74.7 + S.F * 19.19) * 43758.5453; return v - Math.floor(v); };
const hfijo = (a, b, c) => { const v = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return v - Math.floor(v); };
const bulto = (x, y, z, a) => a * (n3(x * 6 + S.F * 1.7, y * 6 + S.F * .3, z * 6 + S.F * .9) - .5);
// figura colocada: o = { pos, yaw, pitch, esc } → coordenadas locales (x = delante, y = arriba)
function aLocal(o, x, y, z) { let px = x - o.pos[0], py = y - o.pos[1], pz = z - o.pos[2]; const e = o.esc || 1; px /= e; py /= e; pz /= e; const c = Math.cos(o.yaw || 0), s = Math.sin(o.yaw || 0), lx = px * c - pz * s, lz = px * s + pz * c;
  if (!o.pitch) return [lx, py, lz]; const cp = Math.cos(-o.pitch), sp = Math.sin(-o.pitch); return [lx * cp - py * sp, lx * sp + py * cp, lz]; }
function aMundo(o, lx, ly, lz) { const e = o.esc || 1; lx *= e; ly *= e; lz *= e; let x1 = lx, y1 = ly; if (o.pitch) { const cp = Math.cos(o.pitch), sp = Math.sin(o.pitch); x1 = lx * cp - ly * sp; y1 = lx * sp + ly * cp; }
  const c = Math.cos(-(o.yaw || 0)), s = Math.sin(-(o.yaw || 0)); return [o.pos[0] + x1 * c - lz * s, o.pos[1] + y1, o.pos[2] + x1 * s + lz * c]; }
const dirYaw = (dx, dz) => Math.atan2(-dz, dx);   // yaw para que la figura mire hacia (dx, dz)
// evalúa una figura con caja envolvente esférica (centro y radio en coordenadas locales) para no calcularla lejos
function figura(o, f, x, y, z, c = [0, 0, 0], r = 1) { const q = aLocal(o, x, y, z), e = o.esc || 1, db = len(q[0] - c[0], q[1] - c[1], q[2] - c[2]) - r; if (db > .15) return [db * e, null, q]; const [d, p] = f(q[0], q[1], q[2]); return [d * e * .8, p, q]; }
// relieve: huellas dactilares y bultos (cambian un poco en cada imagen)
function huella(x, y, z) { const s = .2, ix = Math.floor(x / s), iy = Math.floor(y / s), iz = Math.floor(z / s); if (hs(ix, iy, iz) < .45) return 0;
  const cx = (ix + .3 + .4 * hs(iy, iz, ix)) * s, cy = (iy + .3 + .4 * hs(iz, ix, iy)) * s, cz = (iz + .3 + .4 * hs(ix, iz, iy)) * s, r = len(x - cx, (y - cy) * 1.3, z - cz), R = s * .42; if (r > R) return 0;
  return Math.sin(r * 330 + 2 * Math.sin((x + z) * 40)) * (1 - r / R); }
const lumpy = (x, y, z) => .6 * n3(x * 12 + S.F * .7, y * 12, z * 12 + S.F * .4) + .25 * n3(x * 40, y * 40 + S.F, z * 40);
const FIELTRO = process.env.MATERIAL === 'fieltro';   // estilo 14: mismas escenas, material de fieltro (fibras y pelusa)
const fibra = (x, y, z) => .6 * n3(x * 160 + S.F * .3, y * 160, z * 160) + .4 * n3(x * 45, y * 45 + S.F * .2, z * 45);
const LISOS = new Set(['ojo', 'pupila', 'carton', 'cielo', 'cristal', 'ventana']);
/* crearEscena({ escena(x,y,z)->[d, material], parte?(material,x,y,z)->parte, colores:{parte:[r,g,b]}, pinta?(parte,x,y,z,alb,n)->alb,
                 camara(t)->{eye,target,fov}, luz?:[x,y,z], fondo?:[r,g,b], lejos?:30, brillantes?:Set }) → escena para bin/fotograma_sdf.cjs y bin/sdf.cjs */
function crearEscena(o) {
  const L = (() => { const v = o.luz || [-.55, .8, .6], l = len(...v); return v.map(q => q / l); })(), mapa = (x, y, z) => o.escena(x, y, z)[0], brill = o.brillantes || new Set(['ojo', 'pupila', 'nariz', 'cristal', 'ventana']);
  const E = {
    info: { seg: 8, ips: IPS },
    prepara(t) { S.F = Math.floor(t * IPS + 1e-6); const tq = S.F / IPS, c = o.camara(tq), j = [hs(S.F, 1, 1) - .5, hs(S.F, 2, 2) - .5].map(v => v * .01 * (c.temblor ?? 1));
      if (o.prepara) o.prepara(tq); return { t: tq, eye: [c.eye[0] + j[0], c.eye[1] + j[1], c.eye[2]], target: c.target, fov: c.fov || 42, far: o.lejos || 30, pasos: o.pasos || 260 }; },
    map(sc, x, y, z) { return mapa(x, y, z); },
    cielo(sc, dx, dy, dz) { return o.cielo ? o.cielo(dx, dy, dz) : (o.fondo || [.6, .8, .95]); },
    shade(sc, x, y, z, nx, ny, nz, dx, dy, dz, T) {
      const [, m] = o.escena(x, y, z), part = o.parte ? (o.parte(m, x, y, z) || m) : m; let alb = (o.colores[part] || o.colores[m] || [.8, .8, .8]).slice(), n = [nx, ny, nz];
      const g = (f, e) => { const f0 = f(x, y, z); return [(f(x + e, y, z) - f0) / e, (f(x, y + e, z) - f0) / e, (f(x, y, z + e) - f0) / e]; };
      const liso = LISOS.has(part) || LISOS.has(m), suave = part === 'piel' || part === 'mejilla' || part === 'boca', ka = liso ? .004 : suave ? .007 : .02, kh = liso ? 0 : suave ? .00012 : .00032;
      if (FIELTRO && !liso) { const g1 = g(lumpy, .004), g2 = g(fibra, .0015); n = n.map((v, k) => v - .008 * g1[k] - .0035 * g2[k]); const nl = len(...n); n = n.map(v => v / nl);
        const L0 = alb[0] * .3 + alb[1] * .59 + alb[2] * .11; alb = alb.map(v => (L0 + (v - L0) * .85) * (.86 + .22 * n3(x * 60, y * 60, z * 60))); }
      else { const g1 = g(lumpy, .004), g2 = kh ? g(huella, .0015) : [0, 0, 0]; n = n.map((v, k) => v - ka * g1[k] - kh * g2[k]); const nl = len(...n); n = n.map(v => v / nl);
        const veta = .9 + .18 * n3(x * 3.5 + 7, y * 3.5, z * 3.5) + .06 * Math.sin((x + y * .5) * 25 + 3 * n3(x * 2, y * 2, z * 2));
        if (!liso) alb = alb.map(v => v * veta); }
      if (o.pinta) alb = o.pinta(part, x, y, z, alb, n, m) || alb;
      const [Nx, Ny, Nz] = n, ndl = Nx * L[0] + Ny * L[1] + Nz * L[2];
      const sh = ndl > -.2 ? M.sombra(mapa, x + Nx * .035, y + Ny * .035, z + Nz * .035, L[0], L[1], L[2], 6, o.sombraMax || 8, 50) : 0, ao = M.oclusion(mapa, x, y, z, Nx, Ny, Nz);
      const wrap = Math.max(0, (ndl + .3) / 1.3), fill = Math.max(0, Nx * .7 + Ny * .3 - Nz * .1) * .25, sky = .5 + .5 * Ny;
      const hv = (() => { const v = [L[0] - dx, L[1] - dy, L[2] - dz], l = len(...v); return v.map(q => q / l); })(), nh = Math.max(0, Nx * hv[0] + Ny * hv[1] + Nz * hv[2]);
      const ndv = Math.max(0, -(Nx * dx + Ny * dy + Nz * dz)), fieltroAqui = FIELTRO && !liso;
      const brillo = brill.has(part) ? Math.pow(nh, 90) * 1.2 : fieltroAqui ? 0 : Math.pow(nh, 14) * .14, rim = fieltroAqui ? 0 : Math.pow(1 - ndv, 3) * .12, pelusa = fieltroAqui ? Math.pow(1 - ndv, 2.2) * .45 : 0;
      const sss = [.25, .1, .04].map(v => v * Math.max(0, wrap - Math.max(0, ndl)));
      const kl = o.luzColor || [1.25, 1.12, .95], amb = o.ambiente || [.32, .36, .45], emi = o.emite ? o.emite(part, x, y, z) : 0;
      const c = [0, 1, 2].map(k => alb[k] * (kl[k] * wrap * (.25 + .75 * sh) + amb[k] * sky * ao + [.28, .3, .38][k] * fill + sss[k] * (fieltroAqui ? .6 : 1.5) + pelusa * (.6 + .4 * sh)) + brillo * sh + rim * ao + (emi ? alb[k] * emi : 0));
      if (o.niebla) { const f = 1 - Math.exp(-Math.max(0, T - (o.niebla.desde || 0)) * o.niebla.k); return c.map((v, k) => v + (o.niebla.col[k] - v) * f); }
      return c;
    },
  };
  return E;
}
module.exports = { M, n3, sdEll, smin, smax, cl, len, mix, cap, sph, hs, hfijo, bulto, aLocal, aMundo, dirYaw, figura, crearEscena, S, IPS };
