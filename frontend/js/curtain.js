/**
 * HAWAM DESIGN — Curtain entrance controller
 *
 * Responsible only for the overlay lifecycle: open → dismiss → hand off.
 * Knows nothing about the hero; it just fires `hawam:entranceComplete` on
 * `document` once the stage is clear, which js/hero.js listens for. Keeping
 * these decoupled means either can be reworked later without touching the
 * other.
 */
(function () {
  'use strict';

  var overlay = document.getElementById('curtainOverlay');
  var trigger = document.getElementById('curtainTrigger');
  var skipIntro = document.getElementById('skipIntro');

  if (!overlay || !trigger) return;

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasRun = false;

  function curtainDurationMs() {
    var raw = getComputedStyle(document.documentElement)
      .getPropertyValue('--curtain-duration')
      .trim();
    var seconds = parseFloat(raw) || 0;
    return seconds * 1000;
  }

  function finishEntrance() {
    overlay.classList.add('is-dismissed');
    document.body.classList.remove('no-scroll');
    document.body.classList.add('entrance-done');

    // Give the overlay's own opacity transition (see entrance.css) time to
    // finish before pulling it out of the layout entirely.
    window.setTimeout(function () {
      overlay.style.display = 'none';
    }, 650);

    document.dispatchEvent(new CustomEvent('hawam:entranceComplete'));
  }

  function openCurtain() {
    if (hasRun) return;
    hasRun = true;

    trigger.disabled = true;
    trigger.setAttribute('tabindex', '-1');

    if (reducedMotion) {
      finishEntrance();
      return;
    }

    overlay.classList.add('is-opening');
    window.setTimeout(finishEntrance, curtainDurationMs());
  }

  function skipEntrance(event) {
    if (event) event.preventDefault();
    if (hasRun) return;
    hasRun = true;
    trigger.disabled = true;
    trigger.setAttribute('tabindex', '-1');
    finishEntrance();
  }

  trigger.addEventListener('click', openCurtain);

  if (skipIntro) {
    skipIntro.addEventListener('click', skipEntrance);
  }

  // Respect the OS-level preference outright: no animation is ever shown,
  // the hero is simply revealed. Deferred a tick so js/hero.js — the next
  // <script defer> — has finished executing and attached its listener for
  // `hawam:entranceComplete` before this fires it; firing synchronously
  // here would dispatch the event before anyone is listening for it.
  if (reducedMotion) {
    overlay.style.transition = 'none';
    window.setTimeout(skipEntrance, 0);
  }
})();
