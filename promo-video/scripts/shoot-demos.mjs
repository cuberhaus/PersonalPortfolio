// Shoots every demo page of the live portfolio (the 20 slugs found on its homepage).
//
// Same method as shoot-looks.mjs: fresh context per page, consent pre-seeded to "denied"
// (a returning visitor who rejected analytics; we never click "Accept"), reduced motion for
// stable frames. Output: capture/assets/demo-<slug>.png (1080x1080 CSS px, scale 1) plus
// capture/demos.json recording each page's HTTP status, <title> and <h1> so on-screen
// labels come from the site itself.
//
// Usage: node scripts/shoot-demos.mjs [--base https://polcasacubertagil.com]

import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('@playwright/test');

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(here, '..');
const outDir = join(projectRoot, 'capture', 'assets');

const baseArgIdx = process.argv.indexOf('--base');
const BASE = baseArgIdx > -1 ? process.argv[baseArgIdx + 1] : 'https://polcasacubertagil.com';

// Order = the order the homepage lists them in capture/extracted/page.html (alphabetical here;
// the storyboard decides the on-screen order).
const SLUGS = [
  'algorithms', 'apa-practica', 'bitsx-marato', 'caim', 'desastres-ia', 'draculin', 'grafics',
  'joc-eda', 'jsbach', 'matriculas', 'mpids', 'par-parallel', 'phase-transitions', 'planificacion',
  'pro2', 'prop', 'rob-robotics', 'sbc-ia', 'tenda', 'tfg-polyps',
];

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
const results = [];

try {
  for (const slug of SLUGS) {
    const context = await browser.newContext({
      viewport: { width: 1080, height: 1080 },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
      colorScheme: 'light',
    });
    await context.addInitScript(() => {
      try {
        localStorage.setItem('analytics-consent', 'denied');
      } catch {
        /* storage unavailable: banner just shows */
      }
    });
    const page = await context.newPage();
    const entry = { slug, url: `${BASE}/demos/${slug}/` };
    try {
      const response = await page.goto(entry.url, { waitUntil: 'networkidle', timeout: 60_000 });
      entry.status = response?.status() ?? null;
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(1500); // let islands hydrate
      entry.title = await page.title();
      entry.h1 = (await page.locator('h1').first().textContent({ timeout: 2000 }).catch(() => null))?.trim() ?? null;
      const file = `demo-${slug}.png`;
      await page.screenshot({ path: join(outDir, file), animations: 'disabled' });
      entry.file = file;
      console.log(`ok   ${file}  [${entry.status}]  ${entry.h1 ?? entry.title}`);
    } catch (err) {
      entry.error = err.message;
      console.error(`FAIL ${slug}: ${err.message}`);
    } finally {
      await context.close();
    }
    results.push(entry);
  }
} finally {
  await browser.close();
}

await writeFile(join(projectRoot, 'capture', 'demos.json'), JSON.stringify({ base: BASE, demos: results }, null, 2) + '\n');
const ok = results.filter((r) => r.file).length;
console.log(`\n${ok}/${SLUGS.length} demo pages shot -> ${outDir}`);
if (ok !== SLUGS.length) process.exitCode = 1;
