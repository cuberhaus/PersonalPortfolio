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
  RunExplainer,
} from "./DesastresVisual";

const tabs = ["Problem", "Schematic", "Operators", "Heuristics", "Experiments"] as const;
type Tab = (typeof tabs)[number];

const s = {
  wrap: { fontFamily: "var(--font-sans, 'Inter', sans-serif)", color: "#e4e4e7" } as const,
  card: {
    background: "#16161f",
    border: "1px solid #27272a",
    borderRadius: "0.75rem",
    padding: "1.25rem",
    marginBottom: "1.25rem",
  } as const,
  tabs: { display: "flex" as const, gap: "0.35rem", flexWrap: "wrap" as const, marginBottom: "1rem" },
  tab: (on: boolean) =>
    ({
      padding: "0.45rem 0.85rem",
      borderRadius: "0.5rem",
      border: "none",
      cursor: "pointer",
      fontSize: "0.82rem",
      fontWeight: 600,
      background: on ? "linear-gradient(135deg, #6366f1, #a855f7)" : "#27272a",
      color: "#fff",
    }) as const,
  p: { color: "#a1a1aa", lineHeight: 1.7, fontSize: "0.92rem", margin: "0 0 0.85rem" } as const,
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "0.82rem",
    color: "#d4d4d8",
  } as const,
  th: {
    textAlign: "left" as const,
    padding: "0.5rem 0.65rem",
    borderBottom: "1px solid #3f3f46",
    color: "#c4b5fd",
    fontWeight: 600,
  } as const,
  td: { padding: "0.5rem 0.65rem", borderBottom: "1px solid #27272a", verticalAlign: "top" as const },
  code: { color: "#c4b5fd", fontFamily: "ui-monospace, monospace", fontSize: "0.78rem" } as const,
  btn: {
    padding: "0.5rem 1rem",
    borderRadius: "0.5rem",
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.88rem",
    background: "linear-gradient(135deg, #6366f1, #a855f7)",
    color: "#fff",
  } as const,
  input: {
    width: 100,
    padding: "0.4rem 0.5rem",
    borderRadius: "0.35rem",
    border: "1px solid #3f3f46",
    background: "#0c0c12",
    color: "#e4e4e7",
    fontSize: "0.85rem",
  } as const,
};

function formatAssign(a: Assignment): string {
  return a.map((q, h) => `H${h}: [${q.join(", ")}]`).join("  ·  ");
}

