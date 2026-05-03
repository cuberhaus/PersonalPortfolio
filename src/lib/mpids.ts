// MPIDS (Minimum Positive Influence Dominating Set) solver — ported from C++.
// A vertex v is dominated if at least ceil(deg(v)/2) of its neighbors are in the set.

export interface Graph {
  n: number;
  edges: [number, number][];
  adj: number[][];
}

export interface MPIDSResult {
  set: Set<number>;
  size: number;
  timeMs: number;
}

export function parseGraph(text: string): Graph {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  let idx = 0;
  const first = lines[idx++].trim().split(/\s+/).map(Number);
  let n: number, m: number;
  if (first.length >= 2) {
    n = first[0]; m = first[1];
  } else {
    n = first[0]; m = Number(lines[idx++].trim());
  }
  const adj: number[][] = Array.from({ length: n }, () => []);
  const edges: [number, number][] = [];
  for (let i = 0; i < m && idx < lines.length; i++, idx++) {
    const parts = lines[idx].trim().split(/\s+/).map(Number);
    const u = parts[0] - 1, v = parts[1] - 1;
    if (u < 0 || v < 0 || u >= n || v >= n) continue;
    adj[u].push(v);
    adj[v].push(u);
    edges.push([u, v]);
  }
  return { n, edges, adj };
}

function minDominantNeighbors(degree: number): number {
  return Math.ceil(degree / 2);
}

export function isDominant(graph: Graph, domSet: Set<number>): boolean {
  for (let i = 0; i < graph.n; i++) {
    const deg = graph.adj[i].length;
    if (deg === 0) continue;
    let count = 0;
    for (const nb of graph.adj[i]) {
      if (domSet.has(nb)) count++;
    }
    if (count < minDominantNeighbors(deg)) return false;
  }
  return true;
}

export function dominanceInfo(graph: Graph, domSet: Set<number>): { dominated: boolean; count: number; needed: number }[] {
  return Array.from({ length: graph.n }, (_, i) => {
    const deg = graph.adj[i].length;
    const needed = deg === 0 ? 0 : minDominantNeighbors(deg);
    let count = 0;
    for (const nb of graph.adj[i]) {
      if (domSet.has(nb)) count++;
    }
    return { dominated: count >= needed, count, needed };
  });
}

// Greedy heuristic: start with all nodes, iteratively try to remove the one
// with highest degree that can be removed while maintaining dominance.
export function greedySolver(graph: Graph): MPIDSResult {
  const t0 = performance.now();
  const domSet = new Set<number>();

  // Start with all nodes in the set
  for (let i = 0; i < graph.n; i++) domSet.add(i);

  // Track dominant neighbor count for each node
  const domNeigh = new Int32Array(graph.n);
  for (let i = 0; i < graph.n; i++) domNeigh[i] = graph.adj[i].length;

  // Try removing nodes in descending degree order (highest degree first — most redundant)
  const order = Array.from({ length: graph.n }, (_, i) => i);
  order.sort((a, b) => graph.adj[b].length - graph.adj[a].length);

  for (const node of order) {
    if (!domSet.has(node)) continue;
    // Check if removing this node keeps all its neighbors dominated
    let canRemove = true;
    for (const nb of graph.adj[node]) {
      if (domNeigh[nb] - 1 < minDominantNeighbors(graph.adj[nb].length)) {
        canRemove = false;
        break;
      }
    }
    if (canRemove) {
      domSet.delete(node);
      for (const nb of graph.adj[node]) domNeigh[nb]--;
    }
  }

  return { set: domSet, size: domSet.size, timeMs: performance.now() - t0 };
}

// Local search (simulated annealing): start from greedy solution, try to improve.
export function localSearchSolver(graph: Graph, iterations = 2000): MPIDSResult {
  const t0 = performance.now();

  // Start from greedy solution
  const greedy = greedySolver(graph);
  const domSet = new Set(greedy.set);
  const rest = new Set<number>();
  for (let i = 0; i < graph.n; i++) {
    if (!domSet.has(i)) rest.add(i);
  }

  const domNeigh = new Int32Array(graph.n);
  for (let i = 0; i < graph.n; i++) {
    for (const nb of graph.adj[i]) {
      if (domSet.has(nb)) domNeigh[i]++;
    }
  }

  let bestSet = new Set(domSet);
  let bestSize = domSet.size;
  let temp = graph.n;
  const lambda = 0.003;

  for (let it = 0; it < iterations; it++) {
    temp = graph.n * Math.exp(-lambda * it);

    // Find removable nodes
    const removable: number[] = [];
    for (const node of domSet) {
      let canRemove = true;
      for (const nb of graph.adj[node]) {
        if (domNeigh[nb] - 1 < minDominantNeighbors(graph.adj[nb].length)) {
          canRemove = false;
          break;
        }
      }
      if (canRemove) removable.push(node);
    }

    if (removable.length > 0) {
      // Remove a random removable node
      const node = removable[Math.floor(Math.random() * removable.length)];
      domSet.delete(node);
      rest.add(node);
      for (const nb of graph.adj[node]) domNeigh[nb]--;
      if (domSet.size < bestSize) {
        bestSet = new Set(domSet);
        bestSize = domSet.size;
      }
    } else if (rest.size > 0) {
      // Add a random node (with SA acceptance for worsening moves)
      const arr = Array.from(rest);
      const node = arr[Math.floor(Math.random() * arr.length)];
      const diff = -1; // adding a node worsens the objective
      const prob = Math.exp(diff / Math.max(temp, 0.01));
      if (Math.random() < prob) {
        domSet.add(node);
        rest.delete(node);
        for (const nb of graph.adj[node]) domNeigh[nb]++;
      }
    }
  }

  return { set: bestSet, size: bestSize, timeMs: performance.now() - t0 };
}

