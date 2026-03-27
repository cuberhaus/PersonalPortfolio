import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  parseGraph,
  greedySolver,
  localSearchSolver,
  forceLayout,
  dominanceInfo,
  isDominant,
  generateRandomGraph,
  SAMPLE_GRAPHS,
  type Graph,
  type MPIDSResult,
} from "../../lib/mpids";

type Lang = "en" | "es" | "ca";

const TRANSLATIONS = {
  en: {
    mpidsTitle: "Minimum Positive Influence Dominating Set",
    mpidsDesc1: "Find the smallest set S of nodes such that every vertex v has at least \u2308deg(v)/2\u2309 neighbors in S. Nodes in the set are ",
    mpidsDesc2: "purple",
    mpidsDesc3: ", dominated nodes are ",
    mpidsDesc4: "green",
    mpidsDesc5: ", and undominated nodes are ",
    mpidsDesc6: "red",
    builtin: "Built-in:",
    random: "Random:",
    generate: "Generate",
    upload: "Upload:",
    algorithm: "Algorithm:",
    greedy: "Greedy",
    localSearch: "Local Search (SA)",
    solve: "Solve MPIDS",
    computing: "Computing\u2026",
    setSize: "Set size:",
    validDom: "Valid dominating set",
    invalidDom: "Not a valid dominating set",
    inSet: "In set",
    dominated: "Dominated",
    undominated: "Undominated",
    selectAlgo: "Select an algorithm and click \"Solve MPIDS\" to find the dominating set.",
    nodes: "nodes",
    edges: "edges",
    node: "Node",
    degree: "degree:",
    inDomSet: "In dominating set",
    neighborsInSet: "neighbors in set",
    domYes: " \u2014 dominated \u2713",
    domNo: " \u2014 NOT dominated \u2717"
  },
  es: {
    mpidsTitle: "Minimum Positive Influence Dominating Set",
    mpidsDesc1: "Encuentra el conjunto S más pequeño de nodos tal que cada vértice v tenga al menos \u2308deg(v)/2\u2309 vecinos en S. Los nodos en el conjunto son ",
    mpidsDesc2: "morados",
    mpidsDesc3: ", los nodos dominados son ",
    mpidsDesc4: "verdes",
    mpidsDesc5: ", y los nodos no dominados son ",
    mpidsDesc6: "rojos",
    builtin: "Incluidos:",
    random: "Aleatorio:",
    generate: "Generar",
    upload: "Subir:",
    algorithm: "Algoritmo:",
    greedy: "Voraz (Greedy)",
    localSearch: "Búsqueda Local (SA)",
    solve: "Resolver MPIDS",
    computing: "Calculando\u2026",
    setSize: "Tamaño conjunto:",
    validDom: "Conjunto dominador válido",
    invalidDom: "No es un conjunto dominador válido",
    inSet: "En conjunto",
    dominated: "Dominado",
    undominated: "No dominado",
    selectAlgo: "Selecciona un algoritmo y haz clic en \"Resolver MPIDS\" para encontrar el conjunto dominador.",
    nodes: "nodos",
    edges: "aristas",
    node: "Nodo",
    degree: "grado:",
    inDomSet: "En conjunto dominador",
    neighborsInSet: "vecinos en conjunto",
    domYes: " \u2014 dominado \u2713",
    domNo: " \u2014 NO dominado \u2717"
  },
  ca: {
    mpidsTitle: "Minimum Positive Influence Dominating Set",
    mpidsDesc1: "Troba el conjunt S més petit de nodes tal que cada vèrtex v tingui almenys \u2308deg(v)/2\u2309 veïns a S. Els nodes en el conjunt són ",
    mpidsDesc2: "morats",
    mpidsDesc3: ", els nodes dominats són ",
    mpidsDesc4: "verds",
    mpidsDesc5: ", i els nodes no dominats són ",
    mpidsDesc6: "vermells",
    builtin: "Inclosos:",
    random: "Aleatori:",
    generate: "Generar",
    upload: "Pujar:",
    algorithm: "Algorisme:",
    greedy: "Voraç (Greedy)",
    localSearch: "Cerca Local (SA)",
    solve: "Resoldre MPIDS",
    computing: "Calculant\u2026",
    setSize: "Mida conjunt:",
    validDom: "Conjunt dominador vàlid",
    invalidDom: "No és un conjunt dominador vàlid",
    inSet: "En conjunt",
    dominated: "Dominat",
    undominated: "No dominat",
    selectAlgo: "Selecciona un algorisme i fes clic a \"Resoldre MPIDS\" per trobar el conjunt dominador.",
    nodes: "nodes",
    edges: "arestes",
    node: "Node",
    degree: "grau:",
    inDomSet: "En conjunt dominador",
    neighborsInSet: "veïns en conjunt",
    domYes: " \u2014 dominat \u2713",
    domNo: " \u2014 NO dominat \u2717"
  }
};

