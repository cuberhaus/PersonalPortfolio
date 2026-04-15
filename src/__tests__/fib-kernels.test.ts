import { describe, it, expect } from 'vitest';
import { dijkstraDemo, mergeSortDemo, bfsGridDemo } from '../lib/fib-kernels';

describe('fib-kernels', () => {
  describe('dijkstraDemo', () => {
    it('returns correct shortest distances from node 0', () => {
      const { dist } = dijkstraDemo(5);
      expect(dist[0]).toBe(0);
      expect(dist[1]).toBe(3); // 0→2(1) + 2→1(2)
      expect(dist[2]).toBe(1); // 0→2(1)
      expect(dist[3]).toBe(4); // 0→2(1) + 2→1(2) + 1→3(1)
      expect(dist[4]).toBe(7); // 0→2→1→3→4
    });

    it('returns 6 edges', () => {
      const { edges } = dijkstraDemo(5);
      expect(edges).toHaveLength(6);
    });

    it('has no Infinity distances for 5-node graph', () => {
      const { dist } = dijkstraDemo(5);
      for (const d of dist) {
        expect(d).not.toBe(Infinity);
      }
    });

    it('each edge has three elements [u, v, w]', () => {
      const { edges } = dijkstraDemo(5);
      for (const e of edges) {
        expect(e).toHaveLength(3);
        expect(typeof e[0]).toBe('number');
        expect(typeof e[1]).toBe('number');
        expect(typeof e[2]).toBe('number');
      }
    });
  });

  describe('mergeSortDemo', () => {
    it('returns a sorted array', () => {
      const { sorted } = mergeSortDemo([38, 72, 15, 91, 50]);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i]).toBeGreaterThanOrEqual(sorted[i - 1]);
      }
    });

    it('preserves all elements', () => {
      const input = [38, 72, 15, 91, 50];
      const { sorted } = mergeSortDemo(input);
      expect(sorted.sort()).toEqual([...input].sort());
    });

    it('counts comparisons > 0 for non-trivial arrays', () => {
      const { comparisons } = mergeSortDemo([5, 3, 1, 4, 2]);
      expect(comparisons).toBeGreaterThan(0);
    });

    it('handles single-element array', () => {
      const { sorted, comparisons } = mergeSortDemo([42]);
      expect(sorted).toEqual([42]);
      expect(comparisons).toBe(0);
    });

    it('handles empty array', () => {
      const { sorted, comparisons } = mergeSortDemo([]);
      expect(sorted).toEqual([]);
      expect(comparisons).toBe(0);
    });

    it('handles already sorted array', () => {
      const { sorted } = mergeSortDemo([1, 2, 3, 4, 5]);
      expect(sorted).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('bfsGridDemo', () => {
    it('finds a path from (0,0) to (rows-1, cols-1)', () => {
      const { path } = bfsGridDemo(5, 5, []);
      expect(path.length).toBeGreaterThan(0);
      expect(path[0]).toEqual([0, 0]);
      expect(path[path.length - 1]).toEqual([4, 4]);
    });

    it('visits at least start and end cells', () => {
      const { visited } = bfsGridDemo(5, 5, []);
      expect(visited).toBeGreaterThanOrEqual(2);
    });

    it('returns empty path when goal is blocked', () => {
      // Wall off the bottom-right corner completely
      const walls: [number, number][] = [
        [3, 4], [4, 3], [4, 4],
      ];
      const { path } = bfsGridDemo(5, 5, walls);
      expect(path).toHaveLength(0);
    });

    it('path cells are adjacent (Manhattan distance 1)', () => {
      const { path } = bfsGridDemo(9, 11, [[1, 2], [3, 1], [5, 4]]);
      for (let i = 1; i < path.length; i++) {
        const dr = Math.abs(path[i][0] - path[i - 1][0]);
        const dc = Math.abs(path[i][1] - path[i - 1][1]);
        expect(dr + dc).toBe(1);
      }
    });
  });
});
