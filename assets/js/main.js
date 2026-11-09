/* Portfolio Claude V3 — "Into the Work"
   One continuous shot: a title sequence over the greeting plate, the name across the frame, then a
   scroll-driven camera that passes Badr, slides signage past, pushes into the inspection monitor and
   lets the monitor open into the project's own software. A single state object drives the camera,
   so the whole shot is exactly reversible. */
(function () {
  'use strict';
  var root = document.documentElement;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var hasGsap = window.gsap && window.ScrollTrigger && window.SplitText;

  /* ----------------------------------------------------------- the index of all work: filters and preview
     The filters work without GSAP; the hover preview is for fine pointers only. */
  (function initIndex() {
    var box = $('[data-filters]'); if (!box) return;
    box.hidden = false;
    var chips = $$('[data-filter]', box), groups = $$('[data-group]');
    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        var f = c.dataset.filter;
        chips.forEach(function (x) { var on = x === c; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', String(on)); });
        groups.forEach(function (g) { g.hidden = f !== 'all' && g.dataset.group !== f; });
        if (window.ScrollTrigger) ScrollTrigger.refresh();
      });
    });
    var pv = $('[data-preview-box]'), pimg = $('[data-preview-img]');
    if (!pv || !matchMedia('(pointer: fine)').matches) return;
    $$('.row').forEach(function (r) {
      var show = function () {
        if (r.dataset.preview) { if (pimg.getAttribute('src') !== r.dataset.preview) pimg.src = r.dataset.preview; pv.classList.add('is-on'); }
        else pv.classList.remove('is-on');
      };
      r.addEventListener('mouseenter', show); r.addEventListener('focus', show);
    });
    $('.index__groups').addEventListener('mouseleave', function () { pv.classList.remove('is-on'); });
  })();

  var film = $('[data-film]'), frame = $('[data-frame]'), stage = $('[data-stage]'), video = $('[data-video]');
  var screen = $('[data-screen]'), grade = $('[data-grade]'), shade = $('[data-shade]'), card = $('[data-card]');
  var nameEl = $('[data-name]');

  /* ----------------------------------------------------------- the name fills the frame width exactly */
  function fitName() {
    if (!nameEl) return;
    var hero = $('[data-hero]'), avail = hero.clientWidth;
    nameEl.style.fontSize = '100px';
    var parts = $$('.nm', nameEl), stacked = parts.length && getComputedStyle(parts[0]).display === 'block';
    // measure the glyphs themselves (a Range), not the boxes: grid items and stacked lines are always full width
    var textW = function (el) { var r = document.createRange(); r.selectNodeContents(el); return r.getBoundingClientRect().width; };
    var w = stacked ? Math.max.apply(null, parts.map(textW)) : textW(nameEl);
    nameEl.style.fontSize = Math.floor(100 * avail / w * 0.995) + 'px';
  }
  fitName();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitName);

  /* ----------------------------------------------------------- avatar greeting: muted, inline, looping */
  function play() { video.muted = true; var p = video.play(); if (p && p.catch) p.catch(function () {}); }
  if (video) {
    video.addEventListener('playing', function () { video.classList.add('is-playing'); });
    if (video.readyState >= 2) play(); else video.addEventListener('canplay', play, { once: true });
    // plays only while on screen and while the tab is visible
    new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) play(); else video.pause(); }); }, { threshold: 0.01 }).observe(frame);
    document.addEventListener('visibilitychange', function () { if (document.hidden) video.pause(); else if (frame.getBoundingClientRect().bottom > 0) play(); });
  }

  /* ----------------------------------------------------------- camera geometry (plate pixels) */
  var MON = { x: 978, y: 282, w: 106, h: 62 };          // the left workstation monitor in the 1280×720 plate
  var MC = { x: MON.x + MON.w / 2, y: MON.y + MON.h / 2 };
  var BADR = { x: 614, y: 330 };                         // Badr's standing position in the plate
  var MAX_SCALE = 2.3;                                   // never enlarge the 720p plate beyond this; the sharp screen takes over
  var g = {};
  var blur = matchMedia('(min-width: 901px) and (pointer: fine)').matches;
  function measure() {
    var vw = innerWidth, vh = innerHeight, mobile = vw < 761;
    g.vw = vw; g.vh = vh; g.mobile = mobile;
    g.cover = Math.max(vw / 1280, vh / 720);
    g.base = g.cover * 1.02;
    g.anchor = 0.5;                                       // Badr centred, the name across the bottom
    g.s1 = Math.max(g.base * 1.15, Math.min(MAX_SCALE, (mobile ? 0.9 : 0.58) * vw / MON.w));
  }
  var clamp = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  // st.e: entrance settle; st.c: camera push (0 → 1); st.q: screen opening (0 → 1); st.px/py: pointer parallax
  var st = { e: 1.12, c: 0, q: 0, px: 0, py: 0 };

  function apply() {
    var vw = g.vw, vh = g.vh;
    var s0 = g.base * st.e;
    var s = s0 * Math.pow(g.s1 / s0, Math.pow(st.c, 1.5));
    // top-aligned framing: on wide screens the extra plate height is cropped from the floor, never from Badr's head
    var hx = g.anchor * vw - BADR.x * s0, hy = 0;
    var start = { x: hx + MC.x * s0, y: hy + MC.y * s0 };
    var cx = lerp(start.x, vw * 0.5, st.c), cy = lerp(start.y, vh * 0.46, st.c);
    var par = 1 - st.c;
    var tx = clamp(cx - MC.x * s + st.px * par, vw - 1280 * s, 0);   // the plate always covers the frame
    var ty = clamp(cy - MC.y * s + st.py * par, vh - 720 * s, 0);
    stage.style.transform = 'translate3d(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px,0) scale(' + s.toFixed(5) + ')';
    // depth of field: as the camera nears the bench the plate softens, so its resolution reads as focus
    if (blur) { var b = clamp((st.c - 0.35) * 4, 0, 2.2) * (1 - st.q); stage.style.filter = b > 0.05 ? 'blur(' + b.toFixed(2) + 'px)' : ''; }

    // the monitor's rectangle on screen, then opened toward the full frame
    var R = { x: tx + MON.x * s, y: ty + MON.y * s, w: MON.w * s, h: MON.h * s };
    var q = st.q, Ix = lerp(R.x, 0, q), Iy = lerp(R.y, 0, q), Iw = lerp(R.w, vw, q), Ih = lerp(R.h, vh, q);
    var k = Math.max(Iw / vw, Ih / vh);
    var ex = Ix + Iw / 2 - vw * k / 2, ey = Iy + Ih / 2 - vh * k / 2;
    var ih = Math.max(0, (vw * k - Iw) / 2 / k), iv = Math.max(0, (vh * k - Ih) / 2 / k), r = lerp(3, 0, q) / k;
    screen.style.transform = 'translate3d(' + ex.toFixed(2) + 'px,' + ey.toFixed(2) + 'px,0) scale(' + k.toFixed(5) + ')';
    screen.style.clipPath = 'inset(' + iv.toFixed(2) + 'px ' + ih.toFixed(2) + 'px round ' + r.toFixed(2) + 'px)';
  }

  // the hero framing is geometry, not motion: without GSAP the same composition is held still
  root.classList.add('is-camera');
  if (!hasGsap) st.e = 1;
  measure(); apply();
  if (!hasGsap) {
    addEventListener('resize', function () { measure(); apply(); fitName(); });
    root.classList.add('is-live'); railSpy(); return;
  }

  gsap.registerPlugin(ScrollTrigger, SplitText);
  ScrollTrigger.config({ ignoreMobileResize: true });
  root.classList.add('is-live');

  /* ----------------------------------------------------------- kinetic type setup */
  var chars = [];
  $$('.nm', nameEl).forEach(function (n) { chars = chars.concat(new SplitText(n, { type: 'chars', charsClass: 'ch' }).chars); });
  var cardTitle = new SplitText($('[data-card-title]'), { type: 'lines', mask: 'lines' });
  var titles = $$('[data-titles] span');
  var bars = $$('[data-bar]');
  var heroBits = $$('[data-kicker], .hero__row');
  var sign = $('[data-sign]');

  gsap.set(chars, { yPercent: 115 });
  gsap.set(heroBits, { autoAlpha: 0, y: 24 });
  gsap.set('[data-masthead], [data-rail]', { autoAlpha: 0 });
  gsap.set(cardTitle.lines, { yPercent: 105 });

  /* ----------------------------------------------------------- 1. entrance: shutter, title sequence, the name */
  var bar = function () { return g.mobile ? '4.5%' : '7%'; };
  var intro = gsap.timeline({ delay: 0.1, defaults: { ease: 'expo.out' } });
  intro
    .to(bars, { height: bar, duration: 1.1, ease: 'expo.inOut' }, 0)
    .to(st, { e: 1, duration: 3.8, ease: 'power2.out', onUpdate: apply }, 0);
  titles.forEach(function (w, i) {
    // strictly one word at a time: in by a rising mask, out by a wipe, before the next arrives
    var t = 0.4 + i * 0.62;
    intro
      .fromTo(w, { autoAlpha: 1, clipPath: 'inset(0% 0% 100% 0%)', yPercent: 14, scale: 1.16 }, { clipPath: 'inset(0% 0% 0% 0%)', yPercent: 0, scale: 1, duration: 0.4 }, t)
      .to(w, { clipPath: 'inset(0% 0% 0% 100%)', xPercent: -3, duration: 0.2, ease: 'power3.in' }, t + 0.4)
      .set(w, { autoAlpha: 0 }, t + 0.6);
  });
  intro
    .to(chars, { yPercent: 0, duration: 1.1, stagger: { each: 0.03, from: 'center' } }, 2.85)
    .to(heroBits, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.1 }, 3.3)
    .to('[data-masthead], [data-rail]', { autoAlpha: 1, duration: 0.8, ease: 'power2.out' }, 3.4)
    .to('[data-bar="top"]', { height: 0, duration: 0.9, ease: 'expo.inOut' }, 3.2)
    .add(function () { nameEl.classList.add('is-free'); }, 4.0)   // masks only matter for the entrance; free the letters to fly
    .add(startTicker, 4.1);

  // the sequence never stands between a visitor and the page: any input jumps to its end
  var skipEvents = ['wheel', 'touchstart', 'keydown', 'pointerdown'];
  var shot;   // the scroll timeline, created below
  function skip() {
    if (intro.progress() < 1) {
      intro.progress(1);
      // the entrance's end state must not override where the shot already is: re-render the shot on top
      if (shot) { var p = shot.progress(); shot.progress(0, true).progress(p, true); apply(); }
    }
    skipEvents.forEach(function (t) { removeEventListener(t, skip); });
  }
  skipEvents.forEach(function (t) { addEventListener(t, skip, { passive: true }); });
  if (scrollY > 10) skip();

  /* ambient: the discipline line keeps cycling without any input */
  function startTicker() {
    var track = $('[data-ticker]'); if (!track || track.dataset.on) return;
    track.dataset.on = '1';
    var items = $$('b', track); track.appendChild(items[0].cloneNode(true));
    var n = items.length, step = 100 / (n + 1);
    var w = Math.max.apply(null, items.map(function (b) { return b.scrollWidth; }));
    track.parentNode.style.width = w + 'px';
    var t = gsap.timeline({ repeat: -1 });
    for (var i = 1; i <= n; i++) t.to(track, { yPercent: -step * i, duration: 0.7, ease: 'expo.inOut' }, '+=1.9');
    t.set(track, { yPercent: 0 });
  }

  /* ambient: a touch of 2.5D depth under the pointer (fine pointers only) */
  if (matchMedia('(pointer: fine)').matches) {
    var qx = gsap.quickTo(st, 'px', { duration: 1.2, ease: 'power3.out', onUpdate: apply });
    var qy = gsap.quickTo(st, 'py', { duration: 1.2, ease: 'power3.out', onUpdate: apply });
    var hx = gsap.quickTo('[data-hero]', 'x', { duration: 1.2, ease: 'power3.out' });
    addEventListener('pointermove', function (e) {
      var nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
      qx(-nx * 22); qy(-ny * 14); hx(nx * 10);
    }, { passive: true });
  }

  /* ----------------------------------------------------------- 2. the shot: scroll drives the camera */
  var mid = (chars.length - 1) / 2;
  shot = gsap.timeline({ defaults: { ease: 'none' }, onUpdate: apply });
  shot
    // a held beat on Badr; the name breathes out
    .to(chars, { x: function (i) { return (i - mid) * (g.mobile ? 2 : 5); }, duration: 0.08, ease: 'power1.inOut' }, 0)
    .to(heroBits, { y: -30, autoAlpha: 0, duration: 0.1, stagger: 0.02, ease: 'power1.in' }, 0.03)
    // then the letters fly at the camera, from the centre outwards
    .to(chars, { scale: 2.8, yPercent: -70, autoAlpha: 0, duration: 0.14, stagger: { each: 0.006, from: 'center' }, ease: 'power2.in' }, 0.08)
    .to(grade, { autoAlpha: 0.35, duration: 0.3 }, 0.12)
    .to('[data-rail]', { autoAlpha: 0, duration: 0.06 }, 0.2)
    // pan across the workshop, past Badr, and push in on the bench
    .to(st, { c: 1, duration: 0.62, ease: 'power1.inOut' }, 0.1)
    // signage slides past faster than the camera, like lettering on a wall nearer the lens
    .fromTo(sign, { x: function () { return innerWidth * 0.95; } }, { x: function () { return -sign.offsetWidth - innerWidth * 0.1; }, duration: 0.36, immediateRender: false }, 0.2)
    .fromTo(sign, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.05, immediateRender: false }, 0.2)
    .to(sign, { autoAlpha: 0, duration: 0.06 }, 0.5)
    .to(shade, { opacity: 0.55, duration: 0.36 }, 0.34)
    // the monitor wakes with the project's own detection software
    .fromTo(screen, { opacity: 0 }, { opacity: 1, duration: 0.12, immediateRender: false }, 0.42)
    // and opens to become the frame; the letterbox retracts with it
    .to(st, { q: 1, duration: 0.3, ease: 'power2.inOut' }, 0.56)
    .to(bars, { height: 0, duration: 0.18, ease: 'power2.inOut' }, 0.62)
    // the chapter card lands
    .to(card, { autoAlpha: 1, duration: 0.03 }, 0.84)
    .fromTo('[data-card-big]', { clipPath: 'inset(100% 0% 0% 0%)', yPercent: 30 }, { clipPath: 'inset(0% 0% 0% 0%)', yPercent: 0, duration: 0.1, ease: 'power3.out', immediateRender: false }, 0.84)
    .to(cardTitle.lines, { yPercent: 0, duration: 0.1, stagger: 0.02, ease: 'power3.out' }, 0.87)
    .to('[data-rail]', { autoAlpha: 1, duration: 0.03 }, 0.95)
    .to({}, { duration: 0.02 }, 1);

  ScrollTrigger.create({
    trigger: film,
    start: 'top top',
    end: function () { return '+=' + Math.round(innerHeight * (g.mobile ? 3.0 : 4.2)); },
    pin: frame,
    pinSpacing: true,
    anticipatePin: 1,
    scrub: 0.8,
    animation: shot,
    invalidateOnRefresh: true,
    // a restored or deep-linked scroll position never replays the title sequence over the shot
    onUpdate: function (self) { if (self.progress > 0.01) skip(); },
    onRefresh: function () { measure(); fitName(); apply(); }
  });
  addEventListener('resize', function () { measure(); apply(); });
  ScrollTrigger.create({ trigger: '#vision', start: 'top 80px', end: 'max', toggleClass: { targets: '[data-masthead]', className: 'is-solid' } });

  /* ----------------------------------------------------------- 2b. chapters 02–03: the inspection line
     One pinned frame: the scan crosses the FYP test board and lights the model's own detections; a focus
     box walks through four of them while the board zooms toward each; a conveyor carries the board off and
     the wood board on, with the "03" card passing; a second scan lays the application's segmentation over
     the wood and its reading counts up. Scrubbed, so every step reverses exactly. */
  var lineEl = $('[data-line]');
  if (lineEl) (function () {
    root.classList.add('line-live');
    var lineFrame = $('[data-line-frame]'), pcb = $('[data-pass="pcb"]'), wood = $('[data-pass="wood"]');
    var zoom = $('[data-pcb-zoom]'), lit = $('[data-pcb-lit]'), focus = $('[data-focus]');
    var reads = $$('[data-reads] li'), qEl = $('[data-q]'), qText = qEl.textContent;
    var boxes = reads.map(function (li) { var b = li.dataset.box.split(',').map(Number); return { x: b[0], y: b[1], w: b[2], h: b[3], z: b[4] }; });
    var f = { x: 0, y: 0, w: 100, h: 100, z: 1, o: 0 };
    function applyFocus() {
      // the board zooms toward the focus box (its centre to the middle, edges always covered)
      var z = f.z, cx = f.x + f.w / 2, cy = f.y + f.h / 2;
      var tx = clamp(50 - cx * z, 100 - 100 * z, 0), ty = clamp(50 - cy * z, 100 - 100 * z, 0);
      zoom.style.transform = 'translate(' + tx.toFixed(3) + '%,' + ty.toFixed(3) + '%) scale(' + z.toFixed(4) + ')';
      focus.style.left = f.x + '%'; focus.style.top = f.y + '%'; focus.style.width = f.w + '%'; focus.style.height = f.h + '%';
      focus.style.opacity = f.o;
      focus.style.borderWidth = (2 / z).toFixed(2) + 'px';
    }
    gsap.set(reads, { autoAlpha: 0, y: 18 });
    gsap.set(reads[0], { autoAlpha: 1, y: 0 });
    gsap.set(wood, { xPercent: 112 });
    gsap.set('[data-line-card]', { x: function () { return innerWidth; } });
    gsap.set(lit, { clipPath: 'inset(0% 100% 0% 0%)' });
    gsap.set('[data-pcb-scan]', { xPercent: 0, autoAlpha: 0 });
    gsap.set('[data-wood-mask]', { clipPath: 'inset(0% 0% 100% 0%)' });
    gsap.set('[data-wood-scan]', { yPercent: 0, autoAlpha: 0 });
    gsap.set(['[data-wood-title]', '[data-tally] li', '[data-quality]'], { autoAlpha: 0, y: 18 });
    applyFocus();

    var lt = gsap.timeline({ defaults: { ease: 'none' } });
    // 1. the scan crosses the board; detections light up behind it
    lt.to('[data-pcb-scan]', { autoAlpha: 1, duration: 0.01 }, 0.02)
      .to('[data-pcb-scan]', { xPercent: 100, duration: 0.14, ease: 'power1.inOut' }, 0.02)
      .to(lit, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.14, ease: 'power1.inOut' }, 0.02)
      .to('[data-pcb-scan]', { autoAlpha: 0, duration: 0.02 }, 0.16);
    // 2. the focus box walks through four readings
    // each reading: a short move (0.04), then a longer hold (0.06) so it can be read
    for (var i = 1; i < boxes.length; i++) {
      var t = 0.2 + (i - 1) * 0.1, b = boxes[i];
      lt.to(f, { x: b.x, y: b.y, w: b.w, h: b.h, z: b.z, o: 1, duration: 0.04, ease: 'power2.inOut', onUpdate: applyFocus }, t)
        .to(reads[i - 1], { autoAlpha: 0, y: -18, duration: 0.02, ease: 'power1.in' }, t)
        .to(reads[i], { autoAlpha: 1, y: 0, duration: 0.025, ease: 'power2.out' }, t + 0.02);
    }
    lt.to(f, { x: 0, y: 0, w: 100, h: 100, z: 1, o: 0, duration: 0.04, ease: 'power2.inOut', onUpdate: applyFocus }, 0.58)
      .to(reads[reads.length - 1], { autoAlpha: 0, y: -18, duration: 0.03, ease: 'power1.in' }, 0.6)
      .to('[data-pass="pcb"] .pass__no', { autoAlpha: 0, duration: 0.03 }, 0.6);
    // 3. the conveyor: board off, card past through the gap, wood on
    lt.to(pcb, { xPercent: -112, duration: 0.14, ease: 'power2.inOut' }, 0.63)
      .to(wood, { xPercent: 0, duration: 0.12, ease: 'power2.out' }, 0.7)
      .to('[data-line-card]', { x: function () { return -$('[data-line-card]').offsetWidth; }, duration: 0.15, ease: 'none' }, 0.62)
      .fromTo('[data-belt]', { xPercent: 0 }, { xPercent: -33.333, duration: 0.2, ease: 'power2.inOut' }, 0.62);
    // 4. the second scan lays the segmentation over the wood; the reading follows
    lt.to('[data-wood-scan]', { autoAlpha: 1, duration: 0.01 }, 0.8)
      .to('[data-wood-scan]', { yPercent: 100, duration: 0.1, ease: 'power1.inOut' }, 0.8)
      .to('[data-wood-mask]', { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.1, ease: 'power1.inOut' }, 0.8)
      .to('[data-wood-scan]', { autoAlpha: 0, duration: 0.02 }, 0.9)
      .to('[data-wood-title]', { autoAlpha: 1, y: 0, duration: 0.04, ease: 'power2.out' }, 0.79)
      .to('[data-tally] li', { autoAlpha: 1, y: 0, duration: 0.04, stagger: 0.02, ease: 'power2.out' }, 0.84)
      .to('[data-quality]', { autoAlpha: 1, y: 0, duration: 0.03, ease: 'power2.out' }, 0.9)
      .fromTo({ v: 0 }, { v: 0 }, { v: 98.19, duration: 0.06, ease: 'power2.out',
        onUpdate: function () { var v = this.targets()[0].v; qEl.textContent = v >= 98.19 ? qText : v.toFixed(2) + '%'; } }, 0.9)
      .to({}, { duration: 0.04 }, 0.96);

    ScrollTrigger.create({
      trigger: lineEl,
      start: 'top top',
      end: function () { return '+=' + Math.round(innerHeight * (g.mobile ? 4.2 : 5.2)); },
      pin: lineFrame,
      pinSpacing: true,
      anticipatePin: 1,
      scrub: 0.8,
      animation: lt,
      invalidateOnRefresh: true
    });
  })();

  /* ----------------------------------------------------------- 2c. chapter 04: the fault scope
     A trace line crosses the frame and opens into the lab's own Simulink scope. A time cursor sweeps the
     scope's real axis (0–1 s); the dark veil lifts behind it, and the recorded times (0.27 s, 0.47 s) are
     read out as the cursor passes them. Then the relay study's single-line diagram and its verified
     grading margins replace the scope. */
  var scopeEl = $('[data-scope]');
  if (scopeEl) (function () {
    var cursor = $('[data-cursor]'), tOut = $('[data-t]'), dim = $('[data-scope-dim]');
    var sReads = $$('[data-scope-reads] li'), beatScope = $('[data-beat="scope"]'), beatGrade = $('[data-beat="grading"]');
    var sc = { t: 0 };
    var X0 = 3.0625, XS = 95.8125;                       // axis in % of the screenshot width
    function applyCursor() {
      var x = X0 + sc.t * XS;
      cursor.style.left = x.toFixed(3) + '%';
      dim.style.clipPath = 'inset(0% 0% 0% ' + x.toFixed(3) + '%)';
      tOut.textContent = sc.t.toFixed(3) + ' s';
      cursor.classList.toggle('is-right', sc.t > 0.84);
    }
    gsap.set('[data-trace]', { scaleX: 0 });
    gsap.set('[data-scope-plate]', { clipPath: 'inset(50% 0% 50% 0%)' });
    gsap.set(cursor, { autoAlpha: 0 });   // the heading stays: the scene never opens on an empty frame
    gsap.set(sReads, { autoAlpha: 0, y: 18 });
    gsap.set(beatGrade, { autoAlpha: 0, yPercent: 8 });
    gsap.set('[data-gbars] i', { scaleX: 0 });
    gsap.set('[data-gbars] li', { autoAlpha: 0 });
    applyCursor();

    var T = function (t) { return 0.16 + t * 0.4; };    // scope seconds → timeline position
    var st4 = gsap.timeline({ defaults: { ease: 'none' } });
    st4.to('[data-trace]', { scaleX: 1, duration: 0.07, ease: 'power2.inOut' }, 0)
      .to('[data-scope-plate]', { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.08, ease: 'power3.inOut' }, 0.07)
      .to('[data-trace]', { autoAlpha: 0, duration: 0.03 }, 0.12)
      .to(cursor, { autoAlpha: 1, duration: 0.02 }, 0.15)
      .to(sc, { t: 1, duration: 0.4, onUpdate: applyCursor }, T(0))
      .to(sReads[0], { autoAlpha: 1, y: 0, duration: 0.03, ease: 'power2.out' }, T(0.27))
      .to(sReads[0], { autoAlpha: 0, y: -18, duration: 0.02, ease: 'power1.in' }, T(0.47) - 0.02)
      .to(sReads[1], { autoAlpha: 1, y: 0, duration: 0.03, ease: 'power2.out' }, T(0.47))
      // beat 2: the grading study replaces the scope
      .to(beatScope, { autoAlpha: 0, yPercent: -6, duration: 0.07, ease: 'power2.in' }, 0.64)
      .to(beatGrade, { autoAlpha: 1, yPercent: 0, duration: 0.08, ease: 'power2.out' }, 0.69)
      .to('[data-gbars] li', { autoAlpha: 1, duration: 0.03, stagger: 0.025 }, 0.76)
      .to('[data-gbars] i', { scaleX: 1, duration: 0.06, stagger: 0.025, ease: 'power2.out' }, 0.77)
      .to({}, { duration: 0.06 }, 0.94);

    ScrollTrigger.create({
      trigger: scopeEl, start: 'top top',
      end: function () { return '+=' + Math.round(innerHeight * (g.mobile ? 3.6 : 4.4)); },
      pin: '[data-scope-frame]', pinSpacing: true, anticipatePin: 1, scrub: 0.8, animation: st4, invalidateOnRefresh: true
    });
  })();

  /* ----------------------------------------------------------- 2d. chapter 05: the signal path
     The golf ball station's interface drawn stage by stage: a wire enters from the frame edge, a pulse
     runs node to node, each node lights, and the matching bench photograph and record text take over.
     Two drawings share the same timeline: the labelled one on wide screens, the numbered one on phones. */
  var pathEl = $('[data-path]');
  if (pathEl) (function () {
    var wires = $$('[data-wire]'), pReads = $$('[data-path-reads] li'), photos = $$('[data-photos] img');
    var photoFor = [0, 1, 1, 2, 2];                       // stage → photograph
    gsap.set(pReads, { autoAlpha: 0, y: 18 });
    gsap.set(photos, { autoAlpha: 0 });
    gsap.set('[data-path-title]', { autoAlpha: 0, y: 18 });
    wires.forEach(function (svg) {
      gsap.set($$('.wire__seg:not(.wire__seg--gap)', svg), { strokeDasharray: 1, strokeDashoffset: 1 });
      gsap.set($$('.wire__seg--gap', svg), { autoAlpha: 0 });
      gsap.set($('[data-pulse]', svg), { attr: { cx: 0 }, autoAlpha: 0 });
    });
    var st5 = gsap.timeline({ defaults: { ease: 'none' } });
    st5.to('[data-path-title]', { autoAlpha: 1, y: 0, duration: 0.05, ease: 'power2.out' }, 0.02);
    wires.forEach(function (svg) {
      var xs = svg.dataset.xs.split(',').map(Number), pulse = $('[data-pulse]', svg);
      st5.to(pulse, { autoAlpha: 1, duration: 0.01 }, 0.04);
      xs.forEach(function (x, i) {
        var t = 0.05 + i * 0.17, seg = $('[data-seg="' + (i + 1) + '"]', svg), gap = seg.classList.contains('wire__seg--gap');
        st5.to(seg, gap ? { autoAlpha: 1, duration: 0.05 } : { strokeDashoffset: 0, duration: 0.05, ease: 'power1.inOut' }, t)
          .to(pulse, { attr: { cx: x }, duration: 0.07, ease: 'power1.inOut' }, t)
          .to($('[data-node="' + (i + 1) + '"] .node__lit', svg), { opacity: 1, duration: 0.03 }, t + 0.06);
      });
      st5.to(pulse, { autoAlpha: 0, duration: 0.03 }, 0.8);
    });
    pReads.forEach(function (li, i) {
      var t = 0.05 + i * 0.17 + 0.06;
      if (i) st5.to(pReads[i - 1], { autoAlpha: 0, y: -18, duration: 0.025, ease: 'power1.in' }, t - 0.03);
      st5.to(li, { autoAlpha: 1, y: 0, duration: 0.03, ease: 'power2.out' }, t);
      if (!i || photoFor[i] !== photoFor[i - 1]) {
        if (i) st5.to(photos[photoFor[i - 1]], { autoAlpha: 0, duration: 0.04 }, t - 0.02);
        st5.fromTo(photos[photoFor[i]], { autoAlpha: 0, scale: 1.06 }, { autoAlpha: 1, scale: 1, duration: 0.06, ease: 'power2.out', immediateRender: false }, t - 0.02);
      }
    });
    st5.to({}, { duration: 0.08 }, 0.92);

    ScrollTrigger.create({
      trigger: pathEl, start: 'top top',
      end: function () { return '+=' + Math.round(innerHeight * (g.mobile ? 3.6 : 4.4)); },
      pin: '[data-path-frame]', pinSpacing: true, anticipatePin: 1, scrub: 0.8, animation: st5, invalidateOnRefresh: true
    });
  })();

  /* ----------------------------------------------------------- 3. chapter text: masked line reveals and verified figures */
  $$('[data-split]').forEach(function (h) {
    var s = new SplitText(h, { type: 'lines', mask: 'lines' });
    gsap.from(s.lines, { yPercent: 105, duration: 1.1, stagger: 0.08, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 85%', once: true } });
  });
  $$('[data-split-lines]').forEach(function (p) {
    var s = new SplitText(p, { type: 'lines', mask: 'lines' });
    gsap.from(s.lines, { yPercent: 100, autoAlpha: 0, duration: 0.9, stagger: 0.05, ease: 'power3.out', scrollTrigger: { trigger: p, start: 'top 88%', once: true } });
  });
  $$('[data-count] b').forEach(function (b) {
    var text = b.textContent, m = text.match(/[\d.]+/); if (!m) return;
    var target = parseFloat(m[0]), dec = (m[0].split('.')[1] || '').length, o = { v: 0 };
    ScrollTrigger.create({ trigger: b, start: 'top 90%', once: true, onEnter: function () {
      gsap.to(o, { v: target, duration: 1.4, ease: 'power3.out', onUpdate: function () { b.textContent = text.replace(m[0], o.v.toFixed(dec)); }, onComplete: function () { b.textContent = text; } });
    } });
  });
  $$('[data-reveal]').forEach(function (el) {
    gsap.from(el, { y: 40, autoAlpha: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
  });
  $$('.index__group').forEach(function (grp) {
    gsap.from($$('li', grp), { y: 22, autoAlpha: 0, duration: 0.8, stagger: 0.04, ease: 'power3.out', scrollTrigger: { trigger: grp, start: 'top 88%', once: true } });
  });
  $$('[data-plate]').forEach(function (f, i) {
    gsap.from(f, { clipPath: 'inset(18% 0% 0% 0% round 14px)', y: 60, duration: 1.3, delay: i * 0.08, ease: 'expo.out', scrollTrigger: { trigger: f, start: 'top 90%', once: true } });
  });

  railSpy();

  /* ----------------------------------------------------------- in-page links travel through the shot */
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1), t = id === 'top' ? document.body : document.getElementById(id);
      if (!t) return;
      e.preventDefault(); skip();
      var y = id === 'top' ? 0 : t.getBoundingClientRect().top + scrollY;
      scrollTo({ top: y, behavior: 'smooth' });
      history.replaceState(null, '', id === 'top' ? location.pathname : '#' + id);
      if (id !== 'top') setTimeout(function () { t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }, 900);
    });
  });

  // a reload or a shared link with a hash lands on the right place once pins exist
  addEventListener('load', function () {
    ScrollTrigger.refresh();
    if (scrollY > 10) skip();
    if (location.hash.length > 1) { var t = document.getElementById(location.hash.slice(1)); if (t) { skip(); scrollTo(0, t.getBoundingClientRect().top + scrollY); } }
  });

  /* ----------------------------------------------------------- chapter rail */
  function railSpy() {
    var links = $$('[data-rail-link]'); if (!links.length) return;
    var rail = $('[data-rail]');
    var set = function (k) { if (rail) rail.classList.toggle('is-away', k === 'none'); if (k === 'none') return; links.forEach(function (l) { var on = l.dataset.railLink === k; l.classList.toggle('is-active', on); if (on) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current'); }); };
    set('intro');
    // each chapter element (and each pass inside the pinned line, which slides in and out) names its rail key
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) set(e.target.dataset.railKey); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    $$('[data-rail-key]').forEach(function (el) { io.observe(el); });
  }
})();
