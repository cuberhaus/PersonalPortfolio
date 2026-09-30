/**
 * Seam 1 for issue #13 (consent-first GA4): the consent controller.
 *
 * The controller is the only module that knows about Google. These tests
 * drive it through its public interface with small injected fakes (storage,
 * window, document) — the same approach as `filtered-collection.test.ts` —
 * and assert only what a visitor or Google's tag could observe: which script
 * elements exist, what was queued on `dataLayer`, which opt-out flag is set,
 * which cookies remain, and what was persisted.
 */
import { describe, expect, it } from 'vitest';
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  createAnalyticsConsent,
  parseMeasurementId,
  type AnalyticsWindowEvents,
  type ConsentDecision,
} from '../lib/analytics-consent';

const ID = 'G-TEST123456';
const DISABLE_FLAG = `ga-disable-${ID}`;
const GTAG_SRC = `https://www.googletagmanager.com/gtag/js?id=${ID}`;

class FakeStorage {
  readonly data = new Map<string, string>();
  readFails = false;
  writeFails = false;

  getItem(key: string): string | null {
    if (this.readFails) throw new Error('storage blocked');
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    if (this.writeFails) throw new Error('storage blocked');
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
}

class FakeScript {
  readonly tagName = 'SCRIPT';
  async = false;
  src = '';
}

interface FakeCookie {
  name: string;
  value: string;
  /** `null` = host-only cookie (no Domain attribute). It is a different cookie from a Domain= one. */
  domain: string | null;
  path: string;
}

/**
 * A script-injection target with a small cookie jar that follows the browser
 * rules that matter here: cookie identity is (name, domain, path), host-only
 * and Domain= cookies are distinct, a Domain the host does not belong to (or
 * a bare top-level domain) is rejected, and an expired write deletes.
 */
class FakeDocument {
  readonly head = {
    children: [] as FakeScript[],
    appendChild(element: FakeScript) {
      this.children.push(element);
      return element;
    },
  };
  readonly location: { hostname: string };
  private cookies: FakeCookie[] = [];

  constructor(hostname = 'portfolio.example.com') {
    this.location = { hostname };
  }

  createElement(_tag: string): FakeScript {
    return new FakeScript();
  }

  /** Test helper: a cookie as a site or Google's tag would have written it. */
  plantCookie(name: string, domain: string | null = null): void {
    this.cookie = `${name}=1; path=/${domain ? `; domain=${domain}` : ''}`;
  }

  get cookie(): string {
    const host = this.location.hostname;
    return this.cookies
      .filter((c) => c.domain === null || host === c.domain || host.endsWith(`.${c.domain}`))
      .map((c) => `${c.name}=${c.value}`)
      .join('; ');
  }

  set cookie(raw: string) {
    const [pair, ...attributes] = raw.split(';').map((part) => part.trim());
    const separator = pair.indexOf('=');
    const name = pair.slice(0, separator);
    const value = pair.slice(separator + 1);
    let domain: string | null = null;
    let path = '/';
    let expired = false;
    for (const attribute of attributes) {
      const [key, attributeValue = ''] = attribute.split('=');
      switch (key.toLowerCase()) {
        case 'domain':
          domain = attributeValue.replace(/^\./, '').toLowerCase();
          break;
        case 'path':
          path = attributeValue;
          break;
        case 'max-age':
          if (Number(attributeValue) <= 0) expired = true;
          break;
        case 'expires':
          if (Date.parse(attributeValue) <= Date.now()) expired = true;
          break;
      }
    }
    const host = this.location.hostname;
    if (domain !== null) {
      const belongsToHost = host === domain || host.endsWith(`.${domain}`);
      if (!belongsToHost || !domain.includes('.')) return;
    }
    this.cookies = this.cookies.filter(
      (c) => !(c.name === name && c.domain === domain && c.path === path)
    );
    if (!expired) this.cookies.push({ name, value, domain, path });
  }
}

class FakeWindow {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  [flag: string]: unknown;
  private readonly listeners: {
    [T in keyof AnalyticsWindowEvents]: Array<(event: AnalyticsWindowEvents[T]) => void>;
  } = { storage: [], pageshow: [] };

  addEventListener<T extends keyof AnalyticsWindowEvents>(
    type: T,
    listener: (event: AnalyticsWindowEvents[T]) => void
  ): void {
    this.listeners[type].push(listener);
  }

