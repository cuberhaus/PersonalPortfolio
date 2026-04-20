import { useState, useCallback, useEffect, useRef, useId, useMemo } from "react";
import LiveAppEmbed from "./LiveAppEmbed";

/* ── frame data ── */
const FRAME = { w: 472, h: 296, maskPolygon: "2,205 470,185 470,215 2,236" };

const TEAM = ["Pol Casacuberta", "Tatiana Meyer", "Pablo Vega", "Ton Vilà"];

import { TRANSLATIONS, type DemoTranslations } from "../../i18n/demos/bits-xmarato-demo";

type Lang = "en" | "es" | "ca";

/* ── shared styles ── */
const card = {
  background: "var(--bg-card)",
  border: "1px solid var(--border-color)",
  borderRadius: "1rem",
  padding: "1.5rem",
} as const;

const accent1 = "#be123c"; // rose
const accent2 = "#0ea5e9"; // sky

/* ── diameter zones ── */
import { diameterZone as _diameterZone } from "../../lib/bitsx-diameter";
function diameterZone(mm: number, t: typeof TRANSLATIONS.en) {
  return _diameterZone(mm, t.diameterZones);
}

/* ════════════════════════════════════════════════════════════════════════ */
/*  SIMULATED INFERENCE                                                   */
/* ════════════════════════════════════════════════════════════════════════ */
function SimulatedInference({ t }: { t: typeof TRANSLATIONS.en }) {
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
    setPhase("running"); setProgress(0); setStepLabel(t.extracting);
    const t0 = Date.now(), total = 2200;
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - t0;
      const p = Math.min(100, (elapsed / total) * 100);
      setProgress(p);
      if (p < 33) setStepLabel(t.extracting);
      else if (p < 66) setStepLabel(t.forwardPass);
      else setStepLabel(t.fitting);
      if (elapsed >= total) {
        clearTimer(); setPhase("done"); setStepLabel(t.ready); setProgress(100);
      }
    }, 50);
  }, [clearTimer, t]);

  const reset = useCallback(() => { clearTimer(); setPhase("idle"); setProgress(0); setStepLabel(""); }, [clearTimer]);
  const showSeg = phase === "done";
  const isGray = phase === "idle" || phase === "running";

  return (
    <div>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", lineHeight: 1.55, margin: "0 0 0.75rem" }}>
        {t.simDesc1}<strong style={{ color: "var(--text-primary)" }}>{t.simDesc2}</strong>
        {t.simDesc3}<strong style={{ color: "var(--text-primary)" }}>{t.simDesc4}</strong>
        {t.simDesc5}
      </p>

      <div style={{ position: "relative", borderRadius: "0.5rem", overflow: "hidden", background: "var(--bg-secondary)", lineHeight: 0 }}>
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
            background: `linear-gradient(135deg, ${accent1}, ${accent2})`, color: "var(--text-primary)",
          }}>{t.runDemo}</button>
        )}
        {phase === "running" && <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{stepLabel}</span>}
        {phase === "done" && (
          <>
            <button type="button" onClick={reset} style={{
              padding: "0.4rem 0.85rem", borderRadius: "0.5rem", border: "1px solid var(--border-color-hover)",
              fontWeight: 600, fontSize: "0.82rem", cursor: "pointer", background: "var(--border-color)", color: "var(--text-primary)",
            }}>{t.reset}</button>
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
              {t.opacity}
              <input type="range" min={0.15} max={0.85} step={0.05} value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(Number(e.target.value))} style={{ width: "80px" }} />
            </label>
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
/*  DIAMETER EXPLORER                                                     */
/* ════════════════════════════════════════════════════════════════════════ */
function DiameterExplorer({ t }: { t: typeof TRANSLATIONS.en }) {
  const [mm, setMm] = useState(28);
  const zone = diameterZone(mm, t);

  return (
    <div>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", lineHeight: 1.55, margin: "0 0 0.75rem" }}>
        {t.diamDesc1}<strong style={{ color: "var(--text-primary)" }}>{t.diamDesc2}</strong>{t.diamDesc3}
      </p>

      <div style={{ marginBottom: "0.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)" }}>{t.maxOuter}</span>
          <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", fontFamily: "ui-monospace, monospace" }}>{mm} mm</span>
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
          borderRadius: 2, boxShadow: "0 0 0 2px var(--bg-card)",
        }} />
      </div>

      <div style={{
        padding: "0.75rem 1rem", borderRadius: "0.5rem",
        border: `1px solid ${zone.color}44`, background: `${zone.color}10`,
      }}>
        <div style={{ fontWeight: 600, color: zone.color, marginBottom: "0.25rem", fontSize: "0.88rem" }}>{zone.label}</div>
        <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-primary)", lineHeight: 1.5 }}>{zone.detail}</p>
      </div>

      <p style={{ margin: "0.5rem 0 0", fontSize: "0.68rem", color: "var(--border-color-hover)" }}>
        {t.diamNote}
      </p>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
