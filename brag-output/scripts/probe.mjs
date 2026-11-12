import { chromium } from '/home/pol/cuberhaus/PersonalPortfolio/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';

const out = '/home/pol/cuberhaus/PersonalPortfolio/brag-output/scripts/probe';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  colorScheme: 'dark',
  reducedMotion: 'no-preference',
});
const page = await ctx.newPage();
await page.addInitScript(() => {
  const s = document.createElement('style');
  s.textContent = 'astro-dev-toolbar{display:none!important}';
  document.addEventListener('DOMContentLoaded', () => document.head.appendChild(s));
});
await page.goto('http://127.0.0.1:4321/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/home.png` });
console.log('design', await page.evaluate(() => document.documentElement.dataset.design), 'theme', await page.evaluate(() => document.documentElement.dataset.theme));
await page.keyboard.press('Control+k');
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/picker.png` });
const box = await page.locator('.theme-modal-design[data-design-id="comic"]').boundingBox();
console.log('comic box', box);
await page.locator('.theme-modal-design[data-design-id="comic"]').click();
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/picker-comic.png` });
console.log('after click design', await page.evaluate(() => document.documentElement.dataset.design), 'theme', await page.evaluate(() => document.documentElement.dataset.theme));
await browser.close();
