/**
 * Deterministic README gallery captures. The test doubles as route-rendering
 * validation: an unavailable target fails before an asset can be written.
 *
 * Run: npm run demo-gallery:capture
 */
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listGalleryDemos } from '../scripts/demo-gallery.mjs';

const galleryDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'docs',
  'assets',
  'readme-gallery'
);
const demoGalleryDir = resolve(dirname(galleryDir), 'demo-gallery');
const galleryBaseUrl = new URL(
  process.env.PLAYWRIGHT_BASE_URL ??
    `http://${process.env.PLAYWRIGHT_HOST ?? '127.0.0.1'}:${process.env.PLAYWRIGHT_PORT ?? '4322'}`
);
const loopbackHosts = new Set(['127.0.0.1', 'localhost']);
const noMotionCss = `
  *, *::before, *::after { animation: none !important; transition: none !important; }
  .reveal, .reveal-stagger > * { opacity: 1 !important; transform: none !important; }
`;

async function prepareCapture(page: Page) {
  mkdirSync(galleryDir, { recursive: true });
  await page.addInitScript((css) => {
    localStorage.clear();
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('design', 'minimal');
    Object.defineProperty(performance, 'now', { value: () => 0 });
    const style = document.createElement('style');
    style.textContent = css;
    document.documentElement.appendChild(style);
  }, noMotionCss);
  await page.route('**/*', (route) => {
    const requestUrl = new URL(route.request().url());
    const samePreviewServer =
      requestUrl.protocol === galleryBaseUrl.protocol &&
      requestUrl.port === galleryBaseUrl.port &&
      (requestUrl.hostname === galleryBaseUrl.hostname ||
        (loopbackHosts.has(requestUrl.hostname) && loopbackHosts.has(galleryBaseUrl.hostname)));
    return loopbackHosts.has(requestUrl.hostname) && !samePreviewServer
      ? route.abort()
      : route.continue();
  });
}

test.beforeEach(async ({ page }) => {
  await prepareCapture(page);
});

test.describe('complete demo gallery', () => {
  for (const demo of listGalleryDemos()) {
    test(`captures ${demo.slug}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(demo.route, { waitUntil: 'networkidle' });
      await expect(page.locator('main#main-content')).toBeVisible();
      await expect(page.locator('h1')).toHaveText(demo.title);
      await page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        );
      });
      if (demo.slug === 'par-parallel') {
        await expect
          .poll(() =>
            page.locator('#par-mock-fallback canvas').evaluateAll((canvases) =>
              canvases.map((canvas) => {
                const element = canvas as HTMLCanvasElement;
                return [element.width, element.height];
              })
            )
          )
          .toEqual([
            [300, 300],
            [64, 64],
            [300, 180],
          ]);
      }
      await page.screenshot({
        path: resolve(demoGalleryDir, `${demo.slug}.jpg`),
        type: 'jpeg',
        quality: 82,
        animations: 'disabled',
      });
    });
  }
});

test('captures the desktop portfolio overview', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.locator('main#main-content')).toBeVisible();
  await expect(page.locator('section#hero')).toBeVisible();
  await page.screenshot({
    path: resolve(galleryDir, 'portfolio-desktop.jpg'),
    type: 'jpeg',
    quality: 85,
  });
});

test('captures a representative interactive demo', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/demos/algorithms/', { waitUntil: 'networkidle' });
  await expect(page.locator('main#main-content')).toBeVisible();
  await expect(page.locator('h1')).toBeVisible();
  await page.screenshot({
    path: resolve(galleryDir, 'algorithm-visualizer-demo.jpg'),
    type: 'jpeg',
    quality: 85,
  });
});

test('captures mobile navigation in its open state', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.locator('.nav-toggle')).toBeVisible();
  await page.locator('.nav-toggle').click();
  await expect(page.locator('#nav-links')).toHaveClass(/open/);
  await page.screenshot({
    path: resolve(galleryDir, 'portfolio-mobile-navigation.jpg'),
    type: 'jpeg',
    quality: 85,
  });
});
