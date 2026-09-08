import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const REGISTRY_PATH = fileURLToPath(new URL('../src/data/demo-services.json', import.meta.url));
const BACKEND_STACKS = new Set([
  'fastapi',
  'django',
  'flask',
  'spring',
  'sveltekit',
  'qwik',
  'ember',
  'rust',
  'go',
  'php',
  'node',
]);
const ORCHESTRATOR_TYPES = new Set(['compose', 'run', 'process']);

/**
 * @typedef {{ displayName: string, type: 'compose'|'run'|'process', extra: string, image?: string }} DemoOrchestrator
 * @typedef {{ container: string|null, port: number, extraPorts?: number[], iframeUrl: string|null, composeFile: string|null, makefile: string|null, stack: string, needsSentry: boolean, notes?: string, dockerCmd?: string, devCmd?: string, orchestrator?: DemoOrchestrator }} DemoBackend
 * @typedef {{ slug: string, page: string|null, component: string|null, hasBackend: boolean, backend?: DemoBackend }} DemoService
 * @typedef {{ version: number, services: DemoService[] }} DemoServiceRegistry
 * @typedef {{ slug: string, type: 'compose'|'run'|'process', displayName: string, port: number, composeFile: string, makefile: string, image: string, extra: string, container: string }} OrchestratedDemoService
 */

function assertString(value, path) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${path} must be a non-empty string`);
  }
}

/** @param {DemoServiceRegistry} registry */
function validateRegistry(registry) {
  if (!registry || typeof registry !== 'object' || !Array.isArray(registry.services)) {
    throw new Error('demo-services.json must contain a services array');
  }

  const slugs = new Set();
  for (const [index, service] of registry.services.entries()) {
    const path = `services[${index}]`;
    assertString(service.slug, `${path}.slug`);
    if (slugs.has(service.slug)) throw new Error(`duplicate demo slug: ${service.slug}`);
    slugs.add(service.slug);
    if (typeof service.hasBackend !== 'boolean') {
      throw new Error(`${path}.hasBackend must be boolean`);
    }
    if (service.page !== null && typeof service.page !== 'string') {
      throw new Error(`${path}.page must be a string or null`);
    }
    if (!service.backend) continue;

    const backend = service.backend;
    if (!Number.isInteger(backend.port) || backend.port <= 0) {
      throw new Error(`${path}.backend.port must be a positive integer`);
    }
    if (!BACKEND_STACKS.has(backend.stack)) {
      throw new Error(`${path}.backend.stack is not supported: ${backend.stack}`);
    }
    if (backend.orchestrator) {
      assertString(backend.orchestrator.displayName, `${path}.backend.orchestrator.displayName`);
      if (!ORCHESTRATOR_TYPES.has(backend.orchestrator.type)) {
        throw new Error(
          `${path}.backend.orchestrator.type is not supported: ${backend.orchestrator.type}`
        );
      }
      if (typeof backend.orchestrator.extra !== 'string') {
        throw new Error(`${path}.backend.orchestrator.extra must be a string`);
      }
    }
  }
  return registry;
}

/** @returns {DemoServiceRegistry} */
export function loadDemoRegistry() {
  return validateRegistry(JSON.parse(readFileSync(REGISTRY_PATH, 'utf8')));
}

/** @returns {DemoService[]} */
export function listPageServices() {
  return loadDemoRegistry().services.filter((service) => service.page !== null);
}

/** @returns {DemoService[]} */
export function listBackedServices() {
  return loadDemoRegistry().services.filter(
    (service) => service.hasBackend && Boolean(service.backend?.container)
  );
}

/** @returns {OrchestratedDemoService[]} */
export function listOrchestratedServices() {
  return loadDemoRegistry().services.flatMap((service) => {
    const backend = service.backend;
    const orchestrator = backend?.orchestrator;
    if (!service.hasBackend || !backend || !orchestrator) return [];
    return [
      {
        slug: service.slug,
        type: orchestrator.type,
        displayName: orchestrator.displayName,
        port: backend.port,
        composeFile: backend.composeFile ?? '',
        makefile: backend.makefile ?? '',
        image: orchestrator.image ?? '',
        extra: orchestrator.extra,
        container: backend.container ?? '',
      },
    ];
  });
}

/** @returns {number[]} */
export function listAllBackendPorts() {
  const ports = new Set();
  for (const service of loadDemoRegistry().services) {
    if (!service.backend) continue;
    ports.add(service.backend.port);
    for (const extra of service.backend.extraPorts ?? []) ports.add(extra);
  }
  return [...ports].sort((a, b) => a - b);
}

function printOrchestrators() {
  for (const service of listOrchestratedServices()) {
    process.stdout.write(
      [
        service.slug,
        service.type,
        service.displayName,
        service.port,
        service.composeFile,
        service.makefile,
        service.image,
        service.extra,
        service.container,
      ].join('\t') + '\n'
    );
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const command = process.argv[2];
  if (command === '--ports') {
    process.stdout.write(listAllBackendPorts().join(' ') + '\n');
  } else if (command === '--orchestrators') {
    printOrchestrators();
  } else {
    throw new Error('Usage: demo-registry.mjs --ports | --orchestrators');
  }
}
