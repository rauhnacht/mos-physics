# MOS Device Physics - Interactive Notes

Static site (plain HTML/CSS/JS, no build step). Math is rendered with KaTeX from a CDN.

## Run locally
    python3 -m http.server 8000   # then open http://localhost:8000

## Deploy on GitHub Pages
Push to a repo, then Settings -> Pages -> Deploy from a branch -> `main` / `(root)`.

## Structure
- `index.html`  page and module sections
- `css/style.css`  theme (light/dark)
- `js/struct3d.js`  Module 1: draggable 3D view
- `js/gm.js`  Module 4: transconductance
- `js/second.js`  Module 5: body effect, channel-length modulation, subthreshold
- `js/caps.js`  Module 6: device capacitances
- `js/ss.js`  Modules 7 and 8: small-signal model, DC-to-AC recipe, SPICE Level 1, FinFET
- `js/iv.js`  Module 3: I-V characteristics (model, plots, cross-section animation)
- `js/mirror.js`  duplicates sliders into other cards
- `js/main.js`  hash router (one module per page, `#gm` etc.) and KaTeX rendering
