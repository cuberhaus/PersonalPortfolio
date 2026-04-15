/**
 * Lightweight algorithm kernels for the portfolio demo fallback.
 * These are simplified versions of the full algorithms in fib/web.
 */

/** Run a few steps of Dijkstra on a small graph */
export function dijkstraDemo(n: number): { dist: number[]; edges: [number, number, number][] } {
  const edges: [number, number, number][] = [
    [0, 1, 4], [0, 2, 1], [1, 3, 1], [2, 1, 2], [2, 3, 5], [3, 4, 3],
  ];
  const adj: { to: number; w: number }[][] = Array.from({ length: n }, () => []);
  for (const [u, v, w] of edges) {
    adj[u].push({ to: v, w });
    adj[v].push({ to: u, w });
  }
  const dist = new Array(n).fill(Infinity);
  const visited = new Array(n).fill(false);
  dist[0] = 0;
  for (let iter = 0; iter < n; iter++) {
    let u = -1;
    for (let i = 0; i < n; i++) {
      if (!visited[i] && (u === -1 || dist[i] < dist[u])) u = i;
    }
    if (u === -1) break;
    visited[u] = true;
    for (const { to, w } of adj[u]) {
      if (dist[u] + w < dist[to]) dist[to] = dist[u] + w;
    }
  }
  return { dist, edges };
}

/** Merge sort on a small array, returning sorted + number of comparisons */
export function mergeSortDemo(arr: number[]): { sorted: number[]; comparisons: number } {
  let comparisons = 0;
  const a = [...arr];

  function merge(lo: number, mid: number, hi: number) {
    const left = a.slice(lo, mid + 1);
    const right = a.slice(mid + 1, hi + 1);
    let i = 0, j = 0, k = lo;
    while (i < left.length && j < right.length) {
      comparisons++;
      if (left[i] <= right[j]) { a[k++] = left[i++]; }
      else { a[k++] = right[j++]; }
    }
    while (i < left.length) a[k++] = left[i++];
    while (j < right.length) a[k++] = right[j++];
  }

  function sort(lo: number, hi: number) {
    if (lo >= hi) return;
    const mid = Math.floor((lo + hi) / 2);
    sort(lo, mid);
    sort(mid + 1, hi);
    merge(lo, mid, hi);
  }

  sort(0, a.length - 1);
  return { sorted: a, comparisons };
}

/** BFS shortest path on a grid */
export function bfsGridDemo(
  rows: number,
  cols: number,
  walls: [number, number][],
): { path: [number, number][]; visited: number } {
  const grid: boolean[][] = Array.from({ length: rows }, () => new Array(cols).fill(false));
  for (const [r, c] of walls) grid[r][c] = true;

  const visited: boolean[][] = Array.from({ length: rows }, () => new Array(cols).fill(false));
  const parent: [number, number][][] = Array.from({ length: rows }, () =>
    new Array(cols).fill(null).map(() => [-1, -1] as [number, number]),
  );
  const queue: [number, number][] = [[0, 0]];
  visited[0][0] = true;
  let visitCount = 1;
  const dr = [0, 0, 1, -1], dc = [1, -1, 0, 0];

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    if (r === rows - 1 && c === cols - 1) break;
    for (let d = 0; d < 4; d++) {
      const nr = r + dr[d], nc = c + dc[d];
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (visited[nr][nc] || grid[nr][nc]) continue;
      visited[nr][nc] = true;
      parent[nr][nc] = [r, c];
      queue.push([nr, nc]);
      visitCount++;
    }
  }

  const path: [number, number][] = [];
  if (visited[rows - 1][cols - 1]) {
    let cur: [number, number] = [rows - 1, cols - 1];
    while (cur[0] !== -1) {
      path.push(cur);
      cur = parent[cur[0]][cur[1]];
    }
    path.reverse();
  }
  return { path, visited: visitCount };
}
