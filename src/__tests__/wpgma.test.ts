import { describe, it, expect } from 'vitest';
import {
  speciesDistance,
  buildDistanceTable,
  initClusters,
  wpgmaStep,
  runFullWpgma,
  distanceTableToArray,
  SAMPLE_SPECIES,
  DEFAULT_K,
  type Species,
  type TreeNode,
} from '../lib/wpgma';

function getLeaves(node: TreeNode): string[] {
  if (!node.left && !node.right) return [node.id];
  return [
    ...(node.left ? getLeaves(node.left) : []),
    ...(node.right ? getLeaves(node.right) : []),
  ];
}

describe('speciesDistance', () => {
  it('returns 0 for identical sequences', () => {
    expect(speciesDistance('AACTG', 'AACTG', 3)).toBe(0);
  });

  it('returns 100 for completely disjoint k-mer sets', () => {
    expect(speciesDistance('AAAA', 'CCCC', 3)).toBe(100);
  });

  it('is symmetric', () => {
    const d1 = speciesDistance('AACTGCAT', 'GGTACCATGC', 3);
    const d2 = speciesDistance('GGTACCATGC', 'AACTGCAT', 3);
    expect(d1).toBe(d2);
  });

  it('shorter distance for more similar sequences', () => {
    const ab = speciesDistance(SAMPLE_SPECIES[0].gene, SAMPLE_SPECIES[1].gene, DEFAULT_K);
    const ac = speciesDistance(SAMPLE_SPECIES[0].gene, SAMPLE_SPECIES[2].gene, DEFAULT_K);
    expect(ab).toBeLessThan(ac);
  });

  it('returns value in [0, 100]', () => {
    for (let i = 0; i < SAMPLE_SPECIES.length; i++) {
      for (let j = i + 1; j < SAMPLE_SPECIES.length; j++) {
        const d = speciesDistance(SAMPLE_SPECIES[i].gene, SAMPLE_SPECIES[j].gene, DEFAULT_K);
        expect(d).toBeGreaterThanOrEqual(0);
        expect(d).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('buildDistanceTable', () => {
  const table = buildDistanceTable(SAMPLE_SPECIES, DEFAULT_K);

  it('contains all species IDs sorted', () => {
    expect(table.ids).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  it('distance table is symmetric (stored as upper triangle)', () => {
    const { ids, matrix } = distanceTableToArray(table.distances);
    for (let i = 0; i < ids.length; i++) {
      for (let j = 0; j < ids.length; j++) {
        if (i === j) continue;
        expect(matrix[i][j]).toBe(matrix[j][i]);
      }
    }
  });
});

describe('wpgmaStep', () => {
  it('reduces cluster count by 1', () => {
    const table = buildDistanceTable(SAMPLE_SPECIES, DEFAULT_K);
    const state = initClusters(table);
    const before = state.clusters.size;
    const step = wpgmaStep(state);
    expect(step).not.toBeNull();
    expect(step!.state.clusters.size).toBe(before - 1);
  });

  it('returns null when only 1 cluster remains', () => {
    const single: Species[] = [{ id: 'X', gene: 'AAAA' }];
    const table = buildDistanceTable(single, 2);
    const state = initClusters(table);
    expect(wpgmaStep(state)).toBeNull();
  });

  it('merged node distance is half the pair distance', () => {
    const table = buildDistanceTable(SAMPLE_SPECIES, DEFAULT_K);
    const state = initClusters(table);
    const step = wpgmaStep(state)!;
    expect(step.merged.distance / 2).toBeCloseTo(
      step.state.clusters.get(step.merged.newId)!.distance,
      5
    );
  });
});

describe('runFullWpgma', () => {
  const table = buildDistanceTable(SAMPLE_SPECIES, DEFAULT_K);
  const root = runFullWpgma(table);

  it('produces a single root node', () => {
    expect(root).not.toBeNull();
  });

  it('root has both left and right children', () => {
    expect(root!.left).not.toBeNull();
    expect(root!.right).not.toBeNull();
  });

  it('tree leaves contain exactly all original species', () => {
    const leaves = getLeaves(root!).sort();
    expect(leaves).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  it('produces deterministic results', () => {
    const root2 = runFullWpgma(buildDistanceTable(SAMPLE_SPECIES, DEFAULT_K));
    expect(getLeaves(root!).sort()).toEqual(getLeaves(root2!).sort());
    expect(root!.distance).toBe(root2!.distance);
  });
});

describe('distanceTableToArray', () => {
  it('matrix diagonal is null', () => {
    const table = buildDistanceTable(SAMPLE_SPECIES, DEFAULT_K);
    const { ids, matrix } = distanceTableToArray(table.distances);
    for (let i = 0; i < ids.length; i++) {
      expect(matrix[i][i]).toBeNull();
    }
  });
});
