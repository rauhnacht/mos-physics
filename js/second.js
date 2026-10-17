// Module 5: second-order effects (body effect, channel-length modulation, subthreshold).
(() => {
  'use strict';
  const { $, readTheme, setupCanvas, niceStep, plotFrame, curve, dot, onTheme, eng, carrier, C } = window.MOSUI;
  if (!$('cv-body1')) return;
  const fillBg = (c) => { c.ctx.fillStyle = C.card; c.ctx.fillRect(0, 0, c.w, c.h); };
  const sgn = (v, d, u) => (v < 0 ? '−' : '') + Math.abs(v).toFixed(d) + (u || '');
  const PHI_T = 0.02585;
  let tm = 0;                         // animation clock, seconds


  // ---- shared: a simple NMOS cross-section ----
  function base(ctx, o) {   // o: {xg0,xg1,ys,bot,sw,dw,jd,label}
    ctx.fillStyle = C.si; ctx.fillRect(30, o.ys, 700, o.bot - o.ys);
    ctx.fillStyle = C.n; ctx.fillRect(o.xg0 - o.sw, o.ys, o.sw + 8, o.jd); ctx.fillRect(o.xg1 - 8, o.ys, o.dw + 8, o.jd);
    ctx.fillStyle = C.fg; ctx.font = '600 13px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('n+', o.xg0 - o.sw / 2, o.ys + o.jd / 2 + 4); ctx.fillText('n+', o.xg1 + o.dw / 2, o.ys + o.jd / 2 + 4);
    ctx.fillStyle = C.ox; ctx.fillRect(o.xg0, o.ys - 10, o.xg1 - o.xg0, 10);
    ctx.fillStyle = C.metal; ctx.fillRect(o.xg0, o.ys - 40, o.xg1 - o.xg0, 30);
    ctx.fillStyle = '#fff'; ctx.font = '12px system-ui'; ctx.fillText('gate', (o.xg0 + o.xg1) / 2, o.ys - 21);
  }
  function term(ctx, x, y0, y1, text) {
    ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
    ctx.fillStyle = C.fg; ctx.font = '600 12px system-ui'; ctx.textAlign = 'center'; ctx.fillText(text, x, y1 - 5);
  }
  function layer(ctx, x0, x1, ys, thf, n, seed, spd) {      // thf(s) thickness in px for s in 0..1; carriers inside
    ctx.fillStyle = C.e; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(x0, ys);
    for (let i = 0; i <= 60; i++) ctx.lineTo(x0 + (x1 - x0) * i / 60, ys + thf(i / 60));
    ctx.lineTo(x1, ys); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    for (let i = 0; i < n; i++) {
      const s = (i * 0.618 + seed + tm * (spd || 0)) % 1, y = (i * 0.381 + seed * 3) % 1, th = thf(s);
      if (th > 3) carrier(ctx, x0 + (x1 - x0) * s, ys + 1.5 + y * (th - 3) + (spd ? Math.sin(tm * 4 + i) * 0.8 : 0), C.e, { r: 2.2, sign: '−', trail: spd ? 8 + spd * 60 : 0 });
    }
  }

  // =================== body effect ===================
  const B = { vsb: 1.0, vth0: 0.3, gam: 0.4, pf2: 0.7, vin: 1.8, vov: 0.2, vgs: 0.8 };
  const cb1 = setupCanvas($('cv-body1')), cb2 = setupCanvas($('cv-body2')), cbx = setupCanvas($('cv-body-xs'));
  const vthOf = (vsb) => B.vth0 + B.gam * (Math.sqrt(B.pf2 + vsb) - Math.sqrt(B.pf2));
  const etaOf = (vsb) => B.gam / (2 * Math.sqrt(B.pf2 + vsb));
  // source follower: Vout = Vin - VTH(Vout) - Vov, solved by bisection on f(Vout)
  function sfOut(vin, body) {
    const f = (vo) => vo - (vin - (body ? vthOf(vo) : B.vth0) - B.vov);
    if (f(0) >= 0) return 0;
    let lo = 0, hi = Math.max(vin, 0.01);
    for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (f(m) > 0) hi = m; else lo = m; }
    return (lo + hi) / 2;
  }

  function drawBodyXs() {
    const { ctx, w, h } = cbx; fillBg(cbx);
    const o = { xg0: 230, xg1: 530, ys: 98, bot: 246, sw: 140, dw: 140, jd: 40 };
    base(ctx, o);
    const dpx = (v) => 55 * Math.sqrt((B.pf2 + v) / 0.7), thx = (v) => { const vo = B.vgs - vthOf(v); return vo > 0 ? 4 + 26 * Math.min(1, vo / 0.8) : 0; };
    const d1 = dpx(B.vsb), d0 = dpx(0);
    // depletion at VSB=0 (outline) and now (fill)
    const dep = (d, fill) => {
      ctx.beginPath(); ctx.moveTo(o.xg0 - 6, o.ys); ctx.lineTo(o.xg0 - 6, o.ys + d - 10); ctx.quadraticCurveTo(o.xg0 - 6, o.ys + d, o.xg0 + 8, o.ys + d);
      ctx.lineTo(o.xg1 - 8, o.ys + d); ctx.quadraticCurveTo(o.xg1 + 6, o.ys + d, o.xg1 + 6, o.ys + d - 10); ctx.lineTo(o.xg1 + 6, o.ys); ctx.closePath();
      if (fill) { ctx.globalAlpha = 0.42; ctx.fillStyle = C.dep; ctx.fill(); ctx.globalAlpha = 1; }
      else { ctx.setLineDash([5, 4]); ctx.strokeStyle = C.muted; ctx.lineWidth = 1.3; ctx.stroke(); ctx.setLineDash([]); }
    };
    dep(d1, true); dep(d0, false);
    ctx.fillStyle = C.fg; ctx.globalAlpha = 0.8; ctx.font = '12px system-ui'; ctx.textAlign = 'center';
    for (let gx = o.xg0 + 14; gx < o.xg1 - 8; gx += 26) for (let gy = o.ys + 52; gy < o.ys + d1 - 6; gy += 18) ctx.fillText('−', gx, gy + 4);
    ctx.globalAlpha = 1;
    // inversion layer: now (filled) vs VSB=0 (dashed outline)
    const th1 = thx(B.vsb), th0 = thx(0);
    if (th0 > 0) { ctx.setLineDash([4, 3]); ctx.strokeStyle = C.e; ctx.lineWidth = 1.2; ctx.strokeRect(o.xg0, o.ys, o.xg1 - o.xg0, th0); ctx.setLineDash([]); }
    if (th1 > 0) layer(ctx, o.xg0, o.xg1, o.ys, () => th1, Math.round(6 + th1 * 1.4), 0.3, 0.03 + 0.2 * th1 / 30);
    // depletion depth arrow
    const ax = o.xg1 - 40;
    ctx.strokeStyle = C.warm; ctx.fillStyle = C.warm; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(ax, o.ys + 2); ctx.lineTo(ax, o.ys + d1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ax, o.ys + d1); ctx.lineTo(ax - 4, o.ys + d1 - 8); ctx.lineTo(ax + 4, o.ys + d1 - 8); ctx.fill();
    ctx.textAlign = 'left'; ctx.font = '600 13px system-ui'; ctx.fillStyle = C.warm;
    ctx.fillText('Wd ∝ √(2ΦF + VSB)', o.xg1 + 16, o.ys + Math.max(70, d1 * 0.55)); ctx.font = '12px system-ui';
    ctx.fillText('×' + Math.sqrt((B.pf2 + B.vsb) / B.pf2).toFixed(2) + ' vs VSB = 0', o.xg1 + 16, o.ys + Math.max(70, d1 * 0.55) + 17);
    // body contact (p+), terminals and numbers
    ctx.fillStyle = C.muted; ctx.globalAlpha = 0.4; ctx.fillRect(36, o.ys, 40, o.jd); ctx.globalAlpha = 1;
    ctx.fillStyle = C.fg; ctx.font = '600 13px system-ui'; ctx.textAlign = 'center'; ctx.fillText('p+', 56, o.ys + o.jd / 2 + 4);
    term(ctx, 130, o.ys, 40, 'S = ' + B.vsb.toFixed(2) + ' V'); term(ctx, 380, o.ys - 40, 40, 'G = ' + (B.vsb + B.vgs).toFixed(2) + ' V');
    term(ctx, 630, o.ys, 40, 'D'); term(ctx, 56, o.ys, 40, 'B = 0 V');
    const vt = vthOf(B.vsb), vo = B.vgs - vt, vo0 = B.vgs - B.vth0, wr = Math.sqrt((B.pf2 + B.vsb) / B.pf2);
    // info zone below the drawing
    const zy = o.bot + 18;
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(30, zy - 8); ctx.lineTo(730, zy - 8); ctx.stroke();
    ctx.textAlign = 'left'; ctx.font = '600 13px system-ui'; ctx.fillStyle = C.fg;
    ctx.fillText('VTH: ' + B.vth0.toFixed(3) + ' V  →  ' + vt.toFixed(3) + ' V   (+' + (vt - B.vth0).toFixed(3) + ' V)', 44, zy + 14);
    ctx.font = '13px system-ui';
    ctx.fillText(vo > 0 ? 'Vov = VGS − VTH = ' + vo.toFixed(3) + ' V' : 'VGS < VTH: the channel is off', 44, zy + 36);
    ctx.fillStyle = C.muted; ctx.fillText('without the body effect: Vov = ' + vo0.toFixed(3) + ' V', 44, zy + 58);
    const lx = 340, lx2 = 540, ly = zy + 12;
    const item = (x, y, kind, txt) => {
      if (kind === 'dep') { ctx.globalAlpha = 0.42; ctx.fillStyle = C.dep; ctx.fillRect(x, y - 10, 18, 12); ctx.globalAlpha = 1; }
      else if (kind === 'dep0') { ctx.setLineDash([5, 4]); ctx.strokeStyle = C.muted; ctx.lineWidth = 1.3; ctx.strokeRect(x, y - 10, 18, 12); ctx.setLineDash([]); }
      else if (kind === 'inv0') { ctx.setLineDash([4, 3]); ctx.strokeStyle = C.e; ctx.lineWidth = 1.2; ctx.strokeRect(x, y - 10, 18, 12); ctx.setLineDash([]); }
      else { ctx.globalAlpha = 0.5; ctx.fillStyle = C.e; ctx.fillRect(x, y - 10, 18, 12); ctx.globalAlpha = 1; }
      ctx.fillStyle = C.fg; ctx.font = '12px system-ui'; ctx.textAlign = 'left'; ctx.fillText(txt, x + 26, y);
    };
    item(lx, ly, 'dep', 'depletion, now'); item(lx2, ly, 'dep0', 'depletion at VSB = 0');
    item(lx, ly + 24, 'inv', 'inversion layer, now'); item(lx2, ly + 24, 'inv0', 'inversion layer at VSB = 0');
  }

  function drawBody1() {
    const { ctx, w, h } = cb1; fillBg(cb1);
    const fr = plotFrame(ctx, {
      x: 60, y: 22, w: w - 84, h: h - 62, xmin: 0, xmax: 3, ymin: 0, ymax: 1.2,
      xticks: [0, .5, 1, 1.5, 2, 2.5, 3], yticks: [0, .2, .4, .6, .8, 1, 1.2],
      fmtx: (t) => t.toFixed(1), fmty: (t) => t.toFixed(1), xlabel: 'VSB (V)', ylabel: 'VTH (V)'
    });
    curve(ctx, () => B.vth0, fr, 0, 3, 2, C.muted, 1.5, [5, 4]);
    curve(ctx, vthOf, fr, 0, 3, 120, C.accent, 2.8);
    dot(ctx, fr.X(B.vsb), fr.Y(vthOf(B.vsb)), C.warm, 6);
    ctx.font = '13px system-ui'; ctx.textAlign = 'left';
    ctx.fillStyle = C.muted; ctx.fillText('VTH0', fr.x + 8, fr.Y(B.vth0) - 6);
    ctx.fillStyle = C.accent; ctx.fillText('VTH = VTH0 + γ(√(2ΦF+VSB) − √(2ΦF))', fr.x + 12, fr.y + 18);
  }
  function drawBody2() {
    const { ctx, w, h } = cb2; fillBg(cb2);
    const fr = plotFrame(ctx, {
      x: 60, y: 22, w: w - 84, h: h - 62, xmin: 0, xmax: 3, ymin: 0, ymax: 3,
      xticks: [0, .5, 1, 1.5, 2, 2.5, 3], yticks: [0, .5, 1, 1.5, 2, 2.5, 3],
      fmtx: (t) => t.toFixed(1), fmty: (t) => t.toFixed(1), xlabel: 'Vin (V)', ylabel: 'Vout (V)'
    });
    curve(ctx, (x) => x, fr, 0, 3, 2, C.line, 1.5, [3, 3]);
    curve(ctx, (x) => sfOut(x, false), fr, 0, 3, 120, C.muted, 2, [6, 4]);
    curve(ctx, (x) => sfOut(x, true), fr, 0, 3, 120, C.accent, 2.8);
    dot(ctx, fr.X(B.vin), fr.Y(sfOut(B.vin, true)), C.warm, 6);
    ctx.font = '13px system-ui'; ctx.textAlign = 'left';
    ctx.fillStyle = C.muted; ctx.fillText('ideal: Vout = Vin − VTH0 − Vov (slope 1)', fr.x + 12, fr.y + 18);
    ctx.fillStyle = C.accent; ctx.fillText('with body effect: slope < 1, level shift grows', fr.x + 12, fr.y + 36);
  }
  function bodyReadouts() {
    const eta = etaOf(B.vsb);
    $('b-vth').textContent = sgn(vthOf(B.vsb), 3, ' V');
    $('b-dvth').textContent = '+' + (vthOf(B.vsb) - B.vth0).toFixed(3) + ' V';
    $('b-eta').textContent = eta.toFixed(3);
    $('b-gmb').textContent = (eta * 100).toFixed(1) + ' % of gm';
    const vo = sfOut(B.vin, true);
    $('b-vout').textContent = vo.toFixed(3) + ' V';
    $('b-vsf').textContent = (B.vin - vo).toFixed(3) + ' V';
    $('b-gain').textContent = (1 / (1 + etaOf(vo))).toFixed(3);
    const out = { 'o-b-vsb': B.vsb.toFixed(2) + ' V', 'o-b-vth0': B.vth0.toFixed(2) + ' V', 'o-b-gam': B.gam.toFixed(2) + ' V½',
      'o-b-pf': B.pf2.toFixed(2) + ' V', 'o-b-vin': B.vin.toFixed(2) + ' V', 'o-b-vgs': B.vgs.toFixed(2) + ' V' };
    for (const k in out) $(k).textContent = out[k];
  }
  const bmap = { 'b-vsb': 'vsb', 'b-vth0': 'vth0', 'b-gam': 'gam', 'b-pf': 'pf2', 'b-vin': 'vin', 'b-vgs': 'vgs' };
  function updBody() { bodyReadouts(); drawBodyXs(); drawBody1(); drawBody2(); }
  for (const id in bmap) $(id).addEventListener('input', (e) => { B[bmap[id]] = parseFloat(e.target.value); updBody(); });

  // =================== channel-length modulation ===================
  const L = { vov: 0.4, lm: 2, lam0: 0.1, vds: 1.5 };      // length multiplier, lambda at 1x
  const cc = setupCanvas($('cv-clm')), ccx = setupCanvas($('cv-clm-xs'));
  const KP = 200, WL0 = 20;
  const kOf = (lm) => KP * WL0 / lm;               // fixed W, longer L
  const lamOf = (lm) => L.lam0 / lm;
  const idClm = (vds, lm) => {
    const k = kOf(lm), lam = lamOf(lm), vov = L.vov;
    return vds >= vov ? 0.5 * k * vov * vov * (1 + lam * vds) : k * (vov * vds - vds * vds / 2) * (1 + lam * vds);
  };

  function drawClmXs() {
    const { ctx, w, h } = ccx; fillBg(ccx);
    const Lpx = Math.min(360, 90 * L.lm), xg0 = 380 - Lpx / 2, xg1 = xg0 + Lpx;
    const o = { xg0, xg1, ys: 96, bot: 270, sw: Math.min(150, xg0 - 40), dw: Math.min(150, 720 - xg1), jd: 46 };
    base(ctx, o);
    const lam = lamOf(L.lm), vov = L.vov, vds = L.vds, th0 = 4 + 24 * Math.min(1, vov / 0.8);
    const sat = vds >= vov, sp = sat ? 1 / (1 + lam * vds) : 1;
    const xp = xg0 + sp * Lpx;
    // depletion under channel
    ctx.fillStyle = C.dep; ctx.globalAlpha = 0.35;
    ctx.beginPath(); ctx.moveTo(xg0 - 6, o.ys); ctx.lineTo(xg0 - 6, o.ys + 62); ctx.lineTo(xg1 + 6, o.ys + 62); ctx.lineTo(xg1 + 6, o.ys); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    let thf;
    if (sat) thf = (s) => th0 * Math.sqrt(Math.max(0, 1 - s));
    else { const r = 2 * vds / vov - (vds / vov) * (vds / vov); thf = (s) => th0 * Math.sqrt(Math.max(0, 1 - s * r)); }
    layer(ctx, xg0 - 8, xp, o.ys, (s) => thf(Math.min(1, Math.max(0, (s * (xp - xg0 + 8) - 8) / Math.max(1, xp - xg0)))) , Math.round(10 + Lpx / 9), 0.2, 0.05 + 0.25 * vov / 0.8);
    if (sat) {
      // depleted gap
      ctx.fillStyle = C.warm; ctx.globalAlpha = 0.22; ctx.fillRect(xp, o.ys, xg1 + 8 - xp, 30); ctx.globalAlpha = 1;
      ctx.strokeStyle = C.warm; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(xp, o.ys - 8); ctx.lineTo(xp, o.ys + 34); ctx.stroke(); ctx.setLineDash([]);
      // fast electrons crossing the gap
      for (let i = 0; i < 6; i++) carrier(ctx, xp + (xg1 + 10 - xp) * ((i / 6 + tm * 0.9) % 1), o.ys + 8 + (i % 2) * 10, C.e, { r: 2.4, trail: 22, sign: '−' });
    }
    // dimension arrows
    const arrow = (x1, x2, y, col, txt, up) => {
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
      for (const [x, d] of [[x1, 1], [x2, -1]]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 7 * d, y - 4); ctx.lineTo(x + 7 * d, y + 4); ctx.fill(); }
      ctx.font = '600 13px system-ui'; ctx.textAlign = 'center'; ctx.fillText(txt, (x1 + x2) / 2, y + (up ? -8 : 18));
    };
    const Lnm = 60 * L.lm, Lp = Lnm * sp;
    arrow(xg0, xg1, o.ys + 80, C.accent, 'L = ' + Lnm.toFixed(0) + ' nm', false);
    arrow(xg0, xp, o.ys + 112, C.accent, sat ? 'L′ = ' + Lp.toFixed(0) + ' nm' : 'no pinch-off (triode)', false);
    if (sat && xg1 - xp > 12) arrow(xp, xg1, o.ys + 144, C.warm, 'ΔL = ' + (Lnm - Lp).toFixed(1) + ' nm', false);
    term(ctx, (xg0 - o.sw / 2 + xg0) / 2 - 10 > 60 ? xg0 - o.sw / 2 : 80, o.ys, 40, 'S = 0 V');
    term(ctx, (xg0 + xg1) / 2, o.ys - 40, 40, 'G'); term(ctx, xg1 + o.dw / 2, o.ys, 40, 'D = ' + vds.toFixed(2) + ' V');
    ctx.fillStyle = C.muted; ctx.font = '12px system-ui'; ctx.textAlign = 'left';
    ctx.fillText(sat ? 'saturation: VDS = ' + vds.toFixed(2) + ' V > Vov = ' + vov.toFixed(2) + ' V' : 'triode: VDS = ' + vds.toFixed(2) + ' V < Vov = ' + vov.toFixed(2) + ' V', 40, h - 12);
  }

  function drawClm() {
    const { ctx, w, h } = cc; fillBg(cc);
    const ymaxRaw = Math.max(idClm(2.5, 1), idClm(2.5, L.lm)) * 1.05, st = niceStep(ymaxRaw / 4);
    const ymax = Math.ceil(ymaxRaw / st) * st, xmin = -12, xmax = 2.5;
    const fr = plotFrame(ctx, {
      x: 78, y: 22, w: w - 100, h: h - 62, xmin: -10, xmax: 2.5, ymin: 0, ymax,
      xticks: [-10, -8, -6, -4, -2, 0, 2], yticks: Array.from({ length: Math.round(ymax / st) + 1 }, (_, i) => i * st),
      fmtx: (t) => (t < 0 ? '−' : '') + Math.abs(t), fmty: (t) => eng(t * 1e-6, 'A', 2), xlabel: 'VDS (V)', ylabel: 'ID'
    });
    // reference L (1x) faint
    curve(ctx, (x) => (x >= 0 ? idClm(x, 1) : NaN), fr, 0, 2.5, 100, C.line, 2);
    // extrapolation to -VA
    const lam = lamOf(L.lm), k = kOf(L.lm);
    const i0 = 0.5 * k * L.vov * L.vov;
    curve(ctx, (x) => i0 * (1 + lam * x), fr, -10, 2.5, 2, C.warm, 1.5, [5, 4]);
    curve(ctx, (x) => (x >= 0 ? idClm(x, L.lm) : NaN), fr, 0, 2.5, 120, C.accent, 2.8);
    const va = 1 / lam;
    if (va <= 10) { dot(ctx, fr.X(-va), fr.Y(0), C.warm, 5); ctx.fillStyle = C.warm; ctx.font = '13px system-ui'; ctx.textAlign = 'center'; ctx.fillText('−VA = −1/λ', fr.X(-va), fr.Y(0) - 12); }
    ctx.font = '13px system-ui'; ctx.textAlign = 'left';
    ctx.fillStyle = C.accent; ctx.fillText('your L', fr.x + 12, fr.y + 18);
    ctx.fillStyle = C.muted; ctx.fillText('grey: L = 1× reference (same W)', fr.x + 12, fr.y + 36);
    ctx.fillStyle = C.warm; ctx.fillText('dashed: extrapolated slope meets the axis at −1/λ', fr.x + 12, fr.y + 54);
  }
  function clmReadouts() {
    const lam = lamOf(L.lm), k = kOf(L.lm), vov = L.vov;
    const slope = 0.5 * k * vov * vov * lam, slopeRef = 0.5 * kOf(1) * vov * vov * lamOf(1);
    $('c-lam').textContent = lam.toFixed(3) + ' V⁻¹';
    $('c-va').textContent = (1 / lam).toFixed(1) + ' V';
    $('c-id').textContent = eng(0.5 * k * vov * vov * 1e-6, 'A');
    $('c-gm').textContent = eng(k * vov * 1e-6, 'S');
    $('c-ro').textContent = eng(1 / (slope * 1e-6), 'Ω');
    $('c-gmro').textContent = (2 / (lam * vov)).toFixed(1);
    $('c-slope').textContent = (slope / slopeRef).toFixed(2) + '× the 1× device';
    $('o-c-vov').textContent = L.vov.toFixed(2) + ' V';
    $('o-c-lm').textContent = L.lm.toFixed(2) + '×';
    $('o-c-lam').textContent = L.lam0.toFixed(2) + ' V⁻¹';
    $('o-c-vds').textContent = L.vds.toFixed(2) + ' V';
  }
  const cmap = { 'c-vov': 'vov', 'c-lm': 'lm', 'c-lam': 'lam0' };
  function updClm() { clmReadouts(); drawClmXs(); drawClm(); }
  for (const id of ['c-vov', 'c-lm', 'c-lamin', 'c-vds']) {
    $(id).addEventListener('input', (e) => { L[id === 'c-vov' ? 'vov' : id === 'c-lm' ? 'lm' : id === 'c-vds' ? 'vds' : 'lam0'] = parseFloat(e.target.value); updClm(); });
  }

  // =================== subthreshold ===================
  const U = { vth: 0.4, xi: 1.5, wl: 20, vgs: 0.3 };
  const cs = setupCanvas($('cv-sub')), csx = setupCanvas($('cv-sub-xs'));
  const kU = () => 200 * U.wl;
  const vov0 = () => 2 * U.xi * PHI_T;
  const iSq = (vov) => (vov > 0 ? 0.5 * kU() * vov * vov : 0);
  const iWeak = (vov) => iSq(vov0()) * Math.exp((vov - vov0()) / (U.xi * PHI_T));
  const iAct = (vgs) => { const vov = vgs - U.vth; return vov < vov0() ? iWeak(vov) : iSq(vov); };

  function drawSubXs() {
    const { ctx, w, h } = csx; fillBg(csx);
    const vov = U.vgs - U.vth, strong = vov >= vov0();
    const id = iAct(U.vgs), nE = Math.round(Math.min(1, Math.max(0, (Math.log10(id) + 8) / 12)) * 60);
    // --- top strip: device
    const o = { xg0: 240, xg1: 520, ys: 60, bot: 128, sw: 180, dw: 180, jd: 54 };
    base(ctx, o);
    ctx.fillStyle = C.dep; ctx.globalAlpha = 0.3; ctx.fillRect(o.xg0 - 6, o.ys, o.xg1 - o.xg0 + 12, 56); ctx.globalAlpha = 1;
    // electrons resting in n+ regions
    for (let i = 0; i < 24; i++) {
      const left = i % 2 === 0, x0 = left ? 70 : 528, wd = left ? 170 : 170;
      carrier(ctx, x0 + ((i * 0.618) % 1) * wd + Math.sin(tm * 2 + i) * 3, o.ys + 8 + ((i * 0.37) % 1) * 38 + Math.cos(tm * 2.3 + i * 1.3) * 3, C.e, { r: 2.1, alpha: 0.6, sign: '−' });
    }
    if (strong) layer(ctx, o.xg0, o.xg1, o.ys, () => 4 + Math.min(10, (vov - vov0()) * 14), 26, 0.1, 0.12);
    else for (let i = 0; i < nE; i++) carrier(ctx, o.xg0 + 6 + ((i * 0.618 + tm * 0.02) % 1) * (o.xg1 - o.xg0 - 12), o.ys + 3 + ((i * 0.41) % 1) * 5 + Math.sin(tm * 3 + i * 1.7) * 1.5, C.e, { r: 2.1, sign: '−' });
    ctx.fillStyle = C.muted; ctx.font = '12px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(strong ? 'strong inversion: a continuous layer of electrons' : (nE > 0 ? 'weak inversion: ' + nE + ' dots stand for a tiny, log-scaled electron population' : 'essentially empty channel'), 380, 146);
    // --- bottom: energy barrier
    const y0 = 316, kT = 6.2, B0 = 0.45;
    const Bv = strong ? 0 : Math.max(0, B0 - vov / U.xi), BkT = Bv / PHI_T, Bpx = Math.min(150, BkT * kT);
    const xs0 = 70, xs1 = 240, xd0 = 520, xd1 = 690;
    const E = (x) => {
      const bump = Bpx * Math.exp(-Math.pow((x - 380) / 85, 2));
      const drop = -20 / (1 + Math.exp(-(x - 450) / 25));
      return bump + drop;
    };
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(xs0, y0); ctx.lineTo(xd1, y0); ctx.stroke();
    ctx.fillStyle = C.accent; ctx.globalAlpha = 0.14; ctx.beginPath(); ctx.moveTo(xs0, y0);
    for (let x = xs0; x <= xd1; x += 4) ctx.lineTo(x, y0 - E(x)); ctx.lineTo(xd1, y0); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = C.accent; ctx.lineWidth = 3; ctx.beginPath();
    for (let x = xs0; x <= xd1; x += 3) { const y = y0 - E(x); x === xs0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
    // Boltzmann population in the source
    const N = 110, Ncross = Math.exp(-BkT);
    for (let i = 0; i < N; i++) {
      const u = (i + 0.5) / N, e = -Math.log(1 - u) * kT, x = xs0 + 6 + ((i * 0.618) % 1) * (xs1 - xs0 - 12);
      const over = e > Bpx;
      if (over) {
        const p = (i * 0.37 + tm * 0.22) % 1, xx = xs0 + 6 + p * (xd1 - xs0 - 12);
        const f = Math.min(1, Math.max(0, (xx - 450) / 200)), yy = y0 - 4 - e * (1 - f);
        carrier(ctx, xx, yy, C.warm, { r: 3, alpha: 1 - 0.5 * f, sign: '−', trail: 14 });
      } else {
        const wob = Math.sin(tm * (1.5 + (i % 5) * 0.5) + i) * 3;
        carrier(ctx, x + wob, y0 - 4 - Math.max(0, e + Math.cos(tm * 2 + i * 2.1) * 4), C.e, { r: 2.2, alpha: 0.8, sign: '−' });
      }
    }
    // labels
    ctx.font = '600 13px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = C.fg;
    ctx.fillText('source', 155, y0 + 16); ctx.fillText('channel', 380, y0 + 16); ctx.fillText('drain', 605, y0 + 16);
    ctx.textAlign = 'left'; ctx.fillStyle = C.muted; ctx.font = '12px system-ui'; ctx.fillText('electron energy', 14, 172);
    ctx.fillStyle = C.fg; ctx.font = '600 13px system-ui'; ctx.textAlign = 'right';
    if (strong) ctx.fillText('No barrier left: the channel is full of charge', 705, 190);
    else {
      ctx.fillText('barrier ≈ ' + BkT.toFixed(1) + ' kT (' + (Bv * 1000).toFixed(0) + ' mV)' + (BkT * kT > 150 ? ' clipped' : ''), 705, 190);
      ctx.fillStyle = C.warm; ctx.fillText('fraction over the top: e^(−B/VT) = ' + Ncross.toExponential(1), 705, 210);
    }
  }

  function drawSub() {
    const { ctx, w, h } = cs; fillBg(cs);
    const fr = plotFrame(ctx, {
      x: 78, y: 22, w: w - 100, h: h - 62, xmin: 0, xmax: 1.2, ymin: -8, ymax: 4, ylog: true,
      xticks: [0, .2, .4, .6, .8, 1, 1.2], yticks: [-8, -6, -4, -2, 0, 2, 4],
      fmtx: (t) => t.toFixed(1), fmty: (t) => eng(Math.pow(10, t) * 1e-6, 'A', 2), xlabel: 'VGS (V)', ylabel: 'ID (log scale)'
    });
    curve(ctx, (v) => (v - U.vth > 0 ? iSq(v - U.vth) : NaN), fr, 0, 1.2, 160, C.muted, 1.5, [5, 4]);
    curve(ctx, (v) => iWeak(v - U.vth), fr, 0, 1.2, 160, C.warm, 1.5, [5, 4]);
    curve(ctx, iAct, fr, 0, 1.2, 300, C.accent, 3);
    dot(ctx, fr.X(U.vth), fr.Y(iAct(U.vth)), C.muted, 4);
    ctx.fillStyle = C.muted; ctx.font = '12px system-ui'; ctx.textAlign = 'left'; ctx.fillText('VTH', fr.X(U.vth) + 8, fr.Y(iAct(U.vth)) + 14);
    dot(ctx, fr.X(U.vgs), fr.Y(iAct(U.vgs)), C.fg, 6);
    ctx.font = '13px system-ui';
    ctx.textAlign = 'right'; const lx = fr.x + fr.w - 12, ly = fr.y + fr.h - 54;
    ctx.fillStyle = C.accent; ctx.fillText('actual: the lower of the two', lx, ly);
    ctx.fillStyle = C.muted; ctx.fillText('dashed grey: square law (dies at VTH)', lx, ly + 18);
    ctx.fillStyle = C.warm; ctx.fillText('dashed orange: exponential, a straight line on a log plot', lx, ly + 36);
  }
  function subReadouts() {
    const S = U.xi * PHI_T * Math.LN10 * 1000;
    $('u-swing').textContent = S.toFixed(1) + ' mV/dec';
    $('u-id').textContent = eng(iAct(U.vgs) * 1e-6, 'A');
    $('u-ioff').textContent = eng(iAct(0) * 1e-6, 'A');
    $('u-onoff').textContent = '10^' + Math.log10(iAct(1.0) / iAct(0)).toFixed(1);
    $('u-region').textContent = U.vgs - U.vth < vov0() ? 'weak inversion (exponential)' : 'strong inversion (square law)';
    $('u-v0').textContent = (vov0() * 1000).toFixed(0) + ' mV above VTH';
    const out = { 'o-u-vth': U.vth.toFixed(2) + ' V', 'o-u-xi': U.xi.toFixed(2), 'o-u-wl': String(U.wl), 'o-u-vgs': U.vgs.toFixed(2) + ' V' };
    for (const k in out) $(k).textContent = out[k];
  }
  const umap = { 'u-vth': 'vth', 'u-xi': 'xi', 'u-wl': 'wl', 'u-vgs': 'vgs' };
  function updSub() { subReadouts(); drawSubXs(); drawSub(); }
  for (const id in umap) $(id).addEventListener('input', (e) => { U[umap[id]] = parseFloat(e.target.value); updSub(); });

  // animation: only the three cross-section canvases move
  const vis = new Set();
  const io = new IntersectionObserver((es) => es.forEach((e) => { e.isIntersecting ? vis.add(e.target) : vis.delete(e.target); }), { threshold: 0 });
  [cbx, ccx, csx].forEach((c) => io.observe(c.ctx.canvas));
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (window.MOSUI.anim.on && vis.size) {
      tm += dt;
      if (vis.has(cbx.ctx.canvas)) drawBodyXs();
      if (vis.has(ccx.ctx.canvas)) drawClmXs();
      if (vis.has(csx.ctx.canvas)) drawSubXs();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // presets
  document.querySelectorAll('#b-presets button').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.p === 'ex') Object.assign(B, { vsb: 1.0, vth0: 0.3, gam: 0.4, pf2: 0.7 });
    if (b.dataset.p === 'big') Object.assign(B, { vsb: 2.5, gam: 0.6 });
    if (b.dataset.p === 'none') Object.assign(B, { vsb: 0 });
    for (const id in bmap) $(id).value = B[bmap[id]];
    updBody();
  }));
  onTheme(() => { updBody(); updClm(); updSub(); });
  readTheme();
  for (const id in bmap) $(id).value = B[bmap[id]];
  $('c-vov').value = L.vov; $('c-lm').value = L.lm; $('c-lamin').value = L.lam0; $('c-vds').value = L.vds;
  for (const id in umap) $(id).value = U[umap[id]];
  updBody(); updClm(); updSub();
})();