function SchematicSvg() {
  return (
    <svg
      viewBox="0 0 520 220"
      style={{ width: "100%", maxWidth: 520, display: "block", margin: "0 auto" }}
      aria-label="Abstract disaster relief layout"
    >
      <defs>
        <linearGradient id="helipad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <text x="260" y="22" textAnchor="middle" fill="#71717a" fontSize="11" fontFamily="system-ui">
        Abstract view (not geographic)
      </text>
      {/* Bases */}
      <rect x="40" y="50" width="88" height="56" rx="8" fill="#1e1e2e" stroke="#52525b" strokeWidth="1.5" />
      <text x="84" y="78" textAnchor="middle" fill="#e4e4e7" fontSize="12" fontWeight="600">
        Base A
      </text>
      <text x="84" y="96" textAnchor="middle" fill="#71717a" fontSize="9">
        helis 1–2
      </text>
      <rect x="40" y="130" width="88" height="56" rx="8" fill="#1e1e2e" stroke="#52525b" strokeWidth="1.5" />
      <text x="84" y="158" textAnchor="middle" fill="#e4e4e7" fontSize="12" fontWeight="600">
        Base B
      </text>
      <text x="84" y="176" textAnchor="middle" fill="#71717a" fontSize="9">
        helis 3…
      </text>
      {/* Centers */}
      {[
        { x: 320, y: 48, label: "Center 1", sub: "groups" },
        { x: 400, y: 110, label: "Center 2", sub: "groups" },
        { x: 300, y: 152, label: "Center 3", sub: "groups" },
      ].map((c, i) => (
        <g key={i}>
          <ellipse cx={c.x + 36} cy={c.y + 28} rx="44" ry="32" fill="#12121a" stroke="#6366f1" strokeWidth="1.5" />
          <text x={c.x + 36} y={c.y + 26} textAnchor="middle" fill="#e4e4e7" fontSize="11" fontWeight="600">
            {c.label}
          </text>
          <text x={c.x + 36} y={c.y + 42} textAnchor="middle" fill="#71717a" fontSize="9">
            {c.sub}
          </text>
        </g>
      ))}
      {/* Helicopter icons + routes */}
      <circle cx="130" cy="78" r="14" fill="url(#helipad)" opacity={0.9} />
      <text x="130" y="82" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700">
        H1
      </text>
      <path
        d="M 148 78 Q 220 40 320 76"
        fill="none"
        stroke="#22c55e"
        strokeWidth="2"
        strokeDasharray="6 4"
        opacity={0.85}
      />
      <circle cx="130" cy="158" r="14" fill="url(#helipad)" opacity={0.9} />
      <text x="130" y="162" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700">
        H2
      </text>
      <path
        d="M 148 158 Q 260 180 400 138"
        fill="none"
        stroke="#22c55e"
        strokeWidth="2"
        strokeDasharray="6 4"
        opacity={0.85}
      />
      <text x="250" y="118" fill="#86efac" fontSize="10" fontFamily="ui-monospace">
        rescue order per heli →
      </text>
    </svg>
  );
}

