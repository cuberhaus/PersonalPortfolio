import { describe, it, expect } from 'vitest';

import skillsEn from '../data/skills.json';
import skillsEs from '../data/skills.es.json';
import skillsCa from '../data/skills.ca.json';

import expEn from '../data/experience.json';
import expEs from '../data/experience.es.json';
import expCa from '../data/experience.ca.json';

import eduEn from '../data/education.json';
import eduEs from '../data/education.es.json';
import eduCa from '../data/education.ca.json';

import workEn from '../data/work_projects.json';
import workEs from '../data/work_projects.es.json';
import workCa from '../data/work_projects.ca.json';

// ─── Skills ─────────────────────────────────────────────────────

describe('Skills data', () => {
  it('EN, ES, CA have the same number of categories', () => {
    expect(skillsEn.length).toBe(skillsEs.length);
    expect(skillsEn.length).toBe(skillsCa.length);
  });

  it('every category has a non-empty name and at least one item', () => {
    for (const skills of [skillsEn, skillsEs, skillsCa]) {
      for (const cat of skills) {
        expect(cat.category.trim().length).toBeGreaterThan(0);
        expect(cat.items.length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('EN, ES, CA have the same items per category (skills are not translated)', () => {
    for (let i = 0; i < skillsEn.length; i++) {
      expect(skillsEn[i].items).toEqual(skillsEs[i].items);
      expect(skillsEn[i].items).toEqual(skillsCa[i].items);
    }
  });
});

// ─── Experience ─────────────────────────────────────────────────

describe('Experience data', () => {
  it('EN, ES, CA have the same number of entries', () => {
    expect(expEn.length).toBe(expEs.length);
    expect(expEn.length).toBe(expCa.length);
  });

  it('every entry has required fields', () => {
    for (const exp of [expEn, expEs, expCa]) {
      for (const entry of exp) {
        expect(entry.role.trim().length).toBeGreaterThan(0);
        expect(entry.company.trim().length).toBeGreaterThan(0);
        expect(entry.period.trim().length).toBeGreaterThan(0);
        expect(entry.bullets.length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('same number of bullets per entry across translations', () => {
    for (let i = 0; i < expEn.length; i++) {
      expect(expEn[i].bullets.length).toBe(expEs[i].bullets.length);
      expect(expEn[i].bullets.length).toBe(expCa[i].bullets.length);
    }
  });
});

// ─── Education ──────────────────────────────────────────────────

describe('Education data', () => {
  it('EN, ES, CA have the same number of entries', () => {
    expect(eduEn.length).toBe(eduEs.length);
    expect(eduEn.length).toBe(eduCa.length);
  });

  it('every entry has required fields', () => {
    for (const edu of [eduEn, eduEs, eduCa]) {
      for (const entry of edu) {
        expect(entry.degree.trim().length).toBeGreaterThan(0);
        expect(entry.institution.trim().length).toBeGreaterThan(0);
        expect(entry.period.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('institutions match across translations (not translated)', () => {
    for (let i = 0; i < eduEn.length; i++) {
      expect(eduEn[i].institution).toBe(eduEs[i].institution);
      expect(eduEn[i].institution).toBe(eduCa[i].institution);
    }
  });
});

// ─── Work Projects ──────────────────────────────────────────────

describe('Work projects data', () => {
  it('EN, ES, CA have the same number of projects', () => {
    expect(workEn.length).toBe(workEs.length);
    expect(workEn.length).toBe(workCa.length);
  });

  it('every project has required fields', () => {
    for (const work of [workEn, workEs, workCa]) {
      for (const project of work) {
        expect(project.title.trim().length).toBeGreaterThan(0);
        expect(project.company.trim().length).toBeGreaterThan(0);
        expect(project.description.trim().length).toBeGreaterThan(0);
        expect(project.tags.length).toBeGreaterThanOrEqual(1);
        expect(project.icon.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('same number of tags per project across translations', () => {
    for (let i = 0; i < workEn.length; i++) {
      expect(workEn[i].tags.length).toBe(workEs[i].tags.length);
      expect(workEn[i].tags.length).toBe(workCa[i].tags.length);
    }
  });

  it('icons match across translations', () => {
    for (let i = 0; i < workEn.length; i++) {
      expect(workEn[i].icon).toBe(workEs[i].icon);
      expect(workEn[i].icon).toBe(workCa[i].icon);
    }
  });
});
