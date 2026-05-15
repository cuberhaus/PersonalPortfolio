/**
 * Accessibility audits using axe-core. Runs against every browser-only
 * demo route plus the localized homepage shells, cycling through every
 * theme registered in `src/lib/themes.ts` (visible + hidden).
 *
 * Asserts zero serious or critical violations. Moderate/minor are
 * surfaced via console for triage.
 *
 * Run: npx playwright test --project=a11y
 */

import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { THEMES } from '../src/lib/themes';

const HOME_ROUTES = ['/', '/es/', '/ca/'];

const DEMO_SLUGS = [
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

const STANDARD_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const BLOCKING_IMPACTS = new Set(['serious', 'critical']);

const ALL_THEME_IDS = THEMES.map((t) => t.id);

async function setThemeBeforeLoad(page: Page, theme: string, route: string) {
  // Land on a same-origin page so localStorage is writable, set the theme,
  // then navigate to the target route. ThemeInit reads localStorage on every
  // page load.
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((t) => {
    localStorage.setItem('theme', t);
  }, theme);
  await page.goto(route, { waitUntil: 'domcontentloaded' });
}

async function runAxe(page: Page, route: string, theme: string) {
  await setThemeBeforeLoad(page, theme, route);
  // AxeBuilder's `Page` type comes from a slightly older playwright-core version
  // pinned by @axe-core/playwright; a structural cast keeps both happy.
  const results = await new AxeBuilder({ page: page as never }).withTags(STANDARD_TAGS).analyze();

  const blocking = results.violations.filter((v) => BLOCKING_IMPACTS.has(v.impact ?? ''));
  if (results.violations.length > 0) {
    const summary = results.violations.map((v) => `${v.impact}: ${v.id} (${v.nodes.length} nodes)`);
    console.info(`[a11y] ${theme} ${route} — violations:\n  ${summary.join('\n  ')}`);
  }
  return blocking;
}

// Card-ish selectors on the homepage that flip background/colors on hover.
// Past contrast bugs (yellow-card + faint-text bullets, dark-pills-on-yellow)
// only manifest in the hover state, so we trigger hover before scanning.
const HOVER_TARGETS = [
  '.work-card',
  '.demo-card',
  '.timeline-content',
  '.education-card',
  '.certification-card',
  '.skill-group',
];

async function runAxeOnHover(page: Page, theme: string, selector: string) {
  await setThemeBeforeLoad(page, theme, '/');
  const target = page.locator(selector).first();
  if ((await target.count()) === 0) {
    return { skipped: true as const, blocking: [] };
  }
  await target.scrollIntoViewIfNeeded();
  await target.hover();
  // Brief settle for hover transitions; axe reads computed styles, so we want
  // them to be the post-transition values.
  await page.waitForTimeout(150);

  // Scope the scan to the hovered element + its descendants so a violation
  // elsewhere on the page isn't double-counted across selectors.
  const results = await new AxeBuilder({ page: page as never })
    .include(selector)
    .withTags(STANDARD_TAGS)
    .analyze();

  const blocking = results.violations.filter((v) => BLOCKING_IMPACTS.has(v.impact ?? ''));
  if (results.violations.length > 0) {
    const summary = results.violations.map((v) => `${v.impact}: ${v.id} (${v.nodes.length} nodes)`);
    console.info(`[a11y:hover] ${theme} ${selector} — violations:\n  ${summary.join('\n  ')}`);
  }
  return { skipped: false as const, blocking };
}

for (const theme of ALL_THEME_IDS) {
  test.describe(`a11y [${theme}] — homepage shells`, () => {
    for (const route of HOME_ROUTES) {
      test(`${route} has no serious/critical axe violations`, async ({ page }) => {
        const blocking = await runAxe(page, route, theme);
        expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
      });
    }
  });

  test.describe(`a11y [${theme}] — demo routes`, () => {
    for (const slug of DEMO_SLUGS) {
      test(`/demos/${slug} has no serious/critical axe violations`, async ({ page }) => {
        const blocking = await runAxe(page, `/demos/${slug}`, theme);
        expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
      });
    }
  });

  test.describe(`a11y [${theme}] — hover states`, () => {
    for (const selector of HOVER_TARGETS) {
      test(`hovering ${selector} on / has no serious/critical violations`, async ({ page }) => {
        const result = await runAxeOnHover(page, theme, selector);
        if (result.skipped) {
          test.skip(true, `${selector} not present on /`);
        }
        expect(result.blocking, JSON.stringify(result.blocking, null, 2)).toEqual([]);
      });
    }
  });
}
