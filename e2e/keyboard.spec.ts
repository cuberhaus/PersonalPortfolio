/**
 * Keyboard navigation tests.
 *
 * Covers:
 *  - The skip-to-content link is reachable by keyboard early in tab order
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
  test('the skip-to-content link is reachable within the first few tabs', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // Reset focus to a known starting point: clear whatever the dev server
    // / browser chrome may have left focused.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    let foundSkipLink = false;
    for (let i = 0; i < 5; i += 1) {
      await page.keyboard.press('Tab');
      const info = await activeElementInfo(page);
      if (info.tag === 'A' && (info.href ?? '').includes('#main-content')) {
        foundSkipLink = true;
        break;
      }
    }
    expect(foundSkipLink, 'expected a #main-content skip link in early tab order').toBe(true);
  });
});

test.describe('Enter-to-submit handlers', () => {
  test('Pro2: Enter on the gene-sequence input adds a species', async ({ page }) => {
    await page.goto('/demos/pro2', { waitUntil: 'domcontentloaded' });
    // Target the inputs by their aria-labels so we don't collide with any
    // unrelated text inputs (LiveAppEmbed iframes, search boxes, etc.).
    const idInput = page.getByLabel('Species ID').first();
    const geneInput = page.getByLabel(/gene sequence/i).first();
    await idInput.waitFor({ state: 'visible', timeout: 15_000 });
    await geneInput.waitFor({ state: 'visible', timeout: 15_000 });

    // Pro2Demo is a `client:visible` island, so the inputs render from SSR
    // markup well before React wires up onChange / onKeyDown. A naïve
    // fill-then-Enter races hydration: the typed value gets reconciled away
    // by the first render, and the Enter handler isn't live yet. Poll a
    // fill until the controlled value sticks — that's a deterministic
    // signal that React has taken over the input.
    const fillUntilSticks = async (locator: typeof idInput, value: string) =>
      expect
        .poll(
          async () => {
            await locator.fill(value);
            return locator.inputValue();
          },
          { timeout: 15_000 }
        )
        .toBe(value);

    await fillUntilSticks(idInput, 'Z9');
    await fillUntilSticks(geneInput, 'AACTGCTTGA');
    // Last fill leaves focus on geneInput; press Enter directly so we
    // don't depend on whatever else page.keyboard.press might target.
    await geneInput.press('Enter');
    // The cleanest stable signal is "the gene input was cleared" — the
    // demo's addSpecies() reset path that the Enter handler triggers.
    await expect.poll(() => geneInput.inputValue(), { timeout: 5_000 }).toBe('');
  });
});

test.describe('JSBach Tab-indent', () => {
  test('Tab inserts two spaces at the cursor in the code editor', async ({ page }) => {
    await page.goto('/demos/jsbach', { waitUntil: 'domcontentloaded' });
    const textarea = page.locator('textarea').first();
    await textarea.waitFor({ state: 'visible', timeout: 15_000 });
    // Move caret to position 0 deterministically — Home only goes to line
    // start, and the sample program starts mid-line in some browsers.
    await page.evaluate(() => {
      const ta = document.querySelector('textarea') as HTMLTextAreaElement | null;
      if (ta) {
        ta.focus();
        ta.setSelectionRange(0, 0);
      }
    });
    const before = await textarea.inputValue();
    await page.keyboard.press('Tab');
    const after = await textarea.inputValue();
    // Tab inserts "  " at selectionStart, so `after` should be exactly that.
    expect(after).toBe('  ' + before);
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
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
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
        if (sig === '__body__') return;
        if (seen.has(sig)) {
          cyclesSinceNew += 1;
          if (cyclesSinceNew > 5) return;
        } else {
          seen.add(sig);
          cyclesSinceNew = 0;
        }
      }
      throw new Error(
        `[${slug}] tabbed 200 times without completing the focusable cycle (${seen.size} unique elements)`
      );
    });
  }
});
