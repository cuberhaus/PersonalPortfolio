import { describe, it, expect } from 'vitest';
import {
  gridGraph,
  connectedComponents,
  isConnected,
  isComponentComplex,
  allComponentsComplex,
  analyzeGraph,
  nodePercolation,
  edgePercolation,
  type SimpleGraph,
} from '../lib/graph-phase';

function makeSimpleGraph(n: number, edges: [number, number][]): SimpleGraph {
  const adj: Set<number>[] = Array.from({ length: n }, () => new Set());
  for (const [u, v] of edges) {
    adj[u].add(v);
    adj[v].add(u);
  }
  return { n, adj };
}

describe('gridGraph', () => {
  it('1x1 grid has 1 node and 0 edges', () => {
    const g = gridGraph(1);
    expect(g.n).toBe(1);
    expect(g.adj[0].size).toBe(0);
  });

  it('2x2 grid has 4 nodes', () => {
    const g = gridGraph(2);
    expect(g.n).toBe(4);
  });

  it('3x3 grid has 9 nodes and 12 edges', () => {
    const g = gridGraph(3);
    expect(g.n).toBe(9);
    let edgeCount = 0;
    for (const s of g.adj) edgeCount += s.size;
    expect(edgeCount / 2).toBe(12);
  });

  it('grid graph is always connected', () => {
    expect(isConnected(gridGraph(2))).toBe(true);
    expect(isConnected(gridGraph(5))).toBe(true);
  });

  it('positions array matches node count', () => {
    const g = gridGraph(4);
    expect(g.positions).toHaveLength(16);
  });
});

describe('connectedComponents', () => {
  it('connected graph has 1 component', () => {
    const g = makeSimpleGraph(3, [[0, 1], [1, 2]]);
    expect(connectedComponents(g)).toHaveLength(1);
  });

  it('disconnected graph has multiple components', () => {
    const g = makeSimpleGraph(4, [[0, 1], [2, 3]]);
    const comps = connectedComponents(g);
    expect(comps).toHaveLength(2);
  });

  it('isolated nodes each form their own component', () => {
    const g = makeSimpleGraph(3, []);
    expect(connectedComponents(g)).toHaveLength(3);
  });

  it('all nodes appear exactly once across components', () => {
    const g = makeSimpleGraph(6, [[0, 1], [2, 3], [4, 5]]);
    const comps = connectedComponents(g);
    const allNodes = comps.flat().sort();
    expect(allNodes).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

describe('isConnected', () => {
  it('single node is connected', () => {
    expect(isConnected(makeSimpleGraph(1, []))).toBe(true);
  });

  it('empty graph (0 nodes) is connected', () => {
    expect(isConnected(makeSimpleGraph(0, []))).toBe(true);
  });

  it('path graph is connected', () => {
    expect(isConnected(makeSimpleGraph(4, [[0, 1], [1, 2], [2, 3]]))).toBe(true);
  });

  it('disconnected pair is not connected', () => {
    expect(isConnected(makeSimpleGraph(4, [[0, 1]]))).toBe(false);
  });
});

describe('isComponentComplex', () => {
  it('tree component is not complex (cyclomatic number = 0)', () => {
    const g = makeSimpleGraph(4, [[0, 1], [1, 2], [1, 3]]);
    expect(isComponentComplex(g, [0, 1, 2, 3])).toBe(false);
  });

  it('single-cycle component is not complex (cyclomatic number = 1)', () => {
    const g = makeSimpleGraph(3, [[0, 1], [1, 2], [2, 0]]);
    expect(isComponentComplex(g, [0, 1, 2])).toBe(false);
  });

  it('component with 2 independent cycles IS complex', () => {
    // K4 has 4 nodes, 6 edges → cyclomatic number = 6-4+1 = 3
    const g = makeSimpleGraph(4, [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]]);
    expect(isComponentComplex(g, [0, 1, 2, 3])).toBe(true);
  });
});

describe('analyzeGraph', () => {
  it('returns correct stats for a 3x3 grid', () => {
    const g = gridGraph(3);
    const stats = analyzeGraph(g);
    expect(stats.nodes).toBe(9);
    expect(stats.edges).toBe(12);
    expect(stats.components).toBe(1);
    expect(stats.connected).toBe(true);
    expect(stats.largestComponent).toBe(9);
  });

  it('disconnected graph reports multiple components', () => {
    const g = makeSimpleGraph(4, [[0, 1], [2, 3]]);
    const stats = analyzeGraph(g);
    expect(stats.components).toBe(2);
    expect(stats.connected).toBe(false);
    expect(stats.largestComponent).toBe(2);
  });
});

describe('percolation', () => {
  it('nodePercolation with p=0 keeps no nodes', () => {
    const g = gridGraph(3);
    const p = nodePercolation(g, 0);
    expect(p.n).toBe(0);
  });

  it('edgePercolation with p=1 keeps all edges', () => {
    const g = gridGraph(3);
    const p = edgePercolation(g, 1);
    let origEdges = 0;
    for (const s of g.adj) origEdges += s.size;
    let newEdges = 0;
    for (const s of p.adj) newEdges += s.size;
    expect(newEdges).toBe(origEdges);
  });
});
