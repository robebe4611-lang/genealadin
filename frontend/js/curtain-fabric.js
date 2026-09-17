/**
 * HAWAM DESIGN — Procedural curtain fabric
 *
 * Paints each panel's folds into its <canvas class="curtain-panel__canvas">
 * instead of using a fixed CSS repeating-gradient. A repeat is exactly what
 * makes cloth read as "printed pattern" the moment a viewer's eye finds the
 * loop; nothing here repeats:
 *
 *   - fold widths are randomized per panel, not a fixed period
 *   - each fold's light/shadow curve is asymmetric (a random peak position,
 *     not a centered highlight) — real folds aren't lit dead-center
 *   - each fold drifts slightly left/right down the height of the panel
 *     (a sine wave with a random phase/period), so fold lines aren't
 *     perfectly straight verticals
 *   - a small per-row random multiplier breaks up any remaining banding
 *
 * Two panels get two different seeds, so the left and right curtains are
 * related but not mirror-identical — real curtain pairs never hang
 * perfectly symmetrically either.
 */
(function () {
  'use strict';

  // Deterministic PRNG so a given seed always paints the same curtain
  // (mulberry32 — small, fast, good-enough distribution for this).
  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Shadow → highlight ramp, palette tones only.
  const COLOR_STOPS = [
    { t: 0.0, c: [201, 189, 174] }, // stone — deepest fold shadow
    { t: 0.26, c: [233, 226, 216] }, // sand
    { t: 0.52, c: [246, 243, 237] }, // ivory
    { t: 0.8, c: [255, 255, 255] }, // white — the lit ridge
    { t: 1.0, c: [246, 243, 237] } // ivory falloff past the highlight
  ];

  function shadeToColor(v) {
    v = v < 0 ? 0 : v > 1 ? 1 : v;
    for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
      const a = COLOR_STOPS[i];
      const b = COLOR_STOPS[i + 1];
      if (v >= a.t && v <= b.t) {
        const f = (v - a.t) / (b.t - a.t || 1);
        return [
          Math.round(a.c[0] + (b.c[0] - a.c[0]) * f),
          Math.round(a.c[1] + (b.c[1] - a.c[1]) * f),
          Math.round(a.c[2] + (b.c[2] - a.c[2]) * f)
        ];
      }
    }
    return COLOR_STOPS[COLOR_STOPS.length - 1].c;
  }

  function buildFolds(rand, count) {
    // Irregular widths: draw a random weight per fold, normalize to 0..1.
    const weights = Array.from({ length: count }, () => 0.7 + rand() * 0.6);
    const total = weights.reduce((a, b) => a + b, 0);
    const folds = [];
    let acc = 0;
    for (let i = 0; i < count; i++) {
      const x0 = acc;
      acc += weights[i] / total;
      folds.push({
        x0: x0,
        x1: acc,
        peak: 0.32 + rand() * 0.34, // off-center highlight, not symmetric
        wavePhase: rand() * Math.PI * 2,
        waveAmp: 0.004 + rand() * 0.009, // horizontal drift, fraction of width
        wavePeriod: 240 + rand() * 260, // px of height per drift cycle
        boost: 0.88 + rand() * 0.28 // per-fold brightness variance
      });
    }
    return folds;
  }

  function renderFabric(canvas, seed) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    if (!ctx || !W || !H) return;

    const rand = mulberry32(seed);
    const folds = buildFolds(rand, 8 + Math.floor(rand() * 3));

    // Sample on a coarse grid, not per-pixel — this is a soft-lit fabric,
    // not a sharp texture, and it keeps the one-time render fast at any
    // screen size (grid cell count stays roughly constant).
    const cols = 170;
    const rows = Math.min(220, Math.round(cols * (H / W)));
    const stepX = W / cols;
    const stepY = H / rows;

    for (let ry = 0; ry < rows; ry++) {
      const y = ry * stepY;
      // Each fold's boundaries drift with y — computed once per row.
      const rowFolds = folds.map(function (f) {
        const drift = f.waveAmp * Math.sin(y / f.wavePeriod + f.wavePhase);
        return { x0: f.x0 + drift, x1: f.x1 + drift, peak: f.peak, boost: f.boost };
      });
      // Brighter near the rail, gently falling off toward the floor —
      // stands in for the window light the fabric is hanging in.
      const heightLight = 1.06 - 0.14 * (y / H);

      for (let rx = 0; rx < cols; rx++) {
        const x = rx * stepX;
        const xf = x / W;
        let fold = rowFolds[rowFolds.length - 1];
        for (let i = 0; i < rowFolds.length; i++) {
          if (xf >= rowFolds[i].x0 && xf < rowFolds[i].x1) {
            fold = rowFolds[i];
            break;
          }
        }
        const span = fold.x1 - fold.x0 || 0.001;
        const t = Math.max(0, Math.min(1, (xf - fold.x0) / span));
        // Asymmetric rounded ridge: two quarter-sine halves meeting at
        // the (randomized) peak, rather than one symmetric curve.
        const curve =
          t < fold.peak
            ? Math.sin((t / fold.peak) * (Math.PI / 2))
            : Math.sin(((1 - t) / (1 - fold.peak || 0.001)) * (Math.PI / 2));
        // Simulated directional light: the light-facing side of each
        // ridge reads brighter than its shadow-facing side.
        const lightBias = t < fold.peak ? 1.05 : 0.95;
        let shade = Math.pow(curve, 1.15) * fold.boost * lightBias * heightLight;
        shade *= 0.985 + rand() * 0.03; // fibre-level micro variance

        const rgb = shadeToColor(shade);
        ctx.fillStyle = 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
        ctx.fillRect(x, y, stepX + 1, stepY + 1);
      }
    }
  }

  function paintAll() {
    const canvases = document.querySelectorAll('.curtain-panel__canvas');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvases.forEach(function (canvas, i) {
      const panel = canvas.parentElement;
      const rect = panel.getBoundingClientRect();
      canvas.width = Math.max(200, Math.round(rect.width * dpr));
      canvas.height = Math.max(200, Math.round(rect.height * dpr));
      renderFabric(canvas, 1000 + i * 777);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', paintAll);
  } else {
    paintAll();
  }

  // Re-paint on resize (debounced) so folds stay crisp across breakpoints
  // instead of stretching a fixed-resolution bitmap.
  let resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(paintAll, 200);
  });
})();
