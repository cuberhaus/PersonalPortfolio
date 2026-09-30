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
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, sep } from 'path';
import { ANALYTICS_CONSENT_STORAGE_KEY, parseMeasurementId } from '../lib/analytics-consent';

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

describe('the scan itself', () => {
  it('walks the real source tree (a broken walk would make every guard below pass vacuously)', () => {
    expect(scannedFiles.length).toBeGreaterThan(100);
    expect(scannedFiles).toContain(CONSENT_MODULE);
    expect(scannedFiles).toContain('src/layouts/Layout.astro');
    for (const file of TESTS_ABOUT_GOOGLE) expect(scannedFiles, file).toContain(file);
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

describe('every page shell mounts the consent UI', () => {
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

      it('imports the Analytics component', () => {
        expect(source).toMatch(/import Analytics from '\.\.\/components\/Analytics\.astro'/);
      });

      it('renders it exactly once, inside <body>', () => {
        expect(body.match(/<Analytics\s*\/>/g) ?? []).toHaveLength(1);
      });

      it('renders it only when a measurement ID is configured', () => {
        // Astro attaches a component's <script> to every page that renders it,
        // even when it prints nothing, so an ungated <Analytics /> would make
        // every page of an unconfigured build fetch the consent loader.
        expect(source).toMatch(
          /import \{ ANALYTICS_MEASUREMENT_ID \} from '\.\.\/config\/analytics'/
        );
        expect(body).toMatch(/\{\s*ANALYTICS_MEASUREMENT_ID\s*&&\s*<Analytics\s*\/>\s*\}/);
      });

      it('never renders it inside <head>', () => {
        expect(head.length).toBeGreaterThan(0);
        expect(head).not.toMatch(/<Analytics[\s/>]/);
      });
    });
  }
});

describe('.env.example', () => {
  it('documents PUBLIC_GA_ID with a placeholder that enables nothing when copied verbatim', () => {
    const line = read('.env.example')
      .split(/\r?\n/)
      .find((candidate) => /^#?\s*PUBLIC_GA_ID=/.test(candidate));
    expect(line, '.env.example documents PUBLIC_GA_ID').toBeDefined();
    const sample = line!.replace(/^#?\s*PUBLIC_GA_ID=/, '').trim();
    expect(sample).not.toBe('');
    expect(parseMeasurementId(sample)).toBeNull();
  });
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
