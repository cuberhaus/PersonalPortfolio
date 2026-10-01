/**
 * Cookieless visit counter.
 *
 * Counts page views with GoatCounter (https://www.goatcounter.com), a privacy-friendly analytics
 * service, so the site learns how many people visit whether or not they accept Google Analytics.
 * It is deliberately separate from the consent flow in analytics-consent.ts, because it is built
 * to need no consent:
 *
 * - it sets no cookie and writes nothing to the visitor's browser (it only reads the `skipgc`
 *   opt-out flag that the owner can set in their own browser);
 * - it loads no third-party script. This module sends the small request GoatCounter's own
 *   count.js would send, with fewer fields: the page path, an external referrer (origin and path
 *   only), the screen width and a bot hint. Unlike count.js it never sends the query string or
 *   the page title, so an address like `/?email=…` cannot leak;
 * - it is inert unless a GoatCounter site code is configured (see src/config/visit-counter.ts).
 *
 * What this means for visitors and for the owner: docs/guides/analytics-and-privacy.md.
 */

/** The part of `window` the counter uses, so tests can inject a fake. */
export interface VisitCounterWindow {
  readonly location: {
    readonly hostname: string;
    readonly pathname: string;
    readonly protocol: string;
  };
  readonly screen: { readonly width: number };
  readonly navigator: {
    readonly webdriver?: boolean;
    sendBeacon?(url: string): boolean;
  };
  readonly self: unknown;
  readonly top: unknown;
  readonly localStorage?: { getItem(key: string): string | null };
  /** GoatCounter's own switch for counting development pages; the browser tests use it. */
  readonly goatcounter?: { readonly allow_local?: boolean };
}

/** The part of `document` the counter uses, so tests can inject a fake. */
export interface VisitCounterDocument {
  readonly referrer: string;
  readonly visibilityState?: string;
  readonly prerendering?: boolean;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
  createElement(tag: 'img'): { src: string };
}

export interface VisitCounterOptions {
  /** The configured GoatCounter site code. Untrusted: it is validated before it is used. */
  code: unknown;
  win: VisitCounterWindow;
  doc: VisitCounterDocument;
}

export interface VisitCounter {
  /** Count the page being viewed, unless it is the one counted last or must not be counted. */
  countCurrentPage(): void;
}

/** 2–50 lowercase letters, digits and hyphens, not starting or ending with one: a DNS label. */
const SITE_CODE = /^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/;

/**
 * Pages served from the visitor's own machine or network are development, not visits. Mirrors
 * GoatCounter's own script, plus the IPv6 loopback address.
 */
const DEVELOPMENT_HOST =
  /(?:^|\.)localhost$|^127\.|^10\.|^172\.(?:1[6-9]|2\d|3[01])\.|^192\.168\.|^0\.0\.0\.0$|^\[::1\]$/;

/** Validate a configured site code. The code becomes part of a host name, so it must be a plain label. */
export function parseSiteCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const code = raw.trim();
  return SITE_CODE.test(code) ? code : null;
}

/** The hosted GoatCounter endpoint for a site code that `parseSiteCode` accepted. */
export function countEndpoint(code: string): string {
  return `https://${code}.goatcounter.com/count`;
}

/** The owner's escape hatch, the flag GoatCounter's script also reads: `localStorage.skipgc = 't'`. */
function hasOptedOut(win: VisitCounterWindow): boolean {
  try {
    return win.localStorage?.getItem('skipgc') === 't';
  } catch {
    return false; // Blocked storage is no reason to lose a view.
  }
}

function isCountable(win: VisitCounterWindow): boolean {
  const { hostname, protocol } = win.location;
  const allowDevelopment = win.goatcounter?.allow_local === true;
  if (!allowDevelopment && (protocol === 'file:' || DEVELOPMENT_HOST.test(hostname))) return false;
  if (win.self !== win.top) return false; // Embedded in someone else's page.
  return !hasOptedOut(win);
}

