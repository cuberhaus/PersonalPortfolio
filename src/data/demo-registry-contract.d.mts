export declare const BACKEND_STACKS: readonly [
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
];

export declare const ORCHESTRATOR_TYPES: readonly ['compose', 'run', 'process'];

export type BackendStack = (typeof BACKEND_STACKS)[number];
export type OrchestratorType = (typeof ORCHESTRATOR_TYPES)[number];

export interface DemoOrchestrator {
  displayName: string;
  type: OrchestratorType;
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
  stack: BackendStack;
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

export interface OrchestratedDemoServiceProjection {
  slug: string;
  type: OrchestratorType;
  displayName: string;
  port: number;
  composeFile: string | null;
  makefile: string | null;
  image: string | null;
  extra: string;
  container: string | null;
}

export declare const registrySchema: {
  parse(value: unknown): DemoServiceRegistry;
};

export declare function parseDemoRegistry(value: unknown): DemoServiceRegistry;

export declare function projectOrchestratedServices(
  registry: DemoServiceRegistry
): OrchestratedDemoServiceProjection[];

export declare function collectBackendPorts(registry: DemoServiceRegistry): number[];
