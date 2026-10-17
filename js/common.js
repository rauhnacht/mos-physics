// Canvas text: automatically render circuit symbols such as VGS, CGD, ID, gm, Cox with true subscripts.
(() => {
  'use strict';
  const proto = CanvasRenderingContext2D.prototype, orig = proto.fillText;
  const RE = /(^|[^A-Za-z0-9_])([CVIQgrREvi]|Φ|γ)(GS|GD|GB|SB|DB|DS|TH|FB|MS|ov|ox|on|sat|dep|inv|mb|DD|ds|gs|bs|[DGSBdmoFcivTA])(?![A-Za-z])/g;
  const RE_PSI = /(^|[^A-Za-z0-9_])(ψ)(s)(?![A-Za-z])/g;
  function split(text) {
    const marks = [];
    for (const re of [RE, RE_PSI]) {
      re.lastIndex = 0; let m;
      while ((m = re.exec(text))) {
        const st = m.index + m[1].length;
        marks.push({ st, bl: m[2].length, en: st + m[2].length + m[3].length });
        re.lastIndex = m.index + m[0].length - 0;
      }
    }
    marks.sort((a, b) => a.st - b.st);
    return marks;
  }
  proto.fillText = function (text, x, y, mw) {
    if (typeof text !== 'string' || text.length < 2) return orig.call(this, text, x, y, mw);
    const marks = split(text);
    if (!marks.length) return orig.call(this, text, x, y, mw);
    const font0 = this.font, al = this.textAlign;
    const fm = /(\d+(?:\.\d+)?)px/.exec(font0);
    const size = fm ? parseFloat(fm[1]) : 13;
    const fsub = fm ? font0.replace(fm[0], (size * 0.72).toFixed(1) + 'px') : font0;
    const segs = []; let i = 0;
    for (const mk of marks) {
      if (mk.st < i) continue;
      if (mk.st > i) segs.push({ t: text.slice(i, mk.st), f: font0, dy: 0 });
      segs.push({ t: text.slice(mk.st, mk.st + mk.bl), f: font0, dy: 0 });
      segs.push({ t: text.slice(mk.st + mk.bl, mk.en), f: fsub, dy: size * 0.24 });
      i = mk.en;
    }
    if (i < text.length) segs.push({ t: text.slice(i), f: font0, dy: 0 });
    let tw = 0;
    for (const sg of segs) { this.font = sg.f; sg.w = this.measureText(sg.t).width; tw += sg.w; }
    let x0 = x;
    if (al === 'center') x0 = x - tw / 2; else if (al === 'right' || al === 'end') x0 = x - tw;
    this.textAlign = 'left';
    for (const sg of segs) { this.font = sg.f; orig.call(this, sg.t, x0, y + sg.dy); x0 += sg.w; }
    this.font = font0; this.textAlign = al;
  };
})();