// ─── Styles ───

const s = {
  wrapper: { fontFamily: "'Inter', system-ui, sans-serif", maxWidth: 900, margin: "0 auto" } as const,
  card: {
    background: "var(--bg-card)",
    borderRadius: 16, border: "1px solid var(--border-color)",
    padding: "1.5rem", marginBottom: "1.25rem",
  } as const,
  infoCard: {
    background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.05))",
    borderRadius: 16, border: "1px solid rgba(99,102,241,0.15)",
    padding: "1.25rem 1.5rem", marginBottom: "1.25rem",
  } as const,
  row: { display: "flex", gap: "0.75rem", flexWrap: "wrap" as const, alignItems: "center", marginBottom: "0.75rem" },
  btn: (active = false) => ({
    padding: "0.5rem 1rem", borderRadius: 8, border: "1px solid var(--border-color)",
    background: active ? "linear-gradient(135deg, #6366f1, #a855f7)" : "var(--bg-secondary)",
    color: "var(--text-primary)", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500,
    transition: "all 0.15s",
  }),
  btnPrimary: {
    padding: "0.6rem 1.25rem", borderRadius: 8, border: "none",
    background: "linear-gradient(135deg, #6366f1, #a855f7)",
    color: "var(--text-primary)", cursor: "pointer", fontSize: "0.9rem", fontWeight: 600,
  } as const,
  btnDisabled: {
    padding: "0.6rem 1.25rem", borderRadius: 8, border: "none",
    background: "var(--border-color)", color: "var(--text-muted)",
    cursor: "not-allowed", fontSize: "0.9rem", fontWeight: 600,
  } as const,
  label: { color: "var(--text-secondary)", fontSize: "0.8rem", fontWeight: 500 } as const,
  value: { color: "var(--text-primary)", fontSize: "0.9rem", fontWeight: 600 } as const,
  svgContainer: {
    borderRadius: 12, border: "1px solid var(--border-color)",
    background: "var(--bg-secondary)", overflow: "hidden", position: "relative" as const,
  },
  legend: { display: "flex", gap: "1rem", flexWrap: "wrap" as const, marginTop: "0.75rem", fontSize: "0.8rem", color: "var(--text-secondary)" },
  legendDot: (color: string) => ({
    width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block", marginRight: 4,
  }),
  statBadge: (color: string) => ({
    display: "inline-flex", alignItems: "center", gap: "0.35rem",
    padding: "0.3rem 0.75rem", borderRadius: 8,
    background: `${color}15`, border: `1px solid ${color}30`,
    color, fontSize: "0.85rem", fontWeight: 600,
  }),
  tooltip: {
    position: "absolute" as const, pointerEvents: "none" as const,
    background: "var(--bg-card)", border: "1px solid var(--border-color)",
    borderRadius: 10, padding: "0.6rem 0.8rem", fontSize: "0.78rem",
    color: "var(--text-primary)", lineHeight: 1.6, zIndex: 100, whiteSpace: "nowrap" as const,
    backdropFilter: "blur(8px)",
  },
  select: {
    padding: "0.5rem 0.75rem", borderRadius: 8, border: "1px solid var(--border-color)",
    background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "0.85rem",
  } as const,
  input: {
    padding: "0.45rem 0.75rem", borderRadius: 8, border: "1px solid var(--border-color)",
    background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "0.85rem", width: 60,
  } as const,
} as const;