export default function DesastresIADemo() {
  const [tab, setTab] = useState<Tab>("Problem");
  const [algo, setAlgo] = useState<"HC" | "SA">("HC");
  const [seed, setSeed] = useState(42);
  const [running, setRunning] = useState(false);
  const [runOut, setRunOut] = useState<{
    seed: number;
    cost: number;
    initialCost: number;
    initial: Assignment;
    final: Assignment;
    log: string[];
    algo: string;
  } | null>(null);

  const runSearch = useCallback(() => {
    setRunOut(null);
    setRunning(true);
    const seedVal = seed;
    const algoVal = algo;
    queueMicrotask(() => {
      try {
        const { board, nHelis, nGroups } = defaultToyScenario(seedVal);
        const rngInit = mulberry32(seedVal ^ 0x9e3779b9);
        const initial = randomInitialAssignment(nGroups, nHelis, rngInit);
        const initialSnap = initial.map((q) => [...q]);
        const initialCost = heuristicSum(board, initial);

        if (algoVal === "HC") {
          const r = hillClimbing(board, initial, 400);
          setRunOut({
            seed: seedVal,
            algo: "Hill climbing (full SWAP neighborhood)",
            cost: r.cost,
            initialCost,
            initial: initialSnap,
            final: r.assignment.map((q) => [...q]),
            log: r.log,
          });
        } else {
          const r = simulatedAnnealing(board, initial, {
            steps: 10000,
            t0: 350,
            cooling: 0.99955,
            rng: mulberry32((seedVal + 1) * 0xdeadbeef),
          });
          setRunOut({
            seed: seedVal,
            algo: "Simulated annealing (random SWAP moves)",
            cost: r.cost,
            initialCost,
            initial: initialSnap,
            final: r.assignment.map((q) => [...q]),
            log: r.log,
          });
        }
      } finally {
        setRunning(false);
      }
    });
  }, [algo, seed]);

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.tabs}>
          {tabs.map((t) => (
            <button key={t} type="button" style={s.tab(tab === t)} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>

        {tab === "Problem" && (
          <div>
            <p style={s.p}>
              <strong style={{ color: "#e4e4e7" }}>Disaster-relief scenario</strong> (IA lab, FIB-UPC): several{" "}
              <strong>helicopters</strong> start at <strong>bases</strong>. Injured people are grouped at{" "}
              <strong>centers</strong> as <strong>groups</strong> with priorities and sizes. A <strong>state</strong>{" "}
              assigns an ordered list of groups to each helicopter (who rescues whom, in what order). The search
              explores that assignment space to reduce total / weighted <strong>rescue time</strong> (travel,
              capacity 15 people per trip, cooldown between flights, etc.—see Java domain).
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: "0.65rem",
                marginBottom: "1rem",
              }}
            >
              {[
                { n: "1", t: "State", d: "Each helicopter has a queue of group IDs (visit order)." },
                { n: "2", t: "SWAP", d: "Exchange any two groups in any two positions → new neighbor state." },
                { n: "3", t: "Score", d: "Heuristic H2 = sum of simulated finish times for all helicopters." },
                { n: "4", t: "Search", d: "HC climbs; SA can worsen to escape plateaus." },
              ].map((x) => (
                <div
                  key={x.n}
                  style={{
                    padding: "0.75rem",
                    background: "#12121a",
                    borderRadius: "0.5rem",
                    border: "1px solid #27272a",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: 26,
                      height: 26,
                      lineHeight: "26px",
                      textAlign: "center",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #6366f1, #a855f7)",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: "0.8rem",
                      marginBottom: "0.35rem",
                    }}
                  >
                    {x.n}
                  </span>
                  <div style={{ color: "#e4e4e7", fontWeight: 600, fontSize: "0.85rem" }}>{x.t}</div>
                  <div style={{ color: "#71717a", fontSize: "0.74rem", lineHeight: 1.45, marginTop: "0.25rem" }}>{x.d}</div>
                </div>
              ))}
            </div>
            <p style={s.p}>
              This is <strong>local search</strong> on a large neighborhood: not explicit graph BFS, but HC/SA
              moving between assignments via <strong>successor operators</strong> (swap groups, move groups
              between helicopters, …), scored by <strong>heuristic functions</strong>.{" "}
              <strong style={{ color: "#a5b4fc" }}>Scroll down</strong> to <strong>Run the demo</strong> and execute
              hill climbing or simulated annealing in the browser.
            </p>
          </div>
        )}

        {tab === "Schematic" && (
          <div>
            <p style={s.p}>
              Helicopters (H1, H2, …) leave bases and serve centers in some order. The real code uses the IA
              library problem instance; this diagram is only intuition.
            </p>
            <div
              style={{
                padding: "1rem",
                background: "#0c0c12",
                borderRadius: "0.5rem",
                border: "1px solid #27272a",
              }}
            >
              <SchematicSvg />
            </div>
          </div>
        )}

        {tab === "Operators" && (
          <div>
            <p style={{ ...s.p, marginBottom: "1rem" }}>
              <strong style={{ color: "#e4e4e7" }}>Successor functions</strong> (AIMA neighbors). Names match the
              Java classes in <code style={s.code}>DesastresSuccessorFunction*</code>.
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Class</th>
                    <th style={s.th}>Idea</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={s.td}>
                      <code style={s.code}>…Function1</code>
                    </td>
                    <td style={s.td}>
                      <strong>SWAP</strong> — exchange two groups between helicopter queues.
                    </td>
                  </tr>
                  <tr>
                    <td style={s.td}>
                      <code style={s.code}>…Function2</code>
                    </td>
                    <td style={s.td}>
                      <strong>GENERAL</strong> — broader moves (reassign / reorder style operators).
                    </td>
                  </tr>
                  <tr>
                    <td style={s.td}>
                      <code style={s.code}>…Function3</code>
                    </td>
                    <td style={s.td}>
                      <strong>REDUCIDO</strong> — smaller neighborhood (fewer successors, faster iterations).
                    </td>
                  </tr>
                  <tr>
                    <td style={s.td}>
                      <code style={s.code}>…Function4</code>
                    </td>
                    <td style={s.td}>
                      <strong>SWAP + GENERAL</strong> — combines swap with general moves.
                    </td>
                  </tr>
                  <tr>
                    <td style={s.td}>
                      <code style={s.code}>…Function5</code>
                    </td>
                    <td style={s.td}>
                      <strong>SWAP + REDUCIDO</strong>.
                    </td>
                  </tr>
                  <tr>
                    <td style={s.td}>
                      <code style={s.code}>…Function6</code>
                    </td>
                    <td style={s.td}>
                      <strong>Stochastic</strong> — randomly applies swap or general branch (exploration variant).
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "Heuristics" && (
          <div>
            <p style={{ ...s.p, marginBottom: "1rem" }}>
              All estimate cost of a full assignment (lower is better). Helicopter capacity and inter-trip delay
              are baked into the time model.
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Class</th>
                    <th style={s.th}>Objective flavour</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={s.td}>
                      <code style={s.code}>…HeuristicFunction1</code>
                    </td>
                    <td style={s.td}>
                      Mix of <strong>makespan</strong> (max helicopter time) and <strong>total time</strong>, with
                      weighting to spread load across helicopters.
                    </td>
                  </tr>
                  <tr>
                    <td style={s.td}>
                      <code style={s.code}>…HeuristicFunction2</code>
                    </td>
                    <td style={s.td}>
                      Minimize <strong>sum of all helicopter completion times</strong>.
                    </td>
                  </tr>
                  <tr>
                    <td style={s.td}>
                      <code style={s.code}>…HeuristicFunction3</code>
                    </td>
                    <td style={s.td}>
                      Like H1 plus extra penalty for <strong>priority groups</strong> rescued late (urgency-aware).
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "Experiments" && (
          <div>
            <p style={s.p}>
              The repo ships <code style={s.code}>python_scripts/</code> with <strong>TSV outputs</strong> from
              JAR runs and <code style={s.code}>plots.py</code> (matplotlib) for boxplots across seeds,
              heuristics, and initial-state generators (random, all-to-one, greedy).
            </p>
            <p style={s.p}>
              Use the <strong>Run the demo</strong> section below for an in-browser comparison. Batch plots still
              come from the Java/Python pipeline locally.
            </p>
          </div>
        )}
      </div>

      <div
        id="desastres-run-demo"
        style={{
          background: "linear-gradient(180deg, #1a1a24 0%, #16161f 100%)",
          border: "1px solid #4c4c6a",
          borderRadius: "0.85rem",
          padding: "1.35rem 1.25rem",
          marginBottom: "1.25rem",
          boxShadow: "0 4px 24px rgba(99, 102, 241, 0.12)",
          scrollMarginTop: "1rem",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap" as const, alignItems: "center", gap: "0.65rem", marginBottom: "0.85rem" }}>
          <h2 style={{ margin: 0, fontSize: "clamp(1.1rem, 2.5vw, 1.35rem)", color: "#f4f4f5", fontWeight: 700 }}>
            Run the demo
          </h2>
          <span
            style={{
              fontSize: "0.68rem",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase" as const,
              padding: "0.25rem 0.5rem",
              borderRadius: "0.35rem",
              background: "linear-gradient(135deg, #22c55e, #6366f1)",
              color: "#fff",
            }}
          >
            Hill climbing · Simulated annealing
          </span>
        </div>
        <p style={{ margin: "0 0 1rem", color: "#a1a1aa", fontSize: "0.9rem", lineHeight: 1.6 }}>
          Choose an algorithm and seed, then press <strong style={{ color: "#e4e4e7" }}>Run search</strong> to see
          before/after maps and timings. Everything runs in your browser.
        </p>
        <RunExplainer />
        <p style={s.p}>
          <strong style={{ color: "#e4e4e7" }}>Toy instance</strong> — 7 groups, 3 helicopters (H0,H1 @ C0 · H2 @ C1).
          Layout is <strong>seeded random</strong>. Heuristic = Java{" "}
          <code style={s.code}>DesastresHeuristicFunction2</code>. Moves = <code style={s.code}>SWAP</code>.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center", marginBottom: "1rem" }}>
          <label style={{ color: "#a1a1aa", fontSize: "0.85rem" }}>
            Algorithm{" "}
            <select
              value={algo}
              onChange={(e) => setAlgo(e.target.value as "HC" | "SA")}
              style={{ ...s.input, width: "auto", marginLeft: "0.35rem" }}
            >
              <option value="HC">Hill climbing</option>
              <option value="SA">Simulated annealing</option>
            </select>
          </label>
          <label style={{ color: "#a1a1aa", fontSize: "0.85rem" }}>
            Seed{" "}
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(parseInt(e.target.value, 10) || 0)}
              style={{ ...s.input, width: 90, marginLeft: "0.35rem" }}
            />
          </label>
          <button type="button" style={{ ...s.btn, opacity: running ? 0.6 : 1 }} disabled={running} onClick={runSearch}>
            {running ? "Running…" : "Run search"}
          </button>
        </div>
        {runOut && (() => {
          const { board, layout } = defaultToyScenario(runOut.seed);
          const ti = perHelicopterTimes(board, runOut.initial);
          const tf = perHelicopterTimes(board, runOut.final);
          return (
            <div style={{ fontSize: "0.82rem" }}>
              <p style={{ margin: "0 0 0.75rem", color: "#86efac" }}>
                <strong>{runOut.algo}</strong> · seed {runOut.seed}
              </p>
              <p style={{ margin: "0 0 1rem", color: "#a1a1aa" }}>
                Total H2:{" "}
                <strong style={{ color: "#fde047" }}>{runOut.initialCost.toFixed(2)}</strong>
                {" → "}
                <strong style={{ color: "#7dd3fc" }}>{runOut.cost.toFixed(2)}</strong>
                {runOut.cost < runOut.initialCost - 1e-6 && (
                  <span style={{ color: "#86efac", marginLeft: "0.5rem" }}>
                    (−{((1 - runOut.cost / runOut.initialCost) * 100).toFixed(1)}%)
                  </span>
                )}
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "1rem",
                  marginBottom: "1.25rem",
                }}
              >
                <AssignmentMapFigure
                  layout={layout}
                  board={board}
                  assignment={runOut.initial}
                  title="Before search — random initial queues (dashed paths = visit order)"
                />
                <AssignmentMapFigure
                  layout={layout}
                  board={board}
                  assignment={runOut.final}
                  title="After search — optimized assignment (same map, new colors / routes)"
                />
              </div>
              <h4 style={{ margin: "0 0 0.35rem", color: "#e4e4e7", fontSize: "0.88rem" }}>Final queues</h4>
              <QueueStrips assignment={runOut.final} board={board} />
              <PerHeliBreakdown times={tf} total={runOut.cost} />
              <details style={{ marginTop: "1rem" }}>
                <summary style={{ cursor: "pointer", color: "#a78bfa", fontSize: "0.82rem" }}>
                  Initial state breakdown & raw log
                </summary>
                <PerHeliBreakdown times={ti} total={runOut.initialCost} />
                <p style={{ margin: "0.5rem 0 0.25rem", color: "#71717a", fontSize: "0.75rem" }}>Compact encoding</p>
                <p style={{ margin: "0 0 0.5rem", fontFamily: "ui-monospace, monospace", fontSize: "0.72rem", color: "#a1a1aa" }}>
                  {formatAssign(runOut.initial)} → {formatAssign(runOut.final)}
                </p>
                <pre
                  style={{
                    margin: 0,
                    maxHeight: 160,
                    overflow: "auto",
                    color: "#a1a1aa",
                    fontSize: "0.7rem",
                    lineHeight: 1.45,
                    background: "#0c0c12",
                    padding: "0.65rem",
                    borderRadius: "0.35rem",
                  }}
                >
                  {runOut.log.join("\n")}
                </pre>
              </details>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
