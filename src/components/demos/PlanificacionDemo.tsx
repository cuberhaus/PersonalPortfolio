import { useId, useMemo, useState } from "react";

type Lang = "en" | "es" | "ca";

const TRANSLATIONS = {
  en: {
    extensions: [
      { name: "Básico", desc: "STRIPS-style: visit a minimum number of cities." },
      { name: "Extension 1", desc: "Same structure, different instance sizes." },
      { name: "Extension 2", desc: "Days per city, minimum trip days, per-city interest + minimize metric.", active: true },
      { name: "Extension 3/4", desc: "Problem variants and Python test generators." },
      { name: "Extra 2", desc: "Additional benchmark problems." },
    ],
    constraints: [
      { icon: "🏙️", label: "\u2265 2 cities visited", key: "min_ciudades_a_recoger" },
      { icon: "📅", label: "\u2265 10 total trip days", key: "min_dias_recorrido" },
      { icon: "🏨", label: "1\u20134 days per city", key: "min/max_dias_por_ciudad" },
      { icon: "📉", label: "Minimize total interest", key: "metric minimize" },
    ],
    flightNetwork: "Flight network",
    flightDesc1: "Hub ",
    flightDesc2: " connects to three cities forming a triangle. Each city has a hotel. Stars = interest value (planner minimizes the sum).",
    constTitle: "Constraints & objective",
    constDesc1: "Single action: ",
    constDesc2: " \u2014 fly to new city, book hotel, choose stay duration (1\u20134 days). Requires a numeric PDDL planner (ENHSP, LPG).",
    extTitle: "Extensions",
    domain: "Domain (Ext 2)",
    problem: "Problem (Ext 2)",
    download: "Download \u2193",
    runPlanner: "Run planner",
    runReq: "Requires deployed planner API",
    notConfig: "Planner API not configured.",
    notConfigDesc: " Set PUBLIC_PLANNER_URL in .env before building. You can still browse the PDDL above and download the files.",
    domainLabel: "Domain",
    problemLabel: "Problem",
    running: "Running\u2026",
    reset: "Reset to defaults",
    plan: "Plan",
    steps: "steps",
    total: "total:",
    rawActions: "Raw plan actions",
    showLog: "Show solver log",
    hideLog: "Hide solver log",
    ghRepo: "GitHub repo \u2197",
    missingApi: "Planner API not configured (set PUBLIC_PLANNER_URL at build time).",
    noPlan: "Planner returned no plan."
  },
  es: {
    extensions: [
      { name: "Básico", desc: "Estilo STRIPS: visitar un número mínimo de ciudades." },
      { name: "Extensión 1", desc: "Misma estructura, diferentes tamaños de instancia." },
      { name: "Extensión 2", desc: "Días por ciudad, días mínimos de viaje, interés por ciudad + métrica a minimizar.", active: true },
      { name: "Extensión 3/4", desc: "Variantes del problema y generadores de pruebas en Python." },
      { name: "Extra 2", desc: "Problemas de benchmark adicionales." },
    ],
    constraints: [
      { icon: "🏙️", label: "\u2265 2 ciudades visitadas", key: "min_ciudades_a_recoger" },
      { icon: "📅", label: "\u2265 10 días de viaje en total", key: "min_dias_recorrido" },
      { icon: "🏨", label: "1\u20134 días por ciudad", key: "min/max_dias_por_ciudad" },
      { icon: "📉", label: "Minimizar interés total", key: "metric minimize" },
    ],
    flightNetwork: "Red de vuelos",
    flightDesc1: "El hub ",
    flightDesc2: " conecta con tres ciudades formando un triángulo. Cada ciudad tiene un hotel. Estrellas = valor de interés (el planificador minimiza la suma).",
    constTitle: "Restricciones y objetivo",
    constDesc1: "Acción única: ",
    constDesc2: " \u2014 volar a nueva ciudad, reservar hotel, elegir duración de la estancia (1\u20134 días). Requiere un planificador PDDL numérico (ENHSP, LPG).",
    extTitle: "Extensiones",
    domain: "Dominio (Ext 2)",
    problem: "Problema (Ext 2)",
    download: "Descargar \u2193",
    runPlanner: "Ejecutar planificador",
    runReq: "Requiere API de planificador desplegada",
    notConfig: "API del planificador no configurada.",
    notConfigDesc: " Establece PUBLIC_PLANNER_URL en .env antes de compilar. Aún puedes ver el PDDL arriba y descargar los archivos.",
    domainLabel: "Dominio",
    problemLabel: "Problema",
    running: "Ejecutando\u2026",
    reset: "Restablecer por defecto",
    plan: "Plan",
    steps: "pasos",
    total: "total:",
    rawActions: "Acciones crudas del plan",
    showLog: "Mostrar log del solver",
    hideLog: "Ocultar log del solver",
    ghRepo: "Repositorio en GitHub \u2197",
    missingApi: "API del planificador no configurada (establece PUBLIC_PLANNER_URL en tiempo de compilación).",
    noPlan: "El planificador no devolvió ningún plan."
  },
  ca: {
    extensions: [
      { name: "Bàsic", desc: "Estil STRIPS: visitar un nombre mínim de ciutats." },
      { name: "Extensió 1", desc: "Mateixa estructura, diferents mides d'instància." },
      { name: "Extensió 2", desc: "Dies per ciutat, dies mínims de viatge, interès per ciutat + mètrica a minimitzar.", active: true },
      { name: "Extensió 3/4", desc: "Variants del problema i generadors de proves en Python." },
      { name: "Extra 2", desc: "Problemes de benchmark addicionals." },
    ],
    constraints: [
      { icon: "🏙️", label: "\u2265 2 ciutats visitades", key: "min_ciudades_a_recoger" },
      { icon: "📅", label: "\u2265 10 dies de viatge en total", key: "min_dias_recorrido" },
      { icon: "🏨", label: "1\u20134 dies per ciutat", key: "min/max_dias_por_ciudad" },
      { icon: "📉", label: "Minimitzar interès total", key: "metric minimize" },
    ],
    flightNetwork: "Xarxa de vols",
    flightDesc1: "El hub ",
    flightDesc2: " connecta amb tres ciutats formant un triangle. Cada ciutat té un hotel. Estrelles = valor d'interès (el planificador minimitza la suma).",
    constTitle: "Restriccions i objectiu",
    constDesc1: "Acció única: ",
    constDesc2: " \u2014 volar a nova ciutat, reservar hotel, triar durada de l'estada (1\u20134 dies). Requereix un planificador PDDL numèric (ENHSP, LPG).",
    extTitle: "Extensions",
    domain: "Domini (Ext 2)",
    problem: "Problema (Ext 2)",
    download: "Descarregar \u2193",
    runPlanner: "Executar planificador",
    runReq: "Requereix API de planificador desplegada",
    notConfig: "API del planificador no configurada.",
    notConfigDesc: " Estableix PUBLIC_PLANNER_URL a .env abans de compilar. Encara pots veure el PDDL a dalt i descarregar els fitxers.",
    domainLabel: "Domini",
    problemLabel: "Problema",
    running: "Executant\u2026",
    reset: "Restablir per defecte",
    plan: "Pla",
    steps: "passos",
    total: "total:",
    rawActions: "Accions crues del pla",
    showLog: "Mostrar log del solver",
    hideLog: "Ocultar log del solver",
    ghRepo: "Repositori a GitHub \u2197",
    missingApi: "API del planificador no configurada (estableix PUBLIC_PLANNER_URL en temps de compilació).",
    noPlan: "El planificador no ha retornat cap pla."
  }
};

