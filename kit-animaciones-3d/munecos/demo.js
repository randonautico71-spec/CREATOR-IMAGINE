/* DEMOSTRACIÓN de los muñecos (cargar con: node bin/estilo.cjs <escena> salida --extra munecos/munecos.js,munecos/demo.js)
   ESC.munecos_fichas : ficha de personajes, expresiones y acciones (imagen fija)
   ESC.munecos_demo   : plan visual de ejemplo, 5 planos de 3–6 s con cámara en movimiento y transiciones (≈ 22 s) */
(function () {
  const W = 1080, H = 1920, M = MUN;
  const ANA = M.persona({ color: 'azul', accesorio: 'sombrero' }), LEO = M.persona({ color: 'amarillo', accesorio: 'gorra', mochila: 'naranja' });
  const RUT = M.persona({ color: 'rosa', accesorio: 'coleta', pelo: '#5b3a29', bufanda: 'rosa' }), PAU = M.persona({ color: 'verde', accesorio: 'boina', gafas: true, barba: true, pelo: '#4a4038' });
  const MIA = M.persona({ color: 'morado', accesorio: 'flequillo', pelo: '#2b2522', altura: .66 }), BEN = M.persona({ color: 'gris', accesorio: 'calvo', corbata: 'rojo', ancho: 1.15 });
  const etiqueta = (ctx, txt, x, y, tam = .07) => { ctx.save(); ctx.fillStyle = 'rgba(220,226,238,.85)'; ctx.font = `600 ${tam}px "DejaVu Sans", sans-serif`; ctx.textAlign = 'center'; ctx.fillText(txt, x, y); ctx.restore(); };
  ESC.munecos_fichas = (ctx, t = 0) => {
    M.fondo(ctx, W, H); ctx.save(); const k = H * .062; ctx.setTransform(k, 0, 0, k, W / 2, 0);
    const col = [-3.4, -1.7, 0, 1.7, 3.4];
    etiqueta(ctx, 'MUÑECOS · personajes', 0, 1.25, .5);
    const fila = (y, items) => { M.suelo(ctx, -4.6, 4.6, 'noche', .55); items.forEach(([per, acc, txt, extra], i) => { const ac = M.actor(per, Object.assign({ x: col[i], dir: 1, acciones: [{ t: 0, a: acc, ...(extra || {}) }] })); ctx.save(); ctx.translate(0, y); M.dibujar(ctx, ac, 1.3 + i * .37, { reflejo: .2 }); etiqueta(ctx, txt, col[i], .78, .27); ctx.restore(); }); };
    ctx.save(); ctx.translate(0, 0); ctx.restore();
    const filas = [
      [[ANA, 'quieto', 'sombrero'], [LEO, 'saludar', 'gorra'], [RUT, 'quieto', 'coleta', { cara: 'feliz' }], [PAU, 'pensar', 'boina'], [BEN, 'quieto', 'corbata']],
      [[ANA, 'andar', 'andar'], [LEO, 'correr', 'correr'], [RUT, 'sentado', 'sentarse'], [PAU, 'leer', 'leer', { objeto: 'libro' }], [MIA, 'saltar', 'saltar']],
      [[ANA, 'beber', 'beber', { objeto: 'taza' }], [LEO, 'senalar', 'señalar'], [RUT, 'celebrar', 'celebrar', { cara: 'feliz' }], [PAU, 'triste', 'triste', { cara: 'triste' }], [BEN, 'sorpresa', 'sorpresa', { cara: 'sorpresa' }]],
      [[ANA, 'movil', 'móvil', { objeto: 'movil' }], [LEO, 'empujar', 'empujar'], [RUT, 'llevarQuieto', 'llevar', { objeto: 'caja' }], [PAU, 'agotado', 'agotado', { cara: 'triste' }], [MIA, 'quieto', 'globo', { objeto: 'globo', cara: 'feliz' }]],
    ];
    filas.forEach((f, r) => { ctx.save(); ctx.translate(0, 3.3 + r * 3.05); fila(0, f); ctx.restore(); });
    ctx.restore();
    // expresiones
    ctx.save(); ctx.setTransform(k * 1.9, 0, 0, k * 1.9, W / 2, H * .985); const caras = ['neutra', 'feliz', 'triste', 'sorpresa', 'enfado', 'duda'];
    caras.forEach((c, i) => { const ac = M.actor(M.persona({ color: 'azul', accesorio: 'calvo', expresion: c }), { x: (i - 2.5) * .62, acciones: [{ t: 0, a: 'quieto' }] }); ctx.save(); ctx.beginPath(); ctx.rect(-5, -1.3, 10, .62); ctx.clip(); M.dibujar(ctx, ac, 0, { sombra: false }); ctx.restore(); etiqueta(ctx, c, (i - 2.5) * .62, -.6, .1); });
    ctx.restore();
  };
  // ---------- plan visual de ejemplo: «conseguir una meta y acostumbrarse» (5 planos, 3–6 s)
  const cuadroCohete = (c, w, h) => { c.fillStyle = '#16244a'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 25; i++) { c.fillRect((i * 37 % 100) / 100 * w, (i * 53 % 100) / 100 * h, .012, .012); }
    c.save(); c.translate(w * .55, h * .45); c.rotate(.75); c.fillStyle = '#eef2f7'; c.beginPath(); c.ellipse(0, 0, w * .09, h * .3, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#e5534b'; c.beginPath(); c.ellipse(0, -h * .24, w * .06, h * .08, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#f2b632'; c.beginPath(); c.ellipse(0, h * .34, w * .06, h * .1, 0, 0, Math.PI * 2); c.fill(); c.restore(); };
  const A1 = M.actor(ANA, { x: -2.4, acciones: [{ t: 0, a: 'andar', hasta: -.35 }, { t: 3.2, a: 'senalarArriba', cara: 'feliz' }] });
  const A2 = M.actor(ANA, { x: -.6, acciones: [{ t: 0, a: 'celebrar', cara: 'feliz' }, { t: 2.4, a: 'andar', hasta: .55 }, { t: 3.6, a: 'sentarse', mira: -1, objeto: 'taza' }] });
  const A3 = M.actor(ANA, { x: .55, dir: -1, acciones: [{ t: 0, a: 'sentado', brazos: 'beber', objeto: 'taza', cara: 'neutra' }, { t: 2.6, a: 'sentado', brazos: 'beber', objeto: 'taza', cara: 'duda' }] });
  const B3 = M.actor(LEO, { x: 2.6, dir: -1, acciones: [{ t: 0, a: 'andar', hasta: 1.35 }, { t: 2.2, a: 'saludar', cara: 'feliz' }, { t: 3.4, a: 'senalar' }] });
  const A4 = M.actor(ANA, { x: -.2, acciones: [{ t: 0, a: 'pensar', cara: 'duda' }, { t: 2.2, a: 'encogerHombros', cara: 'neutra' }] });
  const B4 = M.actor(LEO, { x: .6, dir: -1, acciones: [{ t: 0, a: 'senalar', cara: 'feliz' }, { t: 2, a: 'quieto' }] });
  const salaUno = (ctx, tl, actores, prop) => { M.sala(ctx, { x: -2, ancho: 4, alto: 2.4 }); M.suelo(ctx, -2, 2, 'noche', 1.2); if (prop) prop(ctx, tl); for (const a of actores) M.dibujar(ctx, a, tl, { reflejo: .22 }); };
  const VINETAS = [['correr', 'amarillo', 'gorra'], ['leer', 'verde', 'boina', 'libro'], ['triste', 'gris', 'calvo'], ['celebrar', 'rosa', 'coleta'], ['movil', 'morado', 'flequillo', 'movil'], ['dormir', 'naranja', 'pelo'], ['empujar', 'turquesa', 'gorra'], ['beber', 'azul', 'sombrero', 'taza']];
  const PLAN = M.plan([
    { dur: 4, cam: { de: { x: -1.6, y: -.7, zoom: .62 }, a: { x: -.4, y: -.8, zoom: .85 } }, pinta: (ctx, tl) => salaUno(ctx, tl, [A1], c => M.props.cuadro(c, .9, -.75, .95, 1.15, cuadroCohete)) },
    { dur: 4.5, entrada: 'zoom', cam: { de: { x: 0, y: -.65, zoom: 1.15 }, a: { x: .25, y: -.6, zoom: .95 } }, pinta: (ctx, tl) => salaUno(ctx, tl, [A2], c => { M.props.cuadro(c, -1.1, -.75, .95, 1.15, cuadroCohete); M.props.banco(c, .55); }) },
    { dur: 5, entrada: 'barrido', cam: { de: { x: .4, y: -.6, zoom: 1.0 }, a: { x: 1.0, y: -.6, zoom: 1.12 } }, pinta: (ctx, tl) => salaUno(ctx, tl, [A3, B3], c => { M.props.banco(c, .55); M.props.planta(c, -1.6, 0, tl); }) },
    { dur: 3.5, entrada: 'fundido', cam: { de: { x: .2, y: -.85, zoom: 1.6 }, a: { x: .2, y: -.8, zoom: 1.35 } }, pinta: (ctx, tl) => salaUno(ctx, tl, [A4, B4], c => M.props.lampara(c, -1.4, 0, 1)) },
    { dur: 5, entrada: 'zoom', cam: { de: { x: 0, y: -1.2, zoom: 1.0 }, a: { x: 0, y: -4.5, zoom: .33 }, curva: 'suave' }, pinta: (ctx, tl) => {
      // edificio: 3 × 5 habitaciones, cada una con su viñeta
      for (let f = 0; f < 5; f++) for (let c = 0; c < 3; c++) { const x0 = (c - 1) * 3.1, y0 = -f * 2.6; ctx.save(); ctx.translate(x0, y0); M.sala(ctx, { x: -1.45, ancho: 2.9, alto: 2.4, luz: .6 }); M.suelo(ctx, -1.45, 1.45, 'noche', .2);
        if (f === 0 && c === 1) { M.props.banco(ctx, .4); M.dibujar(ctx, A3, tl + 3, { reflejo: .2 }); }
        else { const v = VINETAS[(f * 3 + c) % VINETAS.length]; M.dibujar(ctx, M.actor(M.persona({ color: v[1], accesorio: v[2] }), { x: -.2, fase: f + c, acciones: [{ t: 0, a: v[0], objeto: v[3] || null, cara: v[0] === 'triste' ? 'triste' : v[0] === 'celebrar' ? 'feliz' : 'neutra' }] }), tl, { reflejo: .18 }); }
        ctx.restore(); } } },
  ]);
  ESC.munecos_demo = (ctx, t = 0) => { M.pintar(ctx, W, H, PLAN, t); };
  ESC.munecos_demo.plan = PLAN;
})();