const COLORS = {
  inSet: "#6366f1",
  dominated: "#22c55e",
  undominated: "#ef4444",
  edge: "var(--border-color)",
  edgeHighlight: "rgba(99,102,241,0.3)",
};

type Algorithm = "greedy" | "local-search";

interface Tooltip {
  x: number;
  y: number;
  node: number;
}

// ─── Component ───

export default function MPIDSDemo({ lang = "en" }: { lang?: Lang }) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const [graphText, setGraphText] = useState<string | null>(null);
  const [graph, setGraph] = useState<Graph | null>(null);
  const [positions, setPositions] = useState<{ x: number; y: number }[]>([]);
  const [result, setResult] = useState<MPIDSResult | null>(null);
  const [algorithm, setAlgorithm] = useState<Algorithm>("greedy");
  const [computing, setComputing] = useState(false);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const [selectedSample, setSelectedSample] = useState(0);
  const [randomN, setRandomN] = useState(30);
  const [randomP, setRandomP] = useState(0.15);
  const [layoutIter, setLayoutIter] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const SVG_W = 860;
  const SVG_H = 500;

  // Load a graph from text
  const loadGraph = useCallback((text: string) => {
    setGraphText(text);
    setResult(null);
    setTooltip(null);
    const g = parseGraph(text);
    setGraph(g);
    const iters = g.n <= 50 ? 400 : g.n <= 200 ? 250 : 150;
    setLayoutIter(iters);
    setPositions(forceLayout(g, SVG_W, SVG_H, iters));
  }, []);

  // Load default sample on mount
  useEffect(() => {
    loadGraph(SAMPLE_GRAPHS[0].data);
  }, [loadGraph]);

  const domInfo = useMemo(() => {
    if (!graph || !result) return null;
    return dominanceInfo(graph, result.set);
  }, [graph, result]);

  const isValid = useMemo(() => {
    if (!graph || !result) return null;
    return isDominant(graph, result.set);
  }, [graph, result]);

  const solve = useCallback(() => {
    if (!graph) return;
    setComputing(true);
    setTooltip(null);
    // Use setTimeout to let the UI update
    setTimeout(() => {
      const r = algorithm === "greedy"
        ? greedySolver(graph)
        : localSearchSolver(graph, Math.max(2000, graph.n * 10));
      setResult(r);
      setComputing(false);
    }, 16);
  }, [graph, algorithm]);

  const handleSampleSelect = useCallback((idx: number) => {
    setSelectedSample(idx);
    loadGraph(SAMPLE_GRAPHS[idx].data);
  }, [loadGraph]);

  const handleLoadFile = useCallback((name: string) => {
    const rawBase = (typeof import.meta !== "undefined" && (import.meta as any).env?.BASE_URL) || "/";
    const basePath = rawBase.endsWith("/") ? rawBase : rawBase + "/";
    fetch(`${basePath}demos/mpids/${name}`)
      .then((r) => r.text())
      .then((text) => { setSelectedSample(-1); loadGraph(text); })
      .catch(() => {});
  }, [loadGraph]);

  const handleRandom = useCallback(() => {
    setSelectedSample(-1);
    loadGraph(generateRandomGraph(randomN, randomP));
  }, [randomN, randomP, loadGraph]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((text) => { setSelectedSample(-1); loadGraph(text); });
  }, [loadGraph]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!graph || !positions.length || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const scaleX = SVG_W / rect.width;
    const scaleY = SVG_H / rect.height;
    const sx = mx * scaleX, sy = my * scaleY;

    const r = graph.n <= 50 ? 14 : graph.n <= 200 ? 8 : 5;
    let closest = -1;
    let closestDist = (r + 12) * (r + 12);
    for (let i = 0; i < positions.length; i++) {
      const dx = positions[i].x - sx, dy = positions[i].y - sy;
      const d = dx * dx + dy * dy;
      if (d < closestDist) { closestDist = d; closest = i; }
    }
    if (closest >= 0) {
      setTooltip({ x: e.clientX - rect.left + 12, y: e.clientY - rect.top - 10, node: closest });
    } else {
      setTooltip(null);
    }
  }, [graph, positions]);

  // Node radius based on graph size
  const nodeR = graph ? (graph.n <= 30 ? 12 : graph.n <= 100 ? 7 : graph.n <= 200 ? 5 : 3) : 7;
  const showLabels = graph ? graph.n <= 50 : false;

  return (
    <div style={s.wrapper}>
      {/* Info card */}
      <div style={s.infoCard}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
          <span style={{ fontSize: "1.4rem", lineHeight: 1 }}>🔵</span>
          <div>
            <strong style={{ color: "var(--text-primary)" }}>{t.mpidsTitle}</strong>
            <p style={{ color: "var(--text-secondary)", margin: "0.4rem 0 0", lineHeight: 1.6, fontSize: "0.85rem" }}>
              {t.mpidsDesc1}<span style={{ color: COLORS.inSet, fontWeight: 600 }}>{t.mpidsDesc2}</span>
              {t.mpidsDesc3}<span style={{ color: COLORS.dominated, fontWeight: 600 }}>{t.mpidsDesc4}</span>
              {t.mpidsDesc5}<span style={{ color: COLORS.undominated, fontWeight: 600 }}>{t.mpidsDesc6}</span>.
            </p>
          </div>
        </div>
      </div>

      {/* Graph selection */}
      <div style={s.card}>
        <div style={s.row}>
          <span style={s.label}>{t.builtin}</span>
          {SAMPLE_GRAPHS.map((sg, i) => (
            <button key={i} style={s.btn(selectedSample === i)} onClick={() => handleSampleSelect(i)}>
              {sg.name}
            </button>
          ))}
          <button style={s.btn(selectedSample === -2)} onClick={() => handleLoadFile("football.txt")}>
            Football (115)
          </button>
          <button style={s.btn(selectedSample === -3)} onClick={() => handleLoadFile("jazz.txt")}>
            Jazz (198)
          </button>
        </div>

        <div style={s.row}>
          <span style={s.label}>{t.random}</span>
          <label style={s.label}>N=</label>
          <input type="number" min={3} max={300} value={randomN}
            onChange={(e) => setRandomN(Math.min(300, Math.max(3, +e.target.value)))} style={s.input} />
          <label style={s.label}>p=</label>
          <input type="number" min={0.01} max={1} step={0.01} value={randomP}
            onChange={(e) => setRandomP(Math.min(1, Math.max(0.01, +e.target.value)))} style={s.input} />
          <button style={s.btn()} onClick={handleRandom}>{t.generate}</button>
        </div>

        <div style={s.row}>
          <span style={s.label}>{t.upload}</span>
          <input type="file" accept=".txt" onChange={handleFileUpload}
            style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }} />
        </div>
      </div>

      {/* Algorithm controls */}
      <div style={s.card}>
        <div style={s.row}>
          <span style={s.label}>{t.algorithm}</span>
          <button style={s.btn(algorithm === "greedy")} onClick={() => setAlgorithm("greedy")}>
            {t.greedy}
          </button>
          <button style={s.btn(algorithm === "local-search")} onClick={() => setAlgorithm("local-search")}>
            {t.localSearch}
          </button>
          <div style={{ flex: 1 }} />
          <button
            style={!graph || computing ? s.btnDisabled : s.btnPrimary}
            onClick={solve}
            disabled={!graph || computing}
          >
            {computing ? t.computing : t.solve}
          </button>
        </div>

        {result && (
          <div style={{ ...s.row, marginTop: "0.5rem", marginBottom: 0 }}>
            <span style={s.statBadge(COLORS.inSet)}>{t.setSize} {result.size} / {graph?.n}</span>
            <span style={s.statBadge(isValid ? COLORS.dominated : COLORS.undominated)}>
              {isValid ? t.validDom : t.invalidDom}
            </span>
            <span style={s.statBadge("#a78bfa")}>{result.timeMs.toFixed(1)} ms</span>
          </div>
        )}
      </div>

      {/* Graph visualization */}
      {graph && positions.length > 0 && (
        <div style={s.card}>
          <div ref={containerRef} style={s.svgContainer} onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip(null)}>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              style={{ width: "100%", height: "auto", display: "block" }}
            >
              {/* Edges */}
              {graph.edges.map(([u, v], i) => {
                const highlighted = result && (result.set.has(u) || result.set.has(v));
                return (
                  <line key={i}
                    x1={positions[u].x} y1={positions[u].y}
                    x2={positions[v].x} y2={positions[v].y}
                    stroke={highlighted ? COLORS.edgeHighlight : COLORS.edge}
                    strokeWidth={graph.n <= 50 ? 1.5 : 0.8}
                  />
                );
              })}

              {/* Nodes */}
              {positions.map((pos, i) => {
                let fill = "var(--border-color-hover)";
                let stroke = "var(--border-color)";
                if (result) {
                  if (result.set.has(i)) {
                    fill = COLORS.inSet;
                    stroke = "#818cf8";
                  } else if (domInfo) {
                    fill = domInfo[i].dominated ? COLORS.dominated : COLORS.undominated;
                    stroke = domInfo[i].dominated ? "#4ade80" : "#f87171";
                  }
                }
                const isHovered = tooltip?.node === i;
                return (
                  <g key={i}>
                    <circle
                      cx={pos.x} cy={pos.y}
                      r={isHovered ? nodeR + 3 : nodeR}
                      fill={fill} stroke={stroke} strokeWidth={isHovered ? 2.5 : 1.5}
                      opacity={isHovered ? 1 : 0.9}
                    />
                    {showLabels && (
                      <text x={pos.x} y={pos.y + 1} textAnchor="middle" dominantBaseline="middle"
                        fill="var(--text-primary)" fontSize={nodeR > 8 ? 8 : 6} fontWeight="bold" pointerEvents="none">
                        {i + 1}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Tooltip */}
            {tooltip && graph && (
              <div style={{ ...s.tooltip, left: tooltip.x, top: tooltip.y }}>
                <div><strong>{t.node} {tooltip.node + 1}</strong> ({t.degree} {graph.adj[tooltip.node].length})</div>
                {result && domInfo && (
                  <>
                    {result.set.has(tooltip.node) ? (
                      <div style={{ color: COLORS.inSet }}>{t.inDomSet}</div>
                    ) : (
                      <div style={{ color: domInfo[tooltip.node].dominated ? COLORS.dominated : COLORS.undominated }}>
                        {domInfo[tooltip.node].count}/{domInfo[tooltip.node].needed} {t.neighborsInSet}
                        {domInfo[tooltip.node].dominated ? t.domYes : t.domNo}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <div style={s.legend}>
            {result ? (
              <>
                <span><span style={s.legendDot(COLORS.inSet)} /> {t.inSet} ({result.size})</span>
                <span><span style={s.legendDot(COLORS.dominated)} /> {t.dominated}</span>
                <span><span style={s.legendDot(COLORS.undominated)} /> {t.undominated}</span>
              </>
            ) : (
              <span>{t.selectAlgo}</span>
            )}
            <span style={{ marginLeft: "auto" }}>{graph.n} {t.nodes}, {graph.edges.length} {t.edges}</span>
          </div>
        </div>
      )}
    </div>
  );
}
