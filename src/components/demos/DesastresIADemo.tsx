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

type Lang = "en" | "es" | "ca";

const TRANSLATIONS = {
  en: {
    pipeline: [
      { icon: "📋", title: "State", desc: "Ordered queue of groups per helicopter" },
      { icon: "🔀", title: "SWAP", desc: "Exchange two groups across positions" },
      { icon: "📊", title: "Score", desc: "H2 = sum of all helicopter finish times" },
      { icon: "🔍", title: "Search", desc: "HC climbs \u00b7 SA explores with random jumps" },
    ],
    operators: [
      { name: "SWAP", fn: "Function1", desc: "Exchange two groups between helicopter queues" },
      { name: "GENERAL", fn: "Function2", desc: "Broader moves \u2014 reassign / reorder operators" },
      { name: "REDUCIDO", fn: "Function3", desc: "Smaller neighborhood, faster iterations" },
      { name: "SWAP + GENERAL", fn: "Function4", desc: "Combines swap with general moves" },
      { name: "SWAP + REDUCIDO", fn: "Function5", desc: "Swap combined with reduced neighborhood" },
      { name: "Stochastic", fn: "Function6", desc: "Randomly picks swap or general branch" },
    ],
    heuristics: [
      { name: "H1", desc: "Mix of makespan (max heli time) and total time, weighted to spread load", active: false },
      { name: "H2", desc: "Minimize sum of all helicopter completion times", active: true },
      { name: "H3", desc: "H1 + penalty for priority groups rescued late (urgency-aware)", active: false },
    ],
    localSearch: "Local Search",
    aima: "AIMA \u00b7 Java + Python",
    problemSchematic: "Problem schematic",
    probDesc: "Helicopters leave bases and serve centers in an optimized order. Groups have sizes and priorities. Capacity: 15 people per trip, 10 min cooldown between sorties.",
    base: "Base",
    center: "Center",
    rescueOrder: "rescue order \u2192",
    heurFunctions: "Heuristic functions",
    usedInDemo: "used in demo",
    succOperators: "Successor operators",
    succNote1: "6 successor functions in Java (",
    succNote2: "). Demo uses SWAP. Hover for details.",
    runDemo: "Run the demo",
    demoSub: "HC / SA \u00b7 7 groups \u00b7 3 helicopters \u00b7 runs in browser",
    howItWorks: "How it works:",
    howDesc1: " Random 2D layout (seeded) with 2 bases and 7 groups. Colors = owning helicopter. ",
    howDesc2: "HC",
    howDesc3: " picks the best SWAP neighbor until stuck; ",
    howDesc4: "SA",
    howDesc5: " sometimes accepts worse moves to escape local minima.",
    algorithm: "Algorithm",
    hc: "Hill climbing",
    sa: "Simulated annealing",
    hcFull: "Hill climbing (full SWAP)",
    saFull: "Simulated annealing (random SWAP)",
    seed: "Seed",
    runSearch: "Run search",
    running: "Running\u2026",
    cost: "H2 cost:",
    before: "Before \u2014 random initial queues",
    after: "After \u2014 optimized assignment",
    finalQueues: "Final queues",
    initialState: "Initial state breakdown & raw log",
    compact: "Compact:",
    ghRepo: "GitHub repo \u2197"
  },
  es: {
    pipeline: [
      { icon: "📋", title: "Estado", desc: "Cola ordenada de grupos por helicóptero" },
      { icon: "🔀", title: "SWAP", desc: "Intercambia dos grupos de posición" },
      { icon: "📊", title: "Puntuación", desc: "H2 = suma del tiempo de todos los helicópteros" },
      { icon: "🔍", title: "Búsqueda", desc: "HC escala \u00b7 SA explora con saltos aleatorios" },
    ],
    operators: [
      { name: "SWAP", fn: "Function1", desc: "Intercambia dos grupos entre colas de helicópteros" },
      { name: "GENERAL", fn: "Function2", desc: "Movimientos más amplios \u2014 reasignar / reordenar" },
      { name: "REDUCIDO", fn: "Function3", desc: "Vecindario más pequeño, iteraciones más rápidas" },
      { name: "SWAP + GENERAL", fn: "Function4", desc: "Combina swap con movimientos generales" },
      { name: "SWAP + REDUCIDO", fn: "Function5", desc: "Swap combinado con vecindario reducido" },
      { name: "Estocástico", fn: "Function6", desc: "Elige aleatoriamente la rama swap o general" },
    ],
    heuristics: [
      { name: "H1", desc: "Mezcla de makespan (tiempo máx de heli) y tiempo total, ponderado para repartir carga", active: false },
      { name: "H2", desc: "Minimiza la suma de tiempos de finalización de todos los helicópteros", active: true },
      { name: "H3", desc: "H1 + penalización por grupos prioritarios rescatados tarde (urgencia)", active: false },
    ],
    localSearch: "Búsqueda Local",
    aima: "AIMA \u00b7 Java + Python",
    problemSchematic: "Esquema del problema",
    probDesc: "Helicópteros salen de bases y sirven a centros en un orden optimizado. Los grupos tienen tamaños y prioridades. Capacidad: 15 personas por viaje, 10 min de descanso entre salidas.",
    base: "Base",
    center: "Centro",
    rescueOrder: "orden de rescate \u2192",
    heurFunctions: "Funciones heurísticas",
    usedInDemo: "usada en la demo",
    succOperators: "Operadores sucesores",
    succNote1: "6 funciones sucesoras en Java (",
    succNote2: "). La demo usa SWAP. Pasa el ratón para más detalles.",
    runDemo: "Ejecutar demo",
    demoSub: "HC / SA \u00b7 7 grupos \u00b7 3 helicópteros \u00b7 se ejecuta en el navegador",
    howItWorks: "Cómo funciona:",
    howDesc1: " Distribución 2D aleatoria (con semilla) con 2 bases y 7 grupos. Colores = helicóptero asignado. ",
    howDesc2: "HC",
    howDesc3: " elige el mejor vecino SWAP hasta estancarse; ",
    howDesc4: "SA",
    howDesc5: " a veces acepta peores movimientos para escapar de mínimos locales.",
    algorithm: "Algoritmo",
    hc: "Hill climbing",
    sa: "Simulated annealing",
    hcFull: "Hill climbing (SWAP completo)",
    saFull: "Simulated annealing (SWAP aleatorio)",
    seed: "Semilla",
    runSearch: "Ejecutar búsqueda",
    running: "Ejecutando\u2026",
    cost: "Coste H2:",
    before: "Antes \u2014 colas iniciales aleatorias",
    after: "Después \u2014 asignación optimizada",
    finalQueues: "Colas finales",
    initialState: "Desglose estado inicial y log crudo",
    compact: "Compacto:",
    ghRepo: "Repositorio en GitHub \u2197"
  },
  ca: {
    pipeline: [
      { icon: "📋", title: "Estat", desc: "Cua ordenada de grups per helicòpter" },
      { icon: "🔀", title: "SWAP", desc: "Intercanvia dos grups de posició" },
      { icon: "📊", title: "Puntuació", desc: "H2 = suma del temps de tots els helicòpters" },
      { icon: "🔍", title: "Cerca", desc: "HC escala \u00b7 SA explora amb salts aleatoris" },
    ],
    operators: [
      { name: "SWAP", fn: "Function1", desc: "Intercanvia dos grups entre cues d'helicòpters" },
      { name: "GENERAL", fn: "Function2", desc: "Moviments més amplis \u2014 reassignar / reordenar" },
      { name: "REDUCIDO", fn: "Function3", desc: "Veïnat més petit, iteracions més ràpides" },
      { name: "SWAP + GENERAL", fn: "Function4", desc: "Combina swap amb moviments generals" },
      { name: "SWAP + REDUCIDO", fn: "Function5", desc: "Swap combinat amb veïnat reduït" },
      { name: "Estocàstic", fn: "Function6", desc: "Tria aleatòriament la branca swap o general" },
    ],
    heuristics: [
      { name: "H1", desc: "Barreja de makespan (temps màx d'heli) i temps total, ponderat per repartir càrrega", active: false },
      { name: "H2", desc: "Minimitza la suma de temps de finalització de tots els helicòpters", active: true },
      { name: "H3", desc: "H1 + penalització per grups prioritaris rescatats tard (urgència)", active: false },
    ],
    localSearch: "Cerca Local",
    aima: "AIMA \u00b7 Java + Python",
    problemSchematic: "Esquema del problema",
    probDesc: "Els helicòpters surten de bases i serveixen als centres en un ordre optimitzat. Els grups tenen mides i prioritats. Capacitat: 15 persones per viatge, 10 min de descans entre sortides.",
    base: "Base",
    center: "Centre",
    rescueOrder: "ordre de rescat \u2192",
    heurFunctions: "Funcions heurístiques",
    usedInDemo: "usada a la demo",
    succOperators: "Operadors successors",
    succNote1: "6 funcions successores en Java (",
    succNote2: "). La demo utilitza SWAP. Passa el ratolí per veure'n detalls.",
    runDemo: "Executar demo",
    demoSub: "HC / SA \u00b7 7 grups \u00b7 3 helicòpters \u00b7 s'executa al navegador",
    howItWorks: "Com funciona:",
    howDesc1: " Distribució 2D aleatòria (amb llavor) amb 2 bases i 7 grups. Colors = helicòpter assignat. ",
    howDesc2: "HC",
    howDesc3: " tria el millor veí SWAP fins estancar-se; ",
    howDesc4: "SA",
    howDesc5: " de vegades accepta pitjors moviments per escapar de mínims locals.",
    algorithm: "Algorisme",
    hc: "Hill climbing",
    sa: "Simulated annealing",
    hcFull: "Hill climbing (SWAP complet)",
    saFull: "Simulated annealing (SWAP aleatori)",
    seed: "Llavor",
    runSearch: "Executar cerca",
    running: "Executant\u2026",
    cost: "Cost H2:",
    before: "Abans \u2014 cues inicials aleatòries",
    after: "Després \u2014 assignació optimitzada",
    finalQueues: "Cues finals",
    initialState: "Desglossament estat inicial i log cru",
    compact: "Compacte:",
    ghRepo: "Repositori a GitHub \u2197"
  }
};

