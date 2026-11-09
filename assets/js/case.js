/* Portfolio Claude V3 — project pages: entrance, field strip, pager guide, reveals. No dependencies.
   Content never depends on this script: without it the page is fully visible. */
(function () {
  'use strict';
  var root = document.documentElement;
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  if (!('IntersectionObserver' in window)) return;
  root.classList.add('case-ready');

  // entrance: title block in sequence, then the lead image opens. Arriving by a page transition, the
  // title has already morphed from its row in the index, so the title block is shown at once instead.
  // (The head script marks that arrival with data-vt: this deferred script runs after 'pagereveal'.)
  var viaTransition = root.hasAttribute('data-vt');
  if (viaTransition) $$('[data-enter]').forEach(function (el) { el.style.transition = 'none'; el.classList.add('is-in'); });
  var enter = $$(viaTransition ? '[data-enter-media]' : '[data-enter], [data-enter-media]');
  requestAnimationFrame(function () { requestAnimationFrame(function () {
    enter.forEach(function (el, i) { el.style.setProperty('--d', (0.08 + i * 0.09) + 's'); el.classList.add('is-in'); });
  }); });

  // the field strip under the title draws itself once the title has settled
  var motif = document.querySelector('[data-motif]');
  if (motif) setTimeout(function () { motif.classList.add('is-in'); }, viaTransition ? 450 : 650);

  // the guide in the pager points the way while a neighbouring project is under the pointer
  var guide = document.querySelector('.pager__pose');
  if (guide && window.Pose) {
    var home = guide.getAttribute('data-pose').match(/pose-([a-z]+)\.webp$/)[1];
    $$('.pager__link').forEach(function (l) {
      l.addEventListener('pointerenter', function () { Pose.set(guide, 'present'); Pose.play(guide); });
      l.addEventListener('pointerleave', function () { Pose.stop(guide); Pose.set(guide, home); });
    });
  }

  // sections rise in once as they reach the viewport
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -12% 0px' });
  $$('[data-reveal]').forEach(function (el) { io.observe(el); });

  // a page restored from the back-forward cache shows its final state
  addEventListener('pageshow', function (e) { if (e.persisted) $$('[data-reveal], [data-enter], [data-enter-media], [data-motif]').forEach(function (el) { el.classList.add('is-in'); }); });
})();
