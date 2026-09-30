/**
 * Consent-first Google Analytics (issue #13), tested in a real browser
 * against a copy of the site built with a fake GA4 measurement ID (see
 * analytics-consent-site.ts). Every request to a Google analytics host is
 * intercepted and recorded, so the suite proves what the browser actually
 * tried to load without ever contacting Google.
 *
 * Run: npx playwright test --project=analytics-consent
 * Iterate faster once a build exists: PLAYWRIGHT_REUSE_CONSENT_BUILD=1 ...
 */
import { test as base, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { THEMES } from '../src/lib/themes';
import {
  CONSENT_TEST_MEASUREMENT_ID as ID,
  DEFAULT_SITE_URL,
  startConsentSite,
} from './analytics-consent-site';

const STORAGE_KEY = 'analytics-consent';
const GOOGLE_ANALYTICS_HOST =
  /(^|\.)(googletagmanager\.com|google-analytics\.com|analytics\.google\.com|googleadservices\.com|doubleclick\.net)$/;
/** Stands in for gtag.js and counts how many times the browser executed it. */
const STUB_TAG_SCRIPT = 'window.__gtagScriptLoads = (window.__gtagScriptLoads || 0) + 1;';

type Lang = 'en' | 'es' | 'ca';
interface ConsentCopy {
  accept: string;
  close: string;
  description: string;
  reject: string;
  savedDenied: string;
  savedGranted: string;
  settings: string;
  statusDenied: string;
  statusGranted: string;
  title: string;
}

const localesDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'locales');
const copy = (lang: Lang): ConsentCopy =>
  JSON.parse(readFileSync(resolve(localesDir, lang, 'ui.json'), 'utf8')).analytics;
const en = copy('en');
// src/lib/designs.ts needs Vite's import.meta.glob, so Playwright cannot import it. Its ids are
// exactly the keys of locales/en/designs.json (designs.test.ts enforces that parity).
const DESIGN_IDS: string[] = Object.keys(
  JSON.parse(readFileSync(resolve(localesDir, 'en', 'designs.json'), 'utf8'))
);

// Fixture callbacks call their continuation `provide`, not Playwright's usual `use`:
// eslint-plugin-react-hooks mistakes a call to `use(...)` for a React hook.
const test = base.extend<{ googleRequests: string[] }, { consentSiteUrl: string }>({
  // One static server per worker for the analytics-enabled build.
  consentSiteUrl: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, provide) => {
      const site = await startConsentSite();
      await provide(site.url);
      site.stop();
    },
    { scope: 'worker' },
  ],
  baseURL: async ({ consentSiteUrl }, provide) => {
    await provide(consentSiteUrl);
  },
  // Auto-fixture: the routes are in place before every test's first navigation.
  googleRequests: [
    async ({ context }, provide) => {
      const requests: string[] = [];
      await context.route(
        (url) => GOOGLE_ANALYTICS_HOST.test(url.hostname),
        async (route) => {
          const url = route.request().url();
          requests.push(url);
          if (new URL(url).pathname.endsWith('/gtag/js')) {
            await route.fulfill({
              status: 200,
              contentType: 'text/javascript',
              body: STUB_TAG_SCRIPT,
            });
          } else {
            await route.fulfill({ status: 204 });
          }
        }
      );
      await provide(requests);
    },
    { auto: true },
  ],
});

const consentRoot = (page: Page) => page.locator('[data-analytics-consent]');
const panel = (page: Page, lang: Lang = 'en') =>
  page.getByRole('region', { name: copy(lang).title });
const tagRequests = (requests: string[]) =>
  requests.filter((url) => new URL(url).pathname.endsWith('/gtag/js'));
const storedDecision = (page: Page) =>
  page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);

/** Navigate and wait until the (lazily loaded) consent UI has initialised. */
async function openPage(page: Page, path = '/'): Promise<void> {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await expect(consentRoot(page)).toHaveAttribute('data-consent-state', /.+/);
}

