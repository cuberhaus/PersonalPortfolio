// Element/section stills of the real homepage (Swiss design, Barcelona Signal Night) at 1280x720 css px, 1.5x pixels.
import { chromium } from '/home/pol/cuberhaus/PersonalPortfolio/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const shots = join(dirname(fileURLToPath(import.meta.url)), '..', 'composition', 'assets', 'shots');
mkdirSync(shots, { recursive: true });
const BASE = process.env.BASE_URL || 'http://127.0.0.1:4321';

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5, colorScheme: 'dark' });
const page = await ctx.newPage();
await page.goto(`${BASE}/?theme=barcelona-night&design=swiss`, { waitUntil: 'load' });
await page.waitForTimeout(2500);
await page.addStyleTag({
  content: `astro-dev-toolbar,#navbar,#scroll-to-top{display:none!important} html{scroll-behavior:auto!important}
    .reveal,.reveal-stagger>*{opacity:1!important;transform:none!important;transition:none!important;animation:none!important}`,
});
const docBox = async (loc) => {
  const b = await loc.boundingBox();
  const sy = await page.evaluate(() => scrollY);
  return { x: b.x, y: b.y + sy, w: b.width, h: b.height };
};
const meta = {};

// 1. Lab section: heading + chips + first row of cards
await page.locator('#projects').scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
const sec = await docBox(page.locator('#projects'));
const firstRow = await page.evaluate(() => {
  const c = [...document.querySelectorAll('#demo-grid .demo-card')].filter((e) => e.offsetParent);
  const tops = c.map((e) => e.getBoundingClientRect().top + scrollY);
  const first = tops[0];
  const row = c.filter((e) => Math.abs(e.getBoundingClientRect().top + scrollY - first) < 4);
  return { bottom: Math.max(...row.map((e) => e.getBoundingClientRect().bottom + scrollY)), n: c.length };
});
console.log('section', sec, firstRow);
await page.screenshot({
  path: join(shots, 'lab-top.png'),
  fullPage: true,
  clip: { x: 68, y: sec.y, width: 1144, height: firstRow.bottom - sec.y + 12 },
});
meta.labTop = { w: 1144, h: Math.round(firstRow.bottom - sec.y + 12) };

// 2. Expand the grid, count cards, capture the whole wall
for (let i = 0; i < 8; i++) {
  const btn = page.locator('#show-more-demos');
  if (!(await btn.isVisible().catch(() => false))) break;
  const expanded = await btn.getAttribute('aria-expanded');
  if (expanded === 'true') break;
  await btn.click();
  await page.waitForTimeout(500);
}
await page.evaluate(async () => {
  const imgs = [...document.querySelectorAll('.demo-preview img')];
  imgs.forEach((i) => { i.loading = 'eager'; });
  await Promise.all(imgs.map((i) => (i.complete && i.naturalWidth ? 1 : new Promise((r) => { i.onload = i.onerror = r; }))));
});
await page.evaluate(async () => {
  await Promise.all([...document.querySelectorAll('.demo-preview img')].map((i) => i.decode().catch(() => {})));
});
// walk the page so every off-screen preview is painted once
const gridBox = await docBox(page.locator('#demo-grid'));
for (let y = gridBox.y - 100; y < gridBox.y + gridBox.h; y += 500) {
  await page.evaluate((y) => window.scrollTo(0, y), y);
  await page.waitForTimeout(250);
}
await page.waitForTimeout(900);
const wall = await page.evaluate(() => {
  const grid = document.querySelector('#demo-grid');
  const g = grid.getBoundingClientRect();
  const cards = [...grid.querySelectorAll('.demo-card')].filter((e) => e.offsetParent);
  const rows = [...new Set(cards.map((e) => Math.round(e.getBoundingClientRect().top + scrollY - (g.top + scrollY))))].sort((a, b) => a - b);
  return { x: g.left, y: g.top + scrollY, w: g.width, h: g.height, count: cards.length, rows };
});
console.log('wall', wall);
await page.screenshot({
  path: join(shots, 'lab-wall.png'),
  fullPage: true,
  clip: { x: 68, y: wall.y, width: 1144, height: wall.h },
});
meta.wall = { w: 1144, h: Math.round(wall.h), count: wall.count, rowTops: wall.rows, offsetX: Math.round(wall.x - 68) };

// 3. Client work cards
await page.locator('#work').scrollIntoViewIfNeeded();
await page.waitForTimeout(600);
const cards = await page.evaluate(() => {
  const c = [...document.querySelectorAll('#work .work-card')];
  const r = c.map((e) => e.getBoundingClientRect());
  return {
    n: c.length,
    x: Math.min(...r.map((b) => b.left)),
    y: Math.min(...r.map((b) => b.top)) + scrollY,
    x2: Math.max(...r.map((b) => b.right)),
    y2: Math.max(...r.map((b) => b.bottom)) + scrollY,
    each: r.map((b) => ({ x: b.left, y: b.top + scrollY, w: b.width, h: b.height })),
  };
});
console.log('work', cards);
await page.screenshot({
  path: join(shots, 'work-cards.png'),
  fullPage: true,
  clip: { x: cards.x - 6, y: cards.y - 6, width: cards.x2 - cards.x + 12, height: cards.y2 - cards.y + 12 },
});
meta.work = { w: Math.round(cards.x2 - cards.x + 12), h: Math.round(cards.y2 - cards.y + 12), n: cards.n };
await page.locator('#work').screenshot({ path: join(shots, 'work-section.png') });

writeFileSync(join(shots, 'lab.json'), JSON.stringify(meta, null, 2));
await browser.close();
