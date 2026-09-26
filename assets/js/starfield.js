/* ==========================================================================
   Starfield — a 3D star tunnel that drifts at rest, streaks on scroll and
   jumps to hyperspace for the warp transitions.
   ========================================================================== */
(function () {
  'use strict';

  var COLORS = ['#ffffff', '#cfe8ff', '#7fc4ff', '#a894ff'];

  function Starfield(canvas, opts) {
    opts = opts || {};
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.reduced = !!opts.reduced;
    this.warp = opts.warp || 0;      // 0..1 hyperspace amount (tweened)
    this.boost = 0;                  // 0..1 extra speed while passing chapter gates
    this.scrollV = 0;                // latest scroll velocity from Lenis
    this.sv = 0;                     // smoothed scroll velocity
    this.pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    this.last = performance.now();

    this.frame = this.frame.bind(this);
    this.resize = this.resize.bind(this);
    this.resize();

    var self = this, t;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(self.resize, 120);
    });
    window.addEventListener('pointermove', function (e) {
      self.pointer.tx = e.clientX / window.innerWidth - 0.5;
      self.pointer.ty = e.clientY / window.innerHeight - 0.5;
    }, { passive: true });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) { self.last = performance.now(); self.loop(); }
    });
    this.loop();
  }

  Starfield.prototype.loop = function () {
    if (!this.raf) this.raf = requestAnimationFrame(this.frame);
  };

  Starfield.prototype.resize = function () {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = window.innerWidth, h = window.innerHeight;
    this.w = w; this.h = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var count = Math.round(Math.min(1100, Math.max(280, (w * h) / 1500)));
    this.stars = [];
    for (var i = 0; i < count; i++) this.stars.push(this.spawn({}, true));
    this.buildDust(dpr);
  };

  Starfield.prototype.spawn = function (s, anyDepth) {
    s.x = Math.random() * 2 - 1;
    s.y = Math.random() * 2 - 1;
    s.z = anyDepth ? 0.05 + Math.random() * 0.95 : 1;
    var r = Math.random();
    s.c = r < 0.62 ? 0 : r < 0.84 ? 1 : r < 0.95 ? 2 : 3;
    s.r = 0.4 + Math.random() * 0.9;
    s.tw = Math.random() * Math.PI * 2;
    return s;
  };

  /* A static layer of distant dust + a faint galactic band, drawn once. */
  Starfield.prototype.buildDust = function (dpr) {
    var pad = 40, w = this.w + pad * 2, h = this.h + pad * 2;
    var c = document.createElement('canvas');
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    var g = c.getContext('2d');
    g.scale(dpr, dpr);

    g.save();
    g.translate(w / 2, h / 2);
    g.rotate(-0.42);
    var band = g.createLinearGradient(0, -h * 0.35, 0, h * 0.35);
    band.addColorStop(0, 'rgba(60,110,255,0)');
    band.addColorStop(0.5, 'rgba(90,140,255,0.07)');
    band.addColorStop(1, 'rgba(60,110,255,0)');
    g.fillStyle = band;
    g.fillRect(-w, -h * 0.35, w * 2, h * 0.7);
    g.restore();

    var n = Math.round((w * h) / 2600);
    for (var i = 0; i < n; i++) {
      var a = Math.random() * 0.55 + 0.08;
      g.fillStyle = 'rgba(210,230,255,' + a.toFixed(2) + ')';
      var s = Math.random() < 0.94 ? 0.7 : 1.3;
      g.fillRect(Math.random() * w, Math.random() * h, s, s);
    }
    this.dust = c;
    this.dustPad = pad;
  };

  Starfield.prototype.setScrollVelocity = function (v) { this.scrollV = v || 0; };
  Starfield.prototype.setBoost = function (b) { this.boost = b; };

  Starfield.prototype.warpTo = function (value, duration) {
    if (!window.gsap) { this.warp = value; return; }
    window.gsap.to(this, {
      warp: value,
      duration: duration,
      ease: value > this.warp ? 'power2.in' : 'power3.out',
      overwrite: true
    });
  };

  Starfield.prototype.frame = function (now) {
    this.raf = null;
    if (document.hidden) return;
    var dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;

    var ctx = this.ctx, w = this.w, h = this.h, p = this.pointer;
    p.x += (p.tx - p.x) * 0.04;
    p.y += (p.ty - p.y) * 0.04;
    this.sv += (this.scrollV - this.sv) * 0.12;
    this.scrollV *= 0.9;

    var warp = this.warp;
    var drift = this.reduced ? 0 : 0.03;
    var speed = drift + warp * 2.4 + this.boost * 0.4 + Math.min(Math.abs(this.sv) * 0.0035, 0.45);
    var shift = this.reduced ? 0 : this.sv * 0.0011;

    ctx.clearRect(0, 0, w, h);

    ctx.globalAlpha = 1 - warp * 0.7;
    var pad = this.dustPad;
    ctx.drawImage(this.dust, -pad - p.x * 16, -pad - p.y * 16, w + pad * 2, h + pad * 2);

    var cx = w / 2 - p.x * 40, cy = h / 2 - p.y * 40;
    var fov = Math.max(w, h) * 0.5;
    var streakK = 5 + warp * 18;
    var drawStreak = speed > 0.22;
    var time = now * 0.0018;

    for (var i = 0; i < this.stars.length; i++) {
      var s = this.stars[i];
      s.z -= speed * dt;
      s.y -= shift * (1.1 - s.z) * s.z * 0.12;
      if (s.y < -1.3) s.y += 2.6; else if (s.y > 1.3) s.y -= 2.6;
      if (s.z <= 0.03) { this.spawn(s, false); continue; }

      var k = fov / s.z;
      var x = cx + s.x * k, y = cy + s.y * k;
      if (x < -60 || x > w + 60 || y < -60 || y > h + 60) {
        if (s.z < 0.6) this.spawn(s, false);
        continue;
      }
      var depth = 1 - s.z;
      var alpha = Math.min(1, 0.12 + depth * 1.15) * (0.78 + 0.22 * Math.sin(time + s.tw));
      var size = s.r * (0.35 + depth * 1.9);

      ctx.globalAlpha = alpha;
      if (drawStreak) {
        var pz = Math.min(1.2, s.z + speed * dt * streakK);
        var k2 = fov / pz;
        ctx.strokeStyle = COLORS[s.c];
        ctx.lineWidth = Math.max(0.6, size * 0.9);
        ctx.beginPath();
        ctx.moveTo(cx + s.x * k2, cy + s.y * k2);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else {
        ctx.fillStyle = COLORS[s.c];
        if (size < 1.4) {
          ctx.fillRect(x - size / 2, y - size / 2, size, size);
        } else {
          ctx.beginPath();
          ctx.arc(x, y, size / 2, 0, 6.2832);
          ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;
    this.loop();
  };

  window.Starfield = Starfield;
})();
