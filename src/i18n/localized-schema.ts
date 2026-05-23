import { z, type ZodObject, type ZodRawShape, type ZodTypeAny } from 'zod';
import { LOCALES, DEFAULT_LOCALE } from '../config/locales';

const localeValues = LOCALES as unknown as [string, ...string[]];

/**
 * Wraps an identity schema and a copy schema in the canonical
 * `{ identity, copy: Record<locale, Copy> }` envelope shared by demos.json,
 * skills.json, work_projects.json, education.json, and certifications.json.
 *
 * The default locale is required to be present in `copy`; other locales are
 * optional. Mirrors the same refinement that demo-schema.ts uses for demos.
 *
 * Use this factory at the module top level — the returned schema can be
 * wrapped in `z.array(...)` for the file-level shape.
 */
export function localizedEntrySchema<I extends ZodRawShape, C extends ZodRawShape>(
  identitySchema: ZodObject<I>,
  copySchema: ZodObject<C>
): ZodTypeAny {
  return z
    .object({
      identity: identitySchema,
      copy: z.record(z.enum(localeValues), copySchema),
    })
    .refine((entry) => entry.copy[DEFAULT_LOCALE] !== undefined, {
      message: `Each entry's copy must include the default locale "${DEFAULT_LOCALE}"`,
      path: ['copy', DEFAULT_LOCALE],
    });
}

/** File-level shape: an array of localized entries. */
export function localizedFileSchema<I extends ZodRawShape, C extends ZodRawShape>(
  identitySchema: ZodObject<I>,
  copySchema: ZodObject<C>
): ZodTypeAny {
  return z.array(localizedEntrySchema(identitySchema, copySchema));
}
