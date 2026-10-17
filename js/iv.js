// Module 3: NMOS I-V characteristics (long-channel square-law model + channel-length modulation)
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const VMAX = 1.8;      // axis limit for V_DS and V_GS (V)
  const VOVREF = 1.5;    // overdrive that maps to the thickest drawn inversion layer
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- parameters (units: V, uA/V^2, uA) ----
  const P = { kp: 100, wl: 10, vth: 0.4, lam: 0.1, vgs: 1.0, vds: 0.8 };

  const PRESETS = {
    cutoff:  { vgs: 0.3, vds: 0.8 },
    uniform: { vgs: 1.2, vds: 0.0 },
    deep:    { vgs: 1.4, vds: 0.05 },
    triode:  { vgs: 1.2, vds: 0.4 },
    edge:    { vgs: 1.0, vds: 0.6 },
    sat:     { vgs: 1.0, vds: 1.2 },
    short:   { vgs: 1.0, vds: 1.5, lam: 0.25 }
  };

  // ---- model ----
  function idf(vgs, vds) {
    const vov = vgs - P.vth;
    if (vov <= 0 || vds <= 0) return 0;
    const k = P.kp * P.wl;
    const m = 1 + P.lam * vds;
    return vds < vov ? k * (vov * vds - vds * vds / 2) * m : 0.5 * k * vov * vov * m;
  }

  function model() {
    const vov = P.vgs - P.vth;
    const k = P.kp * P.wl;
    let region = 'cutoff';
    if (vov > 0) region = P.vds < vov ? 'triode' : 'saturation';
    // visual pinch-off position (fraction of L); exaggerated, clamped
    const sp = region === 'saturation' ? Math.max(0.35, 1 - P.lam * (P.vds - vov)) : 1;
    return { vov, k, region, ID: idf(P.vgs, P.vds), sp, vds: P.vds };
  }

  // Channel potential V(s), s = x/L in [0,1]; defined inside the inverted part of the channel
  function Vch(s, m) {
    if (m.vov <= 0) return 0;
    if (m.region === 'triode') {
      const a = m.vov * m.vds - m.vds * m.vds / 2;
      return m.vov - Math.sqrt(Math.max(0, m.vov * m.vov - 2 * s * a));
    }
    const u = Math.min(s / m.sp, 1);
    return m.vov * (1 - Math.sqrt(1 - u));
  }
  // Including the depleted gap after pinch-off (straight ramp from V_ov up to V_DS)
  function Vfull(s, m) {
    if (m.region === 'saturation' && s > m.sp) {
      return m.vov + (m.vds - m.vov) * (s - m.sp) / (1 - m.sp);
    }
    return Vch(s, m);
  }

  // ---- canvas helpers ----
  function setupCanvas(c) {
    const w = c.width, h = c.height; // logical size from HTML attributes
    const r = Math.min(window.devicePixelRatio || 1, 2);
    c.width = w * r; c.height = h * r;
    const ctx = c.getContext('2d');
    ctx.setTransform(r, 0, 0, r, 0, 0);
    return { ctx, w, h };
  }

  let C = {};
  function readTheme() {
    const s = getComputedStyle(document.documentElement);
    const g = (n) => s.getPropertyValue(n).trim();
    C = { card: g('--card'), fg: g('--fg'), muted: g('--muted'), line: g('--line'), e: g('--e'),
          warm: g('--warm'), si: g('--si'), n: g('--nplus'), metal: g('--metal'), ox: g('--ox'),
          dep: g('--dep'), accent: g('--accent'), tri: g('--tri') };
  }

  // text with a subscript: sub(ctx,'V','DS',x,y,size,align)
  function subText(ctx, base, sub, x, y, size, align) {
    const small = Math.round(size * 0.72);
    ctx.font = size + 'px system-ui, sans-serif';
    const wb = ctx.measureText(base).width;
    ctx.font = small + 'px system-ui, sans-serif';
    const ws = ctx.measureText(sub).width;
    let x0 = x;
    if (align === 'center') x0 = x - (wb + ws) / 2;
    else if (align === 'right') x0 = x - (wb + ws);
    ctx.textAlign = 'left';
    ctx.font = size + 'px system-ui, sans-serif';
    ctx.fillText(base, x0, y);
    ctx.font = small + 'px system-ui, sans-serif';
    ctx.fillText(sub, x0 + wb, y + size * 0.25);
  }

  function niceStep(raw) {
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const f = raw / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
  }

  // ======================= I_D vs V_DS plot =======================
  const cv1 = $('cv-curves');
  const g1 = setupCanvas(cv1);
  const PL = { l: 62, r: 18, t: 18, b: 46 };
  let ymaxCache = 1;

  function drawCurves() {
    const { ctx, w, h } = g1;
    const pw = w - PL.l - PL.r, ph = h - PL.t - PL.b;
    ctx.clearRect(0, 0, w, h);

    const list = [0.6, 0.8, 1.0, 1.2, 1.4, 1.6, 1.8];
    let ymax = 1;
    for (const g of list) ymax = Math.max(ymax, idf(g, VMAX));
    ymax = Math.max(ymax, idf(P.vgs, VMAX)) * 1.08;
    ymaxCache = ymax;
    const X = (v) => PL.l + v / VMAX * pw;
    const Y = (i) => PL.t + ph - i / ymax * ph;

    // axes grid + ticks
    const step = niceStep(ymax / 5);
    ctx.lineWidth = 1;
    ctx.strokeStyle = C.line; ctx.fillStyle = C.muted;
    ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'right';
    for (let i = 0; i <= ymax; i += step) {
      const y = Y(i);
      ctx.beginPath(); ctx.moveTo(PL.l, y); ctx.lineTo(PL.l + pw, y); ctx.stroke();
      const lab = ymax >= 2000 ? (i / 1000).toFixed(i % 1000 ? 1 : 0) : String(Math.round(i));
      ctx.fillText(lab, PL.l - 8, y + 4);
    }
    ctx.textAlign = 'center';
    for (let v = 0; v <= VMAX + 1e-9; v += 0.2) {
      ctx.fillText(v.toFixed(1), X(v), PL.t + ph + 16);
    }
    ctx.fillStyle = C.fg;
    subText(ctx, 'V', 'DS (V)', PL.l + pw / 2, h - 8, 13, 'center');
    ctx.save();
    ctx.translate(14, PL.t + ph / 2); ctx.rotate(-Math.PI / 2);
    subText(ctx, 'I', 'D ' + (ymax >= 2000 ? '(mA)' : '(µA)'), 0, 0, 13, 'center');
    ctx.restore();

    // clip to plot
    ctx.save();
    ctx.beginPath(); ctx.rect(PL.l, PL.t, pw, ph); ctx.clip();

    // triode shading: left of / above the V_DS = V_ov locus
    const vend = Math.min(VMAX, VMAX - P.vth);
    ctx.globalAlpha = 0.10; ctx.fillStyle = C.tri;
    ctx.beginPath(); ctx.moveTo(X(0), Y(0));
    for (let v = 0; v <= vend + 1e-9; v += 0.01) ctx.lineTo(X(v), Y(idf(v + P.vth, v)));
    ctx.lineTo(X(vend), PL.t - 5); ctx.lineTo(X(0), PL.t - 5); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;

    // family of curves
    for (const g of list) {
      ctx.strokeStyle = C.muted; ctx.globalAlpha = 0.55; ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let v = 0; v <= VMAX + 1e-9; v += 0.01) {
        const x = X(v), y = Y(idf(g, v));
        v === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke(); ctx.globalAlpha = 1;
    }

    // locus V_DS = V_GS - V_TH
    ctx.strokeStyle = C.fg; ctx.globalAlpha = 0.6; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let v = 0; v <= vend + 1e-9; v += 0.01) {
      const x = X(v), y = Y(idf(v + P.vth, v));
      v === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;

    // current V_GS curve
    ctx.strokeStyle = C.warm; ctx.lineWidth = 3;
    ctx.beginPath();
    for (let v = 0; v <= VMAX + 1e-9; v += 0.01) {
      const x = X(v), y = Y(idf(P.vgs, v));
      v === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // operating point + guides
    const op = idf(P.vgs, P.vds);
    ctx.strokeStyle = C.accent; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(X(P.vds), Y(0)); ctx.lineTo(X(P.vds), Y(op)); ctx.lineTo(PL.l, Y(op)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.accent; ctx.beginPath(); ctx.arc(X(P.vds), Y(op), 6, 0, 7); ctx.fill();
    ctx.strokeStyle = C.card; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();

    // region labels
    ctx.fillStyle = C.tri; ctx.font = '600 13px system-ui, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('Triode', X(0.04), PL.t + 16);
    ctx.fillStyle = C.accent; ctx.textAlign = 'right';
    ctx.fillText('Saturation', X(VMAX) - 8, PL.t + 16);

    // curve labels at the right edge
    ctx.fillStyle = C.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'left';
    for (const g of list) {
      const y = idf(g, VMAX);
      if (y > 0) ctx.fillText(g.toFixed(1), X(VMAX) + 2, Y(y) + 3);
    }
  }

  // drag on the plot to set V_DS
  let dragging = false;
  function vdsFromEvent(e) {
    const r = cv1.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width * g1.w;
    const v = (px - PL.l) / (g1.w - PL.l - PL.r) * VMAX;
    P.vds = Math.min(VMAX, Math.max(0, Math.round(v * 100) / 100));
    syncSliders(); update();
  }
  cv1.addEventListener('pointerdown', (e) => { dragging = true; cv1.setPointerCapture(e.pointerId); vdsFromEvent(e); });
  cv1.addEventListener('pointermove', (e) => { if (dragging) vdsFromEvent(e); });
  cv1.addEventListener('pointerup', () => { dragging = false; });
  cv1.addEventListener('pointercancel', () => { dragging = false; });

  // ======================= cross-section + V(x) =======================
  const cv2 = $('cv-section');
  const g2 = setupCanvas(cv2);
  const XS = 200, XD = 560, LP = XD - XS, YS = 82;       // channel x-range and silicon surface
  const PY0 = 410, PYH = 130;                              // V(x) plot baseline and height (px for 0..VMAX)
  const SMIN = -0.3, SMAX = 1.32;
  const parts = Array.from({ length: 64 }, (_, i) => ({ s: SMIN + (SMAX - SMIN) * i / 64, y: Math.random(), ph: Math.random() * 6.28 }));

  function thick(v, m) {                                   // layer thickness in px
    const t = 20 * Math.max(0, m.vov - v) / VOVREF;
    return m.vov > 0 ? Math.max(1.5, t) : 0;
  }
  const IDREF = () => Math.max(1e-9, idf(VMAX, VMAX));

  function stepParticles(dt, m) {
    if (m.region === 'cutoff') return;
    const idN = m.ID / IDREF();
    const v0 = Math.min(700, Math.max(14, 90 * idN / Math.max((m.vov - Vch(0, m)) / VOVREF, 0.06)));
    for (const p of parts) {
      if (idN <= 0) continue;
      let v;
      if (p.s < 0) v = Math.max(30, v0 * 0.8);
      else if (p.s > 1) v = Math.max(40, Math.min(250, v0));
      else if (m.region === 'saturation' && p.s > m.sp) v = 700;
      else {
        const q = Math.max((m.vov - Vch(p.s, m)) / VOVREF, 0.06);
        v = Math.min(700, Math.max(14, 90 * idN / q));       // v = I / Q_d
      }
      p.v = v;
      p.s += v * dt / LP;
      if (p.s >= SMAX) { p.s = SMIN; p.y = Math.random(); }
    }
  }

  function drawSection() {
    const { ctx, w, h } = g2;
    const m = model();
    ctx.clearRect(0, 0, w, h);

    // substrate
    ctx.fillStyle = C.si; ctx.fillRect(30, YS, 700, 150);

    // depletion band (widens toward the drain as the junction reverse bias grows)
    const dep = (s) => YS + 26 + 14 * Vfull(s, m) / VMAX;
    ctx.fillStyle = C.dep; ctx.globalAlpha = 0.45;
    ctx.beginPath(); ctx.moveTo(XS - 10, YS);
    for (let s = 0; s <= 1.0001; s += 0.02) ctx.lineTo(XS + s * LP, dep(s));
    ctx.lineTo(XD + 10, YS); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 0.8; ctx.fillStyle = C.fg; ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'center';
    for (let gx = XS + 14; gx < XD - 8; gx += 24) {
      for (let gy = YS + 16; gy < dep((gx - XS) / LP) - 6; gy += 18) ctx.fillText('−', gx, gy + 4);
    }
    ctx.globalAlpha = 1;

    // n+ regions and body contact
    ctx.fillStyle = C.n;
    ctx.fillRect(80, YS, 120, 66); ctx.fillRect(560, YS, 130, 66);
    ctx.fillRect(36, YS, 36, 26);
    ctx.fillStyle = C.fg; ctx.font = '600 13px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('n+', 140, YS + 56); ctx.fillText('n+', 625, YS + 56); ctx.fillText('p+', 54, YS + 18);
    ctx.fillStyle = C.muted; ctx.font = '13px system-ui, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('p-type substrate', 280, YS + 138);

    // oxide + gate
    ctx.fillStyle = C.ox; ctx.fillRect(XS, YS - 12, LP, 12);
    ctx.fillStyle = C.metal; ctx.fillRect(XS, YS - 48, LP, 36);
    ctx.fillStyle = C.fg; ctx.textAlign = 'center'; ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('Gate', XS + LP / 2, YS - 25);
    ctx.fillStyle = C.muted; ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('SiO₂', XS + LP + 22, YS - 4);

    // terminals
    ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5;
    const term = [
      { x: 140, y0: YS, name: 'S', v: '0 V' },
      { x: XS + LP / 2, y0: YS - 48, name: 'G', v: P.vgs.toFixed(2) + ' V' },
      { x: 625, y0: YS, name: 'D', v: P.vds.toFixed(2) + ' V' },
      { x: 54, y0: YS, name: 'B', v: '0 V' }
    ];
    for (const t of term) {
      ctx.beginPath(); ctx.moveTo(t.x, t.y0); ctx.lineTo(t.x, 34); ctx.stroke();
      ctx.fillStyle = C.card; ctx.beginPath(); ctx.arc(t.x, 34, 4, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.fg; ctx.textAlign = 'center'; ctx.font = '600 13px system-ui, sans-serif';
      ctx.fillText(t.name + ' = ' + t.v, t.x, 22);
    }

    // inversion layer
    const send = m.region === 'saturation' ? m.sp : 1;
    if (m.vov > 0) {
      ctx.fillStyle = C.e; ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.moveTo(XS - 10, YS);
      ctx.lineTo(XS - 10, YS + thick(0, m));
      for (let s = 0; s <= send + 1e-9; s += 0.01) ctx.lineTo(XS + s * LP, YS + thick(Vch(s, m), m));
      ctx.lineTo(XS + send * LP, YS); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // electrons (glowing carriers with motion trails; they enter from the source and leave into the drain)
    const car = window.MOSUI.carrier, tnow = performance.now() / 1000;
    for (let i = 0; i < 20; i++) {                         // resting electrons in n+ regions
      const pr = parts[i], left = i % 2 === 0, x0 = left ? 88 : 568, wd = left ? 104 : 114;
      car(ctx, x0 + ((pr.y * 7.3 + i * 0.37) % 1) * wd + Math.sin(tnow * 3 + pr.ph) * 2, YS + 6 + ((pr.y * 5.1 + i * 0.21) % 1) * 34 + Math.cos(tnow * 2.4 + pr.ph) * 2, C.e, { r: 2.2, alpha: 0.55, sign: '−' });
    }
    if (m.vov > 0) {
      const idN = Math.min(1, m.ID / IDREF());
      for (const p of parts) {
        const x = XS + p.s * LP;
        let y;
        if (p.s > 0 && p.s <= 1) {
          if (m.region === 'saturation' && p.s > m.sp) {
            const u = (p.s - m.sp) / (1 - m.sp);
            const t0 = thick(m.vov, m);
            y = YS + t0 + 6 + 10 * Math.sin(Math.PI * u) + p.y * 4;
          } else {
            y = YS + 2 + p.y * Math.max(0, thick(Vch(p.s, m), m) - 4);
          }
        } else {
          const yc = p.s <= 0 ? YS + 2 + p.y * Math.max(0, thick(0, m) - 4) : YS + 2 + p.y * 6;
          const yb = YS + 6 + p.y * 34;
          const b = p.s <= 0 ? Math.min(1, -p.s / 0.15) : Math.min(1, (p.s - 1) / 0.15);
          y = yc * (1 - b) + yb * b;
        }
        y += Math.sin(tnow * 6 + p.ph) * 0.8;
        const v = p.v || 0;
        car(ctx, x, y, C.e, { r: 2.5, trail: Math.min(34, v * 0.06), sign: '−' });
      }
    }

    // annotation under the layer
    ctx.textAlign = 'left'; ctx.font = '600 13px system-ui, sans-serif';
    if (m.region === 'cutoff') {
      ctx.fillStyle = C.muted; ctx.fillText('VGS < VTH: no inversion layer, ID ≈ 0 (depletion only)', XS + 20, YS + 18);
    } else if (m.region === 'saturation') {
      const px = XS + m.sp * LP, py = YS + thick(m.vov, m);
      ctx.strokeStyle = C.warm; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(px, YS + 1, 8, 0, 7); ctx.stroke();
      ctx.fillStyle = C.warm; ctx.textAlign = 'center';
      { const tx = Math.min(px, 500); ctx.font = '600 13px system-ui, sans-serif'; const tw = ctx.measureText('pinch-off').width + 12; ctx.save(); ctx.fillStyle = C.card; ctx.globalAlpha = 0.92; ctx.fillRect(tx - tw / 2, YS - 72, tw, 20); ctx.restore(); ctx.fillStyle = C.warm; ctx.fillText('pinch-off', tx, YS - 57); }
      ctx.strokeStyle = C.warm; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(px, YS - 52 + 4); ctx.lineTo(px, YS - 8); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.muted; ctx.font = '11px system-ui, sans-serif';
      ctx.fillText('depleted gap', (px + XD) / 2 + 8, YS + 56);
    }

    // ---- V(x) plot ----
    const Y2 = (v) => PY0 - v / VMAX * PYH;
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.fillStyle = C.muted;
    ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'right';
    for (const v of [0, 0.5, 1.0, 1.5]) {
      ctx.beginPath(); ctx.moveTo(XS, Y2(v)); ctx.lineTo(XD, Y2(v)); ctx.stroke();
      ctx.fillText(v.toFixed(1), XS - 6, Y2(v) + 4);
    }
    ctx.fillStyle = C.fg; ctx.textAlign = 'left'; ctx.font = '13px system-ui, sans-serif';
    subText(ctx, 'Channel potential V(x), in volts', '', XS, 262, 13, 'left');
    ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('x = 0 (source)', XS, h - 6); ctx.fillText('x = L (drain)', XD, h - 6);

    if (m.vov > 0) {
      const lineY = Y2(Math.min(m.vov, VMAX));
      // charge shading between V_ov line and V(x)
      ctx.fillStyle = C.e; ctx.globalAlpha = 0.28;
      ctx.beginPath(); ctx.moveTo(XS, lineY);
      for (let s = 0; s <= send + 1e-9; s += 0.01) ctx.lineTo(XS + s * LP, Y2(Vch(s, m)));
      ctx.lineTo(XS + send * LP, lineY); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
      // V_ov dashed line
      ctx.strokeStyle = C.fg; ctx.globalAlpha = 0.7; ctx.setLineDash([6, 4]); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(XS, lineY); ctx.lineTo(XD, lineY); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
      ctx.fillStyle = C.fg; ctx.textAlign = 'left'; ctx.font = '12px system-ui, sans-serif';
      ctx.fillText('VGS − VTH', XD + 8, lineY + 4);
      // V(x)
      ctx.strokeStyle = C.warm; ctx.lineWidth = 3;
      ctx.beginPath();
      for (let s = 0; s <= send + 1e-9; s += 0.01) {
        const x = XS + s * LP, y = Y2(Vch(s, m));
        s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      if (m.region === 'saturation') {
        ctx.strokeStyle = C.muted; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(XS + m.sp * LP, Y2(m.vov)); ctx.lineTo(XD, Y2(m.vds)); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.fillStyle = C.warm; ctx.beginPath(); ctx.arc(XD, Y2(Math.min(m.vds, VMAX)), 4.5, 0, 7); ctx.fill();
      ctx.fillStyle = C.fg; ctx.textAlign = 'left';
      ctx.fillText('VDS = ' + m.vds.toFixed(2) + ' V', XD + 8, Y2(m.vds) + 4 + (Math.abs(Y2(m.vds) - lineY) < 14 ? 14 : 0));
      ctx.fillStyle = C.accent; ctx.textAlign = 'center';
      if (send > 0.25) ctx.fillText('shaded area ∝ Qd(x)', XS + send * LP * 0.5, Math.max(lineY - 8, 280));
    } else {
      ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.font = '13px system-ui, sans-serif';
      ctx.fillText('No channel, so no V(x) profile', (XS + XD) / 2, Y2(0.8));
    }
  }

  // ======================= readouts and controls =======================
  const fmtI = (ua) => (ua >= 1000 ? (ua / 1000).toFixed(2) + ' mA' : ua.toFixed(ua < 10 ? 2 : 1) + ' µA');
  const fmtR = (ohm) => {
    if (!isFinite(ohm)) return '∞';
    if (ohm >= 1e6) return (ohm / 1e6).toFixed(2) + ' MΩ';
    if (ohm >= 1e3) return (ohm / 1e3).toFixed(2) + ' kΩ';
    return ohm.toFixed(1) + ' Ω';
  };

  function readouts() {
    const m = model();
    const reg = $('r-region');
    reg.textContent = m.region === 'cutoff' ? 'Cutoff' : m.region === 'triode' ? 'Triode' : 'Saturation';
    reg.className = 'badge ' + m.region;
    $('r-vov').textContent = m.vov.toFixed(2) + ' V';
    $('r-vdssat').textContent = m.vov > 0 ? m.vov.toFixed(2) + ' V' : '-';
    $('r-id').textContent = fmtI(m.ID);

    let gm = 0, gds = 0;
    if (m.region === 'saturation') { gm = m.k * m.vov * (1 + P.lam * m.vds); gds = 0.5 * m.k * m.vov * m.vov * P.lam; }
    else if (m.region === 'triode') { gm = m.k * m.vds; gds = m.k * (m.vov - m.vds); }
    $('r-gm').textContent = m.region === 'cutoff' ? '0' : (gm / 1000).toFixed(3) + ' mS';
    $('r-ro').textContent = m.region === 'saturation' ? fmtR(gds > 0 ? 1e6 / gds : Infinity) : '-';
    $('r-gain').textContent = m.region === 'saturation' ? (gds > 0 ? (gm / gds).toFixed(1) : '∞') : '-';
    $('r-ron').textContent = m.vov > 0 ? fmtR(1e6 / (m.k * m.vov)) : '∞';
    $('r-rds').textContent = m.ID > 0 ? fmtR(m.vds / m.ID * 1e6) : (m.vds === 0 ? '0/0' : '∞');
  }

  const fields = [
    ['vgs', (v) => v.toFixed(2) + ' V'], ['vds', (v) => v.toFixed(2) + ' V'],
    ['wl', (v) => String(v)], ['kp', (v) => v + ' µA/V²'],
    ['vth', (v) => v.toFixed(2) + ' V'], ['lam', (v) => v.toFixed(2) + ' V⁻¹']
  ];
  function syncSliders() {
    for (const [k, f] of fields) {
      $('s-' + k).value = P[k];
      $('o-' + k).textContent = f(P[k]);
    }
  }

  let curvesDirty = true;
  function update() {
    readouts();
    drawCurves();            // cheap; keeps the plot current even if the cross-section is off-screen
    curvesDirty = false;
    if (!window.MOSUI.anim.on) drawSection();
  }
  function redraw() {
    readTheme();
    drawCurves(); drawSection();
    curvesDirty = false;
  }

  for (const [k] of fields) {
    $('s-' + k).addEventListener('input', (e) => {
      P[k] = parseFloat(e.target.value);
      syncSliders(); update();
    });
  }
  document.querySelectorAll('#presets button').forEach((b) => {
    b.addEventListener('click', () => {
      Object.assign(P, { lam: 0.1 }, PRESETS[b.dataset.p]);
      syncSliders(); update();
    });
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { readTheme(); curvesDirty = true; if (!window.MOSUI.anim.on) redraw(); });

  // ======================= animation loop =======================
  let visible = true, last = 0;
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { threshold: 0 }).observe(cv2);
  function frame(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts;
    if (visible) {
      if (curvesDirty) { drawCurves(); curvesDirty = false; }
      if (window.MOSUI.anim.on) { stepParticles(dt, model()); drawSection(); }
    }
    requestAnimationFrame(frame);
  }

  readTheme(); syncSliders(); readouts(); redraw();
  requestAnimationFrame(frame);
})();
