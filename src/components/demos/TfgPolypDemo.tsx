import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import modelData from "../../data/tfg-model-results.json";

/* ── constants ── */
const accent1 = "#10b981"; // emerald
const accent2 = "#0ea5e9"; // sky

const card = {
  background: "#111119",
  border: "1px solid #1e1e2a",
  borderRadius: "1rem",
  padding: "1.5rem",
} as const;

const PIPELINE = [
  { icon: "\u{1F4CB}", title: "LDPolypVideo", desc: "Colonoscopy frames + bbox annotations" },
  { icon: "\u{1F3AD}", title: "CycleGAN / SPADE", desc: "Mask \u2192 synthetic polyp images" },
  { icon: "\u{1F4CA}", title: "Augmented dataset", desc: "Real + generated training data" },
  { icon: "\u{1F9E0}", title: "Faster R-CNN", desc: "Object detection training" },
  { icon: "\u{1F50D}", title: "Optuna / Ray Tune", desc: "Hyperparameter optimization" },
  { icon: "\u2705", title: "COCO evaluation", desc: "AP / AR / F1 metrics" },
];

const DETECTORS = [
  { name: "Faster R-CNN", backbone: "ResNet-50 FPN", note: "Primary detector, best results" },
  { name: "RetinaNet", backbone: "ResNet-50 FPN v2", note: "Single-stage anchor-based" },
  { name: "SSD Lite", backbone: "MobileNet V3", note: "Lightweight / mobile" },
];

type ModelResult = (typeof modelData)[number];

