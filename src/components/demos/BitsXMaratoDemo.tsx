import { useState, useCallback, useEffect, useRef, useId, useMemo } from "react";

type Tab = "overview" | "pipeline" | "gallery" | "interactive" | "run";

/** Real frame 472×296; lumen is a sloped dark band (walls rise toward the right). Quad inset ~2–4px from bright walls. */
const FRAME = {
  w: 472,
  h: 296,
  maskPolygon: "2,205 470,185 470,215 2,236",
};

const SCREENSHOTS = [
  {
    src: "https://user-images.githubusercontent.com/44567202/208294460-f8bd49dd-c2c4-4dbf-b316-3fedd989bd9b.jpg",
    caption: "3D reconstruction of the abdominal aorta from segmented frames.",
  },
  {
    src: "https://user-images.githubusercontent.com/44567202/208294473-3b2da637-5504-4750-8ea9-06e50e139eaa.jpeg",
    caption: "Project screenshot: segmentation / visualization (may differ from raw B-mode).",
  },
  {
    src: "https://user-images.githubusercontent.com/44567202/208294474-817252af-eeb3-499b-8ffa-e6333b68efe0.jpeg",
    caption: "GUI workflow: load video, run inference, inspect masks and 3D output.",
  },
];

const TEAM = ["Pol Casacuberta", "Tatiana Meyer", "Pablo Vega", "Ton Vilà"];

/** Simplified education buckets only — not clinical guidance. */
function diameterZone(mm: number): { label: string; color: string; detail: string } {
  if (mm < 30) {
    return {
      label: "Typical range (illustration)",
      color: "#22c55e",
      detail: "Many adult abdominal aortic diameters fall well below 30 mm. Screening protocols depend on age, sex, and risk factors.",
    };
  }
  if (mm < 45) {
    return {
      label: "Follow-up zone (illustration)",
      color: "#eab308",
      detail: "Dilatation often leads to periodic imaging. Real decisions use growth rate, morphology, and guidelines — not a single number.",
    };
  }
  return {
    label: "High concern (illustration)",
    color: "#ef4444",
    detail: "Large diameters may warrant specialist review. This demo only shows how a numeric cut-off could be visualized.",
  };
}

const s = {
  wrapper: { fontFamily: "var(--font-sans, 'Inter', sans-serif)", color: "#e4e4e7", minHeight: "480px" },
  tabs: {
    display: "flex" as const,
    gap: "0.25rem",
    padding: "0.75rem 1rem",
    background: "#16161f",
    borderRadius: "0.75rem",
    marginBottom: "1.5rem",
    flexWrap: "wrap" as const,
    justifyContent: "center" as const,
  },
  tab: {
    padding: "0.5rem 1rem",
    borderRadius: "0.5rem",
    border: "none",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s",
    background: "transparent",
    color: "#71717a",
  },
  tabActive: { background: "linear-gradient(135deg, #be123c, #0ea5e9)", color: "#fff" },
  card: { background: "#16161f", border: "1px solid #27272a", borderRadius: "0.75rem", padding: "1.5rem" },
  code: {
    background: "#12121a",
    border: "1px solid #27272a",
    borderRadius: "0.5rem",
    padding: "1rem",
    fontSize: "0.8rem",
    fontFamily: "ui-monospace, monospace",
    color: "#a1a1aa",
    overflowX: "auto" as const,
    lineHeight: 1.5,
  },
  link: { color: "#38bdf8", textDecoration: "none" },
} as const;

