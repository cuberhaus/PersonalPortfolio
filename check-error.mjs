import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.stack));

  await page.goto('http://localhost:4323/demos/matriculas/', { waitUntil: 'networkidle' });
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();