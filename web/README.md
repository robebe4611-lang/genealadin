# HAWAM DESIGN — web (Lovable port)

A real, working Vite + React + Tailwind v4 project, ported from the
Lovable project's source (`HawamExperience.tsx`, `Button.tsx`,
`styles.css`) and continued here per request. This supersedes the
`frontend/` prototype as the active codebase going forward.

Simplifications from the original Lovable source: this is a plain Vite
SPA, not a full TanStack Start app — the root/index route files (meta
tags, error boundaries, `QueryClientProvider`) were infrastructure, not
part of the actual design, and were dropped rather than reproduced. The
component and CSS content is otherwise ported faithfully.

## Run it

```
cd web
npm install
npm run dev
```

## Structure

```
web/
├── index.html
├── src/
│   ├── main.tsx                        entry — renders <HawamExperience />
│   ├── styles.css                      design tokens + all entrance/hero CSS
│   ├── assets/hawam-interior.jpg       real photo, client-supplied
│   ├── lib/utils.ts                    cn() helper (clsx + tailwind-merge)
│   └── components/
│       ├── ui/button.tsx               shadcn-style Button (cva variants)
│       └── hawam/HawamExperience.tsx   CurtainEntrance + HawamHero
```

## What's changed since the original Lovable source

- **Click dead-zone fix**: `.entrance-copy` sat on top of `.curtain-trigger`
  with no `pointer-events: none`, so clicking anywhere near the brand text
  except the CTA's exact label did nothing. Fixed.
- **Motion**: curtain-panel transition retimed to `1.5s`
  `cubic-bezier(.16,1,.3,1)` (was `1.85s` slow ease-in, briefly `.9s`
  which read as too fast) — same sharp/decisive curve, tuned duration.
  `translateX` only, no `scaleX`/`skewX` (see next point for why).
- **Entrance curtain photo**: `assets/curtain-panel.jpg` — a real client
  photo (AI-generated, iterated via chat) replaces the original 14-div
  gradient-fold `CurtainPanel`. One photo shows both panels meeting at a
  center seam; each side renders via `object-fit: cover` +
  `object-position` (left/right) on an `<img>`, not a CSS
  `background-size` percentage — the photo's aspect ratio is much
  narrower than the panel at desktop widths, so `background-size:auto`
  left gaps and `background-size:200%` stretched it; `object-fit:cover`
  crops to fill completely at a uniform scale, no distortion. This is
  also why the open transform is `translateX` only now: scaling a real
  photo non-uniformly (the old gradient's `scaleX` "gather") visibly
  warps it.
- **Color**: `--gold` token added. Entrance screen text (brand/CTA) uses
  it; hero text stays off-white (`--color-background`) with a stronger
  two-layer `text-shadow` so it doesn't wash out over the bright
  window/sky area of the photo.
- **Inner window curtain**: the photographed room has its own curtains
  framing the glass. A second small curtain (`.inner-curtain`, positioned
  from pixel-sampling the actual photo: glass spans ~35.5%–80% of frame
  width) covers that glass on load and opens after the entrance curtain
  clears (delay = entrance duration + a small beat — keep these in sync
  if you retime the entrance) — a second, smaller echo of the same
  reveal, now inside the room. Desktop only (see the comment in
  `styles.css` for why mobile's crop makes the measured positions
  unreliable there).

Known follow-up, not yet addressed: the inner curtain's fold style is the
same bold/high-contrast pattern as the entrance curtain, while the
photographed curtains in the shot are softer/sheerer — they read as two
different fabrics where they overlap rather than one continuous curtain.
