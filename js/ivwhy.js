// Module 3 extra: why each region has its own I_D formula (the integral, drawn).
(() => {
  'use strict';
  const { $, readTheme, setupCanvas, plotFrame, curve, onTheme, eng, C } = window.MOSUI;
  if (!$('cv-yw')) return;
  const VTH = 0.4;
  const S = { dev: 'n', vg: 1.0, vd: 0.3, wl: 10 };
  const cv = setupCanvas($('cv-yw'));
  const f2 = (x) => x.toFixed(2);
  const sb = (b, s) => b + '<sub>' + s + '</sub>';

  function calc() {
    const mu = S.dev === 'n' ? 200 : 100, vov = S.vg - VTH;
    let region = 'cutoff', area = 0, vup = 0;
    if (vov > 0) {
      if (S.vd < vov) { region = 'triode'; vup = S.vd; area = vov * S.vd - 0.5 * S.vd * S.vd; }
      else { region = 'saturation'; vup = vov; area = 0.5 * vov * vov; }
    }
    return { mu, vov, region, area, vup, id: mu * S.wl * area };
  }

  function draw() {
    const { ctx, w, h } = cv, r = calc();
    ctx.fillStyle = C.card; ctx.fillRect(0, 0, w, h);
    const col = r.region === 'triode' ? C.accent : r.region === 'saturation' ? C.warm : C.muted;
    const g = S.dev === 'n' ? 'VGS' : 'VSG', d = S.dev === 'n' ? 'VDS' : 'VSD', tk = S.dev === 'n' ? 'VTH' : '|VTH|';
    // left: integrand
    ctx.fillStyle = C.fg; ctx.font = '600 14px system-ui'; ctx.textAlign = 'left';
    ctx.fillText('Integrand: charge at potential V', 12, 22);
    const fl = plotFrame(ctx, { x: 50, y: 44, w: 232, h: 210, xmin: 0, xmax: 1.4, ymin: 0, ymax: 1.0, xticks: [0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4], yticks: [0, 0.25, 0.5, 0.75, 1.0], fmtx: (t) => t.toFixed(1), fmty: (t) => t.toFixed(2), xlabel: 'V (0 at the source)' });
    if (r.vov > 0) {
      ctx.save(); ctx.fillStyle = col; ctx.globalAlpha = 0.28; ctx.beginPath(); ctx.moveTo(fl.X(0), fl.Y(0));
      for (let i = 0; i <= 60; i++) { const v = r.vup * i / 60; ctx.lineTo(fl.X(v), fl.Y(r.vov - v)); }
      ctx.lineTo(fl.X(r.vup), fl.Y(0)); ctx.closePath(); ctx.fill(); ctx.restore();
      curve(ctx, (v) => Math.max(r.vov - v, 0), fl, 0, 1.4, 140, C.fg, 2.4);
      // pinch-off marker
      ctx.save(); ctx.strokeStyle = C.muted; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(fl.X(r.vov), fl.Y(0)); ctx.lineTo(fl.X(r.vov), fl.Y(0.95)); ctx.stroke(); ctx.restore();
      ctx.fillStyle = C.muted; ctx.font = '12px system-ui'; ctx.textAlign = 'center'; ctx.fillText('charge = 0', fl.X(r.vov), fl.Y(0.96));
    } else { ctx.fillStyle = C.muted; ctx.font = '13px system-ui'; ctx.textAlign = 'center'; ctx.fillText('no charge anywhere', fl.X(0.7), fl.Y(0.5)); }
    // drain potential marker
    ctx.save(); ctx.strokeStyle = C.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fl.X(S.vd), fl.Y(0)); ctx.lineTo(fl.X(S.vd), fl.Y(0.80)); ctx.stroke(); ctx.restore();
    ctx.fillStyle = C.accent; ctx.font = '600 12px system-ui'; ctx.textAlign = 'center'; ctx.fillText(d, fl.X(S.vd), fl.Y(0.80) - 5);
        // right: inversion layer along the channel
    ctx.fillStyle = C.fg; ctx.font = '600 14px system-ui'; ctx.textAlign = 'left'; ctx.fillText('Result: layer along the channel', 340, 22);
    const fr = plotFrame(ctx, { x: 366, y: 44, w: 232, h: 210, xmin: 0, xmax: 1, ymin: 0, ymax: 1.0, xticks: [0, 0.5, 1], yticks: [0, 0.5, 1.0], fmtx: (t) => (t === 0 ? 'source' : t === 1 ? 'drain' : ''), fmty: (t) => t.toFixed(1), xlabel: 'position x' });
    if (r.vov > 0) {
      const K = 2 * r.area, q = (x) => Math.sqrt(Math.max(r.vov * r.vov - x * K, 0));
      ctx.save(); ctx.fillStyle = col; ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.moveTo(fr.X(0), fr.Y(0));
      for (let i = 0; i <= 60; i++) ctx.lineTo(fr.X(i / 60), fr.Y(q(i / 60))); ctx.lineTo(fr.X(1), fr.Y(0)); ctx.closePath(); ctx.fill(); ctx.restore();
      curve(ctx, q, fr, 0, 1, 80, col, 2.6);
      ctx.fillStyle = C.muted; ctx.font = '12px system-ui'; ctx.textAlign = 'right';
      ctx.fillText(r.region === 'saturation' ? 'pinch-off at the drain' : 'thick at the drain', fr.x + fr.w - 6, fr.y + 32);
    }
    ctx.fillStyle = C.muted; ctx.font = '12px system-ui'; ctx.textAlign = 'left'; ctx.fillText('thickness ∝ charge', fr.x + 6, fr.y + 14);
  }

  const typeset = (el) => {
    if (typeof renderMathInElement !== 'function') return;
    renderMathInElement(el, { delimiters: [{ left: '\\[', right: '\\]', display: true }, { left: '\\(', right: '\\)', display: false }], throwOnError: false });
  };
  function text() {
    const r = calc(), n = S.dev === 'n';
    const g = n ? 'GS' : 'SG', d = n ? 'DS' : 'SD', mu = n ? '\\mu_n' : '\\mu_p', th = n ? 'V_{TH}' : '|V_{TH}|', I = n ? 'I_D' : 'I_{SD}';
    const Vg = 'V_{' + g + '}', Vd = 'V_{' + d + '}', Vov = 'V_{ov}';
    const cur = r.id >= 1000 ? (r.id / 1000).toPrecision(3) + '\\ \\text{mA}' : r.id.toPrecision(3) + '\\ \\mu\\text{A}';
    const muv = r.mu + '\\ \\mu\\text{A/V}^2', ov = r.vov.toFixed(2), vd = S.vd.toFixed(2), ar = r.area.toFixed(3);
    let h = '<p>Current is charge times velocity. At a point of the channel where the potential is \\(V\\), the charge per unit length is \\(Q_d = WC_{ox}(' + Vg + ' - V - ' + th + ')\\) and the carrier speed is \\(v = ' + mu + '\\,dV/dx\\), so</p>' +
      '\\[ ' + I + '\\,dx = ' + mu + ' C_{ox} W\\,(' + Vov + ' - V)\\,dV, \\qquad ' + Vov + ' = ' + Vg + ' - ' + th + ' = ' + ov + '\\ \\text{V}. \\]';
    if (r.region === 'cutoff') {
      h += '<p><b>Cutoff.</b> \\(' + Vov + ' \\le 0\\), so \\((' + Vov + ' - V)\\) is negative for every \\(V\\): there is no inversion layer and nothing to integrate.</p>\\[ ' + I + ' \\approx 0 \\quad\\text{(only subthreshold leakage)} \\]';
    } else if (r.region === 'triode') {
      h += '<p><b>Triode</b> (\\(' + Vd + ' = ' + vd + '\\ \\text{V} < ' + Vov + '\\)). The charge is still positive at the drain end, so we add up the whole channel, \\(V\\) from \\(0\\) to \\(' + Vd + '\\) (shaded area, a trapezoid):</p>' +
        '\\[ ' + I + '\\,L = ' + mu + ' C_{ox} W \\int_0^{' + Vd + '} (' + Vov + ' - V)\\,dV = ' + mu + ' C_{ox} W \\Big[ ' + Vov + Vd + ' - \\tfrac12 ' + Vd + '^2 \\Big] \\]' +
        '\\[ \\text{area} = ' + ov + '\\cdot' + vd + ' - \\tfrac12\\,' + vd + '^2 = ' + ar + '\\ \\text{V}^2 \\]' +
        '\\[ ' + I + ' = ' + mu + ' C_{ox}\\frac{W}{L}\\,\\text{area} = ' + muv + ' \\times ' + S.wl + ' \\times ' + ar + ' = \\boxed{' + cur + '} \\]' +
        '<p>Both \\(' + Vg + '\\) (the height of the line) and \\(' + Vd + '\\) (the width of the shaded part) change the area, so the current depends on both: the device acts as a gate-controlled resistor.</p>';
    } else {
      h += '<p><b>Saturation</b> (\\(' + Vd + ' = ' + vd + '\\ \\text{V} \\ge ' + Vov + '\\)). Moving from the source towards the drain, the charge falls to zero at \\(V = ' + Vov + '\\) (dashed line): the channel is pinched off. Beyond that point there is no charge, so the integral stops at \\(' + Vov + '\\), not at \\(' + Vd + '\\). The shaded area is a triangle:</p>' +
        '\\[ ' + I + '\\,L = ' + mu + ' C_{ox} W \\int_0^{' + Vov + '} (' + Vov + ' - V)\\,dV = ' + mu + ' C_{ox} W\\cdot\\tfrac12 ' + Vov + '^2 \\]' +
        '\\[ \\text{area} = \\tfrac12\\,' + ov + '^2 = ' + ar + '\\ \\text{V}^2 \\]' +
        '\\[ ' + I + ' = \\tfrac12 ' + mu + ' C_{ox}\\frac{W}{L}\\,' + Vov + '^2 = ' + muv + ' \\times ' + S.wl + ' \\times ' + ar + ' = \\boxed{' + cur + '} \\]' +
        '<p>Increasing \\(' + Vd + '\\) moves the blue line to the right but adds no area, so the current stays flat: a current source controlled by \\(' + Vg + '\\) alone. Real devices keep a small slope, the factor \\(1 + \\lambda ' + Vd + '\\) of channel-length modulation.</p>';
    }
    const box = $('yw-text'); box.innerHTML = h; typeset(box);
    $('yw-reg').textContent = r.region; $('yw-vov').textContent = f2(r.vov) + ' V'; $('yw-area').textContent = r.area.toFixed(3) + ' V²'; $('yw-id').textContent = eng(r.id * 1e-6, 'A', 3);
    $('o-yw-vg').textContent = S.vg.toFixed(2) + ' V'; $('o-yw-vd').textContent = S.vd.toFixed(2) + ' V'; $('o-yw-wl').textContent = String(S.wl);
    $('yw-gl').innerHTML = S.dev === 'n' ? 'V<sub>GS</sub>' : 'V<sub>SG</sub>'; $('yw-dl').innerHTML = S.dev === 'n' ? 'V<sub>DS</sub>' : 'V<sub>SD</sub>';
  }
  const upd = () => { text(); draw(); };
  for (const [id, k] of [['yw-vg', 'vg'], ['yw-vd', 'vd'], ['yw-wl', 'wl']]) $(id).addEventListener('input', (e) => { S[k] = parseFloat(e.target.value); upd(); });
  document.querySelectorAll('#yw-dev button').forEach((b) => b.addEventListener('click', () => { S.dev = b.dataset.t; document.querySelectorAll('#yw-dev button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); upd(); }));
  document.querySelectorAll('#yw-pre button').forEach((b) => b.addEventListener('click', () => { S.vg = +b.dataset.g; S.vd = +b.dataset.d; $('yw-vg').value = S.vg; $('yw-vd').value = S.vd; upd(); }));
  const init = () => { $('yw-vg').value = S.vg; $('yw-vd').value = S.vd; $('yw-wl').value = S.wl; upd(); };
  onTheme(init); readTheme(); init();
})();
