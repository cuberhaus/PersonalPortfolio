import { describe, it, expect } from 'vitest';
import {
  parseGraph,
  isDominant,
  dominanceInfo,
  greedySolver,
  localSearchSolver,
  SAMPLE_GRAPHS,
} from '../lib/mpids';

describe('parseGraph', () => {
  it('parses a simple graph correctly', () => {
    const g = parseGraph('3 2\n1 2\n2 3');
    expect(g.n).toBe(3);
    expect(g.edges).toHaveLength(2);
    expect(g.adj[0]).toContain(1);
    expect(g.adj[1]).toContain(0);
    expect(g.adj[1]).toContain(2);
  });

  it('parses all sample graphs without error', () => {
    for (const sample of SAMPLE_GRAPHS) {
      const g = parseGraph(sample.data);
      expect(g.n).toBeGreaterThan(0);
      expect(g.edges.length).toBeGreaterThan(0);
    }
  });

  it('uses 0-indexed vertices internally', () => {
    const g = parseGraph('4 2\n1 2\n3 4');
    expect(g.adj[0]).toContain(1);
    expect(g.adj[2]).toContain(3);
  });

  it('handles edge for node count == edge count on one line', () => {
    const g = parseGraph('3 3\n1 2\n2 3\n1 3');
    expect(g.n).toBe(3);
    expect(g.edges).toHaveLength(3);
  });
});

describe('isDominant', () => {
  it('full set is always dominant', () => {
    for (const sample of SAMPLE_GRAPHS) {
      const g = parseGraph(sample.data);
      const fullSet = new Set(Array.from({ length: g.n }, (_, i) => i));
      expect(isDominant(g, fullSet)).toBe(true);
    }
  });

  it('empty set is not dominant for graphs with edges', () => {
    const g = parseGraph('4 3\n1 2\n2 3\n3 4');
    expect(isDominant(g, new Set())).toBe(false);
  });

  it('single-node graph with no edges: empty set is dominant', () => {
    const g = parseGraph('1 0');
    expect(isDominant(g, new Set())).toBe(true);
  });
});

describe('dominanceInfo', () => {
  it('returns correct info for each vertex', () => {
    const g = parseGraph('4 3\n1 2\n2 3\n3 4');
    const info = dominanceInfo(g, new Set([1, 2]));
    expect(info).toHaveLength(4);
    for (const v of info) {
      expect(v).toHaveProperty('dominated');
      expect(v).toHaveProperty('count');
      expect(v).toHaveProperty('needed');
    }
  });
});

describe('greedySolver', () => {
  it('returns a valid dominant set for all sample graphs', () => {
    for (const sample of SAMPLE_GRAPHS) {
      const g = parseGraph(sample.data);
      const result = greedySolver(g);
      expect(isDominant(g, result.set)).toBe(true);
      expect(result.size).toBe(result.set.size);
    }
  });

  it('set size is at most n', () => {
    for (const sample of SAMPLE_GRAPHS) {
      const g = parseGraph(sample.data);
      const result = greedySolver(g);
      expect(result.size).toBeLessThanOrEqual(g.n);
    }
  });
});

describe('localSearchSolver', () => {
  it('returns a valid dominant set', () => {
    for (const sample of SAMPLE_GRAPHS) {
      const g = parseGraph(sample.data);
      const result = localSearchSolver(g, 200);
      expect(isDominant(g, result.set)).toBe(true);
    }
  });

  it('result is no worse than greedy', () => {
    for (const sample of SAMPLE_GRAPHS) {
      const g = parseGraph(sample.data);
      const greedy = greedySolver(g);
      const ls = localSearchSolver(g, 500);
      expect(ls.size).toBeLessThanOrEqual(greedy.size);
    }
  });
});
