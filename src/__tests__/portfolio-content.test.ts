import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

import skillsEn from '../data/skills.json';
import skillsEs from '../data/skills.es.json';
import skillsCa from '../data/skills.ca.json';

import experienceEn from '../data/experience.json';
import experienceEs from '../data/experience.es.json';
import experienceCa from '../data/experience.ca.json';

import educationEn from '../data/education.json';
import educationEs from '../data/education.es.json';
import educationCa from '../data/education.ca.json';

import workEn from '../data/work_projects.json';
import workEs from '../data/work_projects.es.json';
import workCa from '../data/work_projects.ca.json';

type JsonRecord = Record<string, unknown>;

const sortedKeys = (item: JsonRecord) => Object.keys(item).sort();

function expectSameKeys(label: string, base: JsonRecord[], localized: JsonRecord[]) {
  expect(localized.length, `${label} length differs`).toBe(base.length);

  for (let index = 0; index < base.length; index++) {
    expect(sortedKeys(localized[index]), `${label}[${index}] keys differ`).toEqual(sortedKeys(base[index]));
  }
}

describe('localized portfolio content schemas', () => {
  it('skills entries expose the same keys across locales', () => {
    expectSameKeys('skills.es', skillsEn, skillsEs);
    expectSameKeys('skills.ca', skillsEn, skillsCa);
  });

  it('experience entries expose the same keys across locales', () => {
    expectSameKeys('experience.es', experienceEn, experienceEs);
    expectSameKeys('experience.ca', experienceEn, experienceCa);
  });

  it('education entries expose the same keys across locales', () => {
    expectSameKeys('education.es', educationEn, educationEs);
    expectSameKeys('education.ca', educationEn, educationCa);
  });

  it('work project entries expose the same keys across locales', () => {
    expectSameKeys('work_projects.es', workEn, workEs);
    expectSameKeys('work_projects.ca', workEn, workCa);
  });
});

describe('skills content quality', () => {
  const localizedSkills = [
    ['en', skillsEn],
    ['es', skillsEs],
    ['ca', skillsCa],
  ] as const;

  it('has no empty or duplicate skill labels within a category', () => {
    for (const [locale, groups] of localizedSkills) {
      for (const group of groups) {
        const trimmedItems = group.items.map(item => item.trim());

        for (const item of trimmedItems) {
          expect(item.length, `${locale}.${group.category} has an empty skill`).toBeGreaterThan(0);
        }

        expect(new Set(trimmedItems).size, `${locale}.${group.category} has duplicate skills`).toBe(trimmedItems.length);
      }
    }
  });
});

describe('experience content quality', () => {
  const localizedExperience = [
    ['en', experienceEn],
    ['es', experienceEs],
    ['ca', experienceCa],
  ] as const;

  it('has no empty bullet text', () => {
    for (const [locale, entries] of localizedExperience) {
      for (const entry of entries) {
        for (const bullet of entry.bullets) {
          expect(bullet.trim().length, `${locale}.${entry.company} has an empty bullet`).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('education content quality', () => {
  const localizedEducation = [
    ['en', educationEn],
    ['es', educationEs],
    ['ca', educationCa],
  ] as const;

  it('uses stable institution/link identity across translations', () => {
    const identity = (entry: { institution: string; link: string }) => `${entry.institution}|${entry.link}`;

    expect(educationEs.map(identity)).toEqual(educationEn.map(identity));
    expect(educationCa.map(identity)).toEqual(educationEn.map(identity));
  });

  it('has unique links per locale', () => {
    for (const [locale, entries] of localizedEducation) {
      const links = entries.map(entry => entry.link);
      expect(new Set(links).size, `${locale} education has duplicate links`).toBe(links.length);
    }
  });
});

describe('work projects content quality', () => {
  const localizedWorkProjects = [
    ['en', workEn],
    ['es', workEs],
    ['ca', workCa],
  ] as const;

  it('keeps icon/link identity aligned across translations', () => {
    const identity = (project: { icon: string; link?: string }) => `${project.icon}|${project.link ?? ''}`;

    expect(workEs.map(identity)).toEqual(workEn.map(identity));
    expect(workCa.map(identity)).toEqual(workEn.map(identity));
  });

  it('has a non-empty role and clean tag labels for every project', () => {
    for (const [locale, projects] of localizedWorkProjects) {
      for (const project of projects) {
        expect(project.role.trim().length, `${locale}.${project.title} has an empty role`).toBeGreaterThan(0);

        const trimmedTags = project.tags.map(tag => tag.trim());
        for (const tag of trimmedTags) {
          expect(tag.length, `${locale}.${project.title} has an empty tag`).toBeGreaterThan(0);
        }

        expect(new Set(trimmedTags).size, `${locale}.${project.title} has duplicate tags`).toBe(trimmedTags.length);
      }
    }
  });

  it('uses valid, unique HTTPS links when projects are linked', () => {
    for (const [locale, projects] of localizedWorkProjects) {
      const links = projects.map(project => project.link).filter((link): link is string => Boolean(link));

      for (const link of links) {
        expect(() => new URL(link), `${locale} has invalid work project URL ${link}`).not.toThrow();
        expect(link, `${locale} work project URL is not HTTPS`).toMatch(/^https:\/\//);
      }

      expect(new Set(links).size, `${locale} work projects have duplicate links`).toBe(links.length);
    }
  });

  it('renders every icon used by work project data', () => {
    const source = readFileSync(join(__dirname, '..', 'components', 'WorkProjects.astro'), 'utf-8');
    const renderedIcons = new Set([...source.matchAll(/project\.icon === '([^']+)'/g)].map(match => match[1]));
    const dataIcons = new Set([...workEn, ...workEs, ...workCa].map(project => project.icon));

    for (const icon of dataIcons) {
      expect(renderedIcons, `WorkProjects.astro does not render icon "${icon}"`).toContain(icon);
    }
  });
});