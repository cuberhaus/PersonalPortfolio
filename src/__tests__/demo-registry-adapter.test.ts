import { describe, expect, it } from 'vitest';
import {
  listAllBackendPorts,
  listOrchestratedServices,
  loadDemoRegistry,
} from '../../scripts/demo-registry.mjs';
import type {
  DemoServiceRegistry,
  OrchestratedDemoService,
} from '../../scripts/demo-registry.d.mts';

describe('Node demo registry adapter', () => {
  it('validates and loads the registry before exposing projections', () => {
    const registry: DemoServiceRegistry = loadDemoRegistry();

    expect(registry.services.length).toBeGreaterThan(0);
    expect(new Set(registry.services.map((service) => service.slug)).size).toBe(
      registry.services.length
    );
  });

  it('projects orchestrator rows and unique backend ports', () => {
    const orchestrators: OrchestratedDemoService[] = listOrchestratedServices();
    const ports = listAllBackendPorts();

    expect(orchestrators.find((service) => service.slug === 'tenda')).toMatchObject({
      type: 'compose',
      displayName: 'Tenda Online',
      port: 8888,
    });
    expect(ports).toContain(8888);
    expect(ports).toEqual([...new Set(ports)].sort((a, b) => a - b));
  });
});
