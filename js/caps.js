// Module 6: MOS device capacitances.
(() => {
  'use strict';
  const { $, readTheme, setupCanvas, niceStep, plotFrame, curve, dot, onTheme, roundRect, C } = window.MOSUI;
  if (!$('cv-cap-xs')) return;
  const fillBg = (c) => { c.ctx.fillStyle = C.card; c.ctx.fillRect(0, 0, c.w, c.h); };
  const fF = (v, d = 2) => v.toFixed(d) + ' fF';

  // ============ cross-section with C1..C6 ============
  const INFO = {
    c1: ['C1 : gate to channel', 'The oxide capacitor, C₁ = W·L·C<sub>ox</sub>. It exists only when a channel is there to be the bottom plate, so it appears in C<sub>GS</sub> and C<sub>GD</sub> (strong inversion) and not in the off state.'],
    c2: ['C2 : channel to substrate (depletion)', 'The depletion region under the channel, C₂ = W·L·√(qε<sub>si</sub> N<sub>sub</sub> / (4Φ<sub>F</sub>)). It sits in series with the gate oxide when the channel is absent; this is where C<sub>GB</sub> comes from in the off state.'],
    c3: ['C3 : gate–source overlap', 'The gate overhangs the source diffusion by the lateral diffusion L<sub>D</sub>, giving C₃ = W·C<sub>ov</sub> with C<sub>ov</sub> per unit width. It does not depend on bias.'],
    c4: ['C4 : gate–drain overlap', 'Same idea on the drain side: C₄ = W·C<sub>ov</sub>. In saturation this is essentially all of C<sub>GD</sub>, and it is multiplied by the Miller effect.'],
    c5: ['C5 : source–body junction', 'A reverse-biased pn junction: C<sub>j</sub> = C<sub>j0</sub> / (1 + V<sub>R</sub>/Φ<sub>B</sub>)^m with m ≈ 0.3 to 0.4, for the bottom area plus a sidewall term. It is the C<sub>SB</sub> of the model.'],
    c6: ['C6 : drain–body junction', 'The same junction capacitance on the drain side, C<sub>DB</sub>. It loads the output node of every stage and decreases as the reverse bias grows.']
  };
  const cx = setupCanvas($('cv-cap-xs'));
  let selC = 'c1';
  const HIT = {};
  function drawXs() {
    const { ctx, w, h } = cx; fillBg(cx);
    const on = (k) => selC === k;
    const col = C.warm;
    const bodyY = 200, floor = 350;
    // substrate
    ctx.fillStyle = C.si; roundRect(ctx, 60, bodyY, w - 120, floor - bodyY, 6); ctx.fill();
    // depletion (C2)
    ctx.fillStyle = on('c2') ? col : C.dep; ctx.globalAlpha = on('c2') ? 0.55 : 0.35;
    ctx.beginPath(); ctx.moveTo(290, 214); ctx.lineTo(470, 214); ctx.lineTo(470, 280); ctx.quadraticCurveTo(380, 300, 290, 280); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    // n+ regions
    const n = (x0, x1, key, ja) => {
      ctx.fillStyle = C.n; ctx.fillRect(x0, 200, x1 - x0, 62);
      if (on(key)) { ctx.globalAlpha = .6; ctx.fillStyle = col; ctx.fillRect(x0, 200, x1 - x0, 62); ctx.globalAlpha = 1; }
    };
    n(120, 300, 'c5'); n(460, 640, 'c6');
    ctx.fillStyle = C.fg; ctx.font = '13px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('n+ source', 205, 236); ctx.fillText('n+ drain', 550, 236);
    // channel line
    ctx.strokeStyle = on('c1') ? col : C.e; ctx.lineWidth = on('c1') ? 4 : 2; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(300, 206); ctx.lineTo(460, 206); ctx.stroke(); ctx.setLineDash([]);
    // oxide
    ctx.fillStyle = on('c1') ? col : C.ox; ctx.globalAlpha = on('c1') ? .7 : 1;
    ctx.fillRect(270, 176, 220, 24); ctx.globalAlpha = 1;
    ctx.fillStyle = C.fg; ctx.font = '12px system-ui'; ctx.fillText('oxide', 380, 192);
    // overlap
    for (const [x0, x1, key] of [[270, 300, 'c3'], [460, 490, 'c4']]) {
      ctx.fillStyle = on(key) ? col : 'transparent'; ctx.globalAlpha = .75;
      if (on(key)) ctx.fillRect(x0, 176, x1 - x0, 44);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = C.muted; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.strokeRect(x0, 176, x1 - x0, 44); ctx.setLineDash([]);
    }
    // gate
    ctx.fillStyle = C.metal; ctx.fillRect(270, 140, 220, 36);
    ctx.fillStyle = '#fff'; ctx.font = '600 13px system-ui'; ctx.fillText('gate (poly)', 380, 163);
    // terminals
    ctx.fillStyle = C.fg; ctx.font = '600 14px system-ui';
    ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5;
    const term = (x, y0, y1, t) => { ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke(); ctx.fillText(t, x, y0 - 6); };
    term(380, 140, 100, 'G'); term(170, 200, 120, 'S'); term(590, 200, 120, 'D'); term(380, floor, floor + 22, 'B');
    ctx.textAlign = 'center';
    // junction outlines (for c5/c6 emphasis)
    // badges
    const badge = (key, x, y, label) => {
      HIT[key] = { x, y, r: 15 };
      ctx.beginPath(); ctx.arc(x, y, 15, 0, 7);
      ctx.fillStyle = on(key) ? col : C.card; ctx.fill();
      ctx.strokeStyle = on(key) ? col : C.muted; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = on(key) ? '#1a0f08' : C.fg; ctx.font = '600 12px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(label, x, y + 4);
    };
    badge('c1', 380, 208, 'C1'); badge('c2', 380, 250, 'C2');
    badge('c3', 262, 166, 'C3'); badge('c4', 498, 166, 'C4');
    badge('c5', 205, 280, 'C5'); badge('c6', 555, 280, 'C6');
    ctx.fillStyle = C.muted; ctx.font = '12px system-ui'; ctx.fillText('p-type substrate', 200, floor - 8);
  }
  function selectCap(k) {
    selC = k;
    document.querySelectorAll('#cap-chips button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.c === k)));
    $('cap-info').innerHTML = '<b>' + INFO[k][0] + '</b><br>' + INFO[k][1];
    drawXs();
  }
  document.querySelectorAll('#cap-chips button').forEach((b) => b.addEventListener('click', () => selectCap(b.dataset.c)));
  $('cv-cap-xs').addEventListener('click', (e) => {
    const r = e.target.getBoundingClientRect(), sx = 760 / r.width, sy = 380 / r.height;
    const x = (e.clientX - r.left) * sx, y = (e.clientY - r.top) * sy;
    for (const k in HIT) if (Math.hypot(x - HIT[k].x, y - HIT[k].y) <= HIT[k].r + 4) { selectCap(k); return; }
  });


  // ============ circuit schematic ============
  const csch = setupCanvas($('cv-cap-sch'));
  function drawSch() {
    const { ctx, w, h } = csch; fillBg(csch); ctx.save(); ctx.translate(0, 34);
    const c = caps(Q.vgs), csb = jTot(0), cdb = jTot(Q.vd);
    const vals = { gs: c.gs, gd: c.gd, gb: c.gb, sb: csb, db: cdb };
    const mx = Math.max(c.gs, c.gd, c.gb, csb, cdb, 0.01);
    const G = [120, 200], Dx = 400, Bx = 660;
    ctx.lineWidth = 2; ctx.strokeStyle = C.fg; ctx.lineCap = 'round';
    const L = (pts) => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); };
    // transistor symbol
    L([[G[0], 200], [270, 200]]); L([[270, 150], [270, 250]]);
    L([[290, 150], [290, 172]]); L([[290, 188], [290, 212]]); L([[290, 228], [290, 250]]);
    L([[290, 160], [Dx, 160], [Dx, 62]]); L([[290, 240], [Dx, 240], [Dx, 350]]);
    L([[290, 200], [Bx, 200]]);
    ctx.fillStyle = C.fg; ctx.beginPath(); ctx.moveTo(292, 200); ctx.lineTo(306, 194); ctx.lineTo(306, 206); ctx.fill();   // body arrow into the channel (NMOS)
    // bus at the body
    L([[Bx, 80], [Bx, 330]]);
    // capacitor routes
    const cap = (pts, cx, cy, horizontal, col, name, v) => {
      ctx.strokeStyle = C.muted; ctx.lineWidth = 2;
      // draw route with a gap at the capacitor
      const g = 7;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const on = horizontal ? (a[1] === cy && b[1] === cy && Math.min(a[0], b[0]) < cx && Math.max(a[0], b[0]) > cx) : false;
        if (on) { L([a, [cx - g, cy]]); L([[cx + g, cy], b]); }
        else L([a, b]);
      }
      const pl = 9 + 20 * v / mx;
      ctx.strokeStyle = col; ctx.lineWidth = 4;
      L([[cx - g, cy - pl], [cx - g, cy + pl]]); L([[cx + g, cy - pl], [cx + g, cy + pl]]);
      ctx.fillStyle = col; ctx.font = '600 13px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(name, cx, cy - pl - 18); ctx.font = '12px system-ui'; ctx.fillStyle = C.fg; ctx.fillText(v.toFixed(2) + ' fF', cx, cy - pl - 4);
    };
    const dotAt = (x, y) => { ctx.fillStyle = C.fg; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 7); ctx.fill(); };
    cap([[G[0], 200], [G[0], 110], [Dx, 110]], 250, 110, true, C.warm, 'CGD', vals.gd);
    cap([[G[0], 200], [G[0], 290], [Dx, 290]], 250, 290, true, C.accent, 'CGS', vals.gs);
    cap([[G[0], 200], [G[0], 28], [Bx, 28], [Bx, 80]], 480, 28, true, C.e, 'CGB', vals.gb);
    cap([[Dx, 80], [Bx, 80]], 530, 80, true, C.muted, 'CDB', vals.db);
    cap([[Dx, 330], [Bx, 330]], 530, 330, true, C.muted, 'CSB', vals.sb);
    for (const [x, y] of [[G[0], 200], [Dx, 110], [Dx, 80], [Dx, 290], [Dx, 330], [Bx, 80], [Bx, 330], [Bx, 200]]) dotAt(x, y);
    // terminal labels
    ctx.fillStyle = C.fg; ctx.font = '700 15px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('G', G[0] - 16, 205); ctx.fillText('D', Dx, 50); ctx.fillText('S', Dx, 372); ctx.fillText('B', Bx + 16, 205);
    ctx.font = '12px system-ui'; ctx.fillStyle = C.muted; ctx.textAlign = 'left';
    ctx.fillText('NMOS', 300, 276);
    ctx.textAlign = 'center';
    ctx.fillText('VGS = ' + Q.vgs.toFixed(2) + ' V,  VD = ' + Q.vd.toFixed(2) + ' V', 150, 376);
    ctx.restore();
  }

  // ============ capacitances vs V_GS ============
  const Q = { W: 1, L: 60, tox: 1.5, cov: 0.3, vth: 0.4, vd: 1.0, vgs: 1.2 };
  const cb = setupCanvas($('cv-cap-bias'));
  const CD = 3.0;  // depletion capacitance, fF/um^2 (N ~ 1e18 cm^-3)
  const smooth = (x, x0, w) => { const t = Math.min(1, Math.max(0, (x - x0) / w + 0.5)); return t * t * (3 - 2 * t); };
  function caps(vgs) {
    const cox = 34.53 / Q.tox;                    // fF/um^2
    const wlc = Q.W * (Q.L / 1000) * cox;         // fF
    const cw = Q.cov * Q.W;
    const cgbOff = wlc * CD * Q.W * (Q.L / 1000) / (wlc + CD * Q.W * (Q.L / 1000));
    const a = smooth(vgs, Q.vth, 0.06), b = smooth(vgs, Q.vd + Q.vth, 0.06);
    const gs = (1 - a) * cw + a * ((1 - b) * (2 / 3 * wlc + cw) + b * (wlc / 2 + cw));
    const gd = (1 - a) * cw + a * ((1 - b) * cw + b * (wlc / 2 + cw));
    const gb = (1 - a) * cgbOff;
    return { gs, gd, gb, wlc, cw, cgbOff };
  }
  function drawBias() {
    const { ctx, w, h } = cb; fillBg(cb);
    const k = caps(0), top = (k.wlc + k.cw) * 1.0;
    const st = niceStep(top / 4), ymax = Math.ceil(top * 1.05 / st) * st;
    const fr = plotFrame(ctx, {
      x: 70, y: 38, w: w - 92, h: h - 78, xmin: 0, xmax: 1.8, ymin: 0, ymax,
      xticks: [0, .3, .6, .9, 1.2, 1.5, 1.8], yticks: Array.from({ length: Math.round(ymax / st) + 1 }, (_, i) => +(i * st).toFixed(4)),
      fmtx: (t) => t.toFixed(1), fmty: (t) => t.toFixed(+st < 1 ? 1 : 0), xlabel: 'VGS (V)', ylabel: 'capacitance (fF)'
    });
    // regime bands
    const x1 = fr.X(Q.vth), x2 = fr.X(Math.min(1.8, Q.vd + Q.vth));
    ctx.save(); ctx.globalAlpha = .08;
    ctx.fillStyle = C.muted; ctx.fillRect(fr.x, fr.y, x1 - fr.x, fr.h);
    ctx.fillStyle = C.accent; ctx.fillRect(x1, fr.y, Math.max(0, x2 - x1), fr.h);
    ctx.fillStyle = C.warm; ctx.fillRect(x2, fr.y, fr.x + fr.w - x2, fr.h);
    ctx.restore();
    ctx.font = '12px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = C.muted;
    ctx.fillText('off', (fr.x + x1) / 2, fr.y - 8);
    if (x2 - x1 > 50) ctx.fillText('saturation', (x1 + x2) / 2, fr.y - 8);
    if (fr.x + fr.w - x2 > 50) ctx.fillText('triode', (x2 + fr.x + fr.w) / 2, fr.y - 8);
    curve(ctx, (v) => caps(v).gs, fr, 0, 1.8, 240, C.accent, 2.8);
    curve(ctx, (v) => caps(v).gd, fr, 0, 1.8, 240, C.warm, 2.8);
    curve(ctx, (v) => caps(v).gb, fr, 0, 1.8, 240, C.e, 2.2, [6, 4]);
    const c = caps(Q.vgs);
    dot(ctx, fr.X(Q.vgs), fr.Y(c.gs), C.accent, 5); dot(ctx, fr.X(Q.vgs), fr.Y(c.gd), C.warm, 5); dot(ctx, fr.X(Q.vgs), fr.Y(c.gb), C.e, 5);
    ctx.font = '13px system-ui'; ctx.textAlign = 'left';
    ctx.fillStyle = C.accent; ctx.fillText('CGS', fr.x + fr.w - 150, fr.y + 18);
    ctx.fillStyle = C.warm; ctx.fillText('CGD', fr.x + fr.w - 100, fr.y + 18);
    ctx.fillStyle = C.e; ctx.fillText('CGB', fr.x + fr.w - 52, fr.y + 18);
  }
  function biasReadouts() {
    const c = caps(Q.vgs);
    $('k-gs').textContent = fF(c.gs, 3); $('k-gd').textContent = fF(c.gd, 3); $('k-gb').textContent = fF(c.gb, 3);
    $('k-sum').textContent = fF(c.gs + c.gd + c.gb, 3);
    $('k-wlc').textContent = fF(c.wlc, 3); $('k-cw').textContent = fF(c.cw, 3);
    const reg = Q.vgs < Q.vth ? 'cutoff' : (Q.vgs < Q.vd + Q.vth ? 'saturation' : 'triode');
    const bd = $('k-region'); bd.className = 'badge ' + reg; bd.textContent = reg === 'cutoff' ? 'Off' : reg === 'saturation' ? 'Saturation' : 'Triode';
    $('k-cox').textContent = (34.53 / Q.tox).toFixed(1) + ' fF/µm²';
    const out = { 'o-k-w': Q.W.toFixed(1) + ' µm', 'o-k-l': Q.L + ' nm', 'o-k-tox': Q.tox.toFixed(1) + ' nm', 'o-k-cov': Q.cov.toFixed(2) + ' fF/µm',
      'o-k-vth': Q.vth.toFixed(2) + ' V', 'o-k-vd': Q.vd.toFixed(2) + ' V', 'o-k-vgs': Q.vgs.toFixed(2) + ' V' };
    for (const id in out) $(id).textContent = out[id];
    // Miller
    const sat = caps(Q.vth + 0.01 + 0.0), cgd = Q.cov * Q.W, cgs = 2 / 3 * c.wlc + cgd;
    const av = A.av;
    $('m-cgd').textContent = fF(cgd, 3);
    $('m-cin0').textContent = fF(cgs + cgd, 3);
    $('m-cin').textContent = fF(cgs + cgd * (1 + av), 3);
    $('m-ratio').textContent = ((cgs + cgd * (1 + av)) / (cgs + cgd)).toFixed(2) + '×';
    $('o-m-av').textContent = '−' + av.toFixed(0);
  }
  const A = { av: 5 };
  const qmap = { 'k-w': 'W', 'k-l': 'L', 'k-tox': 'tox', 'k-covs': 'cov', 'k-vth': 'vth', 'k-vd': 'vd', 'k-vgs': 'vgs' };
  function updBias() { biasReadouts(); drawBias(); drawSch(); }
  for (const id in qmap) $(id).addEventListener('input', (e) => { Q[qmap[id]] = parseFloat(e.target.value); updBias(); });
  $('m-av').addEventListener('input', (e) => { A.av = parseFloat(e.target.value); biasReadouts(); });
  document.querySelectorAll('#k-presets button').forEach((b) => b.addEventListener('click', () => {
    const p = b.dataset.p;
    if (p === 'off') Q.vgs = 0.1;
    if (p === 'sat') { Q.vgs = 0.9; Q.vd = 1.2; }
    if (p === 'tri') { Q.vgs = 1.7; Q.vd = 0.3; }
    for (const id in qmap) $(id).value = Q[qmap[id]];
    updBias();
  }));

  // ============ junction capacitance ============
  const J = { m: 0.4, pb: 0.8, vr: 1.0, e: 0.3 };
  const cj = setupCanvas($('cv-cap-junc'));
  const CJ0 = 1.0, CJSW0 = 0.2;                   // fF/um^2, fF/um
  const jf = (vr) => Math.pow(1 + vr / J.pb, -J.m);
  const jTot = (vr) => (Q.W * J.e * CJ0 + (Q.W + 2 * J.e) * CJSW0) * jf(vr);
  function drawJunc() {
    const { ctx, w, h } = cj; fillBg(cj);
    const top = jTot(0), st = niceStep(top / 4), ymax = Math.ceil(top * 1.05 / st) * st;
    const fr = plotFrame(ctx, {
      x: 70, y: 22, w: w - 92, h: h - 62, xmin: 0, xmax: 3, ymin: 0, ymax,
      xticks: [0, .5, 1, 1.5, 2, 2.5, 3], yticks: Array.from({ length: Math.round(ymax / st) + 1 }, (_, i) => +(i * st).toFixed(4)),
      fmtx: (t) => t.toFixed(1), fmty: (t) => t.toFixed(+st < 1 ? 2 : 1), xlabel: 'reverse bias VR (V)', ylabel: 'CSB or CDB (fF)'
    });
    curve(ctx, jTot, fr, 0, 3, 120, C.accent, 2.8);
    dot(ctx, fr.X(J.vr), fr.Y(jTot(J.vr)), C.warm, 6);
    ctx.font = '13px system-ui'; ctx.textAlign = 'left'; ctx.fillStyle = C.accent;
    ctx.fillText('C = Cj0 / (1 + VR/ΦB)^m  (area + sidewall)', fr.x + 12, fr.y + 18);
  }
  function juncReadouts() {
    const area = Q.W * J.e, per = Q.W + 2 * J.e;
    $('j-area').textContent = area.toFixed(2) + ' µm²';
    $('j-per').textContent = per.toFixed(2) + ' µm';
    $('j-c').textContent = fF(jTot(J.vr), 3);
    $('j-c0').textContent = fF(jTot(0), 3);
    $('j-ratio').textContent = (jf(J.vr) * 100).toFixed(0) + ' % of zero-bias value';
    const out = { 'o-j-m': J.m.toFixed(2), 'o-j-pb': J.pb.toFixed(2) + ' V', 'o-j-vr': J.vr.toFixed(2) + ' V', 'o-j-e': J.e.toFixed(2) + ' µm' };
    for (const id in out) $(id).textContent = out[id];
  }
  const jmap = { 'j-m': 'm', 'j-pb': 'pb', 'j-vr': 'vr', 'j-e': 'e' };
  function updJ() { juncReadouts(); drawJunc(); }
  for (const id in jmap) $(id).addEventListener('input', (e) => { J[jmap[id]] = parseFloat(e.target.value); updJ(); });
  // junction depends on W from the bias card: refresh when it changes
  $('k-w').addEventListener('input', updJ);


  // ============ which capacitances can be ignored ============
  const K = (t, why) => ({ v: 'keep', t, why }), I = (t, why) => ({ v: 'ignore', t, why }), W = (t, why) => ({ v: 'care', t, why });
  const CAPN = [['C<sub>GS</sub>', 'gate to source'], ['C<sub>GD</sub>', 'gate to drain'], ['C<sub>GB</sub>', 'gate to body'], ['C<sub>SB</sub>', 'source to body'], ['C<sub>DB</sub>', 'drain to body']];
  const TOPO = {
    cs: { sit: 'Input on the gate, output at the drain, source and body at AC ground. A gain stage, so every capacitor sees a real signal.', rows: [
      K('Keep', 'It sits between the input and AC ground, so it loads the driving source.'),
      W('Keep, and multiply', 'It joins the input to the inverted output, so the Miller effect makes it look like (1 + A<sub>v</sub>)C<sub>GD</sub> at the input. Usually the dominant capacitor.'),
      I('Ignore', 'With the channel on it is shielded from the bulk, and it goes to ground anyway.'),
      I('Ignore', 'The source and body are both AC ground, so there is no AC voltage across it: it is shorted out.'),
      W('Keep (or absorb)', 'It hangs on the output node and adds to the load. If the load capacitance is much larger, it disappears into it.')] },
    sf: { sit: 'Input on the gate, output at the source, drain tied to V<sub>DD</sub> (an AC ground), body at ground. Gain is about 1, so the output follows the input.', rows: [
      W('Keep, but small', 'The source follows the gate, so the voltage across C<sub>GS</sub> barely changes: it looks like (1 &minus; A<sub>v</sub>)C<sub>GS</sub> &approx; 0.1 to 0.3 C<sub>GS</sub> at the input (bootstrapping).'),
      K('Keep, small', 'The drain is at AC ground, so it is a plain capacitor from the input to ground. No Miller multiplication, and it is only the overlap.'),
      I('Ignore', 'Shielded by the channel, as before.'),
      K('Keep', 'The source is the output node and the body is at ground, so C<sub>SB</sub> loads the output. It also changes with V<sub>SB</sub> (module 5).'),
      I('Ignore', 'The drain is at V<sub>DD</sub> (AC ground) and the body is grounded, so both plates are at AC ground: shorted out.')] },
    off: { sit: 'The transistor is cut off, used as a switch (sample-and-hold, a digital pass gate). There is no channel, and the signal is not amplified.', rows: [
      K('Keep (overlap only)', 'Only the overlap W&middot;C<sub>ov</sub> is left. It is the path for clock feedthrough and charge injection into the switched node.'),
      K('Keep (overlap only)', 'Same as C<sub>GS</sub>. It couples the gate edge into the other terminal when the clock changes.'),
      W('Keep, but tiny', 'Without a channel it is the oxide in series with the depletion capacitance, the one time it exists. Usually small next to the overlaps.'),
      K('Keep', 'Junction capacitors load the stored node whatever the gate does. They also leak charge.'),
      K('Keep', 'Same as C<sub>SB</sub>.')] },
    lf: { sit: 'Signals slow enough that every capacitor has a huge impedance 1/(&omega;C) compared with the resistances around it, or plain DC bias analysis.', rows: [
      I('Ignore', 'At low frequency a capacitor is an open circuit: no current flows through it.'),
      I('Ignore', 'Same: the Miller multiplication does not matter when each capacitor is already open.'),
      I('Ignore', 'Same.'),
      I('Ignore', 'Same.'),
      I('Ignore', 'Same. Rule: capacitors start to matter around f &approx; 1/(2&pi;RC) for the R they sit next to.')] }
  };
  function drawIgn(t) {
    const T = TOPO[t];
    $('ign-sit').innerHTML = T.sit;
    $('ign-body').innerHTML = T.rows.map((r, i) => '<tr><td>' + CAPN[i][0] + '</td><td>' + CAPN[i][1] + '</td><td><span class="tag-' + (r.v === 'keep' ? 'keep' : r.v === 'ignore' ? 'ignore' : 'care') + '">' + r.t + '</span></td><td>' + r.why + '</td></tr>').join('');
    document.querySelectorAll('#cap-topo button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.t === t)));
  }
  document.querySelectorAll('#cap-topo button').forEach((b) => b.addEventListener('click', () => drawIgn(b.dataset.t)));
  drawIgn('cs');

  onTheme(() => { drawXs(); updBias(); updJ(); });
  readTheme();
  for (const id in qmap) $(id).value = Q[qmap[id]];
  for (const id in jmap) $(id).value = J[jmap[id]];
  $('m-av').value = A.av;
  selectCap('c1'); updBias(); updJ();
})();
