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
Also (found while verifying the fixes below): on desktop, `translateX(-100%)`
only moves each inner-curtain panel by its own width, which isn't enough to
clear it from the glass area it starts in the middle of — it ends up
resting just outside its start position rather than tucked away. Not yet
fixed; doesn't affect mobile, where `.inner-curtain` is `display: none`.

## Latest fixes (mobile "curtain doesn't fully open" + font + entrance motion)

Reported via real phone screenshots: the curtain didn't clear the screen on
mobile, the hero/inner Hebrew font didn't look luxurious, and the
entrance/front text should animate in on load and stand out more.

- **Curtain not fully clearing (mobile and desktop)**: `translateX` values
  of `-84%`/`84%` (earlier retiming leftovers) never actually moved each
  `.curtain-panel` fully off-screen. Panel width is 52.5% (desktop) /
  53.5% (mobile) of viewport, starting at `left: -1%`, so its far edge
  sits at roughly 51.5–52.5vw — moving it by only 84% of its *own* width
  left several vw of fabric still overlapping the hero content, cutting
  into the headline as seen in the screenshots. Fixed to `-108%`/`108%`
  (100% is the exact clearing point; the extra 8% is a safety margin),
  applied at both the desktop and the `@media (max-width: 767px)` rule.
  Verified numerically via `getBoundingClientRect()` on both breakpoints,
  not just visually.
- **Hebrew font not luxurious**: `--font-display` named `"Noto Serif
  Hebrew"` as its Hebrew fallback, but that family was never loaded via a
  `<link>` in `index.html` — since Cormorant Garamond has zero Hebrew
  glyph coverage, every Hebrew headline was silently falling back to the
  browser's generic system serif the whole time. Added Frank Ruhl Libre
  (an actual elegant Hebrew serif) to the Google Fonts `<link>` and
  updated the CSS variable to reference it.
- **Entrance text needs to animate in and stand out**: `.entrance-copy`
  (the "HAWAM DESIGN" brand mark + CTA) now fades/slides in on load via a
  keyframe animation (`entrance-copy-enter`, `.3s` delay, `1.1s` duration)
  instead of just appearing statically, and the gold text's `text-shadow`
  was strengthened (from a single soft shadow to a two-layer shadow) for
  legibility over the bright curtain photo. One regression caught during
  verification: the animation was first given `animation-fill-mode: both`,
  which permanently pins an animation's end-state over any `transition` on
  the same property — this blocked the existing open-state fade-out, so
  the entrance text stayed visible on top of the hero after the curtain
  opened. Fixed by using `backwards` instead (only affects the
  pre-animation delay, not what happens after).
