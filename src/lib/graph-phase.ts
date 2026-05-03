// Graph generation, percolation, and connectivity analysis — ported from Python/NetworkX.
// Studies phase transitions in random graphs (binomial, geometric, grid).

export interface SimpleGraph {
  n: number;
  adj: Set<number>[];
  positions?: { x: number; y: number }[];
}

// ─── Graph generators ───

export function binomialGraph(n: number, p: number): SimpleGraph {
  const adj: Set<number>[] = Array.from({ length: n }, () => new Set());
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (Math.random() < p) {
        adj[i].add(j);
        adj[j].add(i);
      }
    }
  }
  return { n, adj };
}

export function geometricGraph(n: number, r: number): SimpleGraph {
  const positions = Array.from({ length: n }, () => ({
    x: Math.random(),
    y: Math.random(),
  }));
  const adj: Set<number>[] = Array.from({ length: n }, () => new Set());
  const r2 = r * r;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = positions[i].x - positions[j].x;
      const dy = positions[i].y - positions[j].y;
      if (dx * dx + dy * dy < r2) {
        adj[i].add(j);
        adj[j].add(i);
      }
    }
  }
  return { n, adj, positions };
}

export function gridGraph(side: number): SimpleGraph {
  const n = side * side;
  const adj: Set<number>[] = Array.from({ length: n }, () => new Set());
  const positions: { x: number; y: number }[] = [];

  for (let r = 0; r < side; r++) {
    for (let c = 0; c < side; c++) {
      const id = r * side + c;
      positions.push({ x: c / Math.max(side - 1, 1), y: r / Math.max(side - 1, 1) });
      if (c + 1 < side) { adj[id].add(id + 1); adj[id + 1].add(id); }
      if (r + 1 < side) { adj[id].add(id + side); adj[id + side].add(id); }
    }
  }
  return { n, adj, positions };
}

// ─── Percolation ───

export function nodePercolation(g: SimpleGraph, p: number): SimpleGraph {
  const keep = new Set<number>();
  for (let i = 0; i < g.n; i++) {
    if (Math.random() < p) keep.add(i);
  }
  return subgraph(g, keep);
}

export function edgePercolation(g: SimpleGraph, p: number): SimpleGraph {
  const adj: Set<number>[] = Array.from({ length: g.n }, () => new Set());
  for (let i = 0; i < g.n; i++) {
    for (const j of g.adj[i]) {
      if (j > i && Math.random() < p) {
        adj[i].add(j);
        adj[j].add(i);
      }
    }
  }
  return { n: g.n, adj, positions: g.positions };
}

function subgraph(g: SimpleGraph, keep: Set<number>): SimpleGraph {
  const remap = new Map<number, number>();
  let idx = 0;
  for (const v of keep) remap.set(v, idx++);
  const n = remap.size;
  const adj: Set<number>[] = Array.from({ length: n }, () => new Set());
  const positions = g.positions ? [] as { x: number; y: number }[] : undefined;

  for (const v of keep) {
    const vi = remap.get(v)!;
    if (positions && g.positions) positions.push(g.positions[v]);
    for (const u of g.adj[v]) {
      if (keep.has(u)) adj[vi].add(remap.get(u)!);
    }
  }
  return { n, adj, positions };
}

// ─── Analysis ───

export function connectedComponents(g: SimpleGraph): number[][] {
  const visited = new Uint8Array(g.n);
  const components: number[][] = [];
  for (let i = 0; i < g.n; i++) {
    if (visited[i]) continue;
    const comp: number[] = [];
    const stack = [i];
    while (stack.length > 0) {
      const v = stack.pop()!;
      if (visited[v]) continue;
      visited[v] = 1;
      comp.push(v);
      for (const u of g.adj[v]) {
        if (!visited[u]) stack.push(u);
      }
    }
    components.push(comp);
  }
  return components;
}

export function isConnected(g: SimpleGraph): boolean {
  if (g.n <= 1) return true;
  const visited = new Uint8Array(g.n);
  const stack = [0];
  let count = 0;
  while (stack.length > 0) {
    const v = stack.pop()!;
    if (visited[v]) continue;
    visited[v] = 1;
    count++;
    for (const u of g.adj[v]) {
      if (!visited[u]) stack.push(u);
    }
  }
  return count === g.n;
}

function edgeCount(g: SimpleGraph, nodes?: number[]): number {
  if (!nodes) {
    let count = 0;
    for (let i = 0; i < g.n; i++) count += g.adj[i].size;
    return count / 2;
  }
  const nodeSet = new Set(nodes);
  let count = 0;
  for (const v of nodes) {
    for (const u of g.adj[v]) {
      if (u > v && nodeSet.has(u)) count++;
    }
  }
  return count;
}

// A component is "complex" if it has at least 2 independent cycles.
// For a connected component: cycles = edges - nodes + 1 (cyclomatic number).
// Complex means cyclomatic number >= 2.
export function isComponentComplex(g: SimpleGraph, component: number[]): boolean {
  const edges = edgeCount(g, component);
  const nodes = component.length;
  return edges - nodes + 1 >= 2;
}

export function allComponentsComplex(g: SimpleGraph): boolean {
  const comps = connectedComponents(g);
  for (const comp of comps) {
    if (!isComponentComplex(g, comp)) return false;
  }
  return true;
}

export interface GraphStats {
  nodes: number;
  edges: number;
  components: number;
  connected: boolean;
  complex: boolean;
  largestComponent: number;
}

export function analyzeGraph(g: SimpleGraph): GraphStats {
  const comps = connectedComponents(g);
  const edges = edgeCount(g);
  const largest = comps.reduce((max, c) => Math.max(max, c.length), 0);
  let complex = true;
  for (const comp of comps) {
    if (!isComponentComplex(g, comp)) { complex = false; break; }
  }
  return {
    nodes: g.n,
    edges,
    components: comps.length,
    connected: comps.length <= 1,
    complex,
    largestComponent: largest,
  };
}

// ─── Phase transition sweep ───

export interface SweepPoint {
  param: number;
  pConnected: number;
  pComplex: number;
}

export type GraphFamily = "binomial" | "geometric" | "grid";
export type PercolationType = "node" | "edge" | "both";

export function runSweep(
  family: GraphFamily,
  n: number,
  percolation: PercolationType,
  steps: number,
  trials: number,
  onTrial?: (info: { p: number; runs: number }) => void,
): SweepPoint[] {
  const points: SweepPoint[] = [];

  for (let s = 0; s <= steps; s++) {
    const param = s / steps;
    let nConnected = 0;
    let nComplex = 0;
    if (onTrial) onTrial({ p: param, runs: trials });

    for (let t = 0; t < trials; t++) {
      let g: SimpleGraph;
      if (family === "binomial") {
        g = binomialGraph(n, 0.3);
      } else if (family === "geometric") {
        g = geometricGraph(n, 0.4);
      } else {
        const side = Math.round(Math.sqrt(n));
        g = gridGraph(side);
      }

      if (percolation === "node") {
        g = nodePercolation(g, param);
      } else if (percolation === "edge") {
        g = edgePercolation(g, param);
      } else {
        g = nodePercolation(g, param);
        g = edgePercolation(g, param);
      }

      if (g.n > 0) {
        if (isConnected(g)) nConnected++;
        if (allComponentsComplex(g)) nComplex++;
      }
    }

    points.push({
      param,
      pConnected: nConnected / trials,
      pComplex: nComplex / trials,
    });
  }

  return points;
}
