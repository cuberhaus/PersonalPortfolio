export interface TreeNode {
  id: string;
  distance: number;
  left: TreeNode | null;
  right: TreeNode | null;
}

function generateKmers(gene: string, k: number): Map<string, number> {
  const kmers = new Map<string, number>();
  for (let i = 0; i <= gene.length - k; i++) {
    const kmer = gene.substring(i, i + k);
    kmers.set(kmer, (kmers.get(kmer) || 0) + 1);
  }
  return kmers;
}

export function speciesDistance(
  gene1: string,
  gene2: string,
  k: number
): number {
  const kmers1 = generateKmers(gene1, k);
  const kmers2 = generateKmers(gene2, k);

  const allKeys = new Set([...kmers1.keys(), ...kmers2.keys()]);
  let union = 0;
  let intersection = 0;

  for (const key of allKeys) {
    const v1 = kmers1.get(key) || 0;
    const v2 = kmers2.get(key) || 0;
    union += Math.max(v1, v2);
    intersection += Math.min(v1, v2);
  }

  if (union === 0) return 100;
  return (1 - intersection / union) * 100;
}

export interface Species {
  id: string;
  gene: string;
}

export interface DistanceTable {
  ids: string[];
  distances: Map<string, Map<string, number>>;
}

export function buildDistanceTable(
  species: Species[],
  k: number
): DistanceTable {
  const ids = species.map((s) => s.id).sort();
  const distances = new Map<string, Map<string, number>>();

  for (const id of ids) {
    distances.set(id, new Map());
  }

  for (let i = 0; i < species.length; i++) {
    for (let j = i + 1; j < species.length; j++) {
      const s1 = species[i];
      const s2 = species[j];
      const dist = speciesDistance(s1.gene, s2.gene, k);
      const [lo, hi] = s1.id < s2.id ? [s1.id, s2.id] : [s2.id, s1.id];
      distances.get(lo)!.set(hi, dist);
    }
  }

  return { ids, distances };
}

export interface ClusterState {
  clusters: Map<string, TreeNode>;
  distances: Map<string, Map<string, number>>;
}

export function initClusters(table: DistanceTable): ClusterState {
  const clusters = new Map<string, TreeNode>();
  for (const id of table.ids) {
    clusters.set(id, { id, distance: 0, left: null, right: null });
  }

  const distances = new Map<string, Map<string, number>>();
  for (const [key, inner] of table.distances) {
    distances.set(key, new Map(inner));
  }

  return { clusters, distances };
}

function getDistance(
  distances: Map<string, Map<string, number>>,
  a: string,
  b: string
): number {
  const [lo, hi] = a < b ? [a, b] : [b, a];
  return distances.get(lo)?.get(hi) ?? 0;
}

function findMinPair(
  distances: Map<string, Map<string, number>>
): { dist: number; id1: string; id2: string } {
  let minDist = Infinity;
  let id1 = "";
  let id2 = "";

  for (const [row, cols] of distances) {
    for (const [col, d] of cols) {
      if (d < minDist) {
        minDist = d;
        id1 = row;
        id2 = col;
      }
    }
  }

  return { dist: minDist, id1, id2 };
}

export interface WpgmaStep {
  merged: { id1: string; id2: string; newId: string; distance: number };
  state: ClusterState;
}

export function wpgmaStep(state: ClusterState): WpgmaStep | null {
  if (state.clusters.size <= 1) return null;

  const { dist, id1, id2 } = findMinPair(state.distances);
  const newId = id1 + id2;
  const halfDist = dist / 2;

  const newNode: TreeNode = {
    id: newId,
    distance: halfDist,
    left: state.clusters.get(id1)!,
    right: state.clusters.get(id2)!,
  };

  const newClusters = new Map(state.clusters);
  newClusters.delete(id1);
  newClusters.delete(id2);
  newClusters.set(newId, newNode);

  const remainingIds = [...newClusters.keys()].filter((k) => k !== newId);
  const newDistances = new Map<string, Map<string, number>>();

  for (const otherId of remainingIds) {
    const d1 = getDistance(state.distances, id1, otherId);
    const d2 = getDistance(state.distances, id2, otherId);
    const avgDist = (d1 + d2) / 2;

    const [lo, hi] =
      newId < otherId ? [newId, otherId] : [otherId, newId];
    if (!newDistances.has(lo)) newDistances.set(lo, new Map());
    newDistances.get(lo)!.set(hi, avgDist);
  }

  for (const a of remainingIds) {
    for (const b of remainingIds) {
      if (a < b) {
        const d = getDistance(state.distances, a, b);
        if (!newDistances.has(a)) newDistances.set(a, new Map());
        newDistances.get(a)!.set(b, d);
      }
    }
  }

  const allIds = [newId, ...remainingIds].sort();
  for (const id of allIds) {
    if (!newDistances.has(id)) newDistances.set(id, new Map());
  }

  return {
    merged: { id1, id2, newId, distance: dist },
    state: { clusters: newClusters, distances: newDistances },
  };
}

export function runFullWpgma(table: DistanceTable): TreeNode | null {
  let state = initClusters(table);
  while (state.clusters.size > 1) {
    const step = wpgmaStep(state);
    if (!step) break;
    state = step.state;
  }
  const entries = [...state.clusters.values()];
  return entries[0] ?? null;
}

export function distanceTableToArray(
  distances: Map<string, Map<string, number>>
): { ids: string[]; matrix: (number | null)[][] } {
  const allIds = new Set<string>();
  for (const [row, cols] of distances) {
    allIds.add(row);
    for (const col of cols.keys()) {
      allIds.add(col);
    }
  }
  const ids = [...allIds].sort();
  const matrix: (number | null)[][] = ids.map(() =>
    ids.map(() => null)
  );

  for (const [row, cols] of distances) {
    for (const [col, d] of cols) {
      const i = ids.indexOf(row);
      const j = ids.indexOf(col);
      matrix[i][j] = d;
      matrix[j][i] = d;
    }
  }

  return { ids, matrix };
}

export const SAMPLE_SPECIES: Species[] = [
  { id: "A", gene: "AACTGCATGC" },
  { id: "B", gene: "AACTGCTTGC" },
  { id: "C", gene: "GGTACCATGC" },
  { id: "D", gene: "CATGCAACTG" },
  { id: "E", gene: "TTGCAACTGC" },
];

export const DEFAULT_K = 3;
