'use strict';
// Mini motor 3D por código (Canvas 2D, sin GPU, sin ficheros externos)
const W = 1080, H = 1920;
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const mix = (a, b, t) => a + (b - a) * t;
const mixc = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const hex = h => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
const css = (c, a = 1) => `rgba(${clamp(c[0], 0, 255) | 0},${clamp(c[1], 0, 255) | 0},${clamp(c[2], 0, 255) | 0},${a})`;
const jit = (c, k) => c.map(v => v * k);
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash3(x, y, z) { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(z | 0, 1274126177)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function vnoise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const s = t => t * t * (3 - 2 * t);
  const xf = s(x - xi), yf = s(y - yi), zf = s(z - zi);
  const c = (a, b, d) => hash3(xi + a, yi + b, zi + d);
  return mix(mix(mix(c(0, 0, 0), c(1, 0, 0), xf), mix(c(0, 1, 0), c(1, 1, 0), xf), yf),
             mix(mix(c(0, 0, 1), c(1, 0, 1), xf), mix(c(0, 1, 1), c(1, 1, 1), xf), yf), zf);
}
function fbm3(x, y, z, o = 5) { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < o; i++) { s += a * vnoise3(x * f, y * f, z * f); n += a; a *= 0.5; f *= 2.03; } return s / n; }
const rotY = (p, a) => [p[0] * Math.cos(a) + p[2] * Math.sin(a), p[1], -p[0] * Math.sin(a) + p[2] * Math.cos(a)];
const rotX = (p, a) => [p[0], p[1] * Math.cos(a) - p[2] * Math.sin(a), p[1] * Math.sin(a) + p[2] * Math.cos(a)];
const rotZ = (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a), p[2]];
function lin(g, x0, y0, x1, y1, stops) { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([c, s]) => gr.addColorStop(s, c)); return gr; }

function camera(eye, target, o = {}) {
  const w = o.w || W, h = o.h || H, up = o.up || [0, 1, 0];
  const f = norm(sub(target, eye)), r = norm(cross(f, up)), u = cross(r, f);
  const focal = (h / 2) / Math.tan((o.fov || 50) * Math.PI / 360);
  const cx = o.cx ?? w / 2, cy = o.cy ?? h / 2, ortho = o.ortho || 0;
  const cam = { eye, f, r, u, w, h, ortho, focal,
    toCam: p => { const d = sub(p, eye); return [dot(d, r), dot(d, u), dot(d, f)]; },
    proj: c => ortho ? [cx + c[0] * ortho, cy - c[1] * ortho, c[2]] : [cx + c[0] * focal / c[2], cy - c[1] * focal / c[2], c[2]] };
  cam.P = p => cam.proj(cam.toCam(p));
  return cam;
}
function newell(p) { const n = [0, 0, 0]; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]); } return norm(n); }
const centroid = p => { let c = [0, 0, 0]; for (const q of p) c = add(c, q); return mul(c, 1 / p.length); };
function orientTo(faces, center) { for (const f of faces) { if (dot(newell(f.p), sub(centroid(f.p), center)) < 0) f.p.reverse(); } return faces; }
const quad = (a, b, c, d, col, x = {}) => ({ p: [a, b, c, d], col, ...x });
const tri = (a, b, c, col, x = {}) => ({ p: [a, b, c], col, ...x });
function box(F, x0, y0, z0, x1, y1, z1, col, o = {}) {
  const side = o.side || col, s = o.skip || {}, x = o.f || {};
  if (!s.top) F.push(quad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], o.top || col, x));
  if (!s.bottom) F.push(quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], o.bottom || side, x));
  if (!s.front) F.push(quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], o.front || side, x));
  if (!s.back) F.push(quad([x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0], o.back || side, x));
  if (!s.right) F.push(quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], o.right || side, x));
  if (!s.left) F.push(quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], o.left || side, x));
}
function dedupe(pts) { return pts.filter((p, i) => { const q = pts[(i + pts.length - 1) % pts.length]; return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) > 1e-7; }); }
function lathe(F, prof, seg, colFn, center, cx = 0, cz = 0, xf = p => p) {
  const out = [];
  for (let i = 0; i < prof.length - 1; i++) for (let j = 0; j < seg; j++) {
    const a0 = j / seg * 2 * Math.PI, a1 = (j + 1) / seg * 2 * Math.PI;
    const P = (k, a) => xf([cx + prof[k][0] * Math.cos(a), prof[k][1], cz + prof[k][0] * Math.sin(a)]);
    const pts = dedupe([P(i, a0), P(i, a1), P(i + 1, a1), P(i + 1, a0)]);
    if (pts.length < 3) continue;
    out.push({ p: pts, col: colFn((prof[i][1] + prof[i + 1][1]) / 2, a0) });
  }
  orientTo(out, xf(center)); F.push(...out); return out;
}
function sphere(F, c, r, nLat, nLon, colFn, o = {}) {
  const sc = o.scale || [1, 1, 1], out = [];
  const P = (i, j) => { const th = i / nLat * Math.PI, ph = j / nLon * 2 * Math.PI; const d = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)]; const rr = r * (o.disp ? o.disp(d) : 1); return add(c, [d[0] * rr * sc[0], d[1] * rr * sc[1], d[2] * rr * sc[2]]); };
  for (let i = 0; i < nLat; i++) for (let j = 0; j < nLon; j++) {
    const pts = dedupe([P(i, j), P(i, j + 1), P(i + 1, j + 1), P(i + 1, j)]);
    if (pts.length >= 3) out.push({ p: pts, col: colFn(centroid(pts), i, j) });
  }
  orientTo(out, c); F.push(...out); return out;
}