/*  MAIN EXPORT                                                           */
/* ════════════════════════════════════════════════════════════════════════ */
export default function BitsXMaratoDemo({ lang = "en" }: { lang?: Lang }) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  return (
    <div style={{ fontFamily: "var(--font-sans, 'Inter', sans-serif)", color: "var(--text-primary)" }}>
      <LiveAppEmbed
        url="http://localhost:8001"
        title="Aorta Viewer — bitsXlaMarato"
        dockerCmd="cd bitsXlaMarato && docker compose up"
        devCmd="cd bitsXlaMarato && make dev"
        lang={lang}
      />

      {/* ── PIPELINE STRIP ── */}
      <div style={{
        ...card, marginBottom: "1.25rem",
        background: "var(--bg-card)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          <div style={{
            padding: "0.2rem 0.55rem", borderRadius: "0.35rem", fontSize: "0.65rem", fontWeight: 700,
            letterSpacing: "0.06em", textTransform: "uppercase" as const,
            background: `linear-gradient(135deg, ${accent1}, ${accent2})`, color: "var(--text-primary)",
          }}>{t.cvPipeline}</div>
          <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>{t.hackathon}</span>
        </div>

        <div style={{ display: "flex", gap: "0.35rem", overflowX: "auto", paddingBottom: "0.25rem" }}>
          {t.pipeline.map((step, i) => (
            <div key={i} style={{
              flex: "1 0 auto", minWidth: 85, padding: "0.6rem 0.7rem",
              background: "var(--bg-secondary)", borderRadius: "0.5rem", border: "1px solid var(--border-color)", textAlign: "center",
            }}>
              <div style={{ fontSize: "1.1rem", marginBottom: "0.2rem" }}>{step.icon}</div>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-primary)" }}>{step.title}</div>
              <div style={{ fontSize: "0.62rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>{step.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.85rem" }}>
          {["Mask R-CNN (PyTorch)", "OpenCV", "Meshlib / Open3D", "Tkinter GUI", "Custom annotations", "CUDA inference"].map((tag) => (
            <span key={tag} style={{
              padding: "0.2rem 0.5rem", borderRadius: "1rem", fontSize: "0.65rem", fontWeight: 600,
              background: "var(--bg-card-hover)", border: "1px solid var(--border-color)", color: "var(--text-secondary)",
            }}>{tag}</span>
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
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>{t.simInference}</h3>
              <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-muted)" }}>{t.simSub}</p>
            </div>
          </div>
          <SimulatedInference t={t} />
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
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>{t.diameterExplorer}</h3>
              <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-muted)" }}>{t.diamSub}</p>
            </div>
          </div>
          <DiameterExplorer t={t} />
        </div>
      </div>

      {/* ── SCREENSHOTS ── */}
      <div style={{ ...card, marginBottom: "1.25rem" }}>
        <h4 style={{ margin: "0 0 1rem", fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>
          {t.projScreenshots}
        </h4>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
          gap: "0.75rem",
        }}>
          {t.screenshots.map((img, i) => (
            <figure key={i} style={{ margin: 0 }}>
              <img src={img.src} alt={img.caption}
                style={{ width: "100%", borderRadius: "0.5rem", display: "block", background: "var(--bg-secondary)" }}
              />
              <figcaption style={{ marginTop: "0.5rem", fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
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
          <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: "0.2rem" }}>{t.team}</div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>{TEAM.join(" · ")}</div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <a href="https://devpost.com/software/aneurism-detection-with-markrcnn" target="_blank" rel="noopener noreferrer" style={{
            display: "inline-flex", alignItems: "center", gap: "0.35rem",
            padding: "0.4rem 0.85rem", borderRadius: "0.5rem", fontSize: "0.78rem", fontWeight: 600,
            background: "var(--bg-card-hover)", border: "1px solid var(--border-color)", color: "var(--text-secondary)", textDecoration: "none",
          }}>Devpost ↗</a>
        </div>
      </div>

    </div>
  );
}
