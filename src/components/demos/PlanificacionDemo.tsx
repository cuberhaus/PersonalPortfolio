import { useId, useMemo, useState } from "react";

const basePath =
  typeof import.meta !== "undefined" && import.meta.env?.BASE_URL != null
    ? import.meta.env.BASE_URL
    : "/";

function explicitPlannerUrl(): string {
  const raw =
    typeof import.meta !== "undefined" && import.meta.env?.PUBLIC_PLANNER_URL != null
      ? String(import.meta.env.PUBLIC_PLANNER_URL).trim()
      : "";
  return raw.replace(/\/$/, "");
}

/** In dev, default to local planner-api so “Run planner” works without .env */
function plannerBaseUrl(): string {
  const u = explicitPlannerUrl();
  if (u) return u;
  if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
    return "http://127.0.0.1:8765";
  }
  return "";
}

const DOMAIN_EXT2 = `(define (domain agencia_viaje)
	(:requirements :strips :typing :fluents)
	(:types
		ciudad - ciudad
		hotel - hotel
		vuelo - vuelo
		dias_por_ciudad - dias_por_ciudad
	)
	(:functions
		(num_ciudades_escogidas)
		(num_dias_recorrido)
		(min_ciudades_a_recoger)
		(min_dias_recorrido)
		(min_dias_por_ciudad)
		(max_dias_por_ciudad)
		(dias_por_ciudad ?x - dias_por_ciudad)
		(interes_ciudad ?c - ciudad)
		(interes_actual)
	)
	(:predicates
		(va_a ?x - vuelo ?y - ciudad ?z - ciudad)
		(esta_en ?x - hotel ?y - ciudad)
		(ciudad_visitada ?c - ciudad)
		(current_ciudad ?c - ciudad)
	)

	(:action anadir_ciudad
		:parameters (?c1 - ciudad ?c2 - ciudad ?v - vuelo ?h - hotel ?d - dias_por_ciudad)
		:precondition (and
			(<= (min_dias_por_ciudad) (dias_por_ciudad ?d))
			(>= (max_dias_por_ciudad) (dias_por_ciudad ?d))
			(not (ciudad_visitada ?c2))
			(current_ciudad ?c1)
			(va_a ?v ?c1 ?c2)
			(esta_en ?h ?c2))
		:effect (and
			(ciudad_visitada ?c2)
			(not (current_ciudad ?c1))
			(current_ciudad ?c2)
			(increase (num_ciudades_escogidas) 1)
			(increase (num_dias_recorrido) (dias_por_ciudad ?d))
			(increase (interes_actual) (interes_ciudad ?c2))
		)
	)
)`;

const PROBLEM_EXT2 = `(define (problem agencia_viaje)
	(:domain agencia_viaje)
	(:objects 
		cg1 c1 c2 c3 - ciudad
	    vg1 v1 v2 v3 - vuelo
		h1 h2 h3 - hotel
		dias1 dias2 dias3 dias4 - dias_por_ciudad
	)
	(:init 
		(= (num_ciudades_escogidas) 0)
		(= (min_ciudades_a_recoger) 2)
		(= (min_dias_por_ciudad) 1)
		(= (max_dias_por_ciudad) 4)
		(= (num_dias_recorrido) 0)
		(= (min_dias_recorrido) 10)
		(= (dias_por_ciudad dias1) 1)
		(= (dias_por_ciudad dias2) 2)
		(= (dias_por_ciudad dias3) 3)
		(= (dias_por_ciudad dias4) 4)
		(= (interes_actual) 0)
		(= (interes_ciudad c1) 1)
		(= (interes_ciudad c2) 2)
		(= (interes_ciudad c3) 3)
		(= (interes_ciudad cg1) 3)
		(current_ciudad cg1)
		(ciudad_visitada cg1)
		(va_a vg1 cg1 c1) (va_a vg1 cg1 c2) (va_a vg1 cg1 c3)
		(va_a v1 c1 c2) (va_a v2 c2 c3) (va_a v3 c3 c1)
		(esta_en h1 c1) (esta_en h2 c2) (esta_en h3 c3)
	)
	(:goal (and
		(<= (min_ciudades_a_recoger) (num_ciudades_escogidas))
		(<= (min_dias_recorrido) (num_dias_recorrido))
	))
	(:metric minimize (interes_actual))
)
)`;

