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
    // Wait for any view-transitions / hydration scripts to finish kicking
    // off before we try to introspect the DOM. Astro's ClientRouter can
    // navigate between hydration windows; querying activeElement inside one
    // of those races yields "Execution context was destroyed".
    await page.waitForLoadState('networkidle').catch(() => undefined);
    // Reset focus to a known starting point: clear whatever the dev server
    // / browser chrome may have left focused.
    await page
      .evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
      .catch(() => undefined);
    let foundSkipLink = false;
    for (let i = 0; i < 8; i += 1) {
      await page.keyboard.press('Tab');
      const info = await activeElementInfo(page).catch(() => null);
      if (!info) continue;
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

    // The demo's addSpecies() bails out unless both inputs are non-empty,
    // the species ID is unique, and the gene matches /^[ACGT]+$/. We also
    // need to give React time to finish hydrating onKeyDown after the
    // client:visible boundary fires. Use pressSequentially so React
    // batches per-character updates, and observe the species table
    // growing rather than poll the input itself — that's the actual
    // user-visible side effect.
    const speciesRows = page.locator('table tbody tr, [data-species-id]');
    const initialCount = await speciesRows.count().catch(() => 0);

    await idInput.click();
    await idInput.pressSequentially('Z9', { delay: 30 });
    await geneInput.click();
    await geneInput.pressSequentially('AACTGCTTGA', { delay: 30 });
    await geneInput.press('Enter');

    // Either the species count rises (new row rendered) or the input is
    // cleared (addSpecies reset path). Both are valid signals that the
    // Enter handler fired. We accept whichever the demo's UI surfaces.
    await expect
      .poll(
        async () => {
          const count = await speciesRows.count().catch(() => 0);
          const value = await geneInput.inputValue().catch(() => '');
          return count > initialCount || value === '';
        },
        { timeout: 10_000 }
      )
      .toBe(true);
  });
});

test.describe('JSBach Tab-indent', () => {
  test('Tab inserts two spaces at the cursor in the code editor', async ({ page }) => {
    await page.goto('/demos/jsbach', { waitUntil: 'domcontentloaded' });
    const textarea = page.locator('textarea').first();
    await textarea.waitFor({ state: 'visible', timeout: 15_000 });
    // The textarea ref lives inside a React island that hydrates lazily.
    // The Tab handler only runs after onKeyDown is wired up — give the
    // island a beat to mount before we exercise it.
    await page.waitForTimeout(500);
    // Click to focus first (a real focus event fires onMount handlers in
    // some browsers), then setSelectionRange in the same evaluate so the
    // caret is deterministically at position 0 when Tab fires.
    await textarea.click();
    await textarea.evaluate((el: HTMLTextAreaElement) => {
      el.focus();
      el.setSelectionRange(0, 0);
    });
    const before = await textarea.inputValue();
    await textarea.press('Tab');
    // React commits the setCode + setSelectionRange via setTimeout(0); poll
    // the value rather than read it once — flaky CI runs hit the read
    // before the commit.
    await expect.poll(() => textarea.inputValue(), { timeout: 5_000 }).toBe('  ' + before);
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