function render(ctx, cam, faces, o = {}) {
  const L = norm(o.light || [0.4, 0.8, 0.3]), amb = o.amb ?? 0.35, lc = o.lightCol || [1, 1, 1], ac = o.ambCol || [1, 1, 1];
  const items = [];
  for (const f of faces) {
    const cs = f.p.map(cam.toCam);
    if (!cam.ortho && cs.some(c => c[2] < 0.05)) continue;
    let n = newell(f.p);
    const view = cam.ortho ? cam.f : norm(sub(centroid(f.p), cam.eye));
    if (dot(n, view) >= 0) { if (f.two || o.two) n = mul(n, -1); else continue; }
    const ps = cs.map(cam.proj);
    let z = 0; for (const c of cs) z += c[2]; z /= cs.length; if (f.zb) z += f.zb;
    let col;
    if (f.emit) col = f.col;
    else { let d = Math.max(0, dot(n, L)); if (o.toon) d = o.toon(d); col = [0, 1, 2].map(k => f.col[k] * (ac[k] * amb + lc[k] * (1 - amb) * d)); }
    if (o.fog) col = mixc(col, o.fog.col, clamp((z - o.fog.near) / (o.fog.far - o.fog.near)) * (o.fog.max ?? 1));
    items.push({ ps, z, col });
  }
  items.sort((a, b) => b.z - a.z);
  ctx.lineJoin = 'round';
  for (const it of items) {
    ctx.beginPath(); ctx.moveTo(it.ps[0][0], it.ps[0][1]);
    for (let i = 1; i < it.ps.length; i++) ctx.lineTo(it.ps[i][0], it.ps[i][1]);
    ctx.closePath();
    if (o.wire) {
      ctx.fillStyle = o.wire.fill; ctx.fill();
      ctx.strokeStyle = o.wire.glow; ctx.lineWidth = o.wire.gw; ctx.stroke();
      ctx.strokeStyle = o.wire.line; ctx.lineWidth = o.wire.lw; ctx.stroke();
    } else {
      const c = css(it.col); ctx.fillStyle = c; ctx.fill();
      if (o.seam !== 0) { ctx.strokeStyle = c; ctx.lineWidth = o.seam ?? 1; ctx.stroke(); }
    }
  }
  return items;
}
function quantize(g, w, h, pal) {
  const img = g.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    let best = 0, bd = 1e9;
    for (let k = 0; k < pal.length; k++) { const p = pal[k]; const e = (d[i] - p[0]) ** 2 * 0.3 + (d[i + 1] - p[1]) ** 2 * 0.59 + (d[i + 2] - p[2]) ** 2 * 0.11; if (e < bd) { bd = e; best = k; } }
    d[i] = pal[best][0]; d[i + 1] = pal[best][1]; d[i + 2] = pal[best][2]; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
}