/* ════════════════════════════════════════════════════════════════════════ */
/*  PIPELINE STRIP                                                        */
/* ════════════════════════════════════════════════════════════════════════ */
function PipelineStrip() {
  return (
    <div style={{ ...card, marginBottom: "1.25rem", background: "linear-gradient(135deg, #111119 0%, #0f0f1a 100%)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <div style={{
          padding: "0.2rem 0.55rem", borderRadius: "0.35rem", fontSize: "0.65rem", fontWeight: 700,
          letterSpacing: "0.06em", textTransform: "uppercase" as const,
          background: `linear-gradient(135deg, ${accent1}, ${accent2})`, color: "#fff",
        }}>End-to-End Pipeline</div>
        <span style={{ fontSize: "0.82rem", color: "#71717a" }}>Bachelor's Thesis &middot; FIB-UPC</span>
      </div>
      <div style={{ display: "flex", gap: "0.35rem", overflowX: "auto", paddingBottom: "0.25rem" }}>
        {PIPELINE.map((step, i) => (
          <div key={i} style={{
            flex: "1 0 auto", minWidth: 100, padding: "0.6rem 0.7rem",
            background: "#0c0c14", borderRadius: "0.5rem", border: "1px solid #1e1e2a", textAlign: "center",
          }}>
            <div style={{ fontSize: "1.1rem", marginBottom: "0.2rem" }}>{step.icon}</div>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#e4e4e7" }}>{step.title}</div>
            <div style={{ fontSize: "0.62rem", color: "#52525b", marginTop: "0.1rem" }}>{step.desc}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.85rem" }}>
        {["PyTorch 2.1", "Faster R-CNN", "CycleGAN", "SPADE", "Optuna", "Ray Tune", "COCO eval", "LDPolypVideo"].map((t) => (
          <span key={t} style={{
            padding: "0.2rem 0.5rem", borderRadius: "1rem", fontSize: "0.65rem", fontWeight: 600,
            background: "#1c1c28", border: "1px solid #27272a", color: "#a1a1aa",
          }}>{t}</span>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
/*  MODEL COMPARISON CHART                                                */
/* ════════════════════════════════════════════════════════════════════════ */
function ModelComparison() {
  const [metric, setMetric] = useState<"ap50" | "ap5095" | "ar100" | "f1">("f1");
  const [sortBy, setSortBy] = useState<"metric" | "lr" | "epochs">("metric");

  const metricLabels: Record<string, string> = {
    ap50: "AP @IoU=0.50",
    ap5095: "AP @IoU=[.50:.95]",
    ar100: "AR maxDets=100",
    f1: "F1 score",
  };

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
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Model comparison</h3>
          <p style={{ margin: 0, fontSize: "0.72rem", color: "#52525b" }}>10 Faster R-CNN configurations from Optuna HPO</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {(["f1", "ap50", "ap5095", "ar100"] as const).map((m) => (
          <button key={m} type="button" onClick={() => setMetric(m)} style={{
            padding: "0.3rem 0.65rem", borderRadius: "0.4rem", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer",
            border: metric === m ? `1px solid ${accent1}` : "1px solid #27272a",
            background: metric === m ? `${accent1}18` : "#1c1c28",
            color: metric === m ? accent1 : "#a1a1aa",
          }}>{metricLabels[m]}</button>
        ))}
        <span style={{ margin: "auto 0 auto auto", fontSize: "0.68rem", color: "#3f3f46" }}>Sort:</span>
        {(["metric", "lr", "epochs"] as const).map((s) => (
          <button key={s} type="button" onClick={() => setSortBy(s)} style={{
            padding: "0.25rem 0.5rem", borderRadius: "0.35rem", fontSize: "0.65rem", fontWeight: 600, cursor: "pointer",
            border: "none", background: sortBy === s ? "#27272a" : "transparent",
            color: sortBy === s ? "#e4e4e7" : "#52525b",
          }}>{s}</button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
        {sorted.map((m) => {
          const val = (m as any)[metric] as number;
          const pct = (val / maxVal) * 100;
          return (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ minWidth: 155, fontSize: "0.7rem", color: "#a1a1aa", fontFamily: "ui-monospace, monospace" }}>
                bs={m.batchSize} lr={m.lr.toExponential(1)} ep={m.epochs}
              </div>
              <div style={{ flex: 1, height: 18, background: "#0c0c14", borderRadius: 4, overflow: "hidden", position: "relative" }}>
                <div style={{
                  height: "100%", width: `${pct}%`, borderRadius: 4,
                  background: `linear-gradient(90deg, ${accent1}, ${accent2})`,
                  transition: "width 0.4s ease",
                }} />
              </div>
              <span style={{ minWidth: 52, textAlign: "right", fontSize: "0.75rem", fontWeight: 700, color: "#e4e4e7", fontFamily: "ui-monospace, monospace" }}>
                {val.toFixed(4)}
              </span>
            </div>
          );
        })}
      </div>

      <p style={{ margin: "0.75rem 0 0", fontSize: "0.68rem", color: "#3f3f46" }}>
        All models are Faster R-CNN (ResNet-50 FPN). Metrics from COCO evaluation on the LDPolypVideo test set.
      </p>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
/*  MOCK INFERENCE                                                        */
/* ════════════════════════════════════════════════════════════════════════ */
const MOCK_BOXES = [
  { x: 35, y: 30, w: 22, h: 25, score: 0.94, label: "polyp" },
  { x: 62, y: 55, w: 15, h: 18, score: 0.71, label: "polyp" },
];

function MockInference() {
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
    setPhase("running"); setProgress(0); setStep("Loading model weights\u2026");
    const t0 = Date.now(), total = 2400;
    timerRef.current = setInterval(() => {
      const p = Math.min(100, ((Date.now() - t0) / total) * 100);
      setProgress(p);
      if (p < 25) setStep("Loading model weights\u2026");
      else if (p < 55) setStep("Preprocessing frame\u2026");
      else if (p < 80) setStep("Faster R-CNN forward pass\u2026");
      else setStep("NMS & post-processing\u2026");
      if (Date.now() - t0 >= total) { clear(); setPhase("done"); setStep("Detection complete (browser mock)"); setProgress(100); }
    }, 50);
  }, [clear]);

  const reset = useCallback(() => { clear(); setPhase("idle"); setProgress(0); setStep(""); }, [clear]);
  const showBoxes = phase === "done";
  const visibleBoxes = MOCK_BOXES.filter((b) => b.score >= confidence);

  return (
    <div>
      <p style={{ color: "#a1a1aa", fontSize: "0.82rem", lineHeight: 1.55, margin: "0 0 0.75rem" }}>
        Simulates Faster R-CNN inference on a colonoscopy frame.
        The bounding boxes are a <strong style={{ color: "#e4e4e7" }}>browser mock</strong>, not model output.
      </p>

      <div style={{ position: "relative", borderRadius: "0.5rem", overflow: "hidden", background: "#0c0c12", lineHeight: 0 }}>
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
            background: `linear-gradient(135deg, ${accent1}, ${accent2})`, color: "#fff",
          }}>Run demo inference</button>
        )}
        {phase === "running" && <span style={{ fontSize: "0.82rem", color: "#a1a1aa" }}>{step}</span>}
        {phase === "done" && (
          <>
            <button type="button" onClick={reset} style={{
              padding: "0.4rem 0.85rem", borderRadius: "0.5rem", border: "1px solid #3f3f46",
              fontWeight: 600, fontSize: "0.82rem", cursor: "pointer", background: "#27272a", color: "#e4e4e7",
            }}>Reset</button>
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "#71717a" }}>
              Confidence
              <input type="range" min={0.1} max={1.0} step={0.05} value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))} style={{ width: "80px" }} />
              <span style={{ fontFamily: "ui-monospace, monospace", fontSize: "0.72rem", color: "#a1a1aa" }}>{(confidence * 100).toFixed(0)}%</span>
            </label>
            <span style={{ fontSize: "0.75rem", color: "#52525b" }}>
              {visibleBoxes.length} detection{visibleBoxes.length !== 1 ? "s" : ""}
            </span>
          </>
        )}
      </div>

      {(phase === "running" || phase === "done") && (
        <div style={{ height: 5, background: "#27272a", borderRadius: 3, overflow: "hidden", marginTop: "0.5rem" }}>
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
function CycleGanVisualizer() {
  const [direction, setDirection] = useState<"mask2polyp" | "polyp2mask">("mask2polyp");

  return (
    <div>
      <p style={{ color: "#a1a1aa", fontSize: "0.82rem", lineHeight: 1.55, margin: "0 0 0.75rem" }}>
        CycleGAN learns unpaired <strong style={{ color: "#e4e4e7" }}>mask \u2194 polyp</strong> translation.
        SPADE uses spatially-adaptive normalization for mask \u2192 polyp synthesis.
      </p>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
        {(["mask2polyp", "polyp2mask"] as const).map((d) => (
          <button key={d} type="button" onClick={() => setDirection(d)} style={{
            padding: "0.3rem 0.65rem", borderRadius: "0.4rem", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer",
            border: direction === d ? `1px solid ${accent1}` : "1px solid #27272a",
            background: direction === d ? `${accent1}18` : "#1c1c28",
            color: direction === d ? accent1 : "#a1a1aa",
          }}>{d === "mask2polyp" ? "Mask \u2192 Polyp" : "Polyp \u2192 Mask"}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "0.75rem", alignItems: "center" }}>
        {/* Input */}
        <div style={{ background: "#0c0c14", borderRadius: "0.5rem", overflow: "hidden", border: "1px solid #1e1e2a" }}>
          <svg viewBox="0 0 200 160" style={{ width: "100%", height: "auto", display: "block" }}>
            {direction === "mask2polyp" ? (
              <>
                <rect width="200" height="160" fill="#0a0a0a" />
                <ellipse cx="100" cy="70" rx="45" ry="35" fill="#ffffff" />
                <ellipse cx="145" cy="110" rx="25" ry="20" fill="#ffffff" />
                <text x="100" y="150" textAnchor="middle" fill="#52525b" fontSize="10">Binary mask</text>
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
                <text x="100" y="150" textAnchor="middle" fill="#52525b" fontSize="10">Colonoscopy frame</text>
              </>
            )}
          </svg>
        </div>

        {/* Arrow */}
        <div style={{ color: accent1, fontSize: "1.5rem", fontWeight: 700 }}>{"\u2192"}</div>

        {/* Output */}
        <div style={{ background: "#0c0c14", borderRadius: "0.5rem", overflow: "hidden", border: "1px solid #1e1e2a" }}>
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
                <text x="100" y="150" textAnchor="middle" fill="#52525b" fontSize="10">Generated polyp</text>
              </>
            ) : (
              <>
                <rect width="200" height="160" fill="#0a0a0a" />
                <ellipse cx="100" cy="70" rx="45" ry="35" fill="#ffffff" />
                <text x="100" y="150" textAnchor="middle" fill="#52525b" fontSize="10">Predicted mask</text>
              </>
            )}
          </svg>
        </div>
      </div>

      <p style={{ margin: "0.6rem 0 0", fontSize: "0.68rem", color: "#3f3f46" }}>
        Illustrations are schematic. Real CycleGAN outputs are photorealistic colonoscopy images.
      </p>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
/*  DETECTOR TABLE                                                        */
/* ════════════════════════════════════════════════════════════════════════ */
function DetectorTable() {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #27272a" }}>
            {["Model", "Backbone", "Notes"].map((h) => (
              <th key={h} style={{ padding: "0.5rem 0.75rem", textAlign: "left", color: "#71717a", fontWeight: 600, fontSize: "0.72rem", textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DETECTORS.map((d) => (
            <tr key={d.name} style={{ borderBottom: "1px solid #1e1e2a" }}>
              <td style={{ padding: "0.5rem 0.75rem", fontWeight: 600, color: "#e4e4e7" }}>{d.name}</td>
              <td style={{ padding: "0.5rem 0.75rem", color: "#a1a1aa", fontFamily: "ui-monospace, monospace", fontSize: "0.78rem" }}>{d.backbone}</td>
              <td style={{ padding: "0.5rem 0.75rem", color: "#71717a" }}>{d.note}</td>
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
export default function TfgPolypDemo() {
  return (
    <div style={{ fontFamily: "var(--font-sans, 'Inter', sans-serif)", color: "#e4e4e7" }}>
      {/* Pipeline */}
      <PipelineStrip />

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
              background: `linear-gradient(135deg, rgba(16,185,129,0.15), rgba(14,165,233,0.1))`,
            }}>{"\u{1F52C}"}</div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Simulated inference</h3>
              <p style={{ margin: 0, fontSize: "0.72rem", color: "#52525b" }}>Browser mock &middot; Faster R-CNN</p>
            </div>
          </div>
          <MockInference />
        </div>

        {/* CycleGAN viz */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <div style={{
              width: 30, height: 30, borderRadius: "0.5rem", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: "0.9rem",
              background: `linear-gradient(135deg, rgba(14,165,233,0.15), rgba(16,185,129,0.1))`,
            }}>{"\u{1F3AD}"}</div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>CycleGAN translation</h3>
              <p style={{ margin: 0, fontSize: "0.72rem", color: "#52525b" }}>Unpaired image-to-image</p>
            </div>
          </div>
          <CycleGanVisualizer />
        </div>
      </div>

      {/* Model comparison */}
      <div style={{ marginBottom: "1.25rem" }}>
        <ModelComparison />
      </div>

      {/* Detector table + links */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
        gap: "1.25rem", marginBottom: "1.25rem",
      }}>
        <div style={card}>
          <h4 style={{ margin: "0 0 0.75rem", fontSize: "0.88rem", fontWeight: 700, color: "#d4d4d8" }}>Detection architectures</h4>
          <DetectorTable />
        </div>
        <div style={{ ...card, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.88rem", fontWeight: 700, color: "#d4d4d8" }}>Links</h4>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <a href="https://github.com/cuberhaus/TFG" target="_blank" rel="noopener noreferrer" style={{
                display: "inline-flex", alignItems: "center", gap: "0.35rem",
                padding: "0.4rem 0.85rem", borderRadius: "0.5rem", fontSize: "0.78rem", fontWeight: 600,
                background: `linear-gradient(135deg, ${accent1}, ${accent2})`, color: "#fff", textDecoration: "none",
              }}>GitHub {"\u2197"}</a>
            </div>
            <p style={{ margin: "0.75rem 0 0", fontSize: "0.78rem", color: "#71717a", lineHeight: 1.5 }}>
              The project includes a <strong style={{ color: "#a1a1aa" }}>Streamlit dashboard</strong> for
              interactive model exploration and inference. Clone the repo and run{" "}
              <code style={{ color: "#94a3b8", fontSize: "0.72rem" }}>streamlit run src/app.py</code> from{" "}
              <code style={{ color: "#94a3b8", fontSize: "0.72rem" }}>code/</code>.
            </p>
          </div>
          <div style={{ marginTop: "0.75rem" }}>
            <div style={{ fontSize: "0.68rem", color: "#52525b", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: "0.2rem" }}>Author</div>
            <div style={{ fontSize: "0.85rem", color: "#d4d4d8" }}>Pol Casacuberta &middot; FIB-UPC</div>
          </div>
        </div>
      </div>

      {/* Run locally */}
      <details>
        <summary style={{
          cursor: "pointer", fontSize: "0.82rem", fontWeight: 600, color: "#71717a",
          padding: "0.65rem 1rem", background: "#111119", borderRadius: "0.75rem",
          border: "1px solid #1e1e2a", listStyle: "none",
        }}>
          {"\u25B8"} Run the project locally
        </summary>
        <div style={{ ...card, marginTop: "0.75rem" }}>
          <p style={{ color: "#a1a1aa", fontSize: "0.82rem", lineHeight: 1.6, margin: "0 0 0.75rem" }}>
            The project is <strong style={{ color: "#e4e4e7" }}>Python + PyTorch</strong>.
            A CUDA GPU is recommended for training. The Streamlit dashboard works on CPU.
          </p>
          <pre style={{
            margin: 0, padding: "1rem", background: "#0a0a11", border: "1px solid #1e1e2a",
            borderRadius: "0.5rem", fontSize: "0.78rem", fontFamily: "ui-monospace, monospace",
            color: "#a1a1aa", lineHeight: 1.6, overflowX: "auto",
          }}>{`git clone https://github.com/cuberhaus/TFG.git
cd TFG/code
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Launch the Streamlit dashboard
streamlit run src/app.py

# Or train a model
python src/train_and_save_model.py FasterRCNN \\
  '{"BATCH_SIZE":4,"LR":0.005,"WEIGHT_DECAY":0.0005,"NUM_EPOCHS":10}' \\
  --debug`}</pre>
          <p style={{ fontSize: "0.72rem", color: "#52525b", margin: "0.75rem 0 0" }}>
            Place the LDPolypVideo dataset under <code style={{ color: "#64748b" }}>data/TrainValid/</code> and{" "}
            <code style={{ color: "#64748b" }}>data/Test/</code>.
          </p>
        </div>
      </details>
    </div>
  );
}
