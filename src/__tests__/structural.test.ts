/**
 * Structural: do separate source files that should agree with each other
 * actually agree? (file-level source parsing)
 *
 * These tests read raw .astro/.ts source files and parse them to verify
 * cross-file invariants — e.g. that the icon set used by Demos.astro,
 * DemoNav.astro, and demo-icons.ts all match the slugs in demos.json;
 * that navbar anchors correspond to real section IDs; and that every demo
 * page passes its correct slug to DemoLayout.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import demosEn from '../data/demos.json';
import { ICON_PATHS } from '../lib/demo-icons';

const SRC = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf-8');

// ─── Icon parity: Demos.astro ↔ DemoNav.astro ──────────────────

describe('Icon parity: demo-icons.ts covers all demos.json icons', () => {
  const sharedIcons = Object.keys(ICON_PATHS).sort();
  const jsonIcons = [...new Set(demosEn.map(d => d.icon))].sort();

  it('demo-icons.ts has an entry for every icon used in demos.json', () => {
    for (const icon of jsonIcons) {
      expect(sharedIcons, `demo-icons.ts missing icon "${icon}"`).toContain(icon);
    }
  });

  it('Demos.astro imports renderIconSvg from demo-icons', () => {
    const src = read('components/Demos.astro');
    expect(src).toContain("from '../lib/demo-icons'");
  });

  it('DemoNav.astro imports renderIconSvg from demo-icons', () => {
    const src = read('components/DemoNav.astro');
    expect(src).toContain("from '../lib/demo-icons'");
  });
});

// ─── Navbar anchors ↔ homepage section IDs ──────────────────────

describe('Navbar anchors match homepage section IDs', () => {
  const navbar = read('components/Navbar.astro');
  const navAnchors = [...navbar.matchAll(/href:\s*'#(\w+)'/g)].map(m => m[1]).sort();

  const sectionComponents = [
    'components/Hero.astro',
    'components/About.astro',
    'components/Demos.astro',
    'components/Skills.astro',
    'components/Experience.astro',
    'components/WorkProjects.astro',
    'components/Education.astro',
    'components/Contact.astro',
  ];

  const sectionIds = sectionComponents
    .map(f => read(f))
    .flatMap(src => [...src.matchAll(/\bid="([a-z][\w-]*)"/g)].map(m => m[1]))
    .filter(id => !['name', 'email', 'message', 'navbar'].includes(id))
    .sort();

  it('every navbar anchor points to a real section ID', () => {
    for (const anchor of navAnchors) {
      expect(sectionIds, `navbar links to #${anchor} but no section has that id`).toContain(anchor);
    }
  });

  it('hero section ID exists (logo links to #hero)', () => {
    expect(sectionIds).toContain('hero');
  });
});

// ─── Every demo page passes slug to DemoLayout ──────────────────

describe('Demo pages pass correct slug to DemoLayout', () => {
  const pagesDir = join(SRC, 'pages', 'demos');
  const pageFiles = readdirSync(pagesDir).filter(f => f.endsWith('.astro'));

  for (const file of pageFiles) {
    const slug = file.replace('.astro', '');
    it(`${file} passes slug="${slug}" to DemoLayout`, () => {
      const content = readFileSync(join(pagesDir, file), 'utf-8');
      expect(content).toContain(`slug="${slug}"`);
    });
  }
});
