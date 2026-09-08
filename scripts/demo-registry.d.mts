export interface DemoOrchestrator {
  displayName: string;
  type: 'compose' | 'run' | 'process';
  extra: string;
  image?: string;
}

export interface DemoBackend {
  container: string | null;
  port: number;
  extraPorts?: number[];
  iframeUrl: string | null;
  composeFile: string | null;
  makefile: string | null;
  stack: string;
  needsSentry: boolean;
  notes?: string;
  dockerCmd?: string;
  devCmd?: string;
  orchestrator?: DemoOrchestrator;
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
