/**
 * E2E tests for the Ctrl+K theme/design picker.
 *
 * Verifies that:
 *  - pressing Ctrl+K opens the modal on the home page
 *  - selecting a design tile sets `html[data-design]`
 *  - selecting a palette swatch sets `html[data-theme]`
 *  - a design offers, and applies, only the two palettes it owns
 *  - switching design snaps the palette to the new design's own night/day
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

  test('first visits use the Barcelona Signal variant matching system mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.evaluate(() => localStorage.removeItem('theme'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'barcelona-day');

    await page.emulateMedia({ colorScheme: 'dark' });
    await page.evaluate(() => localStorage.removeItem('theme'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'barcelona-night');
  });

  test('Deloitte logo follows the Barcelona palette color scheme', async ({ page }) => {
    const logo = page.getByAltText('Deloitte logo');

    await page.evaluate(() =>
      (window as unknown as { setTheme(id: string): void }).setTheme('barcelona-day')
    );
    await expect(logo).toHaveAttribute('src', /Logo_of_Deloitte\.svg$/);

    await page.evaluate(() =>
      (window as unknown as { setTheme(id: string): void }).setTheme('barcelona-night')
    );
    await expect(logo).toHaveAttribute('src', /Deloitte_logo_white\.svg$/);
  });

  test('picks a design and applies data-design to <html>', async ({ page }) => {
    await openModal(page);
    await page.locator('[data-design-id="swiss"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-design', 'swiss');
  });

  test('picks a palette and applies data-theme to <html>', async ({ page }) => {
    await openModal(page);
    await page.locator('[data-theme-id="barcelona-night"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'barcelona-night');
    await page.locator('[data-theme-id="barcelona-day"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'barcelona-day');
  });

  test('a design offers only its own two palettes', async ({ page }) => {
    await openModal(page);
    await page.locator('[data-design-id="pixel"]').click();

    const visible = page.locator('.theme-modal-swatch:visible');
    await expect(visible).toHaveCount(2);
    await expect(visible.nth(0)).toHaveAttribute('data-theme-id', 'pixel-night');
    await expect(visible.nth(1)).toHaveAttribute('data-theme-id', 'pixel-day');
    // Another design's palettes are not reachable from here.
    await expect(page.locator('[data-theme-id="barcelona-day"]')).toBeHidden();
    await expect(page.locator('[data-theme-id="comic-night"]')).toBeHidden();

    await page.locator('[data-theme-id="pixel-day"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-design', 'pixel');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'pixel-day');
  });

  test('the picker names each palette, localized, with its dark/light caption', async ({
    page,
  }) => {
    await openModal(page);
    await page.locator('[data-design-id="comic"]').click();
    const night = page.locator('[data-theme-id="comic-night"]');
    await expect(night.locator('.theme-modal-name')).toHaveText('Midnight Edition');
    await expect(night.locator('.theme-modal-scheme')).toHaveText('Dark');
    await expect(page.locator('[data-theme-id="comic-day"] .theme-modal-name')).toHaveText(
      'Sunday Funnies'
    );
  });

  test('retired palettes are not offered anywhere', async ({ page }) => {
    for (const id of ['dracula', 'nord', 'gruvbox-dark', 'tokyo-night', 'sepia', 'paper']) {
      await expect(page.locator(`[data-theme-id="${id}"]`)).toHaveCount(0);
    }
    // 17 designs x (night + day), each rendered once and shown one design at a time.
    await expect(page.locator('.theme-modal-swatch')).toHaveCount(34);
  });

  test('switching design keeps night/day by snapping to the new design’s own palette', async ({
    page,
  }) => {
    await openModal(page);
    await page.locator('[data-theme-id="barcelona-night"]').click();
    await page.locator('[data-design-id="comic"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'comic-night');

    await page.locator('[data-theme-id="comic-day"]').click();
    await page.locator('[data-design-id="editorial"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'editorial-day');
  });

  test('selections persist across a reload', async ({ page }) => {
    await openModal(page);
    await page.locator('[data-design-id="editorial"]').click();
    await page.locator('[data-theme-id="editorial-night"]').click();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-design', 'editorial');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'editorial-night');
  });

  test('Ctrl+K opens instantly, a click on the nav button animates', async ({ page }) => {
    await openModal(page);
    await expect(page.locator('#theme-modal')).toHaveClass(/instant/);
    await page.keyboard.press('Escape');
    await page.evaluate(() => document.dispatchEvent(new Event('open-theme-modal')));
    await expect(page.locator('#theme-modal.open')).toBeVisible();
    await expect(page.locator('#theme-modal')).not.toHaveClass(/instant/);
  });

  test('stored palettes that the active design does not own snap to the one it does', async ({
    page,
  }) => {
    const reloadWith = async (design: string, theme: string) => {
      await page.evaluate(
        ([d, t]) => {
          localStorage.setItem('design', d);
          localStorage.setItem('theme', t);
        },
        [design, theme]
      );
      await page.reload({ waitUntil: 'domcontentloaded' });
    };
    const html = page.locator('html');

    // Another design's palette keeps its scheme.
    await reloadWith('comic', 'barcelona-night');
    await expect(html).toHaveAttribute('data-theme', 'comic-night');
    await reloadWith('comic', 'barcelona-day');
    await expect(html).toHaveAttribute('data-theme', 'comic-day');

    // A retired light palette still lands on the day colorway.
    await reloadWith('editorial', 'sepia');
    await expect(html).toHaveAttribute('data-theme', 'editorial-day');

    // A retired palette we cannot place follows the system preference.
    await page.emulateMedia({ colorScheme: 'dark' });
    await reloadWith('editorial', 'dracula');
    await expect(html).toHaveAttribute('data-theme', 'editorial-night');
  });

  test('a ?theme= link for a palette implies the design that owns it', async ({ page }) => {
    await page.goto('/?theme=zine-night', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-design', 'zine');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'zine-night');
    expect(new URL(page.url()).search).toBe('');

    // An explicit ?design= wins and the palette snaps to it.
    await page.goto('/?design=comic&theme=barcelona-night', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-design', 'comic');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'comic-night');
  });

  test('window.setTheme switches to the design that owns the palette', async ({ page }) => {
    await page.evaluate(() =>
      (window as unknown as { setTheme(id: string): void }).setTheme('deco-day')
    );
    await expect(page.locator('html')).toHaveAttribute('data-design', 'deco');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'deco-day');

    await page.evaluate(() =>
      (window as unknown as { setDesign(id: string): void }).setDesign('terminal')
    );
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'terminal-day');
  });

  test('h1 font-family changes between designs', async ({ page }) => {
    const h1 = page.locator('h1.hero-name').first();
    await expect(h1).toBeVisible();

    await openModal(page);
    await page.locator('[data-design-id="minimal"]').click();
    await page.keyboard.press('Escape');
    const minimalFont = await h1.evaluate((el) => getComputedStyle(el).fontFamily);

    await openModal(page);
    await page.locator('[data-design-id="pixel"]').click();
    await page.keyboard.press('Escape');
    const pixelFont = await h1.evaluate((el) => getComputedStyle(el).fontFamily);

    expect(pixelFont).not.toBe(minimalFont);
    expect(pixelFont.toLowerCase()).toContain('press start');

    await openModal(page);
    await page.locator('[data-design-id="editorial"]').click();
    await page.keyboard.press('Escape');
    const editorialFont = await h1.evaluate((el) => getComputedStyle(el).fontFamily);

    expect(editorialFont).not.toBe(minimalFont);
    expect(editorialFont).not.toBe(pixelFont);
    expect(editorialFont.toLowerCase()).toContain('playfair');
  });

  test('window.setDesign API works and validates ids', async ({ page }) => {
    await page.evaluate(() =>
      (window as unknown as { setDesign(id: string): void }).setDesign('swiss')
    );
    await expect(page.locator('html')).toHaveAttribute('data-design', 'swiss');

    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    await page.evaluate(() =>
      (window as unknown as { setDesign(id: string): void }).setDesign('not-a-design')
    );
    await expect(page.locator('html')).toHaveAttribute('data-design', 'swiss');
    expect(errors.some((e) => /not-a-design/.test(e))).toBe(true);
  });

  test('URL ?design=… is honored then stripped', async ({ page }) => {
    await page.goto('/?design=editorial', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-design', 'editorial');
    expect(page.url()).not.toContain('design=');
  });

  test('design tiles include every registered design', async ({ page }) => {
    await openModal(page);
    for (const id of [
      'minimal',
      'editorial',
      'swiss',
      'pixel',
      'terminal',
      'cyber',
      'notebook',
      'brutalist',
      'blueprint',
      'academic',
      'ide',
      'risograph',
      'deco',
      'wabisabi',
      'zine',
      'comic',
      'newspaper',
    ]) {
      await expect(page.locator(`[data-design-id="${id}"]`)).toBeVisible();
    }
  });

  test('notebook design applies Caveat to the hero name', async ({ page }) => {
    const h1 = page.locator('h1.hero-name').first();
    await openModal(page);
    await page.locator('[data-design-id="notebook"]').click();
    await page.keyboard.press('Escape');
    const font = await h1.evaluate((el) => getComputedStyle(el).fontFamily);
    expect(font.toLowerCase()).toContain('caveat');
  });

  test('brutalist design uses Times New Roman and thick shadows on the CTA', async ({ page }) => {
    await openModal(page);
    await page.locator('[data-design-id="brutalist"]').click();
    await page.keyboard.press('Escape');
    const bodyFont = await page.locator('body').evaluate((el) => getComputedStyle(el).fontFamily);
    expect(bodyFont.toLowerCase()).toContain('times');
    const cta = page.locator('.hero-cta').first();
    const shadow = await cta.evaluate((el) => getComputedStyle(el).boxShadow);
    expect(shadow).not.toBe('none');
  });

  test('blueprint design tags sections with REV-<n> via ::before', async ({ page }) => {
    await openModal(page);
    await page.locator('[data-design-id="blueprint"]').click();
    await page.keyboard.press('Escape');
    const aboutSection = page.locator('section.about');
    const pseudoContent = await aboutSection.evaluate(
      (el) => getComputedStyle(el, '::before').content
    );
    expect(pseudoContent).toMatch(/REV-?0?3/i);
  });

  test('terminal design switches the hero greeting to monospace', async ({ page }) => {
    await openModal(page);
    await page.locator('[data-design-id="terminal"]').click();
    await page.keyboard.press('Escape');
    const body = page.locator('body');
    const font = await body.evaluate((el) => getComputedStyle(el).fontFamily);
    expect(font.toLowerCase()).toContain('jetbrains mono');
  });

  test('cyberpunk design applies Orbitron to the hero name', async ({ page }) => {
    const h1 = page.locator('h1.hero-name').first();
    await openModal(page);
    await page.locator('[data-design-id="cyber"]').click();
    await page.keyboard.press('Escape');
    const font = await h1.evaluate((el) => getComputedStyle(el).fontFamily);
    expect(font.toLowerCase()).toContain('orbitron');
  });

  test('Swiss design reveals giant section numerals', async ({ page }) => {
    await openModal(page);
    await page.locator('[data-design-id="swiss"]').click();
    await page.keyboard.press('Escape');

    const aboutSection = page.locator('section.about');
    const pseudoContent = await aboutSection.evaluate(
      (el) => getComputedStyle(el, '::before').content
    );
    expect(pseudoContent).toMatch(/03/);
  });

  test('academic design applies EB Garamond to the hero name', async ({ page }) => {
    const h1 = page.locator('h1.hero-name').first();
    await openModal(page);
    await page.locator('[data-design-id="academic"]').click();
    await page.keyboard.press('Escape');
    const font = await h1.evaluate((el) => getComputedStyle(el).fontFamily);
    expect(font.toLowerCase()).toContain('garamond');
  });

  test('IDE design wraps the hero name in string quotes via ::before', async ({ page }) => {
    const h1 = page.locator('h1.hero-name').first();
    await openModal(page);
    await page.locator('[data-design-id="ide"]').click();
    await page.keyboard.press('Escape');
    const pseudoContent = await h1.evaluate((el) => getComputedStyle(el, '::before').content);
    expect(pseudoContent).toMatch(/"/);
    const font = await h1.evaluate((el) => getComputedStyle(el).fontFamily);
    expect(font.toLowerCase()).toContain('jetbrains mono');
  });

  test('risograph design duotones odd vs even sections', async ({ page }) => {
    await openModal(page);
    await page.locator('[data-design-id="risograph"]').click();
    await page.keyboard.press('Escape');
    const aboutBg = await page
      .locator('section.about')
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    const demosBg = await page
      .locator('section.demos')
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(aboutBg).not.toBe(demosBg);
  });

  test('Art Deco prefixes section titles with a Roman numeral', async ({ page }) => {
    await openModal(page);
    await page.locator('[data-design-id="deco"]').click();
    await page.keyboard.press('Escape');
    const title = page.locator('section.about .section-title').first();
    const pseudoContent = await title.evaluate((el) => getComputedStyle(el, '::before').content);
    expect(pseudoContent).toMatch(/upper-roman/);
  });

  test('Wabi-sabi applies Shippori Mincho (or serif fallback) to the hero name', async ({
    page,
  }) => {
    const h1 = page.locator('h1.hero-name').first();
    await openModal(page);
    await page.locator('[data-design-id="wabisabi"]').click();
    await page.keyboard.press('Escape');
    const font = await h1.evaluate((el) => getComputedStyle(el).fontFamily);
    expect(font.toLowerCase()).toMatch(/shippori|mincho|serif|garamond/);
  });

  test('setDesign API validates unknown ids and keeps current design', async ({ page }) => {
    await page.evaluate(() =>
      (window as unknown as { setDesign(id: string): void }).setDesign('brutalist')
    );
    await expect(page.locator('html')).toHaveAttribute('data-design', 'brutalist');
    // Try setting a non-existent design — should stay on brutalist
    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    await page.evaluate(() =>
      (window as unknown as { setDesign(id: string): void }).setDesign('dashboard')
    );
    await expect(page.locator('html')).toHaveAttribute('data-design', 'brutalist');
    expect(errors.some((e) => /dashboard/.test(e))).toBe(true);
  });

  test('Zine design applies a heavy box-shadow offset to cards (photocopied feel)', async ({
    page,
  }) => {
    await openModal(page);
    await page.locator('[data-design-id="zine"]').click();
    await page.keyboard.press('Escape');
    const card = page.locator('.work-card, .demo-card, .card').first();
    const shadow = await card.evaluate((el) => getComputedStyle(el).boxShadow);
    expect(shadow).not.toBe('none');
    // solid offset shadow without blur → contains "0px 0px" or explicit offsets, not "rgba(0,0,0,0.1)"
    expect(shadow).toMatch(/\d+px\s+\d+px\s+0px/);
  });

  test('Comic design applies Bangers to the hero name', async ({ page }) => {
    const h1 = page.locator('h1.hero-name').first();
    await openModal(page);
    await page.locator('[data-design-id="comic"]').click();
    await page.keyboard.press('Escape');
    const font = await h1.evaluate((el) => getComputedStyle(el).fontFamily);
    expect(font.toLowerCase()).toContain('bangers');
  });

  test('Newspaper design applies UnifrakturMaguntia to the nav logo (masthead)', async ({
    page,
  }) => {
    await openModal(page);
    await page.locator('[data-design-id="newspaper"]').click();
    await page.keyboard.press('Escape');
    const logo = page.locator('.nav-logo').first();
    const font = await logo.evaluate((el) => getComputedStyle(el).fontFamily);
    expect(font.toLowerCase()).toMatch(/unifraktur|fraktur|playfair/);
  });
});
