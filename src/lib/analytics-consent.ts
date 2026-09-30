/**
 * Consent-first Google Analytics 4 (issue #13).
 *
 * This is the only module that knows about Google. Nothing in the HTML or in
 * any other bundle references the tag: the script is injected here, once, and
 * only after the visitor has explicitly accepted. See
 * docs/guides/analytics-and-privacy.md.
 */

/** localStorage key holding the visitor's decision. Also pre-seeded by scripts/capture-og-images.mjs. */
export const ANALYTICS_CONSENT_STORAGE_KEY = 'analytics-consent';

const GTAG_SCRIPT_URL = 'https://www.googletagmanager.com/gtag/js';
const MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]+$/;
/**
 * `.env.example` documents the variable with `G-XXXXXXXXXX`, which is well-formed. Refuse it (and any
 * all-X variant) so copying the sample verbatim never turns on the consent UI for a property that
 * does not exist. Google issues random IDs, so a real one is never all X.
 */
const PLACEHOLDER_ID_PATTERN = /^G-X+$/;
/** Cookies written by gtag.js: `_ga`, `_ga_<container>`, `_gid`, `_gat`, `_gat_<property>`. */
const GOOGLE_ANALYTICS_COOKIE = /^(?:_ga(?:_.+)?|_gid|_gat(?:_.+)?)$/;
const EXPIRED_COOKIE_DATE = 'Thu, 01 Jan 1970 00:00:00 GMT';

export type ConsentDecision = 'granted' | 'denied';

/** The slice of `Storage` the controller needs. */
export interface ConsentStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** The parts of a `storage` event the controller reads (fired when *another* tab writes). */
export interface ConsentStorageEvent {
  key: string | null;
  newValue: string | null;
  storageArea: unknown;
}

/** The window events the controller listens for, reduced to the fields it reads. */
export interface AnalyticsWindowEvents {
  /** Another document changed localStorage. */
  storage: ConsentStorageEvent;
  /** A page was shown; `persisted` means it came back from the back/forward cache. */
  pageshow: { persisted: boolean };
}

/** The slice of `window` the controller touches: Google's globals, opt-out flags and events from other pages. */
export interface AnalyticsWindow {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  addEventListener<T extends keyof AnalyticsWindowEvents>(
    type: T,
    listener: (event: AnalyticsWindowEvents[T]) => void
  ): void;
  [key: string]: unknown;
}

export interface AnalyticsScriptElement {
  async: boolean;
  src: string;
}

/** The slice of `document` the controller touches. */
export interface AnalyticsDocument {
  head: { appendChild(element: AnalyticsScriptElement): unknown };
  createElement(tag: 'script'): AnalyticsScriptElement;
  cookie: string;
  location: { hostname: string };
}

export interface AnalyticsConsentOptions {
  /** Raw configured value (`PUBLIC_GA_ID`); validated here. */
  measurementId: unknown;
  /** `null` when browser storage is unavailable; decisions then last for the page only. */
  storage: ConsentStorage | null;
  win: AnalyticsWindow;
  doc: AnalyticsDocument;
}

export type ConsentListener = (decision: ConsentDecision | null) => void;

export interface AnalyticsConsent {
  /** The visitor's decision, or `null` while they have not chosen. */
  getDecision(): ConsentDecision | null;
  /** Accept analytics: persist the choice and load Google's tag (once). */
  grant(): void;
  /** Reject analytics, or withdraw a previous acceptance. */
  deny(): void;
  /**
   * Be told whenever the decision changes — from this tab or, via the
   * `storage` event (or a restore from the back/forward cache), from another
   * page. Returns an unsubscribe function.
   */
  subscribe(listener: ConsentListener): () => void;
}

/**
 * Validate a GA4 web measurement ID (`G-` plus letters and digits). Returns the
 * trimmed ID, or `null` for anything else — including unset variables, legacy
 * `UA-` IDs, the `.env.example` placeholder and values that could break out of
 * the script URL. A `null` result means analytics is off for the whole site:
 * no consent UI, no script.
 */
export function parseMeasurementId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (PLACEHOLDER_ID_PATTERN.test(trimmed)) return null;
  return MEASUREMENT_ID_PATTERN.test(trimmed) ? trimmed : null;
}

/**
 * Create the consent controller for one page. Returns `null` when the
 * measurement ID is missing or invalid, in which case nothing can ever load.
 */
export function createAnalyticsConsent(options: AnalyticsConsentOptions): AnalyticsConsent | null {
  const measurementId = parseMeasurementId(options.measurementId);
  return measurementId ? buildController(measurementId, options) : null;
}

