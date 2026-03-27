import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import modelData from "../../data/tfg-model-results.json";

/* ── constants ── */
const accent1 = "#10b981"; // emerald
const accent2 = "#0ea5e9"; // sky

const card = {
  background: "var(--bg-card)",
  border: "1px solid var(--border-color)",
  borderRadius: "1rem",
  padding: "1.5rem",
} as const;

type Lang = "en" | "es" | "ca";

const TRANSLATIONS = {
  en: {
    pipelineTitle: "End-to-End Pipeline",
    thesis: "Bachelor's Thesis \u00b7 FIB-UPC",
    pipelineSteps: [
      { icon: "\u{1F4CB}", title: "LDPolypVideo", desc: "Colonoscopy frames + bbox annotations" },
      { icon: "\u{1F3AD}", title: "CycleGAN / SPADE", desc: "Mask \u2192 synthetic polyp images" },
      { icon: "\u{1F4CA}", title: "Augmented dataset", desc: "Real + generated training data" },
      { icon: "\u{1F9E0}", title: "Faster R-CNN", desc: "Object detection training" },
      { icon: "\u{1F50D}", title: "Optuna / Ray Tune", desc: "Hyperparameter optimization" },
      { icon: "\u2705", title: "COCO evaluation", desc: "AP / AR / F1 metrics" },
    ],
    modelComp: "Model comparison",
    modelCompSub: "10 Faster R-CNN configurations from Optuna HPO",
    metrics: { ap50: "AP @IoU=0.50", ap5095: "AP @IoU=[.50:.95]", ar100: "AR maxDets=100", f1: "F1 score" },
    sort: "Sort:",
    allModels: "All models are Faster R-CNN (ResNet-50 FPN). Metrics from COCO evaluation on the LDPolypVideo test set.",
    simInference: "Simulated inference",
    browserMock: "Browser mock \u00b7 Faster R-CNN",
    simDesc1: "Simulates Faster R-CNN inference on a colonoscopy frame.",
    simDesc2: "The bounding boxes are a ",
    simDesc3: "browser mock",
    simDesc4: ", not model output.",
    runDemo: "Run demo inference",
    reset: "Reset",
    confidence: "Confidence",
    detection: "detection",
    detections: "detections",
    loading: "Loading model weights\u2026",
    preprocessing: "Preprocessing frame\u2026",
    forwardPass: "Faster R-CNN forward pass\u2026",
    nms: "NMS & post-processing\u2026",
    complete: "Detection complete (browser mock)",
    cgTrans: "CycleGAN translation",
    unpaired: "Unpaired image-to-image",
    cgDesc1: "CycleGAN learns unpaired ",
    cgDesc2: "mask \u2194 polyp",
    cgDesc3: " translation. SPADE uses spatially-adaptive normalization for mask \u2192 polyp synthesis.",
    m2p: "Mask \u2192 Polyp",
    p2m: "Polyp \u2192 Mask",
    binMask: "Binary mask",
    colFrame: "Colonoscopy frame",
    genPolyp: "Generated polyp",
    predMask: "Predicted mask",
    cgNote: "Illustrations are schematic. Real CycleGAN outputs are photorealistic colonoscopy images.",
    detArch: "Detection architectures",
    thModel: "Model", thBackbone: "Backbone", thNotes: "Notes",
    detectors: [
      { name: "Faster R-CNN", backbone: "ResNet-50 FPN", note: "Primary detector, best results" },
      { name: "RetinaNet", backbone: "ResNet-50 FPN v2", note: "Single-stage anchor-based" },
      { name: "SSD Lite", backbone: "MobileNet V3", note: "Lightweight / mobile" },
    ],
    links: "Local Dashboard",
    dashboard1: "The project includes a comprehensive ",
    dashboard2: "React & FastAPI dashboard",
    dashboard3: " for interactive model exploration, HPO, and generative augmentation. Clone the repo and run ",
    dashboard4: " in the root directory.",
    author: "Author",
    runLocal: "\u25B8 Run the project locally",
    projDesc1: "The project is ",
    projDesc2: "Python + PyTorch",
    projDesc3: ". A CUDA GPU is recommended for training. The web dashboard works on CPU.",
    datasetNote1: "Place the LDPolypVideo dataset under ",
    datasetNote2: " and ",
  },
  es: {
    pipelineTitle: "Pipeline de Principio a Fin",
    thesis: "Trabajo de Fin de Grado \u00b7 FIB-UPC",
    pipelineSteps: [
      { icon: "\u{1F4CB}", title: "LDPolypVideo", desc: "Frames de colonoscopia + bounding boxes" },
      { icon: "\u{1F3AD}", title: "CycleGAN / SPADE", desc: "Máscara \u2192 imágenes de pólipos sintéticas" },
      { icon: "\u{1F4CA}", title: "Dataset aumentado", desc: "Datos de entrenamiento reales + generados" },
      { icon: "\u{1F9E0}", title: "Faster R-CNN", desc: "Entrenamiento de detección de objetos" },
      { icon: "\u{1F50D}", title: "Optuna / Ray Tune", desc: "Optimización de hiperparámetros" },
      { icon: "\u2705", title: "Evaluación COCO", desc: "Métricas AP / AR / F1" },
    ],
    modelComp: "Comparación de modelos",
    modelCompSub: "10 configuraciones de Faster R-CNN desde Optuna HPO",
    metrics: { ap50: "AP @IoU=0.50", ap5095: "AP @IoU=[.50:.95]", ar100: "AR maxDets=100", f1: "Puntuación F1" },
    sort: "Ordenar:",
    allModels: "Todos los modelos son Faster R-CNN (ResNet-50 FPN). Métricas de evaluación COCO en el test set LDPolypVideo.",
    simInference: "Inferencia simulada",
    browserMock: "Mock de navegador \u00b7 Faster R-CNN",
    simDesc1: "Simula inferencia de Faster R-CNN en un frame de colonoscopia.",
    simDesc2: "Las bounding boxes son un ",
    simDesc3: "mock del navegador",
    simDesc4: ", no la salida real del modelo.",
    runDemo: "Ejecutar inferencia de demo",
    reset: "Reiniciar",
    confidence: "Confianza",
    detection: "detección",
    detections: "detecciones",
    loading: "Cargando pesos del modelo\u2026",
    preprocessing: "Preprocesando frame\u2026",
    forwardPass: "Pase hacia adelante de Faster R-CNN\u2026",
    nms: "NMS y post-procesamiento\u2026",
    complete: "Detección completa (mock del navegador)",
    cgTrans: "Traducción CycleGAN",
    unpaired: "Imagen a imagen no emparejada",
    cgDesc1: "CycleGAN aprende una traducción no emparejada ",
    cgDesc2: "máscara \u2194 pólipo",
    cgDesc3: ". SPADE usa normalización espacial adaptativa para síntesis máscara \u2192 pólipo.",
    m2p: "Máscara \u2192 Pólipo",
    p2m: "Pólipo \u2192 Máscara",
    binMask: "Máscara binaria",
    colFrame: "Frame de colonoscopia",
    genPolyp: "Pólipo generado",
    predMask: "Máscara predicha",
    cgNote: "Las ilustraciones son esquemáticas. Las salidas reales de CycleGAN son imágenes fotorrealistas.",
    detArch: "Arquitecturas de detección",
    thModel: "Modelo", thBackbone: "Backbone", thNotes: "Notas",
    detectors: [
      { name: "Faster R-CNN", backbone: "ResNet-50 FPN", note: "Detector principal, mejores resultados" },
      { name: "RetinaNet", backbone: "ResNet-50 FPN v2", note: "Basado en anclajes de una etapa" },
      { name: "SSD Lite", backbone: "MobileNet V3", note: "Ligero / móvil" },
    ],
    links: "Dashboard local",
    dashboard1: "El proyecto incluye un completo ",
    dashboard2: "dashboard de React y FastAPI",
    dashboard3: " para exploración de modelos, HPO y aumento de datos generativo. Clona el repo y ejecuta ",
    dashboard4: " en el directorio raíz.",
    author: "Autor",
    runLocal: "\u25B8 Ejecutar el proyecto localmente",
    projDesc1: "El proyecto es ",
    projDesc2: "Python + PyTorch",
    projDesc3: ". Se recomienda una GPU CUDA para entrenamiento. El dashboard web funciona en CPU.",
    datasetNote1: "Coloca el dataset LDPolypVideo bajo ",
    datasetNote2: " y ",
  },
  ca: {
    pipelineTitle: "Pipeline de Principi a Fi",
    thesis: "Treball de Fi de Grau \u00b7 FIB-UPC",
    pipelineSteps: [
      { icon: "\u{1F4CB}", title: "LDPolypVideo", desc: "Frames de colonoscòpia + bounding boxes" },
      { icon: "\u{1F3AD}", title: "CycleGAN / SPADE", desc: "Màscara \u2192 imatges de pòlips sintètiques" },
      { icon: "\u{1F4CA}", title: "Dataset augmentat", desc: "Dades d'entrenament reals + generades" },
      { icon: "\u{1F9E0}", title: "Faster R-CNN", desc: "Entrenament de detecció d'objectes" },
      { icon: "\u{1F50D}", title: "Optuna / Ray Tune", desc: "Optimització d'hiperparàmetres" },
      { icon: "\u2705", title: "Avaluació COCO", desc: "Mètriques AP / AR / F1" },
    ],
    modelComp: "Comparació de models",
    modelCompSub: "10 configuracions de Faster R-CNN des d'Optuna HPO",
    metrics: { ap50: "AP @IoU=0.50", ap5095: "AP @IoU=[.50:.95]", ar100: "AR maxDets=100", f1: "Puntuació F1" },
    sort: "Ordenar:",
    allModels: "Tots els models són Faster R-CNN (ResNet-50 FPN). Mètriques d'avaluació COCO en el test set LDPolypVideo.",
    simInference: "Inferència simulada",
    browserMock: "Mock de navegador \u00b7 Faster R-CNN",
    simDesc1: "Simula inferència de Faster R-CNN en un frame de colonoscòpia.",
    simDesc2: "Les bounding boxes són un ",
    simDesc3: "mock del navegador",
    simDesc4: ", no la sortida real del model.",
    runDemo: "Executar inferència de demo",
    reset: "Reiniciar",
    confidence: "Confiança",
    detection: "detecció",
    detections: "deteccions",
    loading: "Carregant pesos del model\u2026",
    preprocessing: "Preprocessant frame\u2026",
    forwardPass: "Pas cap endavant de Faster R-CNN\u2026",
    nms: "NMS i post-processament\u2026",
    complete: "Detecció completa (mock del navegador)",
    cgTrans: "Traducció CycleGAN",
    unpaired: "Imatge a imatge no emparellada",
    cgDesc1: "CycleGAN aprèn una traducció no emparellada ",
    cgDesc2: "màscara \u2194 pòlip",
    cgDesc3: ". SPADE utilitza normalització espacial adaptativa per síntesi màscara \u2192 pòlip.",
    m2p: "Màscara \u2192 Pòlip",
    p2m: "Pòlip \u2192 Màscara",
    binMask: "Màscara binària",
    colFrame: "Frame de colonoscòpia",
    genPolyp: "Pòlip generat",
    predMask: "Màscara predita",
    cgNote: "Les il·lustracions són esquemàtiques. Les sortides reals de CycleGAN són imatges fotorrealistes.",
    detArch: "Arquitectures de detecció",
    thModel: "Model", thBackbone: "Backbone", thNotes: "Notes",
    detectors: [
      { name: "Faster R-CNN", backbone: "ResNet-50 FPN", note: "Detector principal, millors resultats" },
      { name: "RetinaNet", backbone: "ResNet-50 FPN v2", note: "Basat en ancoratges d'una etapa" },
      { name: "SSD Lite", backbone: "MobileNet V3", note: "Lleuger / mòbil" },
    ],
    links: "Tauler local",
    dashboard1: "El projecte inclou un complet ",
    dashboard2: "dashboard de React i FastAPI",
    dashboard3: " per exploració de models, HPO i augment de dades generatiu. Clona el repo i executa ",
    dashboard4: " en el directori arrel.",
    author: "Autor",
    runLocal: "\u25B8 Executar el projecte localment",
    projDesc1: "El projecte és ",
    projDesc2: "Python + PyTorch",
    projDesc3: ". Es recomana una GPU CUDA per entrenament. El dashboard web funciona en CPU.",
    datasetNote1: "Col·loca el dataset LDPolypVideo sota ",
    datasetNote2: " i ",
  }
};

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
            border: metric === m ? `1px solid ${accent1}` : "1px solid var(--border-color)",
            background: metric === m ? `${accent1}18` : "var(--bg-card-hover)",
            color: metric === m ? accent1 : "var(--text-secondary)",
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
const MOCK_BOXES = [
  { x: 35, y: 30, w: 22, h: 25, score: 0.94, label: "polyp" },
  { x: 62, y: 55, w: 15, h: 18, score: 0.71, label: "polyp" },
];

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
              background: `linear-gradient(135deg, rgba(16,185,129,0.15), rgba(14,165,233,0.1))`,
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
              background: `linear-gradient(135deg, rgba(14,165,233,0.15), rgba(16,185,129,0.1))`,
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
              <code style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>make run</code>{t.dashboard4}
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
