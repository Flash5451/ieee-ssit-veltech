/* ==========================================================================
   IEEE SSIT · Vel Tech — motion director
   Boot sequence → hero entrance → scroll storytelling → warp transitions.
   ========================================================================== */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var params = new URLSearchParams(window.location.search);

  /* ------------------------------------------------------------------
     1. Content
     ------------------------------------------------------------------ */
  SSIT.renderJourney($('#journey-root'), { preview: params.get('preview') === 'journey' });
  SSIT.renderTeam($('#team-root'));
  SSIT.renderContact($('#contact-root'));
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  // Without the motion engine the page still works as a static document.
  if (!window.gsap || !window.ScrollTrigger) {
    var pre = $('.preloader');
    if (pre) pre.remove();
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  /* ------------------------------------------------------------------
     2. Ambient engines + smooth scroll
     ------------------------------------------------------------------ */
  var stars = new Starfield($('.starfield'), { reduced: reduced, warp: reduced ? 0 : 1 });
  new Globe($('.globe'), { reduced: reduced, labels: $$('.globe__label') });
  var campus = new Campus($('.campus'), { reduced: reduced });

  var lenis = null;
  if (!reduced && window.Lenis) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on('scroll', function (e) {
      ScrollTrigger.update();
      stars.setScrollVelocity(e.velocity);
    });
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  /* ------------------------------------------------------------------
     3. Text splitting
     ------------------------------------------------------------------ */
  function splitText(el, mode) {
    if (el._split) return el._split;
    var words = [], chars = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span'); w.className = 'w';
            var wi = document.createElement('span'); wi.className = 'wi';
            if (mode === 'chars') {
              Array.from(part).forEach(function (ch) {
                var c = document.createElement('span'); c.className = 'c'; c.textContent = ch;
                wi.appendChild(c); chars.push(c);
              });
            } else {
              wi.textContent = part;
            }
            w.appendChild(wi); frag.appendChild(w); words.push(wi);
          });
          child.parentNode.replaceChild(frag, child);
        } else if (child.nodeType === 1 && child.tagName !== 'BR') {
          walk(child);
        }
      });
    })(el);
    el._split = { words: words, chars: chars };
    return el._split;
  }

  function labelFromText(el) {
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
  }

  /* ------------------------------------------------------------------
     4. Boot sequence + hero entrance
     ------------------------------------------------------------------ */
  var heroTitle = $('.hero__title');
  labelFromText(heroTitle);
  var heroChars = [];
  $$('.hero__line').forEach(function (line) {
    var chars = splitText(line, 'chars').chars;
    if (line.classList.contains('hero__line--accent')) {
      // electric gradient, character by character
      var from = [200, 236, 255], to = [60, 130, 255];
      chars.forEach(function (c, i) {
        var t = chars.length > 1 ? i / (chars.length - 1) : 0;
        c.style.color = 'rgb(' + from.map(function (v, k) { return Math.round(v + (to[k] - v) * t); }).join(',') + ')';
      });
    }
    heroChars = heroChars.concat(chars);
  });

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function boot() {
    var pre = $('.preloader');
    if (reduced || !pre) { if (pre) pre.remove(); afterIntro(); return; }

    var count = $('.preloader__count'), bar = $('.preloader__bar span'), status = $('.preloader__status');
    var steps = ['Initialising systems', 'Calibrating optics', 'Aligning orbit', 'Systems online'];
    var c = { v: 0 };
    var seen = false;
    try { seen = sessionStorage.getItem('ssit-booted') === '1'; sessionStorage.setItem('ssit-booted', '1'); } catch (e) {}
    var counting = gsap.to(c, {
      v: 100, duration: seen ? 0.7 : 1.8, ease: 'power2.inOut',
      onUpdate: function () {
        count.textContent = String(Math.round(c.v)).padStart(3, '0');
        bar.style.transform = 'scaleX(' + (c.v / 100) + ')';
        status.textContent = steps[Math.min(steps.length - 1, Math.floor(c.v / 30))];
      }
    });
    var fonts = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, wait(3500)]) : Promise.resolve();
    Promise.all([fonts, counting]).then(entrance);
  }

  function entrance() {
    ScrollTrigger.refresh();
    var tl = gsap.timeline({ defaults: { ease: 'expo.out' }, onComplete: afterIntro });
    tl.to('.preloader__core', { opacity: 0, y: -14, duration: 0.5, ease: 'power2.in' })
      .to('.preloader__panel--top', { yPercent: -100, duration: 1.3, ease: 'expo.inOut' }, 0.35)
      .to('.preloader__panel--bottom', { yPercent: 100, duration: 1.3, ease: 'expo.inOut' }, 0.35)
      .add(function () { stars.warpTo(0, 2.8); }, 0.3)
      .from('.planet', { yPercent: 14, duration: 2.8 }, 0.55)
      .from('.hero__flare', { opacity: 0, scaleX: 0.08, duration: 2.4 }, 0.95)
      .from('.hero__orbits', { opacity: 0, scale: 0.82, duration: 2.6 }, 0.95)
      .from('.hero__lockup', { opacity: 0, letterSpacing: '1.2em', duration: 1.8 }, 1)
      .from(heroChars, { yPercent: 115, rotateX: -95, opacity: 0, duration: 1.6, stagger: 0.034 }, 1.05)
      .from('.hero__sub > span', { opacity: 0, y: 22, filter: 'blur(10px)', duration: 1.3, stagger: 0.16, clearProps: 'filter' }, 1.75)
      .from('.hero__ctas .btn', { opacity: 0, y: 26, duration: 1.2, stagger: 0.1 }, 1.95)
      .from('.hero__foot > *', { opacity: 0, y: 14, duration: 1.1, stagger: 0.08 }, 2.05)
      .from('.nav', { yPercent: -180, opacity: 0, duration: 1.3 }, 1.95);
  }

  function afterIntro() {
    var pre = $('.preloader');
    if (pre) pre.remove();
    if (lenis) lenis.start();
    heroTicker();
    ScrollTrigger.refresh();
    if (window.location.hash && document.querySelector(window.location.hash)) {
      warpTo(window.location.hash);
    }
  }

  function heroTicker() {
    var items = $$('.hero__pillars li'), i = 0;
    if (!items.length) return;
    (function step() {
      items.forEach(function (li, k) { li.classList.toggle('is-lit', k === i); });
      i = (i + 1) % items.length;
      setTimeout(step, 1700);
    })();
  }

  /* ------------------------------------------------------------------
     5. Scroll storytelling
     ------------------------------------------------------------------ */
  function bell(p) { return Math.sin(Math.max(0, Math.min(1, p)) * Math.PI); }

  function scrollScenes() {
    // Hero drifts away as you leave the launch point
    gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
      .to('.hero__inner', { yPercent: -22, scale: 1.08, opacity: 0, ease: 'none' }, 0)
      .to('.hero__space', { yPercent: -10, scale: 1.12, ease: 'none' }, 0)
      .to('.hero__foot', { opacity: 0, ease: 'none', duration: 0.35 }, 0);

    // Manifesto lights up word by word
    var manifesto = $('[data-scrub-words]');
    if (manifesto) {
      var mWords = splitText(manifesto, 'words').words;
      gsap.fromTo(mWords, { opacity: 0.13 }, {
        opacity: 1, ease: 'none', stagger: 0.1,
        scrollTrigger: { trigger: manifesto, start: 'top 78%', end: 'bottom 52%', scrub: true }
      });
    }

    // Chapter gates: giant numeral, title flies in, then you pass through it
    $$('.chapter-intro').forEach(function (intro) {
      var num = $('.chapter-intro__num', intro);
      var content = $('.chapter-intro__content', intro);
      var title = $('.chapter-intro__title', intro);
      labelFromText(title);
      var chars = splitText(title, 'chars').chars;

      var reveal = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } })
        .from($('.chapter-intro__kicker', intro), { opacity: 0, letterSpacing: '1.4em', duration: 1.4 })
        .from(chars, { opacity: 0, yPercent: 70, rotateX: -80, scale: 0.6, filter: 'blur(14px)', duration: 1.5, stagger: { each: 0.06, from: 'center' }, clearProps: 'filter' }, 0.05)
        .from($('.chapter-intro__sub', intro), { opacity: 0, y: 18, duration: 1.2 }, 0.45);

      ScrollTrigger.create({
        trigger: intro, start: 'top 62%',
        onEnter: function () { reveal.play(); },
        onEnterBack: function () { reveal.play(); },
        onLeaveBack: function () { reveal.reverse(); }
      });

      gsap.timeline({
        scrollTrigger: {
          trigger: intro, start: 'top bottom', end: 'bottom top', scrub: true,
          onUpdate: function (self) { stars.setBoost(bell(self.progress)); },
          onLeave: function () { stars.setBoost(0); },
          onLeaveBack: function () { stars.setBoost(0); }
        }
      })
        .fromTo(num, { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, ease: 'none', duration: 0.36 }, 0)
        .to(num, { scale: 2.6, opacity: 0, ease: 'power1.in', duration: 0.26 }, 0.44)
        .to(content, { scale: 1.45, opacity: 0, ease: 'power2.in', duration: 0.18 }, 0.5)
        .set({}, {}, 1);
    });

    // Headlines rise word by word
    $$('[data-split="words"]').forEach(function (el) {
      var words = splitText(el, 'words').words;
      gsap.from(words, {
        yPercent: 118, rotate: 3, duration: 1.3, ease: 'expo.out', stagger: 0.05,
        scrollTrigger: { trigger: el, start: 'top 86%', end: 'max' }
      });
    });

    // Event titles assemble character by character
    $$('.event__title').forEach(function (el) {
      labelFromText(el);
      var chars = splitText(el, 'chars').chars;
      gsap.from(chars, {
        opacity: 0, yPercent: 90, rotateX: -80, duration: 1.2, ease: 'expo.out', stagger: 0.022,
        scrollTrigger: { trigger: el, start: 'top 86%', end: 'max' }
      });
    });

    // Generic reveals
    var reveals = $$('[data-reveal]').filter(function (el) { return el.getAttribute('data-reveal') !== 'scale'; });
    gsap.set(reveals, { opacity: 0, y: 46 });
    ScrollTrigger.batch(reveals, {
      start: 'top 90%', end: 'max', once: true,
      onEnter: function (batch) {
        // after a warp jump, everything already passed appears at once; only what's on screen animates
        var passed = batch.filter(function (el) { return el.getBoundingClientRect().bottom < 0; });
        var inView = batch.filter(function (el) { return passed.indexOf(el) < 0; });
        if (passed.length) gsap.set(passed, { opacity: 1, y: 0 });
        if (inView.length) {
          gsap.to(inView, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', stagger: Math.min(0.09, 0.6 / inView.length), overwrite: 'auto' });
        }
      }
    });

    // Visual frames open like an aperture
    $$('[data-reveal="scale"]').forEach(function (el) {
      gsap.fromTo(el,
        { clipPath: 'inset(16% 12% 16% 12% round 28px)', opacity: 0.25 },
        { clipPath: 'inset(0% 0% 0% 0% round 28px)', opacity: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 96%', end: 'top 42%', scrub: 0.6 } });
    });

    // Campus skyline rises
    ScrollTrigger.create({
      trigger: '.campus', start: 'top 92%', end: 'center 40%',
      onUpdate: function (self) { campus.setProgress(self.progress); },
      onLeave: function () { campus.setProgress(1); }
    });

    // IEEE lineage line draws across
    var lineage = $('.lineage__track');
    if (lineage) {
      gsap.to(lineage, { '--line': 1, ease: 'none', scrollTrigger: { trigger: lineage, start: 'top 80%', end: 'bottom 60%', scrub: true } });
    }

    // Network path nodes light up in sequence
    gsap.from('.network__path li', {
      opacity: 0, x: -24, duration: 1, ease: 'expo.out', stagger: 0.12,
      scrollTrigger: { trigger: '.network', start: 'top 78%', end: 'max' }
    });

    // SSIT pillars: horizontal flight on desktop, stacked on mobile
    var mm = gsap.matchMedia();
    mm.add('(min-width: 961px)', function () {
      var track = $('.pillars__track'), bar = $('.pillars__progress span');
      var dist = function () { return Math.max(0, track.scrollWidth - document.documentElement.clientWidth); };
      var tween = gsap.to(track, {
        x: function () { return -dist(); },
        ease: 'none',
        scrollTrigger: {
          trigger: '.pillars', start: 'top top',
          end: function () { return '+=' + Math.round(dist() * 1.35); },
          pin: true, scrub: 0.8, invalidateOnRefresh: true, refreshPriority: 1,
          onUpdate: function (self) { bar.style.transform = 'scaleX(' + self.progress.toFixed(3) + ')'; }
        }
      });
      $$('.pillar').forEach(function (p) {
        gsap.from($('.pillar__art', p), {
          rotate: -50, scale: 0.55, opacity: 0, duration: 1.6, ease: 'expo.out',
          scrollTrigger: { trigger: p, containerAnimation: tween, start: 'left 88%' }
        });
      });
    });
    mm.add('(max-width: 960px)', function () {
      $$('.pillar').forEach(function (p) {
        gsap.from(p, { y: 70, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: p, start: 'top 90%', end: 'max' } });
      });
    });

    // Journey: the spine draws, each chapter lights its node, photos open
    var spine = $('.timeline__spine span');
    if (spine) {
      gsap.to(spine, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.timeline', start: 'top 62%', end: 'bottom 62%', scrub: true } });
    }
    $$('.event').forEach(function (ev) {
      ScrollTrigger.create({ trigger: ev, start: 'top 62%', end: 'bottom 38%', toggleClass: 'is-lit' });
      var frame = $('.frame', ev);
      gsap.fromTo(frame,
        { clipPath: 'inset(22% 8% 22% 8%)', scale: 0.94, opacity: 0.3 },
        { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, opacity: 1, ease: 'none', scrollTrigger: { trigger: frame, start: 'top 96%', end: 'top 45%', scrub: 0.6 } });
      var img = $('.frame__photo img', ev);
      if (img) {
        gsap.fromTo(img, { scale: 1.28, yPercent: -6 }, {
          scale: 1.06, yPercent: 6, ease: 'none',
          scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true }
        });
      }
      var thumbs = $$('.event__thumbs button', ev);
      if (thumbs.length) {
        gsap.from(thumbs, { opacity: 0, y: 30, duration: 1, ease: 'expo.out', stagger: 0.07, scrollTrigger: { trigger: thumbs[0], start: 'top 94%', end: 'max' } });
      }
    });

    // Join steps count up their outline numerals
    gsap.from('.step__num', {
      opacity: 0, x: -30, duration: 1.2, ease: 'expo.out', stagger: 0.12,
      scrollTrigger: { trigger: '.steps', start: 'top 82%', end: 'max' }
    });
  }

  /* ------------------------------------------------------------------
     6. Atmosphere, HUD, progress, nav state
     ------------------------------------------------------------------ */
  var ATMO = {
    hero: [47, 140, 255, 70, 227, 255],
    veltech: [56, 112, 255, 112, 92, 255],
    ieee: [0, 128, 210, 70, 227, 255],
    ssit: [139, 108, 255, 47, 140, 255],
    journey: [70, 227, 255, 60, 110, 255],
    team: [47, 140, 255, 139, 108, 255]
  };
  var atmoEl = $('.atmosphere');
  var atmo = { a: 47, b: 140, c: 255, d: 70, e: 227, f: 255 };
  function applyAtmo() {
    atmoEl.style.setProperty('--a1', Math.round(atmo.a) + ',' + Math.round(atmo.b) + ',' + Math.round(atmo.c));
    atmoEl.style.setProperty('--a2', Math.round(atmo.d) + ',' + Math.round(atmo.e) + ',' + Math.round(atmo.f));
  }
  function setAtmo(key) {
    var t = ATMO[key];
    if (!t) return;
    gsap.to(atmo, { a: t[0], b: t[1], c: t[2], d: t[3], e: t[4], f: t[5], duration: 1.8, ease: 'power2.out', overwrite: true, onUpdate: applyAtmo });
  }

  function chrome() {
    $$('[data-atmo]').forEach(function (sec) {
      ScrollTrigger.create({
        trigger: sec, start: 'top 55%', end: 'bottom 55%',
        onToggle: function (self) { if (self.isActive) setAtmo(sec.getAttribute('data-atmo')); }
      });
    });

    var hud = $('.hud');
    function setActive(id) {
      $$('[data-hud]').forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('data-hud') === id); });
      $$('.nav__links a').forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + id); });
    }
    ['veltech', 'ieee', 'ssit', 'journey', 'team'].forEach(function (id) {
      ScrollTrigger.create({
        trigger: '#' + id, start: 'top 50%', end: 'bottom 50%',
        onToggle: function (self) { if (self.isActive) setActive(id); }
      });
    });
    ScrollTrigger.create({
      trigger: '.hero', start: 'bottom 45%',
      onEnter: function () { hud.classList.add('is-visible'); },
      onLeaveBack: function () { hud.classList.remove('is-visible'); setActive(null); }
    });

    gsap.to('.progress span', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });

    var nav = $('.nav'), lastY = window.scrollY;
    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      nav.classList.toggle('is-hidden', y > lastY && y > 260 && !menuOpen && !warping);
      if (y < lastY - 4 || y < 260) nav.classList.remove('is-hidden');
      lastY = y;
    }, { passive: true });
  }

  /* ------------------------------------------------------------------
     7. Warp transitions between sections
     ------------------------------------------------------------------ */
  var warping = false;

  function destinationFor(target) {
    if (target.id === 'top') return 0;
    var y = target.getBoundingClientRect().top + window.scrollY;
    if (target.classList.contains('chapter')) return y + window.innerHeight * 0.12;
    return y - 90;
  }

  function focusTarget(target) {
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }

  function warpTo(hash) {
    var target = document.querySelector(hash);
    if (!target) return;
    var dest = function () { return Math.max(0, destinationFor(target)); };
    var url = hash === '#top' ? window.location.pathname + window.location.search : hash;

    if (reduced || !lenis) {
      window.scrollTo(0, dest());
      focusTarget(target);
      history.replaceState(null, '', url);
      return;
    }
    if (warping) return;
    warping = true;

    var src = target.closest('[data-warp-title]') || target;
    $('.warp__num').textContent = src.getAttribute('data-warp-num') || '';
    $('.warp__title').textContent = src.getAttribute('data-warp-title') || '';
    $('.warp__sub').textContent = src.getAttribute('data-warp-sub') || '';
    var parts = $$('.warp__label > *');
    var scene = ['main', '.footer', '.hud'];

    gsap.timeline({ onComplete: function () { warping = false; gsap.set('.warp', { visibility: 'hidden' }); } })
      .set('.warp', { visibility: 'visible' })
      .add(function () { stars.warpTo(1, 0.85); }, 0)
      .to(scene, { opacity: 0, duration: 0.5, ease: 'power2.in' }, 0)
      .to('.warp__tunnel', { opacity: 1, duration: 0.6, ease: 'power2.out' }, 0)
      .fromTo(parts,
        { opacity: 0, y: 36, scale: 0.9, filter: 'blur(12px)' },
        { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.75, ease: 'expo.out', stagger: 0.07 }, 0.2)
      .add(function () {
        lenis.scrollTo(dest(), { immediate: true, force: true });
        ScrollTrigger.update();
      }, 0.85)
      .add(function () { stars.warpTo(0, 1.6); }, 1.1)
      .to('.warp__flash', { opacity: 0.85, duration: 0.14, ease: 'power1.in' }, 1.1)
      .to(parts, { opacity: 0, y: -28, scale: 1.14, filter: 'blur(10px)', duration: 0.5, ease: 'power2.in', stagger: 0.04 }, 1.1)
      .to('.warp__flash', { opacity: 0, duration: 0.9, ease: 'power2.out' }, 1.24)
      .to('.warp__tunnel', { opacity: 0, duration: 0.8 }, 1.24)
      .to(scene, { opacity: 1, duration: 0.9, ease: 'power2.out', clearProps: 'opacity' }, 1.24)
      .add(function () { focusTarget(target); history.replaceState(null, '', url); }, 1.3);
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-warp]');
    if (!a) return;
    var hash = a.getAttribute('href');
    if (!hash || hash.charAt(0) !== '#' || !document.querySelector(hash)) return;
    e.preventDefault();
    if (menuOpen) closeMenu();
    warpTo(hash);
  });

  /* ------------------------------------------------------------------
     8. Mobile menu
     ------------------------------------------------------------------ */
  var menu = $('#menu'), toggle = $('.nav__toggle'), menuOpen = false;

  function openMenu() {
    menuOpen = true;
    menu.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    $('.sr-only', toggle).textContent = 'Close menu';
    if (lenis) lenis.stop();
    gsap.fromTo(menu, { opacity: 0 }, { opacity: 1, duration: 0.4 });
    gsap.fromTo('.menu__links a', { yPercent: 70, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.9, ease: 'expo.out', stagger: 0.05 });
  }
  function closeMenu() {
    menuOpen = false;
    toggle.setAttribute('aria-expanded', 'false');
    $('.sr-only', toggle).textContent = 'Open menu';
    if (lenis) lenis.start();
    gsap.to(menu, { opacity: 0, duration: 0.3, onComplete: function () { menu.hidden = true; } });
  }
  toggle.addEventListener('click', function () { if (menuOpen) closeMenu(); else openMenu(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menuOpen) closeMenu(); });

  /* ------------------------------------------------------------------
     9. Pointer craft: cursor, magnetic buttons, tilt cards, parallax
     ------------------------------------------------------------------ */
  function pointerCraft() {
    if (!finePointer || reduced) return;
    root.classList.add('has-cursor');
    var cursor = $('.cursor'), dot = $('.cursor__dot'), ring = $('.cursor__ring');
    var dx = gsap.quickTo(dot, 'x', { duration: 0.1, ease: 'power3' });
    var dy = gsap.quickTo(dot, 'y', { duration: 0.1, ease: 'power3' });
    var rx = gsap.quickTo(ring, 'x', { duration: 0.5, ease: 'power3' });
    var ry = gsap.quickTo(ring, 'y', { duration: 0.5, ease: 'power3' });
    var ox = gsap.quickTo('.hero__orbits', 'x', { duration: 1.4, ease: 'power3' });
    var oy = gsap.quickTo('.hero__orbits', 'y', { duration: 1.4, ease: 'power3' });

    window.addEventListener('pointermove', function (e) {
      cursor.classList.add('is-visible');
      dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
      ox((e.clientX / window.innerWidth - 0.5) * -34);
      oy((e.clientY / window.innerHeight - 0.5) * -22);
    }, { passive: true });
    document.addEventListener('mouseleave', function () { cursor.classList.remove('is-visible'); });
    document.addEventListener('pointerover', function (e) {
      cursor.classList.toggle('is-hover', !!e.target.closest('a, button, [data-tilt], .globe, input, textarea'));
    });

    $$('[data-magnetic]').forEach(function (el) {
      var mx = gsap.quickTo(el, 'x', { duration: 0.7, ease: 'power3' });
      var my = gsap.quickTo(el, 'y', { duration: 0.7, ease: 'power3' });
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        mx((e.clientX - (r.left + r.width / 2)) * 0.32);
        my((e.clientY - (r.top + r.height / 2)) * 0.32);
      });
      el.addEventListener('pointerleave', function () { mx(0); my(0); });
    });

    $$('[data-tilt]').forEach(function (el) {
      gsap.set(el, { transformPerspective: 900 });
      var tx = gsap.quickTo(el, 'rotationX', { duration: 0.8, ease: 'power3' });
      var ty = gsap.quickTo(el, 'rotationY', { duration: 0.8, ease: 'power3' });
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        ty((px - 0.5) * 9);
        tx((0.5 - py) * 9);
        el.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
      });
      el.addEventListener('pointerleave', function () { tx(0); ty(0); });
    });
  }

  /* ------------------------------------------------------------------
     10. Lightbox for event photos
     ------------------------------------------------------------------ */
  function lightbox() {
    var lb = $('.lightbox');
    if (!lb || typeof lb.showModal !== 'function') return;
    var img = $('img', lb), cap = $('.lightbox__caption', lb);
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-lightbox]');
      if (!b) return;
      img.src = b.getAttribute('data-lightbox');
      img.alt = b.getAttribute('data-caption') || '';
      cap.textContent = b.getAttribute('data-caption') || '';
      lb.showModal();
      if (lenis) lenis.stop();
      gsap.fromTo(lb, { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'expo.out' });
    });
    $('.lightbox__close', lb).addEventListener('click', function () { lb.close(); });
    lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
    lb.addEventListener('close', function () { if (lenis) lenis.start(); });
  }

  /* ------------------------------------------------------------------
     Go
     ------------------------------------------------------------------ */
  if (!reduced) scrollScenes();
  chrome();
  pointerCraft();
  lightbox();
  ScrollTrigger.sort();
  ScrollTrigger.refresh();
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  boot();
})();
