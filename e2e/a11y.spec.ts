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

// Selectors that often render text over a gradient background. axe-core's
// color-contrast check returns `incomplete` (not `violation`) when the
// background is a gradient because it can't sample one definitive color, so
// real low-contrast text on gradients slips through. We compute the contrast
// ourselves for these targets and assert >= 4.5:1 (WCAG AA for normal text).
const GRADIENT_TEXT_SELECTORS = [
  // SPMatriculas demo — pastel-gradient buttons that historically went
  // near-white-on-near-white.
  'button',
  'a.btn',
  '.btn-primary',
];

async function checkGradientTextContrast(page: Page, route: string, theme: string) {
  await setThemeBeforeLoad(page, theme, route);
  // `networkidle` never settles under Astro dev because the HMR WebSocket
  // stays open. `setThemeBeforeLoad` already navigates with
  // `waitUntil: 'domcontentloaded'`; that's enough — the page is interactive
  // and CSS is applied. A short settle gives gradients/transitions time to
  // be reflected in computed styles.
  await page.waitForTimeout(150);

  const findings = await page.evaluate(
    ({ selectors }) => {
      // sRGB → relative luminance per WCAG.
      const lum = (rgb: [number, number, number]) => {
        const f = (c: number) => {
          const v = c / 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
      };
      const ratio = (a: [number, number, number], b: [number, number, number]) => {
        const la = lum(a),
          lb = lum(b);
        return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
      };
      const parseRgb = (s: string): [number, number, number] | null => {
        const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        return m ? [+m[1], +m[2], +m[3]] : null;
      };
      // Sample 5 colors from a gradient: extract `rgb()` triplets in
      // declaration order and average them. Cheap heuristic but catches the
      // pastel-on-pastel case.
      const sampleGradient = (bg: string): [number, number, number] | null => {
        const triplets = [...bg.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)/g)].map(
          (m) => [+m[1], +m[2], +m[3]] as [number, number, number]
        );
        if (triplets.length === 0) return null;
        const avg: [number, number, number] = [0, 0, 0];
        for (const t of triplets) {
          avg[0] += t[0];
          avg[1] += t[1];
          avg[2] += t[2];
        }
        return [avg[0] / triplets.length, avg[1] / triplets.length, avg[2] / triplets.length];
      };

      const results: Array<{ tag: string; text: string; ratio: number; bg: string; fg: string }> =
        [];

      for (const sel of selectors) {
        const els = document.querySelectorAll(sel) as NodeListOf<HTMLElement>;
        for (const el of els) {
          const cs = getComputedStyle(el);
          const bg =
            cs.backgroundImage && cs.backgroundImage !== 'none'
              ? cs.backgroundImage
              : cs.backgroundColor;
          if (!bg.includes('gradient')) continue;
          const fg = parseRgb(cs.color);
          const bgRgb = sampleGradient(bg);
          if (!fg || !bgRgb) continue;
          const r = ratio(fg, bgRgb);
          if (r < 4.5) {
            results.push({
              tag: el.tagName,
              text: (el.textContent ?? '').trim().slice(0, 60),
              ratio: Math.round(r * 100) / 100,
              bg,
              fg: cs.color,
            });
          }
        }
      }
      return results;
    },
    { selectors: GRADIENT_TEXT_SELECTORS }
  );

  if (findings.length > 0) {
    console.info(
      `[a11y:gradient-contrast] ${theme} ${route} — findings:\n  ${findings
        .map((f) => `${f.tag} "${f.text}" ratio=${f.ratio} fg=${f.fg}`)
        .join('\n  ')}`
    );
  }
  return findings;
}

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

  test.describe(`a11y [${theme}] — gradient text contrast`, () => {
    // Demo routes that use gradient buttons / cards heavily. Add more if more
    // demos start using gradient backgrounds for interactive controls.
    const routes = ['/demos/matriculas', '/demos/tfg-polyps', '/'];
    for (const route of routes) {
      test(`${route} text-on-gradient meets WCAG AA (4.5:1)`, async ({ page }) => {
        const findings = await checkGradientTextContrast(page, route, theme);
        expect(findings, JSON.stringify(findings, null, 2)).toEqual([]);
      });
    }
  });
}
