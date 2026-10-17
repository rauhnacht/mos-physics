// Module 2: threshold voltage - accumulation, depletion, inversion (MOS capacitor view)
(() => {
  'use strict';
  const { $, C, readTheme, setupCanvas, subText, niceStep, roundRect, fmtV, reduceMotion } = MOSUI;
  if (!$('cv-mos')) return;
  const A = setupCanvas($('cv-mos'));
  const B = setupCanvas($('cv-band'));
  const P = setupCanvas($('cv-psi'));

  // constants (300 K, silicon, SiO2)
  const Q = 1.602e-19, EPS_SI = 11.8 * 8.854e-14, EPS_OX = 3.9 * 8.854e-14;
  const NI = 1.0e10, PHT = 0.02585, EG = 1.12, CHI = 3.1;

  // v is the gate drive in "NMOS-equivalent" volts; a PMOS shows the mirror image
  const T = { type: 'nmos', v: 0.8, vsb: 0, logN: 18, tox: 3, imp: 0 };

  function model() {
    const N = Math.pow(10, T.logN);
    const cox = EPS_OX / (T.tox * 1e-7);                      // F/cm^2
    const phiF = PHT * Math.log(N / NI);
    const gam = Math.sqrt(2 * Q * EPS_SI * N) / cox;          // V^(1/2)
    const dImp = Q * T.imp * 1e12 / cox;                      // V
    const vfb = -(EG / 2 + phiF) + dImp;
    const psiTh = 2 * phiF + T.vsb;
    const vth = vfb + psiTh + gam * Math.sqrt(psiTh);
    const v = T.v;
    let psi;
    if (v >= vth) psi = psiTh;
    else if (v > vfb) { const s = (-gam + Math.sqrt(gam * gam + 4 * (v - vfb))) / 2; psi = s * s; }
    else psi = -PHT * Math.log(1 + (vfb - v) / (2 * PHT));    // sketch of weak band bending in accumulation
    const wd = psi > 0 ? Math.sqrt(2 * EPS_SI * psi / (Q * N)) * 1e7 : 0;        // nm
    const wdMax = Math.sqrt(2 * EPS_SI * psiTh / (Q * N)) * 1e7;
    const wdRef = Math.sqrt(2 * EPS_SI * (2 * phiF + 1.5) / (Q * N)) * 1e7;
    const qdep = Q * N * wd * 1e-7;                           // C/cm^2
    const qinv = v > vth ? cox * (v - vth) : 0;
    const qacc = v < vfb ? cox * (vfb - v) : 0;
    const vox = v - vfb - psi;
    const cdep = wd > 0 ? EPS_SI / (wd * 1e-7) : Infinity;
    let state;
    if (Math.abs(v - vfb) <= 0.01) state = 'flat band';
    else if (v < vfb) state = 'accumulation';
    else if (v >= vth) state = 'strong inversion';
    else state = psi < phiF ? 'depletion' : 'weak inversion';
    return { N, cox, phiF, gam, dImp, vfb, psiTh, vth, psi, wd, wdMax, wdRef, qdep, qinv, qacc, vox, cdep, state, v };
  }

  // ======================= MOS cross-section (animated) =======================
  const XS = 200, XD = 560, LP = XD - XS, YS = 84;
  const rnd = Array.from({ length: 70 }, (_, i) => ({ x: (i * 0.618034) % 1, y: (i * 0.381966 + 0.13) % 1, ph: i * 1.7 }));

  function drawMos(t) {
    const { ctx, w, h } = A;
    const m = model();
    const nT = T.type === 'nmos', sg = nT ? 1 : -1;
    const majC = nT ? C.hole : C.e, minC = nT ? C.e : C.hole;
    const sc = 170 / m.wdRef;
    ctx.clearRect(0, 0, w, h);

    // substrate + doping tint
    ctx.fillStyle = C.si; ctx.fillRect(30, YS, 700, 240);
    if (!nT) { ctx.globalAlpha = 0.3; ctx.fillStyle = C.n; ctx.fillRect(30, YS, 700, 240); ctx.globalAlpha = 1; }
    ctx.fillStyle = C.muted; ctx.font = '13px system-ui, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(nT ? 'p-type substrate (neutral bulk)' : 'n-well (the PMOS body), built inside the chip’s p-substrate', 40, YS + 228);

    // depletion region
    const d = Math.min(m.wd * sc, 205);
    if (d > 0.5) {
      ctx.globalAlpha = 0.45; ctx.fillStyle = C.dep;
      ctx.beginPath(); ctx.moveTo(XS - 10, YS);
      ctx.lineTo(XS - 10, YS + Math.max(0, d - 8)); ctx.quadraticCurveTo(XS - 10, YS + d, XS + 2, YS + d);
      ctx.lineTo(XD - 2, YS + d); ctx.quadraticCurveTo(XD + 10, YS + d, XD + 10, YS + Math.max(0, d - 8));
      ctx.lineTo(XD + 10, YS); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 0.85;
      ctx.fillStyle = C.fg; ctx.font = '13px system-ui, sans-serif'; ctx.textAlign = 'center';
      for (let gx = XS + 16; gx < XD - 8; gx += 26) for (let gy = YS + 22; gy < YS + d - 8; gy += 20) ctx.fillText(nT ? '−' : '+', gx, gy + 4);
      ctx.globalAlpha = 1;
    }

    // source/drain diffusions
    ctx.fillStyle = nT ? C.n : C.hole; ctx.globalAlpha = nT ? 1 : 0.55;
    ctx.fillRect(80, YS, 120, 46); ctx.fillRect(560, YS, 130, 46); ctx.globalAlpha = 1;
    ctx.fillStyle = C.fg; ctx.font = '600 13px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(nT ? 'n+' : 'p+', 140, YS + 30); ctx.fillText(nT ? 'n+' : 'p+', 625, YS + 30);
    ctx.fillStyle = nT ? C.hole : C.n; ctx.globalAlpha = nT ? 0.55 : 1; ctx.fillRect(36, YS, 36, 26); ctx.globalAlpha = 1;
    ctx.fillStyle = C.fg; ctx.fillText(nT ? 'p+' : 'n+', 54, YS + 18);

    // oxide + gate
    ctx.fillStyle = C.ox; ctx.fillRect(XS, YS - 12, LP, 12);
    ctx.fillStyle = C.metal; ctx.fillRect(XS, YS - 48, LP, 36);
    ctx.fillStyle = C.fg; ctx.font = '13px system-ui, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('Gate (n+ poly)', XS + 8, YS - 27);
    ctx.fillStyle = C.muted; ctx.font = '11px system-ui, sans-serif'; ctx.fillText('SiO₂', XD + 8, YS - 4);

    // gate charge (sign follows the gate polarity)
    const nG = Math.min(16, Math.round(Math.abs(m.vox) / 1.2 * 16));
    if (nG > 0) {
      const ch = (m.vox * sg > 0) ? '+' : '−';
      ctx.fillStyle = C.fg; ctx.font = '700 15px system-ui, sans-serif'; ctx.textAlign = 'center';
      for (let i = 0; i < nG; i++) ctx.fillText(ch, XS + 20 + i * (LP - 40) / Math.max(1, nG - 1), YS - 15);
    }

    // inversion layer band (strong inversion) + carriers
    const tt = MOSUI.anim.on ? t / 1000 : 0;
    const strong = m.v >= m.vth;
    if (strong) {
      const th = 3 + 11 * Math.min(1, (m.v - m.vth) / 1.2);
      ctx.globalAlpha = 0.8; ctx.fillStyle = minC; ctx.fillRect(XS - 10, YS, LP + 20, th); ctx.globalAlpha = 1;
    }
    const car = MOSUI.carrier, sgn = nT ? '−' : '+';
    const speed = Math.min(1, Math.max(0, (m.v - m.vth) / 1.2));
    // resting mobile carriers inside the source and drain diffusions (they jiggle thermally)
    for (let i = 0; i < 26; i++) {
      const r = rnd[(i * 3) % rnd.length], left = i % 2 === 0;
      const x0 = left ? 86 : 566, wd = left ? 108 : 118;
      const jx = Math.sin(tt * 3 + r.ph) * 2.2, jy = Math.cos(tt * 2.4 + r.ph * 1.3) * 2.2;
      car(ctx, x0 + r.x * wd + jx, YS + 6 + r.y * 34 + jy, minC, { r: 2.3, alpha: 0.75, sign: sgn });
    }
    if (strong) {
      const n = Math.round(16 + 30 * speed), th = 3 + 11 * speed, spd = 0.05 + 0.11 * speed;
      const X0 = 90, X1 = 680;
      for (let i = 0; i < n; i++) {
        const r = rnd[i % rnd.length];
        const x = X0 + ((i / n + tt * spd) % 1) * (X1 - X0);
        let y = YS + 2 + r.y * Math.max(1, th - 4);
        const yBulk = YS + 6 + r.y * 34;
        let b = 0;
        if (x < XS) b = Math.min(1, (XS - x) / 30); else if (x > XD) b = Math.min(1, (x - XD) / 30);
        y = y * (1 - b) + yBulk * b + Math.sin(tt * 5 + r.ph) * 0.8;
        car(ctx, x, y, minC, { r: 2.7, trail: 12 + 20 * speed, sign: sgn });
      }
      // drift arrow
      ctx.strokeStyle = minC; ctx.fillStyle = minC; ctx.lineWidth = 2; ctx.globalAlpha = 0.9;
      const ay = YS + 70;
      ctx.beginPath(); ctx.moveTo(XS + 40, ay); ctx.lineTo(XD - 46, ay); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(XD - 40, ay); ctx.lineTo(XD - 52, ay - 6); ctx.lineTo(XD - 52, ay + 6); ctx.fill();
      ctx.globalAlpha = 1; ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'center';
      const lt = (nT ? 'electrons' : 'holes') + ' drift source to drain (small VDS)', lw = ctx.measureText(lt).width + 14;
      ctx.fillStyle = C.card; ctx.globalAlpha = 0.88; ctx.fillRect((XS + XD) / 2 - lw / 2, ay + 5, lw, 20); ctx.globalAlpha = 1;
      ctx.fillStyle = minC; ctx.fillText(lt, (XS + XD) / 2, ay + 19);
    } else if (m.state === 'weak inversion') {
      const n = Math.round(Math.min(10, 24 * Math.exp((m.psi - m.psiTh) / 0.07)));
      for (let i = 0; i < n; i++) {
        const r = rnd[i % rnd.length];
        car(ctx, XS + ((i / Math.max(n, 1) + tt * 0.03) % 1) * LP + Math.sin(tt * 4 + r.ph) * 3, YS + 4 + Math.cos(tt * 3 + r.ph) * 1.5, minC, { r: 2.3, sign: sgn });
      }
    }
    if (m.v < m.vfb) {
      const n = Math.round(6 + 34 * Math.min(1, (m.vfb - m.v) / 1.5));
      ctx.globalAlpha = 0.5; ctx.fillStyle = majC; ctx.fillRect(XS - 10, YS, LP + 20, 5); ctx.globalAlpha = 1;
      for (let i = 0; i < n; i++) {
        const r = rnd[i % rnd.length];
        car(ctx, XS + r.x * LP + Math.sin(tt * 2 + r.ph) * 2.5, YS + 3 + r.y * 8 + Math.sin(tt * 3 + r.ph) * 1.2, majC, { r: 2.4, alpha: 0.9, sign: nT ? '+' : '−' });
      }
    }

    // terminals
    ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5;
    const terms = [
      { x: 140, y0: YS, s: 'S = 0 V' },
      { x: XS + LP / 2, y0: YS - 48, s: 'G = ' + fmtV(sg * T.v) },
      { x: 625, y0: YS, s: 'D = ' + fmtV(sg * 0.1) },
      { x: 54, y0: YS, s: 'B = ' + fmtV(-sg * T.vsb) }
    ];
    for (const tm of terms) {
      ctx.beginPath(); ctx.moveTo(tm.x, tm.y0); ctx.lineTo(tm.x, 34); ctx.stroke();
      ctx.fillStyle = C.card; ctx.beginPath(); ctx.arc(tm.x, 34, 4, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.fg; ctx.font = '600 13px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(tm.s, tm.x, 22);
    }

    // annotations
    ctx.font = '600 13px system-ui, sans-serif'; ctx.textAlign = 'left';
    if (d > 30) { ctx.fillStyle = C.fg; ctx.fillText('depletion region, Wd = ' + m.wd.toFixed(0) + ' nm', XS + 14, YS + d + 18); }
    if (m.state === 'depletion' || m.state === 'weak inversion' || m.state === 'flat band') {
      ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'left';
      const nt = m.state === 'flat band' ? 'no net charge, bands are flat' : 'no mobile channel carriers, so no current';
      const nw = ctx.measureText(nt).width + 16;
      ctx.fillStyle = C.card; ctx.globalAlpha = 0.9; roundRect(ctx, XS + 12, YS + 32, nw, 22, 6); ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = C.fg; ctx.fillText(nt, XS + 20, YS + 47);
    }
    // depth scale bar
    const steps = [10, 20, 50, 100, 200, 500, 1000];
    let len = steps[0];
    for (const s of steps) if (s * sc <= 110) len = s;
    const bx = 610, by = YS + 214;
    ctx.strokeStyle = C.fg; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by - len * sc); ctx.stroke();
    ctx.fillStyle = C.fg; ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(len + ' nm', bx + 6, by - len * sc / 2 + 4);
  }

  // ======================= energy band diagram =======================
  function drawBand(m) {
    const { ctx, w, h } = B;
    ctx.clearRect(0, 0, w, h);
    const yE = (e) => 300 - (e + 2.4) * 37.8;
    const xm0 = 60, xm1 = 130, xo1 = 190, xs0 = 190, xs1 = 700;
    const pxz = 380 / m.wdRef;
    const Eib = m.phiF, Ecb = Eib + EG / 2, Evb = Eib - EG / 2;
    const psi = m.psi, Wd = Math.max(m.wd, 1e-3);
    const psiAt = (z) => (psi > 0 ? (z < Wd ? psi * Math.pow(1 - z / Wd, 2) : 0) : psi * Math.exp(-z / (0.1 * m.wdRef)));
    const zmax = (xs1 - xs0) / pxz;

    // grid and axis
    ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.lineWidth = 1;
    for (let e = -2; e <= 4; e++) {
      ctx.strokeStyle = C.line; ctx.beginPath(); ctx.moveTo(xm0, yE(e)); ctx.lineTo(xs1, yE(e)); ctx.stroke();
      ctx.fillStyle = C.muted; ctx.fillText(String(e), xm0 - 6, yE(e) + 4);
    }
    ctx.save(); ctx.translate(14, 160); ctx.rotate(-Math.PI / 2); ctx.fillStyle = C.fg; ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('electron energy (eV), EF of silicon = 0', 0, 0); ctx.restore();

    ctx.save(); ctx.beginPath(); ctx.rect(xm0, 16, xs1 - xm0, 288); ctx.clip();
    // metal + oxide columns
    ctx.fillStyle = C.metal; ctx.globalAlpha = 0.25; ctx.fillRect(xm0, 16, xm1 - xm0, 288); ctx.globalAlpha = 1;
    ctx.fillStyle = C.ox; ctx.globalAlpha = 0.35; ctx.fillRect(xm1, 16, xo1 - xm1, 288); ctx.globalAlpha = 1;

    // gate Fermi level and oxide conduction band
    const efm = -m.v;
    const ecOxSi = Ecb - psi + CHI;
    const ecOxMet = efm + CHI;
    ctx.strokeStyle = C.warm; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(xm0, yE(efm)); ctx.lineTo(xm1, yE(efm)); ctx.stroke();
    ctx.strokeStyle = C.fg; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(xm1, yE(ecOxMet)); ctx.lineTo(xo1, yE(ecOxSi)); ctx.stroke();

    // silicon bands as curves
    const curve = (e0, dash, color, lw) => {
      ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.setLineDash(dash);
      ctx.beginPath();
      for (let px = 0; px <= xs1 - xs0; px += 3) {
        const z = px / pxz, x = xs0 + px, y = yE(e0 - psiAt(z));
        px === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke(); ctx.setLineDash([]);
    };
    // inverted (n-type) surface: shade between EF and Ei where Ei < EF
    ctx.fillStyle = C.e; ctx.globalAlpha = 0.35;
    ctx.beginPath(); let started = false, lastX = xs0;
    for (let px = 0; px <= xs1 - xs0; px += 3) {
      const ei = Eib - psiAt(px / pxz);
      if (ei < 0) { const x = xs0 + px; if (!started) { ctx.moveTo(x, yE(0)); started = true; } ctx.lineTo(x, yE(ei)); lastX = x; }
    }
    if (started) { ctx.lineTo(lastX, yE(0)); ctx.closePath(); ctx.fill(); }
    ctx.globalAlpha = 1;
    curve(Ecb, [], C.fg, 2.2); curve(Evb, [], C.fg, 2.2); curve(Eib, [5, 4], C.muted, 1.4);
    ctx.strokeStyle = C.accent; ctx.lineWidth = 1.6; ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(xs0, yE(0)); ctx.lineTo(xs1, yE(0)); ctx.stroke(); ctx.setLineDash([]);

    // psi_s marker
    if (Math.abs(psi) > 0.01) {
      const xa = xs0 + 14;
      ctx.strokeStyle = C.warm; ctx.fillStyle = C.warm; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(xa, yE(Eib)); ctx.lineTo(xa, yE(Eib - psi)); ctx.stroke();
      const dir = psi > 0 ? 1 : -1, ye = yE(Eib - psi);
      ctx.beginPath(); ctx.moveTo(xa, ye); ctx.lineTo(xa - 3.5, ye - 7 * dir); ctx.lineTo(xa + 3.5, ye - 7 * dir); ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    // labels
    ctx.font = '600 12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = C.fg;
    ctx.fillText('Gate', (xm0 + xm1) / 2, 12); ctx.fillText('SiO₂', (xm1 + xo1) / 2, 12);
    ctx.fillText(T.type === 'nmos' ? 'p-Si' : 'p-Si (shown for NMOS)', (xs0 + xs1) / 2, 12);
    ctx.textAlign = 'left'; ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('Ec', xs1 + 6, yE(Ecb) + 4); ctx.fillText('Ei', xs1 + 6, yE(Eib) + 4); ctx.fillText('Ev', xs1 + 6, yE(Evb) + 4);
    ctx.fillStyle = C.accent; ctx.textAlign = 'right'; ctx.fillText('EF', xs1 - 8, yE(0) - 6); ctx.textAlign = 'left';
    ctx.fillStyle = C.warm; ctx.textAlign = 'left';
    ctx.fillText('ψs = ' + psi.toFixed(2) + ' V  (band bending at the surface)', xs0 + 24, 40);
    ctx.fillText('EF (gate)', xm0 + 2, Math.min(Math.max(yE(efm) - 6, 30), 296));
    // band-bending note
    ctx.fillStyle = C.muted; ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'left';
    const note = m.state === 'strong inversion' ? 'Ei below EF at the surface: the surface is n-type (electron channel)'
      : m.state === 'weak inversion' ? 'Ei crossing EF, few electrons yet'
      : m.state === 'accumulation' ? 'bands bend up: holes pile up at the surface'
      : m.state === 'flat band' ? 'flat bands: no field in the silicon' : 'bands bend down: holes pushed away, depletion';
    ctx.fillText(note, xs0 + 28, 320);
  }

  // ======================= surface potential vs gate voltage =======================
  function drawPsi(m) {
    const { ctx, w, h } = P;
    ctx.clearRect(0, 0, w, h);
    const L = 56, R = 20, Tt = 16, Bt = 40, pw = w - L - R, ph = h - Tt - Bt;
    const vmin = -2, vmax = 2;
    const ymin = -0.3, ymax = Math.max(1.2, m.psiTh * 1.25);
    const X = (v) => L + (v - vmin) / (vmax - vmin) * pw;
    const Y = (p) => Tt + ph - (p - ymin) / (ymax - ymin) * ph;
    const f = (v) => {
      if (v >= m.vth) return m.psiTh;
      if (v > m.vfb) { const s = (-m.gam + Math.sqrt(m.gam * m.gam + 4 * (v - m.vfb))) / 2; return s * s; }
      return -PHT * Math.log(1 + (m.vfb - v) / (2 * PHT));
    };
    // regions
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = C.hole; ctx.fillRect(L, Tt, Math.max(0, X(m.vfb) - L), ph);
    ctx.fillStyle = C.dep; ctx.fillRect(X(m.vfb), Tt, Math.max(0, X(m.vth) - X(m.vfb)), ph);
    ctx.fillStyle = C.e; ctx.fillRect(X(m.vth), Tt, Math.max(0, L + pw - X(m.vth)), ph);
    ctx.globalAlpha = 1;
    ctx.font = '600 12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = C.muted;
    ctx.fillText('accumulation', (L + X(m.vfb)) / 2, Tt + 14);
    ctx.fillText('depletion', (X(m.vfb) + X(m.vth)) / 2, Tt + 14);
    ctx.fillText('inversion', (X(m.vth) + L + pw) / 2, Tt + 14);

    // grid
    ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.fillStyle = C.muted; ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'right';
    const step = niceStep((ymax - ymin) / 5);
    for (let p = Math.ceil(ymin / step) * step; p <= ymax; p += step) {
      ctx.beginPath(); ctx.moveTo(L, Y(p)); ctx.lineTo(L + pw, Y(p)); ctx.stroke(); ctx.fillText(p.toFixed(1), L - 6, Y(p) + 4);
    }
    ctx.textAlign = 'center';
    for (let v = vmin; v <= vmax; v += 0.5) ctx.fillText(v.toFixed(1), X(v), Tt + ph + 15);
    ctx.fillStyle = C.fg; ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('VG (V, NMOS-equivalent drive)', L + pw / 2, h - 6);
    ctx.save(); ctx.translate(14, Tt + ph / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('surface potential ψs (V)', 0, 0); ctx.restore();

    // reference levels
    ctx.setLineDash([5, 4]); ctx.lineWidth = 1.2; ctx.strokeStyle = C.fg; ctx.globalAlpha = 0.6;
    for (const [p, txt] of [[m.phiF, 'ΦF: weak inversion begins'], [m.psiTh, '2ΦF + VSB: pinned at threshold']]) {
      ctx.beginPath(); ctx.moveTo(L, Y(p)); ctx.lineTo(L + pw, Y(p)); ctx.stroke();
    }
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    ctx.fillStyle = C.muted; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('ΦF', L + 6, Y(m.phiF) - 4);
    ctx.fillText('2ΦF + VSB (pinned)', L + 6, Y(m.psiTh) - 4);

    // curve
    ctx.strokeStyle = C.warm; ctx.lineWidth = 3; ctx.beginPath();
    for (let v = vmin; v <= vmax + 1e-9; v += 0.01) { const x = X(v), y = Y(f(v)); v === vmin ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();
    // VFB, VTH markers
    for (const [v, txt] of [[m.vfb, 'VFB'], [m.vth, 'VTH']]) {
      if (v < vmin || v > vmax) continue;
      ctx.strokeStyle = C.accent; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(X(v), Tt + 20); ctx.lineTo(X(v), Tt + ph); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.accent; ctx.font = '600 12px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(txt + ' = ' + v.toFixed(2), X(v), Tt + ph - 6);
    }
    // operating point
    const px = Math.min(Math.max(m.v, vmin), vmax);
    ctx.fillStyle = C.accent; ctx.beginPath(); ctx.arc(X(px), Y(f(px)), 6, 0, 7); ctx.fill();
    ctx.strokeStyle = C.card; ctx.lineWidth = 2; ctx.stroke();
  }

  // ======================= readouts and controls =======================
  const fmtQ = (q) => (q * 1e6).toFixed(2) + ' µC/cm²';
  function readouts(m) {
    const sg = T.type === 'nmos' ? 1 : -1;
    const reg = $('t-state');
    reg.textContent = m.state.charAt(0).toUpperCase() + m.state.slice(1);
    reg.className = 'badge ' + (m.state === 'strong inversion' ? 'saturation' : m.state === 'accumulation' || m.state === 'flat band' ? 'cutoff' : 'triode');
    $('t-vfb').textContent = fmtV(sg * m.vfb);
    $('t-phif').textContent = m.phiF.toFixed(3) + ' V';
    $('t-vth').textContent = fmtV(sg * m.vth);
    $('t-gam').textContent = m.gam.toFixed(3) + ' V½';
    $('t-wdmax').textContent = m.wdMax.toFixed(0) + ' nm';
    $('t-cox').textContent = (m.cox * 1e7).toFixed(1) + ' fF/µm²';
    $('t-psi').textContent = m.psi.toFixed(3) + ' V';
    $('t-wd').textContent = m.wd.toFixed(0) + ' nm';
    $('t-qdep').textContent = fmtQ(m.qdep);
    $('t-qinv').textContent = fmtQ(m.qinv);
    $('t-cdep').textContent = isFinite(m.cdep) ? (m.cdep * 1e7).toFixed(1) + ' fF/µm²' : '-';
    // voltage divider: VG - VFB = Vox + psi_s
    const total = Math.max(1e-6, Math.abs(m.v - m.vfb));
    const ox = Math.abs(m.vox), ps = Math.abs(m.psi);
    const sum = ox + ps || 1;
    $('sb-ox').style.width = (ox / sum * 100) + '%';
    $('sb-psi').style.width = (ps / sum * 100) + '%';
    $('sb-txt').textContent = 'VG − VFB = ' + (m.v - m.vfb).toFixed(2) + ' V  =  Vox ' + m.vox.toFixed(2) + ' V  +  ψs ' + m.psi.toFixed(2) + ' V';
    $('t-pmosnote').hidden = T.type === 'nmos';
    // slider labels
    $('o-vg').textContent = fmtV(sg * T.v);
    $('o-vsb').textContent = T.vsb.toFixed(2) + ' V';
    { const [mant, ex] = Math.pow(10, T.logN).toExponential(1).split('e+');
      const sup = String(parseInt(ex, 10)).replace(/\d/g, (d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
      $('o-n').textContent = mant + ' × 10' + sup + ' cm⁻³'; }
    $('o-ttox').textContent = T.tox.toFixed(1) + ' nm';
    $('o-imp').textContent = (T.imp > 0 ? '+' : '') + T.imp.toFixed(1) + ' × 10¹² cm⁻²';
    $('t-vlab').innerHTML = T.type === 'nmos' ? 'V<sub>GS</sub>' : 'V<sub>GS</sub> (negative for PMOS)';
    // fix labels that use sub markup
  }

  function drawStatic() {
    readTheme();
    const m = model();
    drawBand(m); drawPsi(m); readouts(m);
    if (!MOSUI.anim.on) drawMos(0);
  }

  const fields = { vg: 'v', vsb: 'vsb', n: 'logN', ttox: 'tox', imp: 'imp' };
  function sync() {
    $('s-vg').value = T.v; $('s-vsb').value = T.vsb; $('s-n').value = T.logN; $('s-ttox').value = T.tox; $('s-imp').value = T.imp;
  }
  for (const [id, key] of Object.entries(fields)) {
    $('s-' + id).addEventListener('input', (e) => { T[key] = parseFloat(e.target.value); drawStatic(); });
  }
  document.querySelectorAll('#seg-mos button').forEach((b) => {
    b.addEventListener('click', () => {
      T.type = b.dataset.type;
      document.querySelectorAll('#seg-mos button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      drawStatic();
    });
  });
  const clampV = (v) => Math.min(2, Math.max(-2, Math.round(v * 100) / 100));
  const PRE = {
    flat: (m) => m.vfb,
    acc: (m) => m.vfb - 0.7,
    dep: (m) => m.vfb + 0.5 * m.phiF + m.gam * Math.sqrt(0.5 * m.phiF),
    weak: (m) => m.vfb + 1.5 * m.phiF + m.gam * Math.sqrt(1.5 * m.phiF),
    th: (m) => m.vth,
    inv: (m) => m.vth + 0.6
  };
  document.querySelectorAll('#t-presets button').forEach((b) => {
    b.addEventListener('click', () => {
      if (b.dataset.p === 'body') { T.vsb = 1; sync(); T.v = clampV(model().vth + 0.3); }
      else { T.v = clampV(PRE[b.dataset.p](model())); }
      sync(); drawStatic();
    });
  });

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', drawStatic);

  // ======================= loop =======================
  let visible = true;
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { threshold: 0 }).observe($('cv-mos'));
  function frame(ts) { if (visible && MOSUI.anim.on) drawMos(ts); requestAnimationFrame(frame); }
  sync(); drawStatic();
  requestAnimationFrame(frame);
})();
