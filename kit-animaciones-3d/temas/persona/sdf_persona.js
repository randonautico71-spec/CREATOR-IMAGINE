'use strict';
// SDF de la persona a partir de personaHD: uniones suaves por grupos + piezas duras (ojos, botones...)
const vm = require('vm'), fs = require('fs'), path = require('path');
if (typeof globalThis.personaHD !== 'function') {
  globalThis.document = { createElement: () => ({ getContext: () => ({}) }) };
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../../estilos/motor3d.js'), 'utf8'));
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, 'modelo.js'), 'utf8'));
  vm.runInThisContext('Object.assign(globalThis,{norm,sub,mul,add,dot,cross,smooth,mix,clamp,fbm3,vnoise3,hash3,rng,rotY,rotZ,invB,colorPersona,PERSONA,SOLP})');
}
const G = globalThis, M = require('../../sdf/motor'), CB = require('./cabeza');
const DUROS = new Set(['esclera', 'iris', 'pupila', 'boton', 'hebilla', 'cordon']);
const KG = { tronco: .045, piernaD: .03, piernaI: .03, brazoD: .02, brazoI: .02, cabeza: .012, pelo: .012 };
function smin(a, b, k) { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * .25; }
function construye(t = .15) {
  const P = G.personaHD(t, { sinCabeza: true }), grupos = {}, hc = P.hc;
  for (const q of P) { const g = DUROS.has(q.part) ? 'duro' : q.grupo; (grupos[g] = grupos[g] || { partes: [], k: KG[g] || .01 }).partes.push(q); }
  for (const g of Object.values(grupos)) { let c = [0, 0, 0]; for (const q of g.partes) c = G.add(c, q.c); c = G.mul(c, 1 / g.partes.length); let r = 0; for (const q of g.partes) r = Math.max(r, Math.hypot(...G.sub(q.c, c)) + Math.max(...q.s)); g.c = c; g.r = r + .03; }
  grupos.cabeza.c = [hc[0], hc[1] - .04, 0]; grupos.cabeza.r = .2;
  return { P, grupos, hc };
}
function dParte(q, x, y, z) { const l = G.invB(q.B, [x - q.c[0], y - q.c[1], z - q.c[2]]); return M.sdEll(l[0], l[1], l[2], q.s[0], q.s[1], q.s[2]); }
// distancia; con 'conParte' devuelve también la pieza más cercana
function sdf(S, x, y, z, conParte, exacto) {
  let dCuerpo = 1e9, dDuro = 1e9, parte = null, mejor = 1e9;
  for (const nombre in S.grupos) { const g = S.grupos[nombre], db = Math.hypot(x - g.c[0], y - g.c[1], z - g.c[2]) - g.r; if (db > (exacto ? .5 : .04) && !conParte) { if (nombre === 'duro') dDuro = Math.min(dDuro, db); else dCuerpo = Math.min(dCuerpo, db); continue; }
    if (nombre === 'duro') { for (const q of g.partes) { const d = dParte(q, x, y, z); if (d < dDuro) dDuro = d; if (conParte && d < mejor) { mejor = d; parte = q; } } continue; }
    let dg = 1e9; for (const q of g.partes) { const d = dParte(q, x, y, z); dg = dg === 1e9 ? d : smin(dg, d, g.k); if (conParte && d < mejor + (q.s[0] < .02 ? .002 : 0)) { mejor = d; parte = q; } }
    if (nombre === 'cabeza') { const lx = x - S.hc[0], ly = y - S.hc[1], lz = z - S.hc[2]; if (conParte) { const [dh, tg] = CB.cabezaSDF(lx, ly, lz, true); if (dh < mejor + .001) { mejor = dh; parte = { part: tg, cab: true, q: [lx, ly, lz] }; } dg = smin(dg, dh, .02); } else dg = smin(dg, CB.cabezaSDF(lx, ly, lz), .02); }
    if (nombre === 'pelo') dg -= .004 * G.vnoise3(x * 160, y * 50, z * 160);
    if (/pierna|tronco/.test(nombre) && dg < .02) dg -= .0035 * G.vnoise3(x * 18, y * 30, z * 18);
    dCuerpo = dCuerpo === 1e9 ? dg : smin(dCuerpo, dg, nombre === 'pelo' ? .006 : .02);
  }
  const d = Math.min(dCuerpo, dDuro);
  return conParte ? { d, parte } : d;
}
function color(S, x, y, z, parte) { if (parte && parte.cab) return CB.cabezaColor(parte.q[0], parte.q[1], parte.q[2], parte.part, G.vnoise3).map(v => v * 255); return G.colorPersona([x, y, z], parte ? parte.part : 'piel', [0, 0, 0]); }
module.exports = { construye, sdf, dParte, color };
