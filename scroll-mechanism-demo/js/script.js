// Direct scroll-linked frame scrubbing. All 16 frames are already in the
// DOM (no src swapping, no network fetch mid-scroll) — only opacity is
// toggled, so there is nothing to flash or decode while scrolling.
// Progress is recomputed from scrollY on every frame; nothing is
// time-based, so scrolling up reverses identically.

const FRAME_COUNT = 16;
const HOLD_FROM = 0.85; // frame 15 holds steady for the last stretch before the pin releases

const frames = Array.from({ length: FRAME_COUNT }, (_, i) =>
  document.getElementById('zoomFrame' + i)
);

const stageWrap = document.getElementById('stageWrap');
const captionEl = document.getElementById('captionText');

const clamp01 = (v) => Math.max(0, Math.min(1, v));

let ready = false;
Promise.all(frames.map(img => {
  if (img.complete) return Promise.resolve();
  return new Promise(resolve => { img.addEventListener('load', resolve, { once: true }); });
})).then(() => { ready = true; render(); });

function getProgress() {
  const total = stageWrap.offsetHeight - window.innerHeight;
  if (total <= 0) return 0;
  return clamp01((window.scrollY - stageWrap.offsetTop) / total);
}

function render() {
  if (!ready) return; // keep frame 0 visible (its default state) until every frame has loaded

  const p = getProgress();
  const zoomT = clamp01(p / HOLD_FROM);
  // Snap to the nearest frame instead of cross-fading two adjacent ones —
  // blending two different crops as opacity overlaps produces a hazy
  // double-exposure look. The 16 frames are dense enough that a hard
  // switch still reads as a continuous push-in.
  const active = Math.round(zoomT * (FRAME_COUNT - 1));

  for (let i = 0; i < FRAME_COUNT; i++) {
    frames[i].style.opacity = i === active ? 1 : 0;
  }

  const captionOpacity = 1 - clamp01(p / 0.12);
  captionEl.style.opacity = captionOpacity;
}

let ticking = false;
function onScroll() {
  if (!ticking) {
    requestAnimationFrame(() => { render(); ticking = false; });
    ticking = true;
  }
}
document.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', render);
render();
