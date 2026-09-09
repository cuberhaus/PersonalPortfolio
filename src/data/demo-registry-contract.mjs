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
  iframeUrl: z.string().nullable(),
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
  });
});

export const registrySchema = z.object({
  version: z.number().int().nonnegative(),
  services: servicesSchema,
});

export function parseDemoRegistry(value) {
  return registrySchema.parse(value);
}
