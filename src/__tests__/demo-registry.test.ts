/**
 * Registry consistency: src/data/demo-services.json is the single source
 * of truth driving the orchestrator script, the in-page debug
 * subscribers, the log relay sidecar, and the onboarding doc. Diverge
 * any of those from the registry and this test fails fast.
 *
 * These checks intentionally read raw source files (no execution) so a
 * stale dev environment can't paper over a regression.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import {
  listDemoServices,
  type DemoService,
  type BackendStack,
} from '../data/demo-services';

const SRC = join(__dirname, '..');
const ROOT = resolve(SRC, '..');
const PARENT = resolve(ROOT, '..');

const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf-8');
const exists = (rel: string) => existsSync(join(ROOT, rel));

const services = listDemoServices();
const backed = services.filter((s) => s.hasBackend) as readonly Required<
  Pick<DemoService, 'slug' | 'hasBackend'>
>[] & readonly DemoService[];

describe('demo-services.json: schema & disk references', () => {
  it('every page path exists on disk (when set)', () => {
    for (const s of services) {
      if (!s.page) continue;
      expect(exists(s.page), `missing page for ${s.slug}: ${s.page}`).toBe(true);
    }
  });

  it('every component path exists on disk (when set)', () => {
    for (const s of services) {
      if (!s.component) continue;
      expect(exists(s.component), `missing component for ${s.slug}: ${s.component}`).toBe(true);
    }
  });

  it('hasBackend: true entries have container / port / stack', () => {
    for (const s of backed) {
      expect(s.backend, `backend missing on ${s.slug}`).toBeTruthy();
      const b = s.backend!;
      expect(typeof b.port, `${s.slug}.backend.port type`).toBe('number');
      expect(b.port, `${s.slug}.backend.port range`).toBeGreaterThan(0);
      expect(typeof b.stack, `${s.slug}.backend.stack type`).toBe('string');
      // container can be null for orchestrator-managed processes (e.g. PROP, planner-api).
    }
  });

  it('every backend port is unique across the registry', () => {
    const seen = new Map<number, string>();
    for (const s of backed) {
      const port = s.backend!.port;
      const prev = seen.get(port);
      expect(prev, `port ${port} reused: ${prev} and ${s.slug}`).toBeUndefined();
      seen.set(port, s.slug);
    }
  });

  it('compose / makefile paths resolve relative to monorepo when set', () => {
    for (const s of backed) {
      const b = s.backend!;
      const candidates: Array<[string, string | null | undefined]> = [
        ['composeFile', b.composeFile],
        ['makefile', b.makefile],
      ];
      for (const [field, val] of candidates) {
        if (!val) continue;
        // Paths starting with ../ reference sibling repos that only exist
        // in the local monorepo layout. Skip the check when those siblings
        // are absent (e.g. CI which checks out only PersonalPortfolio).
        if (val.startsWith('..')) {
          const abs = resolve(ROOT, val);
          const inParent = resolve(PARENT, val.replace(/^\.\.\//, ''));
          if (!existsSync(abs) && !existsSync(inParent)) continue;
        }
        const abs = val.startsWith('..') ? resolve(ROOT, val) : resolve(ROOT, val);
        const monoExists = existsSync(abs);
        const inParent = existsSync(resolve(PARENT, val.replace(/^\.\.\//, '')));
        expect(monoExists || inParent, `${s.slug}.backend.${field} not on disk: ${val}`).toBe(true);
      }
    }
  });
});

describe('demo-services.json ↔ src/pages/demos parity', () => {
  it('every src/pages/demos/*.astro has a matching registry entry', () => {
    const dir = join(SRC, 'pages', 'demos');
    const pages = readdirSync(dir).filter((f) => f.endsWith('.astro'));
    const slugs = new Set(services.map((s) => s.slug));
    for (const page of pages) {
      const slug = page.replace(/\.astro$/, '');
      expect(slugs, `pages/demos/${page} has no registry entry`).toContain(slug);
    }
  });

  it('every registry entry with a page exists under src/pages/demos', () => {
    const dir = join(SRC, 'pages', 'demos');
    const pages = new Set(readdirSync(dir).filter((f) => f.endsWith('.astro')));
    for (const s of services) {
      if (!s.page) continue;
      const filename = s.page.split('/').pop()!;
      expect(pages, `${s.slug}: page declared but missing on disk`).toContain(filename);
    }
  });
});

describe('demo-services.json ↔ scripts/dev-all-demos.sh parity', () => {
  const script = read('scripts/dev-all-demos.sh');

  it('orchestrator block reads from src/data/demo-services.json', () => {
    expect(script).toContain('demo-services.json');
  });

  it('every backed slug shows up either in `_compose_up`, `_docker_run`, or as planner-api/PROP', () => {
    const orchestrated = backed.filter((s) =>
      (s.backend as { orchestrator?: { type?: string } } | undefined)?.orchestrator?.type,
    );
    for (const s of orchestrated) {
      const b = s.backend as { orchestrator?: { displayName?: string; type?: string } };
      const display = b.orchestrator?.displayName ?? '';
      const type = b.orchestrator?.type ?? '';
      if (type === 'compose' || type === 'run') {
        // orchestrator displayName must appear verbatim in the script
        expect(script, `dev-all-demos.sh missing line for ${s.slug} (${display})`).toContain(display);
      }
    }
  });

  it('every backed port shows up in the script (or in the Makefile DEMO_PORTS list)', () => {
    const makefile = read('Makefile');
    for (const s of backed) {
      const port = String(s.backend!.port);
      const inScript = script.includes(`:${port}`) || script.includes(` ${port}`);
      const inMakefile = makefile.includes(port);
      expect(inScript || inMakefile, `port ${port} (${s.slug}) not referenced anywhere`).toBe(true);
    }
  });
});

describe('LiveAppEmbed call sites use slug, not literal URLs', () => {
  it('every <LiveAppEmbed/> in pages/components passes a slug prop', () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const p = join(dir, entry);
        const st = statSync(p);
        if (st.isDirectory()) walk(p);
        else if (/\.(astro|tsx)$/.test(entry)) {
          const src = readFileSync(p, 'utf-8');
          const usages = src.matchAll(/<LiveAppEmbed\b([\s\S]*?)\/>/g);
          for (const m of usages) {
            const props = m[1];
            const hasSlug = /\bslug\s*=\s*[{"']/m.test(props);
            const hasUrl = /\burl\s*=\s*[{"']/m.test(props);
            if (!hasSlug && hasUrl) offenders.push(`${p} (uses url= without slug=)`);
            if (!hasSlug && !hasUrl) offenders.push(`${p} (no slug or url)`);
          }
        }
      }
    };
    walk(join(SRC, 'pages', 'demos'));
    walk(join(SRC, 'components', 'demos'));
    expect(offenders, `LiveAppEmbed misuse:\n${offenders.join('\n')}`).toEqual([]);
  });
});

describe('docs/adding-a-demo.md mentions every backend stack', () => {
  it('mentions each unique stack from the registry', () => {
    const doc = read('docs/adding-a-demo.md').toLowerCase();
    const stacks = new Set<BackendStack>();
    for (const s of backed) stacks.add(s.backend!.stack);
    for (const stack of stacks) {
      expect(doc, `docs/adding-a-demo.md missing stack: ${stack}`).toContain(stack.toLowerCase());
    }
  });
});

describe('every backend with needsSentry: true references SENTRY_DSN on disk', () => {
  // For each stack, the "natural" places we accept Sentry wiring beyond
  // the registry-declared compose/makefile. The Rust crate, Spring POM,
  // SvelteKit hooks, and PHP includes are all valid integration points.
  const STACK_EXTRA_PATHS: Record<string, string[]> = {
    rust: ['../pracpro2/web/backend/Cargo.toml', '../pracpro2/web/backend/src/main.rs'],
    sveltekit: [
      '../Practica_de_Planificacion/web/package.json',
      '../Practica_de_Planificacion/web/src/hooks.server.ts',
    ],
    spring: [
      '../subgrup-prop7.1/web/pom.xml',
      '../subgrup-prop7.1/web/src/main/resources/application.properties',
    ],
    php: ['../tenda_online/includes/observability.php'],
    go: ['../joc_eda/web/backend-go/go.mod', '../joc_eda/web/backend-go/observability.go'],
  };

  it('has SENTRY_DSN visible in compose file, Makefile, or stack-natural path', () => {
    const missing: string[] = [];
    for (const s of backed) {
      const b = s.backend!;
      if (!b.needsSentry) continue;
      const sources: string[] = [];
      if (b.composeFile) sources.push(resolve(ROOT, b.composeFile));
      if (b.makefile) sources.push(resolve(ROOT, b.makefile));
      const extras = STACK_EXTRA_PATHS[b.stack] ?? [];
      for (const e of extras) sources.push(resolve(ROOT, e));
      let referenced = false;
      let anyAccessible = false;
      for (const src of sources) {
        if (!existsSync(src)) continue;
        anyAccessible = true;
        const content = readFileSync(src, 'utf-8');
        if (
          content.includes('SENTRY_DSN') ||
          content.includes('sentry-') ||
          content.includes('@sentry/') ||
          content.includes('sentry.init') ||
          content.includes('Sentry.init') ||
          content.includes('Sentry\\init') ||
          content.includes('sentry_sdk')
        ) {
          referenced = true;
          break;
        }
      }
      // If none of the source files exist on this machine, we can't
      // assert anything (e.g. CI without sibling repos checked out).
      // Skip silently in that case.
      if (anyAccessible && !referenced) {
        missing.push(s.slug);
      }
    }
    // Phase 14 is now rolled out across the 9 backend stacks. Strict
    // mode (`STRICT_SENTRY=1`) is the default for this assertion so
    // regressions surface early; CI can opt out by setting
    // `STRICT_SENTRY=0` if a sibling repo isn't checked out.
    if (process.env.STRICT_SENTRY !== '0') {
      expect(missing, `Sentry not referenced for: ${missing.join(', ')}`).toEqual([]);
    } else {
      expect(true).toBe(true);
    }
  });
});
