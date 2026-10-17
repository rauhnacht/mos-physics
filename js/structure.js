// Module 1: MOSFET structure, terminals and the rule of differences
(() => {
  'use strict';
  const { $, C, readTheme, setupCanvas, fmtV, roundRect } = MOSUI;
  const cv = $('cv-struct');
  if (!cv) return;
  const { ctx, w: W, h: H } = setupCanvas(cv);

  const S = { type: 'nmos', Ld: 40, LD: 8, tox: 1.5, W: 1.0, sel: 'channel' };
  const EPS_OX = 3.9 * 8.854e-14; // F/cm
  let hits = [];

  // ---------- region descriptions ----------
  function info(id, kind) {
    const n = kind === 'n';
    const t = {
      gate: ['Gate', 'The control terminal: polysilicon on top of the oxide. It draws no DC current. Its voltage relative to the source decides whether a channel exists.'],
      oxide: ['Gate oxide (SiO₂)', 'An insulator with thickness t_ox (about 15 Å in the lecture example). Gate, oxide and body form the capacitor C_ox = ε_ox / t_ox. A thinner oxide gives more charge per volt.'],
      source: ['Source', n ? 'n+ diffusion that supplies the charge carriers (electrons). For an NMOS it is whichever n+ terminal is at the lower voltage.' : 'p+ diffusion that supplies the charge carriers (holes). For a PMOS it is whichever p+ terminal is at the higher voltage.'],
      drain: ['Drain', n ? 'The n+ terminal that collects the carriers: the higher-voltage one for an NMOS. Source and drain are physically identical until biased, so the roles can swap.' : 'The p+ terminal that collects the carriers: the lower-voltage one for a PMOS. Source and drain are physically identical until biased.'],
      channel: ['Channel region', 'The surface strip between the diffusions. The junctions side-diffuse under the gate during fabrication, so L_eff = L_drawn − 2L_D is shorter than the drawn gate.'],
      body: [n ? 'p-type substrate (body)' : 'n-type body', 'The fourth terminal. Source and drain junctions must stay reverse-biased, so ' + (n ? 'an NMOS body connects to the most negative supply.' : 'a PMOS body (the n-well) connects to the most positive supply.')],
      bodycontact: ['Body contact', 'A heavily doped ' + (n ? 'p+' : 'n+') + ' patch so the metal makes a good ohmic contact to the body. Body potential strongly influences the device (module 5, body effect).'],
      nwell: ['n-well', 'An n-type region in which the PMOS is built, so NMOS and PMOS can share one wafer (CMOS). Tie it to the most positive supply so its junctions stay reverse-biased.']
    }[id];
    return t || ['', ''];
  }

  // ---------- geometry ----------
  function layout(x0, k, bodyRight) {
    const sx = 1.9 * k, wc = 40 * k, gap = 12 * k, wsd = 100 * k;
    const Lp = S.Ld * sx, dLD = S.LD * sx;
    const L = { k, sx, wc, gap, wsd, Lp, dLD, xj: 58 * k, gh: 28 * k, tpx: Math.max(2.5, S.tox * sx) };
    if (bodyRight) {
      L.xS0 = x0; L.xg0 = L.xS0 + wsd; L.xg1 = L.xg0 + Lp; L.xD1 = L.xg1 + wsd; L.xC = L.xD1 + gap; L.xR = L.xC + wc;
    } else {
      L.xC = x0; L.xS0 = L.xC + wc + gap; L.xg0 = L.xS0 + wsd; L.xg1 = L.xg0 + Lp; L.xD1 = L.xg1 + wsd; L.xR = L.xD1;
    }
    L.xL = x0;
    return L;
  }

  function rect(id, kind, x, y, w, h) { hits.push({ id, kind, x, y, w, h }); }
  function fillRect(x, y, w, h, color, alpha) {
    ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.fillStyle = color; ctx.fillRect(x, y, w, h); ctx.globalAlpha = 1;
  }
  function label(text, x, y, size, color, align) {
    ctx.fillStyle = color || C.fg; ctx.font = (size || 13) + 'px system-ui, sans-serif'; ctx.textAlign = align || 'center';
    ctx.fillText(text, x, y);
  }
  function arrowH(x1, x2, y, color) {
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
    const a = 5;
    ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x1 + a, y - 3); ctx.lineTo(x1 + a, y + 3); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x2, y); ctx.lineTo(x2 - a, y - 3); ctx.lineTo(x2 - a, y + 3); ctx.closePath(); ctx.fill();
  }
  function tick(x, y1, y2, color, dash) {
    ctx.strokeStyle = color; ctx.lineWidth = 1; if (dash) ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.stroke(); ctx.setLineDash([]);
  }
  function maskedText(text, x, y, size, color) {
    ctx.font = size + 'px system-ui, sans-serif';
    const w = ctx.measureText(text).width + 8;
    fillRect(x - w / 2, y - size, w, size + 6, C.card);
    label(text, x, y, size, color);
  }

  function drawDevice(kind, L, ys, o) {
    const isN = kind === 'n';
    const { k, wc, wsd, Lp, dLD, xj, gh, tpx } = L;
    const small = Math.max(10, Math.round(13 * Math.max(k, 0.8)));

    // diffusions (side diffusion extends under the gate by L_D)
    const diff = (x, w, id) => {
      rect(id, kind, x, ys, w, xj);
      ctx.globalAlpha = isN ? 1 : 0.55;
      ctx.fillStyle = isN ? C.n : C.hole;
      roundRect(ctx, x, ys - 1, w, xj + 1, 6 * k); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = C.muted; ctx.lineWidth = 1; ctx.globalAlpha = 0.5;
      roundRect(ctx, x, ys - 1, w, xj + 1, 6 * k); ctx.stroke(); ctx.globalAlpha = 1;
    };
    diff(L.xS0, wsd + dLD, 'source');
    diff(L.xg1 - dLD, wsd + dLD, 'drain');
    // body contact
    rect('bodycontact', kind, L.xC, ys, wc, 24 * k);
    ctx.globalAlpha = isN ? 0.55 : 1; ctx.fillStyle = isN ? C.hole : C.n;
    roundRect(ctx, L.xC, ys - 1, wc, 24 * k, 4 * k); ctx.fill(); ctx.globalAlpha = 1;
    label(isN ? 'p+' : 'n+', L.xC + wc / 2, ys + 16 * k, small);
    label(isN ? 'n+' : 'p+', L.xS0 + wsd / 2, ys + xj * 0.6, small);
    label(isN ? 'n+' : 'p+', L.xD1 - wsd / 2, ys + xj * 0.6, small);

    // channel region (hit area and subtle highlight)
    const cx0 = L.xg0 + dLD, cx1 = L.xg1 - dLD;
    rect('channel', kind, cx0, ys, Math.max(cx1 - cx0, 6), xj * 0.5);

    // oxide and gate
    rect('oxide', kind, L.xg0, ys - tpx - 1, Lp, tpx + 2);
    fillRect(L.xg0, ys - tpx, Lp, tpx, C.ox);
    rect('gate', kind, L.xg0, ys - tpx - gh, Lp, gh);
    fillRect(L.xg0, ys - tpx - gh, Lp, gh, C.metal);
    label('Gate', L.xg0 + Lp / 2, ys - tpx - gh / 2 + 4, small, C.fg);

    // terminals
    const yT = ys - 84;
    const terms = [
      { x: L.xS0 + wsd / 2, name: 'S', y0: ys },
      { x: L.xg0 + Lp / 2, name: 'G', y0: ys - tpx - gh },
      { x: L.xD1 - wsd / 2, name: 'D', y0: ys },
      { x: L.xC + wc / 2, name: 'B', y0: ys }
    ];
    ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5;
    for (const t of terms) {
      ctx.beginPath(); ctx.moveTo(t.x, t.y0); ctx.lineTo(t.x, yT); ctx.stroke();
      ctx.fillStyle = C.card; ctx.beginPath(); ctx.arc(t.x, yT, 4, 0, 7); ctx.fill(); ctx.stroke();
      label(t.name, t.x, yT - 10, 14, C.fg);
    }
    label(isN ? '→ GND' : '→ VDD', L.xC + wc / 2, yT - 26, 11, C.muted);

    // dimension lines (single-device view only)
    if (o.dims) {
      const yA = ys + xj + 20, yB = ys + xj + 48;
      tick(L.xg0, ys, yB + 6, C.muted, true); tick(L.xg1, ys, yB + 6, C.muted, true);
      tick(cx0, ys + xj * 0.5, yB + 6, C.warm, true); tick(cx1, ys + xj * 0.5, yB + 6, C.warm, true);
      arrowH(L.xg0, L.xg1, yA, C.fg);
      maskedText('Ldrawn = ' + S.Ld + ' nm', (L.xg0 + L.xg1) / 2, yA - 5, 12, C.fg);
      if (cx1 > cx0 + 4) {
        arrowH(cx0, cx1, yB, C.warm);
        maskedText('Leff = ' + (S.Ld - 2 * S.LD) + ' nm', (cx0 + cx1) / 2, yB + 17, 12, C.warm);
      }
      if (S.LD > 0) {
        ctx.fillStyle = C.warm; ctx.globalAlpha = 0.9;
        ctx.fillRect(L.xg0, yB - 2, dLD, 4); ctx.fillRect(L.xg1 - dLD, yB - 2, dLD, 4); ctx.globalAlpha = 1;
        label('LD', L.xg0 - 6, yB + 4, 12, C.warm, 'right');
        label('LD', L.xg1 + 6, yB + 4, 12, C.warm, 'left');
      }
      // t_ox bracket
      tick(L.xg1 + 6, ys - tpx, ys, C.fg); label('tox', L.xg1 + 12, ys - tpx / 2 + 4, 11, C.fg, 'left');
    }
  }

  function drawScene() {
    ctx.clearRect(0, 0, W, H);
    hits = [];
    const ys = 150;
    const subH = S.type === 'cmos' ? 190 : 135;
    if (S.type === 'cmos') {
      const a1 = layout(0, 1, false), b1 = layout(0, 1, true);
      const k = Math.min(1, (W - 90 - 46) / ((a1.xR - a1.xL) + (b1.xR - b1.xL)));
      const La = layout(0, k, false), Lb = layout(0, k, true);
      const wA = La.xR - La.xL, wB = Lb.xR - Lb.xL, gapD = 46;
      const start = (W - (wA + wB + gapD)) / 2;
      const A = layout(start, k, false);
      const B = layout(start + wA + gapD, k, true);
      // p-substrate
      fillRect(start - 14, ys, wA + wB + gapD + 28, subH, C.si);
      rect('body', 'n', start - 14, ys, wA + wB + gapD + 28, subH);
      label('p-substrate  → GND (lowest supply)', start - 8, ys + subH - 10, 12, C.muted, 'left');
      // n-well under the PMOS
      const wx = B.xL - 12, ww = B.xR - B.xL + 24, wh = 150;
      ctx.globalAlpha = 0.4; ctx.fillStyle = C.n; roundRect(ctx, wx, ys, ww, wh, 10); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = C.muted; ctx.lineWidth = 1; roundRect(ctx, wx, ys, ww, wh, 10); ctx.stroke();
      rect('nwell', 'p', wx, ys, ww, wh);
      label('n-well  → VDD', wx + ww / 2, ys + wh - 10, 12, C.fg);
      drawDevice('n', A, ys, { dims: true });
      drawDevice('p', B, ys, { dims: true });
      label('NMOS', (A.xL + A.xR) / 2, 24, 15, C.fg);
      label('PMOS', (B.xL + B.xR) / 2, 24, 15, C.fg);
    } else {
      const kind = S.type === 'nmos' ? 'n' : 'p';
      const L0 = layout(0, 1, false);
      const x0 = (W - (L0.xR - L0.xL)) / 2;
      const L = layout(x0, 1, false);
      fillRect(x0 - 24, ys, L.xR - L.xL + 48, subH, C.si);
      if (kind === 'p') fillRect(x0 - 24, ys, L.xR - L.xL + 48, subH, C.n, 0.3);
      rect('body', kind, x0 - 24, ys, L.xR - L.xL + 48, subH);
      label(kind === 'n' ? 'p-substrate (body)' : 'n-substrate (body)', x0 + 6, ys + subH - 10, 13, C.muted, 'left');
      drawDevice(kind, L, ys, { dims: true });
    }
    // highlight selection
    ctx.strokeStyle = C.accent; ctx.lineWidth = 2; ctx.setLineDash([5, 3]);
    for (const h of hits) if (h.id === S.sel) ctx.strokeRect(h.x - 2, h.y - 2, h.w + 4, h.h + 4);
    ctx.setLineDash([]);
  }

  function showInfo() {
    // pick the matching device kind from the hit list (first match of the selected id)
    const h = hits.find((x) => x.id === S.sel);
    const [title, text] = info(S.sel, h ? h.kind : (S.type === 'pmos' ? 'p' : 'n'));
    $('struct-info').innerHTML = '<b>' + title + '.</b> ' + text.replace(/([A-Za-z\u03B5]+)_([A-Za-z]+)/g, '$1<sub>$2</sub>');
  }

  function readouts() {
    const leff = S.Ld - 2 * S.LD;
    const cox = EPS_OX / (S.tox * 1e-7) * 1e7; // fF/um^2
    $('st-leff').textContent = leff + ' nm';
    $('st-tox').textContent = (S.tox * 10).toFixed(S.tox * 10 % 1 ? 1 : 0) + ' Å';
    $('st-cox').textContent = cox.toFixed(1) + ' fF/µm²';
    $('st-cg').textContent = (cox * S.W * leff / 1000).toFixed(2) + ' fF';
    $('st-ar').textContent = (S.W * 1000 / leff).toFixed(1);
    $('st-lost').textContent = Math.round(2 * S.LD / S.Ld * 100) + ' %';
    $('o-ld').textContent = S.Ld + ' nm';
    $('o-lD').textContent = S.LD + ' nm';
    $('o-tox').textContent = S.tox.toFixed(1) + ' nm (' + (S.tox * 10).toFixed(0) + ' Å)';
    $('o-w').textContent = S.W.toFixed(1) + ' µm';
    $('st-dimnote').hidden = true;
  }

  function redraw() { readTheme(); drawScene(); showInfo(); readouts(); }

  // ---------- controls ----------
  function bindSlider(id, key, parse) {
    $(id).addEventListener('input', (e) => {
      S[key] = parse(e.target.value);
      if (key === 'Ld') {
        const max = Math.max(0, Math.floor((S.Ld - 4) / 2));
        $('s-lD').max = max; if (S.LD > max) { S.LD = max; $('s-lD').value = max; }
      }
      redraw();
    });
  }
  bindSlider('s-ld', 'Ld', (v) => parseInt(v, 10));
  bindSlider('s-lD', 'LD', (v) => parseInt(v, 10));
  bindSlider('s-tox', 'tox', parseFloat);
  bindSlider('s-w', 'W', parseFloat);

  document.querySelectorAll('#seg-type button').forEach((b) => {
    b.addEventListener('click', () => {
      S.type = b.dataset.type;
      document.querySelectorAll('#seg-type button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      redraw();
    });
  });

  cv.addEventListener('click', (e) => {
    const r = cv.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
    for (let i = hits.length - 1; i >= 0; i--) {
      const h = hits[i];
      if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) { S.sel = h.id; redraw(); return; }
    }
  });
  cv.addEventListener('mousemove', (e) => {
    const r = cv.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
    cv.style.cursor = hits.some((h) => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) ? 'pointer' : 'default';
  });

  // ---------- rule of differences playground ----------
  const PG = { type: 'nmos', a: 0.0, b: 1.2, g: 1.0 };
  const VTH = 0.4, VDD = 1.8;
  function playground() {
    const { type, a, b, g } = PG;
    const n = type === 'nmos';
    const aIsSource = n ? a <= b : a >= b;
    const vs = aIsSource ? a : b, vd = aIsSource ? b : a;
    let vgs, vds, vsb;
    if (n) { vgs = g - vs; vds = vd - vs; vsb = vs - 0; }
    else { vgs = g - vs; vds = vd - vs; vsb = VDD - vs; }
    const ov = n ? vgs - VTH : -(vgs) - VTH; // PMOS: |V_GS| - |V_TH|
    let region = 'cutoff';
    if (ov > 0) region = Math.abs(vds) < ov ? 'triode' : 'saturation';
    $('pg-a-role').textContent = aIsSource ? 'Source' : 'Drain';
    $('pg-b-role').textContent = aIsSource ? 'Drain' : 'Source';
    $('pg-a-v').textContent = fmtV(a);
    $('pg-b-v').textContent = fmtV(b);
    $('pg-g-v').textContent = fmtV(g);
    $('pg-vgs').textContent = fmtV(vgs);
    $('pg-vds').textContent = fmtV(vds);
    $('pg-vsb').textContent = fmtV(vsb) + (vsb > 0.005 ? ' (body effect, module 5)' : '');
    $('pg-vov').textContent = ov > 0 ? ov.toFixed(2) + ' V' : '-';
    const reg = $('pg-region');
    reg.textContent = region === 'cutoff' ? 'Cutoff' : region === 'triode' ? 'Triode' : 'Saturation';
    reg.className = 'badge ' + region;
    $('pg-rule').textContent = n
      ? 'NMOS: the drain is the terminal at the higher voltage. VTH = +0.4 V, body at GND.'
      : 'PMOS: the drain is the terminal at the lower voltage. V_TH = −0.4 V, body at VDD = 1.8 V.';
    for (const [id, key] of [['pg-a', 'a'], ['pg-b', 'b'], ['pg-g', 'g']]) { $(id).value = PG[key]; }
  }
  for (const [id, key] of [['pg-a', 'a'], ['pg-b', 'b'], ['pg-g', 'g']]) {
    $(id).addEventListener('input', (e) => { PG[key] = parseFloat(e.target.value); playground(); });
  }
  document.querySelectorAll('#seg-pg button').forEach((b) => {
    b.addEventListener('click', () => {
      PG.type = b.dataset.type;
      document.querySelectorAll('#seg-pg button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      if (PG.type === 'pmos') { PG.a = 1.8; PG.b = 0.6; PG.g = 0.8; } else { PG.a = 0; PG.b = 1.2; PG.g = 1.0; }
      playground();
    });
  });
  document.getElementById('pg-swap').addEventListener('click', () => { const t = PG.a; PG.a = PG.b; PG.b = t; playground(); });

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', redraw);
  $('s-lD').max = Math.floor((S.Ld - 4) / 2);
  redraw(); playground();
})();
