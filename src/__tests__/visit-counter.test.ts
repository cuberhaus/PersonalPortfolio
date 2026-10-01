/**
 * Seam for the cookieless visit counter (src/lib/visit-counter.ts).
 *
 * Same approach as analytics-consent.test.ts: drive the module through its public interface with
 * small injected fakes (window, document) and assert only what the counting service or the
 * visitor could observe — which requests left the browser, what they carried, and that nothing
 * was left behind in the browser (no cookie, no storage write).
 */
import { describe, expect, it } from 'vitest';
import {
  countEndpoint,
  createVisitCounter,
  parseSiteCode,
  startVisitCounter,
} from '../lib/visit-counter';

const CODE = 'pol-test';
const ENDPOINT = 'https://pol-test.goatcounter.com/count';

/**
 * A browser stand-in. It records every request, storage write and listener, and lets a test move
 * the page around. The fake page deliberately carries private-looking data (query string, fragment,
 * title) so a leak would show up in what is sent.
 */
function makeBrowser() {
  const sent: string[] = [];
  const images: Array<{ src: string }> = [];
  const writes: string[] = [];
  const listeners = new Map<string, Set<() => void>>();
  const storage = { skip: null as string | null, readFails: false };

  const location = {
    hostname: 'portfolio.example.com',
    pathname: '/',
    protocol: 'https:',
    search: '?token=secret-token',
    hash: '#secret-fragment',
  };

  const navigator = {
    webdriver: false as boolean | undefined,
    // A real sendBeacon throws "Illegal invocation" when it is called detached from navigator.
    sendBeacon(this: unknown, url: string): boolean {
      if (this !== navigator) throw new TypeError('Illegal invocation');
      sent.push(url);
      return true;
    },
  };

  const doc = {
    referrer: '',
    title: 'Secret page title',
    visibilityState: 'visible',
    prerendering: false,
    addEventListener(type: string, listener: () => void): void {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)?.add(listener);
    },
    removeEventListener(type: string, listener: () => void): void {
      listeners.get(type)?.delete(listener);
    },
    createElement(_tag: 'img'): { src: string } {
      const image = { src: '' };
      images.push(image);
      return image;
    },
    // The counter must never touch cookies; any write lands in `writes`.
    get cookie(): string {
      return '';
    },
    set cookie(value: string) {
      writes.push(`cookie=${value}`);
    },
  };

  const win = {
    location,
    screen: { width: 1440 },
    navigator,
    localStorage: {
      getItem(key: string): string | null {
        if (storage.readFails) throw new Error('storage blocked');
        return key === 'skipgc' ? storage.skip : null;
      },
      setItem(key: string): void {
        writes.push(`localStorage.setItem(${key})`);
      },
      removeItem(key: string): void {
        writes.push(`localStorage.removeItem(${key})`);
      },
    },
    self: undefined as unknown,
    top: undefined as unknown,
    goatcounter: undefined as { allow_local?: boolean } | undefined,
  };
  win.self = win;
  win.top = win;

  return {
    win,
    doc,
    location,
    navigator,
    storage,
    sent,
    images,
    writes,
    /** Dispatch an event on the document, as the browser or Astro would. */
    fire(type: string): void {
      for (const listener of [...(listeners.get(type) ?? [])]) listener();
    },
    listenerCount(type: string): number {
      return listeners.get(type)?.size ?? 0;
    },
  };
}

type Browser = ReturnType<typeof makeBrowser>;

// No default for `code`: a default parameter would silently replace an `undefined` under test.
const counterWithCode = (browser: Browser, code: unknown) =>
  createVisitCounter({ code, win: browser.win, doc: browser.doc });
const counterFor = (browser: Browser) => counterWithCode(browser, CODE);

/** Build the counter, count the current page once, and return the browser for inspection. */
function countOnce(configure: (browser: Browser) => void = () => {}): Browser {
  const browser = makeBrowser();
  configure(browser);
  counterFor(browser)?.countCurrentPage();
  return browser;
}

const query = (url: string): Record<string, string> =>
  Object.fromEntries(new URL(url).searchParams.entries());
const requestedPaths = (browser: Browser) => browser.sent.map((url) => query(url).p);