test.describe('first visit, before any decision', () => {
  test('asks for a choice and contacts Google about nothing', async ({ page, googleRequests }) => {
    await openPage(page);
    await page.waitForLoadState('networkidle');

    await expect(panel(page)).toBeVisible();
    await expect(page.getByRole('button', { name: en.accept })).toBeVisible();
    await expect(page.getByRole('button', { name: en.reject })).toBeVisible();

    expect(googleRequests).toEqual([]);
    expect(await page.evaluate(() => (window as any).dataLayer)).toBeUndefined();
    expect(await page.evaluate((id) => (window as any)[`ga-disable-${id}`], ID)).toBe(true);
    expect(await page.evaluate(() => document.cookie)).not.toMatch(/_ga/);
    expect(await storedDecision(page)).toBeNull();
  });

  test('no page HTML references Google; the code that does is fetched lazily', async ({
    request,
  }) => {
    for (const path of ['/', '/es/', '/ca/', '/404.html', '/demos/sbc-ia/']) {
      const html = await (await request.get(path)).text();
      expect(html, `${path} must not reference Google's tag or servers`).not.toMatch(
        /googletagmanager|google-analytics|gtag\(/i
      );
      expect(html, `${path} must carry the consent root`).toContain('data-analytics-consent');
    }
  });
});

/** Everything queued on `dataLayer` for Google's tag, as plain arrays. */
const dataLayerCommands = (page: Page) =>
  page.evaluate(() =>
    Array.from((window as any).dataLayer ?? [], (entry: ArrayLike<unknown>) => Array.from(entry))
  );
const disableFlag = (page: Page) =>
  page.evaluate((id) => (window as any)[`ga-disable-${id}`] as boolean | undefined, ID);

const ALL_DENIED = {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
};

test.describe('rejecting analytics', () => {
  test('hides the banner, remembers the choice and never contacts Google', async ({
    page,
    googleRequests,
  }) => {
    await openPage(page);

    await page.getByRole('button', { name: en.reject }).click();

    await expect(panel(page)).toBeHidden();
    await expect(consentRoot(page)).toHaveAttribute('data-consent-state', 'denied');
    await expect(consentRoot(page).getByRole('status')).toHaveText(en.savedDenied);
    expect(await storedDecision(page)).toBe('denied');

    // The decision survives a reload and navigation to other pages.
    for (const path of ['/', '/es/', '/demos/sbc-ia/']) {
      await openPage(page, path);
      await expect(panel(page, path === '/es/' ? 'es' : 'en')).toBeHidden();
    }
    await page.waitForLoadState('networkidle');
    expect(googleRequests).toEqual([]);
    expect(await disableFlag(page)).toBe(true);
  });
});

test.describe('accepting analytics', () => {
  test('loads the tag once, with advertising features off, and remembers the choice', async ({
    page,
    googleRequests,
  }) => {
    await openPage(page);

    await page.getByRole('button', { name: en.accept }).click();

    await expect(panel(page)).toBeHidden();
    await expect(consentRoot(page)).toHaveAttribute('data-consent-state', 'granted');
    await expect(consentRoot(page).getByRole('status')).toHaveText(en.savedGranted);
    await expect
      .poll(() => tagRequests(googleRequests))
      .toEqual([`https://www.googletagmanager.com/gtag/js?id=${ID}`]);
    await page.waitForLoadState('networkidle');
    expect(tagRequests(googleRequests)).toHaveLength(1);
    await expect(page.locator('script[src*="googletagmanager.com"]')).toHaveCount(1);
    expect(await page.evaluate(() => (window as any).__gtagScriptLoads)).toBe(1);

    expect(await storedDecision(page)).toBe('granted');
    expect(await disableFlag(page)).toBe(false);
    expect(await dataLayerCommands(page)).toEqual([
      ['js', expect.any(Date)],
      [
        'consent',
        'default',
        {
          analytics_storage: 'granted',
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
        },
      ],
      ['config', ID, { allow_google_signals: false, allow_ad_personalization_signals: false }],
    ]);
  });

  test('the choice persists: a reload loads the tag again without asking', async ({
    page,
    googleRequests,
  }) => {
    await openPage(page);
    await page.getByRole('button', { name: en.accept }).click();
    await expect.poll(() => tagRequests(googleRequests)).toHaveLength(1);

    await openPage(page);

    await expect(panel(page)).toBeHidden();
    await expect.poll(() => tagRequests(googleRequests)).toHaveLength(2);
    await expect(page.locator('script[src*="googletagmanager.com"]')).toHaveCount(1);
    expect(await page.evaluate(() => (window as any).__gtagScriptLoads)).toBe(1);
  });

  test('accepting again from settings does not load a second copy', async ({
    page,
    googleRequests,
  }) => {
    await openPage(page);
    await page.getByRole('button', { name: en.accept }).click();
    await expect.poll(() => tagRequests(googleRequests)).toHaveLength(1);

    await page.getByRole('button', { name: en.settings }).click();
    await page.getByRole('button', { name: en.accept }).click();
    await page.waitForLoadState('networkidle');

    expect(tagRequests(googleRequests)).toHaveLength(1);
    await expect(page.locator('script[src*="googletagmanager.com"]')).toHaveCount(1);
  });
});

test.describe('withdrawing consent', () => {
  test('stops analytics, removes Google cookies and stays off after a reload', async ({
    page,
    googleRequests,
  }) => {
    await openPage(page);
    await page.getByRole('button', { name: en.accept }).click();
    await expect.poll(() => tagRequests(googleRequests)).toHaveLength(1);
    // The real tag would have written these; the stub does not, so plant them.
    await page.evaluate(() => {
      document.cookie = '_ga=GA1.1.1.1; path=/';
      document.cookie = '_ga_TESTCONSENT=GS1.1.1; path=/';
      document.cookie = 'unrelated=keep; path=/';
    });

    await page.getByRole('button', { name: en.settings }).click();
    await expect(panel(page)).toBeVisible();
    await expect(panel(page)).toContainText(en.statusGranted);
    await page.getByRole('button', { name: en.reject }).click();

    await expect(panel(page)).toBeHidden();
    await expect(consentRoot(page)).toHaveAttribute('data-consent-state', 'denied');
    expect(await storedDecision(page)).toBe('denied');
    expect(await disableFlag(page)).toBe(true);
    const cookies = await page.evaluate(() => document.cookie);
    expect(cookies).not.toMatch(/_ga/);
    expect(cookies).toContain('unrelated=keep');
    expect((await dataLayerCommands(page)).at(-1)).toEqual(['consent', 'update', ALL_DENIED]);

    const loadsBefore = tagRequests(googleRequests).length;
    await openPage(page);
    await page.waitForLoadState('networkidle');
    await expect(panel(page)).toBeHidden();
    expect(tagRequests(googleRequests)).toHaveLength(loadsBefore);
    expect(await disableFlag(page)).toBe(true);
  });

  test('re-accepting after a withdrawal switches analytics back on', async ({
    page,
    googleRequests,
  }) => {
    await openPage(page);
    await page.getByRole('button', { name: en.accept }).click();
    await expect.poll(() => tagRequests(googleRequests)).toHaveLength(1);
    await page.getByRole('button', { name: en.settings }).click();
    await page.getByRole('button', { name: en.reject }).click();
    await expect(consentRoot(page)).toHaveAttribute('data-consent-state', 'denied');

    await page.getByRole('button', { name: en.settings }).click();
    await expect(panel(page)).toContainText(en.statusDenied);
    await page.getByRole('button', { name: en.accept }).click();

    await expect(consentRoot(page)).toHaveAttribute('data-consent-state', 'granted');
    expect(await disableFlag(page)).toBe(false);
    expect((await dataLayerCommands(page)).at(-1)).toEqual([
      'consent',
      'update',
      { ...ALL_DENIED, analytics_storage: 'granted' },
    ]);
    await page.waitForLoadState('networkidle');
    expect(tagRequests(googleRequests)).toHaveLength(1);
  });
});
test.describe('privacy settings entry points', () => {
  test('the home footer reopens the panel with the current state; Escape closes it unchanged', async ({
    page,
  }) => {
    await openPage(page);
    await page.getByRole('button', { name: en.reject }).click();
    await expect(panel(page)).toBeHidden();

    const trigger = page.getByRole('button', { name: en.settings });
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await trigger.click();

    await expect(panel(page)).toBeVisible();
    await expect(panel(page)).toContainText(en.statusDenied);
    await expect(panel(page)).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(consentRoot(page).getByRole('button', { name: en.close })).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(panel(page)).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(await storedDecision(page)).toBe('denied');
  });

  test('the Close button dismisses the panel without changing the decision', async ({ page }) => {
    await openPage(page);
    await page.getByRole('button', { name: en.accept }).click();
    const trigger = page.getByRole('button', { name: en.settings });
    await trigger.click();
    await expect(panel(page)).toContainText(en.statusGranted);

    await consentRoot(page).getByRole('button', { name: en.close }).click();

    await expect(panel(page)).toBeHidden();
    await expect(trigger).toBeFocused();
    expect(await storedDecision(page)).toBe('granted');
  });

  test('demo pages offer the same entry point in their bottom bar', async ({ page }) => {
    await openPage(page, '/demos/sbc-ia/');
    await page.getByRole('button', { name: en.accept }).click();

    const trigger = page.getByRole('button', { name: en.settings });
    await expect(trigger).toBeVisible();
    await trigger.click();

    await expect(panel(page)).toContainText(en.statusGranted);
    await page.keyboard.press('Escape');
    await expect(panel(page)).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('error pages ask when undecided but have no settings link', async ({ page }) => {
    await openPage(page, '/404.html');

    await expect(panel(page)).toBeVisible();
    await expect(page.getByRole('button', { name: en.settings })).toHaveCount(0);
  });

  test('opening settings while undecided focuses the banner that is already open', async ({
    page,
  }) => {
    await openPage(page);
    const trigger = page.getByRole('button', { name: en.settings });
    // Keyboard, not click: the open banner overlaps the footer button.
    await trigger.focus();
    await page.keyboard.press('Enter');

    await expect(panel(page)).toBeFocused();
    await expect(consentRoot(page).getByRole('button', { name: en.close })).toBeHidden();
    expect(await storedDecision(page)).toBeNull();
  });
});

test.describe('keyboard use and equal prominence', () => {
  test('the choice is the first thing after the skip link, and Enter decides', async ({
    page,
    googleRequests,
  }) => {
    await openPage(page);
    const reject = page.getByRole('button', { name: en.reject });
    const accept = page.getByRole('button', { name: en.accept });

    await page.keyboard.press('Tab');
    await expect(page.locator('a.skip-to-content')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(reject).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(accept).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(reject).toBeFocused();

    await page.keyboard.press('Enter');

    await expect(consentRoot(page)).toHaveAttribute('data-consent-state', 'denied');
    await expect(panel(page)).toBeHidden();
    await page.waitForLoadState('networkidle');
    expect(googleRequests).toEqual([]);
  });

  test('Space activates the focused choice too', async ({ page, googleRequests }) => {
    await openPage(page);
    await page.getByRole('button', { name: en.accept }).focus();

    await page.keyboard.press('Space');

    await expect(consentRoot(page)).toHaveAttribute('data-consent-state', 'granted');
    await expect.poll(() => tagRequests(googleRequests)).toHaveLength(1);
  });

  test('accepting and rejecting are presented identically', async ({ page }) => {
    await openPage(page);
    const look = (name: string) =>
      page.getByRole('button', { name }).evaluate((element) => {
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        return {
          width: Math.round(box.width),
          height: Math.round(box.height),
          color: style.color,
          background: style.backgroundColor,
          borderColor: style.borderTopColor,
          borderWidth: style.borderTopWidth,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          padding: style.padding,
          radius: style.borderRadius,
          opacity: style.opacity,
        };
      });

    expect(await look(en.accept)).toEqual(await look(en.reject));
  });
});

test.describe('localisation', () => {
  for (const lang of ['es', 'ca'] as const) {
    test(`the /${lang}/ pages present a fully translated banner and settings`, async ({ page }) => {
      const ui = copy(lang);
      await openPage(page, `/${lang}/`);

      await expect(page.locator('html')).toHaveAttribute('lang', lang);
      await expect(panel(page, lang)).toBeVisible();
      await expect(panel(page, lang)).toContainText(ui.description);
      await expect(page.getByRole('button', { name: ui.accept })).toBeVisible();
      await expect(page.getByRole('button', { name: ui.reject })).toBeVisible();

      await page.getByRole('button', { name: ui.reject }).click();
      await expect(consentRoot(page).getByRole('status')).toHaveText(ui.savedDenied);

      await page.getByRole('button', { name: ui.settings }).click();
      await expect(panel(page, lang)).toContainText(ui.statusDenied);
      await expect(consentRoot(page).getByRole('button', { name: ui.close })).toBeVisible();
    });

    test(`the /${lang}/ demo pages offer a translated settings button`, async ({ page }) => {
      const ui = copy(lang);
      await openPage(page, `/${lang}/demos/sbc-ia/`);
      await page.getByRole('button', { name: ui.accept }).click();

      await page.getByRole('button', { name: ui.settings }).click();

      await expect(panel(page, lang)).toContainText(ui.statusGranted);
    });
  }
});
test.describe('Astro client-side navigation (ClientRouter)', () => {
  /** Follow a link through ClientRouter and prove no full reload happened. */
  async function softNavigate(page: Page, href: string): Promise<void> {
    await page.evaluate((target) => {
      (window as any).__softNavMarker = true;
      const link = document.createElement('a');
      link.id = 'soft-nav-link';
      link.href = target;
      link.textContent = 'soft navigation';
      link.style.cssText =
        'position:fixed;top:45%;left:40%;z-index:99999;padding:8px;background:#fff;color:#000';
      document.body.append(link);
    }, href);
    await page.locator('#soft-nav-link').click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect.poll(() => page.evaluate(() => (window as any).__softNavMarker)).toBe(true);
  }

  test('an undecided visitor is asked again on the new page, in its language', async ({
    page,
    googleRequests,
  }) => {
    await openPage(page);
    await softNavigate(page, '/es/');

    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(consentRoot(page)).toHaveAttribute('data-consent-state', 'undecided');
    await expect(panel(page, 'es')).toBeVisible();

    await page.getByRole('button', { name: copy('es').reject }).click();

    await expect(consentRoot(page)).toHaveAttribute('data-consent-state', 'denied');
    await expect(panel(page, 'es')).toBeHidden();
    expect(await storedDecision(page)).toBe('denied');
    expect(googleRequests).toEqual([]);
  });

  test('an accepted choice carries over: no second load, and settings still work', async ({
    page,
    googleRequests,
  }) => {
    await openPage(page);
    await page.getByRole('button', { name: en.accept }).click();
    await expect.poll(() => tagRequests(googleRequests)).toHaveLength(1);

    await softNavigate(page, '/es/');

    await expect(consentRoot(page)).toHaveAttribute('data-consent-state', 'granted');
    await expect(panel(page, 'es')).toBeHidden();
    await page.waitForLoadState('networkidle');
    expect(tagRequests(googleRequests)).toHaveLength(1);
    expect(await disableFlag(page)).toBe(false);

    // The freshly swapped-in footer button is wired up.
    const ui = copy('es');
    await page.getByRole('button', { name: ui.settings }).click();
    await expect(panel(page, 'es')).toContainText(ui.statusGranted);
    await page.getByRole('button', { name: ui.reject }).click();

    await expect(consentRoot(page)).toHaveAttribute('data-consent-state', 'denied');
    expect(await disableFlag(page)).toBe(true);
    expect((await dataLayerCommands(page)).at(-1)).toEqual(['consent', 'update', ALL_DENIED]);
  });

  test('a rejected choice stays rejected after navigating', async ({ page, googleRequests }) => {
    await openPage(page);
    await page.getByRole('button', { name: en.reject }).click();

    await softNavigate(page, '/ca/');

    await expect(consentRoot(page)).toHaveAttribute('data-consent-state', 'denied');
    await expect(panel(page, 'ca')).toBeHidden();
    await page.waitForLoadState('networkidle');
    expect(googleRequests).toEqual([]);
  });
});

test.describe('several tabs', () => {
  test('a decision in one tab is applied by the others', async ({
    page,
    context,
    googleRequests,
  }) => {
    await openPage(page);
    const other = await context.newPage();
    await openPage(other, '/es/');
    await expect(panel(other, 'es')).toBeVisible();

    await page.getByRole('button', { name: en.accept }).click();

    await expect(consentRoot(other)).toHaveAttribute('data-consent-state', 'granted');
    await expect(panel(other, 'es')).toBeHidden();
    await expect.poll(() => tagRequests(googleRequests)).toHaveLength(2);
    expect(await disableFlag(other)).toBe(false);

    await page.getByRole('button', { name: en.settings }).click();
    await page.getByRole('button', { name: en.reject }).click();

    await expect(consentRoot(other)).toHaveAttribute('data-consent-state', 'denied');
    expect(await disableFlag(other)).toBe(true);
    expect((await dataLayerCommands(other)).at(-1)).toEqual(['consent', 'update', ALL_DENIED]);
  });
});

test.describe('a page restored from the back/forward cache', () => {
  // A cached page is frozen, so it hears no `storage` events while another page changes the choice.
  // Chromium under automation never uses the real cache, so the restore is simulated: write the
  // record without an event (a document is never told about its own writes) and fire the `pageshow`
  // the browser sends when the page comes back.
  const restore = (page: Page) =>
    page.evaluate(() =>
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
    );

  test('stops analytics when consent was withdrawn while it was frozen', async ({ page }) => {
    await openPage(page);
    await page.getByRole('button', { name: en.accept }).click();
    await expect(consentRoot(page)).toHaveAttribute('data-consent-state', 'granted');
    expect(await disableFlag(page)).toBe(false);

    await page.evaluate((key) => localStorage.setItem(key, 'denied'), STORAGE_KEY);
    await restore(page);

    await expect(consentRoot(page)).toHaveAttribute('data-consent-state', 'denied');
    expect(await disableFlag(page)).toBe(true);
    expect((await dataLayerCommands(page)).at(-1)).toEqual(['consent', 'update', ALL_DENIED]);
  });

  test('starts analytics when consent was given while it was frozen', async ({
    page,
    googleRequests,
  }) => {
    await openPage(page);
    await expect(panel(page)).toBeVisible();

    await page.evaluate((key) => localStorage.setItem(key, 'granted'), STORAGE_KEY);
    await restore(page);

    await expect(consentRoot(page)).toHaveAttribute('data-consent-state', 'granted');
    await expect(panel(page)).toBeHidden();
    await expect.poll(() => tagRequests(googleRequests)).toHaveLength(1);
  });
});

test.describe('when localStorage is unavailable', () => {
  test('choices still work for the current page and nothing is remembered', async ({
    page,
    googleRequests,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('storage blocked', 'SecurityError');
        },
      });
    });
    await openPage(page);
    await expect(panel(page)).toBeVisible();

    await page.getByRole('button', { name: en.accept }).click();

    await expect(consentRoot(page)).toHaveAttribute('data-consent-state', 'granted');
    await expect.poll(() => tagRequests(googleRequests)).toHaveLength(1);

    await openPage(page);
    await expect(panel(page)).toBeVisible();
    await expect(consentRoot(page)).toHaveAttribute('data-consent-state', 'undecided');
  });
});

