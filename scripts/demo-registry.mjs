import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  collectBackendPorts,
  parseDemoRegistry,
  projectOrchestratedServices,
} from '../src/data/demo-registry-contract.mjs';

const REGISTRY_PATH = fileURLToPath(new URL('../src/data/demo-services.json', import.meta.url));

/** @typedef {import('./demo-registry.d.mts').DemoServiceRegistry} DemoServiceRegistry */
/** @typedef {import('./demo-registry.d.mts').DemoService} DemoService */
/** @typedef {import('./demo-registry.d.mts').OrchestratedDemoService} OrchestratedDemoService */
/** @typedef {import('../src/data/demo-registry-contract.d.mts').DemoServiceRegistry} DemoServiceRegistry */

export { parseDemoRegistry };

/** @returns {DemoServiceRegistry} */
export function loadDemoRegistry() {
  return parseDemoRegistry(JSON.parse(readFileSync(REGISTRY_PATH, 'utf8')));
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
  return projectOrchestratedServices(loadDemoRegistry()).map((service) => ({
    ...service,
    composeFile: service.composeFile ?? '',
    makefile: service.makefile ?? '',
    image: service.image ?? '',
    container: service.container ?? '',
  }));
}

/** @returns {number[]} */
export function listAllBackendPorts() {
  return collectBackendPorts(loadDemoRegistry());
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