// ─── Force-directed layout ───

export interface NodePos {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export function forceLayout(
  graph: Graph,
  width: number,
  height: number,
  iterations = 300,
  onIter?: (info: { i: number; energy: number }) => void,
): { x: number; y: number }[] {
  const n = graph.n;
  if (n === 0) return [];

  const nodes: NodePos[] = Array.from({ length: n }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: 0,
    vy: 0,
  }));

  const area = width * height;
  const k = Math.sqrt(area / Math.max(n, 1));
  const cooling = 0.95;
  let temp = Math.min(width, height) * 0.1;

  for (let iter = 0; iter < iterations; iter++) {
    // Repulsive forces between all pairs
    for (let i = 0; i < n; i++) {
      nodes[i].vx = 0;
      nodes[i].vy = 0;
    }

    // Use a grid-based approximation for large graphs
    if (n <= 500) {
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 0.01);
          const force = (k * k) / dist;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          nodes[i].vx += fx;
          nodes[i].vy += fy;
          nodes[j].vx -= fx;
          nodes[j].vy -= fy;
        }
      }
    } else {
      // For large graphs, only compute repulsion for nearby nodes + neighbors
      for (let i = 0; i < n; i++) {
        // Sample repulsion from ~50 random nodes
        const samples = Math.min(50, n);
        for (let s = 0; s < samples; s++) {
          const j = Math.floor(Math.random() * n);
          if (j === i) continue;
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 0.01);
          const force = (k * k) / dist * (n / samples);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          nodes[i].vx += fx;
          nodes[i].vy += fy;
        }
      }
    }

    // Attractive forces along edges
    for (const [u, v] of graph.edges) {
      const dx = nodes[u].x - nodes[v].x;
      const dy = nodes[u].y - nodes[v].y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 0.01);
      const force = (dist * dist) / k;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      nodes[u].vx -= fx;
      nodes[u].vy -= fy;
      nodes[v].vx += fx;
      nodes[v].vy += fy;
    }

    // Center gravity
    for (let i = 0; i < n; i++) {
      const dx = width / 2 - nodes[i].x;
      const dy = height / 2 - nodes[i].y;
      nodes[i].vx += dx * 0.01;
      nodes[i].vy += dy * 0.01;
    }

    // Apply velocity with temperature limiting
    for (let i = 0; i < n; i++) {
      const speed = Math.sqrt(nodes[i].vx ** 2 + nodes[i].vy ** 2);
      if (speed > temp) {
        nodes[i].vx = (nodes[i].vx / speed) * temp;
        nodes[i].vy = (nodes[i].vy / speed) * temp;
      }
      nodes[i].x += nodes[i].vx;
      nodes[i].y += nodes[i].vy;
      // Clamp to bounds with padding
      const pad = 20;
      nodes[i].x = Math.max(pad, Math.min(width - pad, nodes[i].x));
      nodes[i].y = Math.max(pad, Math.min(height - pad, nodes[i].y));
    }

    if (onIter && iter % Math.max(1, Math.floor(iterations / 30)) === 0) {
      let energy = 0;
      for (let i = 0; i < n; i++) {
        energy += nodes[i].vx * nodes[i].vx + nodes[i].vy * nodes[i].vy;
      }
      onIter({ i: iter, energy });
    }

    temp *= cooling;
  }

  return nodes.map((n) => ({ x: n.x, y: n.y }));
}

// ─── Sample graphs ───

const SMALL_GRAPH = `10 10
1 6
1 8
2 3
3 7
3 9
3 10
4 7
5 7
6 8
6 10`;

const PETERSEN_GRAPH = `10 15
1 2
1 5
1 6
2 3
2 7
3 4
3 8
4 5
4 9
5 10
6 8
6 9
7 9
7 10
8 10`;

const GRID_4X4 = (() => {
  const size = 4, n = size * size;
  const edges: string[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const id = r * size + c + 1;
      if (c + 1 < size) edges.push(`${id} ${id + 1}`);
      if (r + 1 < size) edges.push(`${id} ${id + size}`);
    }
  }
  return `${n} ${edges.length}\n${edges.join("\n")}`;
})();

export function generateRandomGraph(n: number, edgeProb: number): string {
  const edges: string[] = [];
  for (let i = 1; i <= n; i++) {
    for (let j = i + 1; j <= n; j++) {
      if (Math.random() < edgeProb) edges.push(`${i} ${j}`);
    }
  }
  return `${n} ${edges.length}\n${edges.join("\n")}`;
}

export const SAMPLE_GRAPHS: { name: string; data: string; description: string }[] = [
  { name: "Small (10 nodes)", data: SMALL_GRAPH, description: "Simple test graph from the project" },
  { name: "Petersen graph", data: PETERSEN_GRAPH, description: "Classic 3-regular graph" },
  { name: "4×4 Grid", data: GRID_4X4, description: "16-node grid graph" },
];
