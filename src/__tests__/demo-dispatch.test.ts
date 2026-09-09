import { describe, expect, it } from 'vitest';
import { createDemoModuleLookup, getDemoSlugFromPath, listDemoSlugs } from '../lib/demo-dispatch';

describe('demo dispatch', () => {
  const modules = {
    '/src/pages/demos/algorithms.astro': { default: 'algorithms-component' },
    '/src/pages/demos/phase-transitions.astro': { default: 'phase-component' },
    '/src/pages/demos/not-a-page.txt': { default: 'ignored' },
  };

  it('extracts only Astro demo slugs from module paths', () => {
    expect(getDemoSlugFromPath('/src/pages/demos/algorithms.astro')).toBe('algorithms');
    expect(getDemoSlugFromPath('/src/pages/demos/not-a-page.txt')).toBeNull();
  });

  it('builds a lookup and leaves unknown slugs absent', () => {
    expect(createDemoModuleLookup(modules)).toEqual({
      algorithms: 'algorithms-component',
      'phase-transitions': 'phase-component',
    });
    expect(createDemoModuleLookup(modules).missing).toBeUndefined();
    expect(listDemoSlugs(modules)).toEqual(['algorithms', 'phase-transitions']);
  });
});
