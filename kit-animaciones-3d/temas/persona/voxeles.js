const SP = require('./sdf_persona'), fs = require('fs'), G = globalThis;
const S = SP.construye(.15), u = .022, out = [];
for (let j = 0; j < 86; j++) for (let k = -16; k <= 16; k++) for (let i = -20; i <= 22; i++) { const x = (i + .5) * u, y = (j + .5) * u, z = (k + .5) * u; if (SP.sdf(S, x, y, z) < 0) { const r = SP.sdf(S, x, y, z, true), c = SP.color(S, x, y, z, r.parte); out.push([i, j, k, ...c.map(v => Math.round(Math.max(0, Math.min(255, v))))]); } }
const path = require('path'), dst = path.join(__dirname, 'generado', 'vox_persona.js'); fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.writeFileSync(dst, 'const VOX_PERSONA=' + JSON.stringify({ u, v: out }) + ';'); console.log('vóxeles', out.length);