/** Consent Mode signals: analytics follows the visitor's choice, advertising is always off. */
function consentSignals(analytics: ConsentDecision) {
  return {
    analytics_storage: analytics,
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  } as const;
}

function buildController(
  measurementId: string,
  { storage, win, doc }: AnalyticsConsentOptions
): AnalyticsConsent {
  const disableFlag = `ga-disable-${measurementId}`;
  const listeners = new Set<ConsentListener>();
  let tagLoaded = false;
  let enabled = false;

  /** Anything other than the two known values means "no valid decision on record". */
  function parseDecision(raw: unknown): ConsentDecision | null {
    return raw === 'granted' || raw === 'denied' ? raw : null;
  }

  function readStoredDecision(): ConsentDecision | null {
    try {
      return parseDecision(storage?.getItem(ANALYTICS_CONSENT_STORAGE_KEY));
    } catch {
      // Storage blocked or unreadable: treat as "not decided yet" and ask again.
      return null;
    }
  }

  function persist(next: ConsentDecision): void {
    try {
      storage?.setItem(ANALYTICS_CONSENT_STORAGE_KEY, next);
    } catch {
      // Storage blocked (private mode): the choice still applies to this page.
    }
  }

  function loadTag(): void {
    const dataLayer = (win.dataLayer ??= []);
    const gtag = (win.gtag ??= function gtag() {
      // gtag.js only recognises queued `arguments` objects, not arrays.
      // eslint-disable-next-line prefer-rest-params
      dataLayer.push(arguments);
    });

    gtag('js', new Date());
    gtag('consent', 'default', consentSignals('granted'));
    gtag('config', measurementId, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });

    const script = doc.createElement('script');
    script.async = true;
    script.src = `${GTAG_SCRIPT_URL}?id=${measurementId}`;
    doc.head.appendChild(script);
  }

  /**
   * Remove Google Analytics cookies. `document.cookie` cannot reveal a
   * cookie's Domain, and host-only and Domain= cookies with the same name are
   * distinct, so expire each name on the host and on every parent domain.
   */
  function clearAnalyticsCookies(): void {
    const names = doc.cookie
      .split(';')
      .map((pair) => pair.trim().split('=')[0])
      .filter((name) => GOOGLE_ANALYTICS_COOKIE.test(name));
    if (names.length === 0) return;

    const labels = doc.location.hostname.split('.');
    const domains: Array<string | null> = [null];
    for (let start = 0; start < labels.length - 1; start++) {
      domains.push(labels.slice(start).join('.'));
    }

    for (const name of names) {
      for (const domain of domains) {
        const scope = domain ? `; domain=${domain}` : '';
        doc.cookie = `${name}=; expires=${EXPIRED_COOKIE_DATE}; max-age=0; path=/${scope}`;
      }
    }
  }

  function enable(): void {
    if (enabled) return;
    enabled = true;
    win[disableFlag] = false;
    if (tagLoaded) {
      win.gtag?.('consent', 'update', consentSignals('granted'));
    } else {
      tagLoaded = true;
      loadTag();
    }
  }

  function disable(): void {
    win[disableFlag] = true;
    if (enabled) {
      enabled = false;
      win.gtag?.('consent', 'update', consentSignals('denied'));
    }
    clearAnalyticsCookies();
  }

  // Google's documented opt-out switch. Set from the start so that even a
  // tag loaded by some other route could not send hits before consent.
  win[disableFlag] = true;

  let decision = readStoredDecision();
  if (decision === 'granted') enable();

  /** The single path for every change, local or from another tab. */
  function apply(next: ConsentDecision | null): void {
    const changed = next !== decision;
    decision = next;
    if (next === 'granted') enable();
    else disable();
    if (changed) for (const listener of [...listeners]) listener(next);
  }

  // Another tab decided (or site data was cleared there): follow it, so a
  // withdrawal anywhere stops analytics everywhere. Events from other storage
  // areas (e.g. sessionStorage.clear()) are not ours.
  if (storage) {
    win.addEventListener('storage', (event) => {
      if (event.storageArea !== storage) return;
      if (event.key !== null && event.key !== ANALYTICS_CONSENT_STORAGE_KEY) return;
      apply(parseDecision(event.newValue));
    });

    // A page in the back/forward cache is frozen and hears no `storage` events, so a withdrawal made
    // on another page would otherwise leave analytics running on this one once it is restored. The
    // stored record is the source of truth: read it again. Ordinary loads (`persisted: false`) just
    // read it themselves, above.
    win.addEventListener('pageshow', (event) => {
      if (event.persisted) apply(readStoredDecision());
    });
  }

  return {
    getDecision: () => decision,

    grant() {
      persist('granted');
      apply('granted');
    },

    deny() {
      persist('denied');
      apply('denied');
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
