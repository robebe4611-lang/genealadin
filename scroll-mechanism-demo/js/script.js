// Direct scroll-linked scrubbing — no GSAP, no easing/smoothing lag.
// Progress is recomputed from scrollY on every frame and every visual
// property is set directly from it, so scrolling up reverses identically.

const ZOOM_FRAME_COUNT = 16;
const zoomFrameUrls = Array.from({ length: ZOOM_FRAME_COUNT }, (_, i) =>
  `assets/zoom/hawam_zoom_${String(i).padStart(2, '0')}.jpg`
);
zoomFrameUrls.forEach(src => { const im = new Image(); im.src = src; }); // preload

const stageWrap = document.getElementById('stageWrap');
const zoomImgA = document.getElementById('zoomImgA');
const zoomImgB = document.getElementById('zoomImgB');
const layerZoom = document.getElementById('layerZoom');
const layerCollections = document.getElementById('layerCollections');
const captionText = document.getElementById('captionText');
const readout = document.getElementById('progressReadout');

zoomImgA.src = zoomFrameUrls[0];
zoomImgB.src = zoomFrameUrls[1];
zoomImgB.style.opacity = 0;

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smoothstep = (a, b, x) => clamp01((x - a) / (b - a));

const captions = [
  { until: 0.28, text: 'וילון יוקרתי' },
  { until: 0.55, text: 'כל קפל, מרקם משלו' },
  { until: 1.01, text: 'הקולקציות שלנו' }
];

function getProgress() {
  const total = stageWrap.offsetHeight - window.innerHeight;
  if (total <= 0) return 0;
  return clamp01((window.scrollY - stageWrap.offsetTop) / total);
}

function render() {
  const p = getProgress();
  readout.textContent = 'progress: ' + p.toFixed(2);

  // Phase 1 (0 -> 0.55): scrub through the 16 real zoom frames.
  const zoomT = clamp01(p / 0.55);
  const frameFloat = zoomT * (ZOOM_FRAME_COUNT - 1);
  const lo = Math.floor(frameFloat);
  const hi = Math.min(lo + 1, ZOOM_FRAME_COUNT - 1);
  const frac = frameFloat - lo;
  zoomImgA.src = zoomFrameUrls[lo];
  zoomImgB.src = zoomFrameUrls[hi];
  zoomImgB.style.opacity = frac;

  // Phase 2 (0.55 -> 0.85): crossfade the zoomed-in frame into collections.
  const zoomOpacity = 1 - smoothstep(0.55, 0.85, p);
  const collProgress = smoothstep(0.6, 0.9, p);
  layerZoom.style.opacity = zoomOpacity;
  layerCollections.style.opacity = collProgress;
  layerCollections.style.transform = `scale(${1.18 - 0.18 * collProgress})`;

  const match = captions.find(c => p < c.until) || captions[captions.length - 1];
  if (captionText.textContent !== match.text) captionText.textContent = match.text;
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
