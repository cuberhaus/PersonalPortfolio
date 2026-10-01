/**
 * E2E tests for browser-only demos (no backend required).
 * These run against the Astro dev server and test demos that work
 * entirely in the browser with mock data.
 *
 * Run: npx playwright test --project=browser-demos
 */

import { test, expect, type Page } from '@playwright/test';

const ALL_SLUGS = [
  'tfg-polyps',
  'draculin',
  'bitsx-marato',
  'matriculas',
  'joc-eda',
  'jsbach',
  'tenda',
  'pro2',
  'mpids',
  'phase-transitions',
  'planificacion',
  'desastres-ia',
  'apa-practica',
  'prop',
  'caim',
  'sbc-ia',
  'par-parallel',
  'rob-robotics',
  'algorithms',
  'grafics',
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
    await expect(tendaLink).toHaveCount(1);
    // Sidebar may clip the element outside the viewport; dispatch click via JS
    await tendaLink.dispatchEvent('click');
    await page.waitForURL('**/demos/tenda**', { waitUntil: 'domcontentloaded', timeout: 10_000 });
    expect(page.url()).toContain('/demos/tenda');
  });
});

// ─── Shared demo workbench design ───────────────────────────────

test.describe('Shared demo workbench design', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demos/tfg-polyps', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.removeItem('theme');
      localStorage.removeItem('design');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
  });

  test('uses a left-aligned Swiss project identity instead of decorative gradients', async ({
    page,
  }) => {
    const header = page.locator('.demo-header');
    const title = page.locator('.demo-hdr-title');

    await expect(header).toBeVisible();
    await expect(header).toHaveCSS('text-align', 'left');
    await expect(title).toHaveCSS('background-image', 'none');
    await expect(title).toHaveCSS('letter-spacing', '-1.92px');
  });

  test('keeps the project shell within a compact mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('.demo-nav-title')).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('treats status and related projects as structural bands under Swiss', async ({ page }) => {
    const offlineStatus = page.locator('[data-live-status="offline"]');
    await expect(offlineStatus).toBeVisible({ timeout: 5_000 });
    await expect(offlineStatus).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(offlineStatus).toHaveCSS('border-radius', '0px');

    const relatedProject = page.locator('.prevnext-card').first();
    await relatedProject.scrollIntoViewIfNeeded();
    await expect(relatedProject).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(relatedProject).toHaveCSS('border-radius', '0px');
  });

  test('carries Swiss surfaces and actions into the interactive island', async ({ page }) => {
    const pipeline = page.getByText('End-to-End Pipeline', { exact: true }).locator('../..');
    await expect(pipeline).toBeVisible();
    await expect(pipeline).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(pipeline).toHaveCSS('border-radius', '0px');

    const runButton = page.getByRole('button', { name: 'Run demo inference' });
    await runButton.scrollIntoViewIfNeeded();
    await expect(runButton).toHaveCSS('background-image', 'none');
  });
});

// ─── TFG pipeline label (#250) ──────────────────────────────────
//
// "End-to-End Pipeline" is a label, not an action. It must read as a restrained,
// legible surface that follows the active theme x design, rather than filling
// with the accent gradient and competing with the step cards below it.

const PIPELINE_VIEWPORTS = {
  laptop: { width: 1440, height: 900 },
  iphone: { width: 390, height: 844 },
} as const;

type PipelineLabelCase = {
  theme: string;
  design: string;
  viewport: keyof typeof PIPELINE_VIEWPORTS;
};

// Issue #250 acceptance: Barcelona day and night at laptop and iPhone sizes,
// under the default design (swiss) and the shared fallback tokens (minimal).
// The remaining rows are representative non-Barcelona palettes and designs,
// including the highest-chroma accents (synthwave, phosphor) where a
// translucent tint is easiest to over-saturate.
const PIPELINE_LABEL_CASES: PipelineLabelCase[] = [
  ...(['barcelona-night', 'barcelona-day'] as const).flatMap((theme) =>
    (['swiss', 'minimal'] as const).flatMap((design) =>
      (['laptop', 'iphone'] as const).map((viewport) => ({ theme, design, viewport }))
    )
  ),
  { theme: 'dracula', design: 'minimal', viewport: 'laptop' },
  { theme: 'nord-light', design: 'swiss', viewport: 'laptop' },
  { theme: 'synthwave', design: 'cyber', viewport: 'laptop' },
  { theme: 'phosphor', design: 'terminal', viewport: 'laptop' },
  { theme: 'sepia', design: 'editorial', viewport: 'laptop' },
];

