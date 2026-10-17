(() => {
  'use strict';

  const canvas = document.getElementById('cielo');
  const ctx = canvas.getContext('2d');
  const FOTOS = window.FOTOS || [
    'static/fotos/foto1.jpg',
    'static/fotos/foto2.jpg',
    'static/fotos/foto3.jpg',
    'static/fotos/foto4.jpg',
    'static/fotos/foto5.jpg',
  ];

  let W = 0, H = 0, DPR = 1, cx = 0, cy = 0;

  const cam = { s: 1 };
  let pitch = 1.22;      // inclinación (0 = de frente, ~1.57 = de lado)
  let yaw = 0;           // giro alrededor del eje vertical
  const MIN_S = 0.35, MAX_S = 7;
  const PITCH_MIN = 0.08, PITCH_MAX = 1.5;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    cx = W / 2;
    cy = H / 2;
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  /* ============ Proyección 3D ============ */
  function proyectar(x, y, z) {
    const cyw = Math.cos(yaw), syw = Math.sin(yaw);
    const X = x * cyw + z * syw;
    const Z = -x * syw + z * cyw;
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const Y = y * cp - Z * sp;
    const Z2 = y * sp + Z * cp;
    return [X, Y, Z2];
  }

  /* ============ Estrellas de fondo ============ */
  const stars = [];
  const starColors = ['#ffffff', '#ffe9f2', '#cfe0ff', '#ffd9f0', '#e7d6ff'];
  function crearEstrellas() {
    stars.length = 0;
    const n = 380;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.pow(Math.random(), 0.5) * Math.max(W, H) * 0.85;
      stars.push({
        x: Math.cos(a) * r,
        y: Math.sin(a) * r,
        sz: 0.4 + Math.random() * 1.3,
        tw: Math.random() * Math.PI * 2,
        c: starColors[Math.floor(Math.random() * starColors.length)],
      });
    }
  }
  crearEstrellas();

  /* ============ Galaxia (muchos brazos, en 3D) ============ */
  const GAL_R = 250;
  const ARMS = 8;
  const palette = ['#ff5fa2', '#ff8ec8', '#c77dff', '#ff7ac8', '#b06bff', '#ffa6d5', '#8a7bff', '#ff6fae'];
  const galaxy = [];
  for (let i = 0; i < 950; i++) {
    const disperso = i % 6 === 0;
    const t = Math.pow(Math.random(), 0.62);
    const r = 8 + t * GAL_R;
    const arm = i % ARMS;
    const th = disperso
      ? Math.random() * Math.PI * 2
      : arm * (Math.PI * 2 / ARMS) + t * 3.4 + (Math.random() - 0.5) * 0.5;
    galaxy.push({
      r,
      th,
      z: (Math.random() - 0.5) * 12,
      sz: 0.6 + Math.random() * 1.8,
      c: palette[Math.floor(Math.random() * palette.length)],
      br: (disperso ? 0.25 : 0.45) + Math.random() * 0.55,
      fase: Math.random() * Math.PI * 2,
    });
  }

  /* ============ Corazón hecho de puntitos (estrellas) ============ */
  const HR = 158;
  const hk = HR / 16;
  const heartColors = ['#ffffff', '#ffe6f2', '#ffc2e0', '#ff9ecd', '#ffd0e6', '#fff2f8'];
  const heartPts = [];
  function corazonXY(t) {
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    return [x * hk, -(y + 6) * hk];
  }
  for (let i = 0; i < 210; i++) {
    const [x, y] = corazonXY((i / 210) * Math.PI * 2);
    heartPts.push({ x, y, tw: Math.random() * Math.PI * 2, sz: 0.9 + Math.random() * 1.7, c: heartColors[Math.floor(Math.random() * heartColors.length)] });
  }
  for (let i = 0; i < 190; i++) {
    const [x, y] = corazonXY(Math.random() * Math.PI * 2);
    const s = Math.sqrt(Math.random());
    heartPts.push({ x: x * s, y: y * s, tw: Math.random() * Math.PI * 2, sz: 0.6 + Math.random() * 1.2, c: heartColors[Math.floor(Math.random() * heartColors.length)] });
  }

  /* ============ Textos y fotos (dentro de la galaxia) ============ */
  const palabras = ['te quiero', 'te deseo', 'te extraño', 'eres mi sol', 'mi persona', 'te adoro', 'mi mundo'];
  const R_PAL = 172;
  const R_FOT = 214;
  const wordItems = palabras.map((txt, i) => ({
    txt,
    phi: (i / palabras.length) * Math.PI * 2,
    r: R_PAL,
    speed: 0.16,
  }));

  const imageItems = FOTOS.slice(0, 5).map((src, i) => {
    const img = new Image();
    img.src = src;
    const item = { img, size: 96, phi: (i / 5) * Math.PI * 2 + 0.4, r: R_FOT, speed: 0.1, listo: false, error: false };
    img.onload = () => { item.listo = true; };
    img.onerror = () => { item.error = true; };
    return item;
  });

  /* ============ Dibujo ============ */
  const t0 = performance.now();

  function drawStars(time) {
    for (const st of stars) {
      const tw = 0.5 + 0.5 * Math.sin(time * 2 + st.tw);
      ctx.globalAlpha = 0.3 + 0.6 * tw;
      ctx.fillStyle = st.c;
      ctx.fillRect(st.x - st.sz, st.y - st.sz, st.sz * 2, st.sz * 2);
    }
    ctx.globalAlpha = 1;
  }

  function drawGalaxia(time) {
    // núcleo
    const rg = GAL_R * cam.s;
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, rg);
    core.addColorStop(0, 'rgba(255, 225, 242, .55)');
    core.addColorStop(0.3, 'rgba(255, 120, 190, .28)');
    core.addColorStop(0.65, 'rgba(180, 90, 255, .14)');
    core.addColorStop(1, 'rgba(120, 60, 200, 0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy, rg, 0, Math.PI * 2);
    ctx.fill();

    for (const p of galaxy) {
      const th = p.th + time * 0.26;
      const [X, Y, Z] = proyectar(Math.cos(th) * p.r, Math.sin(th) * p.r, p.z);
      const sx = cx + X * cam.s;
      const sy = cy + Y * cam.s;
      const zn = clamp(Z / GAL_R, -1, 1);
      const frente = 0.5 - 0.5 * zn; // 1 = delante, 0 = detrás
      const parp = 0.6 + 0.4 * Math.sin(time * 2 + p.fase);
      ctx.globalAlpha = p.br * (0.4 + 0.6 * frente) * parp;
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.arc(sx, sy, p.sz * (0.8 + 0.5 * frente), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawCorazon(time) {
    const pulso = 1 + 0.06 * Math.sin(time * 2.4);
    const r = HR * cam.s * pulso;

    // halo suave
    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.5);
    halo.addColorStop(0, 'rgba(255, 120, 180, .30)');
    halo.addColorStop(0.5, 'rgba(255, 80, 160, .12)');
    halo.addColorStop(1, 'rgba(255, 80, 160, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(cam.s * pulso, cam.s * pulso);
    for (const p of heartPts) {
      const tw = 0.5 + 0.5 * Math.sin(time * 3 + p.tw);
      ctx.globalAlpha = 0.3 + 0.7 * tw;
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.sz, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function dibujarPalabra(it, sx, sy, escala, alpha) {
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${Math.round(26 * cam.s * escala)}px Pacifico, cursive`;
    ctx.lineWidth = Math.max(2, 3.5 * cam.s);
    ctx.strokeStyle = 'rgba(0,0,0,.85)';
    ctx.strokeText(it.txt, sx, sy);
    ctx.fillStyle = '#ffd7ea';
    ctx.fillText(it.txt, sx, sy);
    ctx.globalAlpha = 1;
  }

  function dibujarFoto(item, sx, sy, escala, alpha, time) {
    const s = item.size * cam.s * escala;
    ctx.globalAlpha = alpha;
    if (item.listo) {
      ctx.save();
      ctx.beginPath();
      const rad = s * 0.16;
      ctx.moveTo(sx - s / 2 + rad, sy - s / 2);
      ctx.arcTo(sx + s / 2, sy - s / 2, sx + s / 2, sy + s / 2, rad);
      ctx.arcTo(sx + s / 2, sy + s / 2, sx - s / 2, sy + s / 2, rad);
      ctx.arcTo(sx - s / 2, sy + s / 2, sx - s / 2, sy - s / 2, rad);
      ctx.arcTo(sx - s / 2, sy - s / 2, sx + s / 2, sy - s / 2, rad);
      ctx.closePath();
      ctx.save();
      ctx.clip();
      ctx.drawImage(item.img, sx - s / 2, sy - s / 2, s, s);
      ctx.restore();
      ctx.lineWidth = Math.max(2, 3 * cam.s);
      ctx.strokeStyle = 'rgba(255,150,200,.9)';
      ctx.stroke();
      ctx.restore();
    } else {
      // marcador: corazoncito dibujado con codigo
      const k = s / 2;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,150,200,.85)';
      ctx.lineWidth = Math.max(2, 3 * cam.s);
      ctx.beginPath();
      ctx.moveTo(sx - s / 2, sy - s / 2);
      ctx.lineTo(sx + s / 2, sy - s / 2);
      ctx.lineTo(sx + s / 2, sy + s / 2);
      ctx.lineTo(sx - s / 2, sy + s / 2);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = '#ff5fa2';
      ctx.beginPath();
      const pul = 1 + 0.08 * Math.sin(time * 3);
      const rr = k * 0.55 * pul;
      ctx.moveTo(sx, sy + rr * 0.9);
      ctx.bezierCurveTo(sx + rr * 1.3, sy - rr * 0.2, sx + rr * 0.4, sy - rr * 1.1, sx, sy - rr * 0.25);
      ctx.bezierCurveTo(sx - rr * 0.4, sy - rr * 1.1, sx - rr * 1.3, sy - rr * 0.2, sx, sy + rr * 0.9);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    const time = (now - t0) / 1000;

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#05030c';
    ctx.fillRect(0, 0, W, H);

    drawStars(time);

    ctx.globalCompositeOperation = 'lighter';
    drawGalaxia(time);

    // calcular posiciones de textos y fotos
    const items = [];
    wordItems.forEach((w) => {
      const ang = w.phi + time * w.speed;
      const [X, Y, Z] = proyectar(Math.cos(ang) * w.r, Math.sin(ang) * w.r, 0);
      items.push({ Z, t: 'p', sx: cx + X * cam.s, sy: cy + Y * cam.s, ref: w, frente: 0.5 - 0.5 * clamp(Z / GAL_R, -1, 1) });
    });
    imageItems.forEach((im) => {
      const ang = im.phi + time * im.speed;
      const [X, Y, Z] = proyectar(Math.cos(ang) * im.r, Math.sin(ang) * im.r, 0);
      items.push({ Z, t: 'f', sx: cx + X * cam.s, sy: cy + Y * cam.s, ref: im, frente: 0.5 - 0.5 * clamp(Z / GAL_R, -1, 1) });
    });

    const atras = items.filter((it) => it.frente <= 0.5).sort((a, b) => a.Z - b.Z);
    const adelante = items.filter((it) => it.frente > 0.5).sort((a, b) => a.Z - b.Z);

    ctx.globalCompositeOperation = 'source-over';
    atras.forEach((it) => pintar(it, time));

    ctx.globalCompositeOperation = 'lighter';
    drawCorazon(time);

    ctx.globalCompositeOperation = 'source-over';
    adelante.forEach((it) => pintar(it, time));

    requestAnimationFrame(frame);
  }

  function pintar(it, time) {
    const escala = 1 + (it.Z / GAL_R) * 0.18;
    const alpha = 0.55 + 0.45 * it.frente;
    if (it.t === 'p') dibujarPalabra(it.ref, it.sx, it.sy, escala, alpha);
    else dibujarFoto(it.ref, it.sx, it.sy, escala, alpha, time);
  }

  requestAnimationFrame(frame);

  /* ============ Gestos: girar y hacer zoom ============ */
  let pinch = null;
  let girando = null;
  let ultimoToque = 0;

  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      girando = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      pinch = null;
    } else if (e.touches.length >= 2) {
      const a = e.touches[0], b = e.touches[1];
      pinch = { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), s: cam.s };
      girando = null;
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && girando) {
      const t = e.touches[0];
      yaw += (t.clientX - girando.x) * 0.006;
      pitch = clamp(pitch + (t.clientY - girando.y) * 0.006, PITCH_MIN, PITCH_MAX);
      girando = { x: t.clientX, y: t.clientY };
    } else if (e.touches.length >= 2 && pinch) {
      const a = e.touches[0], b = e.touches[1];
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      cam.s = clamp(pinch.s * (d / pinch.d), MIN_S, MAX_S);
    }
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    if (e.touches.length === 0) {
      const dt = Date.now();
      if (dt - ultimoToque < 300) {
        cam.s = cam.s > 1.6 ? 1 : 2.4;
        ultimoToque = 0;
      } else {
        ultimoToque = dt;
      }
      girando = null;
      pinch = null;
    } else if (e.touches.length === 1) {
      girando = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      pinch = null;
    }
  });

  canvas.addEventListener('mousedown', (e) => {
    girando = { x: e.clientX, y: e.clientY };
  });
  window.addEventListener('mousemove', (e) => {
    if (!girando) return;
    yaw += (e.clientX - girando.x) * 0.006;
    pitch = clamp(pitch + (e.clientY - girando.y) * 0.006, PITCH_MIN, PITCH_MAX);
    girando = { x: e.clientX, y: e.clientY };
  });
  window.addEventListener('mouseup', () => { girando = null; });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    cam.s = clamp(cam.s * Math.exp(-e.deltaY * 0.0015), MIN_S, MAX_S);
  }, { passive: false });

  document.getElementById('recentrar').addEventListener('click', () => {
    cam.s = 1;
    pitch = 1.22;
    yaw = 0;
  });
})();
