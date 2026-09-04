/**
 * Structural: do separate source files that should agree with each other
 * actually agree? (file-level source parsing)
 *
 * These tests verify cross-file invariants — e.g. that the icon set used by
 * Demos.astro, DemoNav.astro, and demo-icons.ts all match the slugs in
 * demos.json; that navbar anchors correspond to real section IDs from the
 * sections SSOT; and that every demo page passes its correct slug to
 * DemoLayout.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { listDemos } from '../i18n/demo';
import { ICON_PATHS } from '../lib/demo-icons';
import { SECTION_META, SECTION_IDS } from '../config/section-ids';

const demosEn = listDemos('en', { includeHidden: true });

const SRC = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf-8');

// ─── Icon parity: Demos.astro ↔ DemoNav.astro ──────────────────

describe('Icon parity: demo-icons.ts covers all demos.json icons', () => {
  const sharedIcons = Object.keys(ICON_PATHS).sort();
  const jsonIcons = [...new Set(demosEn.map((d) => d.icon))].sort();

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

// ─── Navbar / homepage section invariants ───────────────────────

describe('Sections SSOT (src/config/sections.ts) drives the homepage', () => {
  it('leads with proof of work and keeps the primary navigation focused', () => {
    expect(SECTION_META.map((section) => section.id)).toEqual([
      'hero',
      'work',
      'projects',
      'about',
      'experience',
      'skills',
      'certifications',
      'education',
      'contact',
    ]);
    expect(SECTION_META.filter((section) => section.inNav).map((section) => section.id)).toEqual([
      'work',
      'projects',
      'about',
      'contact',
    ]);
  });

  it('every section in the SSOT has a matching component file with the right id', () => {
    for (const section of SECTION_META) {
      const path = `components/${componentFileName(section.id)}.astro`;
      const src = read(path);
      const id = src.match(/<section[\s][^>]*\bid="([a-z][\w-]*)"/)?.[1];
      expect(id, `${path} should have <section id="${section.id}">`).toBe(section.id);
    }
  });

  it('every numbered section component reads its data-num from the `num` prop', () => {
    for (const section of SECTION_META) {
      if (!section.numbered) continue;
      const path = `components/${componentFileName(section.id)}.astro`;
      const src = read(path);
      expect(src, `${path} should write data-num={num}`).toMatch(/<section[^>]*\bdata-num=\{num\}/);
    }
  });

  it('Navbar imports the sections SSOT', () => {
    const navbar = read('components/Navbar.astro');
    expect(navbar).toMatch(/import\s*\{\s*sections\s*\}\s*from\s*['"]\.\.\/config\/sections['"]/);
  });

  it('hero anchor (`#hero`) is referenced by the navbar logo', () => {
    const navbar = read('components/Navbar.astro');
    expect(navbar).toMatch(/href="#hero"/);
  });

  it('the primary hero CTA points to professional work', () => {
    const hero = read('components/Hero.astro');
    expect(hero).toMatch(/href="#work"/);
  });

  it('the mobile menu protects short viewports from centered overflow', () => {
    const navbar = read('components/Navbar.astro');
    expect(navbar).toMatch(/@media\s*\(max-width:\s*1024px\)\s*and\s*\(max-height:\s*700px\)/);
    expect(navbar).toMatch(
      /@media\s*\(max-width:\s*1024px\)\s*and\s*\(max-height:\s*700px\)[\s\S]*?\.nav-links-primary\s*\{[\s\S]*?justify-content:\s*flex-start/
    );
  });

  it('default and localized homepages render the same SSOT-driven map', () => {
    const en = read('pages/index.astro');
    const localized = read('pages/[lang]/index.astro');
    const importPattern = /import\s*\{\s*sections\s*\}\s*from\s*['"](\.\.\/)+config\/sections['"]/;
    expect(en).toMatch(importPattern);
    expect(localized).toMatch(importPattern);
    // The unified loop renders every section, hero included; the `Section`
    // identifier is the destructured component reference per iteration.
    const renderPattern = /<Section\s+num=/;
    expect(en).toMatch(renderPattern);
    expect(localized).toMatch(renderPattern);
  });

  it('SECTION_IDS export excludes the hero and hidden sections', () => {
    expect(SECTION_IDS).toEqual(
      SECTION_META.filter((s) => s.id !== 'hero' && s.hidden !== true).map((s) => s.id)
    );
  });
});

// ─── Portfolio presentation contracts ─────────────────────────

describe('Portfolio presentation', () => {
  it('uses the generated demo gallery as real card media', () => {
    const demos = read('components/Demos.astro');
    expect(demos).toMatch(
      /import\.meta\.glob(?:<[^>]+>)?\(['"]\.\.\/\.\.\/docs\/assets\/demo-gallery\/\*\.jpg['"]/
    );
    expect(demos).toMatch(/class="demo-preview"/);
  });

  it('neutralizes captured theme colors in project-card previews', () => {
    const demos = read('components/Demos.astro');
    expect(demos).toMatch(/\.demo-preview\s*\{[\s\S]*?isolation:\s*isolate/);
    expect(demos).toMatch(
      /\.demo-preview img\s*\{[\s\S]*?filter:\s*grayscale\(1\)[\s\S]*?mix-blend-mode:\s*luminosity/
    );
  });

  it('waits for hydrated, settled live demos before capturing gallery images', () => {
    const embed = read('components/demos/LiveAppEmbed.tsx');
    const gallery = read('../e2e/readme-gallery.spec.ts');
    expect(embed.match(/data-live-status=/g)).toHaveLength(3);
    expect(gallery).toMatch(/astro-island\[ssr\]/);
    expect(gallery).toMatch(/data-live-status="checking"/);
  });

  it('opens the full appearance studio from the navbar control', () => {
    const toggle = read('components/ThemeToggle.astro');
    expect(toggle).toContain("new CustomEvent('open-theme-modal')");
    expect(toggle).not.toContain("localStorage.setItem('theme'");
  });
});

// Map a section id ('work' / 'projects') to its component filename
// ('WorkProjects' / 'Demos'). Most ids match the filename directly; only the
// two below diverge from the convention.
function componentFileName(id: string): string {
  if (id === 'work') return 'WorkProjects';
  if (id === 'projects') return 'Demos';
  return id.charAt(0).toUpperCase() + id.slice(1);
}

// ─── Every demo page passes slug to DemoLayout ──────────────────

describe('Demo pages pass correct slug to DemoLayout', () => {
  const pagesDir = join(SRC, 'pages', 'demos');
  const pageFiles = readdirSync(pagesDir).filter((f) => f.endsWith('.astro'));

  for (const file of pageFiles) {
    const slug = file.replace('.astro', '');
    it(`${file} passes slug="${slug}" to DemoLayout`, () => {
      const content = readFileSync(join(pagesDir, file), 'utf-8');
      expect(content).toContain(`slug="${slug}"`);
    });
  }
});