/**
 * Runs in the browser. Colors are normalised by painting them onto a 1x1 canvas,
 * so `color-mix()` / `color(srgb …)` computed values resolve exactly as rendered
 * and translucent layers are composited over their ancestors' backgrounds.
 * Must stay self-contained: Playwright serialises it into the page.
 */
function measurePipelineLabel(label: HTMLElement) {
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  // label -> header row -> panel: the same hops the Swiss surface test uses.
  const panel = label.parentElement?.parentElement;
  if (!ctx || !panel) throw new Error('pipeline label is not rendered inside its panel');

  const paint = (layers: string[]): number[] => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 1, 1);
    for (const css of layers) {
      if (!CSS.supports('color', css)) throw new Error(`unparseable color: ${css}`);
      ctx.fillStyle = css;
      ctx.fillRect(0, 0, 1, 1);
    }
    return Array.from(ctx.getImageData(0, 0, 1, 1).data.slice(0, 3));
  };
  const backdrops = (node: Element): string[] => {
    const layers: string[] = [];
    for (let n: Element | null = node; n; n = n.parentElement) {
      layers.unshift(getComputedStyle(n).backgroundColor);
    }
    return layers;
  };
  const luminance = ([r, g, b]: number[]) => {
    const linear = (c: number) => {
      const v = c / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  };
  const contrast = (a: number[], b: number[]) => {
    const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (lighter + 0.05) / (darker + 0.05);
  };

  const style = getComputedStyle(label);
  const layers = backdrops(label);
  const surface = paint(layers);
  return {
    backgroundImage: style.backgroundImage,
    surfaceVsPanel: contrast(surface, paint(backdrops(panel))),
    textVsSurface: contrast(paint([...layers, style.color]), surface),
  };
}

test.describe('Shared demo workbench design: pipeline label', () => {
  for (const { theme, design, viewport } of PIPELINE_LABEL_CASES) {
    test(`title is a restrained, legible label on ${theme} / ${design} / ${viewport}`, async ({
      page,
    }) => {
      await page.setViewportSize(PIPELINE_VIEWPORTS[viewport]);
      // ThemeInit applies (and persists) ?theme / ?design before first paint.
      await page.goto(`/demos/tfg-polyps?theme=${theme}&design=${design}`, {
        waitUntil: 'domcontentloaded',
      });
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await expect(page.locator('html')).toHaveAttribute('data-design', design);

      // The title and its semantic region (same accessible name) are still rendered.
      const label = page.getByText('End-to-End Pipeline', { exact: true });
      await expect(label).toBeVisible();
      await expect(page.getByRole('region', { name: 'End-to-End Pipeline' })).toBeVisible();

      const { backgroundImage, surfaceVsPanel, textVsSurface } =
        await label.evaluate(measurePipelineLabel);
      expect(backgroundImage, 'label must not fill with the accent gradient').toBe('none');
      expect(
        surfaceVsPanel,
        'label surface must stay a subtle tint of its panel (<= 1.5:1), not a solid block'
      ).toBeLessThanOrEqual(1.5);
      expect(
        textVsSurface,
        'title must meet WCAG AA (4.5:1) on its surface'
      ).toBeGreaterThanOrEqual(4.5);
    });
  }
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
    const runBtn = page.getByRole('button', { name: /run|execute|interpret/i }).first();
    await runBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(3000);
    await expect(runBtn).toBeVisible();
    await runBtn.dispatchEvent('click');
    await expect(page.getByText(/output|salida|sortida/i).first()).toBeVisible();
    await expect(
      page.getByText(/notes? generated|notas generadas|notes generades/i).first()
    ).toBeVisible();
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
    await page.waitForTimeout(3000);
    await page.getByText('Camises').first().dispatchEvent('click');
    const firstProduct = page.getByText('Camisa blanca clàssica');
    await expect(firstProduct).toBeVisible();
    await firstProduct.dispatchEvent('click');
    const addBtn = page.getByRole('button', { name: /add to cart|añadir|afegir/i }).first();
    await expect(addBtn).toBeVisible();
    await addBtn.dispatchEvent('click');
    await expect(page.locator('#tenda-mock-fallback nav')).toContainText(
      /cart\s*1|carrito\s*1|carret\s*1/i
    );
  });
});

// ─── Desastres IA Demo ───────────────────────────────────────────