const tabs = ["Overview", "Run planner", "Domain", "Problem", "Extensions"] as const;
type Tab = (typeof tabs)[number];

type PlanResponse = {
  ok: boolean;
  plan?: string[];
  stdout?: string;
  error?: string;
  time_sec?: number;
};

/** Parsed step from (anadir_ciudad from to flight hotel diasN) */
type TripStep = {
  from: string;
  to: string;
  flight: string;
  hotel: string;
  diasToken: string;
  days: number | null;
};

function parseDiasFromProblem(problem: string): Record<string, number> {
  const m: Record<string, number> = {};
  const re = /\(=\s*\(dias_por_ciudad\s+(\w+)\)\s+(\d+)\)/g;
  let x: RegExpExecArray | null;
  while ((x = re.exec(problem))) {
    m[x[1]] = parseInt(x[2], 10);
  }
  return m;
}

function parseInteresFromProblem(problem: string): Record<string, number> {
  const m: Record<string, number> = {};
  const re = /\(=\s*\(interes_ciudad\s+(\w+)\)\s+(\d+)\)/g;
  let x: RegExpExecArray | null;
  while ((x = re.exec(problem))) {
    m[x[1]] = parseInt(x[2], 10);
  }
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
    const days = diasMap[diasToken] ?? null;
    out.push({ from, to, flight, hotel, diasToken, days });
  }
  return out;
}

const CITY_COLORS = ["#6366f1", "#a855f7", "#22c55e", "#f59e0b", "#ec4899", "#06b6d4", "#f472b6"];

function cityColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return CITY_COLORS[Math.abs(h) % CITY_COLORS.length] ?? "#6366f1";
}

