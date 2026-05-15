/**
 * Schema-level guarantees for demos.json. The happy path is exercised by the
 * import in src/i18n/demo.ts (which throws at module load on parse failure);
 * this file pins the negative cases so future schema changes don't silently
 * loosen the contract.
 */
import { describe, it, expect } from 'vitest';
import demosData from '../data/demos.json';
import { DemoEntrySchema, DemosFileSchema } from '../i18n/demo-schema';

const cloneFirstEntry = (): unknown => structuredClone(demosData[0]);

describe('DemosFileSchema', () => {
  it('parses the real demos.json', () => {
    expect(() => DemosFileSchema.parse(demosData)).not.toThrow();
  });
});

describe('DemoEntrySchema rejections', () => {
  it('rejects an uppercase slug', () => {
    const entry = cloneFirstEntry() as { identity: { slug: string } };
    entry.identity.slug = 'INVALID-Upper';
    const result = DemoEntrySchema.safeParse(entry);
    expect(result.success).toBe(false);
  });

  it('rejects a non-github.com link', () => {
    const entry = cloneFirstEntry() as { identity: { github: string } };
    entry.identity.github = 'https://gitlab.com/foo/bar';
    const result = DemoEntrySchema.safeParse(entry);
    expect(result.success).toBe(false);
  });

  it('rejects an unknown icon name', () => {
    const entry = cloneFirstEntry() as { identity: { icon: string } };
    entry.identity.icon = 'definitely-not-an-icon';
    const result = DemoEntrySchema.safeParse(entry);
    expect(result.success).toBe(false);
  });

  it('rejects a missing default-locale copy', () => {
    const entry = cloneFirstEntry() as { copy: Record<string, unknown> };
    delete entry.copy.en;
    const result = DemoEntrySchema.safeParse(entry);
    expect(result.success).toBe(false);
  });

  it('rejects an empty tags array on identity when no copy fallback provides tags', () => {
    const entry = cloneFirstEntry() as {
      identity: { tags?: string[] };
      copy: Record<string, { tags?: string[] }>;
    };
    entry.identity.tags = [];
    for (const locale of Object.keys(entry.copy)) delete entry.copy[locale].tags;
    const result = DemoEntrySchema.safeParse(entry);
    expect(result.success).toBe(false);
  });

  it('accepts tags defined per-locale instead of identity', () => {
    const entry = cloneFirstEntry() as {
      identity: { tags?: string[] };
      copy: Record<string, { tags?: string[] }>;
    };
    delete entry.identity.tags;
    for (const locale of Object.keys(entry.copy)) entry.copy[locale].tags = ['Per-locale'];
    const result = DemoEntrySchema.safeParse(entry);
    expect(result.success).toBe(true);
  });
});
