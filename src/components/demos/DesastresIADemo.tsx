import { useCallback, useState } from "react";
import {
  defaultToyScenario,
  heuristicSum,
  hillClimbing,
  mulberry32,
  perHelicopterTimes,
  randomInitialAssignment,
  simulatedAnnealing,
  type Assignment,
} from "../../lib/desastresSearch";
import {
  AssignmentMapFigure,
  PerHeliBreakdown,
  QueueStrips,
} from "./DesastresVisual";

/* ── shared styles ── */
const card = {
  background: "var(--bg-card)", border: "1px solid #1e1e2a", borderRadius: "1rem", padding: "1.5rem",
} as const;

const accent1 = "#6366f1";
const accent2 = "#22c55e";

const PIPELINE = [
  { icon: "📋", title: "State", desc: "Ordered queue of groups per helicopter" },
  { icon: "🔀", title: "SWAP", desc: "Exchange two groups across positions" },
  { icon: "📊", title: "Score", desc: "H2 = sum of all helicopter finish times" },
  { icon: "🔍", title: "Search", desc: "HC climbs · SA explores with random jumps" },
];

const OPERATORS = [
  { name: "SWAP", fn: "Function1", desc: "Exchange two groups between helicopter queues" },
  { name: "GENERAL", fn: "Function2", desc: "Broader moves — reassign / reorder operators" },
  { name: "REDUCIDO", fn: "Function3", desc: "Smaller neighborhood, faster iterations" },
  { name: "SWAP + GENERAL", fn: "Function4", desc: "Combines swap with general moves" },
  { name: "SWAP + REDUCIDO", fn: "Function5", desc: "Swap combined with reduced neighborhood" },
  { name: "Stochastic", fn: "Function6", desc: "Randomly picks swap or general branch" },
];

const HEURISTICS = [
  { name: "H1", desc: "Mix of makespan (max heli time) and total time, weighted to spread load" },
  { name: "H2", desc: "Minimize sum of all helicopter completion times", active: true },
  { name: "H3", desc: "H1 + penalty for priority groups rescued late (urgency-aware)" },
];

function formatAssign(a: Assignment): string {
  return a.map((q, h) => `H${h}: [${q.join(", ")}]`).join("  ·  ");
}

