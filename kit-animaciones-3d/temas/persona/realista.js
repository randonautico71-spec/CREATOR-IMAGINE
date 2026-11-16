'use strict';
// Estilo REALISTA (SDF + texturas procedurales): una persona caminando por la acera. Para banda.js
const SP = require('./sdf_persona'), M = require('../../sdf/motor'), G = globalThis;
const SOL = G.SOLP; let S = null;
const sdBox = (x, y, z, bx, by, bz) => { const qx = Math.abs(x) - bx, qy = Math.abs(y) - by, qz = Math.abs(z) - bz; return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0); };
const fmod = (a, b) => ((a % b) + b) % b;
function suelo(x, y, z) { const gx = Math.abs(fmod(x + .25, .5) - .25), gz = Math.abs(fmod(z + .25, .5) - .25), j = Math.min(gx, gz); return y + (j < .008 ? .003 * (1 - j / .008) : 0); }
function pared(x, y, z) { let d = sdBox(x - .2, y - 2.2, z + 2.4, 3.4, 2.2, .2); d = Math.max(d, -sdBox(x + 1.2, y - 1.5, z + 2.2, 1.25, 1.15, .1)); d = Math.max(d, -sdBox(x - 1.65, y - 1.8, z + 2.2, .6, .7, .06)); return d; }
const E = {
  prepara(t) { if (!S || S.t !== t) { S = SP.construye(.15 + t * .9); S.t = t; } if (process.env.RETRATO) return { t, eye: [.9, 1.74, .55], target: [.02, 1.6, 0], fov: 25, far: 40, pasos: 320 }; return { t, eye: [2.3, 1.3, 3.0], target: [0, .93, 0], fov: 36, far: 40, pasos: 260 }; },
  map(sc, x, y, z, lejos) { let d = Math.min(suelo(x, y, z), pared(x, y, z)); const db = Math.hypot(x - .02, Math.max(0, Math.abs(y - .9) - .8), z) - .45; d = Math.min(d, db > (lejos || .1) ? db : SP.sdf(S, x, y, z, false, !!lejos)); return d; },
  cielo(sc, dx, dy, dz) { const t = Math.max(0, Math.min(1, dy * 2)); return [G.mix(.95, .4, t), G.mix(.9, .6, t), G.mix(.85, .92, t)]; },
  shade(sc, x, y, z, nx, ny, nz, dx, dy, dz, T, map) {
    const dS = suelo(x, y, z), dP = pared(x, y, z), db = Math.hypot(x - .02, Math.max(0, Math.abs(y - .9) - .8), z) - .45, dPer = db > .1 ? 1e9 : SP.sdf(S, x, y, z);
    let alb = [.7, .68, .65], spec = .05, rough = 30, piel = false, emit = [0, 0, 0], refl = 0, n = [nx, ny, nz], pelo = false;
    const bump = (f, k) => { const e = .0015, f0 = f(x, y, z), g = [(f(x + e, y, z) - f0) / e, (f(x, y + e, z) - f0) / e, (f(x, y, z + e) - f0) / e]; n = G.norm([n[0] - k * g[0], n[1] - k * g[1], n[2] - k * g[2]]); };
    if (dPer <= Math.min(dS, dP)) {
      const r = SP.sdf(S, x, y, z, true), part = r.parte ? r.parte.part : 'piel'; alb = SP.color(S, x, y, z, r.parte).map(v => Math.max(0, v) / 255);
      if (['piel', 'aleta', 'oreja', 'oreja_in', 'parpado'].includes(part)) { piel = true; spec = .25; rough = 40; bump((a, b, c) => G.vnoise3(a * 900, b * 900, c * 900), .00025); }
      else if (part === 'labio') { piel = true; spec = .5; rough = 70; }
      else if (part === 'ojo') { spec = 2.8; rough = 500; }
      else if (part === 'pestana') { spec = 0; }
      else if (part === 'esclera') { spec = 2.5; rough = 300; alb = [.86, .84, .8]; }
      else if (part === 'iris') { const l = G.invB(r.parte.B, [x - r.parte.c[0], y - r.parte.c[1], z - r.parte.c[2]]), rr = Math.hypot(l[1], l[2]) / .0062; alb = G.PERSONA.iris.map(v => v / 255 * (.6 + .5 * Math.abs(Math.sin(Math.atan2(l[1], l[2]) * 14)) * rr)); spec = 3; rough = 400; }
      else if (part === 'pupila') { alb = [.01, .01, .01]; spec = 3; rough = 400; }
      else if (part === 'pelo' || part === 'ceja') { pelo = true; spec = .6; alb = alb.map(v => v * (.75 + .5 * G.vnoise3(x * 60, y * 400, z * 60))); }
      else if (['camisa', 'manga', 'cuello_camisa'].includes(part)) { bump((a, b, c) => .5 * Math.sin(a * 1300) * Math.sin(b * 1300) + G.vnoise3(a * 40, b * 40, c * 40) * 6, .00018); spec = .04; }
      else if (part === 'pantalon') { bump((a, b, c) => Math.sin((a + b) * 1500) * .4 + G.vnoise3(a * 30, b * 60, c * 30) * 5, .00022); spec = .03; }
      else if (part === 'zapato') { spec = .3; rough = 50; } else if (part === 'boton' || part === 'hebilla') { spec = 1.5; rough = 120; } else if (part === 'cinturon') { spec = .5; rough = 60; }
    } else if (dP < dS) {
      const enEscap = x > -2.45 && x < .05 && y > .35 && y < 2.65 && z > -2.25, enVent = x > 1.05 && x < 2.25 && y > 1.1 && y < 2.5 && z > -2.25;
      if (enEscap) { alb = [.05, .06, .07]; refl = .45; spec = 2; rough = 300; emit = [.95, .78, .55].map(v => v * (.7 + .3 * G.vnoise3(x * 2, y * 2, 1))); }
      else if (enVent) { alb = [.05, .07, .09]; refl = .6; spec = 2; rough = 300; }
      else { const fila = Math.floor(y / .075), off = fila % 2 ? .11 : 0, junta = fmod(y, .075) < .011 || fmod(x + off, .22) < .011;
        alb = junta ? [.74, .71, .65] : [.62, .3, .22].map(v => v * (.8 + .35 * G.hash3(Math.floor((x + off) / .22), fila, 7)) * (.9 + .15 * G.vnoise3(x * 30, y * 30, 3)));
        if (!junta) bump((a, b, c) => G.vnoise3(a * 60, b * 60, c * 60), .0012); else n = G.norm([n[0], n[1], n[2] + .0]); }
    } else { const t = .9 + .14 * G.hash3(Math.floor(x / .5), Math.floor(z / .5), 2); alb = [.6 * t, .58 * t, .54 * t]; bump((a, b, c) => G.vnoise3(a * 40, 0, c * 40), .002); const jj = Math.min(Math.abs(fmod(x + .25, .5) - .25), Math.abs(fmod(z + .25, .5) - .25)); if (jj < .006) alb = [.4, .39, .37]; }
    // iluminación
    const [Nx, Ny, Nz] = n, ndl = Nx * SOL[0] + Ny * SOL[1] + Nz * SOL[2];
    const mapS = (a, b, c2) => E.map(sc, a, b, c2, .6); const sh = ndl > -.2 ? M.sombra(mapS, x + Nx * .004, y + Ny * .004, z + Nz * .004, SOL[0], SOL[1], SOL[2], 22, 6, 70) : 0;
    const ao = M.oclusion(mapS, x, y, z, Nx, Ny, Nz), sky = .5 + .5 * Ny;
    let dif = Math.max(0, ndl), sss = [0, 0, 0];
    if (piel) { const w = .35, wrap = Math.max(0, (ndl + w) / (1 + w)); dif = wrap; sss = [.35, .1, .05].map(v => v * Math.max(0, wrap - Math.max(0, ndl)) * 1.4); }
    const hv = G.norm([SOL[0] - dx, SOL[1] - dy, SOL[2] - dz]);
    let sp = Math.pow(Math.max(0, Nx * hv[0] + Ny * hv[1] + Nz * hv[2]), rough) * spec;
    if (pelo) { const tng = [0, 1, 0], th = tng[0] * hv[0] + tng[1] * hv[1] + tng[2] * hv[2]; sp = Math.pow(Math.sqrt(Math.max(0, 1 - th * th)), 60) * .5 * Math.max(0, ndl + .2); }
    const sunC = [1.35, 1.25, 1.1], skyC = [.3, .34, .42], bounce = [.2, .17, .14];
    const rd = dx * Nx + dy * Ny + dz * Nz, en = E.cielo(sc, dx - 2 * rd * Nx, dy - 2 * rd * Ny, dz - 2 * rd * Nz), fr = Math.pow(1 - Math.max(0, -rd), 5);
    const c = [0, 1, 2].map(k => alb[k] * (sunC[k] * dif * sh + (skyC[k] * sky + bounce[k] * (1 - sky)) * ao) + sss[k] * sh * alb[k] * 2 + sp * sh * sunC[k] + en[k] * (refl + fr * (piel ? .05 : .03)) * ao + emit[k]);
    return c;
  },
};
module.exports = E;
