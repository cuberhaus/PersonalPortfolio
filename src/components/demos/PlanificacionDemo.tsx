import { useId, useState } from "react";
import LiveAppEmbed from "./LiveAppEmbed";

import { TRANSLATIONS, type DemoTranslations } from "../../i18n/demos/planificacion-demo";

type Lang = "en" | "es" | "ca";

const basePath =
  typeof import.meta !== "undefined" && import.meta.env?.BASE_URL != null
    ? import.meta.env.BASE_URL : "/";

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

import { MOCK_PLAN, CITY_COLORS, cityColor } from "../../lib/planificacion";

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
          <circle cx={c.x} cy={c.y} r={18} fill={cityColor(c.id)} opacity={0.9} stroke="var(--bg-primary)" strokeWidth={2} />
          <text x={c.x} y={c.y + 4} textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700" fontFamily="ui-monospace, monospace">{c.id}</text>
          <text x={c.x} y={c.y + 30} textAnchor="middle" fill="var(--text-muted)" fontSize="8">★{c.interest}</text>
        </g>
      ))}
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
/*  MAIN EXPORT                                                           */
/* ════════════════════════════════════════════════════════════════════════ */
export default function PlanificacionDemo({ lang = "en" }: { lang?: Lang }) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const pDomain = `${basePath}demos/planificacion/agencia_de_viajes_domain_ext2.pddl`;
  const pProblem = `${basePath}demos/planificacion/agencia_de_viajes_problem_ext2.pddl`;
  const [mockState, setMockState] = useState<"idle" | "running" | "done">("idle");

  function simulatePlanner() {
    setMockState("running");
    setTimeout(() => setMockState("done"), 800 + Math.random() * 600);
  }

  return (
    <div style={{ fontFamily: "var(--font-sans, 'Inter', sans-serif)", color: "var(--text-primary)" }}>
      <LiveAppEmbed
        url="http://localhost:3000"
        title="PDDL Planning Web App"
        dockerCmd="cd Practica_de_Planificacion && make docker-run"
        devCmd="cd Practica_de_Planificacion && make dev"
        lang={lang}
      />

      {/* ── DEMO VS FULL APP ── */}
      <div style={{
        marginBottom: "1.25rem", padding: "1rem 1.25rem",
        background: "linear-gradient(135deg, color-mix(in srgb, var(--accent-start) 8%, transparent), color-mix(in srgb, var(--accent-end) 5%, transparent))",
        border: "1px solid color-mix(in srgb, var(--accent-start) 20%, transparent)",
        borderRadius: "0.75rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.85rem" }}>
          <span style={{ fontSize: "0.9rem" }}>&#9432;</span>
          <strong style={{ fontSize: "0.82rem", color: "var(--text-primary)" }}>{t.fullAppTitle}</strong>
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
          gap: "1rem",
        }}>
          <div>
            <p style={{ margin: "0 0 0.35rem", fontSize: "0.76rem", fontWeight: 600, color: "var(--text-primary)" }}>
              {t.demoIncludesLabel}
            </p>
            <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.7 }}>
              {t.demoFeatures.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>
          <div>
            <p style={{ margin: "0 0 0.35rem", fontSize: "0.76rem", fontWeight: 600, color: accent1 }}>
              {t.fullAppDesc}
            </p>
            <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.7 }}>
              {t.fullAppFeatures.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>
        </div>
        <p style={{ margin: "0.75rem 0 0", fontSize: "0.72rem", color: "var(--text-muted)" }}>
          {t.fullAppHint}{" "}
          <code style={{
            padding: "0.15rem 0.4rem", borderRadius: "0.25rem",
            background: "var(--bg-secondary)", border: "1px solid var(--border-color)",
            fontSize: "0.7rem", fontFamily: "var(--font-mono, monospace)", color: "var(--text-primary)",
          }}>cd Practica_de_Planificacion && make dev</code>
        </p>
      </div>

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
            {t.constDesc1}<code style={{ color: "var(--accent-start)" }}>anadir_ciudad</code>{t.constDesc2}
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
              <strong style={{ color: e.active ? "var(--accent-start)" : "var(--text-muted)" }}>{e.name}:</strong>{" "}
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
            <a href={pDomain} download style={{ fontSize: "0.72rem", color: "var(--accent-start)", textDecoration: "none" }}>{t.download}</a>
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
            <a href={pProblem} download style={{ fontSize: "0.72rem", color: "var(--accent-start)", textDecoration: "none" }}>{t.download}</a>
          </div>
          <pre style={{
            margin: 0, padding: "0.85rem", background: "var(--bg-secondary)", border: "1px solid var(--border-color)",
            borderRadius: "0.5rem", fontSize: "0.65rem", fontFamily: "ui-monospace, monospace",
            color: "var(--text-secondary)", lineHeight: 1.4, overflowX: "auto", maxHeight: "min(360px, 40vh)",
          }}><code>{PROBLEM_EXT2}</code></pre>
        </div>
      </div>

      {/* ── MOCK PLANNER ── */}
      <div style={{ ...card, marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <h4 style={{ margin: 0, fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {t.mockTitle}
          </h4>
          <span style={{
            padding: "0.15rem 0.45rem", borderRadius: "0.3rem", fontSize: "0.6rem", fontWeight: 700,
            letterSpacing: "0.05em", textTransform: "uppercase",
            background: "color-mix(in srgb, var(--accent-start) 15%, transparent)", color: "var(--accent-start)", border: "1px solid color-mix(in srgb, var(--accent-start) 25%, transparent)",
          }}>{t.mockBadge}</span>
        </div>
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.76rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
          {t.mockDesc}
        </p>

        {mockState === "idle" && (
          <button type="button" onClick={simulatePlanner} style={{
            padding: "0.5rem 1.1rem", borderRadius: "0.5rem", border: "none", cursor: "pointer",
            fontWeight: 600, fontSize: "0.82rem",
            background: `linear-gradient(135deg, ${accent1}, ${accent2})`, color: "#fff",
          }}>{t.mockRun}</button>
        )}

        {mockState === "running" && (
          <div style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            padding: "0.6rem 1rem", background: "var(--bg-secondary)", borderRadius: "0.5rem",
            border: "1px solid var(--border-color)", fontSize: "0.82rem", color: "var(--text-muted)",
          }}>
            <span style={{ display: "inline-block", animation: "spin 1s linear infinite", fontSize: "1rem" }}>&#9881;</span>
            {t.mockRunning}
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        )}

        {mockState === "done" && (() => {
          let cumDays = 0;
          const totalInterest = MOCK_PLAN.reduce((s, p) => s + p.interest, 0);
          const totalDays = MOCK_PLAN.reduce((s, p) => s + p.days, 0);
          return (
            <div>
              <div style={{
                display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap",
                marginBottom: "0.75rem", fontSize: "0.78rem",
              }}>
                <span style={{ color: "var(--accent-start)", fontWeight: 700 }}>&#10003; {MOCK_PLAN.length} {t.mockSteps}</span>
                <span style={{ color: "var(--text-muted)" }}>{totalDays} {t.mockDays}</span>
                <span style={{ color: "var(--text-muted)" }}>{t.mockInterest}: {totalInterest}</span>
                <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
                  {t.mockRoute}: {["cg1", ...MOCK_PLAN.map(p => p.to)].map((c, i, arr) => (
                    <span key={c}>
                      <span style={{ color: cityColor(c), fontWeight: 600 }}>{c}</span>
                      {i < arr.length - 1 && <span style={{ margin: "0 0.2rem", opacity: 0.5 }}>{"\u2192"}</span>}
                    </span>
                  ))}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "0.75rem" }}>
                {MOCK_PLAN.map((step, i) => {
                  cumDays += step.days;
                  return (
                    <div key={i} style={{
                      display: "flex", gap: "0.65rem", alignItems: "center",
                      padding: "0.55rem 0.85rem", background: "var(--bg-secondary)",
                      borderRadius: "0.5rem", border: "1px solid var(--border-color)",
                    }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                        background: `linear-gradient(135deg, ${accent1}, ${accent2})`,
                        color: "#fff", fontSize: "0.65rem", fontWeight: 700,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>{i + 1}</div>
                      <div style={{ fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "0.3rem", flexWrap: "wrap" }}>
                        <span style={{ color: cityColor(step.from), fontWeight: 600 }}>{step.from}</span>
                        <span style={{ color: "var(--text-muted)" }}>{"\u2192"}</span>
                        <span style={{ color: cityColor(step.to), fontWeight: 600 }}>{step.to}</span>
                        <span style={{ color: "var(--text-muted)", fontSize: "0.72rem", marginLeft: "0.3rem" }}>
                          {"\u2708\uFE0F"} {step.flight} · {"\uD83C\uDFE8"} {step.hotel} · {"\uD83D\uDCC5"} {step.days}d ({cumDays}d)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <details>
                <summary style={{ fontSize: "0.72rem", color: "var(--text-muted)", cursor: "pointer" }}>{t.mockActions}</summary>
                <ol style={{
                  margin: "0.4rem 0 0", paddingLeft: "1.25rem", color: "var(--text-secondary)",
                  fontFamily: "ui-monospace, monospace", fontSize: "0.68rem", lineHeight: 1.8,
                }}>
                  {MOCK_PLAN.map((p, i) => <li key={i}>{p.action}</li>)}
                </ol>
              </details>

              <button type="button" onClick={() => setMockState("idle")} style={{
                marginTop: "0.6rem", padding: "0.35rem 0.75rem", borderRadius: "0.4rem",
                border: "1px solid var(--border-color)", cursor: "pointer",
                fontSize: "0.72rem", background: "var(--bg-card-hover)", color: "var(--text-secondary)",
              }}>{t.mockRun}</button>
            </div>
          );
        })()}
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