function SimulatedInferenceDemo() {
  const filterId = `bitsx-soft-${useId().replace(/:/g, "")}`;
  const frameSrc = useMemo(() => {
    const root = (typeof import.meta !== "undefined" && import.meta.env?.BASE_URL
      ? String(import.meta.env.BASE_URL).replace(/\/$/, "")
      : "") as string;
    return `${root}/demos/bitsx-aorta-frame.jpg`;
  }, []);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [stepLabel, setStepLabel] = useState("");
  const [overlayOpacity, setOverlayOpacity] = useState(0.55);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const runInference = useCallback(() => {
    clearTimer();
    setPhase("running");
    setProgress(0);
    setStepLabel("Extracting frame…");
    const t0 = Date.now();
    const total = 2200;
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - t0;
      const p = Math.min(100, (elapsed / total) * 100);
      setProgress(p);
      if (p < 33) setStepLabel("Extracting frame…");
      else if (p < 66) setStepLabel("Mask R-CNN forward pass…");
      else setStepLabel("Fitting contour & diameter…");
      if (elapsed >= total) {
        clearTimer();
        setPhase("done");
        setStepLabel("Segmentation ready (browser mock)");
        setProgress(100);
      }
    }, 50);
  }, [clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    setPhase("idle");
    setProgress(0);
    setStepLabel("");
  }, [clearTimer]);

  const showSegmentation = phase === "done";
  const isGrayscale = phase === "idle" || phase === "running";

  return (
    <div style={{ ...s.card, marginBottom: "1rem" }}>
      <h3 style={{ marginTop: 0, marginBottom: "0.5rem" }}>Simulated inference — one 2D frame</h3>
      <p style={{ color: "#a1a1aa", fontSize: "0.88rem", lineHeight: 1.55, marginBottom: "0.75rem" }}>
        <strong style={{ color: "#e4e4e7" }}>What this mimics:</strong> the step where the real app runs Mask R-CNN on{" "}
        <strong style={{ color: "#e4e4e7" }}>individual B-mode frames</strong> from the ultrasound video (flat 2D
        slices). The <strong style={{ color: "#e4e4e7" }}>3D aorta model</strong> in the gallery comes{" "}
        <em>after</em> stacking many such masks — that step is not shown here.
      </p>
      <p style={{ color: "#71717a", fontSize: "0.8rem", lineHeight: 1.5, marginBottom: "1rem" }}>
        Below: a <strong style={{ color: "#a1a1aa" }}>real B-mode frame</strong> from the rat aorta dataset (
        <code style={{ color: "#64748b" }}>541_S1_40</code>, longitudinal view — dark horizontal band is the vessel
        lumen). The red overlay is still a <strong style={{ color: "#a1a1aa" }}>browser mock</strong>, not model
        output.
      </p>

      <div
        style={{
          position: "relative",
          borderRadius: "0.5rem",
          overflow: "hidden",
          background: "#0c0c12",
          maxWidth: "480px",
          margin: "0 auto 1rem",
          lineHeight: 0,
        }}
      >
        <img
          src={frameSrc}
          alt="Rat aorta ultrasound B-mode frame from the project dataset"
          width={FRAME.w}
          height={FRAME.h}
          style={{
            width: "100%",
            height: "auto",
            display: "block",
            filter: isGrayscale ? "brightness(0.82) contrast(0.92)" : "brightness(1.02) contrast(1.05)",
            transition: "filter 0.45s ease",
          }}
        />
        {showSegmentation && (
          <svg
            viewBox={`0 0 ${FRAME.w} ${FRAME.h}`}
            preserveAspectRatio="xMidYMid meet"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
            }}
            aria-hidden
          >
            <defs>
              <filter id={filterId}>
                <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" />
              </filter>
            </defs>
            <polygon
              points={FRAME.maskPolygon}
              fill={`rgba(239, 68, 68, ${overlayOpacity})`}
              stroke="rgba(248, 113, 113, 0.9)"
              strokeWidth="1.5"
              strokeLinejoin="round"
              filter={`url(#${filterId})`}
            />
          </svg>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "0.75rem", alignItems: "center", marginBottom: "0.75rem" }}>
        {phase === "idle" && (
          <button
            type="button"
            onClick={runInference}
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: "0.5rem",
              border: "none",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer",
              background: "linear-gradient(135deg, #be123c, #0ea5e9)",
              color: "#fff",
            }}
          >
            Run demo inference
          </button>
        )}
        {phase === "running" && (
          <span style={{ fontSize: "0.85rem", color: "#a1a1aa" }}>{stepLabel}</span>
        )}
        {phase === "done" && (
          <>
            <button
              type="button"
              onClick={reset}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.5rem",
                border: "1px solid #3f3f46",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer",
                background: "#27272a",
                color: "#e4e4e7",
              }}
            >
              Reset
            </button>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", color: "#a1a1aa" }}>
              Mask opacity
              <input
                type="range"
                min={0.15}
                max={0.85}
                step={0.05}
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                style={{ width: "120px" }}
              />
            </label>
          </>
        )}
      </div>

      {(phase === "running" || phase === "done") && (
        <div style={{ height: "6px", background: "#27272a", borderRadius: "3px", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "linear-gradient(90deg, #be123c, #0ea5e9)",
              transition: phase === "running" ? "width 0.05s linear" : "width 0.3s ease",
            }}
          />
        </div>
      )}
    </div>
  );
}

