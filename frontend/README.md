# HAWAM DESIGN — Frontend (Entrance + Hero)

First-build prototype: the cinematic curtain entrance, its transition into
the homepage, and the hero section it reveals. No other pages/sections are
built yet — this is deliberately scoped.

## Run it

Any static file server works, e.g.:

```
cd frontend
python3 -m http.server 8080
```

Then open `http://localhost:8080/`.

## Structure

```
frontend/
├── index.html              entrance overlay markup + hero markup
├── css/
│   ├── variables.css        color/type/motion tokens — the only place
│   │                        colors and timings are defined
│   ├── base.css              reset, global a11y rules, reduced-motion kill switch
│   ├── entrance.css          curtain overlay, fabric panels, rail, skip-intro
│   └── hero.css              hero visual, scrim, text reveal, camera drift
├── js/
│   ├── curtain.js            owns the overlay lifecycle only; fires
│   │                         `hawam:entranceComplete` on `document` when done
│   └── hero.js                listens for that event, adds `.is-revealed`
└── assets/
    └── interior-hero.svg     abstract soft-focus interior placeholder —
                               swap for real architectural photography later
                               without touching any CSS/JS
```

`curtain.js` and `hero.js` are intentionally decoupled — they only talk
through the `hawam:entranceComplete` custom event, so either can be reworked
without touching the other.

## Extending this later

- New homepage sections go inside/after `<main id="hero">` in `index.html`.
  The hero's `height: 100vh` means normal content flow resumes cleanly right
  below it.
- All colors and motion timings live in `css/variables.css`. Don't
  hard-code a hex value or a duration anywhere else.
- To use real photography: replace `assets/interior-hero.svg` with a
  photo (same path, or update the one `<img>` reference in `index.html`
  and the `--hero-art` fallback in `hero.css`).
- Respects `prefers-reduced-motion` and ships a `<noscript>` fallback that
  shows the hero immediately with the overlay hidden.
