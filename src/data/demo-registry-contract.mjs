import { z } from 'zod';

export const BACKEND_STACKS = [
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

export const ORCHESTRATOR_TYPES = ['compose', 'run', 'process'];

const orchestratorSchema = z.object({
  displayName: z.string().min(1),
  type: z.enum(ORCHESTRATOR_TYPES),
  extra: z.string(),
  image: z.string().optional(),
});

const backendSchema = z.object({
  container: z.string().nullable(),
  port: z.number().int().positive(),
  extraPorts: z.array(z.number().int().positive()).optional(),
  iframeUrl: z.string().url().nullable(),
  composeFile: z.string().nullable(),
  makefile: z.string().nullable(),
  stack: z.enum(BACKEND_STACKS),
  needsSentry: z.boolean(),
  notes: z.string().optional(),
  dockerCmd: z.string().optional(),
  devCmd: z.string().optional(),
  orchestrator: orchestratorSchema.optional(),
});

const serviceSchema = z.object({
  slug: z.string().min(1),
  page: z.string().nullable(),
  component: z.string().nullable(),
  hasBackend: z.boolean(),
  backend: backendSchema.optional(),
});

const servicesSchema = z.array(serviceSchema).superRefine((services, context) => {
  const seen = new Map();
  const seenPorts = new Map();
  services.forEach((service, index) => {
    const previousIndex = seen.get(service.slug);
    if (previousIndex !== undefined) {
      context.addIssue({
        code: 'custom',
        path: [index, 'slug'],
        message: `Duplicate demo service slug; first defined at index ${previousIndex}`,
      });
    } else {
      seen.set(service.slug, index);
    }

    const backend = service.backend;
    if (service.hasBackend !== Boolean(backend)) {
      context.addIssue({
        code: 'custom',
        path: [index, 'backend'],
        message: 'hasBackend must match whether a backend definition is present',
      });
    }

    if (!backend) return;

    if (service.page === null && backend.iframeUrl !== null) {
      context.addIssue({
        code: 'custom',
        path: [index, 'backend', 'iframeUrl'],
        message: 'A service without a portfolio page cannot expose an iframe URL',
      });
    }
    if (service.page !== null && backend.iframeUrl === null) {
      context.addIssue({
        code: 'custom',
        path: [index, 'backend', 'iframeUrl'],
        message: 'A page-backed service must expose an iframe URL',
      });
    }

    const ports = [backend.port, ...(backend.extraPorts ?? [])];
    const localPorts = new Set();
    for (const port of ports) {
      if (localPorts.has(port)) {
        context.addIssue({
          code: 'custom',
          path: [index, 'backend', 'extraPorts'],
          message: `Backend port ${port} is declared more than once for ${service.slug}`,
        });
      }
      localPorts.add(port);

      const previousPort = seenPorts.get(port);
      if (previousPort) {
        context.addIssue({
          code: 'custom',
          path: [index, 'backend', 'port'],
          message: `Backend port ${port} is already used by ${previousPort}`,
        });
      } else {
        seenPorts.set(port, service.slug);
      }
    }

    const orchestrator = backend.orchestrator;
    if (!orchestrator) {
      context.addIssue({
        code: 'custom',
        path: [index, 'backend', 'orchestrator'],
        message: 'A backend must declare how it is orchestrated',
      });
      return;
    }

    if (orchestrator.type === 'compose') {
      if (backend.container === null || backend.composeFile === null) {
        context.addIssue({
          code: 'custom',
          path: [index, 'backend', 'orchestrator', 'type'],
          message: 'Compose backends require a container and composeFile',
        });
      }
    } else if (orchestrator.type === 'run') {
      if (backend.container === null || backend.makefile === null || !orchestrator.image) {
        context.addIssue({
          code: 'custom',
          path: [index, 'backend', 'orchestrator', 'type'],
          message: 'Run backends require a container, makefile, and image',
        });
      }
    } else if (backend.container !== null || backend.composeFile !== null) {
      context.addIssue({
        code: 'custom',
        path: [index, 'backend', 'orchestrator', 'type'],
        message: 'Process backends cannot declare a container or composeFile',
      });
    }
  });
});

export const registrySchema = z.object({
  version: z.number().int().nonnegative(),
  services: servicesSchema,
});

export function parseDemoRegistry(value) {
  return registrySchema.parse(value);
}
