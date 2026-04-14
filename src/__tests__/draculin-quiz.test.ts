import { describe, it, expect } from 'vitest';
import {
  quizScore,
  scoreBand,
  BLOOD_DATA,
  PERIOD_DAYS,
  FALLBACK_NEWS,
  type QuizQuestion,
} from '../lib/draculin-quiz';

const QUESTIONS: QuizQuestion[] = [
  { text: "Q1", scoreYes: 2, scoreNo: 0 },
  { text: "Q2", scoreYes: 2, scoreNo: 0 },
  { text: "Q3", scoreYes: 3, scoreNo: 0 },
  { text: "Q4", scoreYes: 3, scoreNo: 0 },
  { text: "Q5", scoreYes: 2, scoreNo: 0 },
  { text: "Q6", scoreYes: 2, scoreNo: 0 },
];

describe('Draculin quiz scoring', () => {
  it('all-no answers give score 0', () => {
    const answers = QUESTIONS.map(() => false);
    expect(quizScore(answers, QUESTIONS)).toBe(0);
  });

  it('all-yes answers give maximum score', () => {
    const answers = QUESTIONS.map(() => true);
    expect(quizScore(answers, QUESTIONS)).toBe(14);
  });

  it('mixed answers accumulate correctly', () => {
    const answers = [true, false, true, false, false, true];
    expect(quizScore(answers, QUESTIONS)).toBe(2 + 0 + 3 + 0 + 0 + 2);
  });

  it('handles empty answers', () => {
    expect(quizScore([], QUESTIONS)).toBe(0);
  });

  it('handles more answers than questions', () => {
    const answers = [true, true, true, true, true, true, true, true];
    expect(quizScore(answers, QUESTIONS)).toBe(14);
  });
});

describe('Draculin score bands', () => {
  it('score 0 → mild', () => {
    expect(scoreBand(0)).toBe('mild');
  });

  it('score 3 → mild (boundary)', () => {
    expect(scoreBand(3)).toBe('mild');
  });

  it('score 4 → moderate', () => {
    expect(scoreBand(4)).toBe('moderate');
  });

  it('score 7 → moderate (boundary)', () => {
    expect(scoreBand(7)).toBe('moderate');
  });

  it('score 8 → severe', () => {
    expect(scoreBand(8)).toBe('severe');
  });

  it('score 14 (max) → severe', () => {
    expect(scoreBand(14)).toBe('severe');
  });
});

describe('Draculin data integrity', () => {
  it('BLOOD_DATA has 7 days', () => {
    expect(Object.keys(BLOOD_DATA)).toHaveLength(7);
  });

  it('BLOOD_DATA values are positive', () => {
    for (const v of Object.values(BLOOD_DATA)) {
      expect(v).toBeGreaterThan(0);
    }
  });

  it('PERIOD_DAYS are valid day numbers (1-31)', () => {
    for (const d of PERIOD_DAYS) {
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(31);
    }
  });

  it('FALLBACK_NEWS has at least one entry', () => {
    expect(FALLBACK_NEWS.length).toBeGreaterThan(0);
  });

  it('FALLBACK_NEWS entries have title and link', () => {
    for (const n of FALLBACK_NEWS) {
      expect(n.title.trim().length).toBeGreaterThan(0);
      expect(n.link).toMatch(/^https?:\/\//);
    }
  });
});
