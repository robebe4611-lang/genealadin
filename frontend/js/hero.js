/**
 * HAWAM DESIGN — Hero reveal controller
 *
 * Purely reactive: waits for the curtain controller's completion event,
 * then adds `.is-revealed` to the hero. Every visual consequence of that
 * class (text fade/lift, camera drift) lives in css/hero.css, not here.
 */
(function () {
  'use strict';

  var hero = document.getElementById('hero');
  if (!hero) return;

  document.addEventListener('hawam:entranceComplete', function () {
    // rAF so the class addition happens on its own paint frame — avoids the
    // reveal transition being skipped if it lands in the same tick as other
    // layout work from the curtain dismissal.
    window.requestAnimationFrame(function () {
      hero.classList.add('is-revealed');
    });
  });
})();