describe('parseSiteCode', () => {
  it.each(['pol', 'pol-portfolio', 'a1', 'x1y2z3', 'a'.repeat(50)])('accepts %j', (code) => {
    expect(parseSiteCode(code)).toBe(code);
  });

  it('trims surrounding whitespace, as build tooling often leaves some', () => {
    expect(parseSiteCode('  pol-portfolio\n')).toBe('pol-portfolio');
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['a number', 42],
    ['an empty string', ''],
    ['whitespace only', '   '],
    ['a single character', 'a'],
    ['51 characters', 'a'.repeat(51)],
    ['a leading hyphen', '-pol'],
    ['a trailing hyphen', 'pol-'],
    ['an uppercase letter', 'Pol'],
    ['a space', 'pol portfolio'],
    ['a dot (it would change the host)', 'pol.evil'],
    ['a slash', 'pol/evil'],
    ['an @ (it would change the host)', 'evil@pol'],
    ['a full URL', 'https://pol.goatcounter.com'],
    ['an underscore', 'pol_portfolio'],
    ['non-ASCII letters', 'pol-ñandú'],
    ['the documented placeholder', '<your-site-code>'],
  ])('rejects %s', (_label, code) => {
    expect(parseSiteCode(code)).toBeNull();
  });
});

describe('countEndpoint', () => {
  it('is the hosted GoatCounter /count endpoint for the site code', () => {
    expect(countEndpoint(CODE)).toBe(ENDPOINT);
  });
});

describe('createVisitCounter', () => {
  it.each([undefined, '', 'Not Valid', '<your-site-code>'])(
    'does nothing without a valid site code (%j)',
    (code) => {
      const browser = makeBrowser();

      expect(counterWithCode(browser, code)).toBeNull();
      expect(browser.sent).toEqual([]);
      expect(browser.images).toEqual([]);
      expect(browser.listenerCount('visibilitychange')).toBe(0);
    }
  );
});

describe('what one page view sends', () => {
  it('is the page path, the screen width and a cache-buster — to the site endpoint', () => {
    const browser = countOnce((b) => {
      b.location.pathname = '/demos/sbc-ia/';
    });

    expect(browser.sent).toHaveLength(1);
    const url = new URL(browser.sent[0]);
    expect(`${url.origin}${url.pathname}`).toBe(ENDPOINT);
    expect(Object.keys(query(browser.sent[0])).sort()).toEqual(['p', 'rnd', 's']);
    expect(query(browser.sent[0])).toMatchObject({ p: '/demos/sbc-ia/', s: '1440' });
    expect(query(browser.sent[0]).rnd).toMatch(/^[a-z0-9]+$/);
  });

  it('never carries the query string, the fragment, the page title or the visitor’s storage', () => {
    const browser = countOnce();

    const everything = decodeURIComponent(browser.sent.join(' '));
    expect(everything).not.toMatch(/secret|token/i);
  });

  it('percent-encodes the path once, so the service decodes it back to the real path', () => {
    const browser = countOnce((b) => {
      b.location.pathname = '/es/dem%C3%B3/a%20b/';
    });

    // GoatCounter decodes the query once; the path (already encoded by the browser) is encoded again.
    expect(browser.sent[0]).toContain('p=%2Fes%2Fdem%25C3%25B3%2Fa%2520b%2F');
  });

  it('sends no screen width when the browser reports none', () => {
    const browser = countOnce((b) => {
      b.win.screen.width = 0;
    });

    expect(query(browser.sent[0])).not.toHaveProperty('s');
  });
});

describe('what is not counted', () => {
  it.each([
    'localhost',
    'dev.localhost',
    '127.0.0.1',
    '10.1.2.3',
    '172.16.0.9',
    '172.31.255.1',
    '192.168.0.10',
    '0.0.0.0',
    '[::1]',
  ])('a page served from %s (development)', (hostname) => {
    const browser = countOnce((b) => {
      b.location.hostname = hostname;
    });

    expect(browser.sent).toEqual([]);
    expect(browser.images).toEqual([]);
  });

  it.each([
    'polcasacubertagil.com',
    'cuberhaus.github.io',
    '172.15.0.1',
    '172.32.0.1',
    '8.8.8.8',
    'notlocalhost.example.com',
  ])('is not fooled into skipping the real host %s', (hostname) => {
    const browser = countOnce((b) => {
      b.location.hostname = hostname;
    });

    expect(browser.sent).toHaveLength(1);
  });

  it('a page opened from disk', () => {
    const browser = countOnce((b) => {
      b.location.protocol = 'file:';
      b.location.hostname = '';
    });

    expect(browser.sent).toEqual([]);
  });

  it('a development page counts when the same opt-in switch GoatCounter uses is set', () => {
    const browser = countOnce((b) => {
      b.location.hostname = 'localhost';
      b.win.goatcounter = { allow_local: true };
    });

    expect(requestedPaths(browser)).toEqual(['/']);
  });

  it('a page embedded in a frame', () => {
    const browser = countOnce((b) => {
      b.win.top = {};
    });

    expect(browser.sent).toEqual([]);
  });

  it('the owner’s own browser, when it has opted out with the skipgc flag', () => {
    const browser = countOnce((b) => {
      b.storage.skip = 't';
    });

    expect(browser.sent).toEqual([]);
  });

  it.each(['f', '1', 'true', ''])(
    'a browser whose skipgc flag is %j (only "t" opts out)',
    (value) => {
      const browser = countOnce((b) => {
        b.storage.skip = value;
      });

      expect(browser.sent).toHaveLength(1);
    }
  );

  it('still counts when the browser blocks storage, since that is no reason to lose the view', () => {
    const browser = countOnce((b) => {
      b.storage.readFails = true;
    });

    expect(browser.sent).toHaveLength(1);
  });
});

