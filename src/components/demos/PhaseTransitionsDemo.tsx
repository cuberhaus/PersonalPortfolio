import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  binomialGraph,
  geometricGraph,
  gridGraph,
  nodePercolation,
  edgePercolation,
  connectedComponents,
  analyzeGraph,
  runSweep,
  type SimpleGraph,
  type GraphStats,
  type GraphFamily,
  type PercolationType,
  type SweepPoint,
} from "../../lib/graph-phase";
import { forceLayout } from "../../lib/mpids";

type Lang = "en" | "es" | "ca";

const TRANSLATIONS = {
  en: {
    noNodes: "No nodes remaining after percolation",
    retentionProb: "Retention probability (p)",
    pProperty: "P(property)",
    pConnected: "P(connected)",
    pComplex: "P(all components complex)",
    title: "Phase Transitions in Random Graphs",
    desc: "Generate random graphs and apply percolation (random removal of nodes or edges) to observe phase transitions \u2014 the sharp change from connected to disconnected as the retention probability drops. Each connected component is shown in a different color.",
    graphFamily: "Graph family:",
    binomial: "Binomial (Erd\u0151s\u2013R\u00e9nyi)",
    geometric: "Geometric",
    grid: "Grid",
    gridSide: "Grid side:",
    nodes: "Nodes:",
    nodesCount: "{0} nodes",
    generate: "Generate",
    percolation: "Percolation:",
    node: "Node",
    edge: "Edge",
    both: "Both",
    retention: "Retention probability:",
    edgesCount: "{0} edges",
    connected: "Connected",
    components: "{0} components",
    allComplex: "All complex",
    notAllComplex: "Not all complex",
    largest: "Largest: {0}",
    ptCurve: "Phase transition curve:",
    ptDesc: "Sweeps retention probability 0\u21921, measuring P(connected) and P(all complex) over multiple trials.",
    computing: "Computing\u2026",
    runSweep: "Run sweep"
  },
  es: {
    noNodes: "No quedan nodos después de la percolación",
    retentionProb: "Probabilidad de retención (p)",
    pProperty: "P(propiedad)",
    pConnected: "P(conectado)",
    pComplex: "P(todas comp. complejas)",
    title: "Transiciones de Fase en Grafos Aleatorios",
    desc: "Genera grafos aleatorios y aplica percolación (eliminación aleatoria de nodos o aristas) para observar transiciones de fase \u2014 el cambio brusco de conectado a desconectado a medida que la probabilidad de retención disminuye. Cada componente conectada se muestra en un color diferente.",
    graphFamily: "Familia de grafos:",
    binomial: "Binomial (Erd\u0151s\u2013R\u00e9nyi)",
    geometric: "Geométrico",
    grid: "Cuadrícula",
    gridSide: "Lado cuadrícula:",
    nodes: "Nodos:",
    nodesCount: "{0} nodos",
    generate: "Generar",
    percolation: "Percolación:",
    node: "Nodo",
    edge: "Arista",
    both: "Ambos",
    retention: "Probabilidad de retención:",
    edgesCount: "{0} aristas",
    connected: "Conectado",
    components: "{0} componentes",
    allComplex: "Todas complejas",
    notAllComplex: "No todas complejas",
    largest: "Mayor: {0}",
    ptCurve: "Curva de transición de fase:",
    ptDesc: "Realiza un barrido de la probabilidad de retención de 0\u21921, midiendo P(conectado) y P(todas complejas) en múltiples ensayos.",
    computing: "Calculando\u2026",
    runSweep: "Ejecutar barrido"
  },
  ca: {
    noNodes: "No queden nodes després de la percolació",
    retentionProb: "Probabilitat de retenció (p)",
    pProperty: "P(propietat)",
    pConnected: "P(connectat)",
    pComplex: "P(totes comp. complexes)",
    title: "Transicions de Fase en Grafs Aleatoris",
    desc: "Genera grafs aleatoris i aplica percolació (eliminació aleatòria de nodes o arestes) per observar transicions de fase \u2014 el canvi brusc de connectat a desconnectat a mesura que la probabilitat de retenció disminueix. Cada component connectada es mostra en un color diferent.",
    graphFamily: "Família de grafs:",
    binomial: "Binomial (Erd\u0151s\u2013R\u00e9nyi)",
    geometric: "Geomètric",
    grid: "Quadrícula",
    gridSide: "Costat quadrícula:",
    nodes: "Nodes:",
    nodesCount: "{0} nodes",
    generate: "Generar",
    percolation: "Percolació:",
    node: "Node",
    edge: "Aresta",
    both: "Ambdós",
    retention: "Probabilitat de retenció:",
    edgesCount: "{0} arestes",
    connected: "Connectat",
    components: "{0} components",
    allComplex: "Totes complexes",
    notAllComplex: "No totes complexes",
    largest: "Major: {0}",
    ptCurve: "Corba de transició de fase:",
    ptDesc: "Realitza un escombrat de la probabilitat de retenció de 0\u21921, mesurant P(connectat) i P(totes complexes) en múltiples assajos.",
    computing: "Calculant\u2026",
    runSweep: "Executar escombrat"
  }
};

