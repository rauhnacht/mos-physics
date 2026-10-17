// Module 7: small-signal model, SPICE Level 1, FinFET.
(() => {
  'use strict';
  const { $, readTheme, setupCanvas, niceStep, plotFrame, curve, dot, onTheme, eng, C } = window.MOSUI;
  if (!$('cv-ss-wave')) return;
  const fillBg = (c) => { c.ctx.fillStyle = C.card; c.ctx.fillRect(0, 0, c.w, c.h); };
  const sub = (ctx, base, s, x, y, size, align) => window.MOSUI.subText(ctx, base, s, x, y, size, align);
  const VTH0 = 0.4, GAM = 0.4, PF2 = 0.7, KPN = 200;      // KP in uA/V^2
  const vthOf = (vsb) => VTH0 + GAM * (Math.sqrt(PF2 + vsb) - Math.sqrt(PF2));
  let tm = 0;


  // ---- drawing primitives shared by the schematics ----
  function prims(ctx) {
    const wire = (x1, y1, x2, y2, col, dash) => { ctx.strokeStyle = col || C.fg; ctx.lineWidth = 2; ctx.setLineDash(dash || []); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]); };
    const node = (x, y) => { ctx.fillStyle = C.fg; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 7); ctx.fill(); };
    const term = (x, y, t, left) => { ctx.fillStyle = C.card; ctx.strokeStyle = C.fg; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = C.fg; ctx.font = '600 14px system-ui'; ctx.textAlign = left ? 'right' : 'left'; ctx.fillText(t, x + (left ? -12 : 12), y + 5); };
    const txt = (t, x, y, col, size, al, bold) => { ctx.fillStyle = col || C.fg; ctx.font = (bold ? '600 ' : '') + (size || 13) + 'px system-ui'; ctx.textAlign = al || 'center'; ctx.fillText(t, x, y); };
    const capH = (xa, xb, y, name, val) => { const m = (xa + xb) / 2; wire(xa, y, m - 5, y); wire(m + 5, y, xb, y); wire(m - 5, y - 13, m - 5, y + 13); wire(m + 5, y - 13, m + 5, y + 13); txt(name, m, y - 20, C.fg, 13, 'center', true); txt(val, m, y + 32, C.muted, 12); };
    const capV = (x, ya, yb, name, val) => { const m = (ya + yb) / 2; wire(x, ya, x, m - 5); wire(x, m + 5, x, yb); wire(x - 13, m - 5, x + 13, m - 5); wire(x - 13, m + 5, x + 13, m + 5); txt(name, x + 20, m - 2, C.fg, 13, 'left', true); txt(val, x + 20, m + 14, C.muted, 12, 'left'); };
    const res = (x, ya, yb, col) => { // fixed-size zigzag centred between ya and yb, straight leads
      const len = yb - ya, body = Math.min(48, len - 16), y0 = ya + (len - body) / 2, y1 = y0 + body, n = 6, amp = 7;
      wire(x, ya, x, y0, col); ctx.strokeStyle = col || C.fg; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(x, y0);
      for (let i = 0; i < n; i++) ctx.lineTo(x + (i % 2 ? amp : -amp), y0 + body * (i + 0.5) / n);
      ctx.lineTo(x, y1); ctx.stroke(); wire(x, y1, x, yb, col); };
    const src = (x, ya, yb, col, r) => { r = r || 26; const m = (ya + yb) / 2; wire(x, ya, x, m - r, col); wire(x, m + r, x, yb, col); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, m, r, 0, 7); ctx.stroke(); ctx.fillStyle = col; wire(x, m - r * 0.55, x, m + r * 0.45, col); ctx.beginPath(); ctx.moveTo(x, m + r * 0.62); ctx.lineTo(x - 6, m + r * 0.2); ctx.lineTo(x + 6, m + r * 0.2); ctx.closePath(); ctx.fill(); };
    return { wire, node, term, txt, capH, capV, res, src };
  }

  // =============== A. wave: bias point, tangent, distortion ===============
  const W = { vov: 0.3, amp: 60 };
  const K = 4000;                                           // uA/V^2 (k = un Cox W/L = 4 mA/V^2)
  const idf = (vov, v) => { const o = vov + v; return o > 0 ? 0.5 * K * o * o : 0; };
  const cw = setupCanvas($('cv-ss-wave'));
  function drawWave() {
    const { ctx, w, h } = cw; fillBg(cw);
    const A = W.amp / 1000, vov = W.vov, i0 = idf(vov, 0), gm = K * vov;
    const th = (tm * 0.4) % 2, v = A * Math.sin(2 * Math.PI * th);
    // left: I_D versus V_GS
    const xlo = 0.3, xhi = Math.max(0.9, VTH0 + vov + A + 0.12), xt = []; for (let t = 0.4; t <= xhi; t += 0.2) xt.push(+t.toFixed(2));
    const ymaxRaw = Math.max(idf(vov, A), i0 * 1.4, 100) * 1.1, st = niceStep(ymaxRaw / 4), ymax = Math.ceil(ymaxRaw / st) * st;
    const fl = plotFrame(ctx, {
      x: 78, y: 24, w: 250, h: 262, xmin: xlo, xmax: xhi, ymin: 0, ymax,
      xticks: xt, yticks: Array.from({ length: Math.round(ymax / st) + 1 }, (_, i) => i * st),
      fmtx: (t) => t.toFixed(1), fmty: (t) => eng(t * 1e-6, 'A', 2), xlabel: 'VGS (V)', ylabel: 'ID'
    });
    curve(ctx, (x) => idf(x - VTH0, 0), fl, xlo, xhi, 160, C.accent, 2.8);
    const vg0 = VTH0 + vov;
    curve(ctx, (x) => i0 + gm * (x - vg0), fl, xlo, xhi, 2, C.warm, 1.6, [5, 4]);
    ctx.strokeStyle = C.muted; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(fl.X(VTH0), fl.y); ctx.lineTo(fl.X(VTH0), fl.y + fl.h); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.muted; ctx.font = '12px system-ui'; ctx.textAlign = 'left'; ctx.fillText('VTH', fl.X(VTH0) + 4, fl.y + 12);
    dot(ctx, fl.X(vg0), fl.Y(i0), C.fg, 5);
    ctx.strokeStyle = C.fg; ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(fl.X(vg0 + v), fl.Y(0)); ctx.lineTo(fl.X(vg0 + v), fl.Y(idf(vov, v))); ctx.stroke(); ctx.setLineDash([]);
    dot(ctx, fl.X(vg0 + v), fl.Y(idf(vov, v)), C.accent, 6);
    dot(ctx, fl.X(vg0 + v), fl.Y(i0 + gm * v), C.warm, 4);
    ctx.font = '13px system-ui'; ctx.textAlign = 'right';
    ctx.fillStyle = C.accent; ctx.fillText('square law', fl.x + fl.w - 10, fl.y + fl.h - 40);
    ctx.fillStyle = C.warm; ctx.fillText('tangent: slope gm', fl.x + fl.w - 10, fl.y + fl.h - 22);
    // right: waveforms
    const ft = plotFrame(ctx, {
      x: 430, y: 24, w: 300, h: 84, xmin: 0, xmax: 2, ymin: -A * 1.25, ymax: A * 1.25,
      xticks: [0, 0.5, 1, 1.5, 2], yticks: [-A, 0, A], fmtx: () => '', fmty: (t) => Math.round(t * 1000) + ' mV', ylabel: 'vgs(t)'
    });
    curve(ctx, (x) => A * Math.sin(2 * Math.PI * x), ft, 0, 2, 200, C.fg, 2);
    dot(ctx, ft.X(th), ft.Y(v), C.accent, 5);
    const real = (x) => idf(vov, A * Math.sin(2 * Math.PI * x)) - i0, lin = (x) => gm * A * Math.sin(2 * Math.PI * x);
    let m = 0; for (let k = 0; k < 120; k++) { const x = k / 60; m = Math.max(m, Math.abs(real(x)), Math.abs(lin(x))); }
    m = Math.max(m * 1.2, 1);
    const fb = plotFrame(ctx, {
      x: 430, y: 160, w: 300, h: 126, xmin: 0, xmax: 2, ymin: -m, ymax: m,
      xticks: [0, 0.5, 1, 1.5, 2], yticks: [-m / 1.2, 0, m / 1.2], fmtx: (t) => t.toFixed(1), fmty: (t) => eng(t * 1e-6, 'A', 2), xlabel: 'time (periods)', ylabel: 'id(t)'
    });
    curve(ctx, lin, fb, 0, 2, 200, C.warm, 2, [6, 4]);
    curve(ctx, real, fb, 0, 2, 200, C.accent, 2.8);
    dot(ctx, fb.X(th), fb.Y(real(th)), C.accent, 5);
    ctx.font = '12px system-ui'; ctx.textAlign = 'right';
    ctx.fillStyle = C.warm; ctx.fillText('gm vgs (model)', fb.x + fb.w, fb.y - 8);
    ctx.fillStyle = C.accent; ctx.fillText('real id', fb.x + fb.w - 100, fb.y - 8);
  }
  function waveReadouts() {
    const A = W.amp / 1000, vov = W.vov, i0 = idf(vov, 0), gm = K * vov;
    let pk = 0, a1 = 0, a2 = 0; const N = 256;
    for (let k = 0; k < N; k++) {
      const t = 2 * Math.PI * k / N, id = idf(vov, A * Math.sin(t)) - i0;
      pk = Math.max(pk, Math.abs(id)); a1 += id * Math.sin(t) * 2 / N; a2 += id * Math.cos(2 * t) * 2 / N;
    }
    $('w-id').textContent = eng(i0 * 1e-6, 'A'); $('w-gm').textContent = eng(gm * 1e-6, 'S');
    $('w-ipk').textContent = eng(pk * 1e-6, 'A'); $('w-lpk').textContent = eng(gm * A * 1e-6, 'A');
    $('w-hd2').textContent = (Math.abs(a1) > 1e-9 ? Math.abs(a2 / a1) * 100 : 0).toFixed(1) + ' %';
    $('o-w-vov').textContent = vov.toFixed(2) + ' V'; $('o-w-amp').textContent = W.amp + ' mV';
  }
  const updWave = () => { waveReadouts(); drawWave(); };
  $('w-vov').addEventListener('input', (e) => { W.vov = parseFloat(e.target.value); updWave(); });
  $('w-amp').addEventListener('input', (e) => { W.amp = parseFloat(e.target.value); updWave(); });

  // =============== B. model builder and the nudge experiment ===============
  const M = { lvl: 4, vov: 0.3, wl: 20, lam: 0.1, vsb: 0.5, nudge: 'gs', dv: 10 };
  const cm = setupCanvas($('cv-ss-model'));
  const VDS0 = 1.0;
  function mp() {
    const k = KPN * M.wl * 1e-6, vds = VDS0;
    const id = 0.5 * k * M.vov * M.vov * (1 + M.lam * vds);
    const gm = k * M.vov * (1 + M.lam * vds), ro = 1 / (0.5 * k * M.vov * M.vov * M.lam), eta = GAM / (2 * Math.sqrt(PF2 + M.vsb));
    const Lm = 0.18e-6, Wm = M.wl * Lm, Cox = 8.6e-3, Cov = 0.3e-9;
    return { k, id, gm, ro, gmb: eta * gm, eta, cgs: 2 / 3 * Wm * Lm * Cox + Wm * Cov, cgd: Wm * Cov, cj: 1e-9 * Wm };
  }
  const idc = (vgs, vds, vsb) => { const k = KPN * M.wl * 1e-6, o = vgs - vthOf(vsb); return o > 0 ? 0.5 * k * o * o * (1 + M.lam * vds) : 0; };

  // voltage marker: arrow with + and - signs; both = double-headed
  function vmarkG(ctx, x, yPlus, yMinus, label, col, both) {
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.6; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(x, yMinus); ctx.lineTo(x, yPlus); ctx.stroke();
    const dir = yPlus < yMinus ? 1 : -1;
    const head = (y, d) => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 5, y + 9 * d); ctx.lineTo(x + 5, y + 9 * d); ctx.closePath(); ctx.fill(); };
    head(yPlus, dir); if (both) head(yMinus, -dir);
    const sign = (y, ch) => { ctx.save(); ctx.lineWidth = 1.6; ctx.strokeStyle = col; ctx.fillStyle = C.bg || 'transparent';
      ctx.beginPath(); ctx.arc(x - 17, y, 8, 0, 6.2832); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 21, y); ctx.lineTo(x - 13, y); if (ch === '+') { ctx.moveTo(x - 17, y - 4); ctx.lineTo(x - 17, y + 4); } ctx.stroke(); ctx.restore(); };
    sign(yPlus - dir * 15, '+'); sign(yMinus + dir * 15, '−');
    ctx.font = '700 14px system-ui'; ctx.textAlign = 'left'; ctx.fillText(label, x + 9, (yPlus + yMinus) / 2 + 4);
  }
  function dotted(ctx, x1, y1, x2, y2, col) { ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]); }

  // ---- small-signal schematic in the textbook style: voltages vgs, vds, vbs with polarities ----
  function diagram(c, o) {
    const ctx = c.ctx, { wire, node, term, txt, capH, capV, res, src } = prims(ctx);
    const L = o.lvl, caps = L >= 4, hasRo = L >= 2, hasB = L >= 3, hi = o.hi || '', v = o.vals;
    const { x0, yD, yS, yB, yG, xg, xo, xb, xT } = o;
    const colOf = (n) => (hi === n ? C.accent : C.fg);
    const vmark = (x, yPlus, yMinus, label, col, both) => vmarkG(ctx, x, yPlus, yMinus, label, col, both);
    // rails
    const dStart = caps ? x0 : xg, sStart = x0;
    wire(dStart, yD, xT, yD); wire(sStart, yS, xT, yS);
    term(xT, yD, 'D'); term(xT, yS, hasB ? 'S' : 'S, B');
    // gate node, terminal and gate capacitors
    term(x0 - 40, yG, '', true); txt('G', x0 - 40, yG - 12, C.fg, 14, 'center', true);
    wire(x0 - 35, yG, x0, yG); node(x0, yG);
    if (caps) {
      wire(x0, yD, x0, yD); node(x0, yD); node(x0, yS);
      capV(x0, yD, yG, 'CGD', v ? eng(v.cgd, 'F', 2) : ''); capV(x0, yG, yS, 'CGS', v ? eng(v.cgs, 'F', 2) : '');
    }
    // vgs polarity marker
    const mx = caps ? x0 + 118 : x0;
    if (caps) { ctx.setLineDash([2, 3]); wire(x0, yG, mx, yG, C.muted); ctx.setLineDash([]); }
    if (!caps) { ctx.setLineDash([4, 4]); wire(x0, yG, x0, yS, C.muted); ctx.setLineDash([]); node(x0, yS); }
    vmark(mx, yG, yS, 'vgs', hi === 'gs' ? C.accent : C.muted);
    // controlled source gm vgs (drain to source)
    src(xg, yD, yS, hi === 'gs' ? C.accent : C.warm, 24); node(xg, yD); node(xg, yS);
    txt('gm·vgs', xg - 8, yD + 34, hi === 'gs' ? C.accent : C.warm, 13, 'right', true); if (v) txt(eng(v.gm, 'S', 3), xg - 8, yD + 50, C.muted, 12, 'right');
    if (hasRo) {
      res(xo, yD, yS, colOf('ds')); node(xo, yD); node(xo, yS);
      txt('ro', xo - 12, yD + 34, colOf('ds'), 13, 'right', true); if (v) txt(eng(v.ro, 'Ω', 3), xo - 12, yD + 50, C.muted, 12, 'right');
      vmark(xo + 34, yD, yS, 'vds', hi === 'ds' ? C.accent : C.muted);
    }
    if (hasB) {
      src(xb, yD, yS, hi === 'bs' ? C.accent : C.fg, 24); node(xb, yD); node(xb, yS);
      txt('gmb·vbs', xb - 8, yD + 34, hi === 'bs' ? C.accent : C.fg, 13, 'right', true); if (v) txt(eng(v.gmb, 'S', 3), xb - 8, yD + 50, C.muted, 12, 'right');
      const hc = hi === 'bs' ? C.accent : C.muted;
      let xm;
      if (caps) { wire(x0 - 22, yG, x0 - 22, yB); node(x0 - 22, yG); capH(x0 - 22, x0 + 66, yB, 'CGB', v ? '≈ 0 (on)' : ''); wire(x0 + 66, yB, xT, yB); xm = xb + 50; }
      else { xm = xb - 38; wire(xm - 24, yB, xT, yB); }
      term(xT, yB, 'B');
      node(xm, yS); node(xm, yB);
      vmark(xm, yB, yS, 'vbs', hc, true);
      if (caps) { const xd = xb + 100, xs2 = xb + 160; capV(xd, yD, yB, 'CDB', v ? eng(v.cj, 'F', 2) : ''); node(xd, yD); node(xd, yB); capV(xs2, yS, yB, 'CSB', v ? eng(v.cj, 'F', 2) : ''); node(xs2, yS); node(xs2, yB); }
    }
  }

  function drawModel() {
    const c = cm; fillBg(c);
    const p = mp();
    diagram(c, { lvl: M.lvl, hi: M.nudge, vals: p, x0: 78, yD: 70, yG: 175, yS: 295, yB: 385, xg: 285, xo: 375, xb: 475, xT: 696 });
    const { ctx } = c; ctx.fillStyle = C.muted; ctx.font = '13px system-ui'; ctx.textAlign = 'left';
    ctx.fillText(['Ideal model: only the voltage-controlled current source', 'Adds the output resistance (channel-length modulation)', 'Adds the body as a second gate', 'Complete model with capacitances'][M.lvl - 1], 14, 22);
  }
  function modelReadouts() {
    const p = mp();
    $('ss-gm').textContent = eng(p.gm, 'S'); $('ss-ro').textContent = eng(p.ro, 'Ω'); $('ss-gmb').textContent = eng(p.gmb, 'S');
    $('ss-cgs').textContent = eng(p.cgs, 'F'); $('ss-cgd').textContent = eng(p.cgd, 'F'); $('ss-cjb').textContent = eng(p.cj, 'F');
    $('o-ss-vov').textContent = M.vov.toFixed(2) + ' V'; $('o-ss-wl').textContent = String(M.wl); $('o-ss-lam').textContent = M.lam.toFixed(2) + ' V⁻¹'; $('o-ss-vsb').textContent = M.vsb.toFixed(2) + ' V';
    $('o-ss-dv').textContent = M.dv + ' mV';
    // the experiment
    const dv = M.dv / 1000, vgs = vthOf(M.vsb) + M.vov, base = idc(vgs, VDS0, M.vsb);
    let meas, pred, el, note;
    if (M.nudge === 'gs') { meas = idc(vgs + dv, VDS0, M.vsb) - base; pred = p.gm * dv; el = 'gm (current source)'; note = 'Raising V_GS by ΔV changes the charge in the channel, so the current changes by ΔI = gm ΔV. A voltage-controlled current source is the model of this behaviour.'; }
    else if (M.nudge === 'ds') { meas = idc(vgs, VDS0 + dv, M.vsb) - base; pred = dv / p.ro; el = 'ro (resistor)'; note = 'Because of channel-length modulation the current also depends on V_DS. A current that is proportional to the voltage across it is a resistor: ΔI = ΔV / ro, with ro = 1/(λ I_D). With λ = 0 the resistor is infinite and this nudge changes nothing.'; }
    else { meas = idc(vgs, VDS0, M.vsb - dv) - base; pred = p.gmb * dv; el = 'gmb (second source)'; note = 'Raising V_BS lowers V_SB, which lowers V_TH and raises the current by ΔI = gmb ΔV with gmb = η gm. The body acts as a second, weaker gate.'; }
    $('ss-dim').textContent = eng(meas, 'A'); $('ss-dip').textContent = eng(pred, 'A'); $('ss-el').textContent = el;
    $('ss-err').textContent = meas ? (Math.abs(meas - pred) / Math.abs(meas) * 100).toFixed(1) + ' %' : '0 %';
    $('ss-nudge-note').innerHTML = note.replace(/V_([A-Z]+)/g, 'V<sub>$1</sub>').replace(/I_D/g, 'I<sub>D</sub>').replace(/\bgmb\b/g, 'g<sub>mb</sub>').replace(/\bgm\b/g, 'g<sub>m</sub>').replace(/\bro\b/g, 'r<sub>o</sub>').replace(/λ/g, '&lambda;') + ' The error shrinks as the nudge gets smaller.';
  }
  const updModel = () => { modelReadouts(); drawModel(); drawP(); };
  for (const [id, k] of [['ss-vov', 'vov'], ['ss-wl', 'wl'], ['ss-lam', 'lam'], ['ss-vsb', 'vsb'], ['ss-dv', 'dv']]) $(id).addEventListener('input', (e) => { M[k] = parseFloat(e.target.value); updModel(); });
  document.querySelectorAll('#ss-level button').forEach((b) => b.addEventListener('click', () => { M.lvl = +b.dataset.l; document.querySelectorAll('#ss-level button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); drawModel(); }));
  document.querySelectorAll('#ss-nudge button').forEach((b) => b.addEventListener('click', () => { M.nudge = b.dataset.n; document.querySelectorAll('#ss-nudge button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); modelReadouts(); drawModel(); }));

  // =============== C. PMOS versus NMOS: the model is an increment ===============
  const P = { v: 30 };
  const cp = setupCanvas($('cv-ss-p'));
  function drawP() {
    const { ctx, w, h } = cp; fillBg(cp);
    const p = mp(), id0 = p.id * 1e6, d = p.gm * (P.v / 1000) * 1e6;  // uA
    const mx = Math.max(id0 * 1.1 + Math.abs(d), 1), x0 = 222, sc = (w - x0 - 96) / mx;
    const row = (y, title, dir, sign) => {
      ctx.fillStyle = C.fg; ctx.font = '600 16px system-ui'; ctx.textAlign = 'left'; ctx.fillText(title, 14, y + 2);
      ctx.fillStyle = C.muted; ctx.font = '13px system-ui'; ctx.fillText(dir, 14, y + 22);
      const delta = sign * d, tot = id0 + delta;
      ctx.fillStyle = C.accent; ctx.globalAlpha = 0.85; ctx.fillRect(x0, y - 14, Math.min(id0, Math.max(tot, 0)) * sc, 28); ctx.globalAlpha = 1;
      if (delta > 0) { ctx.fillStyle = C.warm; ctx.fillRect(x0 + id0 * sc, y - 14, delta * sc, 28); }
      if (delta < 0) { ctx.strokeStyle = C.warm; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.strokeRect(x0 + tot * sc, y - 14, -delta * sc, 28); ctx.setLineDash([]); }
      ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0 + id0 * sc, y - 20); ctx.lineTo(x0 + id0 * sc, y + 20); ctx.stroke();
      ctx.fillStyle = C.fg; ctx.font = '600 14px system-ui'; ctx.textAlign = 'left';
      ctx.fillText(eng(tot * 1e-6, 'A', 3), x0 + Math.max(tot, id0) * sc + 8, y + 5);
    };
    row(70, 'NMOS', 'current flows drain → source', +1);
    row(150, 'PMOS', 'current flows source → drain', -1);
    ctx.fillStyle = C.muted; ctx.font = '13px system-ui'; ctx.textAlign = 'left';
    ctx.fillText('Blue: DC current. Orange: gm·vgs (solid = added,', 14, 204);
    ctx.fillText('dashed = removed). Line = DC value. vgs = ' + (P.v >= 0 ? '+' : '−') + Math.abs(P.v) + ' mV.', 14, 224);
    $('p-id').textContent = (d >= 0 ? '' : '−') + eng(Math.abs(d) * 1e-6, 'A');
    $('p-n').textContent = eng((id0 + d) * 1e-6, 'A'); $('p-p').textContent = eng((id0 - d) * 1e-6, 'A');
    $('o-ss-pv').textContent = (P.v >= 0 ? '+' : '−') + Math.abs(P.v) + ' mV';
  }
  $('ss-pv').addEventListener('input', (e) => { P.v = parseFloat(e.target.value); drawP(); });

  // =============== D. NMOS versus PMOS ===============
  const Q = { mr: 0.5, lr: 1.5 };
  const cq = setupCanvas($('cv-ss-np'));
  function drawNP() {
    const { ctx, w, h } = cq; fillBg(cq);
    const r = Q.mr, l = Q.lr;
    const groups = [['gm', 'same Vov', r, 1], ['ID', 'same Vov', r, 1], ['ro', 'equal ID', 1 / l, 1 / l], ['CGS', 'gate area', 1, 1 / r]];
    const ymax = Math.max(2, 1 / r, 1 / l, 1) * 1.15, x0 = 70, x1 = w - 14, y0 = 44, y1 = 262, Y = (v) => y1 - v / ymax * (y1 - y0);
    ctx.strokeStyle = C.muted; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0, y0 - 6); ctx.lineTo(x0, y1); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.setLineDash([3, 4]); ctx.strokeStyle = C.fg; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x0, Y(1)); ctx.lineTo(x1, Y(1)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.muted; ctx.font = '12px system-ui'; ctx.textAlign = 'right'; ctx.fillText('NMOS = 1', x0 - 6, Y(1) + 4); ctx.fillText('0', x0 - 6, y1 + 4);
    const gw = (x1 - x0) / groups.length;
    groups.forEach((g, i) => {
      const cx = x0 + gw * (i + 0.5);
      [[g[2], C.accent, -40], [g[3], C.warm, 4]].forEach(([v, col, off]) => {
        ctx.fillStyle = col; ctx.fillRect(cx + off, Y(v), 36, y1 - Y(v));
        ctx.fillStyle = C.fg; ctx.font = '600 14px system-ui'; ctx.textAlign = 'center'; ctx.fillText(v.toFixed(2) + '×', cx + off + 18, Y(v) - 6);
      });
      ctx.fillStyle = C.fg; ctx.font = '600 16px system-ui'; ctx.fillText(g[0], cx, y1 + 22);
      ctx.fillStyle = C.muted; ctx.font = '13px system-ui'; ctx.fillText(g[1], cx, y1 + 40);
    });
    ctx.font = '13px system-ui'; ctx.textAlign = 'left';
    ctx.fillStyle = C.accent; ctx.fillRect(x0, 8, 12, 12); ctx.fillText('PMOS, same W/L', x0 + 18, 19);
    ctx.fillStyle = C.warm; ctx.fillRect(x0 + 140, 8, 12, 12); ctx.fillText('PMOS widened ' + (1 / r).toFixed(1) + '× (matches NMOS drive)', x0 + 158, 19);
    $('o-ss-mr').textContent = r.toFixed(2); $('o-ss-lr').textContent = l.toFixed(2);
  }
  $('ss-mr').addEventListener('input', (e) => { Q.mr = parseFloat(e.target.value); drawNP(); });
  $('ss-lr').addEventListener('input', (e) => { Q.lr = parseFloat(e.target.value); drawNP(); });

  // =============== E. the three model variants ===============
  const cvs = { 1: setupCanvas($('cv-sm-1')), 2: setupCanvas($('cv-sm-2')), 3: setupCanvas($('cv-sm-3')) };
  function drawVariant(v) {
    const c = cvs[v]; fillBg(c);
    const o = { lvl: v, x0: 62, yD: 56, yG: 140, yS: 236, yB: 290, xT: 352 };
    if (v === 1) Object.assign(o, { xg: 200 }); else if (v === 2) Object.assign(o, { xg: 160, xo: 250 }); else Object.assign(o, { xg: 112, xo: 172, xb: 280 });
    diagram(c, o);
    const { ctx } = c; ctx.fillStyle = C.muted; ctx.font = '13px system-ui'; ctx.textAlign = 'left';
    ctx.fillText(['Ideal', 'With channel-length modulation', 'With channel-length modulation and body effect'][v - 1], 12, 20);
  }
  const drawVariants = () => { drawVariant(1); drawVariant(2); drawVariant(3); };

  // =============== F. DC circuit -> small-signal circuit ===============
  const T = { step: 1, vdd: 1.8, rd: 4, vg: 0.7, wl: 20, lam: 0.1, clm: true, be: false, rs: 1 };
  const cst = setupCanvas($('cv-ss-steps'));
  function dcSolve() {
    const k = KPN * T.wl * 1e-6, lam = T.clm ? T.lam : 0, rd = T.rd * 1e3, rs = T.be ? T.rs * 1e3 : 0;
    let vov = T.vg - VTH0, id = 0, vds = T.vdd, vs = 0, region = 'saturation';
    if (vov <= 0) return { k, vov, id: 0, vds: T.vdd, vs: 0, region: 'cutoff', gm: 0, gmb: 0, eta: 0, ro: Infinity, rl: rd, av: 0, lam, rs };
    if (rs === 0) {
      id = 0.5 * k * vov * vov;
      for (let i = 0; i < 60; i++) { vds = T.vdd - id * rd; id = 0.5 * k * vov * vov * (1 + lam * Math.max(vds, 0)); }
      vds = T.vdd - id * rd;
      if (vds < vov) { region = 'triode'; const b = k * vov + 1 / rd, disc = Math.max(0, b * b - 2 * k * T.vdd / rd); vds = (b - Math.sqrt(disc)) / k; id = (T.vdd - vds) / rd; }
    } else {
      for (let i = 0; i < 300; i++) {
        vov = T.vg - vs - vthOf(Math.max(vs, 0));
        if (vov <= 0) { id = 0; vs = 0; break; }
        vds = T.vdd - id * (rd + rs);
        id = 0.5 * id + 0.5 * (0.5 * k * vov * vov * (1 + lam * Math.max(vds, 0)));
        vs = id * rs;
      }
      vs = id * rs; vov = T.vg - vs - vthOf(vs); vds = T.vdd - id * (rd + rs);
      if (vov <= 0) return { k, vov, id: 0, vds: T.vdd, vs: 0, region: 'cutoff', gm: 0, gmb: 0, eta: 0, ro: Infinity, rl: rd, av: 0, lam, rs };
      if (vds - vs < vov) region = 'triode';
      vds = vds; // V_DS = VD - VS, with VD = VDD - ID RD
      vds = T.vdd - id * rd - vs;
    }
    const sat = region === 'saturation';
    const gm = sat ? 2 * id / vov : k * Math.max(vds, 0);
    const ro = lam > 0 && sat ? 1 / (lam * id) : Infinity;
    const eta = T.be ? GAM / (2 * Math.sqrt(PF2 + vs)) : 0, gmb = eta * gm;
    const rl = ro === Infinity ? rd : 1 / (1 / rd + 1 / ro);
    let av;
    if (rs === 0) av = -gm * rl;
    else {                                   // exact node equations at D and S
      const grd = 1 / rd, go = ro === Infinity ? 0 : 1 / ro, gs = 1 / rs;
      const a11 = grd + go, a12 = -(gm + gmb + go), a21 = -go, a22 = gs + gm + gmb + go, b1 = -gm, b2 = gm;
      av = (b1 * a22 - a12 * b2) / (a11 * a22 - a12 * a21);
    }
    return { k, vov, id, vds, vs, region, gm, gmb, eta, ro, rl, av, lam, rs };
  }
  const fmtR = (r) => (r === Infinity ? '∞' : eng(r, 'Ω', 3));
  function drawSteps() {
    const { ctx, w, h } = cst; fillBg(cst);
    const { wire, node, term, txt, res, src } = prims(ctx);
    const st = T.step, d = dcSolve(), XM = 400;
    const gnd = (x, y, up) => { wire(x, y, x, y + (up ? -10 : 10)); const s = up ? -1 : 1; [[16, 10], [10, 16], [4, 22]].forEach(([hw, dy]) => wire(x - hw / 1.6, y + s * dy, x + hw / 1.6, y + s * dy)); };
    const bat = (x, y, col) => { wire(x, y - 22, x, y - 4, col); wire(x - 14, y - 4, x + 14, y - 4, col); wire(x - 8, y + 4, x + 8, y + 4, col); wire(x, y + 4, x, y + 22, col); };
    const acs = (x, y) => { ctx.strokeStyle = C.fg; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 18, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - 9, y); ctx.bezierCurveTo(x - 5, y - 10, x - 2, y - 10, x, y); ctx.bezierCurveTo(x + 2, y + 10, x + 5, y + 10, x + 9, y); ctx.stroke(); };
    const hi = st === 3 ? C.warm : C.fg;
    const toGnd = () => { if (T.be) { res(XM, 300, 364, C.fg); txt('RS = ' + T.rs.toFixed(1) + ' kΩ', XM + 14, 336, C.fg, 13, 'left', true); gnd(XM, 364); } else { wire(XM, 300, XM, 322); gnd(XM, 322); } };
    const modelBe = (stp) => {
      wire(XM, 150, XM, 180); node(XM, 150); wire(XM, 150, 520, 150); term(520, 150, 'vout');
      const els = [XM, XM + 130]; if (T.clm) els.push(XM + 260);
      const xr = els[els.length - 1], xb2 = els[els.length - 1];
      wire(XM, 180, xr, 180); wire(XM, 300, xr, 300);
      src(XM, 180, 300, C.warm, 26); node(XM, 180); node(XM, 300);
      let xo2 = null, xbb;
      if (T.clm) { xo2 = XM + 130; res(xo2, 180, 300, C.accent); node(xo2, 180); node(xo2, 300); xbb = XM + 260; } else xbb = XM + 130;
      src(xbb, 180, 300, C.fg, 26); node(xbb, 180); node(xbb, 300);
      const xe = xbb; wire(XM, 180, xe, 180); wire(XM, 300, xe, 300);
      toGnd();
      // body terminal and vbs marker (body = ground)
      term(300, 364, ''); txt('B', 284, 368, C.fg, 14, 'center', true); wire(305, 364, XM, 364); node(XM, 364);
      node(330, 300); node(330, 364); vmarkG(ctx, 330, 364, 300, 'vbs', C.fg, true);
      term(326, gy, ''); txt('G', 326, gy - 12, C.fg, 14, 'center', true); wire(140, gy, 321, gy);
      wire(250, 300, XM, 300); node(250, gy); node(250, 300); vmarkG(ctx, 250, gy, 300, 'vgs', C.accent, false);
      const xv = xe + 110; dotted(ctx, xe, 180, xv, 180, C.muted); dotted(ctx, xe, 300, xv, 300, C.muted); vmarkG(ctx, xv, 180, 300, 'vds', C.muted, false);
      txt('gm·vgs', XM + 36, 250, C.warm, 13, 'left', true); if (T.clm) txt('ro', XM + 142, 250, C.accent, 13, 'left', true); txt('gmb·vbs', xbb + 36, 250, C.fg, 13, 'left', true);
      txt(stp === 4 ? 'model, body at ground: vbs = −vs' : 'vout/vin = ' + d.av.toFixed(2), 20, 46, stp === 4 ? C.muted : C.fg, 13, 'left', stp === 5);
    };
    // top: VDD or ground
    if (st <= 2) { wire(XM - 24, 40, XM + 24, 40); txt('VDD = ' + T.vdd.toFixed(2) + ' V', XM + 36, 45, st === 1 ? C.accent : C.fg, 14, 'left', true); }
    else if (st === 3) { gnd(XM, 40, true); txt('VDD → 0 V: short to ground', XM + 36, 45, C.warm, 13, 'left', true); }
    else if (st >= 4 && (st === 4 || T.be)) gnd(XM, 40, true);
    if (st <= 4 || T.be) { res(XM, 40, 150); txt('RD = ' + T.rd.toFixed(1) + ' kΩ', XM - 22, 100, C.fg, 13, 'right', true); }
    // input branch
    const gy = 240;
    wire(140, gy, 140, st <= 2 ? 262 : 312, st === 3 ? C.warm : C.fg);
    if (st <= 2) { bat(140, 266); wire(140, 288, 140, 312); txt('VG = ' + T.vg.toFixed(2) + ' V', 124, 268, st === 1 ? C.accent : C.fg, 14, 'right', true); }
    else if (st === 3) txt('VG → 0 V: short', 126, 270, C.warm, 13, 'right', true);
    acs(140, 330); wire(140, 312, 140, 312); wire(140, 348, 140, 366); gnd(140, 366); txt('vin', 164, 335, C.fg, 14, 'left', true);
    if (st === 3) wire(140, 312, 140, 312);
    // transistor or its model
    if (st <= 3) {
      const cx = XM - 14, cy = 240;
      wire(XM, 150, XM, 180); node(XM, 150); wire(XM, 150, 520, 150); term(520, 150, 'vout');
      wire(140, gy, cx - 60, gy); wire(cx - 60, gy, cx - 20, gy);
      ctx.strokeStyle = C.fg; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx - 20, cy - 28); ctx.lineTo(cx - 20, cy + 28); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx - 10, cy - 28); ctx.lineTo(cx - 10, cy + 28); ctx.stroke();
      wire(cx - 10, cy - 22, cx + 14, cy - 22); wire(cx + 14, cy - 22, cx + 14, cy - 60); wire(cx - 10, cy + 22, cx + 14, cy + 22); wire(cx + 14, cy + 22, cx + 14, cy + 60);
      ctx.fillStyle = C.fg; ctx.beginPath(); ctx.moveTo(cx + 2, cy + 22); ctx.lineTo(cx - 6, cy + 17); ctx.lineTo(cx - 6, cy + 27); ctx.closePath(); ctx.fill();
      txt('M1', cx + 34, cy + 5, C.fg, 14, 'left', true); txt('G', cx - 64, gy - 8, C.muted, 12, 'right'); txt('D', XM + 10, 205, C.muted, 12, 'left'); txt('S', XM + 10, 280, C.muted, 12, 'left');
      toGnd(); if (T.be) txt('body at 0 V', XM - 20, 322, C.muted, 12, 'right');
    } else if (st >= 4 && T.be) {
      modelBe(st);
    } else if (st === 4) {
      wire(XM, 150, XM, 180); node(XM, 150); wire(XM, 150, 520, 150); term(520, 150, 'vout');
      const xr = T.clm ? XM + 110 : XM;
      wire(XM, 180, xr, 180); wire(XM, 300, xr, 300);
      src(XM, 180, 300, C.warm, 26); node(XM, 180); node(XM, 300);
      if (T.clm) { res(xr, 180, 300, C.accent); node(xr, 180); node(xr, 300); }
      toGnd();
      term(326, gy, ''); txt('G', 326, gy - 12, C.fg, 14, 'center', true); wire(140, gy, 321, gy);
      wire(250, 300, XM, 300); node(250, gy); node(250, 300); vmarkG(ctx, 250, gy, 300, 'vgs', C.accent, false);
      const xv = xr + 90; dotted(ctx, xr, 180, xv, 180, C.muted); dotted(ctx, xr, 300, xv, 300, C.muted); vmarkG(ctx, xv, 180, 300, 'vds', C.muted, false);
      txt('gm·vgs', XM + 36, 250, C.warm, 13, 'left', true); if (T.clm) txt('ro', xr + 12, 250, C.accent, 13, 'left', true);
      txt('M1 replaced by its small-signal model', 200, 392, C.muted, 13, 'left');
    } else {
      const XR1 = 330, XG = 400, XO = T.clm ? 470 : 400, XE = XO;
      wire(XR1, 150, XE, 150); wire(XR1, 330, XE, 330); wire(XE, 150, 520, 150); term(520, 150, 'vout');
      res(XR1, 150, 330, C.fg); src(XG, 150, 330, C.warm, 26); if (T.clm) res(XO, 150, 330, C.accent);
      (T.clm ? [XR1, XG, XO] : [XR1, XG]).forEach((x) => { node(x, 150); node(x, 330); });
      gnd(XG, 330);
      wire(140, gy, 195, gy); term(200, gy, ''); txt('G', 200, gy - 12, C.fg, 14, 'center', true);
      wire(250, 330, XR1, 330); node(250, 330); node(250, gy); dotted(ctx, 205, gy, 250, gy, C.fg); vmarkG(ctx, 250, gy, 330, 'vgs = vin', C.accent, false);
      txt('RD', XR1, 360, C.fg, 13, 'center', true); txt('gm·vgs', XG, 382, C.warm, 13, 'center', true); if (T.clm) txt('ro', XO, 360, C.accent, 13, 'center', true);
      txt(T.clm ? 'vout = −gm (RD ∥ ro) vin' : 'vout = −gm RD vin', 590, 280, C.fg, 14, 'center', true);
    }
    // step banner
    txt(['1. The DC circuit', '2. Solve the bias point and compute the parameters', '3. Set the DC sources to zero', '4. Replace the transistor by its model', (T.be ? '5. Solve the node equations (D, S)' : '5. Redraw: everything in parallel at the output')][st - 1], 20, 24, C.fg, 15, 'left', true);
  }
  function stepText() {
    const d = dcSolve(), f2 = (x) => x.toFixed(2), n = { 1: '', 2: '', 3: '', 4: '', 5: '' };
    const warn = d.region !== 'saturation' ? ' <b style="color:var(--warm)">The device is not in saturation (' + d.region + '): this small-signal model does not apply. Raise V<sub>DD</sub>, lower R<sub>D</sub> or lower V<sub>G</sub>.</b>' : '';
    n[1] = 'A common-source stage with a DC supply V<sub>DD</sub>, a drain resistor R<sub>D</sub>, a DC gate bias V<sub>G</sub> and a small signal source v<sub>in</sub> in series with it. Small-signal analysis always starts from the <b>DC circuit</b>: signals are set aside.';
    n[2] = 'With v<sub>in</sub> = 0: ' + (T.be ? 'the source sits at V<sub>S</sub> = I<sub>D</sub>R<sub>S</sub> = ' + f2(d.vs) + ' V while the body is grounded, so V<sub>SB</sub> = ' + f2(d.vs) + ' V: the threshold rises to V<sub>TH</sub> = ' + f2(vthOf(d.vs)) + ' V (body effect) and V<sub>GS</sub> = V<sub>G</sub> &minus; V<sub>S</sub> = ' + f2(T.vg - d.vs) + ' V' : 'V<sub>GS</sub> = V<sub>G</sub> = ' + f2(T.vg) + ' V') + ', so V<sub>ov</sub> = V<sub>GS</sub> &minus; V<sub>TH</sub> = ' + f2(d.vov) + ' V and I<sub>D</sub> = &frac12;k V<sub>ov</sub>&sup2;(1 + &lambda;V<sub>DS</sub>) = ' + eng(d.id, 'A') + '. Then V<sub>DS</sub> = V<sub>DD</sub> &minus; I<sub>D</sub>(R<sub>D</sub>' + (T.be ? ' + R<sub>S</sub>' : '') + ') = ' + f2(d.vds) + ' V &gt; V<sub>ov</sub>, so the device is in <b>' + d.region + '</b>. The model parameters follow from the bias: g<sub>m</sub> = 2I<sub>D</sub>/V<sub>ov</sub> = ' + eng(d.gm, 'S') + ', r<sub>o</sub> = 1/(&lambda;I<sub>D</sub>) = ' + fmtR(d.ro) + (T.be ? ', g<sub>mb</sub> = &eta;g<sub>m</sub> = ' + f2(d.eta) + ' &times; g<sub>m</sub> = ' + eng(d.gmb, 'S') + ' (&eta; = &gamma;/(2&radic;(2&Phi;<sub>F</sub> + V<sub>SB</sub>)))' : '') + '. ' + (T.be ? '' : '(g<sub>mb</sub> is not needed: the source and the body are both at ground, so v<sub>bs</sub> = 0.)') + warn;
    n[3] = 'Now keep only what changes with the signal. V<sub>DD</sub> is a constant voltage: its signal part is zero, so it becomes a <b>short to ground</b>. The gate bias V<sub>G</sub> is also constant, so the gate connects straight to v<sub>in</sub>. (A constant current source would become an <b>open circuit</b>.) R<sub>D</sub> and the signal source stay.';
    n[4] = 'Replace the transistor by its small-signal model: a current g<sub>m</sub>v<sub>gs</sub> = ' + eng(d.gm, 'S') + ' &times; v<sub>gs</sub> from drain to source' + (T.clm ? ' in parallel with r<sub>o</sub> = ' + fmtR(d.ro) : ' (no r<sub>o</sub>: &lambda; = 0)') + (T.be ? ' and a second current source g<sub>mb</sub>v<sub>bs</sub> = ' + eng(d.gmb, 'S') + ' &times; v<sub>bs</sub>. The body is grounded and the source is lifted by R<sub>S</sub>, so v<sub>bs</sub> = &minus;v<sub>s</sub>: the source current changes the threshold and feeds back' : '') + '. The gate draws no current, so it is an open circuit that only senses v<sub>gs</sub>.';
    if (T.be) n[5] = 'Now R<sub>S</sub> carries the signal too, so the elements are no longer simply in parallel. Write KCL at the drain and at the source with v<sub>gs</sub> = v<sub>in</sub> &minus; v<sub>s</sub> and v<sub>bs</sub> = &minus;v<sub>s</sub>. ' + (T.clm ? 'Solving the two equations (including r<sub>o</sub>) gives ' : 'With r<sub>o</sub> = &infin; the result is A<sub>v</sub> = &minus;g<sub>m</sub>R<sub>D</sub> / (1 + (g<sub>m</sub> + g<sub>mb</sub>)R<sub>S</sub>) = ') + '<b>' + f2(d.av) + '</b> v<sub>in</sub>. Compare with the grounded-source case: the body effect adds g<sub>mb</sub>R<sub>S</sub> to the degeneration and lowers the gain.';
    else n[5] = 'The gate is driven directly by v<sub>in</sub> so v<sub>gs</sub> = v<sub>in</sub>. Redraw with R<sub>D</sub>, the current source' + (T.clm ? ' and r<sub>o</sub>' : '') + ' all between the output and ground. The current g<sub>m</sub>v<sub>in</sub> flows through ' + (T.clm ? 'the parallel combination R<sub>D</sub> &#8741; r<sub>o</sub> = ' + fmtR(d.rl) + ', which makes v<sub>out</sub> = &minus;g<sub>m</sub>(R<sub>D</sub> &#8741; r<sub>o</sub>)v<sub>in</sub> = <b>' : 'R<sub>D</sub> alone (r<sub>o</sub> is infinite), so v<sub>out</sub> = &minus;g<sub>m</sub>R<sub>D</sub>v<sub>in</sub> = <b>') + f2(d.av) + '</b> v<sub>in</sub>.';
    $('st-text').innerHTML = n[T.step];
  }
  function stepReadouts() {
    const d = dcSolve();
    $('st-vov').textContent = T.vg.toFixed(2) + ' V, ' + d.vov.toFixed(2) + ' V'; $('st-id').textContent = eng(d.id, 'A');
    $('st-vds').textContent = d.vds.toFixed(2) + ' V, ' + d.region; $('st-gm').textContent = eng(d.gm, 'S'); $('st-ro').textContent = fmtR(d.ro);
    $('st-av').textContent = d.av.toFixed(2); $('st-gmb').textContent = T.be ? eng(d.gmb, 'S') : '0 (v_bs = 0)';
    $('st-rs-ctl').style.display = T.be ? '' : 'none'; $('st-lam-ctl').style.display = T.clm ? '' : 'none'; $('o-st-rs').textContent = T.rs.toFixed(1) + ' kΩ';
    $('st-ro').textContent = T.clm ? fmtR(d.ro) : '∞ (λ = 0)';
    $('o-st-vdd').textContent = T.vdd.toFixed(2) + ' V'; $('o-st-rd').textContent = T.rd.toFixed(1) + ' kΩ'; $('o-st-vg').textContent = T.vg.toFixed(2) + ' V';
    $('o-st-wl').textContent = String(T.wl); $('o-st-lam').textContent = T.lam.toFixed(2) + ' V⁻¹';
  }
  const updSteps = () => { stepReadouts(); stepText(); drawSteps(); };
  for (const [id, k] of [['st-vdd', 'vdd'], ['st-rd', 'rd'], ['st-vg', 'vg'], ['st-wl', 'wl'], ['st-lam', 'lam'], ['st-rs', 'rs']]) $(id).addEventListener('input', (e) => { T[k] = parseFloat(e.target.value); updSteps(); });
  document.querySelectorAll('#st-steps button').forEach((b) => b.addEventListener('click', () => { T.step = +b.dataset.s; document.querySelectorAll('#st-steps button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); updSteps(); }));
  document.querySelectorAll('#st-clm button').forEach((b) => b.addEventListener('click', () => { const m = +b.dataset.m; T.clm = !!(m & 1); T.be = !!(m & 2); document.querySelectorAll('#st-clm button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); updSteps(); }));

  // =============== G. SPICE: click a parameter ===============
  const PAR = {
    W: ['W', 'Channel width (module 1)', 'W/L in k = µnCox·W/L, so it scales g<sub>m</sub> and the current; also the capacitances', ['gm', 'cap'], 'DEFW'],
    L: ['L', 'Channel length (module 1)', 'W/L, and the 1/L dependence of channel-length modulation', ['gm', 'ro', 'cap'], 'DEFL'],
    LD: ['LD', 'Lateral diffusion: the junctions creep under the gate (module 1), so L<sub>eff</sub> = L &minus; 2LD', 'The effective length used for k, hence g<sub>m</sub> and r<sub>o</sub>', ['gm', 'ro'], '0 m'],
    VTO: ['VTO', 'Zero-bias threshold voltage, V<sub>TH0</sub> (module 2)', 'Sets V<sub>ov</sub> = V<sub>GS</sub> &minus; V<sub>TH</sub> at the bias point, so I<sub>D</sub> and g<sub>m</sub> = 2I<sub>D</sub>/V<sub>ov</sub>', ['dc', 'gm'], '0 V'],
    KP: ['KP', 'Transconductance parameter, &mu;<sub>n</sub>C<sub>ox</sub> (module 3)', 'Directly in k = KP&middot;W/L, so g<sub>m</sub> = k V<sub>ov</sub>', ['gm'], '2E-5 A/V²'],
    GAMMA: ['GAMMA', 'Body-effect coefficient &gamma; (module 5)', 'V<sub>TH</sub> rises with V<sub>SB</sub>, and g<sub>mb</sub> = &eta;g<sub>m</sub> with &eta; = &gamma;/(2&radic;(PHI + V<sub>SB</sub>))', ['gmb', 'dc'], '0 V½'],
    PHI: ['PHI', 'Surface potential, 2&Phi;<sub>F</sub> (module 5)', 'Together with GAMMA: the body effect and g<sub>mb</sub>', ['gmb', 'dc'], '0.6 V'],
    LAMBDA: ['LAMBDA', 'Channel-length modulation &lambda; (module 5)', 'r<sub>o</sub> = 1/(&lambda;I<sub>D</sub>). With LAMBDA = 0 the resistor is infinite (the ideal model)', ['ro'], '0 V⁻¹'],
    TOX: ['TOX', 'Oxide thickness (module 1)', 'C<sub>ox</sub> = &epsilon;<sub>ox</sub>/t<sub>ox</sub>: the gate capacitances C<sub>GS</sub>, C<sub>GD</sub>, C<sub>GB</sub> (and KP, if it is not given)', ['cap', 'gm'], '∞'],
    CGSO: ['CGSO', 'Gate-source overlap capacitance per width, C<sub>ov</sub> (module 6)', 'The overlap part of C<sub>GS</sub>', ['cap'], '0 F/m'],
    CGDO: ['CGDO', 'Gate-drain overlap capacitance per width (module 6)', 'C<sub>GD</sub>: the small but important (Miller) capacitance', ['cap'], '0 F/m'],
    CJ: ['CJ', 'Zero-bias junction capacitance per area, C<sub>j0</sub> (module 6)', 'C<sub>SB</sub> and C<sub>DB</sub>, with PB and MJ for the bias dependence', ['cap'], '0 F/m²'],
    MJ: ['MJ', 'Junction grading coefficient, the exponent m (module 6)', 'How quickly C<sub>SB</sub>, C<sub>DB</sub> fall with reverse bias', ['cap'], '0.5'],
    PB: ['PB', 'Junction potential &Phi;<sub>B</sub> (module 6)', 'C<sub>SB</sub>, C<sub>DB</sub>: the bias at which the capacitance halves roughly', ['cap'], '0.8 V']
  };
  const NET = [['M1 d g s b NMOD W=', 'W', '10u L=', 'L', '0.5u\n'], ['.MODEL NMOD NMOS (LEVEL=1\n   VTO=', 'VTO', '0.7  KP=', 'KP', '120u  GAMMA=', 'GAMMA', '0.5  PHI=', 'PHI', '0.7\n   LAMBDA=', 'LAMBDA', '0.05  LD=', 'LD', '0.05u  TOX=', 'TOX', '10n\n   CGSO=', 'CGSO', '3e-10  CGDO=', 'CGDO', '3e-10\n   CJ=', 'CJ', '5e-4  MJ=', 'MJ', '0.5  PB=', 'PB', '0.8)']];
  let spSel = 'KP';
  function drawSpice() {
    const pre = $('sp-net'); pre.textContent = '';
    for (const line of NET) for (const part of line) {
      if (PAR[part] && part !== '' && /^[A-Z]+$/.test(part)) {
        const b = document.createElement('button'); b.className = 'tok'; b.type = 'button'; b.textContent = part; b.setAttribute('aria-pressed', String(part === spSel));
        b.addEventListener('click', () => { spSel = part; drawSpice(); }); pre.appendChild(b);
      } else pre.appendChild(document.createTextNode(part));
    }
    const p = PAR[spSel];
    $('sp-info').innerHTML = '<b>' + p[0] + '</b> &mdash; ' + p[1] + '.<br>Used for: ' + p[2] + '.<br><span style="color:var(--muted)">Default if omitted: ' + p[4] + '</span>';
    document.querySelectorAll('#sp-pills .pill').forEach((e) => e.classList.toggle('on', p[3].includes(e.dataset.e)));
  }


  // =============== F. FinFET ===============
  const F = { n: 3, h: 40, w: 8, p: 40, t: 0.3 };
  const cf = setupCanvas($('cv-fin'));
  function drawFin() {
    const { ctx, w, h } = cf; fillBg(cf);
    const span = (F.n - 1) * F.p + F.w, s = Math.min(8, 640 / (span + F.p), 172 / F.h);
    const x0 = (w - span * s) / 2, ySti = 262, yFin = ySti - F.h * s, yBot = 322;
    // substrate and STI
    ctx.fillStyle = C.si; ctx.fillRect(0, yBot, w, h - yBot);
    ctx.fillStyle = C.muted; ctx.globalAlpha = 0.35; ctx.fillRect(0, ySti, w, yBot - ySti); ctx.globalAlpha = 1;
    // gate wrapped around the fins
    const gl = x0 - F.p * s * 0.45, gr = x0 + span * s + F.p * s * 0.45, gt = yFin - 22;
    ctx.fillStyle = C.metal; ctx.globalAlpha = 0.55; ctx.fillRect(gl, gt, gr - gl, ySti - gt); ctx.globalAlpha = 1;
    ctx.strokeStyle = C.muted; ctx.lineWidth = 1; ctx.strokeRect(gl, gt, gr - gl, ySti - gt);
    // fins
    for (let i = 0; i < F.n; i++) {
      const fx = x0 + i * F.p * s, fw = F.w * s;
      ctx.fillStyle = C.si; ctx.fillRect(fx, yFin, fw, yBot - yFin);
      ctx.strokeStyle = C.ox; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(fx - 2, ySti); ctx.lineTo(fx - 2, yFin - 2); ctx.lineTo(fx + fw + 2, yFin - 2); ctx.lineTo(fx + fw + 2, ySti); ctx.stroke();
      ctx.strokeStyle = C.e; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(fx + 1, ySti); ctx.lineTo(fx + 1, yFin + 1); ctx.lineTo(fx + fw - 1, yFin + 1); ctx.lineTo(fx + fw - 1, ySti); ctx.stroke();
    }
    // labels and dimensions
    ctx.fillStyle = C.fg; ctx.font = '600 13px system-ui'; ctx.textAlign = 'left';
    ctx.fillText('gate (wraps top and both sidewalls)', gl + 6, gt + 14);
    ctx.fillStyle = C.muted; ctx.font = '12px system-ui'; ctx.fillText('isolation oxide', 12, ySti + 18); ctx.fillText('substrate', 12, yBot + 22);
    const arrow = (xa, ya, xb, yb, t, tx, ty, al) => { ctx.strokeStyle = C.warm; ctx.fillStyle = C.warm; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(xa, ya); ctx.lineTo(xb, yb); ctx.stroke(); ctx.font = '600 12px system-ui'; ctx.textAlign = al || 'center'; ctx.fillText(t, tx, ty); };
    arrow(x0 - 18, yFin, x0 - 18, ySti, '', 0, 0); ctx.textAlign = 'right'; ctx.fillStyle = C.warm; ctx.fillText('Hfin = ' + F.h + ' nm', x0 - 24, (yFin + ySti) / 2 + 4);
    if (F.n > 1) { const xa = x0 + F.w * s / 2, xb = xa + F.p * s, yy = yFin - 36; arrow(xa, yy, xb, yy, '', 0, 0); ctx.textAlign = 'center'; ctx.fillStyle = C.warm; ctx.fillText('pitch = ' + F.p + ' nm', (xa + xb) / 2, yy - 6); }
    ctx.textAlign = 'center'; ctx.fillStyle = C.warm; ctx.fillText('Wfin = ' + F.w + ' nm', x0 + F.w * s / 2, yBot + 24);
    ctx.strokeStyle = C.e; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(14, 18); ctx.lineTo(40, 18); ctx.stroke(); ctx.fillStyle = C.e; ctx.font = '600 13px system-ui'; ctx.textAlign = 'left'; ctx.fillText('conduction surfaces', 48, 22);
    const weff = F.n * (2 * F.h + F.w), foot = F.n * F.p;
    $('fn-weff').textContent = weff + ' nm'; $('fn-foot').textContent = foot + ' nm'; $('fn-ratio').textContent = (weff / foot).toFixed(1) + '×';
    $('fn-need').textContent = Math.ceil(1000 / (2 * F.h + F.w)) + ' fins';
    $('o-fn-n').textContent = String(F.n); $('o-fn-h').textContent = F.h + ' nm'; $('o-fn-w').textContent = F.w + ' nm'; $('o-fn-p').textContent = F.p + ' nm';
  }
  const cft = setupCanvas($('cv-fin-top')), cfs = setupCanvas($('cv-fin-step'));
  function drawFinTop() {
    const { ctx, w, h } = cft; fillBg(cft);
    const span = (F.n - 1) * F.p + F.w, sv = Math.min(5, 190 / span), y0 = (h - span * sv) / 2 + 8;
    const x0 = 70, x1 = w - 70, gx = w / 2 - 36, gw = 72, top = y0 - 16, bot = y0 + span * sv + 16;
    // contacts
    ctx.fillStyle = C.n; ctx.globalAlpha = 0.9; ctx.fillRect(x0 - 36, top - 6, 70, bot - top + 12); ctx.fillRect(x1 - 34, top - 6, 70, bot - top + 12); ctx.globalAlpha = 1;
    ctx.fillStyle = C.fg; ctx.font = '600 13px system-ui'; ctx.textAlign = 'center'; ctx.fillText('source', x0, top - 14); ctx.fillText('drain', x1, top - 14); ctx.fillText('contact', x0, bot + 26); ctx.fillText('contact', x1, bot + 26);
    // fins
    for (let i = 0; i < F.n; i++) {
      const fy = y0 + i * F.p * sv, fh = Math.max(4, F.w * sv);
      ctx.fillStyle = C.si; ctx.fillRect(x0 + 30, fy, x1 - x0 - 60, fh); ctx.strokeStyle = C.muted; ctx.lineWidth = 1; ctx.strokeRect(x0 + 30, fy, x1 - x0 - 60, fh);
    }
    // gate
    ctx.fillStyle = C.metal; ctx.globalAlpha = 0.7; ctx.fillRect(gx, top, gw, bot - top); ctx.globalAlpha = 1; ctx.strokeStyle = C.muted; ctx.strokeRect(gx, top, gw, bot - top);
    ctx.fillStyle = C.fg; ctx.fillText('gate', gx + gw / 2, top - 14);
    ctx.strokeStyle = C.e; ctx.lineWidth = 3; for (let i = 0; i < F.n; i++) { const fy = y0 + i * F.p * sv, fh = Math.max(4, F.w * sv); ctx.beginPath(); ctx.moveTo(gx, fy + fh / 2); ctx.lineTo(gx + gw, fy + fh / 2); ctx.stroke(); }
    ctx.fillStyle = C.warm; ctx.font = '600 12px system-ui';
    if (F.n > 1) { const xa = gx - 26, ya = y0 + Math.max(4, F.w * sv) / 2, yb = ya + F.p * sv; ctx.strokeStyle = C.warm; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(xa, ya); ctx.lineTo(xa, yb); ctx.stroke(); ctx.textAlign = 'right'; ctx.fillText('pitch = ' + F.p + ' nm', xa - 6, (ya + yb) / 2 + 4); }
    ctx.textAlign = 'center'; ctx.fillStyle = C.fg; ctx.font = '13px system-ui'; ctx.fillText(F.n + (F.n === 1 ? ' fin' : ' fins') + ' in parallel (current flows left to right)', w / 2, h - 10);
  }
  function drawFinStep() {
    const { ctx, w, h } = cfs; fillBg(cfs);
    const unit = (2 * F.h + F.w) / 1000, got = (t) => Math.max(1, Math.round(t / unit)) * unit;
    const fr = plotFrame(ctx, { x: 64, y: 22, w: w - 90, h: h - 62, xmin: 0, xmax: 0.8, ymin: 0, ymax: 0.85, xticks: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8], yticks: [0, 0.2, 0.4, 0.6, 0.8], fmtx: (t) => t.toFixed(1), fmty: (t) => t.toFixed(1), xlabel: 'target width (µm)', ylabel: 'width you get (µm)' });
    curve(ctx, (x) => x, fr, 0, 0.8, 2, C.muted, 1.5, [5, 4]);
    ctx.strokeStyle = C.accent; ctx.lineWidth = 3; ctx.beginPath();
    for (let x = 0; x <= 0.8001; x += 0.001) { const px = fr.X(x), py = fr.Y(got(x)); x === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); } ctx.stroke();
    dot(ctx, fr.X(F.t), fr.Y(got(F.t)), C.warm, 6); dot(ctx, fr.X(F.t), fr.Y(F.t), C.fg, 4);
    ctx.font = '13px system-ui'; ctx.textAlign = 'left'; ctx.fillStyle = C.muted; ctx.fillText('planar: any width (dashed)', fr.x + 10, fr.y + 18); ctx.fillStyle = C.accent; ctx.fillText('FinFET: whole fins only', fr.x + 10, fr.y + 36);
    const n = Math.max(1, Math.round(F.t / unit));
    $('ft-unit').textContent = (unit * 1000).toFixed(0) + ' nm'; $('ft-n').textContent = n + (n === 1 ? ' fin' : ' fins');
    $('ft-got').textContent = (got(F.t)).toFixed(3) + ' µm'; $('ft-err').textContent = ((got(F.t) / F.t - 1) * 100).toFixed(1) + ' %'; $('o-ft-w').textContent = F.t.toFixed(2) + ' µm';
  }
  const drawFinAll = () => { drawFin(); drawFinTop(); drawFinStep(); };
  $('ft-w').addEventListener('input', (e) => { F.t = parseFloat(e.target.value); drawFinStep(); });
  for (const [id, k] of [['fn-n', 'n'], ['fn-h', 'h'], ['fn-w', 'w'], ['fn-p', 'p']]) $(id).addEventListener('input', (e) => {
    F[k] = parseFloat(e.target.value);
    if (F.p < F.w + 10) { F.p = F.w + 10; $('fn-p').value = F.p; }
    drawFinAll();
  });

  // =============== animation loop (the wave only) ===============
  let vis = false;
  new IntersectionObserver((es) => es.forEach((e) => { vis = e.isIntersecting; }), { threshold: 0 }).observe(cw.ctx.canvas);
  let last = performance.now();
  (function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (window.MOSUI.anim.on && vis) { tm += dt; drawWave(); }
    requestAnimationFrame(frame);
  })(last);

  // =============== init ===============
  const init = () => {
    $('w-vov').value = W.vov; $('w-amp').value = W.amp;
    for (const [id, k] of [['ss-vov', 'vov'], ['ss-wl', 'wl'], ['ss-lam', 'lam'], ['ss-vsb', 'vsb'], ['ss-dv', 'dv']]) $(id).value = M[k];
    $('ss-pv').value = P.v; $('ss-mr').value = Q.mr; $('ss-lr').value = Q.lr;
    for (const [id, k] of [['st-vdd', 'vdd'], ['st-rd', 'rd'], ['st-vg', 'vg'], ['st-wl', 'wl'], ['st-lam', 'lam'], ['st-rs', 'rs']]) $(id).value = T[k];
    $('ft-w').value = F.t;
    for (const [id, k] of [['fn-n', 'n'], ['fn-h', 'h'], ['fn-w', 'w'], ['fn-p', 'p']]) $(id).value = F[k];
    updWave(); updModel(); drawNP(); drawVariants(); updSteps(); drawSpice(); drawFinAll();
  };
  onTheme(init);
  readTheme(); init();
})();
