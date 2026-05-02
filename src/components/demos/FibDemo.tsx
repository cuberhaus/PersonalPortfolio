import { useRef, useEffect, useState } from 'react';
import { dijkstraDemo, mergeSortDemo, bfsGridDemo } from '../../lib/fib-kernels';
import { T } from '../../i18n/demos/fib-demo';
import { getThemeColors, lighten } from '../../lib/demo-theme';
import { useDemoLifecycle, useDebug } from '../../lib/useDebug';

export default function FibDemo({ lang = 'en' }: { lang?: string }) {
  const t = T[lang] || T.en;
  useDemoLifecycle('demo:algorithms', { lang });
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
      <GraphPanel label={t.graph} />
      <SortPanel label={t.sort} />
      <MazePanel label={t.maze} />
    </div>
  );
}

function GraphPanel({ label }: { label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const log = useDebug('demo:algorithms');
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 220 * dpr;
    canvas.height = 180 * dpr;
    ctx.scale(dpr, dpr);

    const { dist, edges } = dijkstraDemo(5, ({ algo, step }) => log.trace('algo-step', { algo, step }));
    const pos = [
      [110, 30], [40, 80], [180, 80], [80, 150], [160, 150],
    ];

    const tc = getThemeColors();
    ctx.fillStyle = tc.bgSecondary;
    ctx.fillRect(0, 0, 220, 180);

    for (const [u, v, w] of edges) {
      ctx.beginPath();
      ctx.strokeStyle = tc.borderColor;
      ctx.lineWidth = 1.5;
      ctx.moveTo(pos[u][0], pos[u][1]);
      ctx.lineTo(pos[v][0], pos[v][1]);
      ctx.stroke();
      ctx.fillStyle = tc.textMuted;
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(String(w), (pos[u][0] + pos[v][0]) / 2, (pos[u][1] + pos[v][1]) / 2 - 5);
    }

    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(pos[i][0], pos[i][1], 14, 0, Math.PI * 2);
      ctx.fillStyle = tc.accentStart;
      ctx.fill();
      ctx.strokeStyle = lighten(tc.accentStart, 0.3);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i), pos[i][0], pos[i][1]);
      ctx.fillStyle = tc.accentEnd;
      ctx.font = '9px monospace';
      ctx.fillText(dist[i] === Infinity ? '∞' : String(dist[i]), pos[i][0], pos[i][1] - 22);
    }
  }, [log]);

  return (
    <div style={{ textAlign: 'center' }}>
      <h4 style={{ color: 'var(--accent-start)', margin: '0 0 8px', fontSize: 14 }}>{label}</h4>
      <canvas ref={ref} style={{ width: 220, height: 180, borderRadius: 8, border: '1px solid var(--border-color)' }} />
    </div>
  );
}

function SortPanel({ label }: { label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const log = useDebug('demo:algorithms');
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 220 * dpr;
    canvas.height = 180 * dpr;
    ctx.scale(dpr, dpr);

    const arr = [38, 72, 15, 91, 50, 23, 67, 44, 8, 83];
    const { sorted, comparisons } = mergeSortDemo(arr, ({ algo, step }) => log.trace('algo-step', { algo, step }));

    const tc = getThemeColors();
    ctx.fillStyle = tc.bgSecondary;
    ctx.fillRect(0, 0, 220, 180);

    const barW = 220 / sorted.length;
    const max = Math.max(...sorted);
    for (let i = 0; i < sorted.length; i++) {
      const h = (sorted[i] / max) * 140;
      ctx.fillStyle = tc.accentStart;
      ctx.fillRect(i * barW + 2, 160 - h, barW - 4, h);
    }

    ctx.fillStyle = tc.textMuted;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${comparisons} comparisons`, 110, 175);
  }, [log]);

  return (
    <div style={{ textAlign: 'center' }}>
      <h4 style={{ color: 'var(--accent-start)', margin: '0 0 8px', fontSize: 14 }}>{label}</h4>
      <canvas ref={ref} style={{ width: 220, height: 180, borderRadius: 8, border: '1px solid var(--border-color)' }} />
    </div>
  );
}

function MazePanel({ label }: { label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const log = useDebug('demo:algorithms');
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 220 * dpr;
    canvas.height = 180 * dpr;
    ctx.scale(dpr, dpr);

    const rows = 9, cols = 11;
    const walls: [number, number][] = [
      [1, 2], [1, 3], [2, 5], [3, 1], [3, 3], [3, 5], [3, 7],
      [5, 2], [5, 4], [5, 6], [6, 8], [7, 1], [7, 3], [7, 5],
    ];
    const { path, visited } = bfsGridDemo(rows, cols, walls, ({ algo, step }) => log.trace('algo-step', { algo, step }));

    const tc = getThemeColors();
    ctx.fillStyle = tc.bgSecondary;
    ctx.fillRect(0, 0, 220, 180);

    const cellW = 220 / cols, cellH = 180 / rows;
    const wallSet = new Set(walls.map(([r, c]) => `${r}-${c}`));
    const pathSet = new Set(path.map(([r, c]) => `${r}-${c}`));

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const key = `${r}-${c}`;
        if (wallSet.has(key)) ctx.fillStyle = tc.borderColorHover;
        else if (pathSet.has(key)) ctx.fillStyle = tc.accentStart;
        else ctx.fillStyle = tc.bgCard;
        ctx.fillRect(c * cellW, r * cellH, cellW - 1, cellH - 1);
      }
    }
  }, [log]);

  return (
    <div style={{ textAlign: 'center' }}>
      <h4 style={{ color: 'var(--accent-start)', margin: '0 0 8px', fontSize: 14 }}>{label}</h4>
      <canvas ref={ref} style={{ width: 220, height: 180, borderRadius: 8, border: '1px solid var(--border-color)' }} />
    </div>
  );
}
