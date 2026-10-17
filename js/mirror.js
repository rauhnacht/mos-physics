// Mirrors sliders / segmented toggles of one card into another, so a value can be changed from either place.
(() => {
  'use strict';
  function sync(src, clone) { if (clone.value !== src.value) clone.value = src.value; }
  function mirrorSliders(box) {
    for (const id of box.dataset.src.split(/\s+/)) {
      const src = document.getElementById(id);
      if (!src) continue;
      const ctl = src.closest('.ctl');
      const c = ctl.cloneNode(true);
      const inp = c.querySelector('input'), lab = c.querySelector('label'), out = c.querySelector('output');
      inp.id = id + '-m'; if (lab) lab.setAttribute('for', inp.id); if (out) out.id = (out.id || id) + '-m';
      const srcOut = ctl.querySelector('output');
      const pull = () => { sync(src, inp); inp.min = src.min; inp.max = src.max; if (out && srcOut) out.innerHTML = srcOut.innerHTML; };
      inp.addEventListener('input', () => { src.value = inp.value; src.dispatchEvent(new Event('input', { bubbles: true })); pull(); });
      src.addEventListener('input', pull);
      if (srcOut) new MutationObserver(pull).observe(srcOut, { childList: true, characterData: true, subtree: true });
      box.appendChild(c); pull();
      document.addEventListener('DOMContentLoaded', pull);
    }
  }
  function mirrorSeg(box) {
    const src = document.getElementById(box.dataset.src);
    if (!src) return;
    const make = () => {
      box.innerHTML = '';
      src.querySelectorAll('button').forEach((b) => {
        const c = b.cloneNode(true);
        c.addEventListener('click', () => b.click());
        box.appendChild(c);
      });
    };
    const pull = () => src.querySelectorAll('button').forEach((b, i) => { const c = box.children[i]; if (c) c.setAttribute('aria-pressed', b.getAttribute('aria-pressed')); });
    make(); pull();
    new MutationObserver(pull).observe(src, { attributes: true, attributeFilter: ['aria-pressed'], subtree: true });
  }
  document.querySelectorAll('.mirror').forEach(mirrorSliders);
  document.querySelectorAll('.mirror-seg').forEach(mirrorSeg);
})();
