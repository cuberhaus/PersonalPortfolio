/**
 * Schema-level guarantees for the four identity-only content files.
 * Data files now contain identity arrays (no copy block); translations
 * live in locales/{locale}/{file}.json.
 */
import { describe, it, expect } from 'vitest';
import skillsData from '../data/skills.json';
import workProjectsData from '../data/work_projects.json';
import educationData from '../data/education.json';
import certificationsData from '../data/certifications.json';

import {
  SkillsFileSchema,
  WorkProjectsFileSchema,
  EducationFileSchema,
  CertificationsFileSchema,
} from '../i18n/content-schemas';

const cloneFirst = (data: unknown): unknown => structuredClone((data as unknown[])[0]);

describe('Content file schemas accept the real data', () => {
  it('skills.json parses', () => {
    expect(() => SkillsFileSchema.parse(skillsData)).not.toThrow();
  });
  it('work_projects.json parses', () => {
    expect(() => WorkProjectsFileSchema.parse(workProjectsData)).not.toThrow();
  });
  it('education.json parses', () => {
    expect(() => EducationFileSchema.parse(educationData)).not.toThrow();
  });
  it('certifications.json parses', () => {
    expect(() => CertificationsFileSchema.parse(certificationsData)).not.toThrow();
  });
});

describe('SkillsFileSchema rejections', () => {
  it('rejects an empty items array', () => {
    const e = cloneFirst(skillsData) as { items: string[] };
    e.items = [];
    expect(SkillsFileSchema.safeParse([e]).success).toBe(false);
  });
});

describe('WorkProjectsFileSchema rejections', () => {
  it('rejects an unknown icon', () => {
    const e = cloneFirst(workProjectsData) as { icon: string };
    e.icon = 'definitely-not-an-icon';
    expect(WorkProjectsFileSchema.safeParse([e]).success).toBe(false);
  });

  it('rejects a non-https link', () => {
    const e = cloneFirst(workProjectsData) as { link: string };
    e.link = 'http://insecure.example.com';
    expect(WorkProjectsFileSchema.safeParse([e]).success).toBe(false);
  });
});

describe('EducationFileSchema rejections', () => {
  it('rejects an empty institution', () => {
    const e = cloneFirst(educationData) as { institution: string };
    e.institution = '';
    expect(EducationFileSchema.safeParse([e]).success).toBe(false);
  });
});

describe('CertificationsFileSchema rejections', () => {
  it('rejects an unknown issuerIcon', () => {
    const e = cloneFirst(certificationsData) as { issuerIcon: string };
    e.issuerIcon = 'definitely-not-a-real-issuer';
    expect(CertificationsFileSchema.safeParse([e]).success).toBe(false);
  });
});