  /**
   * Deliver an event, as the browser does: `storage` when another tab changes localStorage,
   * `pageshow` when a page is shown (`persisted` when it comes back from the back/forward cache).
   */
  emit<T extends keyof AnalyticsWindowEvents>(type: T, event: AnalyticsWindowEvents[T]): void {
    for (const listener of this.listeners[type]) listener(event);
  }
}

function setup(options: { measurementId?: unknown; stored?: string; hostname?: string } = {}) {
  const storage = new FakeStorage();
  if (options.stored !== undefined) storage.data.set(ANALYTICS_CONSENT_STORAGE_KEY, options.stored);
  const win = new FakeWindow();
  const doc = new FakeDocument(options.hostname);
  const consent = createAnalyticsConsent({
    measurementId: 'measurementId' in options ? options.measurementId : ID,
    storage,
    win,
    doc,
  });
  return { storage, win, doc, consent: consent! };
}

/** Everything queued for Google's tag, as plain arrays (gtag queues `arguments` objects). */
const queued = (win: FakeWindow) =>
  (win.dataLayer ?? []).map((entry) => Array.from(entry as ArrayLike<unknown>));

const googleScripts = (doc: FakeDocument) =>
  doc.head.children.filter((element) => element.src.includes('googletagmanager.com'));

const cookieNames = (doc: FakeDocument) =>
  doc.cookie
    .split('; ')
    .filter(Boolean)
    .map((pair) => pair.split('=')[0])
    .sort();

describe('parseMeasurementId', () => {
  it('accepts a GA4 web measurement ID', () => {
    expect(parseMeasurementId('G-ABC1234XYZ')).toBe('G-ABC1234XYZ');
  });

  it('trims surrounding whitespace from CI and .env values', () => {
    expect(parseMeasurementId('  G-ABC1234XYZ\n')).toBe('G-ABC1234XYZ');
  });

  it.each([
    ['undefined (variable not configured)', undefined],
    ['null', null],
    ['empty string (unset repository variable)', ''],
    ['whitespace only', '   '],
    ['a number', 12345],
    ['a legacy Universal Analytics ID', 'UA-12345-1'],
    ['a Google Tag Manager container ID', 'GTM-ABC123'],
    ['lowercase letters', 'G-abc1234xyz'],
    ['the placeholder from .env.example', 'G-XXXXXXXXXX'],
    ['a shorter all-X placeholder', 'G-XXXX'],
    ['a trailing dash', 'G-ABC1234XYZ-'],
    ['a value with a query-string injection', 'G-ABC123&l=dataLayer2'],
    ['a value with a script-breaking quote', 'G-ABC123"></script>'],
    ['the prefix alone', 'G-'],
  ])('rejects %s', (_label, raw) => {
    expect(parseMeasurementId(raw)).toBeNull();
  });
});

describe('before the visitor decides', () => {
  it('reports no decision and keeps Google entirely out of the page', () => {
    const { consent, doc, win, storage } = setup();

    expect(consent.getDecision()).toBeNull();
    expect(googleScripts(doc)).toHaveLength(0);
    expect(win.dataLayer).toBeUndefined();
    expect(storage.data.size).toBe(0);
  });

  it('pre-sets the opt-out flag so a stray tag could not send hits either', () => {
    const { win } = setup();

    expect(win[DISABLE_FLAG]).toBe(true);
  });
});

describe('accepting analytics', () => {
  it('persists the decision and loads Google’s tag for this measurement ID', () => {
    const { consent, doc, storage, win } = setup();

    consent.grant();

    expect(consent.getDecision()).toBe('granted');
    expect(storage.data.get(ANALYTICS_CONSENT_STORAGE_KEY)).toBe('granted');
    expect(googleScripts(doc)).toHaveLength(1);
    expect(googleScripts(doc)[0]).toMatchObject({ async: true, src: GTAG_SRC });
    expect(win[DISABLE_FLAG]).toBe(false);
  });

  it('declares analytics-only consent and switches Google’s advertising features off', () => {
    const { consent, win } = setup();

    consent.grant();

    expect(queued(win)).toEqual([
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

  it('loads the tag only once however often consent is granted', () => {
    const { consent, doc, win } = setup();

    consent.grant();
    consent.grant();

    expect(googleScripts(doc)).toHaveLength(1);
    expect(queued(win)).toHaveLength(3);
  });
});

describe('rejecting analytics', () => {
  it('persists the decision and never contacts Google', () => {
    const { consent, doc, storage, win } = setup();

    consent.deny();

    expect(consent.getDecision()).toBe('denied');
    expect(storage.data.get(ANALYTICS_CONSENT_STORAGE_KEY)).toBe('denied');
    expect(googleScripts(doc)).toHaveLength(0);
    expect(win.dataLayer).toBeUndefined();
    expect(win[DISABLE_FLAG]).toBe(true);
  });
});

describe('withdrawing consent after accepting', () => {
  const ALL_DENIED = {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  };

  it('turns the opt-out flag back on and tells the loaded tag to stop storing data', () => {
    const { consent, win } = setup();
    consent.grant();

    consent.deny();

    expect(consent.getDecision()).toBe('denied');
    expect(win[DISABLE_FLAG]).toBe(true);
    expect(queued(win).at(-1)).toEqual(['consent', 'update', ALL_DENIED]);
  });

  it('persists the withdrawal', () => {
    const { consent, storage } = setup({ stored: 'granted' });

    consent.deny();

    expect(storage.data.get(ANALYTICS_CONSENT_STORAGE_KEY)).toBe('denied');
  });

  it.each([
    ['portfolio.example.com', ['example.com', 'portfolio.example.com']],
    [
      'www.portfolio.example.com',
      ['example.com', 'portfolio.example.com', 'www.portfolio.example.com'],
    ],
    ['cuberhaus.github.io', ['github.io', 'cuberhaus.github.io']],
    ['localhost', []],
  ])(
    'on %s removes Google’s cookies whichever domain they were set on, and only those',
    (hostname, domains) => {
      const { consent, doc } = setup({ hostname });
      consent.grant();
      for (const domain of [null, ...domains]) {
        doc.plantCookie('_ga', domain);
        doc.plantCookie('_gid', domain);
        doc.plantCookie('_ga_TEST123456', domain);
        doc.plantCookie('_gat_gtag_G_TEST123456', domain);
      }
      doc.plantCookie('theme');
      doc.plantCookie('session', domains[0] ?? null);
      doc.plantCookie('_gardening');
      expect(cookieNames(doc)).toContain('_ga');

      consent.deny();

      expect(cookieNames(doc)).toEqual(['_gardening', 'session', 'theme']);
    }
  );

  it('also clears leftover Google cookies when analytics is rejected outright', () => {
    const { consent, doc } = setup();
    doc.plantCookie('_ga', 'example.com');

    consent.deny();

    expect(cookieNames(doc)).toEqual([]);
  });
});

describe('changing your mind', () => {
  it('re-accepting reuses the loaded tag instead of adding a second copy', () => {
    const { consent, doc, win } = setup();
    consent.grant();
    consent.deny();

    consent.grant();

    expect(googleScripts(doc)).toHaveLength(1);
    expect(win[DISABLE_FLAG]).toBe(false);
    expect(queued(win).at(-1)).toEqual([
      'consent',
      'update',
      {
        analytics_storage: 'granted',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      },
    ]);
  });

  it('accepting after an earlier rejection loads the tag for the first time', () => {
    const { consent, doc } = setup({ stored: 'denied' });

    consent.grant();

    expect(consent.getDecision()).toBe('granted');
    expect(googleScripts(doc)).toHaveLength(1);
  });
});

describe('returning visitors (decision persisted across page loads)', () => {
  it('loads the tag straight away when analytics was accepted earlier', () => {
    const { consent, doc, win } = setup({ stored: 'granted' });

    expect(consent.getDecision()).toBe('granted');
    expect(googleScripts(doc)).toHaveLength(1);
    expect(googleScripts(doc)[0]).toMatchObject({ src: GTAG_SRC });
    expect(win[DISABLE_FLAG]).toBe(false);
  });

  it('keeps Google out of the page when analytics was rejected earlier', () => {
    const { consent, doc, win } = setup({ stored: 'denied' });

    expect(consent.getDecision()).toBe('denied');
    expect(googleScripts(doc)).toHaveLength(0);
    expect(win.dataLayer).toBeUndefined();
    expect(win[DISABLE_FLAG]).toBe(true);
  });

  it.each(['', 'true', 'yes', 'GRANTED', '{"choice":"granted"}'])(
    'treats the unrecognised stored value %j as no decision',
    (stored) => {
      const { consent, doc, win } = setup({ stored });

      expect(consent.getDecision()).toBeNull();
      expect(googleScripts(doc)).toHaveLength(0);
      expect(win[DISABLE_FLAG]).toBe(true);
    }
  );

  it('treats unreadable storage as no decision rather than failing', () => {
    const storage = new FakeStorage();
    storage.data.set(ANALYTICS_CONSENT_STORAGE_KEY, 'granted');
    storage.readFails = true;
    const doc = new FakeDocument();

    const consent = createAnalyticsConsent({
      measurementId: ID,
      storage,
      win: new FakeWindow(),
      doc,
    })!;

    expect(consent.getDecision()).toBeNull();
    expect(googleScripts(doc)).toHaveLength(0);
  });
});

describe('reacting to decision changes', () => {
  it('notifies subscribers of each change and stops after unsubscribing', () => {
    const { consent } = setup();
    const seen: Array<ConsentDecision | null> = [];
    const unsubscribe = consent.subscribe((decision) => seen.push(decision));

    consent.grant();
    consent.deny();
    unsubscribe();
    consent.grant();

    expect(seen).toEqual(['granted', 'denied']);
  });

  it('does not notify when the decision did not change', () => {
    const { consent } = setup({ stored: 'granted' });
    const seen: Array<ConsentDecision | null> = [];
    consent.subscribe((decision) => seen.push(decision));

    consent.grant();
    consent.grant();

    expect(seen).toEqual([]);
  });
});

describe('a decision made in another tab', () => {
  const fromAnotherTab = (
    t: ReturnType<typeof setup>,
    newValue: string | null,
    key: string | null = ANALYTICS_CONSENT_STORAGE_KEY
  ) => t.win.emit('storage', { key, newValue, storageArea: t.storage });

  it('starts analytics here when it was accepted there', () => {
    const t = setup();
    const seen: Array<ConsentDecision | null> = [];
    t.consent.subscribe((decision) => seen.push(decision));

    fromAnotherTab(t, 'granted');

    expect(t.consent.getDecision()).toBe('granted');
    expect(googleScripts(t.doc)).toHaveLength(1);
    expect(t.win[DISABLE_FLAG]).toBe(false);
    expect(seen).toEqual(['granted']);
  });

  it('stops analytics here and clears cookies when it was withdrawn there', () => {
    const t = setup({ stored: 'granted' });
    t.doc.plantCookie('_ga');

    fromAnotherTab(t, 'denied');

    expect(t.consent.getDecision()).toBe('denied');
    expect(t.win[DISABLE_FLAG]).toBe(true);
    expect(cookieNames(t.doc)).toEqual([]);
  });

  it.each([
    ['removed', null],
    ['replaced by an unrecognised value', 'maybe'],
  ])('stops analytics here and asks again when the decision was %s there', (_label, newValue) => {
    const t = setup({ stored: 'granted' });
    const seen: Array<ConsentDecision | null> = [];
    t.consent.subscribe((decision) => seen.push(decision));

    fromAnotherTab(t, newValue);

    expect(t.consent.getDecision()).toBeNull();
    expect(t.win[DISABLE_FLAG]).toBe(true);
    expect(seen).toEqual([null]);
  });

  it('stops analytics here when site data was cleared there (key is null)', () => {
    const t = setup({ stored: 'granted' });

    fromAnotherTab(t, null, null);

    expect(t.consent.getDecision()).toBeNull();
    expect(t.win[DISABLE_FLAG]).toBe(true);
  });

  it('ignores changes to unrelated keys', () => {
    const t = setup({ stored: 'granted' });

    fromAnotherTab(t, 'dark', 'theme');

    expect(t.consent.getDecision()).toBe('granted');
    expect(t.win[DISABLE_FLAG]).toBe(false);
  });

  it('ignores events from a different storage area, such as sessionStorage.clear()', () => {
    const t = setup({ stored: 'granted' });

    t.win.emit('storage', { key: null, newValue: null, storageArea: new FakeStorage() });

    expect(t.consent.getDecision()).toBe('granted');
    expect(t.win[DISABLE_FLAG]).toBe(false);
  });
});

describe('a page restored from the back/forward cache', () => {
  // A cached page is frozen and receives no `storage` events, so the stored decision can change
  // behind its back. Every load fires `pageshow`; only a restore has `persisted` set.
  const restored = (t: ReturnType<typeof setup>) => t.win.emit('pageshow', { persisted: true });
  const changedWhileFrozen = (t: ReturnType<typeof setup>, value: string | null) => {
    if (value === null) t.storage.data.delete(ANALYTICS_CONSENT_STORAGE_KEY);
    else t.storage.data.set(ANALYTICS_CONSENT_STORAGE_KEY, value);
  };

  it('stops analytics when consent was withdrawn while it was frozen', () => {
    const t = setup({ stored: 'granted' });
    t.doc.plantCookie('_ga');
    const seen: Array<ConsentDecision | null> = [];
    t.consent.subscribe((decision) => seen.push(decision));
    changedWhileFrozen(t, 'denied');

    restored(t);

    expect(t.consent.getDecision()).toBe('denied');
    expect(t.win[DISABLE_FLAG]).toBe(true);
    expect(cookieNames(t.doc)).toEqual([]);
    expect(queued(t.win).at(-1)).toEqual([
      'consent',
      'update',
      {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      },
    ]);
    expect(seen).toEqual(['denied']);
  });

  it('starts analytics when consent was given while it was frozen', () => {
    const t = setup();
    changedWhileFrozen(t, 'granted');

    restored(t);

    expect(t.consent.getDecision()).toBe('granted');
    expect(googleScripts(t.doc)).toHaveLength(1);
    expect(t.win[DISABLE_FLAG]).toBe(false);
  });

  it('stops analytics and asks again when the record was removed while it was frozen', () => {
    const t = setup({ stored: 'granted' });
    changedWhileFrozen(t, null);

    restored(t);

    expect(t.consent.getDecision()).toBeNull();
    expect(t.win[DISABLE_FLAG]).toBe(true);
  });

  it('leaves everything alone when nothing changed', () => {
    const t = setup({ stored: 'granted' });
    const seen: Array<ConsentDecision | null> = [];
    t.consent.subscribe((decision) => seen.push(decision));
    const queuedBefore = queued(t.win).length;

    restored(t);

    expect(t.consent.getDecision()).toBe('granted');
    expect(googleScripts(t.doc)).toHaveLength(1);
    expect(queued(t.win)).toHaveLength(queuedBefore);
    expect(seen).toEqual([]);
  });

  it('ignores an ordinary page load, which also fires pageshow', () => {
    const t = setup({ stored: 'granted' });
    changedWhileFrozen(t, 'denied');

    t.win.emit('pageshow', { persisted: false });

    expect(t.consent.getDecision()).toBe('granted');
    expect(t.win[DISABLE_FLAG]).toBe(false);
  });

  it('keeps the choice made on this page when storage is unavailable', () => {
    const win = new FakeWindow();
    const doc = new FakeDocument();
    const consent = createAnalyticsConsent({ measurementId: ID, storage: null, win, doc })!;
    consent.grant();

    win.emit('pageshow', { persisted: true });

    expect(consent.getDecision()).toBe('granted');
    expect(googleScripts(doc)).toHaveLength(1);
    expect(win[DISABLE_FLAG]).toBe(false);
  });
});

describe('when browser storage is unavailable', () => {
  it('still honours an acceptance for the current page', () => {
    const doc = new FakeDocument();
    const consent = createAnalyticsConsent({
      measurementId: ID,
      storage: null,
      win: new FakeWindow(),
      doc,
    })!;

    consent.grant();

    expect(consent.getDecision()).toBe('granted');
    expect(googleScripts(doc)).toHaveLength(1);
  });

  it('does not fail when the decision cannot be written', () => {
    const { consent, storage, doc } = setup();
    storage.writeFails = true;

    expect(() => consent.grant()).not.toThrow();
    expect(consent.getDecision()).toBe('granted');
    expect(googleScripts(doc)).toHaveLength(1);
  });
});

describe('a missing or invalid measurement ID', () => {
  it.each([
    ['unset', undefined],
    ['empty', ''],
    ['a legacy UA- ID', 'UA-12345-1'],
    ['lowercase', 'G-abc123'],
    ['the .env.example placeholder', 'G-XXXXXXXXXX'],
  ])('creates no controller when the ID is %s, even if storage says granted', (_label, raw) => {
    const storage = new FakeStorage();
    storage.data.set(ANALYTICS_CONSENT_STORAGE_KEY, 'granted');
    const win = new FakeWindow();
    const doc = new FakeDocument();

    expect(createAnalyticsConsent({ measurementId: raw, storage, win, doc })).toBeNull();
    expect(googleScripts(doc)).toHaveLength(0);
    expect(win.dataLayer).toBeUndefined();
  });
});
