import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import modelData from "../../data/tfg-model-results.json";
import LiveAppEmbed from "./LiveAppEmbed";

/* ── constants ── */
const accent1 = "var(--accent-start)";
const accent2 = "var(--accent-end)";

const card = {
  background: "var(--bg-card)",
  border: "1px solid var(--border-color)",
  borderRadius: "1rem",
  padding: "1.5rem",
} as const;

import { TRANSLATIONS, type DemoTranslations } from "../../i18n/demos/tfg-polyp-demo";

type Lang = "en" | "es" | "ca";

type ModelResult = (typeof modelData)[number];

/* ════════════════════════════════════════════════════════════════════════ */
/*  PIPELINE STRIP                                                        */
/* ════════════════════════════════════════════════════════════════════════ */
function PipelineStrip({ t }: { t: typeof TRANSLATIONS.en }) {
  return (
    <div style={{ ...card, marginBottom: "1.25rem", background: "var(--bg-card)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <div style={{
          padding: "0.2rem 0.55rem", borderRadius: "0.35rem", fontSize: "0.65rem", fontWeight: 700,
          letterSpacing: "0.06em", textTransform: "uppercase" as const,
          background: `linear-gradient(135deg, ${accent1}, ${accent2})`, color: "var(--text-primary)",
        }}>{t.pipelineTitle}</div>
        <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>{t.thesis}</span>
      </div>
      <div style={{ display: "flex", gap: "0.35rem", overflowX: "auto", paddingBottom: "0.25rem" }}>
        {t.pipelineSteps.map((step, i) => (
          <div key={i} style={{
            flex: "1 0 auto", minWidth: 100, padding: "0.6rem 0.7rem",
            background: "var(--bg-secondary)", borderRadius: "0.5rem", border: "1px solid var(--border-color)", textAlign: "center",
          }}>
            <div style={{ fontSize: "1.1rem", marginBottom: "0.2rem" }}>{step.icon}</div>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-primary)" }}>{step.title}</div>
            <div style={{ fontSize: "0.62rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>{step.desc}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.85rem" }}>
        {["PyTorch 2.1", "Faster R-CNN", "CycleGAN", "SPADE", "Optuna", "Ray Tune", "COCO eval", "LDPolypVideo"].map((tag) => (
          <span key={tag} style={{
            padding: "0.2rem 0.5rem", borderRadius: "1rem", fontSize: "0.65rem", fontWeight: 600,
            background: "var(--bg-card-hover)", border: "1px solid var(--border-color)", color: "var(--text-secondary)",
          }}>{tag}</span>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
/*  MODEL COMPARISON CHART                                                */
/* ════════════════════════════════════════════════════════════════════════ */
function ModelComparison({ t }: { t: typeof TRANSLATIONS.en }) {
  const [metric, setMetric] = useState<"ap50" | "ap5095" | "ar100" | "f1">("f1");
  const [sortBy, setSortBy] = useState<"metric" | "lr" | "epochs">("metric");

  const sorted = useMemo(() => {
    const arr = [...modelData];
    if (sortBy === "metric") arr.sort((a, b) => (b as any)[metric] - (a as any)[metric]);
    else if (sortBy === "lr") arr.sort((a, b) => a.lr - b.lr);
    else arr.sort((a, b) => b.epochs - a.epochs);
    return arr;
  }, [metric, sortBy]);

  const maxVal = useMemo(() => Math.max(...sorted.map((m) => (m as any)[metric]), 0.01), [sorted, metric]);

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
        <div style={{
          width: 30, height: 30, borderRadius: "0.5rem", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: "0.9rem",
          background: `linear-gradient(135deg, rgba(16,185,129,0.15), rgba(14,165,233,0.1))`,
        }}>{"\u{1F4CA}"}</div>
        <div>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>{t.modelComp}</h3>
          <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-muted)" }}>{t.modelCompSub}</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {(["f1", "ap50", "ap5095", "ar100"] as const).map((m) => (
          <button key={m} type="button" onClick={() => setMetric(m)} style={{
            padding: "0.3rem 0.65rem", borderRadius: "0.4rem", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer",
            border: metric === m ? "1px solid var(--accent-start)" : "1px solid var(--border-color)",
            background: metric === m ? "color-mix(in srgb, var(--accent-start) 10%, transparent)" : "var(--bg-card-hover)",
            color: metric === m ? "var(--accent-start)" : "var(--text-secondary)",
          }}>{t.metrics[m]}</button>
        ))}
        <span style={{ margin: "auto 0 auto auto", fontSize: "0.68rem", color: "var(--border-color-hover)" }}>{t.sort}</span>
        {(["metric", "lr", "epochs"] as const).map((s) => (
          <button key={s} type="button" onClick={() => setSortBy(s)} style={{
            padding: "0.25rem 0.5rem", borderRadius: "0.35rem", fontSize: "0.65rem", fontWeight: 600, cursor: "pointer",
            border: "none", background: sortBy === s ? "var(--border-color)" : "transparent",
            color: sortBy === s ? "var(--text-primary)" : "var(--text-muted)",
          }}>{s}</button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
        {sorted.map((m) => {
          const val = (m as any)[metric] as number;
          const pct = (val / maxVal) * 100;
          return (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ minWidth: 155, fontSize: "0.7rem", color: "var(--text-secondary)", fontFamily: "ui-monospace, monospace" }}>
                bs={m.batchSize} lr={m.lr.toExponential(1)} ep={m.epochs}
              </div>
              <div style={{ flex: 1, height: 18, background: "var(--bg-secondary)", borderRadius: 4, overflow: "hidden", position: "relative" }}>
                <div style={{
                  height: "100%", width: `${pct}%`, borderRadius: 4,
                  background: `linear-gradient(90deg, ${accent1}, ${accent2})`,
                  transition: "width 0.4s ease",
                }} />
              </div>
              <span style={{ minWidth: 52, textAlign: "right", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-primary)", fontFamily: "ui-monospace, monospace" }}>
                {val.toFixed(4)}
              </span>
            </div>
          );
        })}
      </div>

      <p style={{ margin: "0.75rem 0 0", fontSize: "0.68rem", color: "var(--border-color-hover)" }}>
        {t.allModels}
      </p>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
/*  MOCK INFERENCE                                                        */
/* ════════════════════════════════════════════════════════════════════════ */
import { MOCK_BOXES } from "../../lib/tfg-mock-boxes";

function MockInference({ t }: { t: typeof TRANSLATIONS.en }) {
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState("");
  const [confidence, setConfidence] = useState(0.5);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);
  useEffect(() => () => clear(), [clear]);

  const run = useCallback(() => {
    clear();
    setPhase("running"); setProgress(0); setStep(t.loading);
    const t0 = Date.now(), total = 2400;
    timerRef.current = setInterval(() => {
      const p = Math.min(100, ((Date.now() - t0) / total) * 100);
      setProgress(p);
      if (p < 25) setStep(t.loading);
      else if (p < 55) setStep(t.preprocessing);
      else if (p < 80) setStep(t.forwardPass);
      else setStep(t.nms);
      if (Date.now() - t0 >= total) { clear(); setPhase("done"); setStep(t.complete); setProgress(100); }
    }, 50);
  }, [clear, t]);

  const reset = useCallback(() => { clear(); setPhase("idle"); setProgress(0); setStep(""); }, [clear]);
  const showBoxes = phase === "done";
  const visibleBoxes = MOCK_BOXES.filter((b) => b.score >= confidence);

  return (
    <div>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", lineHeight: 1.55, margin: "0 0 0.75rem" }}>
        {t.simDesc1}
        <br/>{t.simDesc2}<strong style={{ color: "var(--text-primary)" }}>{t.simDesc3}</strong>{t.simDesc4}
      </p>

      <div style={{ position: "relative", borderRadius: "0.5rem", overflow: "hidden", background: "var(--bg-secondary)", lineHeight: 0 }}>
        {/* Procedural colonoscopy-like frame */}
        <svg viewBox="0 0 480 320" style={{ width: "100%", height: "auto", display: "block" }}>
          <defs>
            <radialGradient id="tfg-bg" cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor="#3b1a1a" />
              <stop offset="60%" stopColor="#1a0a0a" />
              <stop offset="100%" stopColor="#0a0505" />
            </radialGradient>
            <radialGradient id="tfg-polyp1" cx="50%" cy="45%" r="50%">
              <stop offset="0%" stopColor="#c4524a" />
              <stop offset="70%" stopColor="#7a2a24" />
              <stop offset="100%" stopColor="#3b1a1a" />
            </radialGradient>
            <radialGradient id="tfg-polyp2" cx="50%" cy="40%" r="50%">
              <stop offset="0%" stopColor="#b84a44" />
              <stop offset="70%" stopColor="#6a2220" />
              <stop offset="100%" stopColor="#3b1a1a" />
            </radialGradient>
          </defs>
          <rect width="480" height="320" fill="url(#tfg-bg)" />
          {/* tissue folds */}
          <ellipse cx="120" cy="240" rx="90" ry="35" fill="#2a1010" opacity="0.5" />
          <ellipse cx="360" cy="200" rx="70" ry="28" fill="#2a1010" opacity="0.4" />
          <ellipse cx="240" cy="280" rx="130" ry="30" fill="#1f0c0c" opacity="0.4" />
          {/* polyp 1 */}
          <ellipse cx="210" cy="130" rx="50" ry="40" fill="url(#tfg-polyp1)" />
          <ellipse cx="205" cy="122" rx="18" ry="12" fill="#d4635c" opacity="0.3" />
          {/* polyp 2 */}
          <ellipse cx="335" cy="200" rx="35" ry="28" fill="url(#tfg-polyp2)" />
          <ellipse cx="330" cy="194" rx="12" ry="8" fill="#ca5e58" opacity="0.25" />
          {/* vignette */}
          <rect width="480" height="320" fill="url(#tfg-bg)" opacity="0.3" />

          {/* bounding boxes */}
          {showBoxes && visibleBoxes.map((b, i) => {
            const x = (b.x / 100) * 480;
            const y = (b.y / 100) * 320;
            const w = (b.w / 100) * 480;
            const h = (b.h / 100) * 320;
            return (
              <g key={i}>
                <rect x={x} y={y} width={w} height={h} fill="none" stroke="#ef4444" strokeWidth="2.5" rx="3" />
                <rect x={x} y={y - 16} width={80} height={16} fill="#ef4444" rx="2" />
                <text x={x + 4} y={y - 4} fill="#fff" fontSize="10" fontWeight="700" fontFamily="ui-monospace, monospace">
                  {b.label} {(b.score * 100).toFixed(0)}%
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center", marginTop: "0.75rem" }}>
        {phase === "idle" && (
          <button type="button" onClick={run} style={{
            padding: "0.45rem 1rem", borderRadius: "0.5rem", border: "none", fontWeight: 600,
            fontSize: "0.82rem", cursor: "pointer",
            background: `linear-gradient(135deg, ${accent1}, ${accent2})`, color: "var(--text-primary)",
          }}>{t.runDemo}</button>
        )}
        {phase === "running" && <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{step}</span>}
        {phase === "done" && (
          <>
            <button type="button" onClick={reset} style={{
              padding: "0.4rem 0.85rem", borderRadius: "0.5rem", border: "1px solid var(--border-color-hover)",
              fontWeight: 600, fontSize: "0.82rem", cursor: "pointer", background: "var(--border-color)", color: "var(--text-primary)",
            }}>{t.reset}</button>
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
              {t.confidence}
              <input type="range" min={0.1} max={1.0} step={0.05} value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))} style={{ width: "80px" }} />
              <span style={{ fontFamily: "ui-monospace, monospace", fontSize: "0.72rem", color: "var(--text-secondary)" }}>{(confidence * 100).toFixed(0)}%</span>
            </label>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              {visibleBoxes.length} {visibleBoxes.length !== 1 ? t.detections : t.detection}
            </span>
          </>
        )}
      </div>

      {(phase === "running" || phase === "done") && (
        <div style={{ height: 5, background: "var(--border-color)", borderRadius: 3, overflow: "hidden", marginTop: "0.5rem" }}>
          <div style={{
            height: "100%", width: `${progress}%`,
            background: `linear-gradient(90deg, ${accent1}, ${accent2})`,
            transition: phase === "running" ? "width 0.05s linear" : "width 0.3s ease",
          }} />
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
/*  CYCLEGAN VISUALIZER                                                   */
/* ════════════════════════════════════════════════════════════════════════ */
function CycleGanVisualizer({ t }: { t: typeof TRANSLATIONS.en }) {
  const [direction, setDirection] = useState<"mask2polyp" | "polyp2mask">("mask2polyp");

  return (
    <div>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", lineHeight: 1.55, margin: "0 0 0.75rem" }}>
        {t.cgDesc1}<strong style={{ color: "var(--text-primary)" }}>{t.cgDesc2}</strong>{t.cgDesc3}
      </p>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
        {(["mask2polyp", "polyp2mask"] as const).map((d) => (
          <button key={d} type="button" onClick={() => setDirection(d)} style={{
            padding: "0.3rem 0.65rem", borderRadius: "0.4rem", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer",
            border: direction === d ? `1px solid ${accent1}` : "1px solid var(--border-color)",
            background: direction === d ? `${accent1}18` : "var(--bg-card-hover)",
            color: direction === d ? accent1 : "var(--text-secondary)",
          }}>{d === "mask2polyp" ? t.m2p : t.p2m}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "0.75rem", alignItems: "center" }}>
        {/* Input */}
        <div style={{ background: "var(--bg-secondary)", borderRadius: "0.5rem", overflow: "hidden", border: "1px solid var(--border-color)" }}>
          <svg viewBox="0 0 200 160" style={{ width: "100%", height: "auto", display: "block" }}>
            {direction === "mask2polyp" ? (
              <>
                <rect width="200" height="160" fill="#0a0a0a" />
                <ellipse cx="100" cy="70" rx="45" ry="35" fill="#ffffff" />
                <ellipse cx="145" cy="110" rx="25" ry="20" fill="#ffffff" />
                <text x="100" y="150" textAnchor="middle" fill="var(--text-muted)" fontSize="10">{t.binMask}</text>
              </>
            ) : (
              <>
                <defs>
                  <radialGradient id="cg-src" cx="50%" cy="45%" r="55%">
                    <stop offset="0%" stopColor="#3b1a1a" />
                    <stop offset="100%" stopColor="#0a0505" />
                  </radialGradient>
                  <radialGradient id="cg-p1" cx="50%" cy="45%" r="50%">
                    <stop offset="0%" stopColor="#c4524a" />
                    <stop offset="100%" stopColor="#3b1a1a" />
                  </radialGradient>
                </defs>
                <rect width="200" height="160" fill="url(#cg-src)" />
                <ellipse cx="100" cy="70" rx="45" ry="35" fill="url(#cg-p1)" />
                <ellipse cx="95" cy="62" rx="15" ry="10" fill="#d4635c" opacity="0.3" />
                <text x="100" y="150" textAnchor="middle" fill="var(--text-muted)" fontSize="10">{t.colFrame}</text>
              </>
            )}
          </svg>
        </div>

        {/* Arrow */}
        <div style={{ color: accent1, fontSize: "1.5rem", fontWeight: 700 }}>{"\u2192"}</div>

        {/* Output */}
        <div style={{ background: "var(--bg-secondary)", borderRadius: "0.5rem", overflow: "hidden", border: "1px solid var(--border-color)" }}>
          <svg viewBox="0 0 200 160" style={{ width: "100%", height: "auto", display: "block" }}>
            {direction === "mask2polyp" ? (
              <>
                <defs>
                  <radialGradient id="cg-out" cx="50%" cy="45%" r="55%">
                    <stop offset="0%" stopColor="#3b1a1a" />
                    <stop offset="100%" stopColor="#0a0505" />
                  </radialGradient>
                  <radialGradient id="cg-gen" cx="50%" cy="45%" r="50%">
                    <stop offset="0%" stopColor="#c4524a" />
                    <stop offset="100%" stopColor="#3b1a1a" />
                  </radialGradient>
                </defs>
                <rect width="200" height="160" fill="url(#cg-out)" />
                <ellipse cx="100" cy="70" rx="45" ry="35" fill="url(#cg-gen)" />
                <ellipse cx="95" cy="62" rx="15" ry="10" fill="#d4635c" opacity="0.3" />
                <ellipse cx="145" cy="110" rx="25" ry="20" fill="#7a2a24" opacity="0.7" />
                <text x="100" y="150" textAnchor="middle" fill="var(--text-muted)" fontSize="10">{t.genPolyp}</text>
              </>
            ) : (
              <>
                <rect width="200" height="160" fill="#0a0a0a" />
                <ellipse cx="100" cy="70" rx="45" ry="35" fill="#ffffff" />
                <text x="100" y="150" textAnchor="middle" fill="var(--text-muted)" fontSize="10">{t.predMask}</text>
              </>
            )}
          </svg>
        </div>
      </div>

      <p style={{ margin: "0.6rem 0 0", fontSize: "0.68rem", color: "var(--border-color-hover)" }}>
        {t.cgNote}
      </p>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
/*  DETECTOR TABLE                                                        */
/* ════════════════════════════════════════════════════════════════════════ */
function DetectorTable({ t }: { t: typeof TRANSLATIONS.en }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
            {[t.thModel, t.thBackbone, t.thNotes].map((h) => (
              <th key={h} style={{ padding: "0.5rem 0.75rem", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.72rem", textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {t.detectors.map((d) => (
            <tr key={d.name} style={{ borderBottom: "1px solid var(--border-color)" }}>
              <td style={{ padding: "0.5rem 0.75rem", fontWeight: 600, color: "var(--text-primary)" }}>{d.name}</td>
              <td style={{ padding: "0.5rem 0.75rem", color: "var(--text-secondary)", fontFamily: "ui-monospace, monospace", fontSize: "0.78rem" }}>{d.backbone}</td>
              <td style={{ padding: "0.5rem 0.75rem", color: "var(--text-muted)" }}>{d.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
/*  MAIN EXPORT                                                           */
/* ════════════════════════════════════════════════════════════════════════ */
export default function TfgPolypDemo({ lang = "en" }: { lang?: Lang }) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  return (
    <div style={{ fontFamily: "var(--font-sans, 'Inter', sans-serif)", color: "var(--text-primary)" }}>
      <LiveAppEmbed
        url="http://localhost:8082"
        title="TFG Polyp Detection Dashboard"
        dockerCmd="cd TFG && docker compose up"
        devCmd="cd TFG && make run"
        lang={lang}
      />

      {/* Pipeline */}
      <PipelineStrip t={t} />

      {/* Interactive dual panel */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
        gap: "1.25rem", marginBottom: "1.25rem",
      }}>
        {/* Mock inference */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <div style={{
              width: 30, height: 30, borderRadius: "0.5rem", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: "0.9rem",
              background: "linear-gradient(135deg, color-mix(in srgb, var(--accent-start) 15%, transparent), color-mix(in srgb, var(--accent-end) 10%, transparent))",
            }}>{"\u{1F52C}"}</div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>{t.simInference}</h3>
              <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-muted)" }}>{t.browserMock}</p>
            </div>
          </div>
          <MockInference t={t} />
        </div>

        {/* CycleGAN viz */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <div style={{
              width: 30, height: 30, borderRadius: "0.5rem", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: "0.9rem",
              background: "linear-gradient(135deg, color-mix(in srgb, var(--accent-end) 15%, transparent), color-mix(in srgb, var(--accent-start) 10%, transparent))",
            }}>{"\u{1F3AD}"}</div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>{t.cgTrans}</h3>
              <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-muted)" }}>{t.unpaired}</p>
            </div>
          </div>
          <CycleGanVisualizer t={t} />
        </div>
      </div>

      {/* Model comparison */}
      <div style={{ marginBottom: "1.25rem" }}>
        <ModelComparison t={t} />
      </div>

      {/* Detector table + links */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
        gap: "1.25rem", marginBottom: "1.25rem",
      }}>
        <div style={card}>
          <h4 style={{ margin: "0 0 0.75rem", fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>{t.detArch}</h4>
          <DetectorTable t={t} />
        </div>
        <div style={{ ...card, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>{t.links}</h4>
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
              {t.dashboard1}<strong style={{ color: "var(--text-secondary)" }}>{t.dashboard2}</strong>{t.dashboard3}
              <code style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>docker compose up</code>{t.dashboard4}
            </p>
          </div>
          <div style={{ marginTop: "1.25rem" }}>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: "0.2rem" }}>{t.author}</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>Pol Casacuberta &middot; FIB-UPC</div>
          </div>
        </div>
      </div>

    </div>
  );
}
