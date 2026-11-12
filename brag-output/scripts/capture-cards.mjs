// Screenshot every real Interactive Lab card (.demo-card) in the default Swiss / Barcelona Signal Night look.
import { chromium } from '/home/pol/cuberhaus/PersonalPortfolio/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = '/home/pol/cuberhaus/PersonalPortfolio/brag-output/composition/assets/cards';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'dark' });
const page = await ctx.newPage();
await page.addInitScript(() => {
  const add = () => {
    const s = document.createElement('style');
    // freeze entrance animations so each card is fully visible when screenshotted
    s.textContent = 'astro-dev-toolbar{display:none!important} .reveal,.reveal-stagger>*{opacity:1!important;transform:none!important;transition:none!important}';
    document.head.appendChild(s);
  };
  if (document.head) add();
  else document.addEventListener('DOMContentLoaded', add);
});
await page.goto('http://127.0.0.1:4321/', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);

await page.locator('#show-more-demos').scrollIntoViewIfNeeded();
await page.locator('#show-more-demos').click();
await page.waitForTimeout(1200);
const cards = page.locator('#demo-grid .demo-card');
const n = await cards.count();
console.log('cards', n, 'design', await page.evaluate(() => document.documentElement.dataset.design + '/' + document.documentElement.dataset.theme));
const meta = [];
for (let i = 0; i < n; i++) {
  const c = cards.nth(i);
  const title0 = (await c.locator('.demo-title').innerText().catch(() => '?')).trim();
  if (!(await c.isVisible())) { console.log('skip hidden', i, title0); continue; }
  await c.scrollIntoViewIfNeeded();
  await page.mouse.move(2, 2);
  await page.waitForTimeout(450);
  const box = await c.boundingBox();
  const title = (await c.locator('.demo-title').innerText()).trim();
  await c.screenshot({ path: `${OUT}/card-${String(i).padStart(2, '0')}.png` });
  meta.push({ i, title, w: Math.round(box.width), h: Math.round(box.height) });
}
writeFileSync(`${OUT}/cards.json`, JSON.stringify(meta, null, 2));
console.log(meta.map((m) => `${m.i}:${m.title} ${m.w}x${m.h}`).join('\n'));
await browser.close();
