/* EJEMPLO · muñecos en un muelle viendo saltar a un delfín (escenario y delfín hechos para este ejemplo).
   node bin/estilo.cjs munecos_delfin salida --stills 2 --extra munecos/munecos.js,munecos/delfin.js */
(function () {
  const W = 1080, H = 1920, M = MUN, TAU = Math.PI * 2;
  /* Delfín 2D con el mismo trazo que los muñecos (contorno oscuro fino, colores planos con un poco de luz). x,y = centro; ang = giro; s = largo */
  M.props.delfin = (ctx, x, y, ang = 0, s = 1.6, t = 0) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s / 1.6, s / 1.6); ctx.lineJoin = 'round'; ctx.lineWidth = .025; ctx.strokeStyle = '#20242d';
    const cola = .06 * Math.sin(t * 6);
    const cuerpo = () => { ctx.beginPath(); ctx.moveTo(.86, .03);                                             // punta del hocico
      ctx.quadraticCurveTo(.74, .0, .62, -.04); ctx.bezierCurveTo(.58, -.17, .38, -.22, .18, -.21);            // melón y lomo
      ctx.bezierCurveTo(-.15, -.2, -.45, -.12, -.66, -.04 + cola * .5);                                     // pedúnculo
      ctx.lineTo(-.7, .02 + cola * .5); ctx.bezierCurveTo(-.45, .1, -.1, .16, .2, .15); ctx.bezierCurveTo(.45, .14, .62, .1, .86, .05); ctx.closePath(); };
    ctx.fillStyle = '#7f97b3'; cuerpo(); ctx.fill();
    ctx.save(); cuerpo(); ctx.clip(); ctx.fillStyle = '#e9eef4'; ctx.beginPath(); ctx.moveTo(.86, .045); ctx.bezierCurveTo(.5, .02, .1, .05, -.5, .02); ctx.lineTo(-.6, .3); ctx.lineTo(.9, .3); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.beginPath(); ctx.ellipse(.15, -.14, .3, .04, -.05, 0, TAU); ctx.fill(); ctx.restore();
    cuerpo(); ctx.stroke();
    ctx.fillStyle = '#6c84a1'; ctx.beginPath(); ctx.moveTo(.05, -.2); ctx.quadraticCurveTo(-.02, -.36, -.17, -.42); ctx.quadraticCurveTo(-.12, -.3, -.15, -.2); ctx.closePath(); ctx.fill(); ctx.stroke();       // dorsal
    ctx.beginPath(); ctx.moveTo(.32, .1); ctx.quadraticCurveTo(.22, .24, .1, .29); ctx.quadraticCurveTo(.16, .17, .18, .12); ctx.closePath(); ctx.fill(); ctx.stroke();                                         // pectoral
    ctx.save(); ctx.translate(-.68, -.01 + cola * .5); ctx.rotate(cola); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-.08, -.16, -.2, -.2); ctx.quadraticCurveTo(-.14, -.06, -.12, 0); ctx.quadraticCurveTo(-.14, .06, -.2, .2); ctx.quadraticCurveTo(-.08, .16, 0, 0); ctx.fill(); ctx.stroke(); ctx.restore();   // cola
    ctx.fillStyle = '#1b1e25'; ctx.beginPath(); ctx.ellipse(.5, -.05, .022, .026, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(.507, -.058, .007, 0, TAU); ctx.fill();
    ctx.lineWidth = .014; ctx.beginPath(); ctx.moveTo(.86, .045); ctx.quadraticCurveTo(.72, .06, .6, .03); ctx.stroke();                                                                                       // sonrisa
    ctx.restore(); };
  const ola = (ctx, x0, x1, y, amp, fase, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x0, 6); ctx.lineTo(x0, y); for (let x = x0; x <= x1; x += .1) ctx.lineTo(x, y + Math.sin(x * 2.2 + fase) * amp + Math.sin(x * 5.1 - fase * 1.3) * amp * .4); ctx.lineTo(x1, 6); ctx.closePath(); ctx.fill(); };
  const ANA = M.persona({ color: 'azul', accesorio: 'sombrero' }), MIA = M.persona({ color: 'morado', accesorio: 'flequillo', pelo: '#2b2522', altura: .68 });
  const ana = M.actor(ANA, { x: -.95, dir: 1, acciones: [{ t: 0, a: 'senalar', cara: 'sorpresa' }] });
  const mia = M.actor(MIA, { x: -1.6, dir: 1, escala: .68, acciones: [{ t: 0, a: 'celebrar', cara: 'feliz' }] });
  const PLAN = M.plan([{ dur: 5, cam: { de: { x: .1, y: -1.0, zoom: .5 }, a: { x: .35, y: -1.05, zoom: .56 } }, fondo: false, pinta: (ctx, tl) => {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2c3f7a'); g.addColorStop(.42, '#d77a6a'); g.addColorStop(.58, '#f4c27f'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
    ctx.fillStyle = 'rgba(255,236,190,.95)'; ctx.beginPath(); ctx.arc(1.9, -.45, .5, 0, TAU); ctx.fill();
    for (const [cx, cy, s] of [[-1.5, -4.2, 1], [2.2, -3.4, .8], [.4, -5.2, .6]]) { ctx.fillStyle = 'rgba(255,240,230,.85)'; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(cx + (k - 1.5) * .32 * s, cy - (k % 2) * .12 * s, .26 * s, 0, TAU); ctx.fill(); } }
    ola(ctx, -8, 8, -.05, .03, tl * .8, '#2f5e8f'); ctx.fillStyle = 'rgba(255,220,170,.35)'; for (let k = 0; k < 9; k++) ctx.fillRect(1.9 - .5 + k * .12 - .05, .05 + k * .08, .6 - k * .05, .025);
    // salto del delfín: arco desde el agua y vuelta al agua
    const f = ((tl * .3) % 1), px = .5 + f * 2.1, py = -.1 - Math.sin(f * Math.PI) * 1.35, ang = Math.atan2(-Math.cos(f * Math.PI) * 1.35 * Math.PI, 2.1);
    if (f < .12 || f > .85) { ctx.fillStyle = 'rgba(255,255,255,.85)'; const sx = f < .12 ? .5 : 2.6; for (let k = 0; k < 9; k++) { const a = -Math.PI * (k + .5) / 9; ctx.beginPath(); ctx.arc(sx + Math.cos(a) * .35, -.05 + Math.sin(a) * .3 * (1 + (k % 3) * .3), .045, 0, TAU); ctx.fill(); } }
    M.props.delfin(ctx, px, py, ang, 1.25, tl);
    for (let k = 0; k < 6; k++) { const a = f * 4 + k; ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.arc(px - Math.cos(ang) * (.6 + k * .12) + Math.sin(a) * .05, py - Math.sin(ang) * (.6 + k * .12) + .05, .025 - k * .003, 0, TAU); ctx.fill(); }
    ola(ctx, -8, 8, .12, .035, tl * 1.1 + 2, '#24507d'); ola(ctx, -8, 8, .45, .04, tl * 1.3 + 4, '#1d4269');
    // muelle de madera
    ctx.fillStyle = '#8a6040'; ctx.fillRect(-6, 0, 5.6, .14); ctx.fillStyle = '#6b4a31'; for (let k = 0; k < 6; k++) ctx.fillRect(-5.8 + k * .9, .14, .12, 1.4); ctx.strokeStyle = '#20242d'; ctx.lineWidth = .02; ctx.strokeRect(-6, 0, 5.6, .14);
    ctx.fillStyle = 'rgba(0,0,0,.18)'; for (let k = 0; k < 10; k++) ctx.fillRect(-6 + k * .52, 0, .015, .14);
    M.dibujar(ctx, mia, tl, { reflejo: 0 }); M.dibujar(ctx, ana, tl, { reflejo: 0 });
  } }], { centroY: .62 });
  ESC.munecos_delfin = (ctx, t = 0) => M.pintar(ctx, W, H, PLAN, t);
  ESC.munecos_delfin.plan = PLAN;
})();
