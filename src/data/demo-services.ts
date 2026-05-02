import registry from "./demo-services.json";

export type BackendStack =
  | "fastapi"
  | "django"
  | "flask"
  | "spring"
  | "sveltekit"
  | "qwik"
  | "ember"
  | "rust"
  | "go"
  | "php"
  | "node";

export interface DemoBackend {
  container: string | null;
  port: number;
  iframeUrl: string | null;
  composeFile: string | null;
  makefile: string | null;
  stack: BackendStack;
  needsSentry: boolean;
  notes?: string;
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

export function listBackedSlugs(): readonly string[] {
  return REGISTRY.services
    .filter((s) => s.hasBackend && s.backend?.container)
    .map((s) => s.slug);
}

export function listAllowedIframeOrigins(): readonly string[] {
  const origins = new Set<string>();
  for (const svc of REGISTRY.services) {
    const url = svc.backend?.iframeUrl;
    if (!url) continue;
    try {
      origins.add(new URL(url).origin);
    } catch {
    }
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
    if (typeof port === "number" && traced) ports.add(port);
  }
  return Array.from(ports).sort((a, b) => a - b);
}