function DiameterExplorerDemo() {
  const [mm, setMm] = useState(28);
  const zone = diameterZone(mm);

  return (
    <div style={s.card}>
      <h3 style={{ marginTop: 0, marginBottom: "0.5rem" }}>Diameter explorer (education)</h3>
      <p style={{ color: "#a1a1aa", fontSize: "0.85rem", lineHeight: 1.55, marginBottom: "1rem" }}>
        The desktop app estimates aortic diameter from segmented contours. Drag the slider to see how a single
        measurement might be bucketed in a <strong style={{ color: "#e4e4e7" }}>toy</strong> risk strip — not for
        diagnosis.
      </p>

      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", fontSize: "0.8rem", color: "#71717a", marginBottom: "0.35rem" }}>
          Max outer diameter (mm)
        </label>
        <input
          type="range"
          min={18}
          max={65}
          value={mm}
          onChange={(e) => setMm(Number(e.target.value))}
          style={{ width: "100%", maxWidth: "360px" }}
        />
        <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#f4f4f5", marginTop: "0.5rem" }}>
          {mm} mm
        </div>
      </div>

      <div
        style={{
          height: "12px",
          borderRadius: "6px",
          background: "linear-gradient(90deg, #22c55e 0%, #22c55e 35%, #eab308 35%, #eab308 65%, #ef4444 65%, #ef4444 100%)",
          marginBottom: "0.75rem",
          position: "relative",
          maxWidth: "400px",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -4,
            left: `${((mm - 18) / (65 - 18)) * 100}%`,
            transform: "translateX(-50%)",
            width: "4px",
            height: "20px",
            background: "#fff",
            borderRadius: "2px",
            boxShadow: "0 0 0 2px #18181b",
          }}
        />
      </div>

      <div
        style={{
          padding: "0.75rem 1rem",
          borderRadius: "0.5rem",
          border: `1px solid ${zone.color}55`,
          background: `${zone.color}14`,
        }}
      >
        <div style={{ fontWeight: 600, color: zone.color, marginBottom: "0.35rem" }}>{zone.label}</div>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "#d4d4d8", lineHeight: 1.5 }}>{zone.detail}</p>
      </div>

      <p style={{ margin: "1rem 0 0", fontSize: "0.75rem", color: "#52525b" }}>
        Illustration only. AAA management follows local guidelines and imaging context.
      </p>
    </div>
  );
}