// ─── Palette for connected components ───

const COMP_COLORS = [
  "var(--accent-start)","#22c55e","#ef4444","#f59e0b","#06b6d4","#ec4899",
  "#8b5cf6","#14b8a6","#f97316","#84cc16","#e879f9","#0ea5e9",
  "#a3e635","#fb923c","#c084fc","#2dd4bf","#fbbf24","#f43f5e",
];

function compColor(i: number): string {
  return COMP_COLORS[i % COMP_COLORS.length];
}

// ─── Styles ───

const s = {
  wrapper: { fontFamily: "'Inter', system-ui, sans-serif", maxWidth: 900, margin: "0 auto" } as const,
  card: {
    background: "var(--bg-card)",
    borderRadius: 16, border: "1px solid var(--border-color)",
    padding: "1.5rem", marginBottom: "1.25rem",
  } as const,
  infoCard: {
    background: "linear-gradient(135deg, color-mix(in srgb, var(--accent-start) 8%, transparent), color-mix(in srgb, var(--accent-end) 5%, transparent))",
    borderRadius: 16, border: "1px solid color-mix(in srgb, var(--accent-start) 15%, transparent)",
    padding: "1.25rem 1.5rem", marginBottom: "1.25rem",
  } as const,
  row: { display: "flex", gap: "0.75rem", flexWrap: "wrap" as const, alignItems: "center", marginBottom: "0.75rem" },
  btn: (active = false) => ({
    padding: "0.5rem 1rem", borderRadius: 8, border: "1px solid var(--border-color)",
    background: active ? "linear-gradient(135deg, var(--accent-start), var(--accent-end))" : "var(--bg-secondary)",
    color: "var(--text-primary)", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500,
    transition: "all 0.15s",
  }),
  btnPrimary: {
    padding: "0.6rem 1.25rem", borderRadius: 8, border: "none",
    background: "linear-gradient(135deg, var(--accent-start), var(--accent-end))",
    color: "var(--text-primary)", cursor: "pointer", fontSize: "0.9rem", fontWeight: 600,
  } as const,
  label: { color: "var(--text-secondary)", fontSize: "0.8rem", fontWeight: 500 } as const,
  value: { color: "var(--text-primary)", fontSize: "0.9rem", fontWeight: 600 } as const,
  slider: { flex: 1, minWidth: 80, accentColor: "var(--accent-start)" } as const,
  input: {
    padding: "0.45rem 0.75rem", borderRadius: 8, border: "1px solid var(--border-color)",
    background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "0.85rem", width: 55,
  } as const,
  statBadge: (color: string) => ({
    display: "inline-flex", alignItems: "center", gap: "0.35rem",
    padding: "0.3rem 0.75rem", borderRadius: 8,
    background: `${color}15`, border: `1px solid ${color}30`,
    color, fontSize: "0.85rem", fontWeight: 600,
  }),
  svgContainer: {
    borderRadius: 12, border: "1px solid var(--border-color)",
    background: "var(--bg-secondary)", overflow: "hidden",
  } as const,
  chartContainer: {
    borderRadius: 12, border: "1px solid var(--border-color)",
    background: "var(--bg-secondary)", padding: "1rem", marginTop: "1rem",
  } as const,
} as const;

const SVG_W = 860;
const SVG_H = 480;
const PAD = 25;

// ─── Graph visualization as SVG ───

