/**
 * Schema-level guarantees for demos.json (identity-only format).
 * Validates the identity fields of each demo entry.
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import demosData from '../data/demos.json';
import { ICON_PATHS } from '../lib/demo-icons';

const iconNames = Object.keys(ICON_PATHS) as [string, ...string[]];

const githubUrl = z.string().regex(/^https:\/\/github\.com\//, {
  message: 'Must be a https://github.com/ URL',
});

const DemoIdentitySchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, {
    message: 'slug must be lowercase letters, digits, or hyphens',
  }),
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

const DemosFileSchema = z.array(DemoIdentitySchema);

const cloneFirstEntry = (): Record<string, unknown> =>
  structuredClone(demosData[0]) as Record<string, unknown>;

describe('DemosFileSchema', () => {
  it('parses the real demos.json', () => {
    expect(() => DemosFileSchema.parse(demosData)).not.toThrow();
  });
});

describe('Demo identity rejections', () => {
  it('rejects an uppercase slug', () => {
    const entry = cloneFirstEntry();
    entry.slug = 'INVALID-Upper';
    const result = DemoIdentitySchema.safeParse(entry);
    expect(result.success).toBe(false);
  });

  it('rejects a non-github.com link', () => {
    const entry = cloneFirstEntry();
    entry.github = 'https://gitlab.com/foo/bar';
    const result = DemoIdentitySchema.safeParse(entry);
    expect(result.success).toBe(false);
  });

  it('rejects an unknown icon name', () => {
    const entry = cloneFirstEntry();
    entry.icon = 'definitely-not-an-icon';
    const result = DemoIdentitySchema.safeParse(entry);
    expect(result.success).toBe(false);
  });
});
