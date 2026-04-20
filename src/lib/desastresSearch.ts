/**
 * Toy disaster-relief local search (browser port of desastresIA ideas).
 * Heuristic matches DesastresHeuristicFunction2: sum of per-helicopter rescue times.
 */

export type GroupSpec = { nPersonas: number; prioridad: number };

export type Board = {
  groups: GroupSpec[];
  /** helicopter index -> center index */
  heliToCentro: number[];
  distCG: (c: number, g: number) => number;
  distGG: (g1: number, g2: number) => number;
};

/** Assignment[h] = ordered group ids for helicopter h */
export type Assignment = number[][];

const HELICOPTER_CAPACITY = 15;
const MAX_GROUPS_PER_SORTIE = 3;
const COOLDOWN_MINUTES = 10;
const SPEED_KM_PER_MIN = 1.66667;

function cloneAssign(a: Assignment): Assignment {
  return a.map((q) => [...q]);
}

/** Travel time between two points at helicopter speed */
function travelTime(dist: number): number {
  return dist / SPEED_KM_PER_MIN;
}

function helicopterTimeH2(
  groupIds: number[],
  centroId: number,
  board: Board,
): number {
  const { groups, distCG, distGG } = board;
  let capacity = 0;
  let time = 0;
  let lastGroup = -1;
  let groupCount = 0;

  for (let j = 0; j < groupIds.length; j++) {
    const gid = groupIds[j];
    const g = groups[gid];
    const timePerPerson = g.prioridad === 1 ? 2 : 1;
    const canFit = capacity + g.nPersonas <= HELICOPTER_CAPACITY && groupCount < MAX_GROUPS_PER_SORTIE;

    if (canFit) {
      // Pick up this group in the current sortie
      capacity += g.nPersonas;
      groupCount++;
      time += lastGroup === -1
        ? travelTime(distCG(centroId, gid))
        : travelTime(distGG(lastGroup, gid));
      time += g.nPersonas * timePerPerson;
      lastGroup = gid;
    } else {
      // Return to base, cooldown, start new sortie
      time += travelTime(distCG(centroId, lastGroup));
      time += COOLDOWN_MINUTES;
      time += travelTime(distCG(centroId, gid));
      time += g.nPersonas * timePerPerson;
      lastGroup = gid;
      capacity = g.nPersonas;
      groupCount = 1;
    }

    // After the last group, fly back to base
    if (j === groupIds.length - 1) {
      time += travelTime(distCG(centroId, gid));
    }
  }
  return time;
}

export function heuristicSum(board: Board, assign: Assignment): number {
  let t = 0;
  for (let h = 0; h < assign.length; h++) {
    const c = board.heliToCentro[h] ?? 0;
    t += helicopterTimeH2(assign[h], c, board);
  }
  return t;
}

/** Per-helicopter completion time (same as one term inside H2 sum) */
export function perHelicopterTimes(board: Board, assign: Assignment): number[] {
  return assign.map((q, h) => helicopterTimeH2(q, board.heliToCentro[h] ?? 0, board));
}

export type ToyLayout = {
  centerPos: { x: number; y: number }[];
  groupPos: { x: number; y: number }[];
  heliToCentro: number[];
};

function swap(assign: Assignment, h1: number, p1: number, h2: number, p2: number): void {
  const a = assign[h1][p1];
  assign[h1][p1] = assign[h2][p2];
  assign[h2][p2] = a;
}

/** All SWAP neighbors (SF1-style) */
export function* neighborsSwap(assign: Assignment): Generator<Assignment> {
  const H = assign.length;
  for (let i = 0; i < H; i++) {
    for (let j = i; j < H; j++) {
      const li = assign[i].length;
      const lj = assign[j].length;
      for (let k = 0; k < li; k++) {
        for (let l = 0; l < lj; l++) {
          if (i === j && k === l) continue;
          const next = cloneAssign(assign);
          swap(next, i, k, j, l);
          yield next;
        }
      }
    }
  }
}

export function randomInitialAssignment(
  nGroups: number,
  nHelis: number,
  rng: () => number,
): Assignment {
  const assign: Assignment = Array.from({ length: nHelis }, () => []);
  const remaining = Array.from({ length: nGroups }, (_, g) => g);
  for (let s = remaining.length; s > 0; s--) {
    const ig = Math.floor(rng() * s);
    const g = remaining[ig];
    remaining[ig] = remaining[s - 1];
    const h = Math.floor(rng() * nHelis);
    assign[h].push(g);
  }
  return assign;
}

/** Seeded PRNG */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type HillClimbResult = {
  assignment: Assignment;
  cost: number;
  iterations: number;
  log: string[];
};

/**
 * Steepest-descent hill climbing over SWAP neighborhood.
 * Evaluates all O(n^2 * m^2) neighbors per iteration where n = total groups
 * and m = number of helicopters. Fine for the toy demo (7 groups, 3 helis).
 */
