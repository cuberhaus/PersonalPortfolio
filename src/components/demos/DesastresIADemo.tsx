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

import { TRANSLATIONS, type DemoTranslations } from "../../i18n/demos/desastres-iademo";
import { useDemoLifecycle, useDebug } from "../../lib/useDebug";

type Lang = "en" | "es" | "ca";

/* ── shared styles ── */
const card = {
  background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "1rem", padding: "1.5rem",
} as const;

const accent1 = "var(--accent-start)";
const accent2 = "var(--accent-end)";

function formatAssign(a: Assignment): string {
  return a.map((q, h) => `H${h}: [${q.join(", ")}]`).join("  ·  ");
}

/* ════════════════════════════════════════════════════════════════════════ */
/*  SCHEMATIC SVG                                                         */
/* ════════════════════════════════════════════════════════════════════════ */
function SchematicSvg({ t }: { t: typeof TRANSLATIONS.en }) {
  return (
    <svg viewBox="0 0 420 180" style={{ width: "100%", maxWidth: 420, display: "block", margin: "0 auto" }} aria-label="Disaster relief layout">
      <defs>
        <linearGradient id="helipad-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--accent-start)" /><stop offset="100%" stopColor="var(--accent-end)" />
        </linearGradient>
      </defs>
      {/* Bases */}
      <rect x="30" y="40" width="72" height="45" rx="6" fill="var(--bg-card)" stroke="var(--text-muted)" strokeWidth="1.5" />
      <text x="66" y="64" textAnchor="middle" fill="var(--text-primary)" fontSize="11" fontWeight="600">{t.base} A</text>
      <text x="66" y="78" textAnchor="middle" fill="var(--text-muted)" fontSize="8">H0, H1</text>

      <rect x="30" y="110" width="72" height="45" rx="6" fill="var(--bg-card)" stroke="var(--text-muted)" strokeWidth="1.5" />
      <text x="66" y="134" textAnchor="middle" fill="var(--text-primary)" fontSize="11" fontWeight="600">{t.base} B</text>
      <text x="66" y="148" textAnchor="middle" fill="var(--text-muted)" fontSize="8">H2</text>

      {/* Centers */}
      {[
        { x: 240, y: 30, label: `${t.center} 0` },
        { x: 330, y: 90, label: `${t.center} 1` },
        { x: 220, y: 130, label: `${t.center} 2` },
      ].map((c, i) => (
        <g key={i}>
          <ellipse cx={c.x + 30} cy={c.y + 22} rx="38" ry="26" fill="var(--bg-secondary)" stroke="var(--accent-start)" strokeWidth="1.5" />
          <text x={c.x + 30} y={c.y + 25} textAnchor="middle" fill="var(--text-primary)" fontSize="10" fontWeight="600">{c.label}</text>
        </g>
      ))}

      {/* Helicopter routes */}
      <circle cx="105" cy="62" r="12" fill="url(#helipad-g)" opacity={0.9} />
      <text x="105" y="66" textAnchor="middle" fill="var(--text-primary)" fontSize="9" fontWeight="700">H0</text>
      <path d="M 120 62 Q 170 30 240 52" fill="none" stroke="var(--accent-start)" strokeWidth="2" strokeDasharray="5 3" opacity={0.8} />

      <circle cx="105" cy="132" r="12" fill="url(#helipad-g)" opacity={0.9} />
      <text x="105" y="136" textAnchor="middle" fill="var(--text-primary)" fontSize="9" fontWeight="700">H2</text>
      <path d="M 120 132 Q 200 145 330 112" fill="none" stroke="var(--accent-end)" strokeWidth="2" strokeDasharray="5 3" opacity={0.8} />

      <text x="200" y="95" fill="var(--text-muted)" fontSize="9" fontFamily="ui-monospace">{t.rescueOrder}</text>
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
/*  MAIN EXPORT                                                           */
/* ════════════════════════════════════════════════════════════════════════ */
export default function DesastresIADemo({ lang = "en" }: { lang?: Lang }) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  useDemoLifecycle('demo:desastres-ia', { lang });
  const log = useDebug('demo:desastres-ia');
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
    log.info('run', { algo: algoVal, seed: seedVal });
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
          seed: seedVal, algo: algoVal === "HC" ? t.hcFull : t.saFull,
          cost: r.cost, initialCost, initial: initialSnap, final: r.assignment.map((q) => [...q]), log: r.log,
        });
      } finally { setRunning(false); }
    });
  }, [algo, seed, t, log]);

  return (
    <div style={{ fontFamily: "var(--font-sans, 'Inter', sans-serif)", color: "var(--text-primary)" }}>

      {/* ── PIPELINE STRIP ── */}
      <div style={{ ...card, marginBottom: "1.25rem", background: "var(--bg-card)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          <div style={{
            padding: "0.2rem 0.55rem", borderRadius: "0.35rem", fontSize: "0.65rem", fontWeight: 700,
            letterSpacing: "0.06em", textTransform: "uppercase" as const,
            background: `linear-gradient(135deg, ${accent1}, ${accent2})`, color: "var(--text-primary)",
          }}>{t.localSearch}</div>
          <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>{t.aima}</span>
        </div>
        <div style={{ display: "flex", gap: "0.35rem", overflowX: "auto", paddingBottom: "0.25rem" }}>
          {t.pipeline.map((step, i) => (
            <div key={i} style={{
              flex: "1 0 auto", minWidth: 90, padding: "0.6rem 0.7rem",
              background: "var(--bg-secondary)", borderRadius: "0.5rem", border: "1px solid var(--border-color)", textAlign: "center",
            }}>
              <div style={{ fontSize: "1.1rem", marginBottom: "0.2rem" }}>{step.icon}</div>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-primary)" }}>{step.title}</div>
              <div style={{ fontSize: "0.62rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>{step.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── WEB APP FEATURES ── */}
      <div style={{
        ...card, marginBottom: "1.25rem",
        background: "linear-gradient(135deg, color-mix(in srgb, var(--accent-start) 8%, transparent), color-mix(in srgb, var(--accent-end) 6%, transparent))",
        border: "1px solid color-mix(in srgb, var(--accent-start) 25%, transparent)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <span style={{ fontSize: "1.1rem" }}>🚁</span>
          <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>{t.webAppTitle}</h4>
          <span style={{
            padding: "0.15rem 0.45rem", borderRadius: "0.3rem", fontSize: "0.6rem", fontWeight: 700,
            background: "linear-gradient(135deg, var(--accent-start), var(--accent-end))", color: "#fff",
            letterSpacing: "0.05em", textTransform: "uppercase" as const,
          }}>Solid.js + FastAPI</span>
        </div>
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
          {t.webAppDesc}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.5rem" }}>
          {t.webAppFeatures.map((f, i) => (
            <div key={i} style={{
              padding: "0.65rem 0.75rem", background: "var(--bg-secondary)", borderRadius: "0.5rem",
              border: "1px solid var(--border-color)",
            }}>
              <div style={{ fontSize: "1rem", marginBottom: "0.2rem" }}>{f.icon}</div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.15rem" }}>{f.title}</div>
              <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", lineHeight: 1.4 }}>{f.desc}</div>
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
          <h4 style={{ margin: "0 0 0.75rem", fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>{t.problemSchematic}</h4>
          <div style={{ padding: "0.75rem", background: "var(--bg-secondary)", borderRadius: "0.5rem", border: "1px solid var(--border-color)" }}>
            <SchematicSvg t={t} />
          </div>
          <p style={{ margin: "0.75rem 0 0", fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
            {t.probDesc}
          </p>
        </div>

        <div style={card}>
          <h4 style={{ margin: "0 0 0.75rem", fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>{t.heurFunctions}</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {t.heuristics.map((h) => (
              <div key={h.name} style={{
                padding: "0.6rem 0.75rem", background: "var(--bg-secondary)", borderRadius: "0.5rem",
                border: h.active ? "1px solid color-mix(in srgb, var(--accent-start) 40%, transparent)" : "1px solid var(--border-color)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.2rem" }}>
                  <span style={{
                    fontSize: "0.72rem", fontWeight: 700, fontFamily: "ui-monospace, monospace",
                    color: h.active ? "var(--accent-start)" : "var(--text-muted)",
                  }}>{h.name}</span>
                  {h.active && <span style={{
                    fontSize: "0.55rem", padding: "0.1rem 0.35rem", borderRadius: "0.25rem",
                    background: "var(--glow-color)", color: "var(--accent-start)", fontWeight: 600,
                  }}>{t.usedInDemo}</span>}
                </div>
                <div style={{ fontSize: "0.75rem", color: h.active ? "var(--text-primary)" : "var(--text-muted)", lineHeight: 1.4 }}>{h.desc}</div>
              </div>
            ))}
          </div>

          <h4 style={{ margin: "1rem 0 0.5rem", fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>{t.succOperators}</h4>
          <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
            {t.operators.map((o) => (
              <span key={o.fn} title={o.desc} style={{
                padding: "0.25rem 0.5rem", borderRadius: "0.35rem", fontSize: "0.68rem", fontWeight: 600,
                background: o.name === "SWAP" ? `linear-gradient(135deg, ${accent1}, ${accent2})` : "var(--bg-card-hover)",
                border: o.name === "SWAP" ? "none" : "1px solid var(--border-color)",
                color: o.name === "SWAP" ? "#fff" : "var(--text-muted)", cursor: "help",
              }}>{o.name}</span>
            ))}
          </div>
          <p style={{ margin: "0.5rem 0 0", fontSize: "0.68rem", color: "var(--text-muted)" }}>
            {t.succNote1}<code style={{ color: "var(--text-muted)" }}>DesastresSuccessorFunction1–6</code>{t.succNote2}
          </p>
        </div>
      </div>

      {/* ── RUN THE DEMO ── */}
      <div style={{
        ...card, marginBottom: "1.25rem",
        background: "linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-card) 100%)",
        border: "1px solid var(--border-color)",
        boxShadow: "0 4px 24px color-mix(in srgb, var(--accent-start) 8%, transparent)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          <div style={{
            width: 32, height: 32, borderRadius: "0.5rem", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: "1rem",
            background: `linear-gradient(135deg, color-mix(in srgb, var(--accent-start) 15%, transparent), rgba(34,197,94,0.1))`,
          }}>⚡</div>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>{t.runDemo}</h3>
            <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-muted)" }}>
              {t.demoSub}
            </p>
          </div>
        </div>

        <div style={{
          padding: "0.75rem 0.85rem", background: "color-mix(in srgb, var(--accent-start) 6%, transparent)", border: "1px solid rgba(129,140,248,0.2)",
          borderRadius: "0.5rem", marginBottom: "1rem", fontSize: "0.78rem", lineHeight: 1.55, color: "var(--text-secondary)",
        }}>
          <strong style={{ color: "var(--text-primary)" }}>{t.howItWorks}</strong>{t.howDesc1}
          <strong style={{ color: "var(--text-primary)" }}>{t.howDesc2}</strong>{t.howDesc3}
          <strong style={{ color: "var(--text-primary)" }}>{t.howDesc4}</strong>{t.howDesc5}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center", marginBottom: "1rem" }}>
          <label style={{ color: "var(--text-secondary)", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
            {t.algorithm}
            <select value={algo} onChange={(e) => { const v = e.target.value as "HC" | "SA"; setAlgo(v); log.info('algo', { algo: v }); }}
              style={{
                padding: "0.4rem 0.5rem", borderRadius: "0.35rem", border: "1px solid var(--border-color-hover)",
                background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "0.85rem",
              }}>
              <option value="HC">{t.hc}</option>
              <option value="SA">{t.sa}</option>
            </select>
          </label>
          <label style={{ color: "var(--text-secondary)", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
            {t.seed}
            <input type="number" value={seed} onChange={(e) => { const v = parseInt(e.target.value, 10) || 0; setSeed(v); log.info('seed', { seed: v }); }}
              style={{
                width: 80, padding: "0.4rem 0.5rem", borderRadius: "0.35rem",
                border: "1px solid var(--border-color-hover)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "0.85rem",
              }} />
          </label>
          <button type="button" disabled={running} onClick={runSearch}
            style={{
              padding: "0.5rem 1.1rem", borderRadius: "0.5rem", border: "none", fontWeight: 600,
              fontSize: "0.88rem", cursor: running ? "not-allowed" : "pointer",
              background: `linear-gradient(135deg, ${accent1}, ${accent2})`, color: "var(--text-primary)",
              opacity: running ? 0.5 : 1,
            }}>
            {running ? t.running : t.runSearch}
          </button>
        </div>

        {runOut && (() => {
          const { board, layout } = defaultToyScenario(runOut.seed);
          const tf = perHelicopterTimes(board, runOut.final);
          const ti = perHelicopterTimes(board, runOut.initial);
          return (
            <div style={{ fontSize: "0.82rem" }}>
              <p style={{ margin: "0 0 0.5rem", color: "var(--text-primary)" }}>
                <strong>{runOut.algo}</strong> · seed {runOut.seed}
              </p>
              <p style={{ margin: "0 0 1rem", color: "var(--text-secondary)" }}>
                {t.cost}{" "}
                <strong style={{ color: "var(--text-primary)" }}>{runOut.initialCost.toFixed(2)}</strong>
                {" → "}
                <strong style={{ color: "var(--text-primary)" }}>{runOut.cost.toFixed(2)}</strong>
                {runOut.cost < runOut.initialCost - 1e-6 && (
                  <span style={{ color: "var(--accent-start)", marginLeft: "0.5rem" }}>
                    (−{((1 - runOut.cost / runOut.initialCost) * 100).toFixed(1)}%)
                  </span>
                )}
              </p>

              <div style={{
                display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "1rem", marginBottom: "1rem",
              }}>
                <AssignmentMapFigure layout={layout} board={board} assignment={runOut.initial}
                  title={t.before} />
                <AssignmentMapFigure layout={layout} board={board} assignment={runOut.final}
                  title={t.after} />
              </div>

              <h4 style={{ margin: "0 0 0.35rem", color: "var(--text-primary)", fontSize: "0.88rem" }}>{t.finalQueues}</h4>
              <QueueStrips assignment={runOut.final} board={board} lang={lang} />
              <PerHeliBreakdown times={tf} total={runOut.cost} lang={lang} />

              <details style={{ marginTop: "0.75rem" }}>
                <summary style={{ cursor: "pointer", color: "var(--text-muted)", fontSize: "0.78rem" }}>
                  {t.initialState}
                </summary>
                <PerHeliBreakdown times={ti} total={runOut.initialCost} lang={lang} />
                <p style={{ margin: "0.5rem 0 0.25rem", color: "var(--text-muted)", fontSize: "0.72rem" }}>{t.compact} {formatAssign(runOut.initial)} → {formatAssign(runOut.final)}</p>
                <pre style={{
                  margin: 0, maxHeight: 140, overflow: "auto", color: "var(--text-muted)", fontSize: "0.68rem",
                  lineHeight: 1.4, background: "var(--bg-secondary)", padding: "0.65rem", borderRadius: "0.35rem",
                }}>{runOut.log.join("\n")}</pre>
              </details>
            </div>
          );
        })()}
      </div>

    </div>
  );
}