function GraphVis({ graph, comps, t }: { graph: SimpleGraph; comps: number[][]; t: typeof TRANSLATIONS.en }) {
  const positions = useMemo(() => {
    if (graph.n === 0) return [];
    if (graph.positions) {
      return graph.positions.map((p) => ({
        x: PAD + p.x * (SVG_W - 2 * PAD),
        y: PAD + p.y * (SVG_H - 2 * PAD),
      }));
    }
    // Binomial: use force-directed layout
    const fakeGraph = {
      n: graph.n,
      edges: [] as [number, number][],
      adj: graph.adj.map((s) => Array.from(s)),
    };
    for (let i = 0; i < graph.n; i++) {
      for (const j of graph.adj[i]) {
        if (j > i) fakeGraph.edges.push([i, j]);
      }
    }
    return forceLayout(fakeGraph, SVG_W, SVG_H, Math.min(200, Math.max(80, 3000 / graph.n)));
  }, [graph]);

  const nodeColor = useMemo(() => {
    const map = new Array<string>(graph.n).fill("#555");
    comps.forEach((comp, ci) => {
      const c = compColor(ci);
      for (const v of comp) map[v] = c;
    });
    return map;
  }, [graph, comps]);

  if (graph.n === 0) {
    return (
      <div style={{ ...s.svgContainer, display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
        <span style={{ color: "var(--text-secondary)" }}>{t.noNodes}</span>
      </div>
    );
  }

  const r = graph.n <= 30 ? 10 : graph.n <= 100 ? 6 : graph.n <= 300 ? 4 : 2.5;
  const edgeW = graph.n <= 100 ? 1 : 0.5;

  const edges: JSX.Element[] = [];
  for (let i = 0; i < graph.n; i++) {
    for (const j of graph.adj[i]) {
      if (j > i && positions[i] && positions[j]) {
        edges.push(
          <line key={`${i}-${j}`}
            x1={positions[i].x} y1={positions[i].y}
            x2={positions[j].x} y2={positions[j].y}
            stroke="var(--border-color)" strokeWidth={edgeW}
          />
        );
      }
    }
  }

  return (
    <div style={s.svgContainer}>
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {edges}
        {positions.map((pos, i) => (
          <circle key={i} cx={pos.x} cy={pos.y} r={r}
            fill={nodeColor[i]} stroke={nodeColor[i]} strokeWidth={0.5}
            opacity={0.85}
          />
        ))}
      </svg>
    </div>
  );
}

// ─── Mini SVG chart for sweep results ───

function SweepChart({ points, t }: { points: SweepPoint[]; t: typeof TRANSLATIONS.en }) {
  if (points.length === 0) return null;
  const W = 800, H = 250, padL = 50, padR = 20, padT = 20, padB = 40;
  const chartW = W - padL - padR, chartH = H - padT - padB;

  function toX(v: number) { return padL + v * chartW; }
  function toY(v: number) { return padT + (1 - v) * chartH; }

  const connLine = points.map((p, i) =>
    `${i === 0 ? "M" : "L"}${toX(p.param).toFixed(1)},${toY(p.pConnected).toFixed(1)}`
  ).join(" ");
  const compLine = points.map((p, i) =>
    `${i === 0 ? "M" : "L"}${toX(p.param).toFixed(1)},${toY(p.pComplex).toFixed(1)}`
  ).join(" ");

  return (
    <div style={s.chartContainer}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <g key={v}>
            <line x1={padL} x2={W - padR} y1={toY(v)} y2={toY(v)} stroke="var(--border-color)" />
            <text x={padL - 8} y={toY(v) + 4} textAnchor="end" fill="var(--text-muted)" fontSize={11}>{v.toFixed(2)}</text>
          </g>
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <g key={`x${v}`}>
            <line x1={toX(v)} x2={toX(v)} y1={padT} y2={H - padB} stroke="var(--border-color)" />
            <text x={toX(v)} y={H - padB + 16} textAnchor="middle" fill="var(--text-muted)" fontSize={11}>{v.toFixed(2)}</text>
          </g>
        ))}
        {/* Axes */}
        <line x1={padL} x2={W - padR} y1={H - padB} y2={H - padB} stroke="var(--border-color)" />
        <line x1={padL} x2={padL} y1={padT} y2={H - padB} stroke="var(--border-color)" />
        <text x={W / 2} y={H - 4} textAnchor="middle" fill="var(--text-secondary)" fontSize={12}>{t.retentionProb}</text>
        <text x={14} y={H / 2} textAnchor="middle" fill="var(--text-secondary)" fontSize={12}
          transform={`rotate(-90, 14, ${H / 2})`}>{t.pProperty}</text>
        {/* Lines */}
        <path d={connLine} fill="none" stroke="#22c55e" strokeWidth={2.5} />
        <path d={compLine} fill="none" stroke="var(--accent-start)" strokeWidth={2.5} />
        {/* Dots */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={toX(p.param)} cy={toY(p.pConnected)} r={3.5} fill="#22c55e" />
            <circle cx={toX(p.param)} cy={toY(p.pComplex)} r={3.5} fill="var(--accent-start)" />
          </g>
        ))}
        {/* Legend */}
        <circle cx={W - padR - 150} cy={padT + 10} r={5} fill="#22c55e" />
        <text x={W - padR - 140} y={padT + 14} fill="var(--text-primary)" fontSize={12}>{t.pConnected}</text>
        <circle cx={W - padR - 150} cy={padT + 30} r={5} fill="var(--accent-start)" />
        <text x={W - padR - 140} y={padT + 34} fill="var(--text-primary)" fontSize={12}>{t.pComplex}</text>
      </svg>
    </div>
  );
}

