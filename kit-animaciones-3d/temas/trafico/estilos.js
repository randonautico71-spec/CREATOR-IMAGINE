'use strict';
// Estilos del tema TRÁFICO sobre la misma escena (ESC.trafico): el natural es lowpoly; el resto son tratamientos de la imagen.
// Día: --dia en bin/tema.cjs (TRAF_DIA). Los estilos SDF (realista, clay, fieltro), vóxel, iso, partículas y muñecos necesitan su propia escena.
const TRAF_ESTILOS = ['lowpoly', 'info', 'toon', 'paper', 'pixel', 'dither', 'ascii', 'wire'];
function trafBordes(ctx, w, h, umbral = 40, col = [12, 14, 26]) { const img = ctx.getImageData(0, 0, w, h), d = img.data, L = new Float32Array(w * h); for (let i = 0; i < w * h; i++) L[i] = d[i * 4] * .3 + d[i * 4 + 1] * .59 + d[i * 4 + 2] * .11;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x, gx = L[i + 1] - L[i - 1], gy = L[i + w] - L[i - w]; if (Math.hypot(gx, gy) > umbral) { d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; } } ctx.putImageData(img, 0, 0); }
function trafPoster(ctx, w, h, n) { const img = ctx.getImageData(0, 0, w, h), d = img.data; for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) d[i + k] = Math.round(d[i + k] / 255 * n) / n * 255; ctx.putImageData(img, 0, 0); }
function renderTraf(est) {
  if (!TRAF_ESTILOS.includes(est)) throw new Error(`El tema tráfico aún no tiene el estilo "${est}". Hay: ${TRAF_ESTILOS.join(', ')}. Para otro estilo hay que escribir su escena.`);
  const t = globalThis.T_ANIM || 0, c = mk(W, H), ctx = c.getContext('2d');
  globalThis.TRAF_WIRE = est === 'wire'; ESC.trafico(ctx, t); globalThis.TRAF_WIRE = false;
  if (est === 'toon') { trafPoster(ctx, W, H, 6); trafBordes(ctx, W, H, 34); }
  else if (est === 'paper') { trafPoster(ctx, W, H, 9); const img = ctx.getImageData(0, 0, W, H), d = img.data, R = rng(5); for (let i = 0; i < d.length; i += 4) { const v = (R() - .5) * 18 + 6 * Math.sin(i * .0007); d[i] += v; d[i + 1] += v; d[i + 2] += v; } ctx.putImageData(img, 0, 0); }
  else if (est === 'pixel' || est === 'dither') { const lw = 270, lh = 480, p = mk(lw, lh), g = p.getContext('2d'); g.imageSmoothingEnabled = true; g.drawImage(c, 0, 0, lw, lh);
    if (est === 'pixel') quantize(g, lw, lh, ['#0b0f24', '#1a1d44', '#2c3a78', '#4a5aa8', '#7c8cd0', '#c8d0f0', '#ffffff', '#ffce78', '#ff5a66', '#3fe08f', '#2f8f5a', '#5ec8ff', '#8a96a8', '#c9ced8', '#6c7a90', '#e8f2f8', '#a9d3f2', '#5fa8e8', '#b0b4ba', '#e8d6be'].map(hex));
    else { const img = g.getImageData(0, 0, lw, lh), d = img.data, bay = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], pal = ['#0c1020', '#2c3f6e', '#7a9ac8', '#e6f0ff'].map(hex);
      for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) { const i = (y * lw + x) * 4, l = clamp((d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11) / 255 * 1.2), v = l * 3, k = Math.min(3, Math.floor(v) + ((v - Math.floor(v)) > (bay[y & 3][x & 3] + .5) / 16 ? 1 : 0)); d[i] = pal[k][0]; d[i + 1] = pal[k][1]; d[i + 2] = pal[k][2]; } g.putImageData(img, 0, 0); }
    ctx.imageSmoothingEnabled = false; ctx.drawImage(p, 0, 0, W, H); }
  else if (est === 'ascii') { const cols = 120, rows = 128, cw = W / cols, ch = H / rows, p = mk(cols, rows), g = p.getContext('2d'); g.drawImage(c, 0, 0, cols, rows); const d = g.getImageData(0, 0, cols, rows).data, chars = ' .`,:;~-=+*!?%#&$@';
    ctx.fillStyle = '#03050c'; ctx.fillRect(0, 0, W, H); ctx.font = 'bold 14px "DejaVu Sans Mono", monospace'; ctx.textBaseline = 'top';
    for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) { const i = (r * cols + q) * 4, l = (d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11) / 255, k = Math.min(chars.length - 1, Math.round(Math.pow(l, .55) * (chars.length - 1)));
      ctx.fillStyle = `rgb(${Math.min(255, d[i] * 1.6 + 30) | 0},${Math.min(255, d[i + 1] * 1.6 + 30) | 0},${Math.min(255, d[i + 2] * 1.6 + 30) | 0})`; ctx.fillText(chars[k], q * cw, r * ch); } }
  return c.toDataURL('image/png');
}
