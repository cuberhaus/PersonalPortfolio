import registry from './demo-services.json' with { type: 'json' };
import { parseDemoRegistry } from './demo-registry-contract.mjs';
import type {
  DemoOrchestrator,
  DemoService,
  DemoServiceRegistry,
} from './demo-registry-contract.mjs';

export type {
  BackendStack,
  DemoBackend,
  DemoOrchestrator,
  DemoService,
  DemoServiceRegistry,
} from './demo-registry-contract.mjs';

export function parseDemoServiceRegistry(value: unknown): DemoServiceRegistry {
  return parseDemoRegistry(value);
}

const REGISTRY = parseDemoServiceRegistry(registry);

export interface OrchestratedDemoService {
  slug: string;
  port: number;
  type: DemoOrchestrator['type'];
  displayName: string;
  extra: string;
  image?: string;
  composeFile: string | null;
  makefile: string | null;
  container: string | null;
}

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

export function listOrchestratedServices(): readonly OrchestratedDemoService[] {
  return REGISTRY.services.flatMap((service) => {
    const backend = service.backend;
    const orchestrator = backend?.orchestrator;
    if (!backend || !service.hasBackend || !orchestrator) return [];
    return [
      {
        slug: service.slug,
        port: backend.port,
        type: orchestrator.type,
        displayName: orchestrator.displayName,
        extra: orchestrator.extra,
        image: orchestrator.image,
        composeFile: backend.composeFile,
        makefile: backend.makefile,
        container: backend.container,
      },
    ];
  });
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
    const displayName = svc.backend?.orchestrator?.displayName ?? svc.slug;
    if (typeof port !== 'number' || !iframeUrl) continue;
    out.push({ slug: svc.slug, port, iframeUrl, displayName });
  }
  return out;
}
