/**
 * Deterministic README gallery captures. The test doubles as route-rendering
 * validation: an unavailable target fails before an asset can be written.
 *
 * Run: npm run gallery:capture
 */
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const galleryDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'docs',
  'assets',
  'readme-gallery'
);
const noMotionCss = `
  *, *::before, *::after { animation: none !important; transition: none !important; }
  .reveal, .reveal-stagger > * { opacity: 1 !important; transform: none !important; }
`;

async function prepareCapture(page: Page) {
  mkdirSync(galleryDir, { recursive: true });
  await page.addInitScript((css) => {
    localStorage.clear();
    const style = document.createElement('style');
    style.textContent = css;
    document.documentElement.appendChild(style);
  }, noMotionCss);
}

test.beforeEach(async ({ page }) => {
  await prepareCapture(page);
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
