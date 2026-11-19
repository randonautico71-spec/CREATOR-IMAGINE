/* MUÑECOS · personajes 2.5D para vídeos explicativos (diseño propio del canal).
   Figuras blancas redondeadas con ojos de punto, expresión y un accesorio de color que identifica a cada uno.
   Esqueleto 2D con poses y acciones (andar, correr, sentarse, saludar, señalar, celebrar, pensar, beber, leer, triste,
   sorpresa, empujar, llevar, abrazar, saltar, caer, dormir…), mezcla suave entre acciones, sombra y reflejo en el suelo,
   y un sistema de PLANOS (cámara y transiciones) para montar un plan visual de cambios cada 3–6 s.
   Sin dependencias: funciona en el kit (bin/estilo.cjs --extra) y dentro del motor de Video-imagen (escenas.js).
   No usa ctx.filter ni shadowBlur. Todo depende solo de t (determinista).

   Coordenadas del MUNDO (las de los planos): unidades ≈ estatura de un muñeco; x a la derecha; y hacia ABAJO, suelo en y = 0
   (lo que está por encima del suelo tiene y negativa). Guía completa: kit-animaciones-3d/munecos/README.md */
(function (G) {
  'use strict';
  const MUN = G.MUN = G.MUN || {};
  const TAU = Math.PI * 2, cl = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x, mix = (a, b, t) => a + (b - a) * t;
  const ss = t => { t = cl(t); return t * t * (3 - 2 * t); };
  MUN.ease = { lineal: t => cl(t), suave: ss, entra: t => 1 - Math.pow(1 - cl(t), 3), sale: t => Math.pow(cl(t), 3) };
  MUN.ease.rebote = t => { t = cl(t); const s = 1.70158 * 1.4; return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); };
  const hash = (n) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

  // ---------------------------------------------------------------- aspecto
  MUN.TEMAS = {
    noche: { fondo: ['#0f1116', '#1a1d25'], piel: '#f2f4f7', pielLejos: '#c9ced8', trazo: '#20242d', ojo: '#1b1e25', suelo: '#16181e', sueloBrillo: '#2a2e38', pared: '#1b1e26', borde: '#9aa3b5', luz: 'rgba(255,240,210,', sombra: 'rgba(0,0,0,' },
    dia: { fondo: ['#e9edf3', '#d8dee8'], piel: '#ffffff', pielLejos: '#d7dce4', trazo: '#2b3140', ojo: '#222733', suelo: '#c9d0db', sueloBrillo: '#e3e8ef', pared: '#e4e8ee', borde: '#7d8798', luz: 'rgba(255,250,235,', sombra: 'rgba(30,40,60,' },
  };
  MUN.COLORES = { azul: '#3d7be8', amarillo: '#f2b632', rojo: '#e5534b', verde: '#3fae6a', morado: '#8a63d2', naranja: '#f08a3c', rosa: '#e86aa6', turquesa: '#2fb5b0', gris: '#7b8494', negro: '#2b2f38' };
  /* Personaje: MUN.persona({ color, accesorio: 'sombrero'|'gorra'|'boina'|'pelo'|'coleta'|'flequillo'|'calvo', gafas, bufanda, corbata,
     mochila, barba, altura (1 = normal; 0.6 = niño), ancho (1 = normal), expresion: 'neutra'|'feliz'|'triste'|'sorpresa'|'enfado'|'duda' }) */
  MUN.persona = (o = {}) => ({ color: MUN.COLORES[o.color] || o.color || MUN.COLORES.azul, accesorio: o.accesorio || 'sombrero', gafas: !!o.gafas, bufanda: o.bufanda ? (MUN.COLORES[o.bufanda] || o.bufanda) : null,
    corbata: o.corbata ? (MUN.COLORES[o.corbata] || o.corbata) : null, mochila: o.mochila ? (MUN.COLORES[o.mochila] || o.mochila) : null, barba: !!o.barba, pelo: o.pelo || '#3a2e2a',
    altura: o.altura || 1, ancho: o.ancho || 1, expresion: o.expresion || 'neutra', nombre: o.nombre || '' });

  // ---------------------------------------------------------------- esqueleto y poses
  const LG = { muslo: .22, tibia: .21, brazo: .165, antebrazo: .155, tronco: .25, hombro: .245, cuello: .04, cabeza: .155, cadera: .05, hombros: .075 };
  const POSE0 = { inclina: 0, cabeza: 0, hD: [.08, .12], hI: [-.06, .1], pD: [.03, 0], pI: [-.03, 0], y: 0, sube: 0 };
  const P = (o) => Object.assign({}, POSE0, o, { hD: o.hD || POSE0.hD, hI: o.hI || POSE0.hI, pD: o.pD || POSE0.pD, pI: o.pI || POSE0.pI });
  const andar = (t, f = 1.6, amp = .42) => { const a = t * f * TAU, s = Math.sin(a), c = Math.cos(a);
    return P({ inclina: .04, cabeza: -.02, pD: [s * amp, -Math.max(0, -c) * .9 - .08], pI: [-s * amp, -Math.max(0, c) * .9 - .08], hD: [-s * .5, .25], hI: [s * .5, .25], sube: Math.abs(c) * .018 }); };
  // POSES: función (tl = segundos desde que empezó la acción, o = opciones de la acción) → pose
  MUN.POSES = {
    quieto: (t) => P({ inclina: .01 * Math.sin(t * 1.7), hD: [.06 + .02 * Math.sin(t * 1.7), .14], hI: [-.05 + .02 * Math.sin(t * 1.7 + 1), .12] }),
    andar: (t) => andar(t),
    correr: (t) => { const a = t * 2.6 * TAU, s = Math.sin(a), c = Math.cos(a); return P({ inclina: .2, cabeza: -.08, pD: [s * .75 + .1, -Math.max(0, -c) * 1.6 - .3], pI: [-s * .75 + .1, -Math.max(0, c) * 1.6 - .3], hD: [-s * .9, 1.4], hI: [s * .9, 1.4], sube: Math.abs(c) * .05 }); },
    sentado: (t) => P({ inclina: -.05 + .01 * Math.sin(t * 1.5), pD: [1.5, -1.45], pI: [1.42, -1.38], hD: [.35, .7], hI: [.3, .75] }),
    saludar: (t) => P({ inclina: -.02, hI: [2.85, .3 + .45 * Math.sin(t * 9)], hD: [.05, .12], cabeza: -.06 }),
    senalar: (t) => P({ inclina: .03, hD: [1.5 + .04 * Math.sin(t * 2), .05], hI: [-.05, .15], cabeza: -.02 }),
    senalarArriba: (t) => P({ inclina: -.05, hD: [2.6, .05], hI: [-.05, .15], cabeza: -.25 }),
    celebrar: (t) => { const b = Math.abs(Math.sin(t * 6)); return P({ inclina: -.06, cabeza: -.15, hD: [2.25 + .15 * Math.sin(t * 12), .25], hI: [2.85 + .15 * Math.sin(t * 12 + 1), .3], pD: [.15, -.25 * b], pI: [-.1, -.25 * b], y: b * .08 }); },
    pensar: (t) => P({ inclina: .02, cabeza: .12 + .03 * Math.sin(t * 1.2), hD: [.9, 2.3], hI: [.55, 1.2] }),
    beber: (t) => { const k = .5 + .5 * Math.sin(t * 1.4); return P({ cabeza: -.15 * k, hD: [.55 + .5 * k, 1.9 + .35 * k], hI: [-.04, .12] }); },
    leer: (t) => P({ inclina: .05, cabeza: .28, hD: [.75, 1.55], hI: [.7, 1.5] }),
    movil: (t) => P({ inclina: .06, cabeza: .32, hD: [.55, 1.85 + .05 * Math.sin(t * 7)], hI: [.4, 1.7] }),
    triste: (t) => P({ inclina: .3, cabeza: .4, hD: [.02, .05], hI: [-.02, .05], pD: [.02, -.05], pI: [-.02, -.05] }),
    sorpresa: (t) => { const k = MUN.ease.rebote(Math.min(1, t * 3)); return P({ inclina: -.12 * k, cabeza: -.15 * k, hD: [1.2 * k, -.3 * k], hI: [-1.0 * k, -.2 * k], y: .05 * Math.max(0, Math.sin(Math.min(1, t * 3) * Math.PI)) }); },
    empujar: (t) => { const a = Math.sin(t * 4); return P({ inclina: .45, cabeza: -.15, hD: [1.35, .1], hI: [1.3, .12], pD: [-.45 + a * .2, -.25], pI: [.3 - a * .2, -.15] }); },
    llevar: (t) => { const p = andar(t, 1.4, .32); p.hD = [.75, .9]; p.hI = [.7, .95]; p.inclina = -.04; return p; },
    llevarQuieto: (t) => P({ hD: [.75, .9], hI: [.7, .95], inclina: -.04 }),
    abrazar: (t) => P({ inclina: .12, cabeza: -.05, hD: [1.25, 1.0], hI: [1.15, 1.1] }),
    saltar: (t) => { const c = (t * 1.3) % 1, h = Math.sin(c * Math.PI); return P({ inclina: -.05, hD: [2.5 * h + .2, .3], hI: [2.3 * h + .1, .3], pD: [.3 * (1 - h), -.6 * (1 - h)], pI: [.2 * (1 - h), -.5 * (1 - h)], y: h * .35 }); },
    caer: (t) => { const k = Math.min(1, t * 2.2); return P({ inclina: -1.45 * k, cabeza: -.2 * k, hD: [1.6 * k, .3], hI: [1.9 * k, .4], pD: [1.2 * k, -.3 * k], pI: [.9 * k, -.2 * k], tumbado: k }); },
    dormir: (t) => P({ inclina: -1.5, cabeza: -.1 + .03 * Math.sin(t * 1.2), hD: [.4, .6], hI: [.3, .5], pD: [.1, -.1], pI: [.05, -.05], tumbado: 1 }),
    agotado: (t) => P({ inclina: .55, cabeza: .25, hD: [.6, .4], hI: [.55, .45], pD: [.25, -.35], pI: [-.1, -.2], sube: .01 * Math.sin(t * 6) }),
    encogerHombros: (t) => { const k = .5 + .5 * Math.sin(t * 3); return P({ hD: [.25 + .1 * k, 1.9], hI: [.2 + .1 * k, 1.85], cabeza: -.08 * k, sube: .015 * k }); },
    contar: (t) => P({ hD: [1.1, 1.5 + .2 * Math.sin(t * 5)], hI: [.9, 1.5], cabeza: .1 }),
    escribir: (t) => P({ inclina: .2, cabeza: .25, hD: [.7, 1.3 + .1 * Math.sin(t * 9)], hI: [.6, 1.3] }),
  };
  MUN.ACCIONES = Object.keys(MUN.POSES);
  const mezclaPose = (a, b, k) => { const r = {}; for (const key in a) { const va = a[key], vb = b[key] ?? va; r[key] = Array.isArray(va) ? va.map((v, i) => mix(v, vb[i], k)) : typeof va === 'number' ? mix(va, vb, k) : vb; } for (const key in b) if (!(key in r)) r[key] = b[key]; return r; };
  MUN.mezclaPose = mezclaPose;
  const VEL = { andar: .75, correr: 2.0, llevar: .6 };

  /* Actor = personaje + guion de acciones:
     MUN.actor(persona, { x: 0, dir: 1, acciones: [ { t: 0, a: 'quieto' }, { t: .5, a: 'andar', hasta: 1.8 }, { t: 3, a: 'sentarse' }, { t: 4, a: 'beber', mira: -1, cara: 'feliz' } ] })
     - 'andar' / 'correr' / 'llevar' con 'hasta' desplazan al muñeco a esa x a su velocidad y, al llegar, vuelve a 'quieto' (o a 'luego').
     - 'sentarse' es alias de 'sentado' (el cambio de postura se suaviza solo). 'mira' fuerza la orientación (1 derecha, -1 izquierda).
     - 'brazos' toma los brazos y la cabeza de otra acción sobre la postura (p. ej. { a: 'sentado', brazos: 'beber' }, { a: 'andar', brazos: 'movil' }).
     - 'cara' cambia la expresión desde ese momento. 'objeto' pone algo en la mano: 'taza'|'movil'|'libro'|'maletin'|'caja'|'globo'|'flor' o una función. */
  MUN.actor = (persona, o = {}) => ({ persona, x0: o.x ?? 0, y0: o.y ?? 0, dir0: o.dir ?? 1, acciones: (o.acciones || [{ t: 0, a: 'quieto' }]).slice().sort((p, q) => p.t - q.t), escala: o.escala ?? persona.altura, fase: o.fase ?? 0 });
  function estado(ac, t) {
    let x = ac.x0, dir = ac.dir0, cara = ac.persona.expresion, objeto = null, brazos = null, cur = { t: -1e9, a: 'quieto' }, nom = 'quieto', tl = t, previo = null, tCambio = 0, nomPrev = 'quieto', tlPrev = 0;
    const L = ac.acciones;
    for (let k = 0; k < L.length; k++) {
      const a = L[k]; if (t < a.t) break; const fin = k + 1 < L.length ? L[k + 1].t : Infinity;
      if (a.mira) dir = a.mira; if (a.cara) cara = a.cara; if ('objeto' in a) objeto = a.objeto; brazos = a.brazos || null;
      let nombre = a.a === 'sentarse' ? 'sentado' : a.a, inicio = a.t;
      if (a.hasta != null && VEL[nombre]) { const v = (a.vel || 1) * VEL[nombre], dist = a.hasta - x, dur = Math.abs(dist) / v; if (Math.abs(dist) > 1e-6 && !a.mira) dir = Math.sign(dist);
        const llega = a.t + dur, hasta = Math.min(t, fin); x += Math.sign(dist) * v * Math.max(0, Math.min(hasta, llega) - a.t);
        if (t >= llega && llega < fin) { nomPrev = nombre; tlPrev = llega - a.t; nombre = a.luego || (nombre === 'llevar' ? 'llevarQuieto' : 'quieto'); inicio = llega; } }
      if (k > 0 || nombre !== 'quieto') { if (nombre !== nom || inicio !== cur.t) { nomPrev = nom; tlPrev = Math.max(0, inicio - cur.t); } }
      nom = nombre; cur = { t: inicio }; tCambio = inicio;
    }
    tl = t - cur.t; const f = MUN.POSES[nom] || MUN.POSES.quieto; let pose = f(tl + ac.fase);
    if (brazos && MUN.POSES[brazos]) { const b = MUN.POSES[brazos](tl + ac.fase); pose = Object.assign({}, pose, { hD: b.hD, hI: b.hI, cabeza: b.cabeza }); }
    const k = cl(tl / .35); if (k < 1 && t > .001) pose = mezclaPose((MUN.POSES[nomPrev] || MUN.POSES.quieto)(tlPrev + ac.fase), pose, ss(k));
    return { x, dir, pose, cara, objeto, accion: nom, tl };
  }
  MUN.estado = estado;

  // cinemática: pose → puntos (unidades del muñeco, y hacia ARRIBA, pies en 0)
  const pt = (b, L, a, dir) => [b[0] + Math.sin(a) * L * dir, b[1] - Math.cos(a) * L];
  function esqueleto(pose, dir) {
    const cad = [0, .46], inc = pose.inclina || 0, cue = [cad[0] + Math.sin(inc) * LG.tronco * dir, cad[1] + Math.cos(inc) * LG.tronco];
    const hom = [cad[0] + Math.sin(inc) * LG.hombro * dir, cad[1] + Math.cos(inc) * LG.hombro], ca = inc + (pose.cabeza || 0) * .6;
    const cab = [cue[0] + Math.sin(ca) * (LG.cuello + LG.cabeza) * dir, cue[1] + Math.cos(ca) * (LG.cuello + LG.cabeza)];
    const pierna = (q, lado) => { const base = [cad[0] + lado * LG.cadera * dir * .25, cad[1]], r = pt(base, LG.muslo, q[0] + inc * 0, dir), pie = pt(r, LG.tibia, q[0] + q[1], dir); return [base, r, pie]; };
    const brazo = (q, lado) => { const base = [hom[0] - lado * .012 * dir, hom[1]], c = pt(base, LG.brazo, q[0] + inc, dir), m = pt(c, LG.antebrazo, q[0] + q[1] + inc, dir); return [base, c, m]; };
    const S = { cad, cue, hom, cab, pD: pierna(pose.pD, 1), pI: pierna(pose.pI, -1), hD: brazo(pose.hD, 1), hI: brazo(pose.hI, -1) };
    if (!pose.tumbado) { const suelo = Math.min(S.pD[2][1], S.pI[2][1]) - .035; const dy = -suelo; for (const k of ['cad', 'cue', 'hom', 'cab']) S[k] = [S[k][0], S[k][1] + dy]; for (const k of ['pD', 'pI', 'hD', 'hI']) S[k] = S[k].map(p => [p[0], p[1] + dy]); }
    else { const dy = .14 * pose.tumbado; for (const k of ['cad', 'cue', 'hom', 'cab']) S[k] = [S[k][0], S[k][1] - .3 * pose.tumbado + dy]; for (const k of ['pD', 'pI', 'hD', 'hI']) S[k] = S[k].map(p => [p[0], p[1] - .3 * pose.tumbado + dy]); }
    const extra = (pose.y || 0) + (pose.sube || 0); if (extra) { for (const k of ['cad', 'cue', 'hom', 'cab']) S[k] = [S[k][0], S[k][1] + extra]; for (const k of ['pD', 'pI', 'hD', 'hI']) S[k] = S[k].map(p => [p[0], p[1] + extra]); }
    return S;
  }

  // ---------------------------------------------------------------- dibujo de un muñeco
  const caches = {};
  function lienzoTemp(w, h) { const k = w + 'x' + h; if (!caches[k]) { const c = (typeof OffscreenCanvas !== 'undefined') ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h }); caches[k] = c; } return caches[k]; }
  const linea = (x, pts, w, col) => { x.lineCap = 'round'; x.lineJoin = 'round'; x.lineWidth = w; x.strokeStyle = col; x.beginPath(); x.moveTo(pts[0][0], -pts[0][1]); for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], -pts[i][1]); x.stroke(); };
  const circ = (x, c, r, fill, stroke, w) => { x.beginPath(); x.arc(c[0], -c[1], r, 0, TAU); if (fill) { x.fillStyle = fill; x.fill(); } if (stroke) { x.lineWidth = w; x.strokeStyle = stroke; x.stroke(); } };
  function figura(x, per, S, dir, cara, tema, objeto, t) {
    const T = MUN.TEMAS[tema] || MUN.TEMAS.noche, ol = .017, an = per.ancho, gL = .115, gT = .29 * an, gB = .09;
    const parte = (pts, w, lejos) => { linea(x, pts, w + ol * 2, T.trazo); linea(x, pts, w, lejos ? T.pielLejos : T.piel); };
    if (per.mochila) { const c = [S.hom[0] - .1 * dir, S.hom[1] - .07]; x.save(); x.fillStyle = per.mochila; x.strokeStyle = T.trazo; x.lineWidth = ol; x.beginPath(); x.roundRect ? x.roundRect(c[0] - .065, -c[1] - .09, .13, .19, .04) : x.rect(c[0] - .065, -c[1] - .09, .13, .19); x.fill(); x.stroke(); x.restore(); }
    parte(S.pI, gL, true); parte(S.hI, gB, true); circ(x, S.hI[2], .045, T.pielLejos, T.trazo, ol);
    const tt = [S.cue[0] + (S.cad[0] - S.cue[0]) * .45, S.cue[1] + (S.cad[1] - S.cue[1]) * .45]; linea(x, [S.cad, tt], gT + ol * 2, T.trazo); linea(x, [S.cad, tt], gT, T.piel);
    if (per.corbata) { x.fillStyle = per.corbata; const a = [S.hom[0] + .07 * dir, S.hom[1] + .02], b = [S.cad[0] + .085 * dir, S.cad[1] + .08]; x.beginPath(); x.moveTo(a[0] - .015, -a[1]); x.lineTo(a[0] + .015, -a[1]); x.lineTo(b[0] + .02, -b[1]); x.lineTo(b[0], -b[1] + .03); x.lineTo(b[0] - .02, -b[1]); x.closePath(); x.fill(); }
    parte(S.pD, gL, false); for (const p of [S.pD[2], S.pI[2]]) { x.save(); x.fillStyle = T.trazo; x.beginPath(); x.ellipse(p[0] + .035 * dir, -p[1] + .012, .068, .036, 0, 0, TAU); x.fill(); x.restore(); }
    if (per.bufanda) { linea(x, [[S.cue[0] - .09, S.cue[1] - .01], [S.cue[0] + .09, S.cue[1] - .01]], .07, per.bufanda); linea(x, [[S.cue[0] - .03 * dir, S.cue[1] - .02], [S.cue[0] - .1 * dir, S.cue[1] - .17 - .01 * Math.sin(t * 5)]], .05, per.bufanda); }
    const brazoAlto = S.hD[2][1] > S.cue[1] - .02;   // con el brazo cercano levantado, la cabeza va delante para no taparse la cara
    if (brazoAlto) { parte(S.hD, gB, false); circ(x, S.hD[2], .047, T.piel, T.trazo, ol); }
    // cabeza
    const c = S.cab, R = LG.cabeza; circ(x, c, R, T.piel, T.trazo, ol * 1.1);
    if (per.accesorio === 'pelo' || per.accesorio === 'coleta' || per.accesorio === 'flequillo') { x.save(); x.beginPath(); x.arc(c[0], -c[1], R, 0, TAU); x.clip(); x.fillStyle = per.pelo; x.beginPath(); x.ellipse(c[0] - .045 * dir, -c[1] - .07, R * 1.05, R * .72, -.35 * dir, 0, TAU); x.fill(); if (per.accesorio === 'flequillo') { x.beginPath(); x.ellipse(c[0] + .05 * dir, -c[1] - .085, R * .6, R * .3, .3 * dir, 0, TAU); x.fill(); } x.restore();
      x.lineWidth = ol * 1.1; x.strokeStyle = T.trazo; x.beginPath(); x.arc(c[0], -c[1], R, 0, TAU); x.stroke();
      if (per.accesorio === 'coleta') { const b = [c[0] - R * .95 * dir, c[1] + .02]; x.fillStyle = per.pelo; x.beginPath(); x.ellipse(b[0] - .03 * dir, -b[1] + .04 + .008 * Math.sin(t * 4), .045, .085, .5 * dir, 0, TAU); x.fill(); } }
    // cara
    const ex = (k) => [c[0] + dir * (.045 + k * .055), c[1] + .015], ojo = (p, s) => { x.fillStyle = T.ojo; x.beginPath(); x.ellipse(p[0], -p[1], .014 * s, (cara === 'sorpresa' ? .024 : .019) * s, 0, 0, TAU); x.fill(); };
    const parpadeo = ((t * .37) % 1) > .965 ? .15 : 1; x.save(); x.translate(0, 0);
    for (const [k, s] of [[0, .85], [1, 1]]) { const p = ex(k); x.save(); x.translate(p[0], -p[1]); x.scale(1, parpadeo); ojo([0, 0], s); x.restore(); }
    x.strokeStyle = T.ojo; x.lineWidth = .009; x.lineCap = 'round'; const m = [c[0] + dir * .085, c[1] - .055];
    x.beginPath();
    if (cara === 'feliz') x.arc(m[0], -m[1] - .012, .028, .2 * Math.PI, .8 * Math.PI);
    else if (cara === 'triste') x.arc(m[0], -m[1] + .02, .022, 1.2 * Math.PI, 1.8 * Math.PI);
    else if (cara === 'sorpresa') { x.ellipse(m[0], -m[1], .012, .017, 0, 0, TAU); }
    else if (cara === 'enfado') { x.moveTo(m[0] - .02, -m[1]); x.lineTo(m[0] + .02, -m[1]); }
    else if (cara === 'duda') { x.moveTo(m[0] - .018, -m[1] + .004); x.lineTo(m[0] + .02, -m[1] - .006); }
    else { x.moveTo(m[0] - .014, -m[1]); x.quadraticCurveTo(m[0], -m[1] + .006, m[0] + .016, -m[1]); }
    x.stroke();
    if (cara === 'triste' || cara === 'enfado' || cara === 'duda') { x.lineWidth = .008; for (const k of [0, 1]) { const p = ex(k), up = cara === 'triste' ? 1 : -1; x.beginPath(); x.moveTo(p[0] - .016, -p[1] - .035 - up * .006 * (k ? 1 : -1) * dir); x.lineTo(p[0] + .016, -p[1] - .035 + up * .006 * (k ? 1 : -1) * dir); x.stroke(); } }
    if (cara === 'feliz') { x.fillStyle = 'rgba(240,120,120,.35)'; x.beginPath(); x.ellipse(c[0] + dir * .11, -c[1] + .045, .022, .013, 0, 0, TAU); x.fill(); }
    if (per.barba) { x.save(); x.beginPath(); x.arc(c[0], -c[1], R, 0, TAU); x.clip(); x.fillStyle = per.pelo; x.beginPath(); x.ellipse(c[0] + .05 * dir, -c[1] + .13, .1, .05, 0, 0, TAU); x.fill(); x.restore(); x.strokeStyle = T.ojo; x.lineWidth = .009; x.beginPath(); x.moveTo(m[0] - .014, -m[1] - .004); x.lineTo(m[0] + .016, -m[1] - .004); x.stroke(); }
    if (per.gafas) { x.strokeStyle = T.trazo; x.lineWidth = .009; for (const k of [0, 1]) { const p = ex(k); x.beginPath(); x.arc(p[0], -p[1], .022, 0, TAU); x.stroke(); } x.beginPath(); x.moveTo(ex(0)[0] + .022 * dir, -ex(0)[1]); x.lineTo(ex(1)[0] - .022 * dir, -ex(1)[1]); x.moveTo(ex(0)[0] - .022 * dir, -ex(0)[1]); x.lineTo(c[0] - R * .9 * dir, -c[1] + .01); x.stroke(); }
    x.restore();
    sombrero(x, per, c, R, dir, T, ol);
    // brazo cercano y objeto
    if (!brazoAlto) { parte(S.hD, gB, false); circ(x, S.hD[2], .047, T.piel, T.trazo, ol); }
    if (objeto) dibujarObjeto(x, objeto, S, dir, T, t);
  }
  function sombrero(x, per, c, R, dir, T, ol) {
    const a = per.accesorio, col = per.color; if (!['sombrero', 'gorra', 'boina'].includes(a)) return;
    x.save(); x.translate(c[0], -c[1]); x.lineWidth = ol; x.strokeStyle = T.trazo; x.fillStyle = col;
    if (a === 'sombrero') { x.beginPath(); x.ellipse(0, -R * .66, R * 1.5, R * .24, 0, 0, TAU); x.fill(); x.stroke();
      x.beginPath(); x.moveTo(-R * .85, -R * .7); x.bezierCurveTo(-R * .9, -R * 1.6, R * .9, -R * 1.6, R * .85, -R * .7); x.closePath(); x.fill(); x.stroke();
      x.fillStyle = 'rgba(0,0,0,.28)'; x.beginPath(); x.moveTo(-R * .79, -R * .7); x.lineTo(R * .79, -R * .7); x.lineTo(R * .77, -R * .88); x.lineTo(-R * .77, -R * .88); x.closePath(); x.fill();
      x.fillStyle = 'rgba(255,255,255,.25)'; x.beginPath(); x.ellipse(-R * .25 * dir, -R * 1.18, R * .3, R * .07, -.2 * dir, 0, TAU); x.fill(); }
    else if (a === 'gorra') { x.beginPath(); x.arc(0, -R * .2, R * 1.0, Math.PI * 1.05, Math.PI * 1.95); x.closePath(); x.fill(); x.stroke();
      x.beginPath(); x.ellipse(R * .95 * dir, -R * .3, R * .62, R * .13, .08 * dir, 0, TAU); x.fill(); x.stroke(); x.fillStyle = T.trazo; x.beginPath(); x.arc(0, -R * 1.18, R * .1, 0, TAU); x.fill(); }
    else if (a === 'boina') { x.beginPath(); x.ellipse(-R * .15 * dir, -R * .82, R * 1.15, R * .38, -.18 * dir, 0, TAU); x.fill(); x.stroke(); x.fillStyle = T.trazo; x.beginPath(); x.arc(-R * .1 * dir, -R * 1.2, R * .08, 0, TAU); x.fill(); }
    x.restore();
  }
  function dibujarObjeto(x, o, S, dir, T, t) {
    const m = S.hD[2], p = [m[0], -m[1]]; x.save(); x.translate(p[0], p[1]); x.lineWidth = .012; x.strokeStyle = T.trazo; x.lineJoin = 'round';
    if (typeof o === 'function') o(x, dir, t);
    else if (o === 'taza') { x.fillStyle = '#e9eef5'; x.beginPath(); x.roundRect ? x.roundRect(-.03, -.045, .065, .07, .012) : x.rect(-.03, -.045, .065, .07); x.fill(); x.stroke(); x.beginPath(); x.arc(.045 * dir, -.012, .018, -1.3, 1.3); x.stroke();
      x.strokeStyle = 'rgba(255,255,255,.45)'; x.lineWidth = .008; for (const k of [0, 1]) { const ph = t * 2 + k * 1.6; x.beginPath(); x.moveTo(k * .02 - .005, -.06); x.quadraticCurveTo(k * .02 + .015 * Math.sin(ph), -.09, k * .02 - .005 + .01 * Math.sin(ph + 1), -.12); x.stroke(); } }
    else if (o === 'movil') { x.fillStyle = '#2a2f3a'; x.beginPath(); x.roundRect ? x.roundRect(-.022, -.075, .045, .085, .01) : x.rect(-.022, -.075, .045, .085); x.fill(); x.fillStyle = '#7fd0ff'; x.fillRect(-.016, -.068, .033, .066); }
    else if (o === 'libro') { x.fillStyle = MUN.COLORES.rojo; x.beginPath(); x.moveTo(-.07, -.03); x.lineTo(0, -.05); x.lineTo(.07, -.03); x.lineTo(.07, .03); x.lineTo(0, .01); x.lineTo(-.07, .03); x.closePath(); x.fill(); x.stroke(); x.fillStyle = '#fff'; x.beginPath(); x.moveTo(-.06, -.025); x.lineTo(0, -.04); x.lineTo(0, .002); x.lineTo(-.06, .022); x.fill(); x.beginPath(); x.moveTo(.06, -.025); x.lineTo(0, -.04); x.lineTo(0, .002); x.lineTo(.06, .022); x.fill(); }
    else if (o === 'maletin') { x.fillStyle = '#6b4a35'; x.beginPath(); x.roundRect ? x.roundRect(-.07, .01, .14, .1, .015) : x.rect(-.07, .01, .14, .1); x.fill(); x.stroke(); x.beginPath(); x.arc(0, .01, .025, Math.PI, 0); x.stroke(); }
    else if (o === 'caja') { x.fillStyle = '#c99a5b'; x.fillRect(-.09, -.11, .18, .16); x.strokeRect(-.09, -.11, .18, .16); x.beginPath(); x.moveTo(-.09, -.06); x.lineTo(.09, -.06); x.stroke(); }
    else if (o === 'globo') { x.strokeStyle = T.borde; x.lineWidth = .006; x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(.04 * Math.sin(t * 2), -.35, .02, -.72); x.stroke(); x.fillStyle = MUN.COLORES.rojo; x.strokeStyle = T.trazo; x.lineWidth = .01; x.beginPath(); x.ellipse(.02 + .015 * Math.sin(t * 2), -.83, .1, .12, 0, 0, TAU); x.fill(); x.stroke(); x.fillStyle = 'rgba(255,255,255,.4)'; x.beginPath(); x.ellipse(-.02, -.87, .025, .04, -.4, 0, TAU); x.fill(); }
    else if (o === 'flor') { x.strokeStyle = MUN.COLORES.verde; x.lineWidth = .01; x.beginPath(); x.moveTo(0, 0); x.lineTo(.01 * dir, -.14); x.stroke(); x.fillStyle = MUN.COLORES.rosa; for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; x.beginPath(); x.arc(.01 * dir + Math.cos(a) * .025, -.16 + Math.sin(a) * .025, .018, 0, TAU); x.fill(); } x.fillStyle = MUN.COLORES.amarillo; x.beginPath(); x.arc(.01 * dir, -.16, .014, 0, TAU); x.fill(); }
    x.restore();
  }
  /* Dibuja un actor en coordenadas del MUNDO (ctx ya transformado por el plano). opts: { tema, reflejo: 0..1 (0 = sin reflejo), sombra: true } */
  MUN.dibujar = function (ctx, ac, t, opts = {}) {
    const e = estado(ac, t), per = ac.persona, s = ac.escala, S = esqueleto(e.pose, e.dir), tema = opts.tema || 'noche', T = MUN.TEMAS[tema];
    const X = e.x, Y = ac.y0;
    if (opts.sombra !== false) { const h = Math.max(0, Math.min(S.pD[2][1], S.pI[2][1])); ctx.save(); ctx.fillStyle = T.sombra + (.32 * (1 - Math.min(1, h * 3))) + ')'; ctx.beginPath(); ctx.ellipse(X + S.cad[0] * s, Y, (.2 + (e.pose.tumbado ? .25 : 0)) * s, .035 * s, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    if (opts.reflejo) { const rf = opts.reflejo, N = 7, alto = 1.1 * s;   // reflejo en franjas que se desvanecen (sin filtros ni lienzos extra)
      for (let k = 0; k < N; k++) { ctx.save(); ctx.beginPath(); ctx.rect(X - 2 * s, Y + k * alto / N, 4 * s, alto / N + .002); ctx.clip(); ctx.translate(X, Y); ctx.scale(s, -s); ctx.globalAlpha *= rf * Math.pow(1 - k / N, 1.6); figura(ctx, per, S, e.dir, e.cara, tema, e.objeto, t); ctx.restore(); } }
    ctx.save(); ctx.translate(X, Y); ctx.scale(s, s); figura(ctx, per, S, e.dir, e.cara, tema, e.objeto, t); ctx.restore();
    const m = S.hD[2], cab = S.cab; return { x: X, y: Y, dir: e.dir, accion: e.accion, mano: [X + m[0] * s, Y - m[1] * s], cabeza: [X + cab[0] * s, Y - cab[1] * s], escala: s };
  };

  // ---------------------------------------------------------------- escenario básico (el resto depende de cada vídeo)
  MUN.fondo = (ctx, W, H, tema = 'noche') => { const T = MUN.TEMAS[tema], g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, T.fondo[0]); g.addColorStop(1, T.fondo[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); };
  /* Suelo brillante entre x0 y x1 (mundo). Llamarlo ANTES de los muñecos; con reflejo, los muñecos se reflejan encima. */
  MUN.suelo = (ctx, x0, x1, tema = 'noche', fondoAbajo = 4) => { const T = MUN.TEMAS[tema], g = ctx.createLinearGradient(0, 0, 0, fondoAbajo); g.addColorStop(0, T.sueloBrillo); g.addColorStop(.12, T.suelo); g.addColorStop(1, T.fondo[1]); ctx.fillStyle = g; ctx.fillRect(x0, 0, x1 - x0, fondoAbajo);
    ctx.fillStyle = T.luz + '.18)'; ctx.fillRect(x0, -.004, x1 - x0, .008); };
  /* Habitación en corte (caja con borde de luz): { x, y (suelo), ancho, alto, tema, luz: 0..1, pared } */
  MUN.sala = (ctx, o = {}) => { const T = MUN.TEMAS[o.tema || 'noche'], x = o.x ?? -1.5, y = o.y ?? 0, w = o.ancho ?? 3, h = o.alto ?? 2, luz = o.luz ?? 1;
    ctx.save(); const g = ctx.createLinearGradient(0, y - h, 0, y); g.addColorStop(0, o.pared || T.pared); g.addColorStop(1, T.fondo[0]); ctx.fillStyle = g; ctx.fillRect(x, y - h, w, h);
    if (luz > 0) { const r = ctx.createRadialGradient(x + w / 2, y - h, 0, x + w / 2, y - h, h * 1.3); r.addColorStop(0, T.luz + (.16 * luz) + ')'); r.addColorStop(1, T.luz + '0)'); ctx.fillStyle = r; ctx.fillRect(x, y - h, w, h); }
    for (const [a, lw] of [[.06, .06], [.12, .03], [.55, .012]]) { ctx.strokeStyle = `rgba(190,200,220,${a * luz + .02})`; ctx.lineWidth = lw; ctx.strokeRect(x, y - h, w, h); }
    ctx.restore(); };
  /* Objetos sencillos (mundo; x = centro, y = suelo). Devuelven nada; llamarlos antes o después de los muñecos según quién tape a quién. */
  MUN.props = {
    banco: (ctx, x, y = 0, w = .6, tema = 'noche') => { ctx.save(); ctx.fillStyle = '#b58a5c'; ctx.strokeStyle = MUN.TEMAS[tema].trazo; ctx.lineWidth = .012; ctx.fillRect(x - w / 2, y - .25, w, .05); ctx.strokeRect(x - w / 2, y - .25, w, .05); ctx.fillStyle = '#8c6744'; for (const k of [-1, 1]) { ctx.fillRect(x + k * (w / 2 - .06) - .02, y - .2, .04, .2); } ctx.restore(); },
    silla: (ctx, x, y = 0, dir = 1, tema = 'noche') => { ctx.save(); ctx.strokeStyle = MUN.TEMAS[tema].trazo; ctx.fillStyle = '#5d6b85'; ctx.lineWidth = .012; ctx.fillRect(x - .14, y - .26, .28, .05); ctx.strokeRect(x - .14, y - .26, .28, .05); ctx.fillRect(x - .14 * dir - .02, y - .62, .04, .38); ctx.fillStyle = '#3f4a5e'; for (const k of [-1, 1]) ctx.fillRect(x + k * .11 - .015, y - .21, .03, .21); ctx.restore(); },
    mesa: (ctx, x, y = 0, w = .9, h = .45, tema = 'noche') => { ctx.save(); ctx.fillStyle = '#c9a274'; ctx.strokeStyle = MUN.TEMAS[tema].trazo; ctx.lineWidth = .012; ctx.fillRect(x - w / 2, y - h, w, .05); ctx.strokeRect(x - w / 2, y - h, w, .05); ctx.fillStyle = '#9c7a52'; for (const k of [-1, 1]) ctx.fillRect(x + k * (w / 2 - .07) - .02, y - h + .05, .04, h - .05); ctx.restore(); },
    puerta: (ctx, x, y = 0, abierta = 0, tema = 'noche') => { ctx.save(); const T = MUN.TEMAS[tema]; ctx.fillStyle = '#0b0c10'; ctx.fillRect(x - .25, y - 1.15, .5, 1.15); ctx.fillStyle = T.luz + (.25 * abierta) + ')'; ctx.fillRect(x - .25, y - 1.15, .5, 1.15); ctx.fillStyle = '#4b5568'; const w = .5 * (1 - abierta * .8); ctx.fillRect(x - .25, y - 1.15, w, 1.15); ctx.strokeStyle = T.borde; ctx.lineWidth = .015; ctx.strokeRect(x - .25, y - 1.15, .5, 1.15); ctx.restore(); },
    /* cuadro con marco; contenido(ctx, w, h) dibuja dentro (0,0 = esquina superior izquierda) */
    cuadro: (ctx, x, y, w, h, contenido, tema = 'noche') => { ctx.save(); ctx.fillStyle = '#121a33'; ctx.fillRect(x - w / 2, y - h, w, h); if (contenido) { ctx.save(); ctx.beginPath(); ctx.rect(x - w / 2, y - h, w, h); ctx.clip(); ctx.translate(x - w / 2, y - h); contenido(ctx, w, h); ctx.restore(); } ctx.strokeStyle = '#3a2c22'; ctx.lineWidth = .035; ctx.strokeRect(x - w / 2, y - h, w, h); ctx.restore(); },
    planta: (ctx, x, y = 0, t = 0) => { ctx.save(); ctx.fillStyle = '#b5683e'; ctx.beginPath(); ctx.moveTo(x - .1, y - .2); ctx.lineTo(x + .1, y - .2); ctx.lineTo(x + .075, y); ctx.lineTo(x - .075, y); ctx.closePath(); ctx.fill(); ctx.fillStyle = MUN.COLORES.verde; for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k - 2.5) * .35 + .03 * Math.sin(t * 1.3 + k); ctx.save(); ctx.translate(x, y - .2); ctx.rotate(a + Math.PI / 2); ctx.beginPath(); ctx.ellipse(0, -.14, .045, .14, 0, 0, TAU); ctx.fill(); ctx.restore(); } ctx.restore(); },
    lampara: (ctx, x, y = 0, encendida = 1, tema = 'noche') => { ctx.save(); const T = MUN.TEMAS[tema]; ctx.strokeStyle = '#596274'; ctx.lineWidth = .025; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 1.25); ctx.stroke(); ctx.fillStyle = '#e8d7b0'; ctx.beginPath(); ctx.moveTo(x - .14, y - 1.18); ctx.lineTo(x + .14, y - 1.18); ctx.lineTo(x + .08, y - 1.38); ctx.lineTo(x - .08, y - 1.38); ctx.closePath(); ctx.fill();
      if (encendida) { const r = ctx.createRadialGradient(x, y - 1.15, 0, x, y - 1.15, .9); r.addColorStop(0, T.luz + (.3 * encendida) + ')'); r.addColorStop(1, T.luz + '0)'); ctx.fillStyle = r; ctx.fillRect(x - .9, y - 2, 1.8, 2); } ctx.restore(); },
    caja: (ctx, x, y = 0, w = .3, h = .25) => { ctx.save(); ctx.fillStyle = '#c99a5b'; ctx.strokeStyle = '#6b4c2a'; ctx.lineWidth = .012; ctx.fillRect(x - w / 2, y - h, w, h); ctx.strokeRect(x - w / 2, y - h, w, h); ctx.beginPath(); ctx.moveTo(x - w / 2, y - h + .05); ctx.lineTo(x + w / 2, y - h + .05); ctx.stroke(); ctx.restore(); },
    ventana: (ctx, x, y, w = .7, h = .8, cielo = '#203a6b', tema = 'noche') => { ctx.save(); ctx.fillStyle = cielo; ctx.fillRect(x - w / 2, y - h, w, h); ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.beginPath(); ctx.moveTo(x - w / 2, y - h); ctx.lineTo(x - w / 2 + w * .35, y - h); ctx.lineTo(x - w / 2, y - h * .45); ctx.fill(); ctx.strokeStyle = '#d8dde6'; ctx.lineWidth = .025; ctx.strokeRect(x - w / 2, y - h, w, h); ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x, y); ctx.moveTo(x - w / 2, y - h / 2); ctx.lineTo(x + w / 2, y - h / 2); ctx.stroke(); ctx.restore(); },
  };

  // ---------------------------------------------------------------- PLANOS: plan visual con cámara y transiciones
  /* plano = { dur (s, 3–6), pinta(ctx, tl, p) (mundo), cam: { de: {x, y, zoom}, a: {x, y, zoom}, curva: 'suave'|'lineal'|'entra' }, entrada: 'corte'|'fundido'|'zoom'|'barrido'|'deslizar', tema }
     cam.x/y = punto del mundo en el centro de la pantalla; zoom 1 = un muñeco mide 'base' de la altura de pantalla (por defecto 0.2). */
  MUN.plan = function (planos, o = {}) { let t = 0; const L = planos.map(p => { const r = Object.assign({ entrada: 'corte' }, p, { ini: t }); t += p.dur; r.fin = t; return r; }); return { planos: L, dur: t, base: o.base || .2, transicion: o.transicion || .45, centroY: o.centroY ?? .5 }; };
  MUN.revisar = function (plan) { const avisos = []; plan.planos.forEach((p, i) => { if (p.dur < 3 - 1e-6 || p.dur > 6 + 1e-6) avisos.push(`plano ${i + 1}: dura ${p.dur.toFixed(2)} s (debe estar entre 3 y 6 s)`); const c = p.cam || {}, de = c.de || {}, a = c.a || de; if (!c.a || (Math.abs((a.x ?? 0) - (de.x ?? 0)) < .02 && Math.abs((a.y ?? 0) - (de.y ?? 0)) < .02 && Math.abs((a.zoom ?? 1) - (de.zoom ?? 1)) < .02)) avisos.push(`plano ${i + 1}: cámara quieta (añade movimiento: acercar, alejar o desplazar)`); if (typeof p.pinta !== 'function') avisos.push(`plano ${i + 1}: falta pinta()`); }); return avisos; };
  /* Reparte una duración en N planos de 3–6 s (para ajustarse a la duración de un párrafo de voz). */
  MUN.repartir = function (dur, n) { n = n || Math.max(1, Math.round(dur / 4.5)); while (dur / n > 6 && n < 50) n++; while (n > 1 && dur / n < 3) n--; return Array.from({ length: n }, () => dur / n); };
  /* Ajusta las duraciones de una lista de planos para que sumen 'dur' (p. ej. ctx.dur de un párrafo de voz), manteniendo sus proporciones. */
  MUN.ajustar = function (planos, dur, o) { const suma = planos.reduce((q, p) => q + (p.dur || 1), 0); return MUN.plan(planos.map(p => Object.assign({}, p, { dur: (p.dur || 1) * dur / suma })), o); };
  function camara(ctx, W, H, plan, p, tl) { const c = p.cam || {}, de = Object.assign({ x: 0, y: -.5, zoom: 1 }, c.de), a = Object.assign({}, de, c.a), k = (MUN.ease[c.curva || 'suave'])(tl / p.dur);
    const x = mix(de.x, a.x, k), y = mix(de.y, a.y, k), z = mix(de.zoom, a.zoom, k), esc = H * plan.base * z;
    ctx.transform(esc, 0, 0, esc, W / 2 - x * esc, H * plan.centroY - y * esc); }
  function pintarPlano(ctx, W, H, plan, i, t) { const p = plan.planos[i], tl = Math.max(0, Math.min(p.dur, t - p.ini)); ctx.save(); if (p.fondo !== false) MUN.fondo(ctx, W, H, p.tema || 'noche'); camara(ctx, W, H, plan, p, tl); p.pinta(ctx, tl, tl / p.dur, t); ctx.restore(); }
  /* Pinta el plan en el instante t (segundos desde el inicio del plan). W, H = tamaño de diseño (1080×1920). Devuelve { i, tl } del plano activo. */
  MUN.pintar = function (ctx, W, H, plan, t) {
    t = Math.max(0, Math.min(plan.dur - 1e-6, t)); let i = plan.planos.findIndex(p => t < p.fin); if (i < 0) i = plan.planos.length - 1;
    const p = plan.planos[i], tl = t - p.ini, tr = Math.min(plan.transicion, p.dur * .3), q = i > 0 && p.entrada !== 'corte' ? cl(tl / tr) : 1;
    if (q >= 1) { pintarPlano(ctx, W, H, plan, i, t); return { i, tl }; }
    const e = ss(q), prev = plan.planos[i - 1], tPrev = prev.fin - 1e-3 + tl * .6;
    const conTrans = (fn, alpha, draw) => { ctx.save(); ctx.globalAlpha *= alpha; fn(); draw(); ctx.restore(); };
    if (p.entrada === 'fundido') { pintarPlano(ctx, W, H, plan, i - 1, tPrev); conTrans(() => {}, e, () => pintarPlano(ctx, W, H, plan, i, t)); }
    else if (p.entrada === 'zoom') { conTrans(() => { const s = 1 + 1.8 * e; ctx.translate(W / 2, H / 2); ctx.scale(s, s); ctx.translate(-W / 2, -H / 2); }, 1, () => pintarPlano(ctx, W, H, plan, i - 1, tPrev));
      conTrans(() => { const s = .55 + .45 * e; ctx.translate(W / 2, H / 2); ctx.scale(s, s); ctx.translate(-W / 2, -H / 2); }, e, () => pintarPlano(ctx, W, H, plan, i, t)); }
    else if (p.entrada === 'barrido') { const d = W * 1.05; for (const [k, al] of [[0, 1], [.04, .35], [.08, .18]]) conTrans(() => ctx.translate(-d * Math.min(1, e + k), 0), al, () => pintarPlano(ctx, W, H, plan, i - 1, tPrev));
      for (const [k, al] of [[0, 1], [-.04, .35]]) conTrans(() => ctx.translate(d * (1 - Math.min(1, e + k)), 0), al, () => pintarPlano(ctx, W, H, plan, i, t)); }
    else if (p.entrada === 'deslizar') { conTrans(() => ctx.translate(0, -H * e), 1, () => pintarPlano(ctx, W, H, plan, i - 1, tPrev)); conTrans(() => ctx.translate(0, H * (1 - e)), 1, () => pintarPlano(ctx, W, H, plan, i, t)); }
    else pintarPlano(ctx, W, H, plan, i, t);
    return { i, tl };
  };
})(typeof window !== 'undefined' ? window : globalThis);
