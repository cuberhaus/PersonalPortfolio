import { describe, it, expect } from 'vitest';
import {
  mulberry32,
  heuristicSum,
  perHelicopterTimes,
  neighborsSwap,
  randomInitialAssignment,
  hillClimbing,
  simulatedAnnealing,
  defaultToyScenario,
  type Board,
  type Assignment,
} from '../lib/desastresSearch';

describe('mulberry32 PRNG', () => {
  it('is deterministic for the same seed', () => {
    const rng1 = mulberry32(42);
    const rng2 = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      expect(rng1()).toBe(rng2());
    }
  });

  it('produces values in [0, 1)', () => {
    const rng = mulberry32(123);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('different seeds produce different sequences', () => {
    const rng1 = mulberry32(1);
    const rng2 = mulberry32(2);
    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());
    expect(seq1).not.toEqual(seq2);
  });
});

describe('defaultToyScenario', () => {
  it('is deterministic for the same seed', () => {
    const s1 = defaultToyScenario(42);
    const s2 = defaultToyScenario(42);
    expect(s1.nHelis).toBe(s2.nHelis);
    expect(s1.nGroups).toBe(s2.nGroups);
    expect(s1.layout.centerPos).toEqual(s2.layout.centerPos);
    expect(s1.layout.groupPos).toEqual(s2.layout.groupPos);
  });

  it('produces 3 helicopters and 7 groups', () => {
    const s = defaultToyScenario(1);
    expect(s.nHelis).toBe(3);
    expect(s.nGroups).toBe(7);
  });
});

describe('randomInitialAssignment', () => {
  it('assigns all groups exactly once', () => {
    const rng = mulberry32(99);
    const assign = randomInitialAssignment(7, 3, rng);
    const allGroups = assign.flat().sort();
    expect(allGroups).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('number of helicopter queues matches nHelis', () => {
    const rng = mulberry32(99);
    const assign = randomInitialAssignment(5, 4, rng);
    expect(assign).toHaveLength(4);
  });
});

describe('heuristicSum & perHelicopterTimes', () => {
  const { board, nHelis, nGroups } = defaultToyScenario(42);
  const rng = mulberry32(42);
  const assign = randomInitialAssignment(nGroups, nHelis, rng);

  it('heuristic is non-negative', () => {
    expect(heuristicSum(board, assign)).toBeGreaterThanOrEqual(0);
  });

  it('perHelicopterTimes has one entry per helicopter', () => {
    const times = perHelicopterTimes(board, assign);
    expect(times).toHaveLength(nHelis);
  });

  it('sum of per-helicopter times equals heuristicSum', () => {
    const times = perHelicopterTimes(board, assign);
    const total = times.reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(heuristicSum(board, assign), 6);
  });
});

describe('neighborsSwap', () => {
  it('generates valid neighbors (all groups present)', () => {
    const assign: Assignment = [[0, 1, 2], [3, 4], [5, 6]];
    let count = 0;
    for (const neighbor of neighborsSwap(assign)) {
      const allGroups = neighbor.flat().sort();
      expect(allGroups).toEqual([0, 1, 2, 3, 4, 5, 6]);
      count++;
      if (count > 20) break;
    }
    expect(count).toBeGreaterThan(0);
  });
});

describe('hillClimbing', () => {
  const { board, nHelis, nGroups } = defaultToyScenario(42);
  const rng = mulberry32(42);
  const initial = randomInitialAssignment(nGroups, nHelis, rng);

  it('does not increase cost', () => {
    const initialCost = heuristicSum(board, initial);
    const result = hillClimbing(board, initial, 50);
    expect(result.cost).toBeLessThanOrEqual(initialCost + 1e-9);
  });

  it('returns a valid assignment (all groups present)', () => {
    const result = hillClimbing(board, initial, 50);
    const allGroups = result.assignment.flat().sort();
    expect(allGroups).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('log is non-empty', () => {
    const result = hillClimbing(board, initial, 50);
    expect(result.log.length).toBeGreaterThan(0);
  });
});

describe('simulatedAnnealing', () => {
  const { board, nHelis, nGroups } = defaultToyScenario(42);
  const rng = mulberry32(42);
  const initial = randomInitialAssignment(nGroups, nHelis, rng);

  it('returns a valid assignment', () => {
    const saRng = mulberry32(100);
    const result = simulatedAnnealing(board, initial, { steps: 200, rng: saRng });
    const allGroups = result.assignment.flat().sort();
    expect(allGroups).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('best cost is not worse than initial', () => {
    const saRng = mulberry32(100);
    const initialCost = heuristicSum(board, initial);
    const result = simulatedAnnealing(board, initial, { steps: 500, rng: saRng });
    expect(result.cost).toBeLessThanOrEqual(initialCost + 1e-9);
  });

  it('is deterministic with same PRNG seed', () => {
    const r1 = simulatedAnnealing(board, initial, { steps: 200, rng: mulberry32(77) });
    const r2 = simulatedAnnealing(board, initial, { steps: 200, rng: mulberry32(77) });
    expect(r1.cost).toBe(r2.cost);
    expect(r1.assignment).toEqual(r2.assignment);
  });
});
