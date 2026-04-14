/**
 * PageRank algorithm — pure computation (no DOM, no Worker API).
 * Port of CAIM/web/backend/pagerank.py to TypeScript.
 */

export type InitStrategy = 'nth' | 'one' | 'square';

export interface PageRankInput {
  /** Adjacency list: source -> destination codes */
  adj: Record<string, string[]>;
  /** All node codes in order */
  nodes: string[];
  damping?: number;
  initStrategy?: InitStrategy;
  maxIterations?: number;
  tolerance?: number;
}

export interface PageRankRanking {
  rank: number;
  code: string;
  score: number;
}

export interface PageRankResult {
  rankings: PageRankRanking[];
  iterations: number;
  convergence: number[];
  timeMs: number;
  damping: number;
  initStrategy: InitStrategy;
}

export function computePageRank(input: PageRankInput): PageRankResult {
  const {
    adj,
    nodes,
    damping = 0.8,
    initStrategy = 'nth',
    maxIterations = 200,
    tolerance = 1e-10,
  } = input;

  const t0 = performance.now();
  const n = nodes.length;
  if (n === 0) {
    return { rankings: [], iterations: 0, convergence: [], timeMs: 0, damping, initStrategy };
  }

  // Build index map
  const idx = new Map<string, number>();
  for (let i = 0; i < n; i++) idx.set(nodes[i], i);

  // Build in-edges and out-weights
  const inEdges: Map<number, [number, number][]>[] = new Array(n);
  const outWeight = new Float64Array(n);
  for (let i = 0; i < n; i++) inEdges[i] = new Map();

  // inEdgesArr[dest] = [[srcIdx, weight], ...]
  const inEdgesArr: [number, number][][] = new Array(n);
  for (let i = 0; i < n; i++) inEdgesArr[i] = [];

  for (const [src, dests] of Object.entries(adj)) {
    const srcIdx = idx.get(src);
    if (srcIdx === undefined) continue;
    // Count duplicate routes as weight
    const destCounts = new Map<string, number>();
    for (const d of dests) {
      destCounts.set(d, (destCounts.get(d) ?? 0) + 1);
    }
    for (const [d, w] of destCounts) {
      const dstIdx = idx.get(d);
      if (dstIdx === undefined) continue;
      inEdgesArr[dstIdx].push([srcIdx, w]);
      outWeight[srcIdx] += w;
    }
  }

  // Initialize P
  let P = new Float64Array(n);
  if (initStrategy === 'one') {
    P[0] = 1.0;
  } else if (initStrategy === 'square') {
    const sqr = Math.floor(Math.sqrt(n));
    for (let i = 0; i < sqr; i++) P[i] = 1.0 / sqr;
  } else {
    // 'nth' — uniform
    const v = 1.0 / n;
    for (let i = 0; i < n; i++) P[i] = v;
  }

  const L = damping;
  const base = (1.0 - L) / n;

  // Identify disconnected nodes (no outgoing edges)
  const disconnected: number[] = [];
  for (let i = 0; i < n; i++) {
    if (outWeight[i] === 0) disconnected.push(i);
  }

  const convergence: number[] = [];

  for (let it = 0; it < maxIterations; it++) {
    // Mass from disconnected nodes
    let discMass = 0;
    for (const di of disconnected) discMass += P[di];
    const discContrib = L * discMass / n;

    const Q = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (const [srcIdx, weight] of inEdgesArr[i]) {
        s += P[srcIdx] * weight / outWeight[srcIdx];
      }
      Q[i] = L * s + base + discContrib;
    }

    let maxDiff = 0;
    for (let i = 0; i < n; i++) {
      const d = Math.abs(P[i] - Q[i]);
      if (d > maxDiff) maxDiff = d;
    }
    convergence.push(maxDiff);

    P = Q;
    if (maxDiff < tolerance) break;
  }

  // Sort by score descending
  const scored: [number, number][] = [];
  for (let i = 0; i < n; i++) scored.push([i, P[i]]);
  scored.sort((a, b) => b[1] - a[1]);

  const rankings: PageRankRanking[] = scored.map(([i, score], rank) => ({
    rank: rank + 1,
    code: nodes[i],
    score,
  }));

  return {
    rankings,
    iterations: convergence.length,
    convergence,
    timeMs: performance.now() - t0,
    damping,
    initStrategy,
  };
}
