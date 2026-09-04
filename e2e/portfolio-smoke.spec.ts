/**
 * E2E smoke tests for the portfolio shell.
 *
 * These tests verify the rendered homepage/navigation experience without
 * depending on live demo backends or external services.
 *
 * Run: npm run test:e2e:smoke
 */

import { test, expect } from '@playwright/test';
import { SECTION_IDS, SECTION_IDS_WITH_HERO, SECTION_META } from '../src/config/section-ids';

const SECTION_ORDER = SECTION_IDS;
const NAV_SECTION_IDS = SECTION_META.filter((section) => section.inNav).map(
  (section) => section.id
);
const SECTION_SELECTOR = SECTION_IDS_WITH_HERO.map((id) => `section#${id}`).join(', ');

async function navHrefs(page: import('@playwright/test').Page) {
  return page
    .locator('.nav-links-primary a.nav-link')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
}

test.describe('portfolio homepage smoke', () => {
  test('homepage renders the expected shell and section anchors', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('nav#navbar')).toBeVisible();
    await expect(page.locator('main#main-content')).toBeVisible();
    await expect(page.locator('section#hero')).toBeVisible();
    await expect(page.locator(SECTION_SELECTOR)).toHaveCount(SECTION_ORDER.length + 1);
    expect(await navHrefs(page)).toEqual(NAV_SECTION_IDS.map((id) => `#${id}`));
  });

  test('CV variants remain downloadable without embedded PDF assets', async ({ page }) => {
    await page.goto('/#about', { waitUntil: 'domcontentloaded' });

    const preset = page.getByRole('radiogroup', { name: 'CV version' });
    const technical = page.getByRole('radio', { name: 'Technical' });
    const portrait = page.getByRole('checkbox', { name: 'Include portrait' });
    const download = page.getByRole('link', { name: 'Download', exact: true });

    await expect(preset).toBeVisible();
    await expect(download).toHaveAttribute('href', /cv_english_standard_photo\.pdf(?:\?|$)/);

    await technical.click();
    await portrait.focus();
    await page.keyboard.press('Space');

    await expect(technical).toBeChecked();
    await expect(portrait).not.toBeChecked();
    await expect(download).toHaveAttribute('href', /cv_english_technical_no-photo\.pdf(?:\?|$)/);
  });

  test('navbar links scroll to each homepage section', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    for (const id of NAV_SECTION_IDS) {
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
      expect(await navHrefs(page)).toEqual(NAV_SECTION_IDS.map((id) => `#${id}`));
    });
  }

  for (const { route, tagline } of [
    { route: '/', tagline: 'I like building things with AI & data.' },
    { route: '/es/', tagline: 'Me gusta construir cosas con IA y datos.' },
    { route: '/ca/', tagline: "M'agrada construir coses amb IA i dades." },
  ]) {
    test(`${route} keeps spacing between hero tagline segments`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });

      await expect(page.locator('.hero-tagline')).toHaveText(tagline);
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

  test('short mobile menu keeps every primary action reachable', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await page.locator('.nav-toggle').click();
    await expect(page.locator('#nav-links')).toHaveClass(/open/);

    for (const id of NAV_SECTION_IDS) {
      await expect(page.locator(`.nav-link[href="#${id}"]`)).toBeInViewport();
    }
    await expect(page.locator('.theme-toggle-btn')).toBeInViewport();

    const menuDimensions = await page.locator('#nav-links').evaluate((menu) => ({
      clientHeight: menu.clientHeight,
      scrollHeight: menu.scrollHeight,
    }));
    expect(menuDimensions.scrollHeight).toBeLessThanOrEqual(menuDimensions.clientHeight);

    await page.locator('.theme-toggle-btn').click();
    await expect(page.locator('#theme-modal')).toHaveAttribute('aria-hidden', 'false');
  });

  test('short viewport hero keeps a clean transition below the primary action', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 683, height: 418 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);

    const cta = await page.locator('.hero-cta').boundingBox();
    const nextSection = await page.locator('section#work').boundingBox();
    expect(cta).not.toBeNull();
    expect(nextSection).not.toBeNull();
    expect((nextSection?.y ?? 0) - ((cta?.y ?? 0) + (cta?.height ?? 0))).toBeGreaterThanOrEqual(40);
    await expect(page.locator('section#work')).toHaveCSS('border-top-width', '1px');
  });

  test('mobile homepage and demo navigation share control sizing without title overlap', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const mainControl = await page.locator('.nav-toggle').boundingBox();
    expect(mainControl).not.toBeNull();
    expect(mainControl?.width).toBe(40);
    expect(mainControl?.height).toBe(40);

    await page.goto('/demos/algorithms/', { waitUntil: 'domcontentloaded' });
    const demoControl = await page.locator('.sidebar-toggle').boundingBox();
    const titleBox = await page.locator('.demo-nav-title').boundingBox();
    const backBox = await page.locator('.demo-back').boundingBox();
    expect(demoControl).not.toBeNull();
    expect(titleBox).not.toBeNull();
    expect(backBox).not.toBeNull();
    expect(demoControl?.width).toBe(40);
    expect(demoControl?.height).toBe(40);
    expect(titleBox!.x).toBeGreaterThanOrEqual(backBox!.x + backBox!.width);
    expect(titleBox!.x + titleBox!.width).toBeLessThanOrEqual(demoControl!.x);
  });

  test('desktop and mobile layouts do not create horizontal overflow', async ({ page }) => {
    for (const viewport of [
      { width: 1280, height: 900 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/', { waitUntil: 'domcontentloaded' });

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow).toBeLessThanOrEqual(1);
    }
  });
});
