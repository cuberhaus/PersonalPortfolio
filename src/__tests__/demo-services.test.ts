import { describe, it, expect } from 'vitest';
import {
  getDemoService,
  getIframeUrl,
  listAllowedIframeOrigins,
  listBackedSlugs,
  listDemoServices,
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
});
