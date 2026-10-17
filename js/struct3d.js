// Module 1: 3D (orthographic) view of the MOSFET, so the effect of the width W is visible.
(() => {
  'use strict';
  const { $, C, readTheme, setupCanvas, onTheme, roundRect } = window.MOSUI;
  const cv = $('cv-3d');
  if (!cv) return;
  const { ctx, w: W, h: H } = setupCanvas(cv);

  const V = { yaw: -0.62, pitch: 0.5, glass: true, chan: true };
  const DEF = { yaw: -0.62, pitch: 0.5 };

  const val = (id, d) => { const e = $(id); return e ? parseFloat(e.value) : d; };

  const typeNow = () => { const b = document.querySelector('#seg-type [aria-pressed="true"]'); return b ? b.dataset.type : 'nmos'; };

  // one transistor centred at x = cx. kind: 'nmos' (n+ in p-substrate) or 'pmos' (p+ in an n-well)
  function device(kind, cx, g, shortSD) {
    const { Lp, dLD, D, zt, tpx } = g;
    const X = Lp / 2 + (shortSD ? 62 : 105), xj = 30, p = kind === 'pmos';
    const sd = p ? C.hole : C.n, sda = p ? 0.7 : 1;
    const bx = [
      { n: 'src', x0: cx - X + 14, x1: cx - Lp / 2 + dLD, y0: -D / 2, y1: D / 2, z0: -xj, z1: zt, c: sd, a: sda },
      { n: 'drn', x0: cx + Lp / 2 - dLD, x1: cx + X - 14, y0: -D / 2, y1: D / 2, z0: -xj, z1: zt, c: sd, a: sda }
    ];
    if (V.chan) bx.push({ n: 'chan', x0: cx - Lp / 2 + dLD, x1: cx + Lp / 2 - dLD, y0: -D / 2, y1: D / 2, z0: -3, z1: zt, c: p ? C.hole : C.e, a: 0.9 });
    bx.push({ n: 'ox', x0: cx - Lp / 2, x1: cx + Lp / 2, y0: -D / 2 - 5, y1: D / 2 + 5, z0: zt, z1: zt + tpx, c: C.ox, a: V.glass ? 0.55 : 1 });
    bx.push({ n: 'gate', x0: cx - Lp / 2, x1: cx + Lp / 2, y0: -D / 2 - 5, y1: D / 2 + 5, z0: zt + tpx, z1: zt + tpx + 24, c: C.metal, a: V.glass ? 0.4 : 1 });
    return { bx, X };
  }

  function scene() {
    const Ld = val('s-ld', 40), LD = val('s-lD', 8), tox = val('s-tox', 1.5), Wu = val('s-w', 1);
    const type = typeNow();
    const g = { Lp: Ld * 0.95, dLD: LD * 0.95, D: 30 + Wu * 20, zt: 0.6, tpx: 2 + tox * 2.2 };
    const labels = [];
    let boxes = [], X, cxMain = 0, Ym = g.D / 2 + 26;
    if (type === 'cmos') {
      const d1 = device('nmos', 0, g, true), d2 = device('pmos', 0, g, true);
      const sp = d1.X + 8;                                  // half distance between the device centres
      const dn = device('nmos', -sp, g, true), dp = device('pmos', sp, g, true);
      X = 2 * sp + 20; cxMain = -sp;
      boxes.push({ n: 'sub', x0: -X, x1: X, y0: -Ym, y1: Ym, z0: -72, z1: 0, c: C.si });
      boxes.push({ n: 'well', x0: sp - dp.X - 4, x1: X - 8, y0: -Ym + 8, y1: Ym - 8, z0: -52, z1: 0.2, c: C.n, a: 0.55 });
      boxes.push(...dn.bx, ...dp.bx);
      labels.push(['NMOS', [-sp, 0, 92]], ['PMOS', [sp, 0, 92]], ['p-substrate', [-X + 40, -Ym - 6, 0.3]], ['n-well', [X - 30, Ym + 2, 0.5]]);
    } else if (type === 'pmos') {
      const dp = device('pmos', 0, g, false);
      X = dp.X;
      boxes.push({ n: 'sub', x0: -X - 14, x1: X + 14, y0: -Ym - 10, y1: Ym + 10, z0: -72, z1: 0, c: C.si });
      boxes.push({ n: 'well', x0: -X + 2, x1: X - 2, y0: -Ym + 2, y1: Ym - 2, z0: -52, z1: 0.2, c: C.n, a: 0.55 });
      boxes.push(...dp.bx);
      labels.push(['p+ source', [-g.Lp / 2 - 48, 0, g.zt + 0.1]], ['p+ drain', [g.Lp / 2 + 48, 0, g.zt + 0.1]], ['n-well (the PMOS body)', [-X + 78, Ym - 6, 0.5]], ['p-substrate', [X - 24, -Ym - 4, 0.3]]);
    } else {
      const dn = device('nmos', 0, g, false);
      X = dn.X;
      boxes.push({ n: 'sub', x0: -X, x1: X, y0: -Ym, y1: Ym, z0: -72, z1: 0, c: C.si });
      boxes.push(...dn.bx);
      labels.push(['source n+', [-g.Lp / 2 - 48, 0, g.zt + 0.1]], ['drain n+', [g.Lp / 2 + 48, 0, g.zt + 0.1]], ['p-substrate (the body)', [-X + 62, Ym - 10, 0.3]]);
    }
    return { boxes, labels, type, cxMain, g, X, Ym, Lp: g.Lp, dLD: g.dLD, D: g.D, zt: g.zt, tpx: g.tpx, Ld, LD, Wu, gz: g.zt + g.tpx + 24 };
  }

  let SC = 1.55; const CX = W / 2, CY = 232;
  function proj(p) {
    const cy = Math.cos(V.yaw), sy = Math.sin(V.yaw), cp = Math.cos(V.pitch), sp = Math.sin(V.pitch);
    const xr = p[0] * cy - p[1] * sy, d = p[0] * sy + p[1] * cy;
    return [CX + xr * SC, CY - (p[2] * cp + d * sp) * SC, -d * cp + p[2] * sp];
  }
  function viewN(n) {            // z-component of a normal toward the viewer
    const cy = Math.cos(V.yaw), sy = Math.sin(V.yaw), cp = Math.cos(V.pitch), sp = Math.sin(V.pitch);
    const d = n[0] * sy + n[1] * cy;
    return -d * cp + n[2] * sp;
  }
  const FACES = [
    { n: [0, 0, 1], v: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], l: 1 },
    { n: [1, 0, 0], v: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], l: 0.82 },
    { n: [-1, 0, 0], v: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], l: 0.7 },
    { n: [0, 1, 0], v: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]], l: 0.9 },
    { n: [0, -1, 0], v: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], l: 0.76 }
  ];

  function line3(a, b, col, wd, dash) {
    const p = proj(a), q = proj(b);
    ctx.strokeStyle = col; ctx.lineWidth = wd || 1.5; ctx.setLineDash(dash || []);
    ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); ctx.setLineDash([]);
    return [p, q];
  }
  function dim(a, b, text, col, off) {
    const [p, q] = line3(a, b, col, 1.8);
    for (const e of [p, q]) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(e[0], e[1], 3, 0, 7); ctx.fill(); }
    const mx = (p[0] + q[0]) / 2 + (off ? off[0] : 0), my = (p[1] + q[1]) / 2 + (off ? off[1] : -8);
    ctx.font = '600 13px system-ui, sans-serif'; ctx.textAlign = 'center';
    const tw = ctx.measureText(text).width + 10;
    ctx.fillStyle = C.card; ctx.globalAlpha = 0.85; ctx.fillRect(mx - tw / 2, my - 13, tw, 18); ctx.globalAlpha = 1;
    ctx.fillStyle = col; ctx.fillText(text, mx, my);
  }

  function draw() {
    ctx.fillStyle = C.card; ctx.fillRect(0, 0, W, H);
    const sc = scene();
    SC = sc.type === 'cmos' ? 1.12 : 1.55;
    const faces = [];
    for (const b of sc.boxes) {
      for (const f of FACES) {
        if (viewN(f.n) <= 0.001) continue;
        const pts = f.v.map((u) => proj([u[0] ? b.x1 : b.x0, u[1] ? b.y1 : b.y0, u[2] ? b.z1 : b.z0]));
        const depth = (pts[0][2] + pts[1][2] + pts[2][2] + pts[3][2]) / 4;
        faces.push({ pts, depth: b.n === 'sub' ? -1e9 + depth : b.n === 'well' ? -1e8 + depth : depth, b, l: f.l, top: f.n[2] === 1 });
      }
    }
    faces.sort((u, v) => u.depth - v.depth);
    for (const f of faces) {
      ctx.beginPath(); ctx.moveTo(f.pts[0][0], f.pts[0][1]);
      for (let i = 1; i < 4; i++) ctx.lineTo(f.pts[i][0], f.pts[i][1]);
      ctx.closePath();
      ctx.globalAlpha = f.b.a === undefined ? 1 : f.b.a;
      ctx.fillStyle = f.b.c; ctx.fill();
      ctx.fillStyle = '#000'; ctx.globalAlpha = (f.b.a === undefined ? 1 : f.b.a) * (1 - f.l) * 0.55; ctx.fill();
      ctx.globalAlpha = 0.5; ctx.strokeStyle = C.muted; ctx.lineWidth = 0.8; ctx.stroke(); ctx.globalAlpha = 1;
    }
    // dimension lines (on the NMOS in the CMOS view)
    const { Lp, dLD, D, zt, gz } = sc;
    const cm = sc.type === 'cmos';
    const centres = cm ? [sc.cxMain, -sc.cxMain] : [0];
    centres.forEach((cx, i) => {
      const xe = cx + Lp / 2 + (cm ? 62 : 105) - 14;
      dim([xe, -D / 2, zt], [xe, D / 2, zt], (cm ? 'W' : 'W = ' + sc.Wu.toFixed(1) + ' µm') , C.warm);
      dim([cx - Lp / 2, D / 2 + 5, gz], [cx + Lp / 2, D / 2 + 5, gz], (cm ? 'L = ' : 'L drawn = ') + sc.Ld + ' nm', C.accent, [0, -10]);
      if (sc.LD > 0) dim([cx - Lp / 2 + dLD, -D / 2 - 14, 0], [cx + Lp / 2 - dLD, -D / 2 - 14, 0], (cm ? 'Leff = ' : 'L eff = ') + (sc.Ld - 2 * sc.LD) + ' nm', C.fg, [0, 16]);
    });
    const lab = (txt, p) => { const q = proj(p); ctx.fillStyle = C.fg; ctx.font = '600 13px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(txt, q[0], q[1]); };
    for (const [t, p] of sc.labels) lab(t, p);
    ctx.fillStyle = C.muted; ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('drag to rotate', 14, H - 12);
  }

  // interaction
  let drag = null;
  cv.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, yaw: V.yaw, pitch: V.pitch }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', (e) => {
    if (!drag) return;
    V.yaw = drag.yaw + (e.clientX - drag.x) * 0.01;
    V.pitch = Math.max(0.12, Math.min(1.45, drag.pitch + (e.clientY - drag.y) * 0.008));
    draw();
  });
  const end = () => { drag = null; };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  cv.addEventListener('keydown', (e) => {
    const k = { ArrowLeft: [-0.1, 0], ArrowRight: [0.1, 0], ArrowUp: [0, -0.08], ArrowDown: [0, 0.08] }[e.key];
    if (!k) return;
    e.preventDefault(); V.yaw += k[0]; V.pitch = Math.max(0.12, Math.min(1.45, V.pitch + k[1])); draw();
  });
  const tog = (id, key) => {
    const b = $(id); if (!b) return;
    b.addEventListener('click', () => { V[key] = !V[key]; b.setAttribute('aria-pressed', String(V[key])); draw(); });
  };
  tog('t3-glass', 'glass'); tog('t3-chan', 'chan');
  $('t3-reset').addEventListener('click', () => { Object.assign(V, DEF); draw(); });
  for (const id of ['s-ld', 's-lD', 's-tox', 's-w']) $(id).addEventListener('input', draw);
  document.querySelectorAll('#seg-type button').forEach((b) => b.addEventListener('click', () => setTimeout(draw, 0)));
  onTheme(draw);
  readTheme(); draw();
})();
