import { describe, it, expect } from 'vitest';
import { computePageRank, type PageRankInput } from '../lib/caim/pagerank';

/** Helper: build a simple graph from edges */
function makeGraph(nodes: string[], edges: [string, string][]): Pick<PageRankInput, 'nodes' | 'adj'> {
  const adj: Record<string, string[]> = {};
  for (const [src, dst] of edges) {
    if (!adj[src]) adj[src] = [];
    adj[src].push(dst);
  }
  return { nodes, adj };
}

describe('PageRank — basic', () => {
  it('single node graph returns score 1.0', () => {
    const { nodes, adj } = makeGraph(['A'], []);
    const result = computePageRank({ nodes, adj });
    expect(result.rankings).toHaveLength(1);
    expect(result.rankings[0].code).toBe('A');
    // With no edges the disconnected mass redistributes to itself
    expect(result.rankings[0].score).toBeCloseTo(1.0, 5);
  });

  it('empty graph returns empty rankings', () => {
    const result = computePageRank({ nodes: [], adj: {} });
    expect(result.rankings).toHaveLength(0);
    expect(result.iterations).toBe(0);
  });

  it('two-node cycle has equal scores', () => {
    const { nodes, adj } = makeGraph(['A', 'B'], [['A', 'B'], ['B', 'A']]);
    const result = computePageRank({ nodes, adj, damping: 0.85, maxIterations: 200, tolerance: 1e-12 });
    expect(result.rankings).toHaveLength(2);
    expect(result.rankings[0].score).toBeCloseTo(result.rankings[1].score, 5);
  });

  it('three-node triangle has equal scores', () => {
    const { nodes, adj } = makeGraph(
      ['A', 'B', 'C'],
      [['A', 'B'], ['B', 'C'], ['C', 'A']],
    );
    const result = computePageRank({ nodes, adj });
    const scores = result.rankings.map((r) => r.score);
    expect(scores[0]).toBeCloseTo(scores[1], 5);
    expect(scores[1]).toBeCloseTo(scores[2], 5);
  });
});

describe('PageRank — ranking properties', () => {
  it('rankings are sorted descending by score', () => {
    const { nodes, adj } = makeGraph(
      ['A', 'B', 'C', 'D'],
      [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'B']],
    );
    const result = computePageRank({ nodes, adj });
    const scores = result.rankings.map((r) => r.score);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
    }
  });

  it('scores sum approximately to 1.0', () => {
    const { nodes, adj } = makeGraph(
      ['A', 'B', 'C', 'D', 'E'],
      [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'E'], ['E', 'A'], ['C', 'A']],
    );
    const result = computePageRank({ nodes, adj, maxIterations: 500, tolerance: 1e-12 });
    const sum = result.rankings.reduce((s, r) => s + r.score, 0);
    expect(sum).toBeCloseTo(1.0, 3);
  });

  it('star graph: center node has highest score', () => {
    // Star: A->C, B->C, D->C, E->C, C->A
    const { nodes, adj } = makeGraph(
      ['A', 'B', 'C', 'D', 'E'],
      [['A', 'C'], ['B', 'C'], ['D', 'C'], ['E', 'C'], ['C', 'A']],
    );
    const result = computePageRank({ nodes, adj });
    expect(result.rankings[0].code).toBe('C');
  });
});

describe('PageRank — convergence', () => {
  it('convergence curve is non-empty', () => {
    const { nodes, adj } = makeGraph(['A', 'B'], [['A', 'B'], ['B', 'A']]);
    const result = computePageRank({ nodes, adj });
    expect(result.convergence.length).toBeGreaterThan(0);
  });

  it('convergence curve values decrease (approximately monotonic)', () => {
    const { nodes, adj } = makeGraph(
      ['A', 'B', 'C', 'D'],
      [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A']],
    );
    const result = computePageRank({ nodes, adj, maxIterations: 200, tolerance: 1e-15 });
    // Allow small non-monotonicity but overall trend should decrease
    const conv = result.convergence;
    if (conv.length > 2) {
      expect(conv[conv.length - 1]).toBeLessThan(conv[0]);
    }
  });

  it('max iterations cap is respected', () => {
    const { nodes, adj } = makeGraph(['A', 'B'], [['A', 'B'], ['B', 'A']]);
    const result = computePageRank({ nodes, adj, maxIterations: 5, tolerance: 1e-30 });
    expect(result.iterations).toBeLessThanOrEqual(5);
  });
});

describe('PageRank — damping factor effect', () => {
  it('different damping values produce different score distributions', () => {
    const { nodes, adj } = makeGraph(
      ['A', 'B', 'C', 'D'],
      [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'B']],
    );
    const r1 = computePageRank({ nodes, adj, damping: 0.5 });
    const r2 = computePageRank({ nodes, adj, damping: 0.99 });
    const top1 = r1.rankings[0].score;
    const top2 = r2.rankings[0].score;
    expect(top1).not.toBeCloseTo(top2, 3);
  });
});

describe('PageRank — init strategies', () => {
  const { nodes, adj } = makeGraph(
    ['A', 'B', 'C', 'D'],
    [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A']],
  );

  for (const strategy of ['nth', 'one', 'square'] as const) {
    it(`"${strategy}" strategy converges and sums to ~1.0`, () => {
      const result = computePageRank({ nodes, adj, initStrategy: strategy, maxIterations: 500, tolerance: 1e-12 });
      expect(result.rankings.length).toBeGreaterThan(0);
      const sum = result.rankings.reduce((s, r) => s + r.score, 0);
      expect(sum).toBeCloseTo(1.0, 3);
      expect(result.initStrategy).toBe(strategy);
    });
  }
});

describe('PageRank — disconnected components', () => {
  it('handles disconnected graph without error', () => {
    // Two disconnected pairs
    const { nodes, adj } = makeGraph(
      ['A', 'B', 'C', 'D'],
      [['A', 'B'], ['C', 'D']],
    );
    const result = computePageRank({ nodes, adj });
    expect(result.rankings).toHaveLength(4);
    const sum = result.rankings.reduce((s, r) => s + r.score, 0);
    expect(sum).toBeCloseTo(1.0, 3);
  });
});

describe('PageRank — metadata', () => {
  it('result includes timeMs and damping', () => {
    const { nodes, adj } = makeGraph(['A', 'B'], [['A', 'B'], ['B', 'A']]);
    const result = computePageRank({ nodes, adj, damping: 0.9 });
    expect(result.timeMs).toBeGreaterThanOrEqual(0);
    expect(result.damping).toBe(0.9);
  });
});
