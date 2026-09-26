/* ==========================================================================
   Campus — an isometric skyline of glowing blocks that rises with scroll:
   an abstract picture of an institution built on research and development.
   ========================================================================== */
(function () {
  'use strict';

  var N = 7;

  // deterministic "random" so the skyline is the same on every visit
  function rand(i, j) {
    var s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  function Campus(canvas, opts) {
    if (!canvas) return;
    opts = opts || {};
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.reduced = !!opts.reduced;
    this.progress = this.reduced ? 1 : 0;   // target, set from scroll
    this.shown = this.progress;             // eased value that is drawn
    this.visible = false;

    this.cells = [];
    var c = (N - 1) / 2;
    for (var i = 0; i < N; i++) {
      for (var j = 0; j < N; j++) {
        var d = Math.hypot(i - c, j - c) / c;
        var r = rand(i, j);
        var h = r < 0.2 ? 0 : (0.25 + r * 0.9) * (1.25 - d * 0.7);
        if (i === 3 && j === 3) h = 1.9;           // central tower
        if ((i === 2 && j === 4) || (i === 4 && j === 2)) h = 1.25;
        this.cells.push({ i: i, j: j, h: Math.max(0, h), beacon: h > 1.05 && r > 0.4 });
      }
    }
    this.cells.sort(function (a, b) { return (a.i + a.j) - (b.i + b.j) || a.i - b.i; });

    this.frame = this.frame.bind(this);
    this.resize = this.resize.bind(this);
    this.resize();
    window.addEventListener('resize', this.resize);

    var self = this;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        self.visible = entries[0].isIntersecting;
        if (self.visible) self.loop();
      }, { rootMargin: '80px' }).observe(canvas);
    } else {
      this.visible = true;
      this.loop();
    }
  }

  Campus.prototype.setProgress = function (p) { this.progress = p; };

  Campus.prototype.resize = function () {
    var rect = this.canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = rect.width; this.h = rect.height;
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.tw = Math.min(this.w / (N + 1.2), (this.h * 1.3) / (N + 1.2));
    this.th = this.tw * 0.5;
    this.ox = this.w / 2;
    this.oy = this.h * 0.5 - (N * this.th) / 2 + this.tw * 0.55;
    if (!this.raf) this.draw(performance.now());
  };

  Campus.prototype.loop = function () {
    if (!this.raf && this.visible) this.raf = requestAnimationFrame(this.frame);
  };

  Campus.prototype.frame = function (now) {
    this.raf = null;
    this.draw(now);
    if (this.visible && !document.hidden) this.loop();
  };

  Campus.prototype.draw = function (now) {
    var ctx = this.ctx, tw = this.tw, th = this.th, ox = this.ox, oy = this.oy;
    ctx.clearRect(0, 0, this.w, this.h);
    var t = now / 1000;
    var scan = this.reduced ? -10 : ((t * 2.2) % (2 * N + 6)) - 3;

    // ground grid
    ctx.strokeStyle = 'rgba(90,170,255,0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var g = 0; g <= N; g++) {
      ctx.moveTo(ox + (g - 0) * tw / 2, oy + (g + 0) * th / 2);
      ctx.lineTo(ox + (g - N) * tw / 2, oy + (g + N) * th / 2);
      ctx.moveTo(ox + (0 - g) * tw / 2, oy + (0 + g) * th / 2);
      ctx.lineTo(ox + (N - g) * tw / 2, oy + (N + g) * th / 2);
    }
    ctx.stroke();

    this.shown += (this.progress - this.shown) * 0.08;
    var p = this.shown;
    for (var k = 0; k < this.cells.length; k++) {
      var c = this.cells[k];
      if (!c.h) continue;
      var delay = ((c.i + c.j) / (2 * N)) * 0.45;
      var local = Math.max(0, Math.min(1, (p - delay) / 0.55));
      var e = 1 - Math.pow(1 - local, 3);
      var H = c.h * tw * 1.05 * e;
      if (H < 0.5) continue;

      var x = ox + (c.i - c.j) * tw / 2;
      var y = oy + (c.i + c.j) * th / 2;
      var inset = tw * 0.1;
      var top = [x, y + inset * 0.5 - H];
      var right = [x + tw / 2 - inset, y + th / 2 - H];
      var bottom = [x, y + th - inset * 0.5 - H];
      var left = [x - tw / 2 + inset, y + th / 2 - H];
      var glow = Math.max(0, 1 - Math.abs(c.i + c.j - scan) / 1.6);

      // left face
      ctx.fillStyle = 'rgba(22,56,130,' + (0.62 + glow * 0.2).toFixed(2) + ')';
      ctx.beginPath();
      ctx.moveTo(left[0], left[1]); ctx.lineTo(bottom[0], bottom[1]);
      ctx.lineTo(bottom[0], bottom[1] + H); ctx.lineTo(left[0], left[1] + H);
      ctx.closePath(); ctx.fill();
      // right face
      ctx.fillStyle = 'rgba(10,28,72,' + (0.78 + glow * 0.15).toFixed(2) + ')';
      ctx.beginPath();
      ctx.moveTo(bottom[0], bottom[1]); ctx.lineTo(right[0], right[1]);
      ctx.lineTo(right[0], right[1] + H); ctx.lineTo(bottom[0], bottom[1] + H);
      ctx.closePath(); ctx.fill();

      // window lines on the right face
      ctx.strokeStyle = 'rgba(120,200,255,' + (0.12 + glow * 0.35).toFixed(2) + ')';
      ctx.beginPath();
      for (var f = 8; f < H - 4; f += 9) {
        ctx.moveTo(bottom[0] + 3, bottom[1] + f - 1.5);
        ctx.lineTo(right[0] - 3, right[1] + f - 1.5);
      }
      ctx.stroke();

      // top face
      ctx.fillStyle = 'rgba(' + Math.round(70 + glow * 120) + ',' + Math.round(150 + glow * 80) + ',255,' + (0.2 + glow * 0.45).toFixed(2) + ')';
      ctx.beginPath();
      ctx.moveTo(top[0], top[1]); ctx.lineTo(right[0], right[1]);
      ctx.lineTo(bottom[0], bottom[1]); ctx.lineTo(left[0], left[1]);
      ctx.closePath(); ctx.fill();

      // edges
      ctx.strokeStyle = 'rgba(140,215,255,' + (0.45 + glow * 0.5).toFixed(2) + ')';
      ctx.beginPath();
      ctx.moveTo(top[0], top[1]); ctx.lineTo(right[0], right[1]);
      ctx.lineTo(bottom[0], bottom[1]); ctx.lineTo(left[0], left[1]); ctx.closePath();
      ctx.moveTo(bottom[0], bottom[1]); ctx.lineTo(bottom[0], bottom[1] + H);
      ctx.stroke();

      if (c.beacon && e > 0.95) {
        var bx = (top[0] + bottom[0]) / 2, by = (top[1] + bottom[1]) / 2;
        var a = 0.55 + 0.45 * Math.sin(t * 2 + c.i);
        ctx.strokeStyle = 'rgba(140,215,255,0.6)';
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by - tw * 0.45); ctx.stroke();
        ctx.fillStyle = 'rgba(70,227,255,' + a.toFixed(2) + ')';
        ctx.shadowColor = '#46e3ff'; ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.arc(bx, by - tw * 0.45, 2.6, 0, 6.2832); ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
  };

  window.Campus = Campus;
})();
