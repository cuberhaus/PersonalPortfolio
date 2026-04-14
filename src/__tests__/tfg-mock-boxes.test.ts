import { describe, it, expect } from 'vitest';
import { MOCK_BOXES, filterByConfidence, barWidth } from '../lib/tfg-mock-boxes';

describe('TFG Polyps — mock bounding boxes', () => {
  it('MOCK_BOXES has at least one detection', () => {
    expect(MOCK_BOXES.length).toBeGreaterThan(0);
  });

  it('every box has valid coordinates and dimensions', () => {
    for (const b of MOCK_BOXES) {
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.w).toBeGreaterThan(0);
      expect(b.h).toBeGreaterThan(0);
    }
  });

  it('scores are in [0, 1]', () => {
    for (const b of MOCK_BOXES) {
      expect(b.score).toBeGreaterThanOrEqual(0);
      expect(b.score).toBeLessThanOrEqual(1);
    }
  });

  it('all labels are "polyp"', () => {
    for (const b of MOCK_BOXES) {
      expect(b.label).toBe("polyp");
    }
  });
});

describe('TFG Polyps — filterByConfidence', () => {
  it('threshold 0 returns all boxes', () => {
    expect(filterByConfidence(MOCK_BOXES, 0)).toHaveLength(MOCK_BOXES.length);
  });

  it('threshold 1 returns no boxes (none have score = 1.0)', () => {
    expect(filterByConfidence(MOCK_BOXES, 1)).toHaveLength(0);
  });

  it('threshold 0.8 filters out lower-confidence detections', () => {
    const result = filterByConfidence(MOCK_BOXES, 0.8);
    expect(result.length).toBeLessThan(MOCK_BOXES.length);
    for (const b of result) {
      expect(b.score).toBeGreaterThanOrEqual(0.8);
    }
  });

  it('threshold 0.5 keeps all mock boxes (both > 0.5)', () => {
    expect(filterByConfidence(MOCK_BOXES, 0.5)).toHaveLength(MOCK_BOXES.length);
  });

  it('returns empty array for empty input', () => {
    expect(filterByConfidence([], 0)).toHaveLength(0);
  });
});

describe('TFG Polyps — barWidth', () => {
  it('returns 100 when val equals maxVal', () => {
    expect(barWidth(0.8, 0.8)).toBeCloseTo(100);
  });

  it('returns 50 when val is half of maxVal', () => {
    expect(barWidth(0.4, 0.8)).toBeCloseTo(50);
  });

  it('returns 0 when val is 0', () => {
    expect(barWidth(0, 0.8)).toBeCloseTo(0);
  });
});
