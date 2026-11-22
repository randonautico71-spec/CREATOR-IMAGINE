/* EJEMPLO · muñeco caminando por una calle al atardecer (escenario hecho para este ejemplo; en cada vídeo se crea el suyo).
   node bin/estilo.cjs munecos_ciudad salida --stills 2 --extra munecos/munecos.js,munecos/ciudad.js */
(function () {
  const W = 1080, H = 1920, M = MUN, TAU = Math.PI * 2;
  const h = (n) => { const v = Math.sin(n * 91.7 + 12.3) * 43758.5453; return v - Math.floor(v); };
  const PEA = M.persona({ color: 'turquesa', accesorio: 'gorra', mochila: 'amarillo' });
  const PEA2 = M.persona({ color: 'rosa', accesorio: 'coleta', pelo: '#3b2a22', bufanda: 'rosa' });
  const yo = M.actor(PEA, { x: -2.0, acciones: [{ t: 0, a: 'andar', hasta: 6 }] });
  const otra = M.actor(PEA2, { x: 5.6, dir: -1, escala: .92, acciones: [{ t: 0, a: 'andar', hasta: -6, brazos: 'movil', objeto: 'movil' }] });
  const edificio = (ctx, x, w, alto, col, semilla, luz = 1) => {
    ctx.fillStyle = col; ctx.fillRect(x, -alto, w, alto);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x + w - .12, -alto, .12, alto);                    // canto en sombra
    ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(x - .05, -alto - .08, w + .1, .1);            // cornisa
    const cols = Math.max(2, Math.floor(w / .55)), fil = Math.floor((alto - .9) / .62);
    for (let f = 0; f < fil; f++) for (let c = 0; c < cols; c++) { const wx = x + (c + .5) * w / cols - .14, wy = -alto + .45 + f * .62, enc = h(semilla * 31 + f * 7 + c) > .45;
      ctx.fillStyle = enc ? `rgba(255,${200 + 30 * h(f + c)},${120 + 40 * h(c * 3 + f)},${.75 * luz})` : 'rgba(20,24,40,.85)'; ctx.fillRect(wx, wy, .28, .36);
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(wx, wy + .36, .28, .03); } };
  const farola = (ctx, x) => { ctx.strokeStyle = '#2b3140'; ctx.lineWidth = .05; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, -1.75); ctx.quadraticCurveTo(x, -1.95, x + .25, -1.95); ctx.stroke();
    const g = ctx.createRadialGradient(x + .27, -1.88, 0, x + .27, -1.88, 1.2); g.addColorStop(0, 'rgba(255,220,150,.55)'); g.addColorStop(1, 'rgba(255,220,150,0)'); ctx.fillStyle = g; ctx.fillRect(x - 1, -3.1, 2.6, 3.1);
    ctx.fillStyle = '#ffe2a8'; ctx.beginPath(); ctx.ellipse(x + .27, -1.9, .1, .05, 0, 0, TAU); ctx.fill(); };
  const arbol = (ctx, x, t) => { ctx.fillStyle = '#5a3d2b'; ctx.fillRect(x - .04, -.9, .08, .9); ctx.fillStyle = '#2f6b45'; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(x + Math.cos(k * 1.3) * .2 + .015 * Math.sin(t + k), -1.15 + Math.sin(k * 1.9) * .15, .28, 0, TAU); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.beginPath(); ctx.arc(x - .1, -1.3, .18, 0, TAU); ctx.fill(); ctx.fillStyle = '#3d4352'; ctx.fillRect(x - .18, -.12, .36, .12); };
  const escaparate = (ctx, x, w) => { ctx.fillStyle = '#c84b3c'; ctx.fillRect(x - .05, -2.45, w + .1, .55);                                              // fachada baja
    ctx.fillStyle = '#ffe9c2'; ctx.fillRect(x, -1.6, w, 1.45); const g = ctx.createLinearGradient(0, -1.6, 0, -.15); g.addColorStop(0, 'rgba(255,190,110,.55)'); g.addColorStop(1, 'rgba(255,240,210,.1)'); ctx.fillStyle = g; ctx.fillRect(x, -1.6, w, 1.45);
    for (let k = 0; k < 4; k++) { const sx = x + .3 + k * (w - .6) / 3; ctx.fillStyle = ['#3d7be8', '#f2b632', '#3fae6a', '#e86aa6'][k]; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(sx - .12, -.75, .24, .32, .04) : ctx.rect(sx - .12, -.75, .24, .32); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.moveTo(x, -1.6); ctx.lineTo(x + .6, -1.6); ctx.lineTo(x, -.9); ctx.fill();
    ctx.strokeStyle = '#2b3140'; ctx.lineWidth = .05; ctx.strokeRect(x, -1.6, w, 1.45);
    for (let k = 0; k < 7; k++) { ctx.fillStyle = k % 2 ? '#f4efe6' : '#c84b3c'; ctx.beginPath(); ctx.moveTo(x - .1 + k * (w + .2) / 7, -1.95); ctx.lineTo(x - .1 + (k + 1) * (w + .2) / 7, -1.95); ctx.lineTo(x - .1 + (k + 1) * (w + .2) / 7 + .05, -1.7); ctx.lineTo(x - .1 + k * (w + .2) / 7 + .05, -1.7); ctx.fill(); } };
  const PLAN = M.plan([{ dur: 5, cam: { de: { x: -.9, y: -1.25, zoom: .78 }, a: { x: .9, y: -1.2, zoom: .86 }, curva: 'lineal' }, fondo: false, pinta: (ctx, tl) => {
    const camX = -.9 + 1.8 * tl / 5;
    // cielo de atardecer
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1b1f3b'); g.addColorStop(.45, '#4b3a6b'); g.addColorStop(.62, '#e58a5e'); g.addColorStop(.7, '#f5c27a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
    ctx.save(); ctx.fillStyle = 'rgba(255,240,200,.9)'; ctx.beginPath(); ctx.arc(camX + 1.9, -4.2, .45, 0, TAU); ctx.fill(); ctx.restore();
    // capas con paralaje: lejos (silueta), medio (edificios con ventanas), cerca (acera)
    ctx.save(); ctx.translate(camX * .7, 0); ctx.fillStyle = '#2c2a4a'; for (let k = -6; k < 8; k++) { const w = .8 + h(k) * 1.1, a = 3.5 + h(k + 9) * 4.5; ctx.fillRect(k * 1.2, -a - 1.2, w, a + 1.2); } ctx.restore();
    ctx.save(); ctx.translate(camX * .35, 0); const cols = ['#5b5576', '#6d5a6e', '#4f5b7a', '#7a6a62', '#58627d']; let x = -7; for (let k = 0; x < 8; k++) { const w = 1.6 + h(k * 3) * 1.4, a = 3.2 + h(k * 5 + 1) * 3.2; edificio(ctx, x, w, a, cols[k % cols.length], k + 3, .9); x += w + .08; } ctx.restore();
    escaparate(ctx, -1.2, 2.4); edificio(ctx, -1.25, 2.5, -0, '#000', 0);
    ctx.fillStyle = '#8a8f9c'; ctx.fillRect(-12, 0, 24, .1); ctx.fillStyle = '#5f6472'; ctx.fillRect(-12, .1, 24, .05);                        // bordillo
    const s = ctx.createLinearGradient(0, -.02, 0, 3); s.addColorStop(0, '#b9bcc6'); s.addColorStop(.05, '#9ea2ae'); s.addColorStop(1, '#3a3d48'); ctx.fillStyle = s; ctx.fillRect(-12, .15, 24, 3);
    for (let k = -10; k < 12; k++) { ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(k * .9, .15, .02, 3); }
    farola(ctx, -3.1); farola(ctx, 2.6); arbol(ctx, 4.1, tl); arbol(ctx, -4.6, tl); M.props.banco(ctx, 3.4, 0, .7);
    M.dibujar(ctx, otra, tl + 1.6, { reflejo: .12 }); M.dibujar(ctx, yo, tl + 1.2, { reflejo: .14 });
  } }], { centroY: .6 });
  ESC.munecos_ciudad = (ctx, t = 0) => M.pintar(ctx, W, H, PLAN, t);
  ESC.munecos_ciudad.plan = PLAN;
})();
