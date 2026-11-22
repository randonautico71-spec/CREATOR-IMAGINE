'use strict';
// TEMA DELFÍN: el fondo marino del tema océano con un delfín mular (malla en temas/oceano/generado, SDF en temas/oceano/animales.js).
// Se carga después de temas/oceano/estilos.js: pone el delfín en el sitio del tiburón, vacía la ballena y adapta infografía, plano técnico y térmica.
(function () {
  const VACIA = { v: [], f: [], c: [] };
  COLOCA.tiburon = { pos: [.1, 3.0, 2.2], dir: [1, 0, .35], pitch: .16, v: 1.6, esc: 1.25 };
  COLOCA.ballena = { pos: [0, -50, 0], dir: [1, 0, 0], pitch: 0, v: 0 };
  MALLAS_MAR.tiburon = MALLAS_MAR.delfin; MALLAS_MAR.tiburon_lp = MALLAS_MAR.delfin_lp; MALLAS_MAR.ballena = VACIA; MALLAS_MAR.ballena_lp = VACIA;
  VOX_MAR.tiburon = VOX_MAR.delfin; VOX_MAR.u_tiburon = VOX_MAR.u_delfin; VOX_MAR.ballena = [];
  COLOCA_ISO.tiburon = { pos: [.2, 3.6, .8], dir: [1, 0, -.45], pitch: .12, esc: 2.0 };
  globalThis.TEMP_TIBURON = [.62, .3, 1.2];   // mamífero: más caliente que el agua (relativo, sin cifras)
  const D = p => colocaP(p, COLOCA.tiburon);
  EM.info = ctx => { const cam = CAMM(W, H); pintaMar(ctx, W, H, cam, { nieveO: { n: 400 }, niebla: { far: 80, max: .8 } });
    ctx.fillStyle = 'rgba(4,16,30,.35)'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = lin(ctx, 0, 0, 0, 300, [['rgba(4,16,30,.85)', 0], ['rgba(4,16,30,0)', 1]]); ctx.fillRect(0, 0, W, 300);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 60px "DejaVu Sans", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Delfín mular', W / 2, 130); ctx.fillStyle = '#a8d8ec'; ctx.font = '34px "DejaVu Sans", sans-serif'; ctx.fillText('modelado por código, rasgo a rasgo', W / 2, 186);
    ctx.font = 'bold 32px "DejaVu Sans", sans-serif'; ctx.textAlign = 'left';
    const marca = (p, lado, ty, txt, col = '#7ee0ff') => { const q = cam.P(p), w = ctx.measureText(txt).width, tx = lado < 0 ? 44 : W - 44 - w, lx = lado < 0 ? tx + w + 12 : tx - 12; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(lx, ty - 12); ctx.stroke(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(q[0], q[1], 7, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(6,20,36,.88)'; ctx.fillRect(tx - 12, ty - 40, w + 24, 56); ctx.strokeStyle = col; ctx.globalAlpha = .6; ctx.lineWidth = 2; ctx.strokeRect(tx - 12, ty - 40, w + 24, 56); ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.fillText(txt, tx, ty); };
    const pts = { melon: D([.9, .1, 0]), hocico: D([1.3, -.08, 0]), espir: D([.72, .2, 0]), dorsal: D([-.05, .48, 0]), pect: D([.38, -.32, .4]), cola: D([-1.42, 0, .2]), vientre: D([.2, -.27, .15]) };
    const yy = k => { const q = cam.P(pts[k]); return q[1]; };
    marca(pts.melon, 1, yy('melon') - 230, 'Melón: ecolocalización'); marca(pts.espir, -1, yy('espir') - 260, 'Espiráculo para respirar'); marca(pts.dorsal, -1, yy('dorsal') - 120, 'Aleta dorsal curvada');
    marca(pts.hocico, 1, yy('hocico') + 150, 'Hocico alargado'); marca(pts.pect, 1, yy('pect') + 280, 'Aletas pectorales'); marca(pts.cola, -1, yy('cola') + 150, 'Cola horizontal'); marca(pts.vientre, -1, yy('vientre') + 330, 'Lomo oscuro, vientre claro'); };
  EM.plano = ctx => { ctx.fillStyle = '#123f86'; ctx.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 30) { ctx.fillStyle = x % 150 ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.14)'; ctx.fillRect(x, 0, 1, H); } for (let y = 0; y < H; y += 30) { ctx.fillStyle = y % 150 ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.14)'; ctx.fillRect(0, y, W, 1); }
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3; ctx.strokeRect(30, 30, W - 60, H - 60);
    const vista = (ojo, arriba, esc, x, y, w, h) => { const [c] = vistaOrto('delfin', ojo, arriba, esc, 0, 0, w, h); ctx.drawImage(c, x, y); };
    ctx.fillStyle = '#fff'; ctx.font = 'bold 48px "DejaVu Sans Mono", monospace'; ctx.textAlign = 'left'; ctx.fillText('DELFÍN MULAR', 70, 120); ctx.font = '26px "DejaVu Sans Mono", monospace';
    ctx.fillText('ALZADO', 70, 200); vista([0, 0, 40], [0, 1, 0], 320, 60, 220, 960, 420);
    ctx.fillText('PLANTA', 70, 700); vista([0, 40, .001], [0, 0, -1], 320, 60, 720, 960, 500);
    ctx.fillText('VISTA FRONTAL', 70, 1290); vista([40, 0, .001], [0, 1, 0], 420, 60, 1310, 960, 420);
    const cota = (x0, x1, y, txt) => { ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); for (const [x, s] of [[x0, 1], [x1, -1]]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + s * 16, y - 7); ctx.lineTo(x + s * 16, y + 7); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.beginPath(); ctx.moveTo(x, y - 18); ctx.lineTo(x, y + 18); ctx.stroke(); } ctx.font = '24px "DejaVu Sans Mono", monospace'; ctx.textAlign = 'center'; ctx.fillText(txt, (x0 + x1) / 2, y - 12); ctx.textAlign = 'left'; };
    cota(540 - 1.6 * 320, 540 + 1.42 * 320, 660, 'LONGITUD TOTAL');
    ctx.strokeRect(W - 470, H - 190, 420, 140); ctx.font = '22px "DejaVu Sans Mono", monospace'; ctx.fillText('ESTUDIO DE FORMAS · NO A ESCALA', W - 455, H - 140); ctx.fillText('MODELADO POR CÓDIGO', W - 455, H - 100); ctx.fillText('LÁMINA ÚNICA', W - 455, H - 65); };
})();