test.describe('accessibility of the consent UI', () => {
  // Reduced motion removes the panel's entrance animation, so contrast is measured on the settled
  // panel (and the reduced-motion path is exercised). `reducedMotion` is a browser-context option,
  // not a test option, so it has to travel through `contextOptions`.
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  const STANDARD_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

  // axe judges contrast line by line against whatever is stacked behind the text, and reports the
  // result as "incomplete" (not a violation, not a pass) when the page content behind a fixed panel
  // differs from line to line. So axe runs with the rest of the page hidden. That is only sound
  // because the panel is asserted to be fully opaque first: nothing behind it can affect legibility.
  const ISOLATE_CONSENT_UI =
    'body > :not([data-analytics-consent]) { visibility: hidden !important; }';
  const isOpaque = (cssColor: string) =>
    /^rgb\(/.test(cssColor) || (/^color\(/.test(cssColor) && !cssColor.includes('/'));

  // `contrast: false` skips only the contrast rule. It is for screens too short for the panel: axe
  // reports the lines scrolled out of view as "partially obscured", which says nothing about how
  // legible they are (that is measured at full size by the theme and design tests).
  async function expectAccessible(
    page: Page,
    label: string,
    { contrast = true }: { contrast?: boolean } = {}
  ): Promise<void> {
    const consentPanel = page.locator('#analytics-consent-panel');
    // Never measure a panel that is still fading in.
    await expect(consentPanel).toHaveCSS('opacity', '1');
    const backdrop = await consentPanel.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        color: style.backgroundColor,
        image: style.backgroundImage,
        animation: style.animationName,
      };
    });
    expect(
      backdrop.animation,
      `${label}: reduced motion must switch the entrance animation off`
    ).toBe('none');
    expect(isOpaque(backdrop.color), `${label}: panel background is ${backdrop.color}`).toBe(true);
    expect(backdrop.image, `${label}: panel must not use a background image`).toBe('none');

    const isolate = await page.addStyleTag({ content: ISOLATE_CONSENT_UI });
    try {
      const axe = new AxeBuilder({ page: page as never })
        .include('#analytics-consent-panel')
        .withTags(STANDARD_TAGS);
      if (!contrast) axe.disableRules(['color-contrast']);
      const results = await axe.analyze();
      const findings = [
        ...results.violations.map(
          (v) =>
            `violation ${v.impact} ${v.id}: ${v.nodes.map((n) => n.failureSummary).join(' | ')}`
        ),
        // "Incomplete" means axe could not decide; that must never be mistaken for a pass.
        ...results.incomplete.map(
          (i) =>
            `undecided ${i.id}: ${i.nodes
              .map((n) => `${n.target.join(' ')} [${n.any.map((c) => c.data?.messageKey ?? c.id)}]`)
              .join('; ')}`
        ),
      ];
      expect(findings, `axe findings in ${label}`).toEqual([]);
      if (contrast) {
        // Guard against a vacuous pass: the contrast rule really ran on this panel.
        expect(
          results.passes.map((p) => p.id),
          `${label}: contrast rule did not run`
        ).toContain('color-contrast');
      }
    } finally {
      await isolate.evaluate((el) => (el as ChildNode).remove());
    }
  }

  async function openAppearance(page: Page, appearance: { theme?: string; design?: string }) {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.evaluate((chosen) => {
      if (chosen.theme) localStorage.setItem('theme', chosen.theme);
      if (chosen.design) localStorage.setItem('design', chosen.design);
    }, appearance);
    await openPage(page);
    await expect(panel(page)).toBeVisible();
  }

  async function checkBothViews(
    page: Page,
    label: string,
    options?: { contrast?: boolean }
  ): Promise<void> {
    await expectAccessible(page, `${label} (first-visit view)`, options);
    await page.getByRole('button', { name: en.reject }).click();
    await page.getByRole('button', { name: en.settings }).click();
    await expect(consentRoot(page).getByRole('button', { name: en.close })).toBeVisible();
    await expectAccessible(page, `${label} (settings view)`, options);
  }

  for (const theme of THEMES.map((t) => t.id)) {
    test(`theme ${theme}: no axe violations in either view`, async ({ page }) => {
      await openAppearance(page, { theme });
      await checkBothViews(page, `theme ${theme}`);
    });
  }

  for (const design of DESIGN_IDS) {
    test(`design ${design}: no axe violations in either view`, async ({ page }) => {
      await openAppearance(page, { design });
      await checkBothViews(page, `design ${design}`);
    });
  }

  async function expectPanelOnScreen(page: Page, label: string): Promise<void> {
    const viewport = page.viewportSize()!;
    const box = await page.locator('#analytics-consent-panel').boundingBox();
    expect(box, `${label}: panel is laid out`).not.toBeNull();
    expect(box!.x, `${label}: left edge is cut off`).toBeGreaterThanOrEqual(0);
    expect(box!.y, `${label}: top edge is cut off`).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width, `${label}: right edge is cut off`).toBeLessThanOrEqual(
      viewport.width
    );
    expect(box!.y + box!.height, `${label}: bottom edge is cut off`).toBeLessThanOrEqual(
      viewport.height
    );
  }

  test.describe('on a phone-sized screen', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('no axe violations in either view, and the panel fits the screen', async ({ page }) => {
      await openAppearance(page, {});
      await expectPanelOnScreen(page, 'phone, first visit');
      await checkBothViews(page, 'phone viewport');
      await expectPanelOnScreen(page, 'phone, settings view');
    });
  });

  // WCAG 1.4.10 (reflow): a 1280x800 window zoomed to 400% is 320x200 CSS pixels, and a phone held
  // sideways is about as tall. The panel is fixed to the bottom, so if it is taller than the screen
  // its top (the title and the explanation) is cut off and cannot be scrolled to.
  for (const screen of [
    { label: 'a desktop window at 400% zoom', width: 320, height: 200 },
    { label: 'a phone held sideways', width: 667, height: 375 },
  ]) {
    test.describe(`on a short screen (${screen.label})`, () => {
      test.use({ viewport: { width: screen.width, height: screen.height } });

      test('the panel stays on screen and every button stays usable', async ({ page }) => {
        await openAppearance(page, {});
        await expectPanelOnScreen(page, 'first visit');
        await checkBothViews(page, screen.label, { contrast: false });
        await expectPanelOnScreen(page, 'settings view');

        // The bottom-most control of the tallest view still works.
        await consentRoot(page).getByRole('button', { name: en.close }).click();
        await expect(panel(page)).toBeHidden();
      });
    });
  }
});

