import type { DemoOrchestrator, DemoServiceRegistry } from '../src/data/demo-registry-contract.mjs';

export type {
  BackendStack,
  DemoBackend,
  DemoOrchestrator,
  DemoService,
  DemoServiceRegistry,
} from '../src/data/demo-registry-contract.mjs';

export function parseDemoRegistry(value: unknown): DemoServiceRegistry;

export interface OrchestratedDemoService {
  slug: string;
  type: DemoOrchestrator['type'];
  displayName: string;
  port: number;
  composeFile: string;
  makefile: string;
  image: string;
  extra: string;
  container: string;
}

export function loadDemoRegistry(): DemoServiceRegistry;
export function listPageServices(): DemoService[];
export function listBackedServices(): DemoService[];
export function listOrchestratedServices(): OrchestratedDemoService[];
export function listAllBackendPorts(): number[];