export function hillClimbing(
  board: Board,
  initial: Assignment,
  maxIterations = 500,
): HillClimbResult {
  const log: string[] = [];
  let current = cloneAssign(initial);
  let cost = heuristicSum(board, current);
  let iter = 0;
  log.push(`start cost=${cost.toFixed(2)}`);

  while (iter < maxIterations) {
    let best: Assignment | null = null;
    let bestCost = cost;
    for (const n of neighborsSwap(current)) {
      const hn = heuristicSum(board, n);
      if (hn < bestCost - 1e-9) {
        bestCost = hn;
        best = n;
      }
    }
    if (best === null) {
      log.push(`HC plateau at iter ${iter}, cost=${cost.toFixed(2)}`);
      break;
    }
    current = best;
    cost = bestCost;
    iter++;
    if (iter <= 5 || iter % 20 === 0) log.push(`iter ${iter} cost=${cost.toFixed(2)}`);
  }
  return { assignment: current, cost, iterations: iter, log };
}

export type SAResult = {
  assignment: Assignment;
  cost: number;
  steps: number;
  log: string[];
};

export function simulatedAnnealing(
  board: Board,
  initial: Assignment,
  opts: {
    steps?: number;
    t0?: number;
    cooling?: number;
    rng: () => number;
  },
): SAResult {
  const steps = opts.steps ?? 8000;
  let T = opts.t0 ?? 400;
  const cooling = opts.cooling ?? 0.9995;
  const rng = opts.rng;

  let current = cloneAssign(initial);
  let cost = heuristicSum(board, current);
  let best = cloneAssign(current);
  let bestCost = cost;
  const log: string[] = [`SA start cost=${cost.toFixed(2)} T=${T}`];

  const H = current.length;
  for (let s = 0; s < steps; s++) {
    const i = Math.floor(rng() * H);
    const j = Math.floor(rng() * H);
    const li = current[i].length;
    const lj = current[j].length;
    if (li === 0 || lj === 0) {
      T *= cooling;
      continue;
    }
    const pi = Math.floor(rng() * li);
    const pj = Math.floor(rng() * lj);
    if (i === j && pi === pj) {
      T *= cooling;
      continue;
    }
    const next = cloneAssign(current);
    swap(next, i, pi, j, pj);
    const hn = heuristicSum(board, next);
    const delta = hn - cost;
    if (delta < 0 || rng() < Math.exp(-delta / Math.max(T, 1e-9))) {
      current = next;
      cost = hn;
      if (cost < bestCost) {
        bestCost = cost;
        best = cloneAssign(current);
      }
    }
    T *= cooling;
    if (s > 0 && s % 2000 === 0) log.push(`step ${s} current=${cost.toFixed(2)} best=${bestCost.toFixed(2)} T=${T.toFixed(4)}`);
  }
  log.push(`SA end best=${bestCost.toFixed(2)}`);
  return { assignment: best, cost: bestCost, steps, log };
}

const DEFAULT_TOY_GROUPS: GroupSpec[] = [
  { nPersonas: 6, prioridad: 0 },
  { nPersonas: 5, prioridad: 1 },
  { nPersonas: 4, prioridad: 0 },
  { nPersonas: 8, prioridad: 0 },
  { nPersonas: 3, prioridad: 1 },
  { nPersonas: 7, prioridad: 0 },
  { nPersonas: 5, prioridad: 0 },
];

/** Board + 2D layout for drawing (same seed → same positions as search) */
export function defaultToyScenario(seed: number): {
  board: Board;
  layout: ToyLayout;
  nHelis: number;
  nGroups: number;
} {
  const rng = mulberry32(seed);
  const nCentros = 2;
  const nHelisPerCentro = [2, 1];
  const nG = DEFAULT_TOY_GROUPS.length;

  const centerPos: { x: number; y: number }[] = [];
  for (let c = 0; c < nCentros; c++) {
    centerPos.push({ x: rng() * 40 + 5, y: rng() * 40 + 5 });
  }
  const groupPos: { x: number; y: number }[] = [];
  for (let g = 0; g < nG; g++) {
    groupPos.push({ x: rng() * 50 + 2, y: rng() * 50 + 2 });
  }
  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);
  const distCG = (c: number, g: number) => dist(centerPos[c], groupPos[g]);
  const distGG = (g1: number, g2: number) => dist(groupPos[g1], groupPos[g2]);
  const heliToCentro: number[] = [];
  for (let c = 0; c < nCentros; c++) {
    for (let k = 0; k < nHelisPerCentro[c]; k++) heliToCentro.push(c);
  }
  const board: Board = {
    groups: DEFAULT_TOY_GROUPS,
    heliToCentro,
    distCG,
    distGG,
  };
  return {
    board,
    layout: { centerPos, groupPos, heliToCentro },
    nHelis: heliToCentro.length,
    nGroups: nG,
  };
}