const basePath =
  typeof import.meta !== "undefined" && import.meta.env?.BASE_URL != null
    ? import.meta.env.BASE_URL : "/";

function plannerBaseUrl(): string {
  const raw = typeof import.meta !== "undefined" && import.meta.env?.PUBLIC_PLANNER_URL != null
    ? String(import.meta.env.PUBLIC_PLANNER_URL).trim() : "";
  const u = raw.replace(/\/$/, "");
  if (u) return u;
  if (typeof import.meta !== "undefined" && import.meta.env?.DEV) return "http://127.0.0.1:8765";
  return "";
}

/* ── PDDL sources ── */
const DOMAIN_EXT2 = `(define (domain agencia_viaje)
\t(:requirements :strips :typing :fluents)
\t(:types
\t\tciudad - ciudad
\t\thotel - hotel
\t\tvuelo - vuelo
\t\tdias_por_ciudad - dias_por_ciudad
\t)
\t(:functions
\t\t(num_ciudades_escogidas)
\t\t(num_dias_recorrido)
\t\t(min_ciudades_a_recoger)
\t\t(min_dias_recorrido)
\t\t(min_dias_por_ciudad)
\t\t(max_dias_por_ciudad)
\t\t(dias_por_ciudad ?x - dias_por_ciudad)
\t\t(interes_ciudad ?c - ciudad)
\t\t(interes_actual)
\t)
\t(:predicates
\t\t(va_a ?x - vuelo ?y - ciudad ?z - ciudad)
\t\t(esta_en ?x - hotel ?y - ciudad)
\t\t(ciudad_visitada ?c - ciudad)
\t\t(current_ciudad ?c - ciudad)
\t)

\t(:action anadir_ciudad
\t\t:parameters (?c1 - ciudad ?c2 - ciudad ?v - vuelo ?h - hotel ?d - dias_por_ciudad)
\t\t:precondition (and
\t\t\t(<= (min_dias_por_ciudad) (dias_por_ciudad ?d))
\t\t\t(>= (max_dias_por_ciudad) (dias_por_ciudad ?d))
\t\t\t(not (ciudad_visitada ?c2))
\t\t\t(current_ciudad ?c1)
\t\t\t(va_a ?v ?c1 ?c2)
\t\t\t(esta_en ?h ?c2))
\t\t:effect (and
\t\t\t(ciudad_visitada ?c2)
\t\t\t(not (current_ciudad ?c1))
\t\t\t(current_ciudad ?c2)
\t\t\t(increase (num_ciudades_escogidas) 1)
\t\t\t(increase (num_dias_recorrido) (dias_por_ciudad ?d))
\t\t\t(increase (interes_actual) (interes_ciudad ?c2))
\t\t)
\t)
)`;

