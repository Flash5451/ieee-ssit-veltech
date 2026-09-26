# IEEE SSIT · Vel Tech — Engineering the Future

The website of the IEEE Society on Social Implications of Technology (SSIT) chapter at Vel Tech, Chennai.

> Ideas into innovation. Innovation into impact.
> **Science · Systems · Technology · Innovation**

A cinematic, single-page site: a boot sequence, a hyperspace starfield, warp-speed transitions between chapters, and
scroll-driven storytelling. It is plain HTML, CSS and JavaScript with **no build step**.

## Run it locally

Opening `index.html` directly works, but a local server is closer to how the site behaves once hosted:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Add `?preview=journey` to the URL to see the six event layouts filled with sample blocks (they are clearly labelled as
samples, and they only appear while the event archive is empty).

## Structure

```
index.html                 page structure and all static copy
assets/css/main.css        design system: tokens, glass, layouts, event themes, responsive rules
assets/js/data/events.js   ← the event archive (Our Journey)
assets/js/data/team.js     ← team directory
assets/js/data/site.js     ← contact email and social links
assets/js/data/landmask.js world land mask for the globe (generated from Natural Earth)
assets/js/render.js        builds the timeline, team cards and contact panel from the data files
assets/js/main.js          motion: boot, hero entrance, scroll scenes, warp transitions, cursor, menu
assets/js/starfield.js     3D starfield with hyperspace warp
assets/js/globe.js         dotted Earth with arcs from Chennai
assets/js/campus.js        isometric skyline for the Vel Tech chapter
assets/vendor/             GSAP 3.15 + ScrollTrigger, Lenis 1.3 (vendored)
assets/fonts/              Unbounded, Inter, JetBrains Mono (self-hosted woff2)
```

## Updating content

### Events — `assets/js/data/events.js`

Add one object per event, in any order; the site sorts them by date and numbers the chapters. Each `type` has its own
visual identity:

| type          | look                                          |
| ------------- | --------------------------------------------- |
| `hackathon`   | terminal window, neon mint, monospace title   |
| `workshop`    | blueprint grid, corner marks, annotations     |
| `outreach`    | warm amber tones, soft rounded frames         |
| `talk`        | violet spotlight, quoted summary              |
| `competition` | gold accents, podium motif                    |
| `milestone`   | luminous white starburst                      |

Put photos in `assets/img/events/<event-id>/` and list them in `photos`. The first photo becomes the hero image, and the
rest (plus the poster) appear as thumbnails; every image opens in a lightbox. Only real events, dates and outcomes go
in this file.

### Team — `assets/js/data/team.js`

Fill in `name` for each role (empty names show "To be announced"). Add `photo`, `detail`, `linkedin` or `email` as
needed. `featured: true` gives a person the larger card.

### Contact — `assets/js/data/site.js`

Set the chapter's official `email`, `instagram` and `linkedin`. The contact form appears once `email` is set; it
opens the visitor's mail app with the message filled in.

## Facts to confirm before launch

The institutional copy only uses facts that are public and stable, but please confirm these against official sources:

- Vel Tech's full name, Deemed-to-be-University status (Section 3, UGC Act 1956), and founders' names as written.
- Whether Vel Tech's official vision statement should replace the paraphrase on the **Vision** card.
- SSIT's history: formed in 1972 as IEEE's Committee on Social Implications of Technology, and a full Society from 1982.
- SSIT's five pillars as named on the site.
- The network path: IEEE → Region 10 → Madras Section → Vel Tech Student Branch → SSIT chapter.
- The chapter's own name, as it should appear in the footer (currently "IEEE SSIT Chapter · Vel Tech").

## Deploying on GitHub Pages

1. Merge into the default branch.
2. In the repository settings, open **Pages**, choose **Deploy from a branch**, and select the default branch with the
   `/ (root)` folder.
3. The site is served as-is; there is nothing to build.

## Accessibility & performance

- `prefers-reduced-motion` turns off smooth scrolling, warp transitions, the starfield drift and scroll scenes; every
  section still renders in full.
- Without JavaScript the page still shows all static content (the preloader only appears when JS runs).
- The canvases pause when off-screen or when the tab is hidden, and pixel density is capped at 2×.

## Credits

- [GSAP](https://gsap.com) (standard no-charge license) and [Lenis](https://github.com/darkroomengineering/lenis) (MIT).
- Fonts: Unbounded, Inter and JetBrains Mono (SIL Open Font License).
- Globe land data derived from [Natural Earth](https://www.naturalearthdata.com/) (public domain) via `world-atlas`.

IEEE is a registered trademark of The Institute of Electrical and Electronics Engineers, Inc.
