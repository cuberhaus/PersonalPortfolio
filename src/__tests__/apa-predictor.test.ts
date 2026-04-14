import { describe, it, expect } from 'vitest';
import { clamp, dist2, knnVote, predict, absCoefs, maxCoef, type Pt } from '../lib/apa-predictor';

describe('APA Practica — predictor helpers', () => {
  describe('clamp', () => {
    it('returns value when within bounds', () => {
      expect(clamp(5, 0, 10)).toBe(5);
    });

    it('clamps to lower bound', () => {
      expect(clamp(-3, 0, 10)).toBe(0);
    });

    it('clamps to upper bound', () => {
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it('handles exact boundaries', () => {
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });
  });

  describe('dist2', () => {
    it('returns 0 for same point', () => {
      expect(dist2(3, 4, 3, 4)).toBe(0);
    });

    it('computes squared euclidean distance', () => {
      expect(dist2(0, 0, 3, 4)).toBe(25);
    });

    it('is symmetric', () => {
      expect(dist2(1, 2, 5, 7)).toBe(dist2(5, 7, 1, 2));
    });
  });

  describe('knnVote', () => {
    const points: Pt[] = [
      { x: 0, y: 0, cls: 0 },
      { x: 1, y: 0, cls: 0 },
      { x: 2, y: 0, cls: 0 },
      { x: 10, y: 0, cls: 1 },
      { x: 11, y: 0, cls: 1 },
    ];

    it('classifies by majority of k nearest neighbors', () => {
      const result = knnVote(0.5, 0, points, 3);
      expect(result.cls).toBe(0);
      expect(result.neighbors).toHaveLength(3);
    });

    it('classifies near class-1 cluster correctly', () => {
      const result = knnVote(10.5, 0, points, 3);
      expect(result.cls).toBe(1);
    });

    it('with k=1 picks the single nearest neighbor', () => {
      const result = knnVote(10, 0, points, 1);
      expect(result.cls).toBe(1);
      expect(result.neighbors).toHaveLength(1);
    });

    it('breaks ties using the nearest neighbor', () => {
      const tiePoints: Pt[] = [
        { x: 0, y: 0, cls: 0 },
        { x: 1, y: 0, cls: 1 },
      ];
      const result = knnVote(0.4, 0, tiePoints, 2);
      expect(result.cls).toBe(0);
    });
  });

  describe('predict (logistic regression)', () => {
    it('returns a probability between 0 and 1', () => {
      const result = predict(50, 5, 100, 2);
      expect(result.probability).toBeGreaterThanOrEqual(0);
      expect(result.probability).toBeLessThanOrEqual(1);
    });

    it('high TSH suggests hypothyroidism', () => {
      const normal = predict(40, 2, 120, 2);
      const highTsh = predict(40, 50, 120, 2);
      expect(highTsh.z).toBeLessThan(normal.z);
    });

    it('returns consistent isHypo flag', () => {
      const result = predict(50, 5, 100, 2);
      expect(result.isHypo).toBe(result.z < 0);
    });

    it('probability and z are inversely related for sigmoid', () => {
      const r1 = predict(40, 1, 120, 2);
      const r2 = predict(40, 100, 120, 2);
      if (r1.z > r2.z) {
        expect(r1.probability).toBeGreaterThan(r2.probability);
      } else {
        expect(r1.probability).toBeLessThanOrEqual(r2.probability);
      }
    });
  });

  describe('feature importance', () => {
    it('absCoefs has 4 entries (age, TSH, TT4, T3)', () => {
      expect(absCoefs).toHaveLength(4);
    });

    it('all absolute coefficients are non-negative', () => {
      for (const c of absCoefs) {
        expect(c).toBeGreaterThanOrEqual(0);
      }
    });

    it('maxCoef equals the max of absCoefs', () => {
      expect(maxCoef).toBe(Math.max(...absCoefs));
    });

    it('maxCoef is positive', () => {
      expect(maxCoef).toBeGreaterThan(0);
    });
  });
});