// Shared canvas helpers for the module scripts.
window.MOSUI = (() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const C = {};

  function readTheme() {
    const s = getComputedStyle(document.documentElement);
    const g = (n) => s.getPropertyValue(n).trim();
    Object.assign(C, {
      card: g('--card'), fg: g('--fg'), muted: g('--muted'), line: g('--line'), e: g('--e'),
      warm: g('--warm'), si: g('--si'), n: g('--nplus'), metal: g('--metal'), ox: g('--ox'),
      dep: g('--dep'), accent: g('--accent'), hole: g('--hole'), code: g('--code')
    });
    return C;
  }

  // Backing store sized for the device pixel ratio; logical size comes from the width/height attributes.
  function setupCanvas(c) {
    const w = c.width, h = c.height;
    const r = Math.min(window.devicePixelRatio || 1, 2);
    c.width = w * r; c.height = h * r;
    const ctx = c.getContext('2d');
    ctx.setTransform(r, 0, 0, r, 0, 0);
    return { ctx, w, h };
  }

  // Text with a lowered subscript.
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

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Signed voltage text with a real minus sign.
  const fmtV = (v, d = 2) => (v < 0 ? '−' : '') + Math.abs(v).toFixed(d) + ' V';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const anim = { on: true };

  // Axes helper for line plots. opts: {x,y,w,h,xmin,xmax,ymin,ymax,ylog,xticks,yticks,xlabel,ylabel,fmtx,fmty}
  // Returns {X(v), Y(v), x,y,w,h}. ylog: ymin/ymax are decade exponents.
  function plotFrame(ctx, o) {
    const X = (v) => o.x + (v - o.xmin) / (o.xmax - o.xmin) * o.w;
    const Y = o.ylog
      ? (v) => o.y + o.h - (Math.log10(Math.max(v, 1e-300)) - o.ymin) / (o.ymax - o.ymin) * o.h
      : (v) => o.y + o.h - (v - o.ymin) / (o.ymax - o.ymin) * o.h;
    ctx.save();
    ctx.font = '12px system-ui, sans-serif';
    ctx.lineWidth = 1;
    ctx.strokeStyle = C.line; ctx.fillStyle = C.muted;
    const xt = o.xticks || [];
    for (const t of xt) {
      const px = Math.round(X(t)) + .5;
      ctx.beginPath(); ctx.moveTo(px, o.y); ctx.lineTo(px, o.y + o.h); ctx.stroke();
      ctx.textAlign = 'center'; ctx.fillText(o.fmtx ? o.fmtx(t) : String(t), px, o.y + o.h + 16);
    }
    const yt = o.yticks || [];
    for (const t of yt) {
      const py = Math.round(Y(o.ylog ? Math.pow(10, t) : t)) + .5;
      ctx.beginPath(); ctx.moveTo(o.x, py); ctx.lineTo(o.x + o.w, py); ctx.stroke();
      ctx.textAlign = 'right'; ctx.fillText(o.fmty ? o.fmty(t) : String(t), o.x - 6, py + 4);
    }
    ctx.strokeStyle = C.muted; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(o.x, o.y + o.h); ctx.lineTo(o.x + o.w, o.y + o.h); ctx.stroke();
    ctx.fillStyle = C.muted; ctx.font = '13px system-ui, sans-serif';
    if (o.xlabel) { ctx.textAlign = 'right'; ctx.fillText(o.xlabel, o.x + o.w, o.y + o.h + 34); }
    if (o.ylabel) { ctx.textAlign = 'left'; ctx.fillText(o.ylabel, o.x - 40, o.y - 10); }
    ctx.restore();
    return { X, Y, x: o.x, y: o.y, w: o.w, h: o.h };
  }

  // Draw a function polyline, clipped to the plot box.
  function curve(ctx, f, fr, x0, x1, n, color, width, dash) {
    ctx.save();
    ctx.beginPath(); ctx.rect(fr.x - 1, fr.y - 2, fr.w + 2, fr.h + 4); ctx.clip();
    ctx.strokeStyle = color; ctx.lineWidth = width || 2; ctx.setLineDash(dash || []);
    ctx.beginPath();
    let pen = false;
    for (let i = 0; i <= n; i++) {
      const x = x0 + (x1 - x0) * i / n, y = f(x);
      if (!isFinite(y)) { pen = false; continue; }
      const px = fr.X(x), py = fr.Y(y);
      if (!pen) { ctx.moveTo(px, py); pen = true; } else ctx.lineTo(px, py);
    }
    ctx.stroke(); ctx.restore();
  }

  function dot(ctx, x, y, color, r) {
    ctx.save(); ctx.fillStyle = color; ctx.strokeStyle = C.card; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r || 5, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore();
  }

  // A charge carrier: soft glow, solid core, +/- glyph and an optional motion trail (px, drawn behind in -x).
  function carrier(ctx, x, y, col, o) {
    o = o || {};
    const r = o.r || 3, a = o.alpha === undefined ? 1 : o.alpha, tr = o.trail || 0;
    ctx.save();
    if (tr > 2) {
      ctx.lineCap = 'round'; ctx.strokeStyle = col; ctx.lineWidth = r * 1.1;
      for (let i = 0; i < 5; i++) {
        ctx.globalAlpha = a * 0.34 * (1 - i / 5);
        ctx.beginPath(); ctx.moveTo(x - tr * i / 5, y); ctx.lineTo(x - tr * (i + 1) / 5, y); ctx.stroke();
      }
    }
    ctx.fillStyle = col;
    ctx.globalAlpha = a * 0.16; ctx.beginPath(); ctx.arc(x, y, r * 2.7, 0, 7); ctx.fill();
    ctx.globalAlpha = a * 0.3; ctx.beginPath(); ctx.arc(x, y, r * 1.7, 0, 7); ctx.fill();
    ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1, r * 0.3); ctx.lineCap = 'round';
    const g = r * 0.5;
    ctx.beginPath(); ctx.moveTo(x - g, y); ctx.lineTo(x + g, y);
    if (o.sign === '+') { ctx.moveTo(x, y - g); ctx.lineTo(x, y + g); }
    ctx.stroke();
    ctx.restore();
  }

  // Wire a theme-change listener.
  function onTheme(fn) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { readTheme(); fn(); });
  }

  // Engineering format with unit prefix (input in base units).
  function eng(v, unit, d = 3) {
    if (v === 0) return '0 ' + unit;
    const a = Math.abs(v);
    const P = [[1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p'], [1e-15, 'f']];
    for (const [m, s] of P) if (a >= m * 0.9995) { const x = v / m; return (Math.abs(x) >= Math.pow(10, d) ? String(Math.round(x)) : x.toPrecision(d)) + ' ' + s + unit; }
    return v.toExponential(1) + ' ' + unit;
  }

  return { $, C, readTheme, setupCanvas, subText, niceStep, roundRect, fmtV, reduceMotion, plotFrame, curve, dot, onTheme, eng, carrier, anim };
})();
