/**
 * Schema-level guarantees for the four localized content files. The happy
 * path is exercised by the imports in src/data/loaders.ts (which throw at
 * module load on parse failure); this file pins the negative cases so future
 * schema changes don't silently loosen the contract.
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
  it('rejects an entry whose default-locale copy is missing', () => {
    const e = cloneFirst(skillsData) as { copy: Record<string, unknown> };
    delete e.copy.en;
    expect(SkillsFileSchema.safeParse([e]).success).toBe(false);
  });

  it('rejects an empty items array', () => {
    const e = cloneFirst(skillsData) as { identity: { items: string[] } };
    e.identity.items = [];
    expect(SkillsFileSchema.safeParse([e]).success).toBe(false);
  });
});

describe('WorkProjectsFileSchema rejections', () => {
  it('rejects an unknown icon', () => {
    const e = cloneFirst(workProjectsData) as { identity: { icon: string } };
    e.identity.icon = 'definitely-not-an-icon';
    expect(WorkProjectsFileSchema.safeParse([e]).success).toBe(false);
  });

  it('rejects a non-https link', () => {
    const e = cloneFirst(workProjectsData) as { identity: { link: string } };
    e.identity.link = 'http://insecure.example.com';
    expect(WorkProjectsFileSchema.safeParse([e]).success).toBe(false);
  });

  it('rejects an empty tags array', () => {
    const e = cloneFirst(workProjectsData) as { copy: Record<string, { tags: string[] }> };
    e.copy.en.tags = [];
    expect(WorkProjectsFileSchema.safeParse([e]).success).toBe(false);
  });
});

describe('EducationFileSchema rejections', () => {
  it('rejects an empty institution', () => {
    const e = cloneFirst(educationData) as { identity: { institution: string } };
    e.identity.institution = '';
    expect(EducationFileSchema.safeParse([e]).success).toBe(false);
  });

  it('rejects a missing degree in copy', () => {
    const e = cloneFirst(educationData) as { copy: Record<string, { degree?: string }> };
    delete e.copy.en.degree;
    expect(EducationFileSchema.safeParse([e]).success).toBe(false);
  });
});

describe('CertificationsFileSchema rejections', () => {
  it('rejects an unknown issuerIcon', () => {
    const e = cloneFirst(certificationsData) as { identity: { issuerIcon: string } };
    e.identity.issuerIcon = 'definitely-not-a-real-issuer';
    expect(CertificationsFileSchema.safeParse([e]).success).toBe(false);
  });

  it('rejects a missing issued string in copy', () => {
    const e = cloneFirst(certificationsData) as { copy: Record<string, { issued?: string }> };
    delete e.copy.en.issued;
    expect(CertificationsFileSchema.safeParse([e]).success).toBe(false);
  });
});