/** The number GoatCounter uses to file a visit under "bots"; 0 means "looks like a person". */
function botCode(win: VisitCounterWindow, doc: VisitCounterDocument): number {
  const flagged = (target: object, names: string[]) =>
    names.some((name) => Boolean((target as Record<string, unknown>)[name]));
  if (flagged(win, ['callPhantom', '_phantom', 'phantom'])) return 150;
  if (flagged(win, ['__nightmare'])) return 151;
  if (flagged(doc, ['__selenium_unwrapped', '__webdriver_evaluate', '__driver_evaluate']))
    return 152;
  if (win.navigator.webdriver) return 153;
  return 0;
}

/** Where the visitor came from, if that was another site: origin and path, never query or fragment. */
function externalReferrer(win: VisitCounterWindow, doc: VisitCounterDocument): string | null {
  if (!doc.referrer) return null;
  try {
    const referrer = new URL(doc.referrer);
    if (referrer.hostname === win.location.hostname) return null;
    // Not `origin`: that is the string "null" for app referrers such as android-app://….
    return `${referrer.protocol}//${referrer.host}${referrer.pathname}`;
  } catch {
    return null;
  }
}

function buildUrl(endpoint: string, fields: Array<[name: string, value: string | null]>): string {
  const pairs: string[] = [];
  for (const [name, value] of fields) {
    if (value) pairs.push(`${name}=${encodeURIComponent(value)}`);
  }
  return `${endpoint}?${pairs.join('&')}`;
}

/** Fire and forget. A blocked or failing request must never break the page. */
function transmit(win: VisitCounterWindow, doc: VisitCounterDocument, url: string): void {
  try {
    if (win.navigator.sendBeacon?.(url)) return;
  } catch {
    // Fall through to the image request below.
  }
  try {
    doc.createElement('img').src = url;
  } catch {
    // Nothing else to try.
  }
}

/**
 * Returns `null` (and touches nothing) unless `code` is a valid GoatCounter site code, so a build
 * without one ships a counter that cannot do anything.
 */
export function createVisitCounter({ code, win, doc }: VisitCounterOptions): VisitCounter | null {
  const siteCode = parseSiteCode(code);
  if (!siteCode) return null;
  const endpoint = countEndpoint(siteCode);

  let lastCountedPath: string | null = null;
  let referrerReported = false;
  let waitingForVisibility = false;

  const canBeSeen = (): boolean =>
    (doc.visibilityState === undefined || doc.visibilityState === 'visible') && !doc.prerendering;

  function onBecameVisible(): void {
    if (!canBeSeen()) return;
    doc.removeEventListener('visibilitychange', onBecameVisible);
    doc.removeEventListener('prerenderingchange', onBecameVisible);
    waitingForVisibility = false;
    countCurrentPage();
  }

  function countCurrentPage(): void {
    const path = win.location.pathname;
    if (path === lastCountedPath || !isCountable(win)) return;

    // A background tab or a prerendered page is not a view yet; count whatever the visitor ends up on.
    if (!canBeSeen()) {
      if (!waitingForVisibility) {
        waitingForVisibility = true;
        doc.addEventListener('visibilitychange', onBecameVisible);
        doc.addEventListener('prerenderingchange', onBecameVisible);
      }
      return;
    }

    lastCountedPath = path;
    const bot = botCode(win, doc);
    const width = win.screen.width;
    const url = buildUrl(endpoint, [
      ['p', path],
      ['r', referrerReported ? null : externalReferrer(win, doc)],
      ['s', width > 0 ? String(width) : null],
      ['b', bot > 0 ? String(bot) : null],
      ['rnd', Math.random().toString(36).slice(2, 7)], // Browsers do not always honour Cache-Control.
    ]);
    referrerReported = true; // Later views were reached from this site.
    transmit(win, doc, url);
  }

  return { countCurrentPage };
}

/**
 * Count the page now and every page Astro's ClientRouter swaps in afterwards. Astro announces the
 * initial load too, which `countCurrentPage` ignores because the path has not changed.
 */
export function startVisitCounter(options: VisitCounterOptions): VisitCounter | null {
  const counter = createVisitCounter(options);
  if (!counter) return null;
  counter.countCurrentPage();
  options.doc.addEventListener('astro:page-load', () => counter.countCurrentPage());
  return counter;
}