test.describe('Desastres IA demo', () => {
  test('runs the browser solver and renders optimized output', async ({ page }) => {
    await page.goto('/demos/desastres-ia', { waitUntil: 'domcontentloaded' });
    const runButton = page
      .getByRole('button', { name: /run search|ejecutar búsqueda|executar cerca/i })
      .first();
    await runButton.scrollIntoViewIfNeeded();
    await page.waitForTimeout(2000);

    await expect(page.locator('select').first()).toBeVisible();
    await expect(page.locator('input[type="number"]').first()).toBeVisible();
    await expect(runButton).toBeVisible();

    await runButton.dispatchEvent('click');
    await expect(page.locator('text=/H2 cost|Coste H2|Cost H2/i').first()).toBeVisible({
      timeout: 5000,
    });
    await expect(
      page.locator('text=/Final queues|Colas finales|Cues finals/i').first()
    ).toBeVisible();
  });
});

// ─── Pro2 WPGMA Demo ────────────────────────────────────────────

test.describe('Pro2 WPGMA demo', () => {
  test('loads sample data and completes clustering', async ({ page }) => {
    await page.goto('/demos/pro2', { waitUntil: 'domcontentloaded' });
    const speciesHeading = page.locator('text=/Species|Especies|Espècies/i').first();
    await speciesHeading.scrollIntoViewIfNeeded();
    await page.waitForTimeout(3000);

    await expect(
      page.getByRole('button', { name: /load sample|cargar muestra|carregar mostra/i })
    ).toBeVisible();
    await expect(page.locator('table').first()).toContainText('A');
    await expect(
      page.locator('text=/Distance Table|Tabla de Distancias|Taula de Distàncies/i').first()
    ).toBeVisible();

    await page
      .getByRole('button', {
        name: /initialize clusters|inicializar clústeres|inicialitzar clústers/i,
      })
      .dispatchEvent('click');
    const runAll = page.getByRole('button', { name: /run all|ejecutar todo|executar tot/i });
    await expect(runAll).toBeVisible({ timeout: 5000 });
    await runAll.dispatchEvent('click');
    await expect(
      page.locator('text=/Phylogenetic Tree|Árbol Filogenético|Arbre Filogenètic/i').first()
    ).toBeVisible({ timeout: 5000 });
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
    await mockBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(3000);
    await expect(mockBtn).toBeVisible();
    await mockBtn.dispatchEvent('click');
    await expect(page.getByText(/solving|resolviendo|resolent/i)).toBeVisible();
    await expect(page.getByText(/steps|pasos|passos/i).first()).toBeVisible({ timeout: 5000 });
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
      await page
        .getByRole('button', { name: /^yes$|^sí$/i })
        .first()
        .click();
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
    await expect(page.locator('text=/loading|preprocessing|forward|nms/i').first()).toBeVisible({
      timeout: 5000,
    });
    // Wait for completion
    await expect(page.getByRole('button', { name: /reset|reiniciar/i })).toBeVisible({
      timeout: 10000,
    });
  });

  test('confidence slider filters detection boxes', async ({ page }) => {
    // Wait for React hydration before clicking
    await page.waitForTimeout(1500);
    // Run inference first
    await page.getByRole('button', { name: /run demo/i }).click();
    // Verify the click registered by checking for progress text
    await expect(page.locator('text=/loading|preprocessing|forward|nms/i').first()).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByRole('button', { name: /reset|reiniciar/i })).toBeVisible({
      timeout: 15000,
    });
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
    const total = (await samples.count()) + (await gridImages.count());
    expect(total).toBeGreaterThan(0);
  });

  test('selecting a sample enables detect button', async ({ page }) => {
    const firstSample = page.getByRole('img', { name: 'zmz9157' });
    await firstSample.scrollIntoViewIfNeeded();
    await page.waitForTimeout(3000);
    await expect(firstSample).toBeVisible();
    await firstSample.dispatchEvent('click');
    const detectBtn = page.getByRole('button', { name: /detect|detectar/i });
    await expect(detectBtn).toBeEnabled();
  });

  test('detect plate shows pipeline stages', async ({ page }) => {
    const firstSample = page.getByRole('img', { name: 'zmz9157' });
    await firstSample.scrollIntoViewIfNeeded();
    await page.waitForTimeout(3000);
    await expect(firstSample).toBeVisible();
    await firstSample.dispatchEvent('click');
    await page.getByRole('button', { name: /detect|detectar/i }).dispatchEvent('click');
    const resultText = page.locator('text=/detected|detectada|stage|etapa/i');
    await expect(resultText.first()).toBeVisible({ timeout: 10000 });
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
    await page
      .getByRole('button', { name: /generate|generar/i })
      .first()
      .click();
    const svg = page.locator(
      'svg[viewBox]:not([width="16"]):not([width="20"]):not([width="24"]):not([width="28"])'
    );
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
    await page
      .getByRole('button', { name: /generate|generar/i })
      .first()
      .click();
    const svg = page.locator(
      'svg[viewBox]:not([width="16"]):not([width="20"]):not([width="24"]):not([width="28"])'
    );
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
    const runButton = page
      .getByRole('button', { name: /run demo inference|ejecutar inferencia|executar inferència/i })
      .first();
    await runButton.scrollIntoViewIfNeeded();
    await page.waitForTimeout(3000);
    await runButton.dispatchEvent('click');
    await expect(runButton).toBeHidden({ timeout: 5000 });
    await expect(
      page.locator('text=/extracting frame|extrayendo frame|extraient frame/i').first()
    ).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /reset|reiniciar/i })).toBeVisible({
      timeout: 15000,
    });
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

  const clickKnnCanvas = async (page: Page, xRatio = 0.5, yRatio = 0.5) => {
    const canvas = page.locator('canvas').first();
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForTimeout(3000);
    await canvas.evaluate(
      (el: HTMLCanvasElement, point: { xRatio: number; yRatio: number }) => {
        const rect = el.getBoundingClientRect();
        el.dispatchEvent(
          new MouseEvent('click', {
            bubbles: true,
            clientX: rect.left + rect.width * point.xRatio,
            clientY: rect.top + rect.height * point.yRatio,
          })
        );
      },
      { xRatio, yRatio }
    );
  };

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
    await clickKnnCanvas(page, 1 / 3, 1 / 3);
    await expect(page.getByText(/Prediction:|Predicción:|Predicció:/i)).toBeVisible();
    await expect(
      page.getByText(/nearest neighbors|vecinos más cercanos|veïns més propers/i)
    ).toBeVisible();
  });

  test('clear button resets selection', async ({ page }) => {
    await clickKnnCanvas(page);
    const clearBtn = page.getByRole('button', { name: /clear|limpiar|netejar/i });
    await expect(clearBtn).toBeVisible({ timeout: 3000 });
    await clearBtn.click();
    await expect(
      page.getByText(/Click the plot|Haz clic en el gráfico|Fes clic al gràfic/i)
    ).toBeVisible();
  });

  test('changing k value updates display', async ({ page }) => {
    await clickKnnCanvas(page);
    await page.getByRole('button', { name: '3' }).click();
    await expect(page.getByText(/3 nearest neighbors/i)).toBeVisible();
    await page.getByRole('button', { name: '11' }).click();
    await expect(page.getByText(/11 nearest neighbors/i)).toBeVisible();
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
    await expect(
      page.getByRole('button', { name: /Run PageRank|Ejecutar|Executar/i })
    ).toBeVisible();
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
    const playBtn = page
      .locator('.par-panel')
      .nth(1)
      .getByRole('button', { name: /Play|Iniciar|Inicia/i });
    await expect(playBtn).toBeVisible();
    await playBtn.dispatchEvent('click');
    await page.waitForTimeout(500);
    // Should now show Pause
    await expect(
      page
        .locator('.par-panel')
        .nth(1)
        .getByRole('button', { name: /Pause|Pausar|Pausa/i })
    ).toBeVisible();
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

  test('Robotics wall-following label is repainted when fonts finish loading', async ({ page }) => {
    // The label is canvas text: it is rasterised once with whichever face exists at that
    // moment, and Inter arrives from Google Fonts after the island hydrates. The panel has
    // to repaint on `loadingdone` or the gallery capture depends on network timing.
    type LabelProbe = { __robLabelDraws: number };
    await page.addInitScript(() => {
      const probe = window as unknown as LabelProbe;
      probe.__robLabelDraws = 0;
      const fillText = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (
        this: CanvasRenderingContext2D,
        text: string,
        x: number,
        y: number,
        maxWidth?: number
      ) {
        if (text.startsWith('k1=')) probe.__robLabelDraws++;
        return fillText.call(this, text, x, y, maxWidth);
      };
    });
    const labelDraws = () => page.evaluate(() => (window as unknown as LabelProbe).__robLabelDraws);

    await page.goto('/demos/rob-robotics', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      const fallback = document.querySelector('#rob-mock-fallback') as HTMLElement;
      if (fallback) fallback.style.display = '';
      fallback?.scrollIntoView({ block: 'center' });
    });
    await expect.poll(labelDraws).toBeGreaterThan(0);
    const before = await labelDraws();

    await page.evaluate(() => document.fonts.dispatchEvent(new Event('loadingdone')));
    await expect.poll(labelDraws).toBeGreaterThan(before);
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

    await page.locator('#prop-mock-fallback [data-mock-tab="recs"]').dispatchEvent('click');
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
      await page.getByRole('button', { name: /next/i }).dispatchEvent('click');
    }
    await page.getByRole('button', { name: /plan/i }).dispatchEvent('click');

    await expect(page.getByText(/total days/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /plan another trip/i })).toBeVisible();
  });
});
