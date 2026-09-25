// Header background on scroll
const header = document.getElementById('siteHeader');
const onScroll = () => {
  if (window.scrollY > 40) header.classList.add('scrolled');
  else header.classList.remove('scrolled');
};
document.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const mainNav = document.getElementById('mainNav');
navToggle.addEventListener('click', () => {
  mainNav.classList.toggle('open');
  document.body.classList.toggle('nav-open');
});
mainNav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    mainNav.classList.remove('open');
    document.body.classList.remove('nav-open');
  });
});

// Scroll reveal
const revealEls = document.querySelectorAll('.reveal');
const io = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });
revealEls.forEach(el => io.observe(el));

// Subtle parallax on hero + showcase background
const heroBg = document.querySelector('.hero-bg');
const showcaseBg = document.querySelector('.showcase-bg');
let ticking = false;
const applyParallax = () => {
  const y = window.scrollY;
  if (heroBg) heroBg.style.transform = `translateY(${y * 0.15}px)`;
  if (showcaseBg) {
    const rect = showcaseBg.parentElement.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      showcaseBg.style.transform = `translateY(${rect.top * 0.12}px)`;
    }
  }
  ticking = false;
};
document.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(applyParallax);
    ticking = true;
  }
}, { passive: true });

// Gallery filter
const filterBtns = document.querySelectorAll('.filter-btn');
const galleryItems = document.querySelectorAll('.gallery-item');
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filter = btn.dataset.filter;
    galleryItems.forEach(item => {
      const match = filter === 'all' || item.dataset.cat === filter;
      item.classList.toggle('hidden', !match);
    });
  });
});

// Assemble / explode / reassemble scroll sequence
if (window.gsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);

  // Single-line "exploded diagram" layout, right-to-left reading order (01 → 04)
  // Computed in px (not CSS vw/vh strings — GSAP's x/y transform tween does not
  // reliably resolve viewport units against the right base).
  const vw = window.innerWidth / 100;
  const vh = window.innerHeight / 100;
  const parts = {
    rod: { el: '#partRod', assembled: { x: 0, y: -150, rotate: 0, scale: 1 }, exploded: { x: 34 * vw, y: 4 * vh, rotate: 0, scale: 1 } },
    rings: { el: '#partRings', assembled: { x: 0, y: -85, rotate: 0, scale: 1 }, exploded: { x: 12 * vw, y: 4 * vh, rotate: 0, scale: 1 } },
    fabric: { el: '#partFabric', assembled: { x: 0, y: 40, rotate: 0, scale: 1 }, exploded: { x: -12 * vw, y: 4 * vh, rotate: 0, scale: 1.05 } },
    tieback: { el: '#partTieback', assembled: { x: 55, y: 120, rotate: 0, scale: 1 }, exploded: { x: -34 * vw, y: 4 * vh, rotate: 0, scale: 1 } }
  };

  Object.values(parts).forEach(p => {
    gsap.set(p.el, { xPercent: -50, yPercent: -50, x: p.assembled.x, y: p.assembled.y, rotate: p.assembled.rotate, scale: p.assembled.scale, opacity: 1 });
  });
  gsap.set(['.part-label', '.part-num'], { opacity: 0 });
  gsap.set('#assembleLine', { scaleX: 0, y: '4vh' });
  gsap.set('#assembleWordmark', { opacity: 0, xPercent: -50, yPercent: -50, top: '50%', left: '50%' });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: '#assemble',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1
    }
  });

  // 1) assembled -> exploded (single line), guide line draws, labels fade in
  Object.values(parts).forEach(p => {
    tl.to(p.el, { x: p.exploded.x, y: p.exploded.y, rotate: p.exploded.rotate, scale: p.exploded.scale, duration: 1, ease: 'power2.inOut' }, 0);
  });
  tl.to('#assembleLine', { scaleX: 1, duration: 1, ease: 'power2.inOut' }, 0);
  tl.to(['.part-num', '.part-label'], { opacity: 1, duration: 0.4, stagger: 0.05 }, 0.55);

  // hold exploded briefly
  tl.to({}, { duration: 0.5 }, 1.2);

  // 2) exploded -> reassembled, guide line retracts, labels fade out
  tl.to(['.part-label', '.part-num'], { opacity: 0, duration: 0.3 }, 1.7);
  tl.to('#assembleLine', { scaleX: 0, duration: 0.6, ease: 'power2.inOut' }, 1.7);
  Object.values(parts).forEach(p => {
    tl.to(p.el, { x: p.assembled.x, y: p.assembled.y, rotate: p.assembled.rotate, scale: p.assembled.scale, duration: 1, ease: 'power2.inOut' }, 1.9);
  });

  // hold reassembled
  tl.to({}, { duration: 0.4 }, 2.9);

  // 3) fade parts out, wordmark in
  Object.values(parts).forEach(p => {
    tl.to(p.el, { opacity: 0, duration: 0.5, ease: 'power1.out' }, 3.3);
  });
  tl.to('#assembleCaption', { opacity: 0, duration: 0.4 }, 3.3);
  tl.to('#assembleWordmark', { opacity: 1, duration: 0.6, ease: 'power1.out' }, 3.6);

  // hold wordmark to end
  tl.to({}, { duration: 0.6 }, 4.2);

  // Caption text swap keyed to scroll progress
  const eyebrow = document.getElementById('assembleEyebrow');
  const title = document.getElementById('assembleTitle');
  ScrollTrigger.create({
    trigger: '#assemble',
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => {
      const p = self.progress;
      if (p < 0.32) {
        eyebrow.textContent = 'כל וילון הוא הרכבה מדויקת';
        title.innerHTML = 'כמה חלקים.<br>פרט אחד מושלם.';
      } else if (p < 0.62) {
        eyebrow.textContent = 'כל רכיב, נבחר בקפידה';
        title.innerHTML = 'בד, פליז וחוט —<br>שום דבר במקרה.';
      } else {
        eyebrow.textContent = 'וחוזרים להיות וילון אחד';
        title.innerHTML = 'זה מה שקורה<br>כשהכל מדויק.';
      }
    }
  });
}

// Contact form (demo only — no backend wired yet)
const form = document.getElementById('contactForm');
const formNote = document.getElementById('formNote');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  formNote.textContent = 'תודה! זהו דמו לצורך הצגה — הטופס עדיין לא מחובר לשליחה בפועל.';
});
