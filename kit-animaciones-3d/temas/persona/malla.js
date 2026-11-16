// carga la malla de la persona (persona_malla.json) como caras para motor3d
function cargaPersona(json, o = {}) { const m = json, F = [], pos = o.pos || [0, 0, 0];
  for (let i = 0; i < m.f.length; i += 3) { const P = [0, 1, 2].map(k => { const j = m.f[i + k] * 3; return add(pos, rotY([m.v[j], m.v[j + 1], m.v[j + 2]], o.rot || 0)); }); F.push({ p: o.invertir ? P.reverse() : P, col: [m.c[i], m.c[i + 1], m.c[i + 2]] }); }
  return F; }
