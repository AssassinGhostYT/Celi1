(() => {
  'use strict';

  const canvas = document.getElementById('cielo');
  const ctx = canvas.getContext('2d');
  const world = document.getElementById('world');
  const contPalabras = document.getElementById('palabras');
  const contFotos = document.getElementById('fotos');
  const FOTOS = window.FOTOS || [];

  let W = 0, H = 0, DPR = 1, cx = 0, cy = 0;

  const cam = { ox: 0, oy: 0, s: 1 };
  const MIN_S = 0.35, MAX_S = 7;
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

  /* ---------- Estrellas de fondo ---------- */
  const stars = [];
  const starColors = ['#ffffff', '#ffe9f2', '#cfe0ff', '#ffd9f0', '#e7d6ff'];
  for (let i = 0; i < 420; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.pow(Math.random(), 0.5) * 2000;
    stars.push({
      x: Math.cos(a) * r,
      y: Math.sin(a) * r,
      sz: 0.4 + Math.random() * 1.3,
      tw: Math.random() * Math.PI * 2,
      c: starColors[Math.floor(Math.random() * starColors.length)],
    });
  }

  /* ---------- Galaxia: muchos brazos, varios colores ---------- */
  const GAL_R = 265;
  const ARMS = 8;
  const palette = ['#ff5fa2', '#ff8ec8', '#c77dff', '#ff7ac8', '#b06bff', '#ffa6d5', '#8a7bff', '#ff6fae'];
  const galaxy = [];
  const N_GAL = 1350;
  for (let i = 0; i < N_GAL; i++) {
    const disperso = i % 6 === 0;
    const t = Math.pow(Math.random(), 0.62);
    const radio = 10 + t * GAL_R;
    const arm = i % ARMS;
    const angulo = disperso
      ? Math.random() * Math.PI * 2
      : arm * (Math.PI * 2 / ARMS) + t * 3.4 + (Math.random() - 0.5) * 0.5;
    galaxy.push({
      radio,
      angulo,
      vel: 0.0012 + 0.0030 / (radio / 40 + 1),
      tam: 0.6 + Math.random() * 1.9,
      color: palette[Math.floor(Math.random() * palette.length)],
      br: (disperso ? 0.25 : 0.45) + Math.random() * 0.55,
      fase: Math.random() * Math.PI * 2,
    });
  }

  /* ---------- Corazón (dibujado con código) ---------- */
  function heartPath(r) {
    ctx.beginPath();
    for (let i = 0; i <= 72; i++) {
      const t = (i / 72) * Math.PI * 2;
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      const px = (x / 16) * r;
      const py = -(y / 16) * r * 1.05;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  function drawHeart(time) {
    const pulso = 1 + 0.08 * Math.sin(time * 2.6);
    const r = 76 * pulso;

    const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.8);
    halo.addColorStop(0, 'rgba(255, 90, 150, .55)');
    halo.addColorStop(0.4, 'rgba(255, 60, 130, .22)');
    halo.addColorStop(1, 'rgba(255, 60, 130, 0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, r * 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const fill = ctx.createLinearGradient(-r, -r, r, r);
    fill.addColorStop(0, '#fff2f8');
    fill.addColorStop(0.35, '#ff8fc0');
    fill.addColorStop(0.7, '#ff2f86');
    fill.addColorStop(1, '#c81e6b');

    ctx.save();
    ctx.shadowColor = 'rgba(255, 60, 140, .9)';
    ctx.shadowBlur = 36;
    heartPath(r);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.restore();
  }

  /* ---------- Palabras e imágenes orbitando ---------- */
  const palabras = ['te quiero', 'te deseo', 'te extraño', 'eres mi sol', 'mi persona', 'te adoro', 'mi mundo'];
  const R_PAL = 305;
  const R_FOT = 475;
  const palEls = [];
  const fotEls = [];

  palabras.forEach((txt) => {
    const el = document.createElement('div');
    el.className = 'palabra';
    el.textContent = txt;
    contPalabras.appendChild(el);
    palEls.push(el);
  });

  function ponerPlaceholder(el) {
    el.classList.add('foto-vacia');
    el.innerHTML = '';
    const h = document.createElement('span');
    h.className = 'mini-corazon';
    el.appendChild(h);
  }

  for (let i = 0; i < 5; i++) {
    const el = document.createElement('div');
    el.className = 'foto';
    const img = document.createElement('img');
    img.src = FOTOS[i] || `static/fotos/foto${i + 1}.jpg`;
    img.alt = 'Nuestra foto ' + (i + 1);
    img.onerror = () => ponerPlaceholder(el);
    el.appendChild(img);
    contFotos.appendChild(el);
    fotEls.push(el);
  }

  function colocar(el, ang, radio) {
    const x = Math.cos(ang) * radio;
    const y = Math.sin(ang) * radio * 0.62;
    el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
  }

  /* ---------- Bucle de dibujo ---------- */
  const t0 = performance.now();
  function frame(now) {
    const time = (now - t0) / 1000;

    world.style.transform =
      `translate(${cx + cam.ox}px, ${cy + cam.oy}px) scale(${cam.s})`;

    palEls.forEach((el, i) => {
      colocar(el, time * 0.12 + (i / palEls.length) * Math.PI * 2, R_PAL);
    });
    fotEls.forEach((el, i) => {
      colocar(el, -time * 0.09 + (i / fotEls.length) * Math.PI * 2, R_FOT);
    });

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#05030c';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(cx + cam.ox, cy + cam.oy);
    ctx.scale(cam.s, cam.s);

    // estrellas
    for (const st of stars) {
      const tw = 0.5 + 0.5 * Math.sin(time * 2 + st.tw);
      ctx.globalAlpha = 0.3 + 0.6 * tw;
      ctx.fillStyle = st.c;
      ctx.fillRect(st.x - st.sz, st.y - st.sz, st.sz * 2, st.sz * 2);
    }
    ctx.globalAlpha = 1;

    // núcleo de la galaxia
    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, GAL_R * 0.95);
    core.addColorStop(0, 'rgba(255, 225, 242, .9)');
    core.addColorStop(0.25, 'rgba(255, 120, 190, .5)');
    core.addColorStop(0.6, 'rgba(180, 90, 255, .25)');
    core.addColorStop(1, 'rgba(120, 60, 200, 0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, GAL_R * 0.95, 0, Math.PI * 2);
    ctx.fill();

    // brazos / partículas de colores girando
    for (const p of galaxy) {
      p.angulo += p.vel;
      const x = Math.cos(p.angulo) * p.radio;
      const y = Math.sin(p.angulo) * p.radio * 0.82;
      ctx.globalAlpha = p.br * (0.6 + 0.4 * Math.sin(time * 2 + p.fase));
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(x, y, p.tam, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    drawHeart(time);

    ctx.restore();

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ---------- Zoom con los dedos / arrastrar / rueda ---------- */
  function screenToWorld(px, py) {
    return { x: (px - cx - cam.ox) / cam.s, y: (py - cy - cam.oy) / cam.s };
  }

  let pinch = null;
  let pan = null;

  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      pan = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      pinch = null;
    } else if (e.touches.length >= 2) {
      const a = e.touches[0];
      const b = e.touches[1];
      const mx = (a.clientX + b.clientX) / 2;
      const my = (a.clientY + b.clientY) / 2;
      pinch = {
        d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        s: cam.s,
        w: screenToWorld(mx, my),
      };
      pan = null;
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && pan) {
      const t = e.touches[0];
      cam.ox += t.clientX - pan.x;
      cam.oy += t.clientY - pan.y;
      pan = { x: t.clientX, y: t.clientY };
    } else if (e.touches.length >= 2 && pinch) {
      const a = e.touches[0];
      const b = e.touches[1];
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const mx = (a.clientX + b.clientX) / 2;
      const my = (a.clientY + b.clientY) / 2;
      const ns = clamp(pinch.s * (d / pinch.d), MIN_S, MAX_S);
      cam.s = ns;
      cam.ox = (mx - cx) - pinch.w.x * ns;
      cam.oy = (my - cy) - pinch.w.y * ns;
    }
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    if (e.touches.length === 0) {
      pinch = null;
      pan = null;
    } else if (e.touches.length === 1) {
      pan = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      pinch = null;
    }
  });

  // ratón: arrastrar
  canvas.addEventListener('mousedown', (e) => {
    pan = { x: e.clientX, y: e.clientY };
  });
  window.addEventListener('mousemove', (e) => {
    if (!pan) return;
    cam.ox += e.clientX - pan.x;
    cam.oy += e.clientY - pan.y;
    pan = { x: e.clientX, y: e.clientY };
  });
  window.addEventListener('mouseup', () => { pan = null; });

  // rueda: zoom al cursor
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const ns = clamp(cam.s * Math.exp(-e.deltaY * 0.0015), MIN_S, MAX_S);
    const w = screenToWorld(e.clientX, e.clientY);
    cam.s = ns;
    cam.ox = (e.clientX - cx) - w.x * ns;
    cam.oy = (e.clientY - cy) - w.y * ns;
  }, { passive: false });

  // doble toque: acercar / alejar
  let lastTap = 0;
  canvas.addEventListener('touchend', (e) => {
    if (e.touches.length !== 0) return;
    const now = Date.now();
    if (now - lastTap < 300) {
      const ch = e.changedTouches[0];
      const w = screenToWorld(ch.clientX, ch.clientY);
      const ns = cam.s > 1.6 ? 1 : 2.4;
      cam.s = ns;
      cam.ox = (ch.clientX - cx) - w.x * ns;
      cam.oy = (ch.clientY - cy) - w.y * ns;
      lastTap = 0;
    } else {
      lastTap = now;
    }
  });

  document.getElementById('recentrar').addEventListener('click', () => {
    cam.ox = 0;
    cam.oy = 0;
    cam.s = 1;
  });
})();
