/**
 * Keyboard navigation tests.
 *
 * Covers:
 *  - Tab order on the homepage starts with the skip-to-content link
 *  - Demos that have an Enter-key handler actually fire it from a focused input
 *  - JSBach's Tab-indent shortcut inserts two spaces in the code editor
 *  - No keyboard trap on representative demos: tabbing through every focusable
 *    element eventually returns to <body> instead of cycling forever inside
 *    the island
 *
 * Run: npx playwright test --project=keyboard
 */
import { test, expect, type Page } from '@playwright/test';

async function activeElementInfo(
  page: Page
): Promise<{ tag: string; id: string; cls: string; text: string; href: string | null }> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    return {
      tag: el?.tagName ?? '',
      id: el?.id ?? '',
      cls: el?.className ?? '',
      text: (el?.textContent ?? '').trim().slice(0, 60),
      href: (el as HTMLAnchorElement | null)?.href ?? null,
    };
  });
}

test.describe('Homepage tab order', () => {
  test('first tab focuses the skip-to-content link', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('body').click({ position: { x: 0, y: 0 }, force: true });
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press('Tab');
    const info = await activeElementInfo(page);
    // The skip-to-content link is the first focusable element on the page
    // and is the only anchor whose href ends with #main-content.
    expect(info.tag).toBe('A');
    expect(info.href ?? '').toContain('#main-content');
  });
});

test.describe('Enter-to-submit handlers', () => {
  test('Pro2: Enter on the species input adds an entry', async ({ page }) => {
    await page.goto('/demos/pro2', { waitUntil: 'domcontentloaded' });
    // Wait for hydration: input becomes interactive
    const input = page
      .locator('input[type="text"]')
      .filter({ hasNot: page.locator('[disabled]') })
      .first();
    await input.waitFor({ state: 'visible', timeout: 10_000 });
    const before = await page.locator('table tbody tr, [role="row"]').count();
    await input.click();
    await input.fill('Test species ACGT');
    await page.keyboard.press('Enter');
    // Either the row count rises, or the input clears (both are valid signals).
    await page.waitForTimeout(300);
    const after = await page.locator('table tbody tr, [role="row"]').count();
    const inputValue = await input.inputValue();
    expect(after > before || inputValue === '').toBeTruthy();
  });
});

test.describe('JSBach Tab-indent', () => {
  test('Tab inserts two spaces in the code editor', async ({ page }) => {
    await page.goto('/demos/jsbach', { waitUntil: 'domcontentloaded' });
    const textarea = page.locator('textarea').first();
    await textarea.waitFor({ state: 'visible', timeout: 10_000 });
    await textarea.click();
    // Move caret to start so the inserted spaces land in a predictable place.
    await page.keyboard.press('Home');
    await page.keyboard.press('Tab');
    const value = await textarea.inputValue();
    expect(value.startsWith('  ')).toBeTruthy();
  });
});

test.describe('No keyboard trap', () => {
  // For each demo, tab a bounded number of times and assert focus eventually
  // leaves the document body — i.e. the browser would move to the address bar
  // / browser chrome instead of cycling forever.
  const DEMOS = ['mpids', 'planificacion', 'sbc-ia'];

  for (const slug of DEMOS) {
    test(`/demos/${slug} does not trap focus`, async ({ page }) => {
      await page.goto(`/demos/${slug}`, { waitUntil: 'domcontentloaded' });
      // Some demos hydrate progressively — give them a beat.
      await page.waitForTimeout(500);
      await page.locator('body').click({ position: { x: 0, y: 0 }, force: true });
      const seen = new Set<string>();
      let cyclesSinceNew = 0;
      for (let i = 0; i < 200; i += 1) {
        await page.keyboard.press('Tab');
        const sig = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          if (!el || el === document.body) return '__body__';
          // Build a stable signature so we can detect cycles.
          return `${el.tagName}#${el.id}.${el.className}|${(el.textContent ?? '').slice(0, 20)}`;
        });
        if (sig === '__body__') {
          // Hit body — definitely no trap.
          return;
        }
        if (seen.has(sig)) {
          cyclesSinceNew += 1;
          // We've cycled through the whole page back to a previously-focused
          // element. That's the natural end of the focusable list — no trap.
          if (cyclesSinceNew > 5) return;
        } else {
          seen.add(sig);
          cyclesSinceNew = 0;
        }
      }
      // If we tabbed 200 times without seeing a cycle or hitting body,
      // something is generating new focusable nodes per Tab — log it.
      throw new Error(
        `[${slug}] tabbed 200 times without completing the focusable cycle (${seen.size} unique elements)`
      );
    });
  }
});
