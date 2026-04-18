/**
 * E2E tests for the Ctrl+K theme/design picker.
 *
 * Verifies that:
 *  - pressing Ctrl+K opens the modal on the home page
 *  - selecting a design tile sets `html[data-design]`
 *  - selecting a palette swatch sets `html[data-theme]`
 *  - both selections persist across a reload (via localStorage)
 *  - switching designs actually changes the H1 font-family
 */

import { test, expect } from '@playwright/test';

const openModal = async (page: import('@playwright/test').Page) => {
  const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
  await page.keyboard.press(`${modifier}+KeyK`);
  await expect(page.locator('#theme-modal.open')).toBeVisible();
};

test.describe('Ctrl+K customize modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // Clear any persisted picks so tests are deterministic
    await page.evaluate(() => {
      localStorage.removeItem('theme');
      localStorage.removeItem('design');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
  });

  test('opens on Ctrl+K and closes on Escape', async ({ page }) => {
    await openModal(page);
    await page.keyboard.press('Escape');
    await expect(page.locator('#theme-modal.open')).not.toBeVisible();
  });

  test('picks a design and applies data-design to <html>', async ({ page }) => {
    await openModal(page);
    await page.locator('[data-design-id="swiss"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-design', 'swiss');
  });

  test('picks a palette and applies data-theme to <html>', async ({ page }) => {
    await openModal(page);
    await page.locator('[data-theme-id="dracula"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dracula');
  });

  test('design + palette can be combined independently', async ({ page }) => {
    await openModal(page);
    await page.locator('[data-design-id="pixel"]').click();
    await page.locator('[data-theme-id="nord"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-design', 'pixel');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'nord');
  });

  test('selections persist across a reload', async ({ page }) => {
    await openModal(page);
    await page.locator('[data-design-id="editorial"]').click();
    await page.locator('[data-theme-id="tokyo-night"]').click();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-design', 'editorial');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'tokyo-night');
  });

  test('h1 font-family changes between designs', async ({ page }) => {
    const h1 = page.locator('h1.hero-name').first();
    await expect(h1).toBeVisible();

    await openModal(page);
    await page.locator('[data-design-id="minimal"]').click();
    await page.keyboard.press('Escape');
    const minimalFont = await h1.evaluate(el => getComputedStyle(el).fontFamily);

    await openModal(page);
    await page.locator('[data-design-id="pixel"]').click();
    await page.keyboard.press('Escape');
    const pixelFont = await h1.evaluate(el => getComputedStyle(el).fontFamily);

    expect(pixelFont).not.toBe(minimalFont);
    expect(pixelFont.toLowerCase()).toContain('press start');

    await openModal(page);
    await page.locator('[data-design-id="editorial"]').click();
    await page.keyboard.press('Escape');
    const editorialFont = await h1.evaluate(el => getComputedStyle(el).fontFamily);

    expect(editorialFont).not.toBe(minimalFont);
    expect(editorialFont).not.toBe(pixelFont);
    expect(editorialFont.toLowerCase()).toContain('playfair');
  });

  test('window.setDesign API works and validates ids', async ({ page }) => {
    await page.evaluate(() => (window as unknown as { setDesign(id: string): void }).setDesign('glass'));
    await expect(page.locator('html')).toHaveAttribute('data-design', 'glass');

    const errors: string[] = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.evaluate(() => (window as unknown as { setDesign(id: string): void }).setDesign('not-a-design'));
    await expect(page.locator('html')).toHaveAttribute('data-design', 'glass');
    expect(errors.some(e => /not-a-design/.test(e))).toBe(true);
  });

  test('URL ?design=… is honored then stripped', async ({ page }) => {
    await page.goto('/?design=neumorphic', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-design', 'neumorphic');
    expect(page.url()).not.toContain('design=');
  });

  test('design tiles include every registered design', async ({ page }) => {
    await openModal(page);
    for (const id of [
      'minimal', 'editorial', 'glass', 'swiss', 'neumorphic', 'pixel',
      'terminal', 'cyber', 'clay',
      'notebook', 'brutalist', 'blueprint',
    ]) {
      await expect(page.locator(`[data-design-id="${id}"]`)).toBeVisible();
    }
  });

  test('notebook design applies Caveat to the hero name', async ({ page }) => {
    const h1 = page.locator('h1.hero-name').first();
    await openModal(page);
    await page.locator('[data-design-id="notebook"]').click();
    await page.keyboard.press('Escape');
    const font = await h1.evaluate(el => getComputedStyle(el).fontFamily);
    expect(font.toLowerCase()).toContain('caveat');
  });

  test('brutalist design uses Times New Roman and thick shadows on the CTA', async ({ page }) => {
    await openModal(page);
    await page.locator('[data-design-id="brutalist"]').click();
    await page.keyboard.press('Escape');
    const bodyFont = await page.locator('body').evaluate(el => getComputedStyle(el).fontFamily);
    expect(bodyFont.toLowerCase()).toContain('times');
    const cta = page.locator('.hero-cta').first();
    const shadow = await cta.evaluate(el => getComputedStyle(el).boxShadow);
    expect(shadow).not.toBe('none');
  });

  test('blueprint design tags sections with REV-<n> via ::before', async ({ page }) => {
    await openModal(page);
    await page.locator('[data-design-id="blueprint"]').click();
    await page.keyboard.press('Escape');
    const aboutSection = page.locator('section.about');
    const pseudoContent = await aboutSection.evaluate(el => getComputedStyle(el, '::before').content);
    expect(pseudoContent).toMatch(/REV-?0?1/i);
  });

  test('terminal design switches the hero greeting to monospace', async ({ page }) => {
    await openModal(page);
    await page.locator('[data-design-id="terminal"]').click();
    await page.keyboard.press('Escape');
    const body = page.locator('body');
    const font = await body.evaluate(el => getComputedStyle(el).fontFamily);
    expect(font.toLowerCase()).toContain('jetbrains mono');
  });

  test('cyberpunk design applies Orbitron to the hero name', async ({ page }) => {
    const h1 = page.locator('h1.hero-name').first();
    await openModal(page);
    await page.locator('[data-design-id="cyber"]').click();
    await page.keyboard.press('Escape');
    const font = await h1.evaluate(el => getComputedStyle(el).fontFamily);
    expect(font.toLowerCase()).toContain('orbitron');
  });

  test('Swiss design reveals giant section numerals', async ({ page }) => {
    await openModal(page);
    await page.locator('[data-design-id="swiss"]').click();
    await page.keyboard.press('Escape');

    const aboutSection = page.locator('section.about');
    const pseudoContent = await aboutSection.evaluate(el => getComputedStyle(el, '::before').content);
    expect(pseudoContent).toMatch(/01/);
  });
});
