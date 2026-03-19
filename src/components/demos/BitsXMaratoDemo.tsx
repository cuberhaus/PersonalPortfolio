import { useState, useCallback, useEffect, useRef, useId, useMemo } from "react";
/* ── frame data ── */
const FRAME = { w: 472, h: 296, maskPolygon: "2,205 470,185 470,215 2,236" };

const SCREENSHOTS = [
  {
    src: "https://user-images.githubusercontent.com/44567202/208294460-f8bd49dd-c2c4-4dbf-b316-3fedd989bd9b.jpg",
    caption: "3D reconstruction of the abdominal aorta from segmented frames.",
  },
  {
    src: "https://user-images.githubusercontent.com/44567202/208294473-3b2da637-5504-4750-8ea9-06e50e139eaa.jpeg",
    caption: "Segmentation / visualization pipeline output.",
  },
  {
    src: "https://user-images.githubusercontent.com/44567202/208294474-817252af-eeb3-499b-8ffa-e6333b68efe0.jpeg",
    caption: "GUI workflow: load video, run inference, inspect masks and 3D output.",
  },
];

const TEAM = ["Pol Casacuberta", "Tatiana Meyer", "Pablo Vega", "Ton Vilà"];

const PIPELINE = [
  { icon: "🎬", title: "Ultrasound video", desc: "Load study, extract frames" },
  { icon: "🧠", title: "Mask R-CNN", desc: "Instance segmentation per frame" },
  { icon: "🗂️", title: "Mask stack", desc: "Binary TIFFs for 3D recon" },
  { icon: "🧊", title: "3D mesh", desc: "ISO surface with Meshlib / Open3D" },
  { icon: "📏", title: "Diameter", desc: "Contour analysis + heuristics" },
];

/* ── shared styles ── */
const card = {
  background: "#111119",
  border: "1px solid #1e1e2a",
  borderRadius: "1rem",
  padding: "1.5rem",
} as const;

const accent1 = "#be123c"; // rose
const accent2 = "#0ea5e9"; // sky

/* ── diameter zones ── */
function diameterZone(mm: number) {
  if (mm < 30) return { label: "Typical range", color: "#22c55e", detail: "Many adult abdominal aortic diameters fall well below 30 mm." };
  if (mm < 45) return { label: "Follow-up zone", color: "#eab308", detail: "Dilated — periodic imaging often recommended. Real decisions depend on growth rate and morphology." };
  return { label: "High concern", color: "#ef4444", detail: "Large diameter — may warrant specialist review. This is an educational illustration only." };
}

