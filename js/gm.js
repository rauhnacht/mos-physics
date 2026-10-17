// Module 4: transconductance.
(() => {
  'use strict';
  const { $, readTheme, setupCanvas, subText, niceStep, plotFrame, curve, dot, onTheme, eng, carrier, anim, C } = window.MOSUI;
  if (!$('cv-gm1')) return;

  const VTH = 0.4;
  const S = { vov: 0.3, wl: 20, kp: 200, vds: 1.0, dv: 0.1 };
  const k = () => S.kp * S.wl;                       // uA/V^2
  const idSat = (vov) => (vov > 0 ? 0.5 * k() * vov * vov : 0);
  const gmSat = (vov) => (vov > 0 ? k() * vov : 0);   // uS
  const gmAt = (vov, vds) => (vov <= 0 ? 0 : (vds >= vov ? k() * vov : k() * vds));

  const cv1 = setupCanvas($('cv-gm1')), cv2 = setupCanvas($('cv-gm2')), cv3 = setupCanvas($('cv-gm3'));
  const cv0 = setupCanvas($('cv-gm0')), cvb = setupCanvas($('cv-gmb'));
  let mode = 'tri';
  const GB = { vsb: 1.0, gam: 0.4 };
  const VDS_TRI = 0.1;

  function bg(c) { c.ctx.fillStyle = C.card; c.ctx.fillRect(0, 0, c.w, c.h); }
  const fmtS = (us) => eng(us * 1e-6, 'S');
  const fmtI = (ua) => eng(ua * 1e-6, 'A');

  // ---- plot 1: I_D vs V_GS, tangent, small-signal test ----
  function draw1() {
    const { ctx, w, h } = cv1; bg(cv1);
    const vmax = 0.9 + 0.3, ymaxRaw = idSat(0.8) * 1.05;
    const st = niceStep(ymaxRaw / 4), ymax = Math.ceil(ymaxRaw / st) * st;
    const fr = plotFrame(ctx, {
      x: 78, y: 22, w: w - 100, h: h - 62, xmin: 0, xmax: vmax, ymin: 0, ymax,
      xticks: [0, .2, .4, .6, .8, 1.0, 1.2], yticks: Array.from({ length: Math.round(ymax / st) + 1 }, (_, i) => i * st),
      fmtx: (t) => t.toFixed(1), fmty: (t) => eng(t * 1e-6, 'A', 2), xlabel: 'VGS (V)', ylabel: 'ID'
    });
    const vgs0 = VTH + S.vov;
    const f = (v) => idSat(v - VTH);
    // V_TH marker
    ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = C.muted; ctx.beginPath();
    ctx.moveTo(fr.X(VTH), fr.y); ctx.lineTo(fr.X(VTH), fr.y + fr.h); ctx.stroke(); ctx.restore();
    ctx.fillStyle = C.muted; ctx.font = '12px system-ui'; ctx.textAlign = 'left'; ctx.fillText('VTH', fr.X(VTH) + 4, fr.y + 12);
    curve(ctx, f, fr, 0, vmax, 200, C.accent, 2.5);
    // tangent
    const i0 = idSat(S.vov), g = gmSat(S.vov);
    curve(ctx, (v) => i0 + g * (v - vgs0), fr, 0, vmax, 2, C.warm, 1.8, [6, 4]);
    // delta test
    const v1 = vgs0 + S.dv;
    if (Math.abs(S.dv) > 1e-6) {
      const iAct = f(v1), iPred = i0 + g * S.dv;
      ctx.save(); ctx.lineWidth = 2;
      ctx.strokeStyle = C.muted; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(fr.X(vgs0), fr.Y(i0)); ctx.lineTo(fr.X(v1), fr.Y(i0)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = C.accent; ctx.beginPath(); ctx.moveTo(fr.X(v1), fr.Y(i0)); ctx.lineTo(fr.X(v1), fr.Y(iAct)); ctx.stroke();
      ctx.strokeStyle = C.warm; ctx.beginPath(); ctx.moveTo(fr.X(v1) + 5, fr.Y(i0)); ctx.lineTo(fr.X(v1) + 5, fr.Y(iPred)); ctx.stroke();
      ctx.restore();
      dot(ctx, fr.X(v1), fr.Y(iAct), C.accent, 4); dot(ctx, fr.X(v1) + 5, fr.Y(iPred), C.warm, 4);
    }
    dot(ctx, fr.X(vgs0), fr.Y(i0), C.fg, 6);
    // legend
    ctx.font = '13px system-ui'; ctx.textAlign = 'left';
    ctx.fillStyle = C.accent; ctx.fillText('square law', fr.x + 12, fr.y + 18);
    ctx.fillStyle = C.warm; ctx.fillText('tangent at the bias point: slope = gm', fr.x + 12, fr.y + 36);
  }

  // ---- plot 2: gm and gm/ID vs Vov ----
  function draw2() {
    const { ctx, w, h } = cv2; bg(cv2);
    const gmax = gmSat(0.8), st = niceStep(gmax / 4), ymax = Math.ceil(gmax * 1.02 / st) * st;
    const fr = plotFrame(ctx, {
      x: 78, y: 22, w: w - 160, h: h - 62, xmin: 0, xmax: 0.8, ymin: 0, ymax,
      xticks: [0, .2, .4, .6, .8], yticks: Array.from({ length: Math.round(ymax / st) + 1 }, (_, i) => i * st),
      fmtx: (t) => t.toFixed(1), fmty: (t) => eng(t * 1e-6, 'S', 2), xlabel: 'Vov = VGS − VTH (V)', ylabel: 'gm'
    });
    // right axis: gm/ID (0..40 1/V)
    const effMax = 40, R = (v) => fr.y + fr.h - v / effMax * fr.h;
    ctx.save(); ctx.font = '12px system-ui'; ctx.fillStyle = C.warm; ctx.textAlign = 'left';
    for (let t = 0; t <= 40; t += 10) ctx.fillText(String(t), fr.x + fr.w + 8, R(t) + 4);
    ctx.font = '13px system-ui'; ctx.fillText('gm/ID (1/V)', fr.x + fr.w - 40, fr.y - 10);
    ctx.restore();
    curve(ctx, (v) => gmSat(v), fr, 0, 0.8, 2, C.accent, 2.5);
    ctx.save(); ctx.beginPath(); ctx.rect(fr.x, fr.y, fr.w, fr.h); ctx.clip();
    ctx.strokeStyle = C.warm; ctx.lineWidth = 2.5; ctx.beginPath();
    let pen = false;
    for (let i = 0; i <= 200; i++) {
      const v = 0.05 + (0.8 - 0.05) * i / 200, e = 2 / v;
      const px = fr.X(v), py = R(e);
      if (!pen) { ctx.moveTo(px, py); pen = true; } else ctx.lineTo(px, py);
    }
    ctx.stroke(); ctx.restore();
    // operating markers
    dot(ctx, fr.X(S.vov), fr.Y(gmSat(S.vov)), C.accent, 6);
    dot(ctx, fr.X(S.vov), R(2 / S.vov), C.warm, 6);
    ctx.font = '13px system-ui'; ctx.textAlign = 'left';
    ctx.fillStyle = C.accent; ctx.fillText('gm = μnCox(W/L)Vov  (left axis)', fr.x + 12, fr.y + 18);
    ctx.fillStyle = C.warm; ctx.fillText('gm/ID = 2/Vov  (right axis)', fr.x + 12, fr.y + 36);
  }

  // ---- plot 3: gm vs V_DS ----
  function draw3() {
    const { ctx, w, h } = cv3; bg(cv3);
    const gmax = gmSat(0.8), st = niceStep(gmax / 4), ymax = Math.ceil(gmax * 1.02 / st) * st;
    const fr = plotFrame(ctx, {
      x: 78, y: 22, w: w - 100, h: h - 62, xmin: 0, xmax: 1.8, ymin: 0, ymax,
      xticks: [0, .3, .6, .9, 1.2, 1.5, 1.8], yticks: Array.from({ length: Math.round(ymax / st) + 1 }, (_, i) => i * st),
      fmtx: (t) => t.toFixed(1), fmty: (t) => eng(t * 1e-6, 'S', 2), xlabel: 'VDS (V)', ylabel: 'gm'
    });
    for (let v = 0.1; v <= 0.8001; v += 0.1) {
      curve(ctx, (x) => gmAt(v, x), fr, 0, 1.8, 90, C.line, 1.5);
    }
    // knee locus
    curve(ctx, (x) => (x > 0 && x <= 0.8 ? k() * x : NaN), fr, 0, 1.8, 90, C.muted, 1.5, [4, 4]);
    curve(ctx, (x) => gmAt(S.vov, x), fr, 0, 1.8, 180, C.accent, 2.8);
    dot(ctx, fr.X(S.vds), fr.Y(gmAt(S.vov, S.vds)), C.fg, 6);
    ctx.font = '13px system-ui'; ctx.textAlign = 'left';
    ctx.fillStyle = C.accent; ctx.fillText('your Vov: rises as k·VDS in triode, flat at k·Vov in saturation', fr.x + 12, fr.y + 18);
    ctx.fillStyle = C.muted; ctx.fillText('dashed: knee at VDS = Vov;  grey: other Vov', fr.x + 12, fr.y + 36);
  }


  // ---- explanation picture: charge x speed, before and after a gate step ----
  const dots = Array.from({ length: 48 }, (_, i) => ({ y: (i * 0.618) % 1, o: (i * 0.377) % 1 }));
  const idOf = (vov) => (vov <= 0 ? 0 : mode === 'tri' ? k() * (vov * VDS_TRI - VDS_TRI * VDS_TRI / 2) : 0.5 * k() * vov * vov);
  const vRel = (vov) => (mode === 'tri' ? 1 : vov / 0.3);
  function panel(ctx, x0, wdt, vov, label, t) {
    const th = vov > 0 ? 5 + 58 * Math.min(1, vov / 0.8) : 0;
    ctx.fillStyle = C.si; ctx.fillRect(x0, 120, wdt, 100);
    ctx.fillStyle = C.n; ctx.fillRect(x0, 120, 26, 54); ctx.fillRect(x0 + wdt - 26, 120, 26, 54);
    ctx.fillStyle = C.ox; ctx.fillRect(x0 + 26, 108, wdt - 52, 12);
    ctx.fillStyle = C.metal; ctx.fillRect(x0 + 26, 82, wdt - 52, 26);
    ctx.fillStyle = '#fff'; ctx.font = '12px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('gate', x0 + wdt / 2, 99);
    // gate charge signs ~ vov
    ctx.fillStyle = C.fg; ctx.font = '700 13px system-ui';
    const ng = Math.round(Math.max(0, vov) / 0.8 * 12);
    for (let i = 0; i < ng; i++) ctx.fillText('+', x0 + 40 + i * (wdt - 80) / Math.max(1, 11), 78);
    // layer thickness along the channel: q(u) = sqrt(Vov^2 - u*K)/Vov, K = 2 Vov Vd - Vd^2 (Vd = drain potential, capped at Vov)
    const ve = mode === 'tri' ? Math.min(VDS_TRI, vov) : vov, Kq = 2 * vov * ve - ve * ve;
    const qn = (u) => (vov > 0 ? Math.sqrt(Math.max(vov * vov - u * Kq, 0)) / vov : 0);
    const thAt = (u) => th * qn(u);
    if (th > 0) {
      ctx.fillStyle = C.e; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(x0 + 10, 120);
      for (let i = 0; i <= 40; i++) ctx.lineTo(x0 + 10 + (wdt - 20) * i / 40, 120 + thAt(i / 40));
      ctx.lineTo(x0 + wdt - 10, 120); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = C.accent; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let i = 0; i <= 40; i++) { const px = x0 + 10 + (wdt - 20) * i / 40, py = 120 + thAt(i / 40); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
      ctx.stroke();
      if (mode !== 'tri') { ctx.fillStyle = C.muted; ctx.font = '12px system-ui'; ctx.textAlign = 'right'; ctx.fillText('pinch-off at the drain', x0 + wdt - 8, 196); }
      else { ctx.fillStyle = C.muted; ctx.font = '12px system-ui'; ctx.textAlign = 'right'; ctx.fillText('nearly uniform layer', x0 + wdt - 8, 196); }
    }
    const n = vov > 0 ? 3 + Math.round(vov / 0.8 * 34) : 0, sp = 55 * vRel(vov);
    for (let i = 0; i < n; i++) {
      const d = dots[i], span = wdt - 20;
      const x = x0 + 10 + (((i / n) + t * sp / span) % 1 + 1) % 1 * span, tk = thAt((x - x0 - 10) / span);
      if (tk < 3) continue;
      carrier(ctx, x, 122 + d.y * Math.max(1, tk - 4), C.e, { r: 2.5, trail: Math.min(26, sp * 0.22), sign: '−' });
    }
    // speed arrow
    const la = Math.max(0, 40 * vRel(vov)) + 6;
    ctx.strokeStyle = C.warm; ctx.fillStyle = C.warm; ctx.lineWidth = 2.5;
    const ax = x0 + wdt / 2 - la / 2, ay = 260;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + la, ay); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ax + la + 8, ay); ctx.lineTo(ax + la - 2, ay - 6); ctx.lineTo(ax + la - 2, ay + 6); ctx.fill();
    ctx.textAlign = 'center'; ctx.font = '600 14px system-ui'; ctx.fillStyle = C.fg;
    ctx.fillText(label, x0 + wdt / 2, 30);
    ctx.font = '13px system-ui'; ctx.fillStyle = C.muted;
    ctx.fillText('Vov = ' + Math.max(0, vov).toFixed(2) + ' V', x0 + wdt / 2, 52);
    ctx.fillStyle = C.accent; ctx.fillText('charge layer (thickness ∝ Vov − V(x))', x0 + wdt / 2, 238);
    ctx.fillStyle = C.warm; ctx.fillText('carrier speed', x0 + wdt / 2, 288);
  }
  function draw0(tm) {
    const { ctx, w, h } = cv0; bg(cv0);
    const t = anim.on ? tm / 1000 : 0;
    const v1 = S.vov, v2 = Math.max(0, S.vov + S.dv);
    panel(ctx, 20, 330, v1, 'before', t);
    panel(ctx, 410, 330, v2, 'after the gate step', t);
    ctx.fillStyle = C.fg; ctx.font = '600 28px system-ui'; ctx.textAlign = 'center'; ctx.fillText('→', w / 2, 170);
    ctx.font = '12px system-ui'; ctx.fillStyle = C.muted;
    ctx.fillText((S.dv >= 0 ? '+' : '−') + Math.abs(S.dv * 1000).toFixed(0) + ' mV', w / 2, 192);
    const i1 = idOf(v1), i2 = idOf(v2);
    ctx.fillStyle = C.fg; ctx.font = '13px system-ui';
    ctx.fillText('I = Q · v   →   ' + fmtI(i1) + '  to  ' + fmtI(i2), w / 2, h - 12);
  }
  function readout0() {
    const v1 = S.vov, v2 = Math.max(0, S.vov + S.dv), i1 = idOf(v1), i2 = idOf(v2);
    const pc = (a, b) => (a === 0 ? '—' : ((b / a - 1) >= 0 ? '+' : '−') + Math.abs((b / a - 1) * 100).toFixed(0) + ' %');
    $('g0-q').textContent = pc(v1, v2);
    $('g0-v').textContent = mode === 'tri' ? '0 % (fixed by VDS/L)' : pc(vRel(v1), vRel(v2));
    const f = mode === 'tri' ? k() * VDS_TRI : k() * v1;
    $('g0-f').textContent = fmtS(f);
    $('g0-gm').textContent = Math.abs(S.dv) < 1e-6 ? 'step is zero' : fmtS((i2 - i1) / S.dv);
    $('g0-txt').textContent = mode === 'tri'
      ? 'Triode: the layer reaches the drain almost as thick as at the source, and only the charge changes, because the speed is set by the drain voltage. The current changes in proportion to Vov, so the picture reproduces gm = μCox(W/L)·VDS exactly.'
      : 'Saturation: the layer thins to zero at the drain (pinch-off), and both the charge and the speed grow with Vov (the channel voltage is pinned at Vov, so the field grows too). The current goes as Vov squared, and the picture shows the secant slope, which approaches μCox(W/L)·Vov for small steps.';
    $('o-g-dv2').textContent = (S.dv >= 0 ? '+' : '−') + Math.abs(S.dv * 1000).toFixed(0) + ' mV';
  }

  // ---- gmb card ----
  function drawGmb() {
    const { ctx, w, h } = cvb; bg(cvb);
    const eta = (v) => GB.gam / (2 * Math.sqrt(0.7 + v));
    const fr = plotFrame(ctx, { x: 70, y: 22, w: w - 94, h: h - 62, xmin: 0, xmax: 3, ymin: 0, ymax: 0.5,
      xticks: [0, .5, 1, 1.5, 2, 2.5, 3], yticks: [0, .1, .2, .3, .4, .5], fmtx: (t) => t.toFixed(1), fmty: (t) => t.toFixed(1),
      xlabel: 'VSB (V)', ylabel: 'η = gmb / gm' });
    curve(ctx, eta, fr, 0, 3, 120, C.accent, 2.8);
    dot(ctx, fr.X(GB.vsb), fr.Y(eta(GB.vsb)), C.warm, 6);
    ctx.fillStyle = C.muted; ctx.font = '13px system-ui'; ctx.textAlign = 'left';
    ctx.fillText('η = γ / (2√(2ΦF + VSB)), with 2ΦF = 0.7 V', fr.x + 12, fr.y + 18);
    const e = eta(GB.vsb), g = gmSat(S.vov);
    $('gb-eta').textContent = e.toFixed(3);
    $('gb-gm').textContent = fmtS(g);
    $('gb-gmb').textContent = fmtS(e * g);
    $('gb-tot').textContent = fmtS((1 + e) * g);
    $('o-gb-vsb').textContent = GB.vsb.toFixed(2) + ' V';
    $('o-gb-gam').textContent = GB.gam.toFixed(2) + ' V½';
  }

  function readouts() {
    const vov = S.vov, id = idSat(vov), kk = k();
    $('g-vgs').textContent = (VTH + vov).toFixed(2) + ' V';
    $('g-id').textContent = fmtI(id);
    $('g-a').textContent = fmtS(kk * vov);
    $('g-b').textContent = fmtS(Math.sqrt(2 * kk * id));
    $('g-c').textContent = fmtS(2 * id / vov);
    $('g-eff').textContent = (2 / vov).toFixed(1) + ' V⁻¹';
    $('g-ron').textContent = eng(1 / (kk * vov * 1e-6), 'Ω');
    const reg = S.vds >= vov ? 'saturation' : 'triode';
    const b = $('g-region'); b.className = 'badge ' + reg; b.textContent = reg === 'saturation' ? 'Saturation' : 'Triode';
    $('g-gmnow').textContent = fmtS(gmAt(vov, S.vds));
    // small-signal test
    const v1 = vov + S.dv, iAct = idSat(v1), iPred = id + gmSat(vov) * S.dv;
    $('g-dact').textContent = ((iAct - id) >= 0 ? '+' : '−') + fmtI(Math.abs(iAct - id));
    $('g-dpred').textContent = ((iPred - id) >= 0 ? '+' : '−') + fmtI(Math.abs(iPred - id));
    const err = iAct === 0 && iPred <= 0 ? 0 : (iPred - iAct) / (iAct || 1) * 100;
    $('g-derr').textContent = Math.abs(S.dv) < 1e-6 ? '0 %' : (iAct === 0 ? 'device off' : Math.abs(err).toFixed(1) + ' %');
    const fx = [['o-g-vov', S.vov.toFixed(2) + ' V'], ['o-g-wl', String(S.wl)], ['o-g-kp', S.kp + ' µA/V²'],
      ['o-g-vds', S.vds.toFixed(2) + ' V'], ['o-g-dv', (S.dv >= 0 ? '+' : '−') + Math.abs(S.dv * 1000).toFixed(0) + ' mV']];
    for (const [id2, t] of fx) $(id2).textContent = t;
  }

  function update() { readouts(); readout0(); draw1(); draw2(); draw3(); drawGmb(); draw0(performance.now()); }
  const map = { 'g-vov': 'vov', 'g-wl': 'wl', 'g-kp': 'kp', 'g-vds': 'vds', 'g-dv': 'dv', 'g-dv2': 'dv' };
  for (const id of Object.keys(map)) {
    $(id).addEventListener('input', (e) => { S[map[id]] = parseFloat(e.target.value); for (const j of Object.keys(map)) $(j).value = S[map[j]]; update(); });
  }
  document.querySelectorAll('#g-presets button').forEach((b) => b.addEventListener('click', () => {
    const p = b.dataset.p;
    if (p === 'eff') Object.assign(S, { vov: 0.1 });
    if (p === 'fast') Object.assign(S, { vov: 0.6 });
    if (p === 'wide') Object.assign(S, { wl: 80 });
    if (p === 'tri') Object.assign(S, { vds: 0.1 });
    if (p === 'reset') Object.assign(S, { vov: 0.3, wl: 20, kp: 200, vds: 1.0, dv: 0.1 });
    for (const id of Object.keys(map)) $(id).value = S[map[id]];
    update();
  }));
  document.querySelectorAll('#g-mode button').forEach((b) => b.addEventListener('click', () => {
    mode = b.dataset.m;
    document.querySelectorAll('#g-mode button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    update();
  }));
  $('gb-vsb').addEventListener('input', (e) => { GB.vsb = parseFloat(e.target.value); drawGmb(); });
  $('gb-gam').addEventListener('input', (e) => { GB.gam = parseFloat(e.target.value); drawGmb(); });
  $('gb-vsb').value = GB.vsb; $('gb-gam').value = GB.gam;
  let vis = false;
  new IntersectionObserver((es) => { vis = es[0].isIntersecting; }, { threshold: 0 }).observe($('cv-gm0'));
  (function loop(ts) { if (vis && anim.on) draw0(ts); requestAnimationFrame(loop); })(0);
  onTheme(update);
  readTheme();
  for (const id of Object.keys(map)) $(id).value = S[map[id]];
  update();
})();