const PROBLEM_EXT2 = `(define (problem agencia_viaje)
\t(:domain agencia_viaje)
\t(:objects 
\t\tcg1 c1 c2 c3 - ciudad
\t    vg1 v1 v2 v3 - vuelo
\t\th1 h2 h3 - hotel
\t\tdias1 dias2 dias3 dias4 - dias_por_ciudad
\t)
\t(:init 
\t\t(= (num_ciudades_escogidas) 0)
\t\t(= (min_ciudades_a_recoger) 2)
\t\t(= (min_dias_por_ciudad) 1)
\t\t(= (max_dias_por_ciudad) 4)
\t\t(= (num_dias_recorrido) 0)
\t\t(= (min_dias_recorrido) 10)
\t\t(= (dias_por_ciudad dias1) 1)
\t\t(= (dias_por_ciudad dias2) 2)
\t\t(= (dias_por_ciudad dias3) 3)
\t\t(= (dias_por_ciudad dias4) 4)
\t\t(= (interes_actual) 0)
\t\t(= (interes_ciudad c1) 1)
\t\t(= (interes_ciudad c2) 2)
\t\t(= (interes_ciudad c3) 3)
\t\t(= (interes_ciudad cg1) 3)
\t\t(current_ciudad cg1)
\t\t(ciudad_visitada cg1)
\t\t(va_a vg1 cg1 c1) (va_a vg1 cg1 c2) (va_a vg1 cg1 c3)
\t\t(va_a v1 c1 c2) (va_a v2 c2 c3) (va_a v3 c3 c1)
\t\t(esta_en h1 c1) (esta_en h2 c2) (esta_en h3 c3)
\t)
\t(:goal (and
\t\t(<= (min_ciudades_a_recoger) (num_ciudades_escogidas))
\t\t(<= (min_dias_recorrido) (num_dias_recorrido))
\t))
\t(:metric minimize (interes_actual))
)`;

const GH = "https://github.com/cuberhaus/Practica_de_Planificacion";

type PlanResponse = { ok: boolean; plan?: string[]; stdout?: string; error?: string; time_sec?: number; };
type TripStep = { from: string; to: string; flight: string; hotel: string; diasToken: string; days: number | null; };

function parseDiasFromProblem(problem: string): Record<string, number> {
  const m: Record<string, number> = {};
  const re = /\(=\s*\(dias_por_ciudad\s+(\w+)\)\s+(\d+)\)/g;
  let x: RegExpExecArray | null;
  while ((x = re.exec(problem))) m[x[1]] = parseInt(x[2], 10);
  return m;
}

