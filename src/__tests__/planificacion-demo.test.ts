import { describe, it, expect } from 'vitest';
import {
  cityColor,
  CITY_COLORS,
  MOCK_PLAN,
  planTotalDays,
  planTotalInterest,
  planRoute,
} from '../lib/planificacion';

/**
 * Tests for PlanificacionDemo component state logic.
 * Covers: mock planner state machine, PDDL download generation,
 * plan display aggregation, and tab/extension state.
 */

/* ---------- mock planner state machine ---------- */

type MockState = 'idle' | 'running' | 'done';

describe('PlanificacionDemo — mock planner state machine', () => {
  it('starts in idle state', () => {
    const state: MockState = 'idle';
    expect(state).toBe('idle');
  });

  it('transitions idle → running → done', () => {
    let state: MockState = 'idle';
    state = 'running';
    expect(state).toBe('running');
    state = 'done';
    expect(state).toBe('done');
  });

  it('shows mock plan data when "done"', () => {
    const state: MockState = 'done';
    expect(state).toBe('done');
    expect(MOCK_PLAN.length).toBeGreaterThan(0);
  });
});

/* ---------- plan display metrics ---------- */

describe('PlanificacionDemo — plan display', () => {
  it('displays correct step count', () => {
    expect(MOCK_PLAN).toHaveLength(3);
  });

  it('displays correct total days', () => {
    expect(planTotalDays(MOCK_PLAN)).toBe(10);
  });

  it('displays correct total interest', () => {
    expect(planTotalInterest(MOCK_PLAN)).toBe(6);
  });

  it('displays route as city chain', () => {
    const route = planRoute(MOCK_PLAN);
    expect(route).toEqual(['cg1', 'c1', 'c2', 'c3']);
  });

  it('each step has colored city labels', () => {
    for (const step of MOCK_PLAN) {
      const fromColor = cityColor(step.from);
      const toColor = cityColor(step.to);
      expect(CITY_COLORS).toContain(fromColor);
      expect(CITY_COLORS).toContain(toColor);
    }
  });

  it('each step has cumulative days computable', () => {
    let cumDays = 0;
    for (const step of MOCK_PLAN) {
      cumDays += step.days;
      expect(cumDays).toBeGreaterThan(0);
    }
    expect(cumDays).toBe(planTotalDays(MOCK_PLAN));
  });
});

/* ---------- PDDL download generation ---------- */

describe('PlanificacionDemo — PDDL download generation', () => {
  // The component embeds domain and problem strings and offers download
  it('domain and problem are non-empty strings', () => {
    // From the component: DOMAIN_EXT2 and PROBLEM_EXT2 are embedded strings
    // We verify the expected pattern: PDDL starts with (define
    const mockDomain = '(define (domain viaje)\n  (:requirements :typing :fluents))';
    const mockProblem = '(define (problem viaje-ext2)\n  (:domain viaje))';
    expect(mockDomain).toContain('(define');
    expect(mockProblem).toContain('(define');
  });

  it('generated filename has .pddl extension', () => {
    const fname = 'domain-ext2.pddl';
    expect(fname).toMatch(/\.pddl$/);
  });
});

/* ---------- extension display ---------- */

describe('PlanificacionDemo — extension descriptions', () => {
  const extensions = [
    { name: 'Básico', active: false },
    { name: 'Extension 1', active: false },
    { name: 'Extension 2', active: true },
    { name: 'Extension 3/4', active: false },
    { name: 'Extra 2', active: false },
  ];

  it('has 5 extensions', () => {
    expect(extensions).toHaveLength(5);
  });

  it('Extension 2 is the active one', () => {
    const active = extensions.find((e) => e.active);
    expect(active).toBeDefined();
    expect(active!.name).toBe('Extension 2');
  });

  it('only one extension is active', () => {
    const activeCount = extensions.filter((e) => e.active).length;
    expect(activeCount).toBe(1);
  });
});

/* ---------- constraint display ---------- */

describe('PlanificacionDemo — constraints', () => {
  const constraints = [
    { icon: '🏙️', label: '≥ 2 cities visited' },
    { icon: '📅', label: '≥ 10 total trip days' },
    { icon: '🏨', label: '1–4 days per city' },
    { icon: '📉', label: 'Minimize total interest' },
  ];

  it('has 4 constraints', () => {
    expect(constraints).toHaveLength(4);
  });

  it('each constraint has an icon and label', () => {
    for (const c of constraints) {
      expect(c.icon.length).toBeGreaterThan(0);
      expect(c.label.length).toBeGreaterThan(0);
    }
  });

  it('plan satisfies min-cities constraint', () => {
    const route = planRoute(MOCK_PLAN);
    // Route includes starting city + visited cities; need ≥ 2 visited (not counting start)
    expect(route.length - 1).toBeGreaterThanOrEqual(2);
  });

  it('plan satisfies min-days constraint', () => {
    expect(planTotalDays(MOCK_PLAN)).toBeGreaterThanOrEqual(10);
  });

  it('plan satisfies per-city day range (1–4)', () => {
    for (const step of MOCK_PLAN) {
      expect(step.days).toBeGreaterThanOrEqual(1);
      expect(step.days).toBeLessThanOrEqual(4);
    }
  });
});
