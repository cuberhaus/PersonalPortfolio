import { describe, it, expect } from 'vitest';
import {
  cityColor,
  CITY_COLORS,
  MOCK_PLAN,
  planTotalDays,
  planTotalInterest,
  planRoute,
} from '../lib/planificacion';

describe('Planificacion — cityColor hash', () => {
  it('returns a color from CITY_COLORS', () => {
    for (const id of ['c1', 'c2', 'c3', 'cg1', 'v1', 'h1', 'abc', 'xyz_long_name']) {
      expect(CITY_COLORS).toContain(cityColor(id));
    }
  });

  it('is deterministic (same input → same output)', () => {
    expect(cityColor('c1')).toBe(cityColor('c1'));
    expect(cityColor('barcelona')).toBe(cityColor('barcelona'));
  });

  it('different IDs can produce different colors', () => {
    const colors = new Set(['c1', 'c2', 'c3', 'cg1', 'v1', 'h1'].map(cityColor));
    expect(colors.size).toBeGreaterThan(1);
  });

  it('handles empty string without crashing', () => {
    expect(CITY_COLORS).toContain(cityColor(''));
  });
});

describe('Planificacion — MOCK_PLAN data', () => {
  it('has 3 steps', () => {
    expect(MOCK_PLAN).toHaveLength(3);
  });

  it('every step has positive days and non-negative interest', () => {
    for (const s of MOCK_PLAN) {
      expect(s.days).toBeGreaterThan(0);
      expect(s.interest).toBeGreaterThanOrEqual(0);
    }
  });

  it('steps form a connected chain (to[i] === from[i+1])', () => {
    for (let i = 0; i < MOCK_PLAN.length - 1; i++) {
      expect(MOCK_PLAN[i].to).toBe(MOCK_PLAN[i + 1].from);
    }
  });

  it('every step has non-empty action, flight, hotel', () => {
    for (const s of MOCK_PLAN) {
      expect(s.action.trim().length).toBeGreaterThan(0);
      expect(s.flight.trim().length).toBeGreaterThan(0);
      expect(s.hotel.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('Planificacion — plan aggregation', () => {
  it('planTotalDays sums days correctly', () => {
    expect(planTotalDays(MOCK_PLAN)).toBe(4 + 4 + 2);
  });

  it('planTotalInterest sums interest correctly', () => {
    expect(planTotalInterest(MOCK_PLAN)).toBe(1 + 2 + 3);
  });

  it('planRoute returns connected city sequence', () => {
    const route = planRoute(MOCK_PLAN);
    expect(route).toEqual(['cg1', 'c1', 'c2', 'c3']);
  });

  it('planRoute of empty plan returns empty array', () => {
    expect(planRoute([])).toEqual([]);
  });

  it('total days matches problem constraint (≥10)', () => {
    expect(planTotalDays(MOCK_PLAN)).toBeGreaterThanOrEqual(10);
  });
});
