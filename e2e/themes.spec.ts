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
    await page.evaluate(() => (window as unknown as { setDesign(id: string): void }).setDesign('swiss'));
    await expect(page.locator('html')).toHaveAttribute('data-design', 'swiss');

    const errors: string[] = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.evaluate(() => (window as unknown as { setDesign(id: string): void }).setDesign('not-a-design'));
    await expect(page.locator('html')).toHaveAttribute('data-design', 'swiss');
    expect(errors.some(e => /not-a-design/.test(e))).toBe(true);
  });

  test('URL ?design=… is honored then stripped', async ({ page }) => {
    await page.goto('/?design=editorial', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-design', 'editorial');
    expect(page.url()).not.toContain('design=');
  });

  test('design tiles include every registered design', async ({ page }) => {
    await openModal(page);
    for (const id of [
      'minimal', 'editorial', 'swiss', 'pixel',
      'terminal', 'cyber',
      'notebook', 'brutalist', 'blueprint',
      'academic', 'ide', 'risograph',
      'deco', 'wabisabi',
      'zine', 'comic', 'newspaper',
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

  test('academic design applies EB Garamond to the hero name', async ({ page }) => {
    const h1 = page.locator('h1.hero-name').first();
    await openModal(page);
    await page.locator('[data-design-id="academic"]').click();
    await page.keyboard.press('Escape');
    const font = await h1.evaluate(el => getComputedStyle(el).fontFamily);
    expect(font.toLowerCase()).toContain('garamond');
  });

  test('IDE design wraps the hero name in string quotes via ::before', async ({ page }) => {
    const h1 = page.locator('h1.hero-name').first();
    await openModal(page);
    await page.locator('[data-design-id="ide"]').click();
    await page.keyboard.press('Escape');
    const pseudoContent = await h1.evaluate(el => getComputedStyle(el, '::before').content);
    expect(pseudoContent).toMatch(/"/);
    const font = await h1.evaluate(el => getComputedStyle(el).fontFamily);
    expect(font.toLowerCase()).toContain('jetbrains mono');
  });

  test('risograph design duotones odd vs even sections', async ({ page }) => {
    await openModal(page);
    await page.locator('[data-design-id="risograph"]').click();
    await page.keyboard.press('Escape');
    const aboutBg = await page.locator('section.about').evaluate(el => getComputedStyle(el).backgroundColor);
    const demosBg = await page.locator('section.demos').evaluate(el => getComputedStyle(el).backgroundColor);
    expect(aboutBg).not.toBe(demosBg);
  });

  test('Art Deco prefixes section titles with a Roman numeral', async ({ page }) => {
    await openModal(page);
    await page.locator('[data-design-id="deco"]').click();
    await page.keyboard.press('Escape');
    const title = page.locator('section.about .section-title').first();
    const pseudoContent = await title.evaluate(el => getComputedStyle(el, '::before').content);
    expect(pseudoContent).toMatch(/upper-roman/);
  });

  test('Wabi-sabi applies Shippori Mincho (or serif fallback) to the hero name', async ({ page }) => {
    const h1 = page.locator('h1.hero-name').first();
    await openModal(page);
    await page.locator('[data-design-id="wabisabi"]').click();
    await page.keyboard.press('Escape');
    const font = await h1.evaluate(el => getComputedStyle(el).fontFamily);
    expect(font.toLowerCase()).toMatch(/shippori|mincho|serif|garamond/);
  });

  test('setDesign API validates unknown ids and keeps current design', async ({ page }) => {
    await page.evaluate(() => (window as unknown as { setDesign(id: string): void }).setDesign('brutalist'));
    await expect(page.locator('html')).toHaveAttribute('data-design', 'brutalist');
    // Try setting a non-existent design — should stay on brutalist
    const errors: string[] = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.evaluate(() => (window as unknown as { setDesign(id: string): void }).setDesign('dashboard'));
    await expect(page.locator('html')).toHaveAttribute('data-design', 'brutalist');
    expect(errors.some(e => /dashboard/.test(e))).toBe(true);
  });

  test('Zine design applies a heavy box-shadow offset to cards (photocopied feel)', async ({ page }) => {
    await openModal(page);
    await page.locator('[data-design-id="zine"]').click();
    await page.keyboard.press('Escape');
    const card = page.locator('.work-card, .demo-card, .card').first();
    const shadow = await card.evaluate(el => getComputedStyle(el).boxShadow);
    expect(shadow).not.toBe('none');
    // solid offset shadow without blur → contains "0px 0px" or explicit offsets, not "rgba(0,0,0,0.1)"
    expect(shadow).toMatch(/\d+px\s+\d+px\s+0px/);
  });

  test('Comic design applies Bangers to the hero name', async ({ page }) => {
    const h1 = page.locator('h1.hero-name').first();
    await openModal(page);
    await page.locator('[data-design-id="comic"]').click();
    await page.keyboard.press('Escape');
    const font = await h1.evaluate(el => getComputedStyle(el).fontFamily);
    expect(font.toLowerCase()).toContain('bangers');
  });

  test('Newspaper design applies UnifrakturMaguntia to the nav logo (masthead)', async ({ page }) => {
    await openModal(page);
    await page.locator('[data-design-id="newspaper"]').click();
    await page.keyboard.press('Escape');
    const logo = page.locator('.nav-logo').first();
    const font = await logo.evaluate(el => getComputedStyle(el).fontFamily);
    expect(font.toLowerCase()).toMatch(/unifraktur|fraktur|playfair/);
  });

  test('recommended palettes get a ★ badge when matching design is active', async ({ page }) => {
    await openModal(page);
    // Terminal recommends phosphor, amber-crt, gruvbox-dark
    await page.locator('[data-design-id="terminal"]').click();

    const phosphor = page.locator('[data-theme-id="phosphor"]');
    const nord = page.locator('[data-theme-id="nord"]');

    // Recommended swatch gets data-rec='true' and a fully-opaque star badge
    await expect(phosphor).toHaveAttribute('data-rec', 'true');
    await expect(phosphor.locator('.theme-modal-rec-badge')).toHaveCSS('opacity', '1');

    // Non-recommended swatch has no data-rec flag and a hidden star badge
    await expect(nord).not.toHaveAttribute('data-rec', 'true');
    await expect(nord.locator('.theme-modal-rec-badge')).toHaveCSS('opacity', '0');
  });

  test('recommendation stars move when the user picks a different design', async ({ page }) => {
    await openModal(page);
    // Newspaper recommends sepia; pixel does NOT recommend sepia.
    await page.locator('[data-design-id="newspaper"]').click();
    await expect(page.locator('[data-theme-id="sepia"]')).toHaveAttribute('data-rec', 'true');

    await page.locator('[data-design-id="pixel"]').click();
    await expect(page.locator('[data-theme-id="sepia"]')).not.toHaveAttribute('data-rec', 'true');
    // Pixel recommends synthwave
    await expect(page.locator('[data-theme-id="synthwave"]')).toHaveAttribute('data-rec', 'true');
  });
});
