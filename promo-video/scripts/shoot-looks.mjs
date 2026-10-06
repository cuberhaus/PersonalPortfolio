// Shoots the live portfolio's hero in several theme + design combinations.
//
// The site applies `?theme=<id>&design=<id>` before first paint (ThemeInit.astro
// stores them in localStorage and strips them from the URL), so each look is just a
// URL. One fresh browser context per look keeps localStorage from leaking between
// shots. Output: capture/assets/look-NN-<design>-<theme>.png at 1080x1360 CSS px,
// device scale 2 (2160x2720 files) so the composition can push in past 1:1.
//
// Why 1360 tall for a 1080x1080 video: the compositions show the band from y=70 (just
// below the site's own nav) to y=1150 at scale 1, so the whole canvas is hero and no
// zoom is needed to hide the nav. A zoom-to-hide crop cuts the site's text at the left
// and right edges (it sits only ~18px from the edge). The hero is 85vh tall (1156px at
// this viewport), so the next section's heading never peeks in at the bottom either.
//
// Playwright (@playwright/test) resolves from the PersonalPortfolio checkout's
// node_modules, because this project lives in PersonalPortfolio/promo-video.
//
// Usage: node scripts/shoot-looks.mjs [--base https://polcasacubertagil.com] [--from N]
//
// --from N shoots only the entries from index N onward and keeps the earlier entries of
// capture/looks.json as they are, so appending looks to LOOKS never re-shoots the old ones.

import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('@playwright/test');

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(here, '..');
const outDir = join(projectRoot, 'capture', 'assets');

const baseArgIdx = process.argv.indexOf('--base');
const BASE = baseArgIdx > -1 ? process.argv[baseArgIdx + 1] : 'https://polcasacubertagil.com';

const fromArgIdx = process.argv.indexOf('--from');
const FROM = fromArgIdx > -1 ? Number.parseInt(process.argv[fromArgIdx + 1], 10) : 0;
if (!Number.isInteger(FROM) || FROM < 0) throw new Error('--from needs a non-negative integer index');

// [design, theme] pairs. Every theme here is a visible one (not hidden), and each
// pairing is one the site itself recommends for that design.
const LOOKS = [
  { design: null, theme: null }, // the site exactly as a first-time visitor sees it
  { design: 'comic', theme: 'light' },
  { design: 'terminal', theme: 'phosphor' },
  { design: 'newspaper', theme: 'sepia' },
  { design: 'pixel', theme: 'synthwave' },
  { design: 'blueprint', theme: 'nord' },
  { design: 'risograph', theme: 'gruvbox-dark' },
  { design: 'deco', theme: 'dark' },
  { design: 'cyber', theme: 'tokyo-night' },
  { design: 'notebook', theme: 'paper' },
  { design: 'wabisabi', theme: 'nord-light' },
  { design: 'brutalist', theme: 'light' },
  // 12+: a wider pool for the accelerating look sequence. Every one of the site's 17 designs
  // appears at least once; the rest are other palettes on designs already shown, which is what
  // "255 looks" means (17 designs x 15 palettes). Only visible (non-hidden) palettes.
  { design: 'minimal', theme: 'dark' },
  { design: 'editorial', theme: 'paper' },
  { design: 'swiss', theme: 'barcelona-night' },
  { design: 'academic', theme: 'solarized-light' },
  { design: 'ide', theme: 'gruvbox-dark' },
  { design: 'zine', theme: 'synthwave' },
  { design: 'terminal', theme: 'amber-crt' },
  { design: 'pixel', theme: 'phosphor' },
  { design: 'cyber', theme: 'synthwave' },
  { design: 'comic', theme: 'dracula' },
  { design: 'deco', theme: 'dracula' },
  { design: 'blueprint', theme: 'tokyo-night' },
  { design: 'risograph', theme: 'synthwave' },
  { design: 'notebook', theme: 'solarized-light' },
  { design: 'newspaper', theme: 'solarized-light' },
  { design: 'brutalist', theme: 'gruvbox-dark' },
  { design: 'minimal', theme: 'nord' },
  { design: 'swiss', theme: 'nord-light' },
  { design: 'comic', theme: 'synthwave' },
  { design: 'ide', theme: 'dark' },
  { design: 'zine', theme: 'paper' },
  { design: 'editorial', theme: 'dark' },
  { design: 'academic', theme: 'sepia' },
  { design: 'wabisabi', theme: 'paper' },
  { design: 'deco', theme: 'sepia' },
  { design: 'minimal', theme: 'light' },
];

const pad = (n) => String(n).padStart(2, '0');

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
const shot = [];

try {
  for (const [i, look] of LOOKS.entries()) {
    if (i < FROM) continue;
    const label = look.design ? `${look.design}-${look.theme}` : 'default';
    const file = `look-${pad(i)}-${label}.png`;
    const url = look.design ? `${BASE}/?theme=${look.theme}&design=${look.design}` : `${BASE}/`;

    const context = await browser.newContext({
      viewport: { width: 1080, height: 1360 },
      deviceScaleFactor: 2,
      reducedMotion: 'reduce', // stable, final-state frames; no mid-entrance captures
      colorScheme: 'light',
    });
    // Behave as a returning visitor who already chose "Reject": the consent banner stays
    // away and nothing is requested from Google. Same key the portfolio's own
    // scripts/capture-og-images.mjs pre-seeds. We never click "Accept".
    await context.addInitScript(() => {
      try {
        localStorage.setItem('analytics-consent', 'denied');
      } catch {
        /* storage unavailable: banner just shows */
      }
    });
    const page = await context.newPage();
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(800);

      const applied = await page.evaluate(() => ({
        theme: document.documentElement.getAttribute('data-theme'),
        design: document.documentElement.getAttribute('data-design'),
      }));
      if (look.design && (applied.theme !== look.theme || applied.design !== look.design)) {
        throw new Error(`look not applied: wanted ${look.theme}/${look.design}, got ${applied.theme}/${applied.design}`);
      }

      await page.screenshot({ path: join(outDir, file), animations: 'disabled' });
      shot.push({ file, ...applied, requested: look });
      console.log(`ok   ${file}  (theme=${applied.theme} design=${applied.design})`);
    } catch (err) {
      console.error(`FAIL ${file}: ${err.message}`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}

// With --from, carry over the earlier entries so looks.json still lists every plate on disk.
let kept = [];
if (FROM > 0) {
  try {
    const previous = JSON.parse(await readFile(join(projectRoot, 'capture', 'looks.json'), 'utf8'));
    kept = previous.shot.filter((entry) => Number.parseInt(entry.file.slice(5, 7), 10) < FROM);
  } catch {
    console.warn('no earlier capture/looks.json to carry over; listing only the new shots');
  }
}
const all = [...kept, ...shot];
await writeFile(join(projectRoot, 'capture', 'looks.json'), JSON.stringify({ base: BASE, shot: all }, null, 2) + '\n');
const wanted = LOOKS.length - FROM;
console.log(`\n${shot.length}/${wanted} looks shot -> ${outDir}`);
if (shot.length !== wanted) process.exitCode = 1;
