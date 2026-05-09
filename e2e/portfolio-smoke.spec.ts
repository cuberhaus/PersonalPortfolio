/**
 * E2E smoke tests for the portfolio shell.
 *
 * These tests verify the rendered homepage/navigation experience without
 * depending on live demo backends or external services.
 *
 * Run: npm run test:e2e:smoke
 */

import { test, expect } from '@playwright/test';

const SECTION_ORDER = ['about', 'experience', 'work', 'projects', 'skills', 'education', 'contact'];
const SECTION_SELECTOR = ['hero', ...SECTION_ORDER].map(id => `section#${id}`).join(', ');

async function navHrefs(page: import('@playwright/test').Page) {
  return page.locator('.nav-links-primary a.nav-link').evaluateAll(links =>
    links.map(link => link.getAttribute('href')),
  );
}

test.describe('portfolio homepage smoke', () => {
  test('homepage renders the expected shell and section anchors', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('nav#navbar')).toBeVisible();
    await expect(page.locator('main#main-content')).toBeVisible();
    await expect(page.locator('section#hero')).toBeVisible();
    await expect(page.locator(SECTION_SELECTOR)).toHaveCount(SECTION_ORDER.length + 1);
    expect(await navHrefs(page)).toEqual(SECTION_ORDER.map(id => `#${id}`));
  });

  test('navbar links scroll to each homepage section', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    for (const id of SECTION_ORDER) {
      await page.locator(`.nav-link[href="#${id}"]`).click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expect(page.locator(`section#${id}`)).toBeInViewport({ ratio: 0.1 });
    }
  });

  for (const route of ['/es/', '/ca/']) {
    test(`${route} renders the localized homepage shell`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });

      await expect(page.locator('main#main-content')).toBeVisible();
      await expect(page.locator(SECTION_SELECTOR)).toHaveCount(SECTION_ORDER.length + 1);
      expect(await navHrefs(page)).toEqual(SECTION_ORDER.map(id => `#${id}`));
    });
  }

  test('mobile menu opens, navigates, and unlocks body scroll', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const toggle = page.locator('.nav-toggle');
    const links = page.locator('#nav-links');

    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('data-initialized', 'true');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(links).toHaveClass(/open/);
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('hidden');

    await page.locator('.nav-link[href="#work"]').click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(links).not.toHaveClass(/open/);
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('');
    await expect(page.locator('section#work')).toBeInViewport({ ratio: 0.1 });
  });

  test('desktop and mobile layouts do not create horizontal overflow', async ({ page }) => {
    for (const viewport of [
      { width: 1280, height: 900 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/', { waitUntil: 'domcontentloaded' });

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    }
  });
});