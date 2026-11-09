/* Portfolio Claude V3 — the contact panel. No dependencies.
   Six icons hang off a busbar. Pressing one opens its line on the stage, locked: an isolator to slide,
   a selector to turn, or a pushbutton to hold. Working the control powers the feeder and types out
   the detail. Closing the main breaker unlocks every line at once. Without this script the page shows
   a plain list of every line instead (.lines-plain). */
(function () {
  'use strict';
  var root = document.documentElement;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var panel = $('[data-panel]'), readout = $('[data-readout]'), state = $('[data-state]');
  var breaker = $('[data-breaker]'), label = $('[data-breaker-label]');
  var avatar = $('.cx__pose'), idle = $('[data-idle]');
  var say = function (t) { readout.textContent = t; };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  /* icon animations: one short move, replayable */
  function anim(ico) {
    if (!ico) return;
    ico.classList.remove('is-anim'); void ico.offsetWidth; ico.classList.add('is-anim');
    clearTimeout(ico._t); ico._t = setTimeout(function () { ico.classList.remove('is-anim'); }, 1400);
  }
  var tiles = $$('[data-tile]'), units = {};
  $$('[data-unit]').forEach(function (u) { units[u.getAttribute('data-unit')] = u; });
  tiles.forEach(function (t) { t.addEventListener('pointerenter', function () { anim($('.ico', t)); }); });
  if ('IntersectionObserver' in window) {
    var seen = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      seen.disconnect();
      tiles.forEach(function (t, i) { setTimeout(function () { anim($('.ico', t)); }, 300 + i * 160); });
    }, { threshold: 0.3 });
    seen.observe($('.tiles'));
  }

  /* the avatar answers each line that comes up */
  var waveTimer;
  function wave() {
    if (!avatar || !window.Pose) return;
    clearTimeout(waveTimer);
    Pose.stop(avatar); Pose.set(avatar, 'wave'); Pose.play(avatar);
    if (!live) waveTimer = setTimeout(function () { Pose.stop(avatar); Pose.set(avatar, 'idle'); }, 3200);
  }

  /* opening a line on the stage */
  var live = false;
  function show(key) {
    idle.hidden = true;
    tiles.forEach(function (t) { t.setAttribute('aria-pressed', String(t.getAttribute('data-tile') === key)); });
    Object.keys(units).forEach(function (k) { units[k].hidden = live ? false : k !== key; });
    var u = units[key];
    u.classList.remove('is-shown'); void u.offsetWidth; u.classList.add('is-shown');
  }
  tiles.forEach(function (t) {
    t.addEventListener('click', function () {
      var key = t.getAttribute('data-tile'), u = units[key];
      anim($('.ico', t));
      if (live) { u.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); return; }
      show(key);
      say(u.classList.contains('is-unlocked') ? $('.unit__label', u).textContent + ' is open.' : $('.unit__how b', u).textContent + ': ' + $('.unit__how span', u).textContent);
      var focusable = u.classList.contains('is-unlocked') ? $('.reveal', u) : $('.ctl__knob, .ctl__push', u);
      if (focusable && matchMedia('(pointer: fine)').matches) focusable.focus({ preventScroll: true });
    });
  });

  /* unlocking: the feeder lights and the detail types out */
  function unlock(key, quiet) {
    var u = units[key]; if (u.classList.contains('is-unlocked')) return;
    u.classList.add('is-unlocked');
    $('.unit__lock', u).hidden = true;
    $('.unit__open', u).hidden = false;
    var t = $('[data-tile="' + key + '"]'); t.classList.add('is-on');
    anim($('.ico', t)); tick();
    if (!quiet) { say($('.unit__label', u).textContent + ' connected: ' + $('.reveal', u).textContent + '.'); wave(); }
  }
  function relock(key) {
    var u = units[key], c = $('[data-ctl]', u);
    u.classList.remove('is-unlocked');
    $('.unit__lock', u).hidden = false;
    $('.unit__open', u).hidden = true;
    $('[data-tile="' + key + '"]').classList.remove('is-on');
    if (c && c._reset) c._reset();
  }

  /* control 1: the isolator slider (drag, or arrow keys) */
  $$('.ctl--slide').forEach(function (c) {
    var key = c.closest('[data-unit]').getAttribute('data-unit');
    var track = $('.ctl__track', c), knob = $('.ctl__knob', c), fill = $('.ctl__fill', c), v = 0, drag = false, done = false;
    function set(nv, snap) {
      v = clamp(nv, 0, 100);
      c.classList.toggle('is-snap', !!snap);
      var max = track.clientWidth - knob.offsetWidth - 8;
      knob.style.transform = 'translateX(' + (v / 100 * max) + 'px)';
      fill.style.transform = 'scaleX(' + (0.08 + v / 100 * 0.92) + ')';
      knob.setAttribute('aria-valuenow', Math.round(v));
    }
    function finish() { if (v >= 90) { done = true; set(100, true); c.classList.add('is-done'); setTimeout(function () { unlock(key); }, 260); } else set(0, true); }
    c._reset = function () { done = false; c.classList.remove('is-done'); set(0, true); };
    function at(e) { var r = track.getBoundingClientRect(), k = knob.offsetWidth; return (e.clientX - r.left - k / 2 - 4) / (r.width - k - 8) * 100; }
    track.addEventListener('pointerdown', function (e) { if (done) return; drag = true; track.setPointerCapture(e.pointerId); set(at(e)); e.preventDefault(); });
    track.addEventListener('pointermove', function (e) { if (drag) set(at(e)); });
    track.addEventListener('pointerup', function () { if (!drag) return; drag = false; finish(); });
    track.addEventListener('pointercancel', function () { drag = false; set(0, true); });
    knob.addEventListener('keydown', function (e) {
      if (done) return;
      var d = { ArrowRight: 25, ArrowUp: 25, ArrowLeft: -25, ArrowDown: -25, End: 100, Home: -100 }[e.key];
      if (e.key === 'Enter' || e.key === ' ') d = 100;
      if (d === undefined) return;
      e.preventDefault(); set(v + d, true); if (v >= 100) finish();
    });
    set(0, true);
  });

  /* control 2: the selector switch (rotate by dragging round it, click to step, or arrow keys) */
  $$('.ctl--turn').forEach(function (c) {
    var key = c.closest('[data-unit]').getAttribute('data-unit');
    var dial = $('.ctl__dial', c), knob = $('.ctl__knob', c), v = 0, drag = false, start = 0, base = 0, moved = 0, done = false;
    function set(nv, snap) {
      v = clamp(nv, 0, 90);
      c.classList.toggle('is-snap', !!snap);
      knob.style.transform = 'rotate(' + (v - 45) + 'deg)';
      knob.setAttribute('aria-valuenow', Math.round(v));
      knob.setAttribute('aria-valuetext', v >= 90 ? 'I' : v <= 0 ? '0' : Math.round(v) + ' degrees');
    }
    function finish() { if (v >= 72) { done = true; set(90, true); c.classList.add('is-done'); setTimeout(function () { unlock(key); }, 300); } else set(0, true); }
    c._reset = function () { done = false; c.classList.remove('is-done'); set(0, true); };
    function ang(e) { var r = dial.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI; }
    dial.addEventListener('pointerdown', function (e) { if (done) return; drag = true; moved = 0; start = ang(e); base = v; dial.setPointerCapture(e.pointerId); e.preventDefault(); });
    dial.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var d = ang(e) - start; if (d > 180) d -= 360; if (d < -180) d += 360;
      moved = Math.max(moved, Math.abs(d)); set(base + d);
    });
    dial.addEventListener('pointerup', function () {
      if (!drag) return; drag = false;
      if (moved < 4) { set(v + 45, true); if (v >= 90) finish(); }   // a click steps it a notch
      else finish();
    });
    dial.addEventListener('pointercancel', function () { drag = false; set(0, true); });
    knob.addEventListener('keydown', function (e) {
      if (done) return;
      var d = { ArrowRight: 30, ArrowUp: 30, ArrowLeft: -30, ArrowDown: -30, End: 90, Home: -90 }[e.key];
      if (e.key === 'Enter' || e.key === ' ') d = 45;
      if (d === undefined) return;
      e.preventDefault(); set(v + d, true); if (v >= 90) finish();
    });
    set(0, true);
  });

  /* control 3: the pushbutton (press and hold for 0.9 s; Space or Enter held works too) */
  $$('.ctl--hold').forEach(function (c) {
    var key = c.closest('[data-unit]').getAttribute('data-unit');
    var push = $('.ctl__push', c), ring = $('.ctl__ring', c), t0 = 0, raf = 0, done = false, HOLD = 900;
    function draw(p) { ring.style.strokeDashoffset = String(1 - p); }
    function frame(now) {
      var p = clamp((now - t0) / HOLD, 0, 1); draw(p);
      if (p >= 1) { done = true; c.classList.remove('is-holding'); c.classList.add('is-done'); setTimeout(function () { unlock(key); }, 220); return; }
      raf = requestAnimationFrame(frame);
    }
    function down() { if (done || raf) return; c.classList.add('is-holding'); t0 = performance.now(); raf = requestAnimationFrame(frame); }
    function up() {
      if (!raf || done) { raf = 0; return; }
      cancelAnimationFrame(raf); raf = 0; c.classList.remove('is-holding'); draw(0);
      say('Keep holding until the ring closes.');
    }
    c._reset = function () { done = false; raf = 0; c.classList.remove('is-done', 'is-holding'); draw(0); };
    push.addEventListener('pointerdown', function (e) { push.setPointerCapture(e.pointerId); down(); e.preventDefault(); });
    push.addEventListener('pointerup', up);
    push.addEventListener('pointercancel', up);
    push.addEventListener('keydown', function (e) { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); down(); } });
    push.addEventListener('keyup', function (e) { if (e.key === ' ' || e.key === 'Enter') up(); });
    push.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    draw(0);
  });

  /* the time in Sharjah, for the phone line */
  var clock = $('[data-clock]');
  var fmt = window.Intl && Intl.DateTimeFormat ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dubai', hour: '2-digit', minute: '2-digit', weekday: 'long' }) : null;
  function tick() { if (clock && fmt) clock.textContent = fmt.format(new Date()); }
  tick(); setInterval(tick, 30000);

  /* topic selector: rewrite the email subject and the WhatsApp text everywhere they appear */
  $$('[data-topics] input').forEach(function (r) {
    r.addEventListener('change', function () {
      if (!r.checked) return;
      var subj = r.getAttribute('data-subject'), text = r.getAttribute('data-text');
      $$('[data-line="mail"]').forEach(function (a) { a.href = a.href.split('?')[0] + '?subject=' + encodeURIComponent(subj); });
      $$('[data-line="wa"]').forEach(function (a) { a.href = a.href.split('?')[0] + '?text=' + encodeURIComponent(text); });
      $$('[data-subj]').forEach(function (e) { e.textContent = subj; });
      $$('[data-body]').forEach(function (e) { e.textContent = text; e.classList.remove('is-new'); void e.offsetWidth; e.classList.add('is-new'); });
      say('Topic set: ' + r.nextElementSibling.textContent.toLowerCase() + '. The email subject and WhatsApp message now say so.');
    });
  });

  /* the main breaker: powers the busbar and unlocks every line as the current reaches it */
  var timers = [];
  breaker.addEventListener('click', function () {
    live = !live;
    breaker.setAttribute('aria-pressed', String(live));
    panel.classList.toggle('is-live', live);
    root.classList.toggle('panel-live', live);
    label.textContent = live ? 'Open the breaker' : 'Close the breaker';
    state.textContent = live ? 'On the line' : 'Standby';
    timers.forEach(clearTimeout); timers = [];
    if (live) {
      say('Breaker closed. All six lines are live.');
      idle.hidden = true;
      tiles.forEach(function (t, i) {
        var key = t.getAttribute('data-tile');
        timers.push(setTimeout(function () { units[key].hidden = false; unlock(key, true); }, 420 + i * 150));
      });
      tiles.forEach(function (t) { t.setAttribute('aria-pressed', 'false'); });
    } else {
      say('Breaker open. Every line is locked again.');
      Object.keys(units).forEach(function (k) { relock(k); units[k].hidden = true; });
      tiles.forEach(function (t) { t.setAttribute('aria-pressed', 'false'); });
      idle.hidden = false;
    }
    if (avatar && window.Pose) {
      clearTimeout(waveTimer);
      Pose.stop(avatar); Pose.set(avatar, live ? 'wave' : 'idle');
      if (live) setTimeout(function () { Pose.play(avatar); }, 650);
    }
  });

  // a hint on arrival: the handle nudges once so the switch reads as something to press
  setTimeout(function () { breaker.classList.add('is-hint'); }, 1400);

  /* copy buttons */
  $$('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var v = b.getAttribute('data-copy'), t = b.getAttribute('data-copy-label') || b.textContent;
      var done = function () { b.textContent = 'Copied'; say('Copied: ' + v); setTimeout(function () { b.textContent = t; }, 2200); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(v).then(done, function () { say('Copy is blocked here. It is ' + v); });
      else say('Copy is not available here. It is ' + v);
    });
  });
  panel.classList.add('board-ready');
})();
