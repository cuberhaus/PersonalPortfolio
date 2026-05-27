import { z } from 'zod';
import { ICON_PATHS } from '../lib/demo-icons';
import { LOCALES, DEFAULT_LOCALE } from '../config/locales';

const iconNames = Object.keys(ICON_PATHS) as [string, ...string[]];
const localeValues = LOCALES as unknown as [string, ...string[]];

const githubUrl = z.string().regex(/^https:\/\/github\.com\//, {
  message: 'Must be a https://github.com/ URL',
});

const CopySchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1),
  lead: z.string().optional(),
  badge: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  aboutTitle: z.string().optional(),
  aboutDescription: z.string().optional(),
  hints: z.array(z.string()).optional(),
  // Tags can live here per-locale (e.g. translated taxonomy) or in identity.
  tags: z.array(z.string().min(1)).min(1).optional(),
});

const IdentitySchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, {
    message: 'slug must be lowercase letters, digits, or hyphens',
  }),
  hidden: z.boolean().optional(),
  // Tags may live here (shared across locales) or in `copy[locale].tags`.
  // Cross-field check enforced by the entry-level refinement below.
  tags: z.array(z.string().min(1)).min(1).optional(),
  icon: z.enum(iconNames),
  github: z.union([githubUrl, z.array(githubUrl).min(1)]),
  image: z.string(),
  title: z.string().min(1).optional(),
  badge: z.string().optional(),
  metaTitle: z.string().optional(),
  accent: z
    .object({
      from: z.string(),
      to: z.string(),
    })
    .optional(),
});

export const DemoEntrySchema = z
  .object({
    identity: IdentitySchema,
    copy: z.record(z.enum(localeValues), CopySchema),
  })
  .refine((entry) => entry.copy[DEFAULT_LOCALE] !== undefined, {
    message: `Each demo's copy must include the default locale "${DEFAULT_LOCALE}"`,
    path: ['copy', DEFAULT_LOCALE],
  })
  .refine(
    (entry) => {
      const def = entry.copy[DEFAULT_LOCALE];
      if (!def) return true;
      const hasIdentityTitle = typeof entry.identity.title === 'string';
      const hasCopyTitle = typeof def.title === 'string';
      return hasIdentityTitle || hasCopyTitle;
    },
    { message: 'A demo must have a title in identity or in default-locale copy' }
  )
  .refine(
    (entry) => {
      if (entry.identity.tags && entry.identity.tags.length > 0) return true;
      // Otherwise every locale present must carry its own tags array.
      return Object.values(entry.copy).every(
        (copy) => Array.isArray(copy?.tags) && (copy?.tags?.length ?? 0) > 0
      );
    },
    {
      message:
        'Tags must be defined on identity, or every present locale must include its own tags',
      path: ['identity', 'tags'],
    }
  );

export const DemosFileSchema = z.array(DemoEntrySchema);

export type DemoEntry = z.infer<typeof DemoEntrySchema>;
export type DemoCopy = z.infer<typeof CopySchema>;
export type DemoIdentity = z.infer<typeof IdentitySchema>;