describe('the same page is counted once', () => {
  it('ignores repeated notifications for the same path', () => {
    const browser = makeBrowser();
    const counter = counterFor(browser)!;

    counter.countCurrentPage();
    counter.countCurrentPage();

    expect(requestedPaths(browser)).toEqual(['/']);
  });

  it('counts each new path, and a return to an earlier page counts again', () => {
    const browser = makeBrowser();
    const counter = counterFor(browser)!;

    counter.countCurrentPage();
    browser.location.pathname = '/es/';
    counter.countCurrentPage();
    browser.location.pathname = '/';
    counter.countCurrentPage();

    expect(requestedPaths(browser)).toEqual(['/', '/es/', '/']);
  });

  it('does not count a change that only touches the fragment or the query string', () => {
    const browser = makeBrowser();
    const counter = counterFor(browser)!;

    counter.countCurrentPage();
    browser.location.hash = '#projects';
    browser.location.search = '?lang=ca';
    counter.countCurrentPage();

    expect(requestedPaths(browser)).toEqual(['/']);
  });
});

describe('where the visitor came from', () => {
  it('sends an external referrer as origin and path only', () => {
    const browser = countOnce((b) => {
      b.doc.referrer = 'https://news.example.org/post/1?utm_source=x&email=a%40b.c#frag';
    });

    expect(query(browser.sent[0]).r).toBe('https://news.example.org/post/1');
  });

  it('keeps the app scheme of an app referrer instead of reporting a null origin', () => {
    const browser = countOnce((b) => {
      b.doc.referrer = 'android-app://com.google.android.gm/';
    });

    expect(query(browser.sent[0]).r).toBe('android-app://com.google.android.gm/');
  });

  it.each([
    ['no referrer', ''],
    ['a referrer on the same site', 'https://portfolio.example.com/es/'],
    ['something that is not a URL', 'not a url'],
  ])('sends none for %s', (_label, referrer) => {
    const browser = countOnce((b) => {
      b.doc.referrer = referrer;
    });

    expect(query(browser.sent[0])).not.toHaveProperty('r');
  });

  it('describes only the first view; later views were reached from this site', () => {
    const browser = makeBrowser();
    browser.doc.referrer = 'https://news.example.org/post/1';
    const counter = counterFor(browser)!;

    counter.countCurrentPage();
    browser.location.pathname = '/es/';
    counter.countCurrentPage();

    expect(query(browser.sent[0]).r).toBe('https://news.example.org/post/1');
    expect(query(browser.sent[1])).not.toHaveProperty('r');
  });
});

describe('automated browsers announce themselves', () => {
  it('sends no bot hint for an ordinary browser', () => {
    expect(query(countOnce().sent[0])).not.toHaveProperty('b');
  });

  it.each([
    ['navigator.webdriver (Playwright, Selenium, Puppeteer)', '153'],
    ['a PhantomJS global', '150'],
    ['a Nightmare global', '151'],
    ['a Selenium document marker', '152'],
  ])('flags %s as bot code %s', (label, code) => {
    const browser = countOnce((b) => {
      if (label.startsWith('navigator.webdriver')) b.navigator.webdriver = true;
      if (label.startsWith('a PhantomJS')) Object.assign(b.win, { callPhantom: () => {} });
      if (label.startsWith('a Nightmare')) Object.assign(b.win, { __nightmare: {} });
      if (label.startsWith('a Selenium')) Object.assign(b.doc, { __selenium_unwrapped: true });
    });

    expect(query(browser.sent[0]).b).toBe(code);
  });

  it('reports the more specific marker when several are present', () => {
    const browser = countOnce((b) => {
      b.navigator.webdriver = true;
      Object.assign(b.win, { _phantom: {} });
    });

    expect(query(browser.sent[0]).b).toBe('150');
  });
});

