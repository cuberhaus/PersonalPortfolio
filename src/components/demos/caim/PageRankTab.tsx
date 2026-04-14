import { useState, useRef, useEffect, useCallback } from 'react';
import { geoNaturalEarth1, geoPath, geoGraticule } from 'd3-geo';
import { scaleSequential, scaleSqrt, scaleLog, scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';
import { line } from 'd3-shape';
import { feature } from 'topojson-client';
import { getAirports, ROUTES_ADJ, type Airport } from '../../../lib/caim/airports-data';
import { computePageRank, type PageRankResult, type InitStrategy } from '../../../lib/caim/pagerank';

type Lang = 'en' | 'es' | 'ca';

const T = {
  en: {
    damping: 'Damping factor',
    initStrategy: 'Init strategy',
    run: 'Run PageRank',
    running: 'Computing…',
    iterations: 'Iterations',
    time: 'Time',
    convergence: 'Convergence',
    rankings: 'Top airports',
    rank: 'Rank',
    code: 'Code',
    name: 'Name',
    score: 'Score',
    uniform: 'Uniform (1/n)',
    one: 'All on first',
    square: 'Square root',
  },
  es: {
    damping: 'Factor de amortiguación',
    initStrategy: 'Estrategia inicial',
    run: 'Ejecutar PageRank',
    running: 'Calculando…',
    iterations: 'Iteraciones',
    time: 'Tiempo',
    convergence: 'Convergencia',
    rankings: 'Aeropuertos principales',
    rank: 'Pos.',
    code: 'Código',
    name: 'Nombre',
    score: 'Puntuación',
    uniform: 'Uniforme (1/n)',
    one: 'Todo en primero',
    square: 'Raíz cuadrada',
  },
  ca: {
    damping: "Factor d'esmorteïment",
    initStrategy: 'Estratègia inicial',
    run: 'Executar PageRank',
    running: 'Calculant…',
    iterations: 'Iteracions',
    time: 'Temps',
    convergence: 'Convergència',
    rankings: 'Aeroports principals',
    rank: 'Pos.',
    code: 'Codi',
    name: 'Nom',
    score: 'Puntuació',
    uniform: 'Uniforme (1/n)',
    one: 'Tot al primer',
    square: 'Arrel quadrada',
  },
};

const WORLD_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json';

interface Props {
  lang: Lang;
}

export default function PageRankTab({ lang }: Props) {
  const t = T[lang] || T.en;
  const [damping, setDamping] = useState(0.8);
  const [initStrategy, setInitStrategy] = useState<InitStrategy>('nth');
  const [result, setResult] = useState<PageRankResult | null>(null);
  const [computing, setComputing] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const convRef = useRef<HTMLDivElement>(null);

  const runPageRank = useCallback(() => {
    setComputing(true);
    // Use requestAnimationFrame to let UI update before heavy computation
    requestAnimationFrame(() => {
      const airports = getAirports();
      const nodes = airports.map((a) => a.code);
      const adj: Record<string, string[]> = {};
      for (const [src, destsStr] of Object.entries(ROUTES_ADJ)) {
        adj[src] = destsStr.split(' ');
      }
      const res = computePageRank({ adj, nodes, damping, initStrategy, maxIterations: 200, tolerance: 1e-10 });
      setResult(res);
      setComputing(false);
    });
  }, [damping, initStrategy]);

  // Run once on mount
  useEffect(() => { runPageRank(); }, []);

  // Draw map when result changes
  useEffect(() => {
    if (!result || !mapRef.current) return;
    drawMap(mapRef.current, result, getAirports());
  }, [result]);

  // Draw convergence chart when result changes
  useEffect(() => {
    if (!result || !convRef.current) return;
    drawConvergence(convRef.current, result.convergence);
  }, [result]);

  return (
    <div>
      {/* Controls */}
      <div style={styles.controls}>
        <div style={styles.controlGroup}>
          <label style={styles.label}>{t.damping}: <strong>{damping.toFixed(2)}</strong></label>
          <input
            type="range"
            min={0.1}
            max={0.99}
            step={0.01}
            value={damping}
            onChange={(e) => setDamping(parseFloat(e.target.value))}
            style={styles.slider}
          />
        </div>
        <div style={styles.controlGroup}>
          <label style={styles.label}>{t.initStrategy}</label>
          <select
            value={initStrategy}
            onChange={(e) => setInitStrategy(e.target.value as InitStrategy)}
            style={styles.select}
          >
            <option value="nth">{t.uniform}</option>
            <option value="one">{t.one}</option>
            <option value="square">{t.square}</option>
          </select>
        </div>
        <button onClick={runPageRank} disabled={computing} style={styles.runBtn}>
          {computing ? t.running : t.run}
        </button>
      </div>

      {/* Map */}
      <div ref={mapRef} style={styles.mapContainer} />

      {/* Stats row */}
      {result && (
        <div style={styles.statsRow}>
          <span style={styles.stat}>{t.iterations}: <strong>{result.iterations}</strong></span>
          <span style={styles.stat}>{t.time}: <strong>{result.timeMs.toFixed(0)}ms</strong></span>
        </div>
      )}

      {/* Convergence chart */}
      <div style={{ ...styles.card, marginTop: '1rem' }}>
        <h4 style={styles.cardTitle}>{t.convergence}</h4>
        <div ref={convRef} style={{ width: '100%', overflow: 'hidden' }} />
      </div>

      {/* Rankings table */}
      {result && (
        <div style={{ ...styles.card, marginTop: '1rem' }}>
          <h4 style={styles.cardTitle}>{t.rankings}</h4>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>{t.rank}</th>
                  <th style={styles.th}>{t.code}</th>
                  <th style={{ ...styles.th, textAlign: 'left' }}>{t.name}</th>
                  <th style={styles.th}>{t.score}</th>
                </tr>
              </thead>
              <tbody>
                {result.rankings.slice(0, 20).map((r) => {
                  const airport = getAirports().find((a) => a.code === r.code);
                  return (
                    <tr key={r.code}>
                      <td style={styles.td}>{r.rank}</td>
                      <td style={{ ...styles.td, fontFamily: 'var(--font-mono, monospace)', fontWeight: 600 }}>{r.code}</td>
                      <td style={{ ...styles.td, textAlign: 'left' }}>{airport ? `${airport.name}, ${airport.country}` : r.code}</td>
                      <td style={styles.td}>{r.score.toExponential(3)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// --- D3 Rendering ---

async function drawMap(container: HTMLElement, result: PageRankResult, airports: Airport[]) {
  const rect = container.getBoundingClientRect();
  const W = rect.width || 700;
  const H = Math.min(W * 0.55, 500);

  container.innerHTML = '';
  const svg = select(container).append('svg')
    .attr('width', W).attr('height', H)
    .attr('viewBox', `0 0 ${W} ${H}`)
    .style('border-radius', '0.5rem');

  const projection = geoNaturalEarth1().fitSize([W, H], { type: 'Sphere' } as any);
  const path = geoPath(projection);

  svg.append('rect').attr('width', W).attr('height', H).attr('fill', '#0a0a15');

  svg.append('path')
    .datum(geoGraticule()())
    .attr('d', path as any)
    .attr('fill', 'none')
    .attr('stroke', '#1a1a2e')
    .attr('stroke-width', 0.3);

  try {
    const resp = await fetch(WORLD_URL);
    const topo = await resp.json();
    const land = feature(topo, topo.objects.land);
    svg.append('path')
      .datum(land)
      .attr('d', path as any)
      .attr('fill', '#1a1a2e')
      .attr('stroke', '#2a2a40')
      .attr('stroke-width', 0.5);
  } catch { /* offline fallback: just graticule */ }

  const airportMap = new Map(airports.map((a) => [a.code, a]));
  const maxScore = result.rankings[0]?.score ?? 1;

  const color = scaleSequential((t: number) => {
    const r = Math.round(99 + t * 156);
    const g = Math.round(102 + t * (200 - 102));
    const b = 241;
    return `rgb(${r},${g},${b})`;
  }).domain([0, maxScore]);

  const radius = scaleSqrt().domain([0, maxScore]).range([1.5, 10]);
  const top = result.rankings.slice(0, 500);
  const g = svg.append('g');

  for (const ap of [...top].reverse()) {
    const airport = airportMap.get(ap.code);
    if (!airport) continue;
    const pt = projection([airport.lon, airport.lat]);
    if (!pt) continue;
    g.append('circle')
      .attr('cx', pt[0]).attr('cy', pt[1])
      .attr('r', radius(ap.score))
      .attr('fill', color(ap.score))
      .attr('fill-opacity', 0.8)
      .attr('stroke', '#0f0f1a')
      .attr('stroke-width', 0.5);
  }

  for (const ap of top.slice(0, 10)) {
    const airport = airportMap.get(ap.code);
    if (!airport) continue;
    const pt = projection([airport.lon, airport.lat]);
    if (!pt) continue;
    g.append('text')
      .attr('x', pt[0] + radius(ap.score) + 3)
      .attr('y', pt[1] + 3)
      .attr('fill', '#e2e8f0')
      .attr('font-size', '9px')
      .attr('font-family', 'var(--font-mono, monospace)')
      .text(ap.code);
  }
}

function drawConvergence(container: HTMLElement, convergence: number[]) {
  container.innerHTML = '';
  if (convergence.length === 0) return;

  const W = 600, H = 240;
  const margin = { top: 10, right: 10, bottom: 25, left: 50 };
  const iw = W - margin.left - margin.right;
  const ih = H - margin.top - margin.bottom;

  const svg = select(container).append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .style('width', '100%')
    .style('height', `${H}px`)
    .style('display', 'block');

  // Clip path so line/points can't overflow the chart area
  svg.append('defs').append('clipPath').attr('id', 'conv-clip')
    .append('rect').attr('width', iw).attr('height', ih);

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
  // Clipped sub-group for the line so it doesn't overflow
  const clipped = g.append('g').attr('clip-path', 'url(#conv-clip)');

  const minVal = Math.max(convergence[convergence.length - 1], 1e-15);
  const maxVal = convergence[0];

  const xScale = scaleLinear().domain([0, convergence.length - 1]).range([0, iw]);
  const yScale = scaleLog().domain([minVal, maxVal]).range([ih, 0]);

  // Grid
  const yTicks = yScale.ticks(4);
  for (const t of yTicks) {
    g.append('line').attr('x1', 0).attr('x2', iw).attr('y1', yScale(t)).attr('y2', yScale(t))
      .attr('stroke', '#1a1a2e').attr('stroke-width', 0.5);
    g.append('text').attr('x', -6).attr('y', yScale(t) + 4)
      .attr('fill', '#64748b').attr('font-size', '10px').attr('text-anchor', 'end')
      .text(t.toExponential(0));
  }

  // Line (inside clipped group)
  const pathLine = line<number>()
    .x((_, i) => xScale(i))
    .y((d) => yScale(Math.max(d, minVal)));

  clipped.append('path')
    .datum(convergence)
    .attr('d', pathLine as any)
    .attr('fill', 'none')
    .attr('stroke', '#06b6d4')
    .attr('stroke-width', 1.5);

  // Axis labels (outside clip)
  g.append('text').attr('x', iw / 2).attr('y', ih + 20)
    .attr('fill', '#64748b').attr('font-size', '11px').attr('text-anchor', 'middle')
    .text('Iteration');
  g.append('text').attr('x', -ih / 2).attr('y', -38)
    .attr('fill', '#64748b').attr('font-size', '11px').attr('text-anchor', 'middle')
    .attr('transform', 'rotate(-90)')
    .text('Max Δ');
}

// --- Styles ---

const styles: Record<string, React.CSSProperties> = {
  controls: {
    display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '1rem',
    padding: '1rem', marginBottom: '1rem',
    background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '0.75rem',
  },
  controlGroup: { display: 'flex', flexDirection: 'column', gap: '0.3rem' },
  label: { fontSize: '0.78rem', color: 'var(--text-muted)' },
  slider: { width: '140px', accentColor: '#06b6d4' },
  select: {
    padding: '0.35rem 0.6rem', borderRadius: '0.35rem', fontSize: '0.78rem',
    background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
    color: 'var(--text-primary)', cursor: 'pointer',
  },
  runBtn: {
    padding: '0.45rem 1rem', borderRadius: '0.5rem', border: 'none',
    background: 'linear-gradient(135deg, #06b6d4, #6366f1)',
    color: '#fff', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer',
  },
  mapContainer: {
    width: '100%', minHeight: 200, borderRadius: '0.5rem', overflow: 'hidden',
    background: '#0a0a15',
  },
  statsRow: {
    display: 'flex', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)',
  },
  stat: {},
  card: {
    padding: '1rem', background: 'var(--bg-card)',
    border: '1px solid var(--border-color)', borderRadius: '0.75rem',
  },
  cardTitle: { margin: '0 0 0.5rem', fontSize: '0.9rem', color: 'var(--text-primary)' },
  tableWrap: { maxHeight: 360, overflowY: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' },
  th: {
    padding: '0.4rem 0.6rem', textAlign: 'center', borderBottom: '1px solid var(--border-color)',
    color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase',
  },
  td: {
    padding: '0.35rem 0.6rem', textAlign: 'center',
    borderBottom: '1px solid color-mix(in srgb, var(--border-color) 50%, transparent)',
    color: 'var(--text-secondary)',
  },
};