function PlanRouteSvg({
  steps,
  interes,
  arrowMarkerId,
}: {
  steps: TripStep[];
  interes: Record<string, number>;
  arrowMarkerId: string;
}) {
  if (steps.length === 0) return null;
  const cities: string[] = [steps[0].from];
  for (const s of steps) cities.push(s.to);
  const n = cities.length;
  const w = Math.min(640, Math.max(320, 48 + (n - 1) * 88));
  const svgH = 108;
  const pad = 40;
  const usable = w - 2 * pad;
  const dx = n > 1 ? usable / (n - 1) : 0;
  const cy = 44;
  const r = 18;

  const pos = (i: number) => pad + i * dx;

  return (
    <div style={{ overflowX: "auto" as const, marginBottom: "1.25rem", WebkitOverflowScrolling: "touch" }}>
      <svg
        width={w}
        height={svgH}
        viewBox={`0 0 ${w} ${svgH}`}
        style={{ display: "block", minWidth: w }}
        aria-label="Trip route across cities"
      >
        <defs>
          <marker id={arrowMarkerId} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#52525b" />
          </marker>
        </defs>
        {steps.map((s, i) => {
          const x1 = pos(i);
          const x2 = pos(i + 1);
          const mid = (x1 + x2) / 2;
          return (
            <g key={i}>
              <line
                x1={x1 + r * 0.7}
                y1={cy}
                x2={x2 - r * 0.7}
                y2={cy}
                stroke="#3f3f46"
                strokeWidth={3}
                markerEnd={`url(#${arrowMarkerId})`}
              />
              <text
                x={mid}
                y={cy - 10}
                textAnchor="middle"
                fill="#a1a1aa"
                fontSize="10"
                fontFamily="ui-monospace, monospace"
              >
                {s.flight}
              </text>
            </g>
          );
        })}
        {cities.map((c, i) => {
          const x = pos(i);
          const fill = cityColor(c);
          const interest = interes[c];
          return (
            <g key={`${c}-${i}`}>
              <circle cx={x} cy={cy} r={r} fill={fill} opacity={0.92} stroke="#18181b" strokeWidth={2} />
              <text
                x={x}
                y={cy + 5}
                textAnchor="middle"
                fill="#fafafa"
                fontSize="11"
                fontWeight={700}
                fontFamily="ui-monospace, monospace"
              >
                {c}
              </text>
              {interest != null && (
                <text x={x} y={cy + r + 16} textAnchor="middle" fill="#71717a" fontSize="9">
                  interest {interest}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function PlanTimeline({ steps, diasMap }: { steps: TripStep[]; diasMap: Record<string, number> }) {
  if (steps.length === 0) return null;
  let cumDays = 0;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column" as const,
        gap: "0.65rem",
        marginBottom: "1.25rem",
      }}
    >
      {steps.map((s, i) => {
        const d = s.days ?? diasMap[s.diasToken] ?? null;
        if (d != null) cumDays += d;
        return (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "2rem 1fr",
              gap: "0.75rem",
              alignItems: "start",
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #6366f1, #7c3aed)",
                color: "#fff",
                fontSize: "0.75rem",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {i + 1}
            </div>
            <div
              style={{
                background: "#12121a",
                border: "1px solid #27272a",
                borderRadius: "0.5rem",
                padding: "0.65rem 0.85rem",
              }}
            >
              <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#e4e4e7", marginBottom: "0.35rem" }}>
                <span style={{ color: cityColor(s.from) }}>{s.from}</span>
                <span style={{ color: "#71717a", margin: "0 0.35rem" }}>→</span>
                <span style={{ color: cityColor(s.to) }}>{s.to}</span>
              </div>
              <div style={{ fontSize: "0.78rem", color: "#a1a1aa", lineHeight: 1.5 }}>
                <span title="Flight">✈️</span> {s.flight} &nbsp;·&nbsp; <span title="Hotel">🏨</span> {s.hotel}{" "}
                &nbsp;·&nbsp; <span title="Stay">📅</span> {d != null ? `${d} days` : s.diasToken}
                {d != null && (
                  <span style={{ color: "#71717a", marginLeft: "0.5rem" }}>
                    (cumulative trip days: {cumDays})
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function citiesFirstAppearanceAlongRoute(steps: TripStep[]): string[] {
  const out: string[] = [];
  for (const s of steps) {
    if (!out.includes(s.from)) out.push(s.from);
    if (!out.includes(s.to)) out.push(s.to);
  }
  return out;
}

function TripLegend({ steps, interes }: { steps: TripStep[]; interes: Record<string, number> }) {
  const cities = citiesFirstAppearanceAlongRoute(steps);
  const legStyle = { fontSize: "0.76rem" as const, color: "#a1a1aa", lineHeight: 1.55, margin: "0.2rem 0" };
  return (
    <div
      style={{
        marginBottom: "1rem",
        padding: "0.75rem 0.9rem",
        background: "#12121a",
        border: "1px solid #2e2e38",
        borderRadius: "0.5rem",
      }}
    >
      <p style={{ margin: "0 0 0.5rem", fontSize: "0.72rem", fontWeight: 700, color: "#c4b5fd", letterSpacing: "0.04em" }}>
        LEGEND
      </p>
      <div
        style={{
          display: "grid",
          gap: "0.85rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        }}
      >
        <div>
          <p style={{ margin: "0 0 0.35rem", fontSize: "0.72rem", fontWeight: 600, color: "#d4d4d8" }}>Diagram</p>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", color: "#a1a1aa", fontSize: "0.74rem", lineHeight: 1.5 }}>
            <li style={legStyle}>
              <strong style={{ color: "#e4e4e7" }}>Colored circles</strong> — cities (<code>ciudad</code> objects).
              Label on the circle is the PDDL name (<code>cg1</code>, <code>c1</code>, …).
            </li>
            <li style={legStyle}>
              <strong style={{ color: "#e4e4e7" }}>Arrows</strong> — one trip leg. Text above the arrow is the{" "}
              <strong>flight</strong> id (<code>vuelo</code>).
            </li>
            <li style={legStyle}>
              <strong style={{ color: "#e4e4e7" }}>interest N</strong> (under a city) — fluent{" "}
              <code>(interes_ciudad c)</code> from your problem; the planner minimizes the sum added when visiting
              new cities.
            </li>
          </ul>
        </div>
        <div>
          <p style={{ margin: "0 0 0.35rem", fontSize: "0.72rem", fontWeight: 600, color: "#d4d4d8" }}>
            Action <code style={{ fontSize: "0.68rem", color: "#c4b5fd" }}>(anadir_ciudad …)</code>
          </p>
          <dl
            style={{
              margin: 0,
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: "0.25rem 0.65rem",
              fontSize: "0.74rem",
              color: "#a1a1aa",
              lineHeight: 1.45,
            }}
          >
            <dt style={{ fontFamily: "ui-monospace, monospace", color: "#c4b5fd" }}>c₁</dt>
            <dd style={{ margin: 0 }}>From city (must be current location).</dd>
            <dt style={{ fontFamily: "ui-monospace, monospace", color: "#c4b5fd" }}>c₂</dt>
            <dd style={{ margin: 0 }}>City you fly to (must not be visited yet).</dd>
            <dt style={{ fontFamily: "ui-monospace, monospace", color: "#c4b5fd" }}>v</dt>
            <dd style={{ margin: 0 }}>Flight <code>va_a</code> from c₁ to c₂.</dd>
            <dt style={{ fontFamily: "ui-monospace, monospace", color: "#c4b5fd" }}>h</dt>
            <dd style={{ margin: 0 }}>Hotel at c₂ (<code>esta_en</code>).</dd>
            <dt style={{ fontFamily: "ui-monospace, monospace", color: "#c4b5fd" }}>d</dt>
            <dd style={{ margin: 0 }}>
              Stay token; nights = <code>(dias_por_ciudad d)</code> in the problem.
            </dd>
          </dl>
        </div>
        <div>
          <p style={{ margin: "0 0 0.35rem", fontSize: "0.72rem", fontWeight: 600, color: "#d4d4d8" }}>Timeline row</p>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", color: "#a1a1aa", fontSize: "0.74rem", lineHeight: 1.5 }}>
            <li style={legStyle}>
              ✈️ / 🏨 / 📅 — flight id, hotel id, nights in that city.
            </li>
            <li style={legStyle}>
              <strong style={{ color: "#e4e4e7" }}>Cumulative trip days</strong> — running sum of nights (must reach{" "}
              <code>min_dias_recorrido</code> by the goal).
            </li>
            <li style={legStyle}>
              <strong style={{ color: "#e4e4e7" }}>Step number</strong> (purple badge) — position in the plan (1, 2, 3…).
            </li>
          </ul>
        </div>
      </div>
      <div style={{ marginTop: "0.85rem", paddingTop: "0.65rem", borderTop: "1px solid #2e2e38" }}>
        <p style={{ margin: "0 0 0.45rem", fontSize: "0.72rem", fontWeight: 600, color: "#d4d4d8" }}>
          City colors (same id → same hue)
        </p>
        <p style={{ margin: "0 0 0.5rem", fontSize: "0.7rem", color: "#71717a", lineHeight: 1.45 }}>
          Colors are fixed per city name so you can match the map, timeline, and PDDL objects. They are not interest
          values or optimality.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "0.5rem 0.85rem", alignItems: "center" }}>
          {cities.map((c) => (
            <div
              key={c}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                fontSize: "0.76rem",
                fontFamily: "ui-monospace, monospace",
                color: "#d4d4d8",
              }}
            >
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: cityColor(c),
                  border: "2px solid #18181b",
                  flexShrink: 0,
                }}
                aria-hidden
              />
              <span>{c}</span>
              {interes[c] != null && (
                <span style={{ color: "#71717a", fontSize: "0.7rem" }}>(interest {interes[c]})</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

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
      padding: "0.45rem 0.9rem",
      borderRadius: "0.5rem",
      border: "none",
      cursor: "pointer",
      fontSize: "0.85rem",
      fontWeight: 600,
      background: on ? "linear-gradient(135deg, #6366f1, #a855f7)" : "#27272a",
      color: "#fff",
    }) as const,
  pre: {
    margin: 0,
    padding: "1rem",
    background: "#0c0c12",
    borderRadius: "0.5rem",
    overflow: "auto" as const,
    fontSize: "0.72rem",
    lineHeight: 1.45,
    border: "1px solid #27272a",
    maxHeight: "min(520px, 55vh)",
  } as const,
  graph: {
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: "0.75rem",
    alignItems: "center" as const,
    padding: "1rem",
    background: "#12121a",
    borderRadius: "0.5rem",
  } as const,
  row: { display: "flex" as const, alignItems: "center" as const, gap: "0.5rem", flexWrap: "wrap" as const },
  node: {
    padding: "0.35rem 0.65rem",
    background: "#27272a",
    borderRadius: "0.35rem",
    fontSize: "0.8rem",
    fontFamily: "ui-monospace, monospace",
  } as const,
  edge: { color: "#71717a", fontSize: "0.75rem" } as const,
  link: {
    display: "inline-flex" as const,
    alignItems: "center" as const,
    gap: "0.35rem",
    color: "#a5b4fc",
    fontSize: "0.85rem",
    marginTop: "0.75rem",
  } as const,
  textarea: {
    width: "100%",
    minHeight: "200px",
    padding: "0.85rem",
    fontSize: "0.72rem",
    lineHeight: 1.45,
    fontFamily: "ui-monospace, monospace",
    background: "#0c0c12",
    color: "#d4d4d8",
    border: "1px solid #27272a",
    borderRadius: "0.5rem",
    resize: "vertical" as const,
    boxSizing: "border-box" as const,
  } as const,
  btnPrimary: {
    padding: "0.55rem 1.1rem",
    borderRadius: "0.5rem",
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.9rem",
    background: "linear-gradient(135deg, #6366f1, #a855f7)",
    color: "#fff",
  } as const,
  btnGhost: {
    padding: "0.45rem 0.85rem",
    borderRadius: "0.5rem",
    border: "1px solid #3f3f46",
    cursor: "pointer",
    fontSize: "0.8rem",
    background: "#27272a",
    color: "#e4e4e7",
  } as const,
  warn: {
    padding: "0.85rem 1rem",
    background: "rgba(234, 179, 8, 0.1)",
    border: "1px solid rgba(234, 179, 8, 0.35)",
    borderRadius: "0.5rem",
    color: "#fde047",
    fontSize: "0.85rem",
    lineHeight: 1.5,
    marginBottom: "1rem",
  } as const,
  err: {
    padding: "0.85rem 1rem",
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.35)",
    borderRadius: "0.5rem",
    color: "#fca5a5",
    fontSize: "0.85rem",
    whiteSpace: "pre-wrap" as const,
    marginTop: "0.75rem",
  } as const,
  info: {
    padding: "0.85rem 1rem",
    background: "rgba(99, 102, 241, 0.12)",
    border: "1px solid rgba(129, 140, 248, 0.35)",
    borderRadius: "0.5rem",
    color: "#c7d2fe",
    fontSize: "0.85rem",
    lineHeight: 1.5,
    marginBottom: "1rem",
  } as const,
};

export default function PlanificacionDemo() {
  const routeArrowId = useId().replace(/:/g, "");
  const [tab, setTab] = useState<Tab>("Overview");
  const plannerExplicit = useMemo(() => explicitPlannerUrl(), []);
  const plannerUrl = useMemo(() => plannerBaseUrl(), []);
  const devDefaultPlanner =
    typeof import.meta !== "undefined" &&
    import.meta.env?.DEV &&
    !plannerExplicit &&
    Boolean(plannerUrl);
  const pDomain = `${basePath}demos/planificacion/agencia_de_viajes_domain_ext2.pddl`;
  const pProblem = `${basePath}demos/planificacion/agencia_de_viajes_problem_ext2.pddl`;

  const [domainEdit, setDomainEdit] = useState(DOMAIN_EXT2);
  const [problemEdit, setProblemEdit] = useState(PROBLEM_EXT2);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PlanResponse | null>(null);
  const [fetchErr, setFetchErr] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);

  const visualTrip = useMemo(() => {
    if (!result?.ok || !result.plan?.length) return null;
    const diasMap = parseDiasFromProblem(problemEdit);
    const steps = parseTripSteps(result.plan, diasMap);
    if (steps.length === 0) return null;
    return {
      steps,
      diasMap,
      interes: parseInteresFromProblem(problemEdit),
    };
  }, [result, problemEdit]);

  async function runPlanner() {
    setFetchErr(null);
    setResult(null);
    if (!plannerUrl) {
      setFetchErr("Planner API URL is not configured (set PUBLIC_PLANNER_URL at build time).");
      return;
    }
    setRunning(true);
    try {
      const res = await fetch(`${plannerUrl}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domainEdit, problem: problemEdit }),
      });
      let data: PlanResponse;
      try {
        data = (await res.json()) as PlanResponse;
      } catch {
        setFetchErr(`HTTP ${res.status}: not JSON`);
        return;
      }
      setResult(data);
      if (!res.ok) {
        setFetchErr(data.error || `HTTP ${res.status}`);
        return;
      }
      if (!data.ok) {
        setFetchErr(data.error || "Planner returned no plan.");
      }
    } catch (e) {
      setFetchErr(e instanceof Error ? e.message : "Network error (CORS, offline, or wrong URL).");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <p style={{ margin: "0 0 1rem", color: "#a1a1aa", fontSize: "0.95rem", lineHeight: 1.6 }}>
          Automated planning practice: a <strong>travel agency</strong> domain in PDDL. The planner must
          visit enough cities and spend enough total days, while <strong>minimizing cumulative “interest”</strong>{" "}
          (prefer less touristy stops). Below: Extension&nbsp;2 (numeric fluents + metric).
        </p>
        <div style={s.graph}>
          <div style={s.row}>
            <span style={s.node}>cg1</span>
            <span style={s.edge}>—vg1→</span>
            <span style={s.node}>c1</span>
            <span style={s.node}>c2</span>
            <span style={s.node}>c3</span>
          </div>
          <div style={s.row}>
            <span style={s.edge}>c1</span>
            <span style={s.edge}>↔</span>
            <span style={s.node}>v1</span>
            <span style={s.edge}>↔ c2 ↔ v2 ↔ c3 ↔ v3 ↔ c1</span>
          </div>
          <p style={{ margin: 0, fontSize: "0.8rem", color: "#71717a", textAlign: "center" as const }}>
            Hub <code>cg1</code> connects to three cities; cities form a triangle. Each city has a hotel.
          </p>
        </div>
      </div>

      <div style={s.card}>
        <div style={s.tabs}>
          {tabs.map((t) => (
            <button key={t} type="button" style={s.tab(tab === t)} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>

        {tab === "Overview" && (
          <div>
            <ul style={{ color: "#a1a1aa", lineHeight: 1.75, paddingLeft: "1.25rem", margin: "0 0 1rem" }}>
              <li>
                <strong>Action</strong> <code style={{ color: "#c4b5fd" }}>anadir_ciudad</code>: fly{" "}
                <code>c1→c2</code> on an existing flight, book hotel in <code>c2</code>, stay <code>d</code>{" "}
                days (within min/max per city).
              </li>
              <li>
                <strong>Goal</strong>: at least <code>min_ciudades_a_recoger</code> new cities visited and total
                trip days ≥ <code>min_dias_recorrido</code>.
              </li>
              <li>
                <strong>Metric</strong>: minimize <code>interes_actual</code> (sum of per-city interest for
                visited destinations).
              </li>
            </ul>
            <p style={{ color: "#71717a", fontSize: "0.85rem", margin: 0 }}>
              Classical Fast Downward does not support <code>:fluents</code>. Use a numeric planner (e.g. ENHSP,
              LPG) or the <strong>Run planner</strong> tab when a solver API is deployed.
            </p>
            <a href={pDomain} download style={s.link}>
              Download domain (.pddl)
            </a>
            <a href={pProblem} download style={{ ...s.link, marginLeft: "1rem" }}>
              Download problem (.pddl)
            </a>
          </div>
        )}

        {tab === "Run planner" && (
          <div>
            {!plannerUrl && (
              <div style={s.warn}>
                <strong>Planner API not configured.</strong> Set <code>PUBLIC_PLANNER_URL</code> in{" "}
                <code>.env</code> before <code>npm run build</code> (e.g. your deployed FastAPI + ENHSP service).
                You can still browse and download PDDL on the other tabs.
              </div>
            )}
            {devDefaultPlanner && (
              <div style={s.info}>
                <strong>Dev mode:</strong> using <code>http://127.0.0.1:8765</code> (no{" "}
                <code>PUBLIC_PLANNER_URL</code> set). From repo root run{" "}
                <code style={{ whiteSpace: "nowrap" }}>python -m uvicorn app.main:app --port 8765</code> inside{" "}
                <code>planner-api/</code>. Production builds still need{" "}
                <code>PUBLIC_PLANNER_URL</code> in <code>.env</code>.
              </div>
            )}
            {plannerUrl && !devDefaultPlanner && (
              <p style={{ color: "#a1a1aa", fontSize: "0.85rem", margin: "0 0 1rem", lineHeight: 1.55 }}>
                Sends domain + problem to <code style={{ color: "#c4b5fd" }}>{plannerUrl}/plan</code> (ENHSP
                backend). The service normalizes common PDDL quirks so the course files run as-is.
              </p>
            )}
            {plannerUrl && devDefaultPlanner && (
              <p style={{ color: "#a1a1aa", fontSize: "0.85rem", margin: "0 0 1rem", lineHeight: 1.55 }}>
                POST to <code style={{ color: "#c4b5fd" }}>{plannerUrl}/plan</code> — ENHSP backend; course PDDL
                is normalized automatically.
              </p>
            )}
            <div style={{ display: "grid", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label style={{ display: "block", color: "#a1a1aa", fontSize: "0.8rem", marginBottom: "0.35rem" }}>
                  Domain
                </label>
                <textarea
                  style={s.textarea}
                  value={domainEdit}
                  onChange={(e) => setDomainEdit(e.target.value)}
                  spellCheck={false}
                  aria-label="PDDL domain"
                />
              </div>
              <div>
                <label style={{ display: "block", color: "#a1a1aa", fontSize: "0.8rem", marginBottom: "0.35rem" }}>
                  Problem
                </label>
                <textarea
                  style={s.textarea}
                  value={problemEdit}
                  onChange={(e) => setProblemEdit(e.target.value)}
                  spellCheck={false}
                  aria-label="PDDL problem"
                />
              </div>
            </div>
            <div style={{ ...s.row, marginBottom: "1rem" }}>
              <button
                type="button"
                style={{
                  ...s.btnPrimary,
                  opacity: running || !plannerUrl ? 0.55 : 1,
                  cursor: running || !plannerUrl ? "not-allowed" : "pointer",
                }}
                disabled={running || !plannerUrl}
                onClick={() => void runPlanner()}
              >
                {running ? "Running…" : "Run planner"}
              </button>
              <button
                type="button"
                style={s.btnGhost}
                onClick={() => {
                  setDomainEdit(DOMAIN_EXT2);
                  setProblemEdit(PROBLEM_EXT2);
                  setResult(null);
                  setFetchErr(null);
                }}
              >
                Reset to Extension_2 defaults
              </button>
            </div>
            {fetchErr && <div style={s.err}>{fetchErr}</div>}
            {result?.ok && result.plan && result.plan.length > 0 && (
              <div style={{ marginTop: "1rem" }}>
                <h4 style={{ margin: "0 0 0.5rem", color: "#e4e4e7", fontSize: "0.95rem" }}>
                  Plan ({result.plan.length} steps
                  {result.time_sec != null ? ` · ${result.time_sec}s` : ""})
                </h4>
                {visualTrip && (
                  <div
                    style={{
                      marginBottom: "1.25rem",
                      padding: "1rem",
                      background: "#0c0c12",
                      border: "1px solid #27272a",
                      borderRadius: "0.65rem",
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 0.75rem",
                        fontSize: "0.8rem",
                        color: "#a1a1aa",
                        fontWeight: 600,
                        textTransform: "uppercase" as const,
                        letterSpacing: "0.04em",
                      }}
                    >
                      Trip visualization
                    </p>
                    <TripLegend steps={visualTrip.steps} interes={visualTrip.interes} />
                    <PlanRouteSvg
                      steps={visualTrip.steps}
                      interes={visualTrip.interes}
                      arrowMarkerId={routeArrowId}
                    />
                    <PlanTimeline steps={visualTrip.steps} diasMap={visualTrip.diasMap} />
                  </div>
                )}
                <p style={{ margin: "0 0 0.35rem", fontSize: "0.8rem", color: "#71717a" }}>Raw actions</p>
                <ol
                  style={{
                    margin: 0,
                    paddingLeft: "1.25rem",
                    color: "#d4d4d8",
                    fontFamily: "ui-monospace, monospace",
                    fontSize: "0.8rem",
                    lineHeight: 1.85,
                  }}
                >
                  {result.plan.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ol>
              </div>
            )}
            {result?.stdout && (
              <div style={{ marginTop: "1rem" }}>
                <button
                  type="button"
                  style={{ ...s.btnGhost, marginBottom: "0.5rem" }}
                  onClick={() => setShowLog((v) => !v)}
                >
                  {showLog ? "Hide" : "Show"} solver log
                </button>
                {showLog && (
                  <pre style={{ ...s.pre, maxHeight: "min(360px, 40vh)", fontSize: "0.68rem" }}>
                    <code style={{ color: "#a1a1aa" }}>{result.stdout}</code>
                  </pre>
                )}
              </div>
            )}
          </div>
        )}

        {tab === "Domain" && (
          <div>
            <pre style={s.pre}>
              <code style={{ color: "#d4d4d8" }}>{DOMAIN_EXT2}</code>
            </pre>
          </div>
        )}

        {tab === "Problem" && (
          <pre style={s.pre}>
            <code style={{ color: "#d4d4d8" }}>{PROBLEM_EXT2}</code>
          </pre>
        )}

        {tab === "Extensions" && (
          <ul style={{ color: "#a1a1aa", lineHeight: 1.8, paddingLeft: "1.25rem", margin: 0 }}>
            <li>
              <strong>Básico</strong> — STRIPS-style: visit a minimum number of cities (counters as fluents).
            </li>
            <li>
              <strong>Extension_1</strong> — Same structure; problems exercise different instance sizes.
            </li>
            <li>
              <strong>Extension_2</strong> — Days per city choice, minimum total trip length, per-city
              &quot;interest&quot; and metric <code>minimize (interes_actual)</code>.
            </li>
            <li>
              <strong>Extension_3 / 4</strong> — Further problem variants and test generators (
              <code>scriptinstancias</code>).
            </li>
            <li>
              <strong>Extra_2</strong> — Additional benchmark problems.
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}
