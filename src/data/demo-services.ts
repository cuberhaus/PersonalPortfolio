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
