import registry from './demo-services.json';

export type BackendStack =
  | 'fastapi'
  | 'django'
  | 'flask'
  | 'spring'
  | 'sveltekit'
  | 'qwik'
  | 'ember'
  | 'rust'
  | 'go'
  | 'php'
  | 'node';

export interface DemoBackend {
  container: string | null;
  port: number;
  /**
   * Additional host ports that the backend binds to but doesn't surface as
   * the iframe URL — e.g. Draculin's Django API on :8889 alongside the
   * Flutter UI nginx on :8890. Included by `listAllBackendPorts()` so the
   * Makefile's `free-ports` target sees every port the backend can occupy.
   */
  extraPorts?: number[];
  iframeUrl: string | null;
  composeFile: string | null;
  makefile: string | null;
  stack: BackendStack;
  needsSentry: boolean;
  notes?: string;
  /**
   * Hint strings rendered by `<LiveAppEmbed>` when the backend isn't
   * reachable. The component falls back to these defaults when the page
   * doesn't pass `dockerCmd` / `devCmd` props explicitly.
   */
  dockerCmd?: string;
  devCmd?: string;
}

export interface DemoService {
  slug: string;
  page: string | null;
  component: string | null;
  hasBackend: boolean;
  backend?: DemoBackend;
}

export interface DemoServiceRegistry {
  version: number;
  services: DemoService[];
}

const REGISTRY = registry as unknown as DemoServiceRegistry;

export function listDemoServices(): readonly DemoService[] {
  return REGISTRY.services;
}

export function getDemoService(slug: string): DemoService | undefined {
  return REGISTRY.services.find((s) => s.slug === slug);
}

export function getIframeUrl(slug: string): string | null {
  const svc = getDemoService(slug);
  return svc?.backend?.iframeUrl ?? null;
}

/**
 * Run-hint strings shown by `<LiveAppEmbed>` when the backend is offline.
 * Pulled from the registry so the docker/dev incantations live in one place.
 */
export function getRunHints(slug: string): { dockerCmd?: string; devCmd?: string } {
  const svc = getDemoService(slug);
  const backend = svc?.backend;
  if (!backend) return {};
  return {
    dockerCmd: backend.dockerCmd,
    devCmd: backend.devCmd,
  };
}

export function listBackedSlugs(): readonly string[] {
  return REGISTRY.services.filter((s) => s.hasBackend && s.backend?.container).map((s) => s.slug);
}

export function listAllowedIframeOrigins(): readonly string[] {
  const origins = new Set<string>();
  for (const svc of REGISTRY.services) {
    const url = svc.backend?.iframeUrl;
    if (!url) continue;
    try {
      origins.add(new URL(url).origin);
    } catch {}
  }
  return Array.from(origins);
}

/**
 * Ports of every backend that should participate in distributed tracing
 * (i.e. has a Sentry SDK init hook). Used by `sentry.client.config.ts` to
 * build `tracePropagationTargets` so the registry stays the single source
 * of truth — adding a backend in the JSON automatically propagates trace
 * headers to it without editing the Sentry config.
 *
 * Static-frontend demos (`needsSentry: false`) are excluded because the
 * iframe forwarder, not the parent's fetch, is responsible for their
 * telemetry.
 */
export function listTracedBackendPorts(): readonly number[] {
  const ports = new Set<number>();
  for (const svc of REGISTRY.services) {
    const port = svc.backend?.port;
    const traced = svc.backend?.needsSentry ?? false;
    if (typeof port === 'number' && traced) ports.add(port);
  }
  return Array.from(ports).sort((a, b) => a - b);
}

/**
 * All host ports any backend may bind to (primary `port` + `extraPorts`).
 * Used by the `Makefile`'s `free-ports` target and any port-conflict tooling
 * so the registry stays the single source of truth for the port universe.
 */
export function listAllBackendPorts(): readonly number[] {
  const ports = new Set<number>();
  for (const svc of REGISTRY.services) {
    if (typeof svc.backend?.port === 'number') ports.add(svc.backend.port);
    for (const extra of svc.backend?.extraPorts ?? []) ports.add(extra);
  }
  return Array.from(ports).sort((a, b) => a - b);
}

/**
 * Slug + port pairs for every service that has both a backend and a portfolio
 * page (i.e. excludes `planner-api`). Used by `e2e/live-demos.spec.ts` to
 * decide which iframes to probe.
 */
export function listLivePortfolioBackends(): readonly {
  slug: string;
  port: number;
  iframeUrl: string;
  displayName: string;
}[] {
  const out: { slug: string; port: number; iframeUrl: string; displayName: string }[] = [];
  for (const svc of REGISTRY.services) {
    if (!svc.hasBackend || !svc.page) continue;
    const port = svc.backend?.port;
    const iframeUrl = svc.backend?.iframeUrl;
    const displayName =
      (svc.backend as { orchestrator?: { displayName?: string } } | undefined)?.orchestrator
        ?.displayName ?? svc.slug;
    if (typeof port !== 'number' || !iframeUrl) continue;
    out.push({ slug: svc.slug, port, iframeUrl, displayName });
  }
  return out;
}