/* ════════════════════════════════════════════════════════════════════════ */
/*  SCHEMATIC SVG                                                         */
/* ════════════════════════════════════════════════════════════════════════ */
function SchematicSvg() {
  return (
    <svg viewBox="0 0 420 180" style={{ width: "100%", maxWidth: 420, display: "block", margin: "0 auto" }} aria-label="Disaster relief layout">
      <defs>
        <linearGradient id="helipad-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4f46e5" /><stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      {/* Bases */}
      <rect x="30" y="40" width="72" height="45" rx="6" fill="#1e1e2e" stroke="#52525b" strokeWidth="1.5" />
      <text x="66" y="64" textAnchor="middle" fill="#e4e4e7" fontSize="11" fontWeight="600">Base A</text>
      <text x="66" y="78" textAnchor="middle" fill="#71717a" fontSize="8">H0, H1</text>

      <rect x="30" y="110" width="72" height="45" rx="6" fill="#1e1e2e" stroke="#52525b" strokeWidth="1.5" />
      <text x="66" y="134" textAnchor="middle" fill="#e4e4e7" fontSize="11" fontWeight="600">Base B</text>
      <text x="66" y="148" textAnchor="middle" fill="#71717a" fontSize="8">H2</text>

      {/* Centers */}
      {[
        { x: 240, y: 30, label: "Center 0" },
        { x: 330, y: 90, label: "Center 1" },
        { x: 220, y: 130, label: "Center 2" },
      ].map((c, i) => (
        <g key={i}>
          <ellipse cx={c.x + 30} cy={c.y + 22} rx="38" ry="26" fill="#12121a" stroke="#6366f1" strokeWidth="1.5" />
          <text x={c.x + 30} y={c.y + 25} textAnchor="middle" fill="#e4e4e7" fontSize="10" fontWeight="600">{c.label}</text>
        </g>
      ))}

      {/* Helicopter routes */}
      <circle cx="105" cy="62" r="12" fill="url(#helipad-g)" opacity={0.9} />
      <text x="105" y="66" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700">H0</text>
      <path d="M 120 62 Q 170 30 240 52" fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="5 3" opacity={0.8} />

      <circle cx="105" cy="132" r="12" fill="url(#helipad-g)" opacity={0.9} />
      <text x="105" y="136" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700">H2</text>
      <path d="M 120 132 Q 200 145 330 112" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="5 3" opacity={0.8} />

      <text x="200" y="95" fill="#71717a" fontSize="9" fontFamily="ui-monospace">rescue order →</text>
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
/*  MAIN EXPORT                                                           */
/* ════════════════════════════════════════════════════════════════════════ */
export default function DesastresIADemo() {
  const [algo, setAlgo] = useState<"HC" | "SA">("HC");
  const [seed, setSeed] = useState(42);
  const [running, setRunning] = useState(false);
  const [runOut, setRunOut] = useState<{
    seed: number; cost: number; initialCost: number;
    initial: Assignment; final: Assignment; log: string[]; algo: string;
  } | null>(null);

  const runSearch = useCallback(() => {
    setRunOut(null); setRunning(true);
    const seedVal = seed, algoVal = algo;
    queueMicrotask(() => {
      try {
        const { board, nHelis, nGroups } = defaultToyScenario(seedVal);
        const rngInit = mulberry32(seedVal ^ 0x9e3779b9);
        const initial = randomInitialAssignment(nGroups, nHelis, rngInit);
        const initialSnap = initial.map((q) => [...q]);
        const initialCost = heuristicSum(board, initial);
        const r = algoVal === "HC"
          ? hillClimbing(board, initial, 400)
          : simulatedAnnealing(board, initial, { steps: 10000, t0: 350, cooling: 0.99955, rng: mulberry32((seedVal + 1) * 0xdeadbeef) });
        setRunOut({
          seed: seedVal, algo: algoVal === "HC" ? "Hill climbing (full SWAP)" : "Simulated annealing (random SWAP)",
          cost: r.cost, initialCost, initial: initialSnap, final: r.assignment.map((q) => [...q]), log: r.log,
        });
      } finally { setRunning(false); }
    });
  }, [algo, seed]);

  return (
    <div style={{ fontFamily: "var(--font-sans, 'Inter', sans-serif)", color: "#e4e4e7" }}>

      {/* ── PIPELINE STRIP ── */}
      <div style={{ ...card, marginBottom: "1.25rem", background: "var(--bg-card)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          <div style={{
            padding: "0.2rem 0.55rem", borderRadius: "0.35rem", fontSize: "0.65rem", fontWeight: 700,
            letterSpacing: "0.06em", textTransform: "uppercase" as const,
            background: `linear-gradient(135deg, ${accent1}, ${accent2})`, color: "var(--text-primary)",
          }}>Local Search</div>
          <span style={{ fontSize: "0.82rem", color: "#71717a" }}>AIMA · Java + Python</span>
        </div>
        <div style={{ display: "flex", gap: "0.35rem", overflowX: "auto", paddingBottom: "0.25rem" }}>
          {PIPELINE.map((step, i) => (
            <div key={i} style={{
              flex: "1 0 auto", minWidth: 90, padding: "0.6rem 0.7rem",
              background: "#0c0c14", borderRadius: "0.5rem", border: "1px solid #1e1e2a", textAlign: "center",
            }}>
              <div style={{ fontSize: "1.1rem", marginBottom: "0.2rem" }}>{step.icon}</div>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#e4e4e7" }}>{step.title}</div>
              <div style={{ fontSize: "0.62rem", color: "#52525b", marginTop: "0.1rem" }}>{step.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SCHEMATIC + PROBLEM OVERVIEW ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
        gap: "1.25rem", marginBottom: "1.25rem",
      }}>
        <div style={card}>
          <h4 style={{ margin: "0 0 0.75rem", fontSize: "0.88rem", fontWeight: 700, color: "#d4d4d8" }}>Problem schematic</h4>
          <div style={{ padding: "0.75rem", background: "#0c0c12", borderRadius: "0.5rem", border: "1px solid #1e1e2a" }}>
            <SchematicSvg />
          </div>
          <p style={{ margin: "0.75rem 0 0", fontSize: "0.72rem", color: "#52525b", lineHeight: 1.5 }}>
            Helicopters leave bases and serve centers in an optimized order. Groups have sizes and priorities.
            Capacity: 15 people per trip, 10 min cooldown between sorties.
          </p>
        </div>

        <div style={card}>
          <h4 style={{ margin: "0 0 0.75rem", fontSize: "0.88rem", fontWeight: 700, color: "#d4d4d8" }}>Heuristic functions</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {HEURISTICS.map((h) => (
              <div key={h.name} style={{
                padding: "0.6rem 0.75rem", background: "#0c0c14", borderRadius: "0.5rem",
                border: h.active ? "1px solid rgba(99,102,241,0.4)" : "1px solid #1e1e2a",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.2rem" }}>
                  <span style={{
                    fontSize: "0.72rem", fontWeight: 700, fontFamily: "ui-monospace, monospace",
                    color: h.active ? "#a5b4fc" : "#71717a",
                  }}>{h.name}</span>
                  {h.active && <span style={{
                    fontSize: "0.55rem", padding: "0.1rem 0.35rem", borderRadius: "0.25rem",
                    background: "rgba(99,102,241,0.2)", color: "#a5b4fc", fontWeight: 600,
                  }}>used in demo</span>}
                </div>
                <div style={{ fontSize: "0.75rem", color: h.active ? "#d4d4d8" : "#52525b", lineHeight: 1.4 }}>{h.desc}</div>
              </div>
            ))}
          </div>

          <h4 style={{ margin: "1rem 0 0.5rem", fontSize: "0.88rem", fontWeight: 700, color: "#d4d4d8" }}>Successor operators</h4>
          <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
            {OPERATORS.map((o) => (
              <span key={o.fn} title={o.desc} style={{
                padding: "0.25rem 0.5rem", borderRadius: "0.35rem", fontSize: "0.68rem", fontWeight: 600,
                background: o.name === "SWAP" ? `linear-gradient(135deg, ${accent1}, ${accent2})` : "var(--bg-card-hover)",
                border: o.name === "SWAP" ? "none" : "1px solid #27272a",
                color: o.name === "SWAP" ? "#fff" : "#71717a", cursor: "help",
              }}>{o.name}</span>
            ))}
          </div>
          <p style={{ margin: "0.5rem 0 0", fontSize: "0.68rem", color: "#52525b" }}>
            6 successor functions in Java (<code style={{ color: "#71717a" }}>DesastresSuccessorFunction1–6</code>).
            Demo uses SWAP. Hover for details.
          </p>
        </div>
      </div>

      {/* ── RUN THE DEMO ── */}
      <div style={{
        ...card, marginBottom: "1.25rem",
        background: "linear-gradient(180deg, #131320 0%, var(--bg-card) 100%)",
        border: "1px solid #2a2a3a",
        boxShadow: "0 4px 24px rgba(99, 102, 241, 0.08)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          <div style={{
            width: 32, height: 32, borderRadius: "0.5rem", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: "1rem",
            background: `linear-gradient(135deg, rgba(99,102,241,0.15), rgba(34,197,94,0.1))`,
          }}>⚡</div>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>Run the demo</h3>
            <p style={{ margin: 0, fontSize: "0.72rem", color: "#52525b" }}>
              HC / SA · 7 groups · 3 helicopters · runs in browser
            </p>
          </div>
        </div>

        <div style={{
          padding: "0.75rem 0.85rem", background: "rgba(99,102,241,0.06)", border: "1px solid rgba(129,140,248,0.2)",
          borderRadius: "0.5rem", marginBottom: "1rem", fontSize: "0.78rem", lineHeight: 1.55, color: "#a5b4fc",
        }}>
          <strong style={{ color: "#e0e7ff" }}>How it works:</strong> Random 2D layout (seeded) with 2 bases
          and 7 groups. Colors = owning helicopter. <strong style={{ color: "#e4e4e7" }}>HC</strong> picks the best
          SWAP neighbor until stuck; <strong style={{ color: "#e4e4e7" }}>SA</strong> sometimes accepts worse moves
          to escape local minima.
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center", marginBottom: "1rem" }}>
          <label style={{ color: "#a1a1aa", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
            Algorithm
            <select value={algo} onChange={(e) => setAlgo(e.target.value as "HC" | "SA")}
              style={{
                padding: "0.4rem 0.5rem", borderRadius: "0.35rem", border: "1px solid #3f3f46",
                background: "#0c0c12", color: "#e4e4e7", fontSize: "0.85rem",
              }}>
              <option value="HC">Hill climbing</option>
              <option value="SA">Simulated annealing</option>
            </select>
          </label>
          <label style={{ color: "#a1a1aa", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
            Seed
            <input type="number" value={seed} onChange={(e) => setSeed(parseInt(e.target.value, 10) || 0)}
              style={{
                width: 80, padding: "0.4rem 0.5rem", borderRadius: "0.35rem",
                border: "1px solid #3f3f46", background: "#0c0c12", color: "#e4e4e7", fontSize: "0.85rem",
              }} />
          </label>
          <button type="button" disabled={running} onClick={runSearch}
            style={{
              padding: "0.5rem 1.1rem", borderRadius: "0.5rem", border: "none", fontWeight: 600,
              fontSize: "0.88rem", cursor: running ? "not-allowed" : "pointer",
              background: `linear-gradient(135deg, ${accent1}, ${accent2})`, color: "var(--text-primary)",
              opacity: running ? 0.5 : 1,
            }}>
            {running ? "Running…" : "Run search"}
          </button>
        </div>

        {runOut && (() => {
          const { board, layout } = defaultToyScenario(runOut.seed);
          const tf = perHelicopterTimes(board, runOut.final);
          const ti = perHelicopterTimes(board, runOut.initial);
          return (
            <div style={{ fontSize: "0.82rem" }}>
              <p style={{ margin: "0 0 0.5rem", color: "#86efac" }}>
                <strong>{runOut.algo}</strong> · seed {runOut.seed}
              </p>
              <p style={{ margin: "0 0 1rem", color: "#a1a1aa" }}>
                H2 cost:{" "}
                <strong style={{ color: "#fde047" }}>{runOut.initialCost.toFixed(2)}</strong>
                {" → "}
                <strong style={{ color: "#7dd3fc" }}>{runOut.cost.toFixed(2)}</strong>
                {runOut.cost < runOut.initialCost - 1e-6 && (
                  <span style={{ color: "#86efac", marginLeft: "0.5rem" }}>
                    (−{((1 - runOut.cost / runOut.initialCost) * 100).toFixed(1)}%)
                  </span>
                )}
              </p>

              <div style={{
                display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "1rem", marginBottom: "1rem",
              }}>
                <AssignmentMapFigure layout={layout} board={board} assignment={runOut.initial}
                  title="Before — random initial queues" />
                <AssignmentMapFigure layout={layout} board={board} assignment={runOut.final}
                  title="After — optimized assignment" />
              </div>

              <h4 style={{ margin: "0 0 0.35rem", color: "#e4e4e7", fontSize: "0.88rem" }}>Final queues</h4>
              <QueueStrips assignment={runOut.final} board={board} />
              <PerHeliBreakdown times={tf} total={runOut.cost} />

              <details style={{ marginTop: "0.75rem" }}>
                <summary style={{ cursor: "pointer", color: "#71717a", fontSize: "0.78rem" }}>
                  Initial state breakdown & raw log
                </summary>
                <PerHeliBreakdown times={ti} total={runOut.initialCost} />
                <p style={{ margin: "0.5rem 0 0.25rem", color: "#52525b", fontSize: "0.72rem" }}>Compact: {formatAssign(runOut.initial)} → {formatAssign(runOut.final)}</p>
                <pre style={{
                  margin: 0, maxHeight: 140, overflow: "auto", color: "#71717a", fontSize: "0.68rem",
                  lineHeight: 1.4, background: "#0a0a11", padding: "0.65rem", borderRadius: "0.35rem",
                }}>{runOut.log.join("\n")}</pre>
              </details>
            </div>
          );
        })()}
      </div>

      {/* ── LINKS ── */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <a href="https://github.com/cuberhaus/desastresIA" target="_blank" rel="noopener noreferrer" style={{
          display: "inline-flex", alignItems: "center", gap: "0.35rem",
          padding: "0.4rem 0.85rem", borderRadius: "0.5rem", fontSize: "0.78rem", fontWeight: 600,
          background: `linear-gradient(135deg, ${accent1}, ${accent2})`, color: "var(--text-primary)", textDecoration: "none",
        }}>GitHub repo ↗</a>
      </div>
    </div>
  );
}
