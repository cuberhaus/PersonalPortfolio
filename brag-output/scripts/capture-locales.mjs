// Real hero in each locale, default Swiss look, clean context (no persisted design/theme).
import { chromium } from '/home/pol/cuberhaus/PersonalPortfolio/node_modules/playwright/index.mjs';

const OUT = '/home/pol/cuberhaus/PersonalPortfolio/brag-output/composition/assets/shots';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });

for (const [lang, path] of [['en', '/'], ['es', '/es/'], ['ca', '/ca/']]) {
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2,
    colorScheme: 'dark',
  });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    const add = () => {
      const s = document.createElement('style');
      s.textContent = 'astro-dev-toolbar{display:none!important}';
      document.head.appendChild(s);
    };
    if (document.head) add();
    else document.addEventListener('DOMContentLoaded', add);
  });
  await page.goto(`http://127.0.0.1:4321${path}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2000);
  const state = await page.evaluate(() => [document.documentElement.lang, document.documentElement.dataset.design, document.documentElement.dataset.theme]);
  console.log(lang, state.join('/'));
  await page.screenshot({ path: `${OUT}/hero-${lang}.png` });
  await ctx.close();
}
await browser.close();