export default function BitsXMaratoDemo() {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div style={s.wrapper}>
      <div style={s.tabs}>
        {(
          [
            ["overview", "Overview"],
            ["pipeline", "Pipeline"],
            ["gallery", "Screenshots"],
            ["interactive", "Interactive"],
            ["run", "Run locally"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            style={{ ...s.tab, ...(tab === id ? s.tabActive : {}) }}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div style={s.card}>
          <h3 style={{ marginTop: 0, marginBottom: "0.75rem" }}>AAA screening from ultrasound</h3>
          <p style={{ color: "#a1a1aa", lineHeight: 1.65, marginBottom: "1rem" }}>
            This hackathon project turns an abdominal ultrasound video into frames, segments the abdominal aorta with a
            fine-tuned <strong style={{ color: "#e4e4e7" }}>Mask R-CNN</strong>, builds a rough{" "}
            <strong style={{ color: "#e4e4e7" }}>3D model</strong>, and estimates{" "}
            <strong style={{ color: "#e4e4e7" }}>aortic diameter</strong> to help flag possible abdominal aortic
            aneurysm (AAA). A desktop GUI ties inference, mask export, video replay, and 3D viewing together.
          </p>
          <ul style={{ color: "#a1a1aa", lineHeight: 1.8, margin: 0, paddingLeft: "1.25rem" }}>
            <li>Custom annotations on patient frames → trained PyTorch model (<code>models/*.pt</code>)</li>
            <li>OpenCV pipeline: video → frames → segmented frames + mask TIFFs → annotated video</li>
            <li>Meshlib / Open3D for 3D surface from mask stack; diameter heuristics on contours</li>
          </ul>
          <p style={{ marginTop: "1.25rem", marginBottom: 0, fontSize: "0.85rem", color: "#71717a" }}>
            Built for <strong style={{ color: "#94a3b8" }}>BitsXLaMarató</strong> (TV3 La Marató hackathon). Not a
            medical device — research / education demo.
          </p>
        </div>
      )}

      {tab === "pipeline" && (
        <div style={s.card}>
          <h3 style={{ marginTop: 0, marginBottom: "1rem" }}>End-to-end flow</h3>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.75rem", fontSize: "0.9rem" }}>
            {[
              { step: "1", title: "Ultrasound video", body: "Load a study; frames are extracted with OpenCV." },
              { step: "2", title: "Instance segmentation", body: "Mask R-CNN (Torchvision) predicts aorta masks per frame." },
              { step: "3", title: "Mask volume", body: "Binary masks (TIFF stack) feed 3D reconstruction." },
              { step: "4", title: "3D + metrics", body: "ISO surface (mesh) for visualization; contour analysis for diameter estimate." },
              { step: "5", title: "Output", body: "Overlay video, STL/mesh, and GUI exploration for clinicians/researchers." },
            ].map(({ step, title, body }) => (
              <div
                key={step}
                style={{
                  display: "flex",
                  gap: "1rem",
                  alignItems: "flex-start",
                  padding: "0.75rem 1rem",
                  background: "#12121a",
                  borderRadius: "0.5rem",
                  border: "1px solid #27272a",
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    width: "1.75rem",
                    height: "1.75rem",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #be123c, #0ea5e9)",
                    color: "#fff",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {step}
                </span>
                <div>
                  <div style={{ fontWeight: 600, color: "#e4e4e7", marginBottom: "0.25rem" }}>{title}</div>
                  <div style={{ color: "#a1a1aa", lineHeight: 1.5 }}>{body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "gallery" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
            {SCREENSHOTS.map((img, i) => (
              <figure key={i} style={{ ...s.card, margin: 0, padding: "0.75rem" }}>
                <img
                  src={img.src}
                  alt={img.caption}
                  style={{ width: "100%", borderRadius: "0.5rem", display: "block", background: "#0c0c12" }}
                />
                <figcaption style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "#a1a1aa", lineHeight: 1.45 }}>
                  {img.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}

      {tab === "interactive" && (
        <div>
          <SimulatedInferenceDemo />
          <DiameterExplorerDemo />
        </div>
      )}

      {tab === "run" && (
        <div style={s.card}>
          <h3 style={{ marginTop: 0, marginBottom: "0.75rem" }}>Run the original project</h3>
          <p style={{ color: "#a1a1aa", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: "1rem" }}>
            The app is a <strong style={{ color: "#e4e4e7" }}>Python + Tkinter</strong> GUI (
            <code style={{ color: "#94a3b8" }}>src/ImageViewer.py</code>). You need a CUDA-capable setup for
            reasonable Mask R-CNN inference (PyTorch 1.13 stack in <code>requirements.txt</code>).
          </p>
          <pre style={s.code}>{`git clone https://github.com/cuberhaus/bitsXlaMarato.git
cd bitsXlaMarato
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
cd src && python ImageViewer.py`}</pre>
          <p style={{ fontSize: "0.8rem", color: "#71717a", marginTop: "1rem", marginBottom: 0 }}>
            Place trained weights under <code style={{ color: "#64748b" }}>models/</code> (e.g.{" "}
            <code style={{ color: "#64748b" }}>marato.pt</code>). Paths in the repo may need adjusting for your machine
            (legacy absolute paths in some scripts).
          </p>
        </div>
      )}

      <div
        style={{
          marginTop: "1.5rem",
          ...s.card,
          display: "flex",
          flexWrap: "wrap" as const,
          gap: "1rem",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ fontSize: "0.75rem", color: "#71717a", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Team
          </div>
          <div style={{ fontSize: "0.9rem", color: "#d4d4d8", marginTop: "0.25rem" }}>{TEAM.join(" · ")}</div>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" as const }}>
          <a href="https://github.com/cuberhaus/bitsXlaMarato" target="_blank" rel="noopener noreferrer" style={s.link}>
            GitHub
          </a>
          <span style={{ color: "#3f3f46" }}>|</span>
          <a
            href="https://devpost.com/software/aneurism-detection-with-markrcnn"
            target="_blank"
            rel="noopener noreferrer"
            style={s.link}
          >
            Devpost
          </a>
        </div>
      </div>
    </div>
  );
}
