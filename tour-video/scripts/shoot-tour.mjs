// Shoots the live portfolio as one tall, continuous plate for the site-tour video.
//
// The tour scrolls the page top to bottom at 1:1 inside a 1080x1080 canvas, so the page is
// captured at a 1080 CSS px viewport (the site's desktop layout, text unchanged) with device
// scale 2 (crisp when the compositor resamples it). Why not reuse the promo's 1920-wide
// full-page plate: 1920 px does not fit a square at 1:1, and cropping it would cut the site's
// text at the left and right edges.
//
// A page this tall (about 12,000 CSS px) is too big for one screenshot, so it is cut into
// segments of SEGMENT_H CSS px at whole-pixel boundaries; the composition stacks them back
// together with no seam. Output: capture/assets/tour-NN.png plus capture/sections.json,
// which records every segment and the position of each section on the page.
//
// What is changed on the page, and why (the capture stays the visual source of truth; nothing
// is rebuilt or restyled):
//   * The consent choice is pre-seeded to "denied" (same key the portfolio's own capture
//     scripts use), so no banner appears and nothing is requested from Google. Never "accept".
//   * Scroll-reveal elements are marked visible, which is the state a visitor reaches by
//     scrolling; otherwise a full-page shot would catch them at opacity 0.
//   * Fixed overlays (the top nav, scroll-to-top, banners) are hidden: in a full-page shot a
//     fixed element appears once, wherever it was, and the composition has its own chrome.
//
// Playwright (@playwright/test) resolves from the PersonalPortfolio checkout's node_modules,
// because this project lives in PersonalPortfolio/tour-video.
//
// The page is shot in one site look (design + theme); the site applies `?theme=<id>&design=<id>`
// before first paint, so a look is just a URL, same as promo-video/scripts/shoot-looks.mjs.
// Without --design/--theme the site's own default look is shot.
//
// Besides the pixels it records where the page has content so the composition can park each stop
// with its top and bottom edge in an empty band: a held frame then never slices through a line of
// text or a card. Every content rectangle is kind "t" (text lines and form controls: a cut must
// never slice these), "i" (images, svg, canvas) or "b" (a bordered or filled box such as a card: a
// cut across its padding is the lesser evil). capture/layout.json (untracked) holds the rectangles;
// sections.json the section positions and three kinds of empty band: `bands` (nothing at all, at
// least 16 px: a gap between blocks), `textBands` (no "t", 16 px: only a card's padding or an image
// is crossed) and `lineBands` (nothing at all, 6 px: a gap between two lines of text).
//
// Usage: node scripts/shoot-tour.mjs [--base https://polcasacubertagil.com]
//          [--design swiss --theme barcelona-night] [--scale 2] [--out DIR]

import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('@playwright/test');

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(here, '..');

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const BASE = arg('--base', 'https://polcasacubertagil.com');
const DESIGN = arg('--design', null);
const THEME = arg('--theme', null);
if (Boolean(DESIGN) !== Boolean(THEME)) throw new Error('--design and --theme go together');
const captureDir = arg('--out', join(projectRoot, 'capture'));
const outDir = join(captureDir, 'assets');

const VIEWPORT = { width: 1080, height: 1080 };
const SCALE = Number(arg('--scale', 2));
const SEGMENT_H = 3600; // CSS px per segment: 7200 device px, well under the browser's texture limit

// Homepage section ids, in page order (src/config/section-ids.ts).
const SECTION_IDS = ['hero', 'work', 'projects', 'about', 'experience', 'skills', 'certifications', 'education', 'contact'];

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();

