import { afterEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  getDemoService,
  getHostedApp,
  getIframeUrl,
  listAllowedIframeOrigins,
  listBackedSlugs,
  listDemoServices,
  listOrchestratedServices,
  listTracedBackendPorts,
} from '../data/demo-services';

const services = listDemoServices();

describe('demo service helpers', () => {
  it('returns services with unique non-empty slugs', () => {
    const slugs = services.map((service) => service.slug);

    expect(slugs.length).toBeGreaterThan(0);
    expect(slugs.every((slug) => slug.trim().length > 0)).toBe(true);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('looks up registered services by slug', () => {
    const service = getDemoService('tenda');

    expect(service).toBeDefined();
    expect(service?.slug).toBe('tenda');
    expect(service?.hasBackend).toBe(true);
  });

  it('returns undefined for unknown slugs', () => {
    expect(getDemoService('missing-demo')).toBeUndefined();
  });

  it('resolves iframe URLs from the registry', () => {
    expect(getIframeUrl('tenda')).toBe('http://localhost:8888');
    expect(getIframeUrl('missing-demo')).toBeNull();
  });

  it('lists only backed slugs with concrete containers', () => {
    const expected = services
      .filter((service) => service.hasBackend && service.backend?.container)
      .map((service) => service.slug);

    expect(listBackedSlugs()).toEqual(expected);
    expect(listBackedSlugs()).not.toContain('prop');
  });

  it('lists unique iframe origins from valid registry URLs', () => {
    const expected = new Set(
      services
        .map((service) => service.backend?.iframeUrl)
        .filter((url): url is string => Boolean(url))
        .map((url) => new URL(url).origin)
    );

    const origins = listAllowedIframeOrigins();
    expect(new Set(origins)).toEqual(expected);
    expect(new Set(origins).size).toBe(origins.length);
    expect(origins.every((origin) => origin.startsWith('http://localhost'))).toBe(true);
  });

  it('lists traced backend ports sorted and deduplicated', () => {
    const expected = [
      ...new Set(
        services
          .filter((service) => service.backend?.needsSentry)
          .map((service) => service.backend?.port)
          .filter((port): port is number => typeof port === 'number')
      ),
    ].sort((a, b) => a - b);

    const ports = listTracedBackendPorts();
    expect(ports).toEqual(expected);
    expect(ports).toEqual([...ports].sort((a, b) => a - b));
    expect(new Set(ports).size).toBe(ports.length);
  });

  it('projects orchestrator configuration without exposing raw backend shape', () => {
    const tenda = listOrchestratedServices().find((service) => service.slug === 'tenda');

    expect(tenda).toMatchObject({
      slug: 'tenda',
      type: 'compose',
      displayName: 'Tenda Online',
      port: 8888,
      extra: '',
    });
    expect(listOrchestratedServices().every((service) => service.displayName.length > 0)).toBe(
      true
    );
  });
});

describe('hosted demo services', () => {
  it('exposes the hosted live app only for services that declare one', () => {
    expect(getHostedApp('sbc-ia')).toMatchObject({ enabled: expect.any(Boolean) });
    expect(getHostedApp('tenda')).toBeNull();
    expect(getHostedApp('missing-demo')).toBeNull();
  });

  it('ships every declared hosted live app switched off until it has a URL', () => {
    for (const service of services) {
      const hosted = service.backend?.hosted;
      if (!hosted) continue;
      expect(hosted.url !== null || hosted.enabled === false, service.slug).toBe(true);
    }
  });
});

describe('hosted demo services stay out of request-header allowlists', () => {
  const hostedFixture = {
    version: 1,
    services: [
      {
        slug: 'pilot',
        page: 'src/pages/demos/pilot.astro',
        component: null,
        hasBackend: true,
        backend: {
          container: 'pilot-1',
          port: 9100,
          iframeUrl: 'http://localhost:9100',
          hosted: { url: 'https://pilot.example.com', enabled: true },
          composeFile: 'docker-compose.yml',
          makefile: null,
          stack: 'fastapi',
          needsSentry: true,
          orchestrator: { displayName: 'Pilot', type: 'compose', extra: '' },
        },
      },
    ],
  };

  afterEach(() => {
    vi.doUnmock('../data/demo-services.json');
    vi.resetModules();
  });

  it('never adds a hosted origin to the iframe allowlist or the traced ports', async () => {
    vi.resetModules();
    vi.doMock('../data/demo-services.json', () => ({ default: hostedFixture }));
    const adapter = await import('../data/demo-services');

    expect(adapter.getHostedApp('pilot')).toEqual({
      url: 'https://pilot.example.com',
      enabled: true,
    });
    // A custom request header (X-Session-Id, sentry-trace) on the hosted origin
    // would turn the /health poll into a preflighted CORS request.
    expect(adapter.listAllowedIframeOrigins()).toEqual(['http://localhost:9100']);
    expect(adapter.listTracedBackendPorts()).toEqual([9100]);
  });

  it('keeps the header-injecting consumers on the local projections only', () => {
    const root = resolve(__dirname, '..', '..');
    const consumers = [
      'sentry.client.config.ts',
      'src/lib/debug-network.ts',
      'src/lib/debug-iframe.ts',
    ];

    for (const file of consumers) {
      const source = readFileSync(resolve(root, file), 'utf-8');
      expect(source, `${file} must not read hosted origins`).not.toMatch(/getHostedApp|\.hosted\b/);
    }
  });
});
