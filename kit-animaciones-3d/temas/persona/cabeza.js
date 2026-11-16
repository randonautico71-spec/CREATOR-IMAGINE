'use strict';
// CABEZA ESCULPIDA (SDF) en coordenadas locales de la cabeza: x delante, y arriba, z lateral. Unidades: metros.
const sdEll = (x, y, z, a, b, c) => { const k0 = Math.hypot(x / a, y / b, z / c), k1 = Math.hypot(x / (a * a), y / (b * b), z / (c * c)) + 1e-12; return k0 * (k0 - 1) / k1; };
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * .25; };
const smax = (a, b, k) => -smin(-a, -b, k);
function sdRC(px, py, pz, ax, ay, az, bx, by, bz, r1, r2) { const bax = bx - ax, bay = by - ay, baz = bz - az, l2 = bax * bax + bay * bay + baz * baz, rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2, pax = px - ax, pay = py - ay, paz = pz - az, y = pax * bax + pay * bay + paz * baz, z = y - l2, qx = pax * l2 - bax * y, qy = pay * l2 - bay * y, qz = paz * l2 - baz * y, x2 = qx * qx + qy * qy + qz * qz, y2 = y * y * l2, z2 = z * z * l2, k = Math.sign(rr) * rr * rr * x2; if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2; if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1; return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1; }
const OJO = { x: .068, y: .003, z: .033, r: .0118 };
// devuelve distancia; con 'tag' devuelve [d, etiqueta]
function cabezaSDF(x, y, z, tag) {
  const az = Math.abs(z);
  // cráneo y máscara facial
  let d = sdEll(x + .014, y - .014, z, .097, .108, .077);
  d = smin(d, sdEll(x - .026, y + .036, z, .066, .084, .059), .03);
  d = smin(d, sdEll(x - .02, y + .08, z, .056, .036, .049), .028);               // mandíbula
  d = smin(d, sdEll(x - .066, y + .104, z, .022, .018, .025), .022);              // mentón
  d = smin(d, sdEll(x - .056, y + .012, az - .047, .022, .014, .019), .02);       // pómulos
  d = smin(d, sdEll(x - .074, y - .026, az - .028, .011, .008, .024), .012);      // arco ciliar
  d = smin(d, sdEll(x - .074, y - .012, z, .01, .018, .012), .012);               // entrecejo
  d = smax(d, -sdEll(x - .083, y - .002, az - OJO.z, .017, .0125, .019), .009);   // cuenca del ojo
  // nariz
  const nb = sdRC(x, y, z, .079, -.002, 0, .103, -.036, 0, .0068, .0105);
  d = smin(d, nb, .012);
  d = smin(d, Math.hypot(x - .101, y + .039, z) - .0128, .009);                   // punta
  d = smin(d, sdEll(x - .09, y + .043, az - .0138, .0095, .0085, .008), .006);    // aletas
  d = smax(d, -sdEll(x - .097, y + .0505, az - .0068, .0058, .0028, .0042), .0022);// fosas
  // boca
  d = smax(d, -sdEll(x - .097, y + .059, z, .0045, .008, .0028), .004);           // filtrum
  const lS = sdEll(x - .0885, y + .067, z, .0068, .0046, .0215), lI = sdEll(x - .0848, y + .0762, z, .0072, .0055, .019);
  d = smin(d, lS, .006); d = smin(d, lI, .006);
  d = smax(d, -sdEll(x - .094, y + .0712, z, .01, .0011, .0215), .0014);          // línea de la boca
  d = smax(d, -sdEll(x - .083, y + .0715, az - .0235, .004, .003, .003), .003);   // comisuras
  d = smin(d, sdEll(x - .072, y + .088, z, .012, .006, .016), .01);               // surco mentolabial
  // orejas
  const ore = sdEll(x + .006, y + .012, az - .079, .019, .03, .0065);
  d = smin(d, ore, .006); d = smax(d, -sdEll(x + .004, y + .013, az - .085, .011, .019, .0045), .003);
  // ojos: globo + párpados (casquete recortado → abertura en almendra)
  const ex = x - OJO.x, ey = y - OJO.y, ez = az - OJO.z, re = Math.hypot(ex, ey, ez), eb = re - OJO.r;
  const casq = Math.abs(re - .0128) - .0017, ab = ey + ex * .12 - ez * .06, alm = .0052 - Math.abs(ez) * .09;
  const pSup = Math.max(casq, -(ab - Math.max(.0016, alm * .95)), -ex + .001), pInf = Math.max(casq, ab + Math.max(.0014, alm * .75), -ex + .001);
  d = smin(d, pSup, .0035); d = smin(d, pInf, .003);
  const dF = Math.min(d, eb);
  if (!tag) return dF;
  let t = 'piel';
  if (eb <= d + .0004) t = 'ojo'; else if (Math.min(lS, lI) < .0016) t = 'labio'; else if (pSup < .0022 && ex > .004 && Math.abs(ab - Math.max(.0016, alm * .95)) < .0011) t = 'pestana'; else if (Math.min(pSup, pInf) < .002) t = 'parpado';
  else if (ore < .002) t = 'oreja';
  return [dF, t];
}
function smoothstep(a, b, x) { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
// color de la cabeza (0..1). q = punto local; gaze = dirección de la mirada (local)
function cabezaColor(x, y, z, t, ruido) {
  const az = Math.abs(z), piel = [.84, .64, .5], n = ruido(x * 500, y * 500, z * 500), n2 = ruido(x * 60, y * 60, z * 60);
  let c = piel.map((v, k) => v * (.95 + .08 * n2) + (k === 0 ? .02 * n : 0));
  const rubor = Math.exp(-((x - .062) ** 2 + (y + .03) ** 2 + (az - .045) ** 2) / .0004) * .5 + Math.exp(-((x - .1) ** 2 + (y + .038) ** 2) / .00015) * .35;
  c = [c[0] + .06 * rubor, c[1] - .03 * rubor, c[2] - .02 * rubor];
  const ojera = Math.exp(-((x - .075) ** 2 + (y + .008) ** 2 + (az - .033) ** 2) / .00007) * .12; c = c.map(v => v * (1 - ojera));
  if (t === 'ojo') { const ex = x - OJO.x, ey = y - OJO.y, ez = (z > 0 ? 1 : -1) * (az - OJO.z), r = Math.hypot(ex, ey, ez), u = [ex / r, ey / r, ez / r];
    const g = [.985, -.05, -(z > 0 ? 1 : -1) * .16], gl = Math.hypot(...g), cosA = (u[0] * g[0] + u[1] * g[1] + u[2] * g[2]) / gl, ang = Math.acos(Math.min(1, cosA));
    if (ang < .2) { return [.01, .01, .012]; }
    if (ang < .52) { const fib = .7 + .3 * Math.abs(Math.sin(Math.atan2(u[1], u[2]) * 23 + ruido(x * 900, y * 900, 1) * 3)), lim = smoothstep(.42, .52, ang); const iris = [.33, .42, .22].map(v => v * fib * (1 - .7 * lim) * (.8 + .4 * smoothstep(.2, .45, ang))); return iris; }
    const rosa = smoothstep(.9, 1.4, Math.abs(Math.atan2(ez, ex))) * .25; return [.9 + rosa * .1, .87 - rosa * .3, .84 - rosa * .3]; }
  if (t === 'labio') { const l = [.74, .5, .46]; return l.map(v => v * (.9 + .12 * n2)); }
  if (t === 'pestana') return [.08, .05, .04];
  if (t === 'parpado') c = c.map(v => v * .96);
  if (t === 'oreja') c = [c[0] + .03, c[1] - .01, c[2] - .01];
  // cejas: trazos de pelo pintados sobre el arco
  const cx = az - .031, arco = .028 + .006 * Math.cos(cx * 55) - (az > .05 ? (az - .05) * .5 : 0);
  if (x > .055 && az > .008 && az < .055 && Math.abs(y - arco) < .0045 - Math.abs(cx) * .05) { const tr = ruido(x * 200, y * 2600 + az * 900, az * 300); if (tr > .38) return [.18, .12, .08].map(v => v * (.8 + .4 * tr)); }
  if (y > .046 && x > .04) c = c.map(v => v * .97);
  return c;
}
module.exports = { cabezaSDF, cabezaColor, OJO };