try {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: SCALE,
    reducedMotion: 'reduce', // final-state frames; no mid-entrance captures
    colorScheme: 'light',
  });
  await context.addInitScript(() => {
    try {
      localStorage.setItem('analytics-consent', 'denied');
    } catch {
      /* storage unavailable: the banner just shows */
    }
  });
  const page = await context.newPage();
  const url = DESIGN ? `${BASE}/?theme=${THEME}&design=${DESIGN}` : `${BASE}/`;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);

  // Walk down the page once so lazy images and islands (client:visible) load, then come back.
  const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < pageHeight; y += 500) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(120);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);

  await page.evaluate(() => {
    document.querySelectorAll('.reveal, .reveal-stagger').forEach((el) => el.classList.add('visible'));
    for (const el of document.querySelectorAll('body *')) {
      if (getComputedStyle(el).position === 'fixed') el.style.display = 'none';
    }
  });
  await page.waitForTimeout(600);

  const look = await page.evaluate(() => ({
    theme: document.documentElement.getAttribute('data-theme'),
    design: document.documentElement.getAttribute('data-design'),
  }));
  if (DESIGN && (look.theme !== THEME || look.design !== DESIGN)) {
    throw new Error(`look not applied: wanted ${THEME}/${DESIGN}, got ${look.theme}/${look.design}`);
  }

  // Everything that paints something a viewer would read or notice, as [x0, y0, x1, y1, kind] page
  // rectangles: text (per line box), images/svg/canvas/controls, and any box that has a border,
  // a fill, an image or a shadow while being narrower than the page (cards, pills, buttons;
  // full-width hairlines and section backdrops are not content, a cut along them is clean).
  const content = await page.evaluate(() => {
    const W = window.innerWidth;
    const out = [];
    const add = (r, kind) => {
      if (r.width < 1.5 || r.height < 1.5) return;
      out.push([...[r.left, r.top + window.scrollY, r.right, r.bottom + window.scrollY].map(Math.round), kind]);
    };
    const alpha = (c) => {
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (!m) return c === 'transparent' ? 0 : 1;
      const p = m[1].split(',').map((s) => s.trim());
      return p.length > 3 ? Number.parseFloat(p[3]) : 1;
    };
    const IMAGES = new Set(['IMG', 'SVG', 'CANVAS', 'VIDEO', 'IFRAME', 'PICTURE']);
    const CONTROLS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);
    for (const el of document.body.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number.parseFloat(cs.opacity) === 0) continue;
      if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'PATH', 'CIRCLE', 'LINE', 'RECT', 'POLYLINE', 'POLYGON', 'G', 'DEFS', 'USE'].includes(el.tagName.toUpperCase())) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      if (IMAGES.has(el.tagName.toUpperCase())) add(r, 'i');
      if (CONTROLS.has(el.tagName.toUpperCase())) add(r, 't');
      if ([...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) {
        const range = document.createRange();
        range.selectNodeContents(el);
        for (const lr of range.getClientRects()) add(lr, 't');
      }
      const bordered = ['Top', 'Right', 'Bottom', 'Left'].some(
        (s) => Number.parseFloat(cs[`border${s}Width`]) > 0 && cs[`border${s}Style`] !== 'none' && alpha(cs[`border${s}Color`]) > 0.05,
      );
      const filled = alpha(cs.backgroundColor) > 0.05 || cs.backgroundImage !== 'none';
      if ((bordered || filled || cs.boxShadow !== 'none') && r.width < W - 8) add(r, 'b');
    }
    return out;
  });

  const layout = await page.evaluate((ids) => {
    const top = (el) => Math.round(el.getBoundingClientRect().top + window.scrollY);
    return {
      height: document.documentElement.scrollHeight,
      sections: ids.map((id) => {
        const el = document.getElementById(id);
        if (!el) return { id, found: false };
        const heading = el.querySelector('h1, h2');
        return {
          id,
          found: true,
          top: top(el),
          height: Math.round(el.getBoundingClientRect().height),
          heading: heading ? heading.textContent.trim().replace(/\s+/g, ' ') : null,
          headingTop: heading ? top(heading) : null,
        };
      }),
    };
  }, SECTION_IDS);

  const missing = layout.sections.filter((s) => !s.found).map((s) => s.id);
  if (missing.length) throw new Error(`sections not found on the page: ${missing.join(', ')}`);

  // Empty bands: row ranges no (selected) content rectangle touches, at least `min` px tall. 16 is taller
  // than a paragraph's line gap (~10 px) and shorter than the gap between blocks (24+ px).
  const emptyBands = (rects, min) => {
    const covered = rects.map(([, y0, , y1]) => [y0, y1]).sort((a, b) => a[0] - b[0]);
    const out = [];
    let cursor = 0;
    for (const [y0, y1] of covered) {
      if (y0 - cursor >= min) out.push([cursor, y0]);
      cursor = Math.max(cursor, y1);
    }
    if (layout.height - cursor >= min) out.push([cursor, layout.height]);
    return out;
  };
  const bands = emptyBands(content, 16);
  const textBands = emptyBands(content.filter((r) => r[4] === 't'), 16);
  const lineBands = emptyBands(content, 6);

  const segments = [];
  for (let y = 0, n = 0; y < layout.height; y += SEGMENT_H, n++) {
    const height = Math.min(SEGMENT_H, layout.height - y);
    const file = `tour-${String(n).padStart(2, '0')}.png`;
    await page.screenshot({
      path: join(outDir, file),
      fullPage: true,
      clip: { x: 0, y, width: VIEWPORT.width, height },
      animations: 'disabled',
    });
    segments.push({ file, y, height });
    console.log(`ok   ${file}  y=${y}..${y + height}`);
  }

  await writeFile(
    join(captureDir, 'sections.json'),
    JSON.stringify({ base: BASE, look, viewport: VIEWPORT, scale: SCALE, ...layout, bands, textBands, lineBands, segments }, null, 2) + '\n',
  );
  await writeFile(join(captureDir, 'layout.json'), JSON.stringify({ content }) + '\n');
  console.log(`\npage ${VIEWPORT.width}x${layout.height} CSS px -> ${segments.length} segments in ${outDir}`);
  await context.close();
} finally {
  await browser.close();
}
