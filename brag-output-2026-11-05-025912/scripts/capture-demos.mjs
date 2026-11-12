// Records four real demo pages running in the portfolio dev server (http://127.0.0.1:4321) as short clips.
// usage: node scripts/capture-demos.mjs [par|plate ...]   (default: all)
import { chromium } from '/home/pol/cuberhaus/PersonalPortfolio/node_modules/playwright/index.mjs';
import { record } from './screencast.mjs';
import { cursorInit } from './cursor.mjs';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'composition', 'assets');
const clips = join(root, 'clips');
mkdirSync(clips, { recursive: true });
const BASE = process.env.BASE_URL || 'http://127.0.0.1:4321';

const glide = async (page, x, y, ms = 500, steps = 24) => {
  const from = await page.evaluate(() => window.__cursor || { x: 0, y: 0 });
  for (let i = 1; i <= steps; i++) {
    const t = i / steps, e = 1 - Math.pow(1 - t, 3); // ease-out
    await page.mouse.move(from.x + (x - from.x) * e, from.y + (y - from.y) * e);
    await page.waitForTimeout(ms / steps);
  }
};
const docBox = async (page, loc) => {
  const b = await loc.first().boundingBox();
  const sy = await page.evaluate(() => scrollY);
  return { x: b.x, y: b.y + sy, w: b.width, h: b.height, cx: b.x + b.width / 2, cy: b.y + b.height / 2 };
};

const demos = {
  par: {
    slug: 'par-parallel', region: { x: 68, y: 629, width: 1144, height: 505 }, scroll: 589, out: 'par.mp4',
    async run(page, mark) {
      const play = page.getByRole('button', { name: /^Play$/ });
      const pb = await play.boundingBox();
      await glide(page, pb.x + pb.width / 2, pb.y + pb.height / 2, 480);
      mark('click-play'); await page.mouse.down(); await page.waitForTimeout(60); await page.mouse.up();
      await page.waitForTimeout(200);
      // Mandelbrot: drag the seahorse valley to the centre, then scroll-zoom into it
      const cv = await page.locator('canvas').first().boundingBox();
      await glide(page, cv.x + cv.width / 2, cv.y + cv.height / 2, 480);
      mark('drag-start'); await page.mouse.down();
      await glide(page, cv.x + cv.width / 2 + 25, cv.y + cv.height / 2 + 11, 260, 12);
      await page.mouse.up();
      await page.waitForTimeout(80);
      mark('zoom-start');
      for (let i = 0; i < 10; i++) { await page.mouse.wheel(0, -120); await page.waitForTimeout(110); }
      await page.waitForTimeout(1100);
    },
  },
  plate: {
    slug: 'matriculas', region: { x: 68, y: 560, width: 1144, height: 637 }, scroll: 520, out: 'plate.mp4',
    async run(page, mark) {
      const imgs = page.locator('img');
      const b = await imgs.nth(3).boundingBox();
      await glide(page, b.x + b.width / 2, b.y + b.height / 2, 480);
      mark('click-sample'); await page.mouse.down(); await page.mouse.up();
      await page.waitForTimeout(260);
      const d = await page.getByRole('button', { name: /Detect plate/i }).boundingBox();
      await glide(page, d.x + d.width / 2, d.y + d.height / 2, 450);
      mark('click-detect'); await page.mouse.down(); await page.mouse.up();
      await page.waitForTimeout(3000);
    },
  },
};

const want = process.argv.slice(2);
const names = want.length ? want : Object.keys(demos);
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
const meta = existsSync(join(clips, 'clips.json')) ? JSON.parse(readFileSync(join(clips, 'clips.json'), 'utf8')) : {};
for (const name of names) {
  const d = demos[name];
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, colorScheme: 'dark', reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  await page.addInitScript(cursorInit);
  await page.goto(`${BASE}/demos/${d.slug}/`, { waitUntil: 'load' });
  await page.waitForTimeout(2600);
  await page.evaluate((y) => window.scrollTo(0, y), d.scroll);
  await page.waitForTimeout(500);
  await page.addStyleTag({ content: 'html,body{overflow:hidden!important}' });
  await page.mouse.move(1180, 640);
  const info = await record(page, join(clips, d.out), (mark) => d.run(page, mark), { clip: { ...d.region, scale: 1.5 } });
  meta[name] = { file: `clips/${d.out}`, region: d.region, ...info };
  console.log(name, info);
  await ctx.close();
}
writeFileSync(join(clips, 'clips.json'), JSON.stringify(meta, null, 2));
await browser.close();
