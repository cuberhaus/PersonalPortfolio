import { describe, expect, it } from 'vitest';
import {
  listAllBackendPorts as listBrowserBackendPorts,
  listOrchestratedServices as listBrowserOrchestratedServices,
  listDemoServices,
  parseDemoServiceRegistry,
} from '../data/demo-services';
import {
  collectBackendPorts,
  projectOrchestratedServices,
} from '../data/demo-registry-contract.mjs';
import {
  listAllBackendPorts,
  listOrchestratedServices,
  loadDemoRegistry,
  parseDemoRegistry as parseNodeDemoRegistry,
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

  it('keeps browser and Node projections semantically aligned', () => {
    const registry = loadDemoRegistry();
    const canonicalOrchestrators = projectOrchestratedServices(registry);
    const canonicalPorts = collectBackendPorts(registry);

    expect(listBrowserBackendPorts()).toEqual(canonicalPorts);
    expect(listBrowserOrchestratedServices()).toEqual(canonicalOrchestrators);
    expect(listAllBackendPorts()).toEqual(canonicalPorts);
    expect(listOrchestratedServices()).toEqual(
      canonicalOrchestrators.map((service) => ({
        ...service,
        image: service.image ?? '',
        composeFile: service.composeFile ?? '',
        makefile: service.makefile ?? '',
        container: service.container ?? '',
      }))
    );
    expect(listDemoServices().map((service) => service.slug)).toEqual(
      loadDemoRegistry().services.map((service) => service.slug)
    );
  });

  it('keeps browser and Node adapters on the same complete contract', () => {
    const validRegistry = {
      version: 1,
      services: [
        {
          slug: 'planner',
          page: null,
          component: null,
          hasBackend: true,
          backend: {
            container: null,
            port: 9000,
            extraPorts: [],
            iframeUrl: null,
            composeFile: null,
            makefile: null,
            stack: 'fastapi',
            needsSentry: false,
            orchestrator: {
              displayName: 'Planner',
              type: 'process',
              extra: '',
            },
          },
        },
      ],
    };
    const incompleteRegistry = {
      version: 1,
      services: [
        {
          slug: 'broken',
          page: null,
          component: null,
          hasBackend: true,
          backend: { container: null, port: 9000, stack: 'fastapi', needsSentry: false },
        },
      ],
    };
    const duplicateRegistry = {
      ...validRegistry,
      services: [validRegistry.services[0], { ...validRegistry.services[0] }],
    };
    const mismatchedBackendRegistry = {
      ...validRegistry,
      services: [{ ...validRegistry.services[0], hasBackend: false }],
    };
    const invalidOrchestratorRegistry = {
      ...validRegistry,
      services: [
        {
          ...validRegistry.services[0],
          backend: {
            ...validRegistry.services[0].backend,
            container: 'planner-1',
            composeFile: 'docker-compose.yml',
            orchestrator: { displayName: 'Planner', type: 'process', extra: '' },
          },
        },
      ],
    };

    expect(parseDemoServiceRegistry(validRegistry)).toEqual(validRegistry);
    expect(parseNodeDemoRegistry(validRegistry)).toEqual(validRegistry);
    expect(parseDemoServiceRegistry(validRegistry).services[0].backend?.container).toBeNull();
    expect(() => parseDemoServiceRegistry(incompleteRegistry)).toThrow();
    expect(() => parseNodeDemoRegistry(incompleteRegistry)).toThrow();
    expect(() => parseDemoServiceRegistry(duplicateRegistry)).toThrow();
    expect(() => parseNodeDemoRegistry(duplicateRegistry)).toThrow();
    expect(() => parseDemoServiceRegistry(mismatchedBackendRegistry)).toThrow();
    expect(() => parseNodeDemoRegistry(mismatchedBackendRegistry)).toThrow();
    expect(() => parseDemoServiceRegistry(invalidOrchestratorRegistry)).toThrow();
    expect(() => parseNodeDemoRegistry(invalidOrchestratorRegistry)).toThrow();
  });
});