/* ════════════════════════════════════════════════════════════════════════ */
/*  SIMULATED INFERENCE                                                   */
/* ════════════════════════════════════════════════════════════════════════ */
function SimulatedInference() {
  const filterId = `bitsx-soft-${useId().replace(/:/g, "")}`;
  const frameSrc = useMemo(() => {
    const root = (typeof import.meta !== "undefined" && import.meta.env?.BASE_URL
      ? String(import.meta.env.BASE_URL).replace(/\/$/, "") : "") as string;
    return `${root}/demos/bitsx-aorta-frame.jpg`;
  }, []);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [stepLabel, setStepLabel] = useState("");
  const [overlayOpacity, setOverlayOpacity] = useState(0.55);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);
  useEffect(() => () => clearTimer(), [clearTimer]);

  const runInference = useCallback(() => {
    clearTimer();
    setPhase("running"); setProgress(0); setStepLabel("Extracting frame…");
    const t0 = Date.now(), total = 2200;
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - t0;
      const p = Math.min(100, (elapsed / total) * 100);
      setProgress(p);
      if (p < 33) setStepLabel("Extracting frame…");
      else if (p < 66) setStepLabel("Mask R-CNN forward pass…");
      else setStepLabel("Fitting contour & diameter…");
      if (elapsed >= total) {
        clearTimer(); setPhase("done"); setStepLabel("Segmentation ready (browser mock)"); setProgress(100);
      }
    }, 50);
  }, [clearTimer]);

  const reset = useCallback(() => { clearTimer(); setPhase("idle"); setProgress(0); setStepLabel(""); }, [clearTimer]);
  const showSeg = phase === "done";
  const isGray = phase === "idle" || phase === "running";

  return (
    <div>
      <p style={{ color: "#a1a1aa", fontSize: "0.82rem", lineHeight: 1.55, margin: "0 0 0.75rem" }}>
        Mimics the real Mask R-CNN inference on a <strong style={{ color: "#e4e4e7" }}>B-mode frame</strong> from
        the rat aorta dataset. The red overlay is a <strong style={{ color: "#e4e4e7" }}>browser mock</strong>,
        not model output.
      </p>

      <div style={{ position: "relative", borderRadius: "0.5rem", overflow: "hidden", background: "#0c0c12", lineHeight: 0 }}>
        <img src={frameSrc} alt="B-mode ultrasound frame" width={FRAME.w} height={FRAME.h}
          style={{
            width: "100%", height: "auto", display: "block",
            filter: isGray ? "brightness(0.82) contrast(0.92)" : "brightness(1.02) contrast(1.05)",
            transition: "filter 0.45s ease",
          }}
        />
        {showSeg && (
          <svg viewBox={`0 0 ${FRAME.w} ${FRAME.h}`} preserveAspectRatio="xMidYMid meet"
            style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", pointerEvents: "none" }} aria-hidden>
            <defs><filter id={filterId}><feGaussianBlur in="SourceGraphic" stdDeviation="1.5" /></filter></defs>
            <polygon points={FRAME.maskPolygon} fill={`rgba(239, 68, 68, ${overlayOpacity})`}
              stroke="rgba(248, 113, 113, 0.9)" strokeWidth="1.5" strokeLinejoin="round" filter={`url(#${filterId})`} />
          </svg>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center", marginTop: "0.75rem" }}>
        {phase === "idle" && (
          <button type="button" onClick={runInference} style={{
            padding: "0.45rem 1rem", borderRadius: "0.5rem", border: "none", fontWeight: 600,
            fontSize: "0.82rem", cursor: "pointer",
            background: `linear-gradient(135deg, ${accent1}, ${accent2})`, color: "#fff",
          }}>Run demo inference</button>
        )}
        {phase === "running" && <span style={{ fontSize: "0.82rem", color: "#a1a1aa" }}>{stepLabel}</span>}
        {phase === "done" && (
          <>
            <button type="button" onClick={reset} style={{
              padding: "0.4rem 0.85rem", borderRadius: "0.5rem", border: "1px solid #3f3f46",
              fontWeight: 600, fontSize: "0.82rem", cursor: "pointer", background: "#27272a", color: "#e4e4e7",
            }}>Reset</button>
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "#71717a" }}>
              Opacity
              <input type="range" min={0.15} max={0.85} step={0.05} value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(Number(e.target.value))} style={{ width: "80px" }} />
            </label>
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
/*  DIAMETER EXPLORER                                                     */
/* ════════════════════════════════════════════════════════════════════════ */
function DiameterExplorer() {
  const [mm, setMm] = useState(28);
  const zone = diameterZone(mm);

  return (
    <div>
      <p style={{ color: "#a1a1aa", fontSize: "0.82rem", lineHeight: 1.55, margin: "0 0 0.75rem" }}>
        The app estimates aortic diameter from segmented contours. Drag to see how a measurement
        maps to <strong style={{ color: "#e4e4e7" }}>educational</strong> risk buckets — not for diagnosis.
      </p>

      <div style={{ marginBottom: "0.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#d4d4d8" }}>Max outer diameter</span>
          <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "#f4f4f5", fontFamily: "ui-monospace, monospace" }}>{mm} mm</span>
        </div>
        <input type="range" min={18} max={65} value={mm}
          onChange={(e) => setMm(Number(e.target.value))}
          style={{ width: "100%", accentColor: zone.color }}
        />
      </div>

      {/* risk strip */}
      <div style={{
        height: 10, borderRadius: 5, marginBottom: "0.75rem", position: "relative",
        background: "linear-gradient(90deg, #22c55e 0%, #22c55e 35%, #eab308 35%, #eab308 65%, #ef4444 65%, #ef4444 100%)",
      }}>
        <div style={{
          position: "absolute", top: -3, left: `${((mm - 18) / (65 - 18)) * 100}%`,
          transform: "translateX(-50%)", width: 4, height: 16, background: "#fff",
          borderRadius: 2, boxShadow: "0 0 0 2px #18181b",
        }} />
      </div>

      <div style={{
        padding: "0.75rem 1rem", borderRadius: "0.5rem",
        border: `1px solid ${zone.color}44`, background: `${zone.color}10`,
      }}>
        <div style={{ fontWeight: 600, color: zone.color, marginBottom: "0.25rem", fontSize: "0.88rem" }}>{zone.label}</div>
        <p style={{ margin: 0, fontSize: "0.8rem", color: "#d4d4d8", lineHeight: 1.5 }}>{zone.detail}</p>
      </div>

      <p style={{ margin: "0.5rem 0 0", fontSize: "0.68rem", color: "#3f3f46" }}>
        Illustration only. AAA management follows local guidelines and imaging context.
      </p>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
/*  MAIN EXPORT                                                           */
/* ════════════════════════════════════════════════════════════════════════ */
export default function BitsXMaratoDemo() {
  return (
    <div style={{ fontFamily: "var(--font-sans, 'Inter', sans-serif)", color: "#e4e4e7" }}>

      {/* ── PIPELINE STRIP ── */}
      <div style={{
        ...card, marginBottom: "1.25rem",
        background: "linear-gradient(135deg, #111119 0%, #0f0f1a 100%)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          <div style={{
            padding: "0.2rem 0.55rem", borderRadius: "0.35rem", fontSize: "0.65rem", fontWeight: 700,
            letterSpacing: "0.06em", textTransform: "uppercase" as const,
            background: `linear-gradient(135deg, ${accent1}, ${accent2})`, color: "#fff",
          }}>CV Pipeline</div>
          <span style={{ fontSize: "0.82rem", color: "#71717a" }}>BitsXLaMarató hackathon · TV3 La Marató</span>
        </div>

        <div style={{ display: "flex", gap: "0.35rem", overflowX: "auto", paddingBottom: "0.25rem" }}>
          {PIPELINE.map((step, i) => (
            <div key={i} style={{
              flex: "1 0 auto", minWidth: 85, padding: "0.6rem 0.7rem",
              background: "#0c0c14", borderRadius: "0.5rem", border: "1px solid #1e1e2a", textAlign: "center",
            }}>
              <div style={{ fontSize: "1.1rem", marginBottom: "0.2rem" }}>{step.icon}</div>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#e4e4e7" }}>{step.title}</div>
              <div style={{ fontSize: "0.62rem", color: "#52525b", marginTop: "0.1rem" }}>{step.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.85rem" }}>
          {["Mask R-CNN (PyTorch)", "OpenCV", "Meshlib / Open3D", "Tkinter GUI", "Custom annotations", "CUDA inference"].map((t) => (
            <span key={t} style={{
              padding: "0.2rem 0.5rem", borderRadius: "1rem", fontSize: "0.65rem", fontWeight: 600,
              background: "#1c1c28", border: "1px solid #27272a", color: "#a1a1aa",
            }}>{t}</span>
          ))}
        </div>
      </div>

      {/* ── DUAL INTERACTIVE SECTION ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
        gap: "1.25rem", marginBottom: "1.25rem",
      }}>
        {/* Simulated Inference */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <div style={{
              width: 30, height: 30, borderRadius: "0.5rem", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: "0.9rem",
              background: `linear-gradient(135deg, rgba(190,18,60,0.15), rgba(14,165,233,0.1))`,
            }}>🔬</div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Simulated inference</h3>
              <p style={{ margin: 0, fontSize: "0.72rem", color: "#52525b" }}>Browser mock · real B-mode frame</p>
            </div>
          </div>
          <SimulatedInference />
        </div>

        {/* Diameter Explorer */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <div style={{
              width: 30, height: 30, borderRadius: "0.5rem", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: "0.9rem",
              background: `linear-gradient(135deg, rgba(14,165,233,0.15), rgba(190,18,60,0.1))`,
            }}>📏</div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Diameter explorer</h3>
              <p style={{ margin: 0, fontSize: "0.72rem", color: "#52525b" }}>Educational risk visualization</p>
            </div>
          </div>
          <DiameterExplorer />
        </div>
      </div>

      {/* ── SCREENSHOTS ── */}
      <div style={{ ...card, marginBottom: "1.25rem" }}>
        <h4 style={{ margin: "0 0 1rem", fontSize: "0.88rem", fontWeight: 700, color: "#d4d4d8" }}>
          Project screenshots
        </h4>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
          gap: "0.75rem",
        }}>
          {SCREENSHOTS.map((img, i) => (
            <figure key={i} style={{ margin: 0 }}>
              <img src={img.src} alt={img.caption}
                style={{ width: "100%", borderRadius: "0.5rem", display: "block", background: "#0c0c12" }}
              />
              <figcaption style={{ marginTop: "0.5rem", fontSize: "0.72rem", color: "#71717a", lineHeight: 1.4 }}>
                {img.caption}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      {/* ── TEAM + LINKS ── */}
      <div style={{
        ...card, marginBottom: "1.25rem",
        display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontSize: "0.68rem", color: "#52525b", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: "0.2rem" }}>Team</div>
          <div style={{ fontSize: "0.85rem", color: "#d4d4d8" }}>{TEAM.join(" · ")}</div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <a href="https://github.com/cuberhaus/bitsXlaMarato" target="_blank" rel="noopener noreferrer" style={{
            display: "inline-flex", alignItems: "center", gap: "0.35rem",
            padding: "0.4rem 0.85rem", borderRadius: "0.5rem", fontSize: "0.78rem", fontWeight: 600,
            background: `linear-gradient(135deg, ${accent1}, ${accent2})`, color: "#fff", textDecoration: "none",
          }}>GitHub ↗</a>
          <a href="https://devpost.com/software/aneurism-detection-with-markrcnn" target="_blank" rel="noopener noreferrer" style={{
            display: "inline-flex", alignItems: "center", gap: "0.35rem",
            padding: "0.4rem 0.85rem", borderRadius: "0.5rem", fontSize: "0.78rem", fontWeight: 600,
            background: "#1c1c26", border: "1px solid #27272a", color: "#a1a1aa", textDecoration: "none",
          }}>Devpost ↗</a>
        </div>
      </div>

      {/* ── RUN LOCALLY ── */}
      <details>
        <summary style={{
          cursor: "pointer", fontSize: "0.82rem", fontWeight: 600, color: "#71717a",
          padding: "0.65rem 1rem", background: "#111119", borderRadius: "0.75rem",
          border: "1px solid #1e1e2a", listStyle: "none",
        }}>
          ▸ Run the original project locally
        </summary>
        <div style={{ ...card, marginTop: "0.75rem" }}>
          <p style={{ color: "#a1a1aa", fontSize: "0.82rem", lineHeight: 1.6, margin: "0 0 0.75rem" }}>
            The app is a <strong style={{ color: "#e4e4e7" }}>Python + Tkinter</strong> GUI
            (<code style={{ color: "#94a3b8" }}>src/ImageViewer.py</code>). You need a CUDA-capable setup for
            Mask R-CNN inference (PyTorch 1.13 stack).
          </p>
          <pre style={{
            margin: 0, padding: "1rem", background: "#0a0a11", border: "1px solid #1e1e2a",
            borderRadius: "0.5rem", fontSize: "0.78rem", fontFamily: "ui-monospace, monospace",
            color: "#a1a1aa", lineHeight: 1.6, overflowX: "auto",
          }}>{`git clone https://github.com/cuberhaus/bitsXlaMarato.git
cd bitsXlaMarato
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cd src && python ImageViewer.py`}</pre>
          <p style={{ fontSize: "0.72rem", color: "#52525b", margin: "0.75rem 0 0" }}>
            Place trained weights under <code style={{ color: "#64748b" }}>models/</code> (e.g. <code style={{ color: "#64748b" }}>marato.pt</code>).
          </p>
        </div>
      </details>
    </div>
  );
}
