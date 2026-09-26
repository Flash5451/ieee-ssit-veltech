/* ==========================================================================
   Globe — a dotted Earth with arcs from Chennai to the wider IEEE world.
   Land dots come from a 2° land mask (data/landmask.js). Drag to spin.
   ========================================================================== */
(function () {
  'use strict';

  var D = Math.PI / 180;
  var HUBS = {
    chennai: [13.08, 80.27],
    newyork: [40.71, -74.01],
    london: [51.51, -0.13],
    berlin: [52.52, 13.4],
    tokyo: [35.68, 139.69],
    singapore: [1.35, 103.82],
    sydney: [-33.87, 151.21],
    dubai: [25.2, 55.27],
    nairobi: [-1.29, 36.82],
    saopaulo: [-23.55, -46.63],
    sanfrancisco: [37.77, -122.42]
  };

  function vec(lat, lon) {
    var p = lat * D, l = lon * D;
    return [Math.cos(p) * Math.sin(l), Math.sin(p), Math.cos(p) * Math.cos(l)];
  }

  function slerp(a, b, t) {
    var dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    var om = Math.acos(Math.max(-1, Math.min(1, dot)));
    var so = Math.sin(om) || 1;
    var k1 = Math.sin((1 - t) * om) / so, k2 = Math.sin(t * om) / so;
    return [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2];
  }

  function Globe(canvas, opts) {
    if (!canvas) return;
    opts = opts || {};
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.reduced = !!opts.reduced;
    this.labels = (opts.labels || []).map(function (el) { return { el: el, hub: el.getAttribute('data-hub') }; });
    this.rot = -62 * D;      // start with India facing the viewer
    this.tilt = 0.32;
    this.spin = 0.07;        // radians / second
    this.drag = null;
    this.visible = false;
    this.last = performance.now();

    this.points = this.decode(window.SSIT_LANDMASK || '');
    this.hubs = {};
    for (var k in HUBS) this.hubs[k] = vec(HUBS[k][0], HUBS[k][1]);
    this.arcs = [];
    var i = 0;
    for (var key in this.hubs) {
      if (key === 'chennai') continue;
      this.arcs.push(this.buildArc(this.hubs.chennai, this.hubs[key], i++));
    }

    this.frame = this.frame.bind(this);
    this.resize = this.resize.bind(this);
    this.resize();
    window.addEventListener('resize', this.resize);
    this.bindDrag();

    var self = this;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        self.visible = entries[0].isIntersecting;
        if (self.visible) { self.last = performance.now(); self.loop(); }
      }, { rootMargin: '100px' }).observe(canvas);
    } else {
      this.visible = true;
      this.loop();
    }
  }

  Globe.prototype.decode = function (b64) {
    var pts = [];
    if (!b64) return pts;
    var bin = atob(b64), W = 180, H = 90;
    for (var r = 0; r < H; r++) {
      var lat = 89 - r * 2;
      var step = Math.max(1, Math.round(1 / Math.max(Math.cos(lat * D), 0.12)));
      for (var c = 0; c < W; c += step) {
        var idx = r * W + c;
        if (bin.charCodeAt(idx >> 3) & (1 << (idx & 7))) pts.push(vec(lat, -179 + c * 2));
      }
    }
    return pts;
  };

  Globe.prototype.buildArc = function (a, b, i) {
    var dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    var dist = Math.acos(Math.max(-1, Math.min(1, dot)));
    var lift = 0.08 + dist * 0.12;
    var pts = [];
    for (var s = 0; s <= 48; s++) {
      var t = s / 48, v = slerp(a, b, t), h = 1 + Math.sin(t * Math.PI) * lift;
      pts.push([v[0] * h, v[1] * h, v[2] * h]);
    }
    return { pts: pts, offset: i * 0.37, speed: 0.16 + (i % 3) * 0.04 };
  };

  Globe.prototype.resize = function () {
    var rect = this.canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = rect.width; this.h = rect.height;
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.R = Math.min(this.w, this.h) * 0.4;
    if (!this.raf) this.draw(performance.now());
  };

  Globe.prototype.bindDrag = function () {
    var self = this;
    this.canvas.addEventListener('pointerdown', function (e) {
      self.drag = { x: e.clientX, rot: self.rot, t: performance.now() };
      self.canvas.setPointerCapture(e.pointerId);
    });
    this.canvas.addEventListener('pointermove', function (e) {
      if (!self.drag) return;
      var dx = e.clientX - self.drag.x;
      self.rot = self.drag.rot + dx * 0.006;
    });
    var end = function () { self.drag = null; };
    this.canvas.addEventListener('pointerup', end);
    this.canvas.addEventListener('pointercancel', end);
  };

  Globe.prototype.project = function (v, cosA, sinA, cosT, sinT) {
    var x = v[0] * cosA + v[2] * sinA;
    var z = -v[0] * sinA + v[2] * cosA;
    var y = v[1] * cosT - z * sinT;
    z = v[1] * sinT + z * cosT;
    return [this.cx + x * this.R, this.cy - y * this.R, z];
  };

  Globe.prototype.loop = function () {
    if (!this.raf && this.visible) this.raf = requestAnimationFrame(this.frame);
  };

  Globe.prototype.frame = function (now) {
    this.raf = null;
    var dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (!this.drag && !this.reduced) this.rot += this.spin * dt;
    this.draw(now);
    if (this.visible && !document.hidden) this.loop();
  };

  Globe.prototype.draw = function (now) {
    var ctx = this.ctx, R = this.R;
    this.cx = this.w / 2; this.cy = this.h / 2;
    var cosA = Math.cos(this.rot), sinA = Math.sin(this.rot);
    var cosT = Math.cos(this.tilt), sinT = Math.sin(this.tilt);
    ctx.clearRect(0, 0, this.w, this.h);

    // atmosphere
    var atm = ctx.createRadialGradient(this.cx, this.cy, R * 0.9, this.cx, this.cy, R * 1.32);
    atm.addColorStop(0, 'rgba(70,170,255,0.28)');
    atm.addColorStop(0.35, 'rgba(47,120,255,0.1)');
    atm.addColorStop(1, 'rgba(47,120,255,0)');
    ctx.fillStyle = atm;
    ctx.beginPath(); ctx.arc(this.cx, this.cy, R * 1.32, 0, 6.2832); ctx.fill();

    // body
    var body = ctx.createRadialGradient(this.cx - R * 0.35, this.cy - R * 0.4, R * 0.1, this.cx, this.cy, R);
    body.addColorStop(0, '#0f2552');
    body.addColorStop(0.6, '#061029');
    body.addColorStop(1, '#030817');
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.arc(this.cx, this.cy, R, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = 'rgba(120,200,255,0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // land dots
    var pts = this.points, dotR = Math.max(1, R / 210);
    ctx.fillStyle = '#9fd6ff';
    for (var i = 0; i < pts.length; i++) {
      var p = this.project(pts[i], cosA, sinA, cosT, sinT);
      if (p[2] <= 0) continue;
      ctx.globalAlpha = 0.18 + p[2] * 0.8;
      ctx.fillRect(p[0] - dotR, p[1] - dotR, dotR * 2, dotR * 2);
    }
    ctx.globalAlpha = 1;

    // arcs + travelling packets
    var t = now / 1000;
    for (var a = 0; a < this.arcs.length; a++) {
      var arc = this.arcs[a], prev = null;
      ctx.strokeStyle = 'rgba(70,227,255,0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var s = 0; s < arc.pts.length; s++) {
        var q = this.project(arc.pts[s], cosA, sinA, cosT, sinT);
        var vis = q[2] > -0.05;
        if (vis && prev) ctx.lineTo(q[0], q[1]); else if (vis) ctx.moveTo(q[0], q[1]);
        prev = vis ? q : null;
      }
      ctx.stroke();

      var u = (t * arc.speed + arc.offset) % 1;
      var head = this.project(arc.pts[Math.floor(u * (arc.pts.length - 1))], cosA, sinA, cosT, sinT);
      if (head[2] > 0) {
        ctx.fillStyle = '#e6fbff';
        ctx.shadowColor = '#46e3ff';
        ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(head[0], head[1], 2.2, 0, 6.2832); ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    // hubs
    var pulse = (t % 2.4) / 2.4;
    for (var key in this.hubs) {
      var h = this.project(this.hubs[key], cosA, sinA, cosT, sinT);
      if (h[2] <= 0) continue;
      var home = key === 'chennai';
      ctx.fillStyle = home ? '#46e3ff' : 'rgba(200,235,255,0.9)';
      ctx.beginPath(); ctx.arc(h[0], h[1], home ? 3.4 : 2.2, 0, 6.2832); ctx.fill();
      if (home) {
        ctx.strokeStyle = 'rgba(70,227,255,' + (1 - pulse).toFixed(2) + ')';
        ctx.beginPath(); ctx.arc(h[0], h[1], 4 + pulse * 18, 0, 6.2832); ctx.stroke();
      }
    }

    // HTML labels
    for (var l = 0; l < this.labels.length; l++) {
      var lab = this.labels[l], v = this.hubs[lab.hub];
      if (!v) continue;
      var lp = this.project(v, cosA, sinA, cosT, sinT);
      lab.el.style.transform = 'translate(' + (lp[0] + 12).toFixed(1) + 'px,' + (lp[1] - 14).toFixed(1) + 'px)';
      lab.el.style.opacity = Math.max(0, Math.min(1, (lp[2] - 0.15) * 3)).toFixed(2);
    }
  };

  window.Globe = Globe;
})();
