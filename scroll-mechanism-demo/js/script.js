gsap.registerPlugin(ScrollTrigger);

const hero = '#layerHero';
const texture = '#layerTexture';
const collections = '#layerCollections';

gsap.set(hero, { scale: 1, opacity: 1 });
gsap.set(texture, { scale: 1.18, opacity: 0 });
gsap.set(collections, { scale: 1.18, opacity: 0 });

const tl = gsap.timeline({
  scrollTrigger: {
    trigger: '#stageWrap',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.4 // low smoothing so it reads as directly scroll-linked, not floaty
  }
});

// Phase 1: hero pushes in and fades, texture crossfades in on top of it (0 -> 0.45)
tl.to(hero, { scale: 1.35, opacity: 0, ease: 'none', duration: 0.45 }, 0);
tl.to(texture, { scale: 1.0, opacity: 1, ease: 'none', duration: 0.4 }, 0.08);

// hold on texture briefly (0.45 -> 0.55)

// Phase 2: texture pushes in and fades, collections crossfades in on top (0.55 -> 1.0)
tl.to(texture, { scale: 1.3, opacity: 0, ease: 'none', duration: 0.42 }, 0.55);
tl.to(collections, { scale: 1.0, opacity: 1, ease: 'none', duration: 0.4 }, 0.62);

// Caption text swap, keyed directly to the same scroll progress (bidirectional automatically)
const captionText = document.getElementById('captionText');
const captions = [
  { until: 0.35, text: 'וילון יוקרתי' },
  { until: 0.65, text: 'כל קפל, מרקם משלו' },
  { until: 1.01, text: 'הקולקציות שלנו' }
];

const readout = document.getElementById('progressReadout');

ScrollTrigger.create({
  trigger: '#stageWrap',
  start: 'top top',
  end: 'bottom bottom',
  onUpdate: (self) => {
    const p = self.progress;
    readout.textContent = 'progress: ' + p.toFixed(2);
    const match = captions.find(c => p < c.until) || captions[captions.length - 1];
    if (captionText.textContent !== match.text) captionText.textContent = match.text;
  }
});
