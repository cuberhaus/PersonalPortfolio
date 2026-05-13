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
  const navAnchorsInOrder = [...navbar.matchAll(/href:\s*'#([\w-]+)'/g)].map(m => m[1]);
  const navAnchors = [...navAnchorsInOrder].sort();

  const sectionComponents = [
    { name: 'Hero', file: 'components/Hero.astro' },
    { name: 'About', file: 'components/About.astro' },
    { name: 'Demos', file: 'components/Demos.astro' },
    { name: 'Skills', file: 'components/Skills.astro' },
    { name: 'Experience', file: 'components/Experience.astro' },
    { name: 'WorkProjects', file: 'components/WorkProjects.astro' },
    { name: 'Education', file: 'components/Education.astro' },
    { name: 'Certifications', file: 'components/Certifications.astro' },
    { name: 'Contact', file: 'components/Contact.astro' },
  ];

  const sectionMeta = sectionComponents.map(({ name, file }) => {
    const src = read(file);
    const id = src.match(/<section[\s][^>]*\bid="([a-z][\w-]*)"/)?.[1];
    const dataNum = src.match(/<section[\s][^>]*\bdata-num="(\d{2})"/)?.[1];

    return { name, id, dataNum };
  });

  const componentToSectionId = new Map(sectionMeta.map(section => [section.name, section.id]));
  const componentToDataNum = new Map(sectionMeta.map(section => [section.name, section.dataNum]));

  const sectionIds = sectionMeta
    .map(section => section.id)
    .filter((id): id is string => Boolean(id))
    .sort();

  const extractMainComponentNames = (rel: string) => {
    const main = read(rel).match(/<main id="main-content">([\s\S]*?)<\/main>/)?.[1] ?? '';
    return [...main.matchAll(/<([A-Z]\w+)\s*\/>/g)].map(m => m[1]);
  };

  const sectionIdsFromPage = (rel: string) =>
    extractMainComponentNames(rel)
      .map(component => componentToSectionId.get(component))
      .filter((id): id is string => Boolean(id));

  const numberedSectionsFromPage = (rel: string) =>
    extractMainComponentNames(rel)
      .map(component => ({
        component,
        id: componentToSectionId.get(component),
        dataNum: componentToDataNum.get(component),
      }))
      .filter((section): section is { component: string; id: string; dataNum: string | undefined } =>
        Boolean(section.id) && section.id !== 'hero',
      );

  it('every navbar anchor points to a real section ID', () => {
    for (const anchor of navAnchors) {
      expect(sectionIds, `navbar links to #${anchor} but no section has that id`).toContain(anchor);
    }
  });

  it('hero section ID exists (logo links to #hero)', () => {
    expect(sectionIds).toContain('hero');
  });

  const mainSectionIds = sectionIds.filter(id => id !== 'hero');

  it('every main section is reachable from the navbar', () => {
    for (const id of mainSectionIds) {
      expect(navAnchors, `section #${id} exists but navbar has no link to it`).toContain(id);
    }
  });

  it('default and localized homepages render sections in the same order', () => {
    expect(sectionIdsFromPage('pages/[lang]/index.astro')).toEqual(sectionIdsFromPage('pages/index.astro'));
  });

  it('navbar link order follows the default homepage section order', () => {
    const defaultHomepageAnchors = sectionIdsFromPage('pages/index.astro').filter(id => id !== 'hero');
    expect(navAnchorsInOrder).toEqual(defaultHomepageAnchors);
  });

  it('section data numbers follow the default homepage order', () => {
    const numberedSections = numberedSectionsFromPage('pages/index.astro');

    for (let index = 0; index < numberedSections.length; index++) {
      const expected = String(index + 1).padStart(2, '0');
      const section = numberedSections[index];
      expect(section.dataNum, `${section.component} should use data-num="${expected}"`).toBe(expected);
    }
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
