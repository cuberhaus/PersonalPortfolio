/**
 * Source guard for consent-first analytics (issue #13, seam 3).
 *
 * The behaviour itself is proven in a real browser by e2e/analytics-consent.spec.ts, but that
 * project needs its own build of the site. These file-level checks run in the fast unit gate and
 * catch the classic regressions the moment they are typed:
 *
 *   - a raw Google tag pasted into a layout or component (it would load before consent),
 *   - a second place that reads PUBLIC_GA_ID (an ID configured while consent is bypassed),
 *   - a page shell that forgets the consent UI, or mounts it inside <head>,
 *   - the consent code coupling itself to Sentry (error telemetry stays a separate concern).
 *
 * The same file guards the cookieless visit counter (src/lib/visit-counter.ts), which runs without
 * asking: its service host lives in one module, nothing it ships can write a cookie or storage,
 * and it never depends on the consent decision.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, sep } from 'path';
import { ANALYTICS_CONSENT_STORAGE_KEY, parseMeasurementId } from '../lib/analytics-consent';
import { parseSiteCode } from '../lib/visit-counter';

const REPO = join(__dirname, '..', '..');
const posix = (path: string) => path.split(sep).join('/');
const read = (repoRelative: string) => readFileSync(join(REPO, repoRelative), 'utf-8');

/** Where first-party code lives. `public/` is scanned for scripts only: it also holds saved third-party pages. */
const SCAN_ROOTS: { dir: string; extensions: RegExp }[] = [
  { dir: 'src', extensions: /\.(astro|tsx?|jsx?|mjs|cjs|css|html?)$/ },
  { dir: 'scripts', extensions: /\.(tsx?|jsx?|mjs|cjs)$/ },
  { dir: 'e2e', extensions: /\.(tsx?|jsx?|mjs|cjs)$/ },
  { dir: 'public', extensions: /\.(jsx?|mjs|cjs)$/ },
];
const SCAN_FILES = ['astro.config.mjs', 'playwright.config.ts'];
const SKIPPED_DIRECTORIES = new Set(['node_modules', '.astro', 'dist']);

function walk(dir: string, extensions: RegExp): string[] {
  const absolute = join(REPO, dir);
  if (!existsSync(absolute)) return [];
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) {
      return SKIPPED_DIRECTORIES.has(entry.name) ? [] : walk(join(dir, entry.name), extensions);
    }
    return extensions.test(entry.name) ? [posix(join(dir, entry.name))] : [];
  });
}

const scannedFiles = [
  ...SCAN_ROOTS.flatMap(({ dir, extensions }) => walk(dir, extensions)),
  ...SCAN_FILES.filter((file) => existsSync(join(REPO, file))),
];

/** The one production module allowed to know Google's hosts, globals and IDs... */
const CONSENT_MODULE = 'src/lib/analytics-consent.ts';
/** ...plus the tests that must talk about them to prove the module works. */
const TESTS_ABOUT_GOOGLE = [
  'src/__tests__/analytics-consent.test.ts',
  'src/__tests__/analytics-source-guard.test.ts',
  'e2e/analytics-consent.spec.ts',
  'e2e/analytics-consent.setup.ts',
  'e2e/analytics-consent-site.ts',
];

const GOOGLE_TRACKING =
  /googletagmanager|google-analytics|analytics\.google|googleadservices|doubleclick|\bgtag\b|\bdataLayer\b|\bGTM-[A-Z0-9]{4,}\b|\bG-[A-Z0-9]{6,}\b/;

/** The one production module allowed to know the counting service's hosts... */
const VISIT_COUNTER_MODULE = 'src/lib/visit-counter.ts';
/** ...plus the tests that must talk about them to prove the module works. */
const TESTS_ABOUT_THE_COUNTER = [
  'src/__tests__/visit-counter.test.ts',
  'src/__tests__/analytics-source-guard.test.ts',
  'e2e/analytics-consent.spec.ts',
  'e2e/analytics-consent.setup.ts',
  'e2e/analytics-consent-site.ts',
];

/** GoatCounter's hosts, and the attribute of the copy-paste <script> snippet it hands out. */
const COUNTER_SERVICE = /goatcounter\.com|\bzgo\.at\b|data-goatcounter/i;

describe('the scan itself', () => {
  it('walks the real source tree (a broken walk would make every guard below pass vacuously)', () => {
    expect(scannedFiles.length).toBeGreaterThan(100);
    expect(scannedFiles).toContain(CONSENT_MODULE);
    expect(scannedFiles).toContain(VISIT_COUNTER_MODULE);
    expect(scannedFiles).toContain('src/layouts/Layout.astro');
    for (const file of TESTS_ABOUT_GOOGLE) expect(scannedFiles, file).toContain(file);
    for (const file of TESTS_ABOUT_THE_COUNTER) expect(scannedFiles, file).toContain(file);
  });
});

