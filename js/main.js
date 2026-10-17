// Hash router: one module visible at a time, plus math rendering.
(function () {
  var ORDER = ['home', 'structure', 'threshold', 'iv', 'gm', 'second', 'caps', 'ss', 'fin'];
  var TITLE = 'MOS Device Physics - Interactive Notes';
  function current() {
    var h = (location.hash || '').replace('#', '');
    return ORDER.indexOf(h) >= 0 ? h : 'home';
  }
  function show(first) {
    var id = current();
    document.querySelectorAll('section.module').forEach(function (s) { s.classList.toggle('active', s.id === id); });
    document.querySelectorAll('nav.tabs a').forEach(function (a) {
      if (a.dataset.tab === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    var sec = document.getElementById(id);
    document.title = (id === 'home' ? '' : sec.dataset.title + ' - ') + TITLE;
    if (!first) {
      window.scrollTo(0, 0);
      var h = sec.querySelector('h2, h1');
      if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    }
  }
  window.addEventListener('hashchange', function () { show(false); });
  document.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    var t = e.target && e.target.tagName;
    if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || t === 'BUTTON' || t === 'SUMMARY') return;
    var k = ORDER.indexOf(current());
    if (e.key === 'ArrowRight' && k < ORDER.length - 1) location.hash = ORDER[k + 1];
    if (e.key === 'ArrowLeft' && k > 0) location.hash = ORDER[k - 1];
  });
  function wireAnim() {
    var b = document.getElementById('anim-toggle');
    if (!b || !window.MOSUI) return;
    function label() {
      var on = MOSUI.anim.on;
      b.setAttribute('aria-pressed', String(on));
      b.textContent = on ? 'Animation: on' : 'Animation: off';
    }
    b.addEventListener('click', function () { MOSUI.anim.on = !MOSUI.anim.on; label(); });
    if (!MOSUI.anim.on) b.title = 'Your system asks for reduced motion, so animation starts paused. Click to play.';
    label();
  }
  document.addEventListener('DOMContentLoaded', function () {
    show(true); wireAnim();
    if (typeof renderMathInElement !== 'function') return; // CDN blocked: formulas stay as plain text
    renderMathInElement(document.body, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '\\[', right: '\\]', display: true },
        { left: '\\(', right: '\\)', display: false }
      ],
      throwOnError: false
    });
  });
})();