/* ── shared styles ── */
const card = {
  background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "1rem", padding: "1.5rem",
} as const;

const accent1 = "#6366f1";
const accent2 = "#22c55e";

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
          <stop offset="0%" stopColor="#4f46e5" /><stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      {/* Bases */}
      <rect x="30" y="40" width="72" height="45" rx="6" fill="#1e1e2e" stroke="var(--text-muted)" strokeWidth="1.5" />
      <text x="66" y="64" textAnchor="middle" fill="var(--text-primary)" fontSize="11" fontWeight="600">{t.base} A</text>
      <text x="66" y="78" textAnchor="middle" fill="var(--text-muted)" fontSize="8">H0, H1</text>

      <rect x="30" y="110" width="72" height="45" rx="6" fill="#1e1e2e" stroke="var(--text-muted)" strokeWidth="1.5" />
      <text x="66" y="134" textAnchor="middle" fill="var(--text-primary)" fontSize="11" fontWeight="600">{t.base} B</text>
      <text x="66" y="148" textAnchor="middle" fill="var(--text-muted)" fontSize="8">H2</text>

      {/* Centers */}
      {[
        { x: 240, y: 30, label: `${t.center} 0` },
        { x: 330, y: 90, label: `${t.center} 1` },
        { x: 220, y: 130, label: `${t.center} 2` },
      ].map((c, i) => (
        <g key={i}>
          <ellipse cx={c.x + 30} cy={c.y + 22} rx="38" ry="26" fill="var(--bg-secondary)" stroke="#6366f1" strokeWidth="1.5" />
          <text x={c.x + 30} y={c.y + 25} textAnchor="middle" fill="var(--text-primary)" fontSize="10" fontWeight="600">{c.label}</text>
        </g>
      ))}

      {/* Helicopter routes */}
      <circle cx="105" cy="62" r="12" fill="url(#helipad-g)" opacity={0.9} />
      <text x="105" y="66" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700">H0</text>
      <path d="M 120 62 Q 170 30 240 52" fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="5 3" opacity={0.8} />

      <circle cx="105" cy="132" r="12" fill="url(#helipad-g)" opacity={0.9} />
      <text x="105" y="136" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700">H2</text>
      <path d="M 120 132 Q 200 145 330 112" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="5 3" opacity={0.8} />

      <text x="200" y="95" fill="var(--text-muted)" fontSize="9" fontFamily="ui-monospace">{t.rescueOrder}</text>
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
/*  MAIN EXPORT                                                           */
/* ════════════════════════════════════════════════════════════════════════ */
export default function DesastresIADemo({ lang = "en" }: { lang?: Lang }) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
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
          seed: seedVal, algo: algoVal === "HC" ? t.hcFull : t.saFull,
          cost: r.cost, initialCost, initial: initialSnap, final: r.assignment.map((q) => [...q]), log: r.log,
        });
      } finally { setRunning(false); }
    });
  }, [algo, seed, t]);

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
                border: h.active ? "1px solid rgba(99,102,241,0.4)" : "1px solid var(--border-color)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.2rem" }}>
                  <span style={{
                    fontSize: "0.72rem", fontWeight: 700, fontFamily: "ui-monospace, monospace",
                    color: h.active ? "#a5b4fc" : "var(--text-muted)",
                  }}>{h.name}</span>
                  {h.active && <span style={{
                    fontSize: "0.55rem", padding: "0.1rem 0.35rem", borderRadius: "0.25rem",
                    background: "rgba(99,102,241,0.2)", color: "#a5b4fc", fontWeight: 600,
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
            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>{t.runDemo}</h3>
            <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-muted)" }}>
              {t.demoSub}
            </p>
          </div>
        </div>

        <div style={{
          padding: "0.75rem 0.85rem", background: "rgba(99,102,241,0.06)", border: "1px solid rgba(129,140,248,0.2)",
          borderRadius: "0.5rem", marginBottom: "1rem", fontSize: "0.78rem", lineHeight: 1.55, color: "#a5b4fc",
        }}>
          <strong style={{ color: "#e0e7ff" }}>{t.howItWorks}</strong>{t.howDesc1}
          <strong style={{ color: "var(--text-primary)" }}>{t.howDesc2}</strong>{t.howDesc3}
          <strong style={{ color: "var(--text-primary)" }}>{t.howDesc4}</strong>{t.howDesc5}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center", marginBottom: "1rem" }}>
          <label style={{ color: "var(--text-secondary)", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
            {t.algorithm}
            <select value={algo} onChange={(e) => setAlgo(e.target.value as "HC" | "SA")}
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
            <input type="number" value={seed} onChange={(e) => setSeed(parseInt(e.target.value, 10) || 0)}
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
              <p style={{ margin: "0 0 0.5rem", color: "#86efac" }}>
                <strong>{runOut.algo}</strong> · seed {runOut.seed}
              </p>
              <p style={{ margin: "0 0 1rem", color: "var(--text-secondary)" }}>
                {t.cost}{" "}
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

      {/* ── LINKS ── */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <a href="https://github.com/cuberhaus/desastresIA" target="_blank" rel="noopener noreferrer" style={{
          display: "inline-flex", alignItems: "center", gap: "0.35rem",
          padding: "0.4rem 0.85rem", borderRadius: "0.5rem", fontSize: "0.78rem", fontWeight: 600,
          background: `linear-gradient(135deg, ${accent1}, ${accent2})`, color: "var(--text-primary)", textDecoration: "none",
        }}>{t.ghRepo}</a>
      </div>
    </div>
  );
}
