/* Portfolio Claude V3 — avatar poses. No dependencies.
   Each <img class="pose"> shows a still frame. In full motion it plays its animation a few times
   (under five seconds) when it comes into view, then rests on the still; pointing at or focusing its
   host plays it again. */
(function () {
  'use strict';
  var blobs = {};
  var getBlob = function (u) {
    return blobs[u] || (blobs[u] = fetch(u).then(function (r) { return r.ok ? r.blob() : null; }).catch(function () { return null; }));
  };

  function stop(img) {
    img._tok = (img._tok || 0) + 1;
    clearTimeout(img._t);
    var s = img.getAttribute('data-still'); if (s && img.getAttribute('src') !== s) img.src = s;
    if (img._url) { URL.revokeObjectURL(img._url); img._url = null; }
  }

  // a fresh object URL restarts the animation from its first frame without another download
  function play(img) {
    if (!img) return;
    var u = img.getAttribute('data-pose'); if (!u) return;
    var tok = img._tok = (img._tok || 0) + 1;
    var loop = +img.getAttribute('data-loop') || 1500, loops = +img.getAttribute('data-loops') || Math.max(1, Math.floor(4800 / loop));
    getBlob(u).then(function (b) {
      if (!b || img._tok !== tok) return;
      var old = img._url; img._url = URL.createObjectURL(b); img.src = img._url;
      if (old) URL.revokeObjectURL(old);
      img.dispatchEvent(new CustomEvent('pose:play', { bubbles: true }));
      clearTimeout(img._t);
      img._t = setTimeout(function () { if (img._tok === tok) stop(img); }, loops * loop);
    });
  }

  // switch an image to another pose (used by the contact panel and the project pager)
  function set(img, name) {
    var base = img.getAttribute('data-pose').replace(/pose-[a-z]+\.webp$/, '');
    img.setAttribute('data-pose', base + 'pose-' + name + '.webp');
    img.setAttribute('data-still', base + 'pose-' + name + '-still.webp');
    img.setAttribute('data-loop', ({ idle: 1440, wave: 1560, present: 1560, bench: 1680, arms: 1560, tablet: 1680, hologram: 1800 })[name] || 1500);
    if (!img._url) img.src = img.getAttribute('data-still');
  }

  window.Pose = { play: play, stop: stop, set: set };

  // the All work heading comes out of Badr's open hand: revealed as the hand opens (about 0.45 s in)
  Array.prototype.forEach.call(document.querySelectorAll('[data-gesture]'), function (host) {
    host.classList.add('gesture-ready');
    var told = false, tell = function () { if (told) return; told = true; host.classList.add('is-told'); };
    host.addEventListener('pose:play', function () { setTimeout(tell, 420); });
    setTimeout(function () { if (!('IntersectionObserver' in window)) tell(); }, 0);
    // if the animation cannot load, the heading must still appear once it is on screen
    var io2 = 'IntersectionObserver' in window && new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { setTimeout(tell, 2500); io2.disconnect(); }
    });
    if (io2) io2.observe(host);
  });

  var imgs = Array.prototype.slice.call(document.querySelectorAll('img.pose[data-pose]'));
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) play(e.target); else stop(e.target); });
    }, { threshold: 0.35 });
    imgs.forEach(function (i) { io.observe(i); });
  }
  imgs.forEach(function (i) {
    var host = i.closest('[data-pose-host]'); if (!host) return;
    var again = function () { if (!i._url) play(i); };
    host.addEventListener('pointerenter', again);
    host.addEventListener('focusin', again);
  });
})();