// ─── Main component ───

export default function PhaseTransitionsDemo({ lang = "en" }: { lang?: Lang }) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const [family, setFamily] = useState<GraphFamily>("grid");
  const [percolation, setPercolation] = useState<PercolationType>("edge");
  const [nodeCount, setNodeCount] = useState(100);
  const [param, setParam] = useState(0.5); // p for binomial, r for geometric, unused for grid
  const [percProb, setPercProb] = useState(1.0); // retention probability
  const [gridSide, setGridSide] = useState(10);

  const [baseGraph, setBaseGraph] = useState<SimpleGraph | null>(null);
  const [percGraph, setPercGraph] = useState<SimpleGraph | null>(null);
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [comps, setComps] = useState<number[][]>([]);

  const [sweepResults, setSweepResults] = useState<SweepPoint[]>([]);
  const [sweeping, setSweeping] = useState(false);
  const sweepTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (sweepTimeoutRef.current) clearTimeout(sweepTimeoutRef.current);
    };
  }, []);

  // Generate a new base graph
  const generate = useCallback(() => {
    let g: SimpleGraph;
    if (family === "binomial") {
      g = binomialGraph(nodeCount, param);
    } else if (family === "geometric") {
      g = geometricGraph(nodeCount, param);
    } else {
      g = gridGraph(gridSide);
    }
    setBaseGraph(g);
    setPercProb(1.0);
    setSweepResults([]);

    const st = analyzeGraph(g);
    setStats(st);
    setComps(connectedComponents(g));
    setPercGraph(g);
  }, [family, nodeCount, param, gridSide]);

  // Generate on mount and when family changes
  useEffect(() => { generate(); }, [family]);

  // Apply percolation when slider changes
  useEffect(() => {
    if (!baseGraph) return;
    let g = baseGraph;
    if (percProb < 1) {
      if (percolation === "node") {
        g = nodePercolation(baseGraph, percProb);
      } else if (percolation === "edge") {
        g = edgePercolation(baseGraph, percProb);
      } else {
        g = nodePercolation(baseGraph, percProb);
        g = edgePercolation(g, percProb);
      }
    }
    setPercGraph(g);
    setStats(analyzeGraph(g));
    setComps(connectedComponents(g));
  }, [baseGraph, percProb, percolation]);

  // Run sweep
  const handleSweep = useCallback(() => {
    setSweeping(true);
    sweepTimeoutRef.current = setTimeout(() => {
      const n = family === "grid" ? gridSide * gridSide : nodeCount;
      const trials = n <= 100 ? 20 : n <= 500 ? 10 : 5;
      const steps = 20;
      const pts = runSweep(family, n, percolation, steps, trials);
      setSweepResults(pts);
      setSweeping(false);
    }, 16);
  }, [family, nodeCount, gridSide, percolation]);

  return (
    <div style={s.wrapper}>
      {/* Info */}
      <div style={s.infoCard}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
          <span style={{ fontSize: "1.4rem", lineHeight: 1 }}>📊</span>
          <div>
            <strong style={{ color: "var(--text-primary)" }}>{t.title}</strong>
            <p style={{ color: "var(--text-secondary)", margin: "0.4rem 0 0", lineHeight: 1.6, fontSize: "0.85rem" }}>
              {t.desc}
            </p>
          </div>
        </div>
      </div>

      {/* Graph family */}
      <div style={s.card}>
        <div style={s.row}>
          <span style={s.label}>{t.graphFamily}</span>
          <button style={s.btn(family === "binomial")} onClick={() => setFamily("binomial")}>
            {t.binomial}
          </button>
          <button style={s.btn(family === "geometric")} onClick={() => setFamily("geometric")}>
            {t.geometric}
          </button>
          <button style={s.btn(family === "grid")} onClick={() => setFamily("grid")}>
            {t.grid}
          </button>
        </div>

        <div style={s.row}>
          {family === "grid" ? (
            <>
              <span style={s.label}>{t.gridSide}</span>
              <input type="range" min={3} max={30} step={1} value={gridSide}
                onChange={(e) => setGridSide(+e.target.value)} style={s.slider} />
              <span style={s.value}>{gridSide}×{gridSide} = {t.nodesCount.replace("{0}", String(gridSide * gridSide))}</span>
            </>
          ) : (
            <>
              <span style={s.label}>{t.nodes}</span>
              <input type="range" min={10} max={500} step={10} value={nodeCount}
                onChange={(e) => setNodeCount(+e.target.value)} style={s.slider} />
              <span style={s.value}>{nodeCount}</span>
              <span style={s.label}>{family === "binomial" ? "p:" : "r:"}</span>
              <input type="range" min={0.01} max={family === "geometric" ? 1.0 : 1} step={0.01}
                value={param} onChange={(e) => setParam(+e.target.value)} style={s.slider} />
              <span style={s.value}>{param.toFixed(2)}</span>
            </>
          )}
          <button style={s.btn()} onClick={generate}>{t.generate}</button>
        </div>
      </div>

      {/* Percolation controls */}
      <div style={s.card}>
        <div style={s.row}>
          <span style={s.label}>{t.percolation}</span>
          <button style={s.btn(percolation === "node")} onClick={() => setPercolation("node")}>{t.node}</button>
          <button style={s.btn(percolation === "edge")} onClick={() => setPercolation("edge")}>{t.edge}</button>
          <button style={s.btn(percolation === "both")} onClick={() => setPercolation("both")}>{t.both}</button>
        </div>

        <div style={s.row}>
          <span style={s.label}>{t.retention}</span>
          <input type="range" min={0} max={1} step={0.01} value={percProb}
            onChange={(e) => setPercProb(+e.target.value)} style={s.slider} />
          <span style={s.value}>{percProb.toFixed(2)}</span>
        </div>

        {stats && (
          <div style={{ ...s.row, marginBottom: 0 }}>
            <span style={s.statBadge("#a78bfa")}>{t.nodesCount.replace("{0}", String(stats.nodes))}</span>
            <span style={s.statBadge("#a78bfa")}>{t.edgesCount.replace("{0}", String(stats.edges))}</span>
            <span style={s.statBadge(stats.connected ? "#22c55e" : "#ef4444")}>
              {stats.connected ? t.connected : t.components.replace("{0}", String(stats.components))}
            </span>
            <span style={s.statBadge(stats.complex ? "var(--accent-start)" : "#f59e0b")}>
              {stats.complex ? t.allComplex : t.notAllComplex}
            </span>
            {!stats.connected && (
              <span style={s.statBadge("#06b6d4")}>{t.largest.replace("{0}", String(stats.largestComponent))}</span>
            )}
          </div>
        )}
      </div>

      {/* Graph visualization */}
      {percGraph && <GraphVis graph={percGraph} comps={comps} t={t} />}

      {/* Phase transition sweep */}
      <div style={{ ...s.card, marginTop: "1.25rem" }}>
        <div style={s.row}>
          <span style={s.label}>{t.ptCurve}</span>
          <span style={{ color: "var(--text-secondary)", fontSize: "0.78rem", flex: 1 }}>
            {t.ptDesc}
          </span>
          <button style={s.btn()} onClick={handleSweep} disabled={sweeping}>
            {sweeping ? t.computing : t.runSweep}
          </button>
        </div>
        {sweepResults.length > 0 && <SweepChart points={sweepResults} t={t} />}
      </div>
    </div>
  );
}