test.describe('the default build (no PUBLIC_GA_ID)', () => {
  const PAGES = ['/', '/es/', '/demos/sbc-ia/', '/404.html'];

  test('renders no consent UI and never contacts Google', async ({
    page,
    request,
    googleRequests,
  }) => {
    for (const path of PAGES) {
      const html = await (await request.get(`${DEFAULT_SITE_URL}${path}`)).text();
      expect(html, `${path} must not carry the consent root`).not.toContain(
        'data-analytics-consent'
      );
      expect(html, `${path} must not carry a settings button`).not.toContain(
        'data-analytics-settings'
      );
      expect(html, `${path} must not reference Google's tag or servers`).not.toMatch(
        /googletagmanager|google-analytics|gtag\(/i
      );
    }

    await page.goto(`${DEFAULT_SITE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-analytics-consent]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: en.settings })).toHaveCount(0);
    expect(googleRequests).toEqual([]);
    expect(await page.evaluate(() => (window as any).dataLayer)).toBeUndefined();
  });

  test('loads no consent script on any page', async ({ page }) => {
    // The script chunks are named after their component, so a page that fetches
    // the consent loader or the banner logic shows it in the script URLs.
    const scripts: string[] = [];
    page.on('request', (request) => {
      if (request.resourceType() === 'script') scripts.push(request.url());
    });

    for (const path of PAGES) {
      await page.goto(`${DEFAULT_SITE_URL}${path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');
    }

    expect(scripts.length, 'the pages load scripts at all').toBeGreaterThan(0);
    expect(scripts.filter((url) => /analytics/i.test(url))).toEqual([]);
  });
});