describe('Google is reachable only through the consent module', () => {
  it('no other file names a Google tracking host, global or ID', () => {
    const allowed = new Set([CONSENT_MODULE, ...TESTS_ABOUT_GOOGLE]);
    const offenders = scannedFiles.filter(
      (file) => !allowed.has(file) && GOOGLE_TRACKING.test(read(file))
    );
    expect(
      offenders,
      'Load Google only from src/lib/analytics-consent.ts, after an explicit opt-in'
    ).toEqual([]);
  });

  it('the consent module is where the tag URL lives', () => {
    expect(read(CONSENT_MODULE)).toContain('https://www.googletagmanager.com/gtag/js');
  });
});

describe('PUBLIC_GA_ID has a single reader', () => {
  const READS_MEASUREMENT_ID = /(?:import\.meta\.env|process\.env)(?:\.|\[\s*['"])PUBLIC_GA_ID/;

  it('only src/config/analytics.ts reads it, so the consent module can validate it once', () => {
    const readers = scannedFiles.filter((file) => READS_MEASUREMENT_ID.test(read(file)));
    expect(readers).toEqual(['src/config/analytics.ts']);
  });

  it('and hands it straight to parseMeasurementId', () => {
    expect(read('src/config/analytics.ts')).toMatch(
      /parseMeasurementId\(\s*import\.meta\.env\.PUBLIC_GA_ID\s*\)/
    );
  });
});

describe('the visit counter is reachable only through its module', () => {
  it('no other file names the counting service, so no vendor script or stray beacon sneaks in', () => {
    const allowed = new Set([VISIT_COUNTER_MODULE, ...TESTS_ABOUT_THE_COUNTER]);
    const offenders = scannedFiles.filter(
      (file) => !allowed.has(file) && COUNTER_SERVICE.test(read(file))
    );
    expect(offenders, 'Talk to the counting service only from src/lib/visit-counter.ts').toEqual(
      []
    );
  });

  it('the module is where the endpoint lives', () => {
    expect(read(VISIT_COUNTER_MODULE)).toContain('.goatcounter.com/count');
  });
});

describe('PUBLIC_GOATCOUNTER_CODE has a single reader', () => {
  const READS_SITE_CODE =
    /(?:import\.meta\.env|process\.env)(?:\.|\[\s*['"])PUBLIC_GOATCOUNTER_CODE/;

  it('only src/config/visit-counter.ts reads it, so the module can validate it once', () => {
    const readers = scannedFiles.filter((file) => READS_SITE_CODE.test(read(file)));
    expect(readers).toEqual(['src/config/visit-counter.ts']);
  });

  it('and hands it straight to parseSiteCode', () => {
    expect(read('src/config/visit-counter.ts')).toMatch(
      /parseSiteCode\(\s*import\.meta\.env\.PUBLIC_GOATCOUNTER_CODE\s*\)/
    );
  });
});

/**
 * What every page shell mounts. Astro attaches a component's <script> to every page that renders
 * it, even when it prints nothing, so an ungated component would make every page of an unconfigured
 * build fetch its loader: each one is rendered only when its build-time setting is valid.
 */
const MOUNTED_COMPONENTS = [
  { name: 'Analytics', gate: 'ANALYTICS_MEASUREMENT_ID', config: 'analytics' },
  { name: 'VisitCounter', gate: 'VISIT_COUNTER_CODE', config: 'visit-counter' },
] as const;

describe('every page shell mounts the consent UI and the visit counter', () => {
  const pageShells = scannedFiles.filter(
    (file) => file.endsWith('.astro') && /<html[\s>]/.test(read(file))
  );

  it('finds the layouts that own a document', () => {
    expect(pageShells).toEqual(['src/layouts/DemoLayout.astro', 'src/layouts/Layout.astro']);
  });

  for (const shell of pageShells) {
    describe(shell, () => {
      const source = read(shell);
      const head = source.slice(source.indexOf('<head'), source.indexOf('</head>'));
      const body = source.slice(source.indexOf('<body'));

      for (const { name, gate, config } of MOUNTED_COMPONENTS) {
        describe(name, () => {
          it(`imports the ${name} component`, () => {
            expect(source).toMatch(
              new RegExp(`import ${name} from '\\.\\./components/${name}\\.astro'`)
            );
          });

          it('renders it exactly once, inside <body>', () => {
            expect(body.match(new RegExp(`<${name}\\s*/>`, 'g')) ?? []).toHaveLength(1);
          });

          it('renders it only when its build-time setting is valid', () => {
            expect(source).toMatch(
              new RegExp(`import \\{ ${gate} \\} from '\\.\\./config/${config}'`)
            );
            expect(body).toMatch(new RegExp(`\\{\\s*${gate}\\s*&&\\s*<${name}\\s*/>\\s*\\}`));
          });

          it('never renders it inside <head>', () => {
            expect(head.length).toBeGreaterThan(0);
            expect(head).not.toMatch(new RegExp(`<${name}[\\s/>]`));
          });
        });
      }
    });
  }
});

describe('.env.example', () => {
  it.each([
    ['PUBLIC_GA_ID', parseMeasurementId],
    ['PUBLIC_GOATCOUNTER_CODE', parseSiteCode],
  ])(
    'documents %s with a placeholder that enables nothing when copied verbatim',
    (variable, parse) => {
      const prefix = new RegExp(`^#?\\s*${variable}=`);
      const line = read('.env.example')
        .split(/\r?\n/)
        .find((candidate) => prefix.test(candidate));
      expect(line, `.env.example documents ${variable}`).toBeDefined();
      const sample = line!.replace(prefix, '').trim();
      expect(sample).not.toBe('');
      expect(parse(sample)).toBeNull();
    }
  );
});

describe('deploy-time screenshots', () => {
  // The production build carries the consent banner. The OG cards are screenshots of that build, so
  // the capture script must arrive as a visitor who already said no: no banner in the image, and the
  // CI browser never loads Google either. (A .mjs script cannot import the TypeScript module, so the
  // key and value are duplicated there and pinned here.)
  const script = read('scripts/capture-og-images.mjs');

  it('uses the consent module’s storage key', () => {
    expect(script).toContain(`const CONSENT_STORAGE_KEY = '${ANALYTICS_CONSENT_STORAGE_KEY}'`);
  });

  it('seeds a denied choice on the browser context, before the first page is opened', () => {
    expect(script).toMatch(/\[\s*CONSENT_STORAGE_KEY,\s*'denied'\s*\]/);
    const seeded = script.indexOf('context.addInitScript(');
    expect(seeded, 'context.addInitScript is called').toBeGreaterThan(-1);
    expect(seeded).toBeLessThan(script.indexOf('for (const t of targets)'));
  });
});

describe('analytics consent stays separate from Sentry', () => {
  const CONSENT_CODE = [
    CONSENT_MODULE,
    'src/lib/analytics-consent-ui.ts',
    'src/config/analytics.ts',
    'src/components/Analytics.astro',
    'src/components/AnalyticsSettingsButton.astro',
  ];

  for (const file of CONSENT_CODE) {
    it(`${file} does not touch Sentry`, () => {
      expect(read(file)).not.toMatch(/sentry/i);
    });
  }
});

describe('the visit counter stays independent and leaves nothing in the browser', () => {
  const COUNTER_CODE = [
    VISIT_COUNTER_MODULE,
    'src/config/visit-counter.ts',
    'src/components/VisitCounter.astro',
  ];

  for (const file of COUNTER_CODE) {
    it(`${file} is not coupled to the consent flow or to Sentry`, () => {
      // It must keep counting whatever the visitor chose, and error telemetry is a separate concern.
      expect(read(file)).not.toMatch(/from\s+['"][^'"]*analytics-consent|sentry/i);
    });

    it(`${file} never writes a cookie or browser storage`, () => {
      // Reading the owner's opt-out flag is the only thing the counter may ask of the browser.
      expect(read(file)).not.toMatch(
        /document\.cookie|\.setItem\(|\.removeItem\(|\bsessionStorage\b|\bindexedDB\b|\bcookieStore\b/
      );
    });
  }
});

describe('the consent panel is honest about the counter', () => {
  const analyticsCopy = (locale: string) =>
    JSON.parse(read(`locales/${locale}/ui.json`)).analytics as Record<string, string>;

  it('Analytics.astro describes the counter only in builds that ship it', () => {
    // Otherwise a build with Google Analytics but no counter would promise something it does not do.
    expect(read('src/components/Analytics.astro')).toMatch(
      /VISIT_COUNTER_CODE\s*\?\s*'analytics\.descriptionWithCounter'\s*:\s*'analytics\.description'/
    );
  });

  for (const locale of ['en', 'es', 'ca']) {
    it(`/${locale}/: only the counter variant names the counter`, () => {
      const copy = analyticsCopy(locale);
      expect(copy.descriptionWithCounter).toContain('GoatCounter');
      expect(copy.description).not.toContain('GoatCounter');
    });

    it(`/${locale}/: every status string says the choice controls Google Analytics`, () => {
      // The counter is always on, so a bare "analytics is off" would mislead.
      const copy = analyticsCopy(locale);
      for (const key of ['title', 'statusDenied', 'statusGranted', 'savedDenied', 'savedGranted']) {
        expect(copy[key], `${locale}.analytics.${key}`).toContain('Google Analytics');
      }
    });
  }
});
