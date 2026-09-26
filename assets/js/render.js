/* ==========================================================================
   Render — builds the Journey timeline, team directory and contact panel
   from the data files in assets/js/data/.
   ========================================================================== */
(function () {
  'use strict';

  var SSIT = (window.SSIT = window.SSIT || {});

  var THEMES = {
    hackathon: { label: 'Hackathon', glyph: '&lt;/&gt;' },
    workshop: { label: 'Workshop', glyph: '⌬' },
    outreach: { label: 'Outreach', glyph: '◎' },
    talk: { label: 'Talk · Seminar', glyph: '❝' },
    competition: { label: 'Competition', glyph: '◆' },
    milestone: { label: 'Milestone', glyph: '✦' }
  };

  // Layout samples, shown only with ?preview=journey while the archive is empty.
  var SAMPLES = [
    { type: 'hackathon', title: 'Hackathon layout', summary: 'Terminal framing, neon-mint accents and a code-driven rhythm.', description: 'Sample block. A real hackathon replaces this with its story, photos and results.', outcomes: ['Outcomes are listed here', 'Only real results are shown'], role: 'Your role, if you want it included' },
    { type: 'workshop', title: 'Workshop layout', summary: 'Blueprint grids and technical annotations for hands-on sessions.', description: 'Sample block. A real workshop replaces this with what was taught and built.' },
    { type: 'outreach', title: 'Outreach layout', summary: 'Warm tones and soft shapes for community and social-impact work.', description: 'Sample block. A real outreach programme replaces this with who it reached and why it mattered.' },
    { type: 'talk', title: 'Talk layout', summary: 'Spotlight staging for speakers, panels and big ideas.', description: 'Sample block. A real talk replaces this with the speaker, topic and key takeaways.' },
    { type: 'competition', title: 'Competition layout', summary: 'Gold accents and a podium motif for contests and awards.', description: 'Sample block. A real competition replaces this with the challenge and the results.' },
    { type: 'milestone', title: 'Milestone layout', summary: 'A clean, luminous frame for chapter firsts and turning points.', description: 'Sample block. A real milestone replaces this with what changed for the chapter.' }
  ];

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function slug(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return esc(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function dateLabel(ev) {
    if (!ev.date) return '';
    var label = fmtDate(ev.date);
    if (ev.endDate && ev.endDate !== ev.date) label += ' – ' + fmtDate(ev.endDate);
    return '<time datetime="' + esc(ev.date) + '">' + label + '</time>';
  }

  /* ---------------- Journey ---------------- */

  function artHTML(type) {
    switch (type) {
      case 'hackathon':
        return '<span>$ ssit init --idea</span><span>&gt; compiling concept…</span><span>$ build --for impact</span><span>&gt; tests passing ✓</span><span>$ ship <i class="caret"></i></span>';
      case 'workshop':
        return '<svg viewBox="0 0 100 75" preserveAspectRatio="none"><circle cx="50" cy="37" r="20"/><circle cx="50" cy="37" r="3"/><path d="M50 5v64M12 37h76M30 17l40 40M30 57l40-40" stroke-dasharray="1.5 2"/><rect x="18" y="12" width="64" height="50"/></svg>';
      case 'outreach':
        return '<i></i><i></i><i></i><i></i>';
      case 'competition':
        return '<i></i><i></i><i></i>';
      default:
        return '';
    }
  }

  function photoButton(photo, fallbackAlt, cls) {
    return '<button class="' + cls + '" type="button" data-lightbox="' + esc(photo.src) + '" data-caption="' + esc(photo.alt || fallbackAlt) + '">' +
      '<img src="' + esc(photo.src) + '" alt="' + esc(photo.alt || '') + '" loading="lazy" decoding="async"></button>';
  }

  function mediaHTML(ev, type) {
    var photos = (ev.photos || []).filter(function (p) { return p && p.src; });
    var poster = ev.poster && ev.poster.src ? ev.poster : null;
    var main = photos[0] || poster;
    var rest = photos.slice(1);
    if (poster && photos.length) rest.push(poster);

    var chrome = '';
    if (type === 'hackathon') chrome = '<div class="frame__bar"><i></i><i></i><i></i><span>~/ssit/' + esc(slug(ev.id || ev.title) || 'event') + '</span></div>';
    if (type === 'workshop') chrome = '<span class="frame__dim frame__dim--x">W · 4:3</span><span class="frame__dim frame__dim--y">SSIT / LAB</span>';

    var view = main
      ? photoButton(main, ev.title, 'frame__photo')
      : '<div class="frame__art frame__art--' + type + '" aria-hidden="true">' + artHTML(type) + '</div>';

    var thumbs = rest.length
      ? '<div class="event__thumbs">' + rest.slice(0, 4).map(function (p) { return photoButton(p, ev.title, ''); }).join('') + '</div>'
      : '';

    return '<div class="frame frame--' + type + '">' + chrome + '<div class="frame__view">' + view + '</div></div>' + thumbs;
  }

  function eventHTML(ev, i) {
    var type = THEMES[ev.type] ? ev.type : 'milestone';
    var theme = THEMES[type];
    var n = String(i + 1).padStart(2, '0');
    var id = 'event-' + (slug(ev.id) || n);

    var story = String(ev.description || '').split(/\n\s*\n/).filter(Boolean)
      .map(function (p) { return '<p>' + esc(p.trim()) + '</p>'; }).join('');
    if (ev.outcomes && ev.outcomes.length) {
      story += '<ul class="event__outcomes">' + ev.outcomes.map(function (o) { return '<li>' + esc(o) + '</li>'; }).join('') + '</ul>';
    }
    if (ev.role) story += '<p class="event__role"><span>Role</span>' + esc(ev.role) + '</p>';
    if (ev.links && ev.links.length) {
      story += '<div class="event__links">' + ev.links.map(function (l) {
        return '<a class="link-arrow" href="' + esc(l.href) + '" target="_blank" rel="noopener">' + esc(l.label) + ' <span aria-hidden="true">↗</span></a>';
      }).join('') + '</div>';
    }

    return '' +
      '<article class="event event--' + type + (i % 2 ? ' event--flip' : '') + '" id="' + id + '" data-theme="' + type + '">' +
        '<div class="event__node" aria-hidden="true"><span>' + n + '</span></div>' +
        '<div class="event__grid">' +
          '<div class="event__text">' +
            '<div class="event__meta"><span class="event__chapter">Chapter ' + n + '</span>' + dateLabel(ev) +
              (ev.sample ? '<span class="event__sample">Sample layout</span>' : '') + '</div>' +
            '<span class="event__type"><i aria-hidden="true">' + theme.glyph + '</i>' + theme.label + '</span>' +
            '<h3 class="event__title" data-split="chars">' + esc(ev.title) + '</h3>' +
            (ev.summary ? '<p class="event__summary">' + esc(ev.summary) + '</p>' : '') +
            (ev.venue ? '<p class="event__venue">' + esc(ev.venue) + '</p>' : '') +
            (story ? '<div class="event__story" data-reveal>' + story + '</div>' : '') +
          '</div>' +
          '<div class="event__media" data-media>' + mediaHTML(ev, type) + '</div>' +
        '</div>' +
      '</article>';
  }

  function emptyHTML() {
    return '' +
      '<div class="transmission" data-reveal>' +
        '<div class="transmission__radar" aria-hidden="true"><span></span><span></span><span></span><i></i></div>' +
        '<p class="transmission__kicker">Chapter 01 · Awaiting transmission</p>' +
        '<h4 class="transmission__title">Our story is being written.</h4>' +
        '<p class="transmission__text">The event archive is being compiled. Every hackathon, workshop and outreach programme will appear here as its own chapter, in the order it happened.</p>' +
      '</div>';
  }

  SSIT.renderJourney = function (root, opts) {
    if (!root) return;
    opts = opts || {};
    var events = (window.SSIT_EVENTS || []).slice();
    var preview = !!opts.preview && !events.length;
    if (preview) events = SAMPLES.map(function (s) { return Object.assign({ sample: true }, s); });

    if (!events.length) {
      root.classList.add('is-empty');
      root.innerHTML = emptyHTML();
      return;
    }

    events.sort(function (a, b) { return String(a.date || '').localeCompare(String(b.date || '')); });
    root.innerHTML =
      (preview ? '<p class="timeline__preview" role="note">Preview mode — these are layout samples, not real events.</p>' : '') +
      '<div class="timeline__spine" aria-hidden="true"><span></span></div>' +
      events.map(eventHTML).join('');
  };

  /* ---------------- Team ---------------- */

  function initials(name) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(function (s) { return s[0]; }).join('').toUpperCase();
  }

  SSIT.renderTeam = function (root) {
    if (!root) return;
    var team = window.SSIT_TEAM || [];
    root.innerHTML = team.map(function (m) {
      var tba = !m.name;
      var avatar = m.photo
        ? '<img src="' + esc(m.photo) + '" alt="" loading="lazy">'
        : '<span aria-hidden="true">' + (tba ? '?' : esc(initials(m.name))) + '</span>';
      var links = [];
      if (m.linkedin) links.push('<a href="' + esc(m.linkedin) + '" target="_blank" rel="noopener">LinkedIn ↗</a>');
      if (m.email) links.push('<a href="mailto:' + esc(m.email) + '">Email</a>');
      return '' +
        '<article class="member' + (m.featured ? ' member--featured' : '') + (tba ? ' is-tba' : '') + '" data-tilt data-reveal>' +
          '<div class="member__avatar">' + avatar + '</div>' +
          '<div class="member__info">' +
            '<p class="member__role">' + esc(m.role) + '</p>' +
            '<h4 class="member__name">' + (tba ? 'To be announced' : esc(m.name)) + '</h4>' +
            (m.detail ? '<p class="member__detail">' + esc(m.detail) + '</p>' : '') +
            (links.length ? '<div class="member__links">' + links.join('') + '</div>' : '') +
          '</div>' +
        '</article>';
    }).join('');
  };

  /* ---------------- Contact ---------------- */

  function pretty(url) {
    return String(url).replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
  }

  SSIT.renderContact = function (root) {
    if (!root) return;
    var c = ((window.SSIT_SITE || {}).contact) || {};
    var rows = [
      ['Email', c.email ? 'mailto:' + c.email : '', c.email],
      ['Instagram', c.instagram, c.instagram && pretty(c.instagram)],
      ['LinkedIn', c.linkedin, c.linkedin && pretty(c.linkedin)],
      ['Web', c.website, c.website && pretty(c.website)]
    ].filter(function (r) { return r[1]; });

    var html = rows.length
      ? '<ul class="contact__list">' + rows.map(function (r) {
          var ext = r[0] !== 'Email' ? ' target="_blank" rel="noopener"' : '';
          return '<li><a href="' + esc(r[1]) + '"' + ext + '><small>' + r[0] + '</small><span>' + esc(r[2]) + '</span></a></li>';
        }).join('') + '</ul>'
      : '<div class="contact__pending"><span class="eyebrow__dot" aria-hidden="true"></span><div><b>Channels coming online.</b><p>The chapter\'s official email and social links will be published here soon.</p></div></div>';

    if (c.email) {
      html += '' +
        '<form class="form" novalidate>' +
          '<label><span>Name</span><input name="name" autocomplete="name" required></label>' +
          '<label><span>Email</span><input name="email" type="email" autocomplete="email" required></label>' +
          '<label><span>Message</span><textarea name="message" required></textarea></label>' +
          '<button class="btn btn--primary" type="submit" data-magnetic><span>Send message</span></button>' +
        '</form>';
    }
    root.innerHTML = html;

    var form = root.querySelector('form');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var d = new FormData(form);
        var subject = 'Hello IEEE SSIT Vel Tech — ' + (d.get('name') || '');
        var body = (d.get('message') || '') + '\n\n— ' + (d.get('name') || '') + ' (' + (d.get('email') || '') + ')';
        window.location.href = 'mailto:' + c.email + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      });
    }
  };
})();