describe('waiting until the visitor can see the page', () => {
  it('counts a page opened in the background only once it becomes visible, and only once', () => {
    const browser = makeBrowser();
    browser.doc.visibilityState = 'hidden';
    counterFor(browser)!.countCurrentPage();
    expect(browser.sent).toEqual([]);

    browser.fire('visibilitychange'); // still hidden
    expect(browser.sent).toEqual([]);

    browser.doc.visibilityState = 'visible';
    browser.fire('visibilitychange');
    browser.fire('visibilitychange');

    expect(requestedPaths(browser)).toEqual(['/']);
    expect(browser.listenerCount('visibilitychange')).toBe(0);
  });

  it('counts a prerendered page when it is activated, not while it is prerendering', () => {
    const browser = makeBrowser();
    browser.doc.prerendering = true;
    browser.doc.visibilityState = 'hidden';
    counterFor(browser)!.countCurrentPage();
    expect(browser.sent).toEqual([]);

    browser.doc.prerendering = false;
    browser.doc.visibilityState = 'visible';
    browser.fire('prerenderingchange');

    expect(requestedPaths(browser)).toEqual(['/']);
  });

  it('treats a prerendering document as unseen even if the engine reports it as visible', () => {
    const browser = makeBrowser();
    browser.doc.prerendering = true;
    counterFor(browser)!.countCurrentPage();
    expect(browser.sent).toEqual([]);

    browser.doc.prerendering = false;
    browser.fire('prerenderingchange');

    expect(requestedPaths(browser)).toEqual(['/']);
  });

  it('counts the page the visitor ends up on, not the one that was waiting', () => {
    const browser = makeBrowser();
    browser.doc.visibilityState = 'hidden';
    const counter = counterFor(browser)!;
    counter.countCurrentPage();
    browser.location.pathname = '/es/';
    counter.countCurrentPage();
    expect(browser.listenerCount('visibilitychange')).toBe(1);

    browser.doc.visibilityState = 'visible';
    browser.fire('visibilitychange');

    expect(requestedPaths(browser)).toEqual(['/es/']);
  });

  it('does not wait around for pages that would never be counted', () => {
    const browser = makeBrowser();
    browser.doc.visibilityState = 'hidden';
    browser.location.hostname = 'localhost';

    counterFor(browser)!.countCurrentPage();

    expect(browser.listenerCount('visibilitychange')).toBe(0);
  });
});

describe('how the request leaves the browser', () => {
  it('uses sendBeacon, called on navigator, and no image', () => {
    const browser = countOnce();

    expect(browser.sent).toHaveLength(1);
    expect(browser.images).toEqual([]);
  });

  it.each([
    [
      'the beacon is refused',
      (b: Browser) => {
        b.navigator.sendBeacon = () => false;
      },
    ],
    [
      'the beacon throws',
      (b: Browser) => {
        b.navigator.sendBeacon = () => {
          throw new Error('blocked');
        };
      },
    ],
    [
      'the browser has no beacon',
      (b: Browser) => {
        delete (b.navigator as { sendBeacon?: unknown }).sendBeacon;
      },
    ],
  ])('falls back to a one-pixel image when %s', (_label, configure) => {
    const browser = countOnce(configure);

    expect(browser.images).toHaveLength(1);
    expect(browser.images[0].src.startsWith(`${ENDPOINT}?`)).toBe(true);
    expect(query(browser.images[0].src)).toMatchObject({ p: '/', s: '1440' });
  });

  it('never lets a blocked request break the page', () => {
    const browser = makeBrowser();
    browser.navigator.sendBeacon = () => {
      throw new Error('blocked');
    };
    browser.doc.createElement = () => {
      throw new Error('blocked');
    };

    expect(() => counterFor(browser)!.countCurrentPage()).not.toThrow();
  });
});

describe('what stays behind in the browser', () => {
  it('nothing: no cookie and no storage write, through a visit with navigation', () => {
    const browser = makeBrowser();
    browser.doc.referrer = 'https://news.example.org/';
    const counter = startVisitCounter({ code: CODE, win: browser.win, doc: browser.doc })!;
    browser.location.pathname = '/es/';
    browser.fire('astro:page-load');
    counter.countCurrentPage();

    expect(browser.sent.length).toBeGreaterThan(1);
    expect(browser.writes).toEqual([]);
  });
});

describe('startVisitCounter', () => {
  it('counts the page at once, then each Astro client-side navigation', () => {
    const browser = makeBrowser();

    expect(startVisitCounter({ code: CODE, win: browser.win, doc: browser.doc })).not.toBeNull();
    expect(requestedPaths(browser)).toEqual(['/']);

    // Astro also announces the initial load; that must not count the page twice.
    browser.fire('astro:page-load');
    expect(requestedPaths(browser)).toEqual(['/']);

    browser.location.pathname = '/es/';
    browser.fire('astro:page-load');
    browser.location.pathname = '/ca/';
    browser.fire('astro:page-load');

    expect(requestedPaths(browser)).toEqual(['/', '/es/', '/ca/']);
  });

  it('registers nothing and sends nothing without a valid site code', () => {
    const browser = makeBrowser();

    expect(startVisitCounter({ code: 'nope!', win: browser.win, doc: browser.doc })).toBeNull();
    expect(browser.listenerCount('astro:page-load')).toBe(0);
    expect(browser.sent).toEqual([]);
  });
});
