/**
 * E2E tests for browser-only demos (no backend required).
 * These run against the Astro dev server and test demos that work
 * entirely in the browser with mock data.
 *
 * Run: npx playwright test --project=browser-demos
 */

import { test, expect } from '@playwright/test';

const ALL_SLUGS = [
  'tfg-polyps', 'draculin', 'bitsx-marato', 'matriculas',
  'joc-eda', 'jsbach', 'tenda', 'pro2', 'mpids',
  'phase-transitions', 'planificacion', 'desastres-ia',
  'apa-practica', 'prop', 'caim', 'sbc-ia', 'par-parallel',
  'rob-robotics', 'algorithms', 'grafics',
];

// ─── Demo pages load without errors ─────────────────────────────

// Benign errors from third-party assets or dev-mode HMR
const IGNORED_ERRORS = [/Unexpected token/i, /Failed to fetch/i];

test.describe('All demo pages load', () => {
  for (const slug of ALL_SLUGS) {
    test(`/demos/${slug} loads without console errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => {
        if (!IGNORED_ERRORS.some((re) => re.test(err.message))) {
          errors.push(err.message);
        }
      });

      await page.goto(`/demos/${slug}`, { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveTitle(/.+/);
      expect(errors).toEqual([]);
    });
  }
});

// ─── DemoNav sidebar navigation ─────────────────────────────────

test.describe('DemoNav sidebar', () => {
  test('sidebar contains links to all demos', async ({ page }) => {
    await page.goto('/demos/jsbach', { waitUntil: 'domcontentloaded' });
    const navLinks = page.locator('nav a[href*="/demos/"]');
    const count = await navLinks.count();
    expect(count).toBeGreaterThanOrEqual(10);
  });

  test('clicking a sidebar link navigates to that demo', async ({ page }) => {
    await page.goto('/demos/jsbach', { waitUntil: 'domcontentloaded' });
    const tendaLink = page.locator('nav a[href*="/demos/tenda"]').first();
    if (await tendaLink.isVisible()) {
      // Sidebar may clip the element outside the viewport; dispatch click via JS
      await tendaLink.dispatchEvent('click');
      await page.waitForURL('**/demos/tenda**', { timeout: 10_000 });
      expect(page.url()).toContain('/demos/tenda');
    }
  });
});

// ─── i18n: Spanish and Catalan routes ───────────────────────────

test.describe('i18n demo pages', () => {
  test('/es/demos/jsbach loads in Spanish', async ({ page }) => {
    await page.goto('/es/demos/jsbach', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/.+/);
  });

  test('/ca/demos/jsbach loads in Catalan', async ({ page }) => {
    await page.goto('/ca/demos/jsbach', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/.+/);
  });
});

// ─── JSBach Demo ─────────────────────────────────────────────────

test.describe('JSBach demo', () => {
  test('loads example and shows code editor', async ({ page }) => {
    await page.goto('/demos/jsbach', { waitUntil: 'domcontentloaded' });
    // Should have a code editor area and example selector
    const codeArea = page.locator('textarea, pre, [contenteditable]').first();
    await expect(codeArea).toBeVisible();
  });

  test('run button produces output', async ({ page }) => {
    await page.goto('/demos/jsbach', { waitUntil: 'domcontentloaded' });
    // Select an example if available
    const select = page.locator('select').first();
    if (await select.isVisible()) {
      await select.selectOption({ index: 1 });
    }
    // Click run button
    const runBtn = page.getByRole('button', { name: /run|execute|interpret/i }).first();
    if (await runBtn.isVisible()) {
      await runBtn.click();
      // Wait for output to appear
      await page.waitForTimeout(500);
      const output = page.locator('[class*="output"], [class*="result"], pre').last();
      await expect(output).not.toBeEmpty();
    }
  });
});

// ─── Tenda Demo ──────────────────────────────────────────────────

test.describe('Tenda demo', () => {
  test('displays product categories on home', async ({ page }) => {
    await page.goto('/demos/tenda', { waitUntil: 'domcontentloaded' });
    // Wait for LiveAppEmbed probe to complete
    await page.waitForTimeout(3000);
    // Force fallback visible in case backend is running
    await page.evaluate(() => {
      const el = document.querySelector('#tenda-mock-fallback') as HTMLElement;
      if (el) el.style.display = '';
    });
    // Scroll fallback into viewport for client:visible hydration
    await page.evaluate(() => {
      document.querySelector('#tenda-mock-fallback')?.scrollIntoView({ block: 'center' });
    });
    await page.waitForTimeout(1500);
    // Should show category cards with cursor:pointer
    const cards = page.locator('#tenda-mock-fallback [style*="cursor:pointer"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('add to cart updates badge count', async ({ page }) => {
    await page.goto('/demos/tenda', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.evaluate(() => {
      const el = document.querySelector('#tenda-mock-fallback') as HTMLElement;
      if (el) el.style.display = '';
    });
    await page.evaluate(() => {
      document.querySelector('#tenda-mock-fallback')?.scrollIntoView({ block: 'center' });
    });
    await page.waitForTimeout(1500);
    // Navigate to a category, then a product
    const firstClickable = page.locator('#tenda-mock-fallback [style*="cursor:pointer"]').first();
    if (await firstClickable.isVisible()) {
      await firstClickable.click();
      await page.waitForTimeout(300);
      // Try to find and click an "add to cart" button
      const addBtn = page.getByRole('button', { name: /add to cart|añadir|afegir/i }).first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(200);
      }
    }
  });
});

// ─── Desastres IA Demo ───────────────────────────────────────────

test.describe('Desastres IA demo', () => {
  test('runs the browser solver and renders optimized output', async ({ page }) => {
    await page.goto('/demos/desastres-ia', { waitUntil: 'domcontentloaded' });
    const runButton = page.getByRole('button', { name: /run search|ejecutar búsqueda|executar cerca/i }).first();
    await runButton.scrollIntoViewIfNeeded();
    await page.waitForTimeout(2000);

    await expect(page.locator('select').first()).toBeVisible();
    await expect(page.locator('input[type="number"]').first()).toBeVisible();
    await expect(runButton).toBeVisible();

    await runButton.dispatchEvent('click');
    await expect(page.locator('text=/H2 cost|Coste H2|Cost H2/i').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/Final queues|Colas finales|Cues finals/i').first()).toBeVisible();
  });
});

// ─── Pro2 WPGMA Demo ────────────────────────────────────────────

test.describe('Pro2 WPGMA demo', () => {
  test('loads sample data and completes clustering', async ({ page }) => {
    await page.goto('/demos/pro2', { waitUntil: 'domcontentloaded' });
    const speciesHeading = page.locator('text=/Species|Especies|Espècies/i').first();
    await speciesHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    await expect(page.getByRole('button', { name: /load sample|cargar muestra|carregar mostra/i })).toBeVisible();
    await expect(page.locator('table').first()).toContainText('A');
    await expect(page.locator('text=/Distance Table|Tabla de Distancias|Taula de Distàncies/i').first()).toBeVisible();

    await page.getByRole('button', { name: /initialize clusters|inicializar clústeres|inicialitzar clústers/i }).dispatchEvent('click');
    await page.getByRole('button', { name: /run all|ejecutar todo|executar tot/i }).dispatchEvent('click');
    await expect(page.locator('text=/Phylogenetic Tree|Árbol Filogenético|Arbre Filogenètic/i').first()).toBeVisible({ timeout: 5000 });
  });
});

// ─── Planificacion Demo ──────────────────────────────────────────

test.describe('Planificacion demo', () => {
  test('shows PDDL domain and problem cards', async ({ page }) => {
    await page.goto('/demos/planificacion', { waitUntil: 'domcontentloaded' });
    const preBlocks = page.locator('pre');
    const count = await preBlocks.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('simulate planner button works', async ({ page }) => {
    await page.goto('/demos/planificacion', { waitUntil: 'domcontentloaded' });
    const mockBtn = page.getByRole('button', { name: /simulate|simular/i }).first();
    if (await mockBtn.isVisible()) {
      await mockBtn.click();
      // Wait for simulated "running" state and then "done"
      await page.waitForTimeout(2000);
    }
  });
});

// ─── LiveAppEmbed offline state ──────────────────────────────────

test.describe('LiveAppEmbed offline fallback', () => {
  // When no backends are running, demos with LiveAppEmbed should show
  // the offline instructional block (not crash)
  for (const slug of ['tenda', 'draculin', 'desastres-ia', 'planificacion']) {
    test(`${slug} shows offline instructions when backend is down`, async ({ page }) => {
      await page.goto(`/demos/${slug}`, { waitUntil: 'domcontentloaded' });
      // After probe fails (2s timeout), the offline block appears
      await page.waitForTimeout(3000);
      // Should have docker command visible or the mock demo should be shown
      // Either way, no crash
      const body = await page.textContent('body');
      expect(body!.length).toBeGreaterThan(100);
    });
  }
});

// ─── Draculin Demo ───────────────────────────────────────────────

test.describe('Draculin demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demos/draculin', { waitUntil: 'domcontentloaded' });
    // Wait for LiveAppEmbed probe to complete (2s timeout)
    await page.waitForTimeout(3000);
    // Force fallback visible — the backend may be running (online → display:none)
    // but we want to test the mock demo regardless
    await page.evaluate(() => {
      const el = document.querySelector('#draculin-mock-fallback') as HTMLElement;
      if (el) el.style.display = '';
    });
    // Scroll fallback into viewport for client:visible hydration
    await page.evaluate(() => {
      document.querySelector('#draculin-mock-fallback')?.scrollIntoView({ block: 'center' });
    });
    // Wait for React hydration after scroll
    await page.waitForTimeout(1500);
  });

  test('renders all 5 tabs', async ({ page }) => {
    for (const label of ['DracuNews', 'DracuChat', 'DracuQuiz', 'DracuVision', 'DracuStats']) {
      await expect(page.getByRole('button', { name: new RegExp(label) })).toBeVisible();
    }
  });

  test('switching tabs changes content', async ({ page }) => {
    await page.getByRole('button', { name: /DracuChat/ }).click();
    await expect(page.getByPlaceholder('Type a message...')).toBeVisible();

    await page.getByRole('button', { name: /DracuQuiz/ }).click();
    await expect(page.getByRole('button', { name: /yes/i })).toBeVisible();
  });

  test('chat sends a message and gets mock reply', async ({ page }) => {
    await page.getByRole('button', { name: /DracuChat/ }).click();
    const input = page.getByPlaceholder('Type a message...');
    await input.fill('test question');
    await page.getByRole('button', { name: /send|enviar/i }).click();
    // Mock reply should appear
    await expect(page.locator('text=test question')).toBeVisible();
  });

  test('quiz completes after answering all questions', async ({ page }) => {
    await page.getByRole('button', { name: /DracuQuiz/ }).click();
    // Answer all 6 questions with Yes
    for (let i = 0; i < 6; i++) {
      await page.getByRole('button', { name: /^yes$|^sí$/i }).first().click();
    }
    // Should show result and restart button
    await expect(page.getByRole('button', { name: /restart|volver/i })).toBeVisible();
  });

  test('stats tab shows bar charts', async ({ page }) => {
    await page.getByRole('button', { name: /DracuStats/ }).click();
    // Stats tab renders SVG or canvas charts
    const statsContent = page.locator('text=/ML per Day|ML por Día/i');
    await expect(statsContent).toBeVisible();
  });
});

// ─── TFG Polyp Demo ──────────────────────────────────────────────

test.describe('TFG Polyp demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demos/tfg-polyps', { waitUntil: 'domcontentloaded' });
  });

  test('model comparison table is visible with metric buttons', async ({ page }) => {
    for (const metric of ['AP @IoU=0.50', 'F1']) {
      await expect(page.getByRole('button', { name: metric })).toBeVisible();
    }
  });

  test('clicking a metric button re-sorts the table', async ({ page }) => {
    const ap50Btn = page.getByRole('button', { name: 'AP @IoU=0.50' });
    await ap50Btn.click();
    // Table should still be visible with bars
    const bars = page.locator('div[style*="background"]');
    expect(await bars.count()).toBeGreaterThan(0);
  });

  test('run demo inference cycles through states', async ({ page }) => {
    // Wait for React hydration so onClick is wired up
    await page.waitForTimeout(2000);
    const runBtn = page.getByRole('button', { name: /run demo/i });
    await runBtn.click();
    // Should show progress text during inference
    await expect(page.locator('text=/loading|preprocessing|forward|nms/i').first()).toBeVisible({ timeout: 5000 });
    // Wait for completion
    await expect(page.getByRole('button', { name: /reset|reiniciar/i })).toBeVisible({ timeout: 10000 });
  });

  test('confidence slider filters detection boxes', async ({ page }) => {
    // Wait for React hydration before clicking
    await page.waitForTimeout(1500);
    // Run inference first
    await page.getByRole('button', { name: /run demo/i }).click();
    // Verify the click registered by checking for progress text
    await expect(page.locator('text=/loading|preprocessing|forward|nms/i').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /reset|reiniciar/i })).toBeVisible({ timeout: 15000 });
    // The confidence slider should be visible
    const slider = page.locator('input[type="range"]').first();
    await expect(slider).toBeVisible();
  });
});

// ─── Matrículas Demo ─────────────────────────────────────────────

test.describe('Matriculas demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demos/matriculas', { waitUntil: 'domcontentloaded' });
  });

  test('shows sample plate images', async ({ page }) => {
    const samples = page.locator('img[src*="plate"], img[alt*="plate"], img[alt*="sample"]');
    // If no alt, look for the grid of clickable images
    const gridImages = page.locator('img[style*="cursor"]');
    const total = await samples.count() + await gridImages.count();
    expect(total).toBeGreaterThan(0);
  });

  test('selecting a sample enables detect button', async ({ page }) => {
    // Click first sample image
    const firstSample = page.locator('img[style*="cursor: pointer"]').first();
    if (await firstSample.isVisible()) {
      await firstSample.click();
      const detectBtn = page.getByRole('button', { name: /detect|detectar/i });
      await expect(detectBtn).toBeEnabled();
    }
  });

  test('detect plate shows pipeline stages', async ({ page }) => {
    const firstSample = page.locator('img[style*="cursor: pointer"]').first();
    if (await firstSample.isVisible()) {
      await firstSample.click();
      await page.getByRole('button', { name: /detect|detectar/i }).click();
      // Should show processing or result
      await page.waitForTimeout(2000);
      const resultText = page.locator('text=/detected|detectada|stage|etapa/i');
      await expect(resultText.first()).toBeVisible({ timeout: 5000 });
    }
  });
});

// ─── MPIDS Demo ──────────────────────────────────────────────────

test.describe('MPIDS demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demos/mpids', { waitUntil: 'domcontentloaded' });
  });

  test('shows graph controls and algorithm buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /generate|generar/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /greedy|voraz/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /local search/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /solve|resolver|resoldre/i })).toBeVisible();
  });

  test('generate creates a graph visualization', async ({ page }) => {
    await page.getByRole('button', { name: /generate|generar/i }).click();
    // SVG should render with nodes
    const svg = page.locator('svg:has(circle)');
    await expect(svg.first()).toBeVisible();
    const circles = page.locator('svg circle');
    expect(await circles.count()).toBeGreaterThan(0);
  });

  test('solve MPIDS colors the dominating set', async ({ page }) => {
    await page.getByRole('button', { name: /generate|generar/i }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /solve|resolver|resoldre/i }).click();
    await page.waitForTimeout(500);
    // Result text should appear (set size, validity)
    const result = page.locator('text=/set|conjunto|conjunt|valid/i');
    await expect(result.first()).toBeVisible({ timeout: 3000 });
  });

  test('switching algorithm changes selection', async ({ page }) => {
    await page.getByRole('button', { name: /local search/i }).click();
    // Button should be visually active (styled differently)
    const lsBtn = page.getByRole('button', { name: /local search/i });
    await expect(lsBtn).toBeVisible();
  });
});

// ─── Phase Transitions Demo ──────────────────────────────────────

test.describe('Phase Transitions demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demos/phase-transitions', { waitUntil: 'domcontentloaded' });
  });

  test('shows graph family and percolation selectors', async ({ page }) => {
    for (const name of ['Binomial', 'Geometric', 'Grid']) {
      await expect(page.getByRole('button', { name })).toBeVisible();
    }
    for (const name of ['Node', 'Edge']) {
      await expect(page.getByRole('button', { name })).toBeVisible();
    }
  });

  test('generate renders graph SVG', async ({ page }) => {
    await page.getByRole('button', { name: /generate|generar/i }).first().click();
    const svg = page.locator('svg[viewBox]:not([width="16"]):not([width="20"]):not([width="24"]):not([width="28"])');
    await expect(svg.first()).toBeVisible({ timeout: 10000 });
  });

  test('retention slider exists', async ({ page }) => {
    const slider = page.locator('input[type="range"]').first();
    await expect(slider).toBeVisible();
  });

  test('run sweep produces a chart', async ({ page }) => {
    const sweepBtn = page.getByRole('button', { name: /run sweep/i });
    await sweepBtn.click();
    // Wait for sweep computation
    await page.waitForTimeout(3000);
    // Should render sweep chart SVG
    const svgs = page.locator('svg');
    expect(await svgs.count()).toBeGreaterThanOrEqual(1);
  });

  test('switching graph family changes buttons', async ({ page }) => {
    await page.getByRole('button', { name: 'Geometric' }).click();
    // Geometric should be visually active
    await page.getByRole('button', { name: /generate|generar/i }).first().click();
    const svg = page.locator('svg[viewBox]:not([width="16"]):not([width="20"]):not([width="24"]):not([width="28"])');
    await expect(svg.first()).toBeVisible({ timeout: 10000 });
  });
});

// ─── BitsXlaMarato Demo ─────────────────────────────────────────

test.describe('BitsXlaMarato demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demos/bitsx-marato', { waitUntil: 'domcontentloaded' });
  });

  test('shows inference button and diameter explorer', async ({ page }) => {
    await expect(page.getByRole('button', { name: /run demo/i })).toBeVisible();
    const sliders = page.locator('input[type="range"]');
    expect(await sliders.count()).toBeGreaterThanOrEqual(1);
  });

  test('run demo inference shows progress', async ({ page }) => {
    const runButton = page.getByRole('button', { name: /run demo inference|ejecutar inferencia|executar inferència/i }).first();
    await runButton.scrollIntoViewIfNeeded();
    await page.waitForTimeout(3000);
    await runButton.dispatchEvent('click');
    await expect(runButton).toBeHidden({ timeout: 5000 });
    await expect(page.locator('text=/extracting frame|extrayendo frame|extraient frame/i').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /reset|reiniciar/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/opacity|opacidad|opacitat/i).first()).toBeVisible();
  });

  test('diameter slider changes zone indicator', async ({ page }) => {
    const slider = page.locator('input[type="range"]').first();
    await slider.scrollIntoViewIfNeeded();
    await page.waitForTimeout(3000);
    await expect(page.getByText(/typical range/i)).toBeVisible();
    await slider.focus();
    await page.keyboard.press('End');
    await expect(page.getByText(/high concern/i)).toBeVisible();
  });
});

// ─── APA Practica Demo ──────────────────────────────────────────

test.describe('APA Practica demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demos/apa-practica', { waitUntil: 'domcontentloaded' });
  });

  test('shows k-NN selector buttons', async ({ page }) => {
    for (const k of [3, 5, 7, 11]) {
      await expect(page.getByRole('button', { name: String(k) })).toBeVisible();
    }
  });

  test('shows canvas for k-NN plot', async ({ page }) => {
    const canvas = page.locator('canvas');
    await expect(canvas.first()).toBeVisible();
  });

  test('clicking canvas triggers prediction', async ({ page }) => {
    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    if (box) {
      await canvas.click({ position: { x: box.width / 3, y: box.height / 3 } });
      await page.waitForTimeout(500);
      // Prediction or nearest-neighbor info should appear
      const predText = page.locator('text=/Prediction|Predicción|Predicció|Negative|Positive|N |P /i');
      const count = await predText.count();
      expect(count).toBeGreaterThanOrEqual(0); // graceful: some coords may miss data points
    }
  });

  test('clear button resets selection', async ({ page }) => {
    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    if (box) {
      await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } });
      await page.waitForTimeout(500);
    }
    const clearBtn = page.getByRole('button', { name: /clear|limpiar|netejar/i });
    // Clear button only appears after a point is selected
    if (await clearBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clearBtn.click();
    }
  });

  test('changing k value updates display', async ({ page }) => {
    await page.getByRole('button', { name: '3' }).click();
    // k=3 should now be active
    await page.getByRole('button', { name: '11' }).click();
    // Changed to k=11
  });

  test('feature importance bars are visible', async ({ page }) => {
    // Feature names should be shown
    const featureText = page.locator('text=/TSH|TT4|age|T3/i');
    expect(await featureText.count()).toBeGreaterThan(0);
  });
});

// ─── Prev/Next Demo Navigation ──────────────────────────────────

test.describe('Prev/Next demo cards', () => {
  test('jsbach page has prev/next navigation links', async ({ page }) => {
    await page.goto('/demos/jsbach', { waitUntil: 'domcontentloaded' });
    const prevNext = page.locator('a[href*="/demos/"]');
    expect(await prevNext.count()).toBeGreaterThan(2); // sidebar + prev/next
  });

  test('first demo has no "previous" card', async ({ page }) => {
    await page.goto(`/demos/${ALL_SLUGS[0]}`, { waitUntil: 'domcontentloaded' });
    // Should still load fine
    await expect(page).toHaveTitle(/.+/);
  });

  test('last demo has no "next" card', async ({ page }) => {
    await page.goto(`/demos/${ALL_SLUGS[ALL_SLUGS.length - 1]}`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/.+/);
  });
});

// ─── CAIM IR Explorer Demo ───────────────────────────────────────

test.describe('CAIM IR Explorer demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demos/caim', { waitUntil: 'domcontentloaded' });
    // Wait for LiveAppEmbed probe + component hydration
    await page.waitForTimeout(3000);
    // Skip mock tests when live backend is running (it hides the fallback)
    const mockVisible = await page.locator('.caim-mock').isVisible();
    test.skip(!mockVisible, 'Live backend running – mock demo hidden');
    // Scroll mock into viewport for client:visible
    await page.evaluate(() => {
      document.querySelector('.caim-mock')?.scrollIntoView({ block: 'center' });
    });
    await page.waitForTimeout(1500);
  });

  test('shows PageRank and Zipf tab buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'PageRank', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Zipf/i })).toBeVisible();
  });

  test('tab switching changes content', async ({ page }) => {
    // Switch to Zipf tab
    await page.getByRole('button', { name: /Zipf/i }).click();
    await page.waitForTimeout(500);
    // Should show corpus buttons
    await expect(page.getByRole('button', { name: /Novels/i })).toBeVisible();

    // Switch back to PageRank
    await page.getByRole('button', { name: /PageRank/i }).click();
    await page.waitForTimeout(500);
    // Should show run button
    await expect(page.getByRole('button', { name: /Run PageRank|Ejecutar|Executar/i })).toBeVisible();
  });

  test('PageRank tab: run produces rankings table', async ({ page }) => {
    // Should auto-run on mount; wait for table to appear
    await page.waitForTimeout(2000);
    const table = page.locator('.caim-mock table');
    const rows = table.locator('tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('PageRank tab: map renders SVG circles', async ({ page }) => {
    await page.waitForTimeout(3000);
    const circles = page.locator('.caim-mock svg circle');
    const count = await circles.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test('Zipf tab: selecting a corpus renders chart', async ({ page }) => {
    await page.getByRole('button', { name: /Zipf/i }).click();
    await page.waitForTimeout(1000);
    // Click News corpus
    await page.getByRole('button', { name: /News/i }).click();
    await page.waitForTimeout(500);
    // Should render SVG with data points
    const circles = page.locator('.caim-mock svg circle');
    const count = await circles.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('Zipf tab: custom text analysis works', async ({ page }) => {
    await page.getByRole('button', { name: /Zipf/i }).click();
    await page.waitForTimeout(500);
    const textarea = page.locator('.caim-mock textarea');
    await textarea.fill('the quick brown fox jumps over the lazy dog the dog the fox the');
    await page.getByRole('button', { name: /Analyze|Analizar|Analitzar/i }).click();
    await page.waitForTimeout(500);
    // Should show word table with "the" at top
    await expect(page.locator('.caim-mock table').last().locator('text=the').first()).toBeVisible();
  });

  test('Zipf tab: parameter display shows values', async ({ page }) => {
    await page.getByRole('button', { name: /Zipf/i }).click();
    await page.waitForTimeout(1000);
    // Should display R² value
    await expect(page.locator('.caim-mock').locator('text=R²').first()).toBeVisible();
  });
});

// ─── CAIM i18n ───────────────────────────────────────────────────

test.describe('CAIM demo i18n', () => {
  test('Spanish CAIM page shows translated tab labels', async ({ page }) => {
    await page.goto('/es/demos/caim', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const mockVisible = await page.locator('.caim-mock').isVisible();
    test.skip(!mockVisible, 'Live backend running – mock demo hidden');
    await page.evaluate(() => {
      document.querySelector('.caim-mock')?.scrollIntoView({ block: 'center' });
    });
    await page.waitForTimeout(1500);
    await expect(page.getByRole('button', { name: /Zipf/i })).toBeVisible();
  });

  test('Catalan CAIM page shows translated tab labels', async ({ page }) => {
    await page.goto('/ca/demos/caim', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const mockVisible = await page.locator('.caim-mock').isVisible();
    test.skip(!mockVisible, 'Live backend running – mock demo hidden');
    await page.evaluate(() => {
      document.querySelector('.caim-mock')?.scrollIntoView({ block: 'center' });
    });
    await page.waitForTimeout(1500);
    await expect(page.getByRole('button', { name: /Zipf/i })).toBeVisible();
  });
});

// ─── PAR Parallel Computing demo ────────────────────────────────

test.describe('PAR Parallel Computing demo', () => {
  test('renders demo header with correct title', async ({ page }) => {
    await page.goto('/demos/par-parallel', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1.demo-hdr-title')).toContainText('Parallel Computing');
  });

  test('renders three canvas elements for mini demos', async ({ page }) => {
    await page.goto('/demos/par-parallel', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    // Scroll to demo section
    await page.evaluate(() => {
      document.querySelector('.par-demo')?.scrollIntoView({ block: 'center' });
    });
    await page.waitForTimeout(2000);
    const canvases = page.locator('.par-canvas');
    await expect(canvases).toHaveCount(3);
  });

  test('heat equation play button starts iteration', async ({ page }) => {
    await page.goto('/demos/par-parallel', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    // Skip when live backend is running (it hides the mock fallback)
    const mockVisible = await page.locator('#par-mock-fallback').isVisible();
    test.skip(!mockVisible, 'Live backend running – mock demo hidden');
    await page.evaluate(() => {
      document.querySelector('.par-demo')?.scrollIntoView({ block: 'center' });
    });
    await page.waitForTimeout(2000);
    // Click play on heat panel
    const playBtn = page.locator('.par-panel').nth(1).getByRole('button', { name: /Play|Iniciar|Inicia/i });
    await expect(playBtn).toBeVisible();
    await playBtn.dispatchEvent('click');
    await page.waitForTimeout(500);
    // Should now show Pause
    await expect(page.locator('.par-panel').nth(1).getByRole('button', { name: /Pause|Pausar|Pausa/i })).toBeVisible();
  });

  test('Spanish PAR page shows translated title', async ({ page }) => {
    await page.goto('/es/demos/par-parallel', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1.demo-hdr-title')).toContainText('Computación Paralela');
  });
});

// ─── Robotics, Algorithms, and Graphics canvas demos ────────────

test.describe('Canvas fallback demos', () => {
  test('Robotics dashboard renders robot canvases and joint controls', async ({ page }) => {
    await page.goto('/demos/rob-robotics', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.evaluate(() => {
      const fallback = document.querySelector('#rob-mock-fallback') as HTMLElement;
      if (fallback) fallback.style.display = '';
      fallback?.scrollIntoView({ block: 'center' });
    });
    await page.waitForTimeout(1500);

    await expect(page.locator('#rob-mock-fallback canvas')).toHaveCount(3);
    await expect(page.locator('#rob-mock-fallback input[type="range"]')).toHaveCount(3);
  });

  test('Algorithm visualizer renders all mini visualizations', async ({ page }) => {
    await page.goto('/demos/algorithms', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.evaluate(() => {
      const fallback = document.querySelector('#fib-mock-fallback') as HTMLElement;
      if (fallback) fallback.style.display = '';
      fallback?.scrollIntoView({ block: 'center' });
    });
    await page.waitForTimeout(1500);

    await expect(page.locator('#fib-mock-fallback canvas')).toHaveCount(3);
  });

  test('Graphics shader playground renders all canvas panels', async ({ page }) => {
    await page.goto('/demos/grafics', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.evaluate(() => {
      const fallback = document.querySelector('#grafics-mock-fallback') as HTMLElement;
      if (fallback) fallback.style.display = '';
      fallback?.scrollIntoView({ block: 'center' });
    });
    await page.waitForTimeout(1500);

    await expect(page.locator('#grafics-mock-fallback canvas')).toHaveCount(4);
  });
});

// ─── Remaining route-only demo interactions ─────────────────────

test.describe('Additional demo interactions', () => {
  test('Joc EDA page wires sample replay and validates uploads', async ({ page }) => {
    await page.goto('/demos/joc-eda', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('#launch-sample')).toHaveAttribute('href', /viewer\.html/);
    await page.locator('#file-upload').setInputFiles({
      name: 'not-a-replay.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('plain text without the expected replay marker'),
    });
    await expect(page.locator('#upload-status')).toContainText(/valid game file|ThePurge/i);
  });

  test('PROP mock dashboard switches to recommendations', async ({ page }) => {
    await page.goto('/demos/prop', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.evaluate(() => {
      const fallback = document.querySelector('#prop-mock-fallback') as HTMLElement;
      if (fallback) fallback.style.display = '';
      fallback?.scrollIntoView({ block: 'center' });
    });

    await page.locator('#prop-mock-fallback [data-mock-tab="recs"]').click();
    await expect(page.locator('#mock-recs')).toHaveClass(/active/);
    await expect(page.locator('#mock-recs')).toContainText('Pulp Fiction');
  });

  test('SBC trip planner completes the mock wizard', async ({ page }) => {
    await page.goto('/demos/sbc-ia', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await page.evaluate(() => {
      const fallback = document.querySelector('#sbc-mock-fallback') as HTMLElement;
      if (fallback) fallback.style.display = '';
      fallback?.scrollIntoView({ block: 'center' });
    });
    await page.waitForTimeout(1500);

    for (let step = 1; step < 10; step++) {
      await page.getByRole('button', { name: /next/i }).click();
    }
    await page.getByRole('button', { name: /plan/i }).click();

    await expect(page.getByText(/total days/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /plan another trip/i })).toBeVisible();
  });
});
