import { chromium } from '/home/pol/cuberhaus/PersonalPortfolio/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';

const out = '/home/pol/cuberhaus/PersonalPortfolio/brag-output/scripts/probe';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'dark' });
const page = await ctx.newPage();
await page.addInitScript(() => {
  const add = () => { const s = document.createElement('style'); s.textContent = 'astro-dev-toolbar{display:none!important}'; document.head.appendChild(s); };
  if (document.head) add(); else document.addEventListener('DOMContentLoaded', add);
});
for (const slug of ['mpids', 'algorithms', 'grafics']) {
  await page.goto(`http://127.0.0.1:4321/demos/${slug}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/demo-${slug}-top.png` });
  await page.evaluate(() => window.scrollTo(0, 650));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/demo-${slug}-scrolled.png` });
  const buttons = await page.$$eval('button', (bs) => bs.map((b) => (b.textContent || '').trim()).filter(Boolean).slice(0, 30));
  console.log(slug, JSON.stringify(buttons));
}
await browser.close();
