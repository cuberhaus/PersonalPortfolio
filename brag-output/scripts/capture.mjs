// Captures real UI from the running portfolio (astro dev on :4321) for the brag video.
// Output: brag-output/composition/assets/shots/*  +  shots/manifest.json (bounding boxes in CSS px)
import { chromium } from '/home/pol/cuberhaus/PersonalPortfolio/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = 'http://127.0.0.1:4321';
const OUT = '/home/pol/cuberhaus/PersonalPortfolio/brag-output/composition/assets/shots';
mkdirSync(OUT, { recursive: true });

// design id -> palette (first recommended palette from src/lib/designs.ts)
const DESIGNS = {
  minimal: 'dark',
  editorial: 'sepia',
  swiss: 'barcelona-night',
  pixel: 'synthwave',
  terminal: 'phosphor',
  cyber: 'synthwave',
  notebook: 'paper',
  brutalist: 'paper',
  blueprint: 'nord',
  academic: 'sepia',
  ide: 'dark',
  risograph: 'synthwave',
  deco: 'dark',
  wabisabi: 'paper',
  zine: 'gruvbox-dark',
  comic: 'synthwave',
  newspaper: 'sepia',
};

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 2,
  colorScheme: 'dark',
  reducedMotion: 'no-preference',
});
const page = await ctx.newPage();
await page.addInitScript(() => {
  const css = 'astro-dev-toolbar{display:none!important}';
  const add = () => {
    const s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  };
  if (document.head) add();
  else document.addEventListener('DOMContentLoaded', add);
});

async function settle(ms = 1800) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
}

const manifest = { viewport: { width: 1920, height: 1080 }, dsf: 2 };

// ── 1. The real flow: default look -> Ctrl+K -> click design -> click palette -> close ──
await page.goto(`${BASE}/`);
await settle();
await page.screenshot({ path: `${OUT}/home-swiss.png` });

await page.keyboard.press('Control+k');
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/picker-swiss.png` });

manifest.panel = await page.locator('.theme-modal-panel').boundingBox();
manifest.close = await page.locator('.theme-modal-close').boundingBox();
manifest.designCards = {};
for (const id of Object.keys(DESIGNS)) {
  manifest.designCards[id] = await page.locator(`.theme-modal-design[data-design-id="${id}"]`).boundingBox();
}
manifest.swatches = {};
for (const id of ['synthwave', 'phosphor', 'barcelona-night', 'dracula', 'sepia']) {
  manifest.swatches[id] = await page.locator(`.theme-modal-swatch[data-theme-id="${id}"]`).boundingBox();
}

await page.locator('.theme-modal-design[data-design-id="comic"]').click();
await page.waitForTimeout(1100);
await page.screenshot({ path: `${OUT}/picker-comic.png` });

await page.locator('.theme-modal-swatch[data-theme-id="synthwave"]').click();
await page.waitForTimeout(1100);
await page.screenshot({ path: `${OUT}/picker-comic-synthwave.png` });

await page.keyboard.press('Escape');
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/hero-comic-flow.png` });

// ── 2. Closed-picker hero for all 17 designs (deterministic via URL params) ──
for (const [design, theme] of Object.entries(DESIGNS)) {
  await page.goto(`${BASE}/?design=${design}&theme=${theme}`);
  await settle(2200);
  const got = await page.evaluate(() => [document.documentElement.dataset.design, document.documentElement.dataset.theme]);
  console.log(design, theme, '->', got.join('/'));
  await page.screenshot({ path: `${OUT}/hero-${design}.png` });
}

// ── 3. Interactive Lab section in the default look ──
await page.goto(`${BASE}/`);
await settle();
const labId = await page.evaluate(() => {
  const a = [...document.querySelectorAll('a[href*="#"]')].find((el) => /interactive lab/i.test(el.textContent || ''));
  return a ? a.getAttribute('href') : null;
});
console.log('lab anchor', labId);
manifest.labAnchor = labId;
if (labId) {
  const sel = labId.includes('#') ? '#' + labId.split('#').pop() : null;
  if (sel) {
    await page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: 'start' }), sel);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/lab-swiss.png` });
  }
}

writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 2));
await browser.close();
console.log('done');