function parseTripSteps(plan: string[], diasMap: Record<string, number>): TripStep[] {
  const out: TripStep[] = [];
  for (const line of plan) {
    const t = line.trim();
    if (!t.startsWith("(anadir_ciudad ") || !t.endsWith(")")) continue;
    const inner = t.slice("(anadir_ciudad ".length, -1).trim().split(/\s+/);
    if (inner.length < 5) continue;
    const [from, to, flight, hotel, diasToken] = inner;
    out.push({ from, to, flight, hotel, diasToken, days: diasMap[diasToken] ?? null });
  }
  return out;
}

const CITY_COLORS = ["var(--accent-start)", "var(--accent-end)", "#22c55e", "#f59e0b", "#ec4899", "#06b6d4"];
function cityColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return CITY_COLORS[Math.abs(h) % CITY_COLORS.length];
}

/* ── shared styles ── */
const card = {
  background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: "1rem", padding: "1.5rem",
} as const;

const accent1 = "var(--accent-start)";
const accent2 = "var(--accent-end)";

/* ════════════════════════════════════════════════════════════════════════ */
/*  FLIGHT NETWORK SVG                                                    */
/* ════════════════════════════════════════════════════════════════════════ */
function FlightNetwork() {
  const arrowId = useId().replace(/:/g, "");
  // Layout: cg1 in center-left, c1/c2/c3 in triangle to the right
  const cities = [
    { id: "cg1", x: 60, y: 80, interest: 3 },
    { id: "c1", x: 200, y: 30, interest: 1 },
    { id: "c2", x: 280, y: 130, interest: 2 },
    { id: "c3", x: 130, y: 150, interest: 3 },
  ];
  const flights = [
    { from: "cg1", to: "c1", label: "vg1" },
    { from: "cg1", to: "c2", label: "vg1" },
    { from: "cg1", to: "c3", label: "vg1" },
    { from: "c1", to: "c2", label: "v1" },
    { from: "c2", to: "c3", label: "v2" },
    { from: "c3", to: "c1", label: "v3" },
  ];
  const byId = Object.fromEntries(cities.map((c) => [c.id, c]));

  return (
    <svg viewBox="0 0 340 180" style={{ width: "100%", maxWidth: 400, display: "block" }} aria-label="Flight network">
      <defs>
        <marker id={arrowId} markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto">
          <polygon points="0 0, 7 2.5, 0 5" fill="var(--border-color-hover)" />
        </marker>
      </defs>
      {flights.map((f, i) => {
        const a = byId[f.from], b = byId[f.to];
        const dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const nx = dx / len, ny = dy / len;
        const r = 18;
        return (
          <g key={i}>
            <line x1={a.x + nx * r} y1={a.y + ny * r} x2={b.x - nx * r} y2={b.y - ny * r}
              stroke="var(--border-color)" strokeWidth={2} markerEnd={`url(#${arrowId})`} />
            <text x={(a.x + b.x) / 2 + ny * 10} y={(a.y + b.y) / 2 - nx * 10}
              textAnchor="middle" fill="var(--text-muted)" fontSize="8" fontFamily="ui-monospace, monospace">{f.label}</text>
          </g>
        );
      })}
      {cities.map((c) => (
        <g key={c.id}>
          <circle cx={c.x} cy={c.y} r={18} fill={cityColor(c.id)} opacity={0.9} stroke="#18181b" strokeWidth={2} />
          <text x={c.x} y={c.y + 4} textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700" fontFamily="ui-monospace, monospace">{c.id}</text>
          <text x={c.x} y={c.y + 30} textAnchor="middle" fill="var(--text-muted)" fontSize="8">★{c.interest}</text>
        </g>
      ))}
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
/*  PLAN RESULT VISUALIZATION                                             */
/* ════════════════════════════════════════════════════════════════════════ */
function PlanResult({ plan, problem, timeSec, t }: { plan: string[]; problem: string; timeSec?: number; t: typeof TRANSLATIONS.en }) {
  const diasMap = parseDiasFromProblem(problem);
  const steps = parseTripSteps(plan, diasMap);
  let cumDays = 0;

  return (
    <div style={{ marginTop: "1rem" }}>
      <h4 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
        ✅ {t.plan} ({plan.length} {t.steps}{timeSec != null ? ` \u00b7 ${timeSec}s` : ""})
      </h4>

      {steps.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
          {steps.map((s, i) => {
            const d = s.days;
            if (d != null) cumDays += d;
            return (
              <div key={i} style={{
                display: "flex", gap: "0.75rem", alignItems: "flex-start",
                padding: "0.6rem 0.85rem", background: "var(--bg-secondary)", borderRadius: "0.5rem", border: "1px solid var(--border-color)",
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                  background: `linear-gradient(135deg, ${accent1}, ${accent2})`,
                  color: "var(--text-primary)", fontSize: "0.7rem", fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>{i + 1}</div>
                <div style={{ fontSize: "0.82rem" }}>
                  <span style={{ color: cityColor(s.from), fontWeight: 600 }}>{s.from}</span>
                  <span style={{ color: "var(--text-muted)", margin: "0 0.3rem" }}>→</span>
                  <span style={{ color: cityColor(s.to), fontWeight: 600 }}>{s.to}</span>
                  <span style={{ color: "var(--text-muted)", marginLeft: "0.5rem", fontSize: "0.75rem" }}>
                    ✈️ {s.flight} · 🏨 {s.hotel} · 📅 {d != null ? `${d}d` : s.diasToken}
                    {cumDays > 0 && <span style={{ color: "var(--text-muted)" }}> ({t.total} {cumDays}d)</span>}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <details>
        <summary style={{ fontSize: "0.75rem", color: "var(--text-muted)", cursor: "pointer" }}>{t.rawActions}</summary>
        <ol style={{
          margin: "0.5rem 0 0", paddingLeft: "1.25rem", color: "var(--text-secondary)",
          fontFamily: "ui-monospace, monospace", fontSize: "0.72rem", lineHeight: 1.8,
        }}>
          {plan.map((a, i) => <li key={i}>{a}</li>)}
        </ol>
      </details>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
/*  MAIN EXPORT                                                           */
/* ════════════════════════════════════════════════════════════════════════ */
export default function PlanificacionDemo({ lang = "en" }: { lang?: Lang }) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const plannerUrl = useMemo(() => plannerBaseUrl(), []);
  const pDomain = `${basePath}demos/planificacion/agencia_de_viajes_domain_ext2.pddl`;
  const pProblem = `${basePath}demos/planificacion/agencia_de_viajes_problem_ext2.pddl`;

  const [domainEdit, setDomainEdit] = useState(DOMAIN_EXT2);
  const [problemEdit, setProblemEdit] = useState(PROBLEM_EXT2);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PlanResponse | null>(null);
  const [fetchErr, setFetchErr] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);

  async function runPlanner() {
    setFetchErr(null); setResult(null);
    if (!plannerUrl) { setFetchErr(t.missingApi); return; }
    setRunning(true);
    try {
      const res = await fetch(`${plannerUrl}/plan`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domainEdit, problem: problemEdit }),
      });
      let data: PlanResponse;
      try { data = await res.json() as PlanResponse; } catch { setFetchErr(`HTTP ${res.status}: not JSON`); return; }
      setResult(data);
      if (!res.ok) setFetchErr(data.error || `HTTP ${res.status}`);
      else if (!data.ok) setFetchErr(data.error || t.noPlan);
    } catch (e) {
      setFetchErr(e instanceof Error ? e.message : "Network error.");
    } finally { setRunning(false); }
  }

  return (
    <div style={{ fontFamily: "var(--font-sans, 'Inter', sans-serif)", color: "var(--text-primary)" }}>

      {/* ── PROBLEM OVERVIEW ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
        gap: "1.25rem", marginBottom: "1.25rem",
      }}>
        {/* Flight network */}
        <div style={card}>
          <h4 style={{ margin: "0 0 0.85rem", fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {t.flightNetwork}
          </h4>
          <FlightNetwork />
          <p style={{ margin: "0.75rem 0 0", fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
            {t.flightDesc1}<code style={{ color: "var(--text-muted)" }}>cg1</code>{t.flightDesc2}
          </p>
        </div>

        {/* Constraints */}
        <div style={card}>
          <h4 style={{ margin: "0 0 0.85rem", fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {t.constTitle}
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {t.constraints.map((c) => (
              <div key={c.key} style={{
                display: "flex", alignItems: "center", gap: "0.65rem",
                padding: "0.55rem 0.75rem", background: "var(--bg-secondary)", borderRadius: "0.5rem", border: "1px solid var(--border-color)",
              }}>
                <span style={{ fontSize: "1.1rem" }}>{c.icon}</span>
                <div>
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)" }}>{c.label}</div>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontFamily: "ui-monospace, monospace" }}>{c.key}</div>
                </div>
              </div>
            ))}
          </div>
          <p style={{ margin: "0.85rem 0 0", fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
            {t.constDesc1}<code style={{ color: "#c4b5fd" }}>anadir_ciudad</code>{t.constDesc2}
          </p>
        </div>
      </div>

      {/* ── EXTENSIONS ── */}
      <div style={{ ...card, marginBottom: "1.25rem" }}>
        <h4 style={{ margin: "0 0 0.75rem", fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>
          {t.extTitle}
        </h4>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          {t.extensions.map((e) => (
            <span key={e.name} style={{
              padding: "0.3rem 0.6rem", borderRadius: "0.4rem", fontSize: "0.72rem", fontWeight: 600,
              background: e.active ? `linear-gradient(135deg, ${accent1}, ${accent2})` : "var(--bg-card-hover)",
              border: e.active ? "none" : "1px solid var(--border-color)",
              color: e.active ? "#fff" : "var(--text-muted)",
            }}>{e.name}</span>
          ))}
        </div>
        <div style={{ marginTop: "0.75rem", fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          {t.extensions.map((e) => (
            <div key={e.name} style={{ marginBottom: "0.25rem" }}>
              <strong style={{ color: e.active ? "#c4b5fd" : "var(--text-muted)" }}>{e.name}:</strong>{" "}
              <span style={{ color: e.active ? "var(--text-primary)" : "var(--text-muted)" }}>{e.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── PDDL VIEWER ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
        gap: "1.25rem", marginBottom: "1.25rem",
      }}>
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <h4 style={{ margin: 0, fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>{t.domain}</h4>
            <a href={pDomain} download style={{ fontSize: "0.72rem", color: "#a5b4fc", textDecoration: "none" }}>{t.download}</a>
          </div>
          <pre style={{
            margin: 0, padding: "0.85rem", background: "var(--bg-secondary)", border: "1px solid var(--border-color)",
            borderRadius: "0.5rem", fontSize: "0.65rem", fontFamily: "ui-monospace, monospace",
            color: "var(--text-secondary)", lineHeight: 1.4, overflowX: "auto", maxHeight: "min(360px, 40vh)",
          }}><code>{DOMAIN_EXT2}</code></pre>
        </div>
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <h4 style={{ margin: 0, fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>{t.problem}</h4>
            <a href={pProblem} download style={{ fontSize: "0.72rem", color: "#a5b4fc", textDecoration: "none" }}>{t.download}</a>
          </div>
          <pre style={{
            margin: 0, padding: "0.85rem", background: "var(--bg-secondary)", border: "1px solid var(--border-color)",
            borderRadius: "0.5rem", fontSize: "0.65rem", fontFamily: "ui-monospace, monospace",
            color: "var(--text-secondary)", lineHeight: 1.4, overflowX: "auto", maxHeight: "min(360px, 40vh)",
          }}><code>{PROBLEM_EXT2}</code></pre>
        </div>
      </div>

      {/* ── RUN PLANNER ── */}
      <div style={{ ...card, marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
          <div style={{
            width: 30, height: 30, borderRadius: "0.5rem", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: "0.9rem",
            background: `linear-gradient(135deg, color-mix(in srgb, var(--accent-start) 15%, transparent), color-mix(in srgb, var(--accent-end) 10%, transparent))`,
          }}>⚡</div>
          <div>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>{t.runPlanner}</h3>
            <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-muted)" }}>
              {plannerUrl ? `ENHSP backend \u00b7 ${plannerUrl}` : t.runReq}
            </p>
          </div>
        </div>

        {!plannerUrl && (
          <div style={{
            padding: "0.75rem 1rem", background: "rgba(234, 179, 8, 0.08)", border: "1px solid rgba(234, 179, 8, 0.25)",
            borderRadius: "0.5rem", color: "#fde047", fontSize: "0.82rem", lineHeight: 1.5, marginBottom: "1rem",
          }}>
            <strong>{t.notConfig}</strong>{t.notConfigDesc}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
          <div>
            <label style={{ display: "block", color: "var(--text-muted)", fontSize: "0.75rem", marginBottom: "0.25rem" }}>{t.domainLabel}</label>
            <textarea value={domainEdit} onChange={(e) => setDomainEdit(e.target.value)} spellCheck={false} rows={8}
              style={{
                width: "100%", padding: "0.65rem", fontSize: "0.68rem", lineHeight: 1.4,
                fontFamily: "ui-monospace, monospace", background: "var(--bg-secondary)", color: "var(--text-primary)",
                border: "1px solid var(--border-color)", borderRadius: "0.5rem", resize: "vertical", boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", color: "var(--text-muted)", fontSize: "0.75rem", marginBottom: "0.25rem" }}>{t.problemLabel}</label>
            <textarea value={problemEdit} onChange={(e) => setProblemEdit(e.target.value)} spellCheck={false} rows={8}
              style={{
                width: "100%", padding: "0.65rem", fontSize: "0.68rem", lineHeight: 1.4,
                fontFamily: "ui-monospace, monospace", background: "var(--bg-secondary)", color: "var(--text-primary)",
                border: "1px solid var(--border-color)", borderRadius: "0.5rem", resize: "vertical", boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" onClick={() => void runPlanner()} disabled={running || !plannerUrl}
            style={{
              padding: "0.5rem 1.1rem", borderRadius: "0.5rem", border: "none", cursor: running || !plannerUrl ? "not-allowed" : "pointer",
              fontWeight: 600, fontSize: "0.85rem",
              background: `linear-gradient(135deg, ${accent1}, ${accent2})`, color: "var(--text-primary)",
              opacity: running || !plannerUrl ? 0.5 : 1,
            }}>
            {running ? t.running : t.runPlanner}
          </button>
          <button type="button" onClick={() => { setDomainEdit(DOMAIN_EXT2); setProblemEdit(PROBLEM_EXT2); setResult(null); setFetchErr(null); }}
            style={{
              padding: "0.45rem 0.85rem", borderRadius: "0.5rem", border: "1px solid var(--border-color)",
              cursor: "pointer", fontSize: "0.78rem", background: "var(--bg-card-hover)", color: "var(--text-secondary)",
            }}>{t.reset}</button>
        </div>

        {fetchErr && (
          <div style={{
            marginTop: "0.75rem", padding: "0.75rem 1rem", background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.25)", borderRadius: "0.5rem",
            color: "#fca5a5", fontSize: "0.82rem", whiteSpace: "pre-wrap",
          }}>{fetchErr}</div>
        )}

        {result?.ok && result.plan && result.plan.length > 0 && (
          <PlanResult plan={result.plan} problem={problemEdit} timeSec={result.time_sec} t={t} />
        )}

        {result?.stdout && (
          <div style={{ marginTop: "0.75rem" }}>
            <button type="button" onClick={() => setShowLog((v) => !v)} style={{
              fontSize: "0.75rem", color: "var(--text-muted)", cursor: "pointer",
              background: "none", border: "none", padding: 0, textDecoration: "underline",
            }}>{showLog ? t.hideLog : t.showLog}</button>
            {showLog && (
              <pre style={{
                marginTop: "0.5rem", padding: "0.75rem", background: "var(--bg-secondary)", border: "1px solid var(--border-color)",
                borderRadius: "0.5rem", fontSize: "0.65rem", fontFamily: "ui-monospace, monospace",
                color: "var(--text-muted)", lineHeight: 1.4, overflowX: "auto", maxHeight: "min(300px, 35vh)",
              }}><code>{result.stdout}</code></pre>
            )}
          </div>
        )}
      </div>

      {/* ── LINKS ── */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <a href={pDomain} download style={{
          display: "inline-flex", alignItems: "center", gap: "0.35rem",
          padding: "0.4rem 0.85rem", borderRadius: "0.5rem", fontSize: "0.78rem", fontWeight: 600,
          background: "var(--bg-card-hover)", border: "1px solid var(--border-color)", color: "var(--text-secondary)", textDecoration: "none",
        }}>domain.pddl ↓</a>
        <a href={pProblem} download style={{
          display: "inline-flex", alignItems: "center", gap: "0.35rem",
          padding: "0.4rem 0.85rem", borderRadius: "0.5rem", fontSize: "0.78rem", fontWeight: 600,
          background: "var(--bg-card-hover)", border: "1px solid var(--border-color)", color: "var(--text-secondary)", textDecoration: "none",
        }}>problem.pddl ↓</a>
      </div>
    </div>
  );
}
