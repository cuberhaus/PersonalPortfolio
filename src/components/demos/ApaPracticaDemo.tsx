import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import pcaPointsData from "../../data/pca_points.json";
import modelWeights from "../../data/model_weights.json";

/* ── constants ── */
const CW = 520;
const CH = 340;
const GH = "https://github.com/cuberhaus/APA_Practica";
const NB = "https://nbviewer.org/github/cuberhaus/APA_Practica/blob/main";
const MAIN_NB = "PracticaAPA-Hipotiroidismo-PolCasacubertaMartaGranero.ipynb";
const LINEAR_NB = "PracticaAPA-Hipotiroidismo-ModelsLineals.ipynb";

type Lang = "en" | "es" | "ca";

const TRANSLATIONS = {
  en: {
    mlPipeline: "ML Pipeline",
    course: "FIB-UPC \u00b7 Machine Learning",
    with: "with",
    pipelineSteps: [
      { icon: "📂", title: "ARFF data", desc: "hypothyroid.arff" },
      { icon: "🔧", title: "Preprocess", desc: "Impute, scale, encode" },
      { icon: "📊", title: "EDA", desc: "Correlation, distributions" },
      { icon: "🤖", title: "Models", desc: "9 sklearn families" },
      { icon: "✅", title: "Evaluate", desc: "CV, ROC, confusion matrices" },
    ],
    modelsList: [
      "Logistic Regression", "LDA / QDA", "Naive Bayes",
      "k-NN", "SVM (linear + kernel)", "MLP (neural nets)",
      "Random Forest", "Ridge / Lasso", "Bayesian hyperparameter search",
    ],
    predictorTitle: "Hypothyroid predictor",
    predictorSub: "Real LogReg model \u00b7 runs in browser",
    knnTitle: "k-NN on PCA projection",
    knnSub: "200 real test-set points \u00b7 click to classify",
    clear: "Clear",
    clickToPlot: "Click the plot to classify a point",
    prediction: "Prediction:",
    negative: "N (negative)",
    positive: "P (positive)",
    nn: "nearest neighbors",
    likelyHypo: "Hypothyroidism likely",
    likelyNeg: "Negative \u2014 healthy",
    confidence: "Logistic Regression \u00b7 {0}% confidence",
    featImp: "Feature importance",
    featMeta: [
      { key: "age", label: "Age", unit: "years", color: "#a78bfa" },
      { key: "TSH", label: "TSH", unit: "µU/mL", color: "#f472b6" },
      { key: "TT4", label: "TT4", unit: "nmol/L", color: "#38bdf8" },
      { key: "T3",  label: "T3",  unit: "nmol/L", color: "#34d399" }
    ],
    featNote: "|coeff| from Logistic Regression on standardized features \u2014 TSH dominates prediction.",
    dataSummary: "Dataset summary",
    dataP1a: "\u2014 UCI-style with numeric (age, TSH, T3, TT4, FTI, T4U) and categorical attributes. Target: ",
    dataP1b: " (P/N).",
    dataP2a: "Challenges: heavy ",
    dataP2b: ", outliers in age, dropped TBG, class ",
    dataP2c: " \u2014 handled via imputation, appropriate metrics (F1, ROC-AUC).",
    nan: "NaN",
    imbalance: "imbalance",
    ghRepo: "GitHub repo \u2197",
    nbPreview: "Jupyter notebook preview",
    fullPractica: "Full practica",
    linModels: "Linear models",
    openNbviewer: "Open in Nbviewer \u2197",
    runLocal: "\u25B8 Run the notebooks locally"
  },
  es: {
    mlPipeline: "Pipeline ML",
    course: "FIB-UPC \u00b7 Aprendizaje Automático",
    with: "con",
    pipelineSteps: [
      { icon: "📂", title: "Datos ARFF", desc: "hypothyroid.arff" },
      { icon: "🔧", title: "Preproceso", desc: "Imputación, escalado, encoding" },
      { icon: "📊", title: "EDA", desc: "Correlación, distribuciones" },
      { icon: "🤖", title: "Modelos", desc: "9 familias de sklearn" },
      { icon: "✅", title: "Evaluación", desc: "CV, ROC, matrices de confusión" },
    ],
    modelsList: [
      "Regresión Logística", "LDA / QDA", "Naive Bayes",
      "k-NN", "SVM (lineal + kernel)", "MLP (redes neuronales)",
      "Random Forest", "Ridge / Lasso", "Búsqueda bayesiana de hiperparámetros",
    ],
    predictorTitle: "Predictor de Hipotiroidismo",
    predictorSub: "Modelo LogReg real \u00b7 se ejecuta en el navegador",
    knnTitle: "k-NN en proyección PCA",
    knnSub: "200 puntos reales de test \u00b7 haz clic para clasificar",
    clear: "Limpiar",
    clickToPlot: "Haz clic en el gráfico para clasificar un punto",
    prediction: "Predicción:",
    negative: "N (negativo)",
    positive: "P (positivo)",
    nn: "vecinos más cercanos",
    likelyHypo: "Hipotiroidismo probable",
    likelyNeg: "Negativo \u2014 saludable",
    confidence: "Regresión Logística \u00b7 {0}% de confianza",
    featImp: "Importancia de características",
    featMeta: [
      { key: "age", label: "Edad", unit: "años", color: "#a78bfa" },
      { key: "TSH", label: "TSH", unit: "µU/mL", color: "#f472b6" },
      { key: "TT4", label: "TT4", unit: "nmol/L", color: "#38bdf8" },
      { key: "T3",  label: "T3",  unit: "nmol/L", color: "#34d399" }
    ],
    featNote: "|coef| de Regresión Logística en características estandarizadas \u2014 TSH domina la predicción.",
    dataSummary: "Resumen del dataset",
    dataP1a: "\u2014 estilo UCI con atributos numéricos (edad, TSH, T3, TT4, FTI, T4U) y categóricos. Variable objetivo: ",
    dataP1b: " (P/N).",
    dataP2a: "Desafíos: muchos ",
    dataP2b: ", valores atípicos en edad, TBG descartado, ",
    dataP2c: " \u2014 manejado mediante imputación, métricas adecuadas (F1, ROC-AUC).",
    nan: "NaN",
    imbalance: "desequilibrio de clases",
    ghRepo: "Repositorio en GitHub \u2197",
    nbPreview: "Vista previa de Jupyter notebook",
    fullPractica: "Práctica completa",
    linModels: "Modelos lineales",
    openNbviewer: "Abrir en Nbviewer \u2197",
    runLocal: "\u25B8 Ejecutar los notebooks localmente"
  },
  ca: {
    mlPipeline: "Pipeline ML",
    course: "FIB-UPC \u00b7 Aprenentatge Automàtic",
    with: "amb",
    pipelineSteps: [
      { icon: "📂", title: "Dades ARFF", desc: "hypothyroid.arff" },
      { icon: "🔧", title: "Preprocés", desc: "Imputació, escalat, encoding" },
      { icon: "📊", title: "EDA", desc: "Correlació, distribucions" },
      { icon: "🤖", title: "Models", desc: "9 famílies de sklearn" },
      { icon: "✅", title: "Avaluació", desc: "CV, ROC, matrius de confusió" },
    ],
    modelsList: [
      "Regressió Logística", "LDA / QDA", "Naive Bayes",
      "k-NN", "SVM (lineal + kernel)", "MLP (xarxes neuronals)",
      "Random Forest", "Ridge / Lasso", "Cerca bayesiana d'hiperparàmetres",
    ],
    predictorTitle: "Predictor d'Hipotiroïdisme",
    predictorSub: "Model LogReg real \u00b7 s'executa al navegador",
    knnTitle: "k-NN en projecció PCA",
    knnSub: "200 punts reals de test \u00b7 fes clic per classificar",
    clear: "Netejar",
    clickToPlot: "Fes clic al gràfic per classificar un punt",
    prediction: "Predicció:",
    negative: "N (negatiu)",
    positive: "P (positiu)",
    nn: "veïns més propers",
    likelyHypo: "Hipotiroïdisme probable",
    likelyNeg: "Negatiu \u2014 saludable",
    confidence: "Regressió Logística \u00b7 {0}% de confiança",
    featImp: "Importància de característiques",
    featMeta: [
      { key: "age", label: "Edat", unit: "anys", color: "#a78bfa" },
      { key: "TSH", label: "TSH", unit: "µU/mL", color: "#f472b6" },
      { key: "TT4", label: "TT4", unit: "nmol/L", color: "#38bdf8" },
      { key: "T3",  label: "T3",  unit: "nmol/L", color: "#34d399" }
    ],
    featNote: "|coef| de Regressió Logística en característiques estandarditzades \u2014 TSH domina la predicció.",
    dataSummary: "Resum del dataset",
    dataP1a: "\u2014 estil UCI amb atributs numèrics (edat, TSH, T3, TT4, FTI, T4U) i categòrics. Variable objectiu: ",
    dataP1b: " (P/N).",
    dataP2a: "Reptes: molts ",
    dataP2b: ", valors atípics en edat, TBG descartat, ",
    dataP2c: " \u2014 gestionat mitjançant imputació, mètriques adequades (F1, ROC-AUC).",
    nan: "NaN",
    imbalance: "desequilibri de classes",
    ghRepo: "Repositori a GitHub \u2197",
    nbPreview: "Vista prèvia de Jupyter notebook",
    fullPractica: "Pràctica completa",
    linModels: "Models lineals",
    openNbviewer: "Obrir a Nbviewer \u2197",
    runLocal: "\u25B8 Executar els notebooks localmente"
  }
};

type Pt = { x: number; y: number; cls: 0 | 1 };

function clamp(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x));
}

function loadRealPoints(): Pt[] {
  return pcaPointsData.map((p) => ({
    x: 18 + p.x * (CW - 36),
    y: 18 + p.y * (CH - 36),
    cls: p.cls as 0 | 1,
  }));
}

function dist2(ax: number, ay: number, bx: number, by: number) {
  return (ax - bx) ** 2 + (ay - by) ** 2;
}

function knnVote(px: number, py: number, points: Pt[], k: number) {
  const sorted = [...points].sort((a, b) => dist2(px, py, a.x, a.y) - dist2(px, py, b.x, b.y));
  const neighbors = sorted.slice(0, k);
  let c0 = 0, c1 = 0;
  for (const n of neighbors) n.cls === 0 ? c0++ : c1++;
  const cls: 0 | 1 = c1 > c0 ? 1 : c0 > c1 ? 0 : neighbors[0].cls;
  return { cls, neighbors };
}

/* ── prediction helper ── */
function predict(age: number, tsh: number, tt4: number, t3: number) {
  const vals = [age, tsh, tt4, t3];
  let z = modelWeights.intercept;
  for (let i = 0; i < 4; i++) {
    z += ((vals[i] - modelWeights.scaler_mean[i]) / modelWeights.scaler_scale[i]) * modelWeights.coef[i];
  }
  const prob = 1 / (1 + Math.exp(-z));
  // Class 0 = hypothyroid (P), Class 1 = negative (N).
  // LogReg outputs P(class=1): high prob → negative, low prob → hypothyroid.
  return { isHypo: z < 0, probability: prob, z };
}

/* ── feature importance (absolute coef magnitude, normalised) ── */
const absCoefs = modelWeights.coef.map(Math.abs);
const maxCoef = Math.max(...absCoefs);

/* ── shared styles ── */
const card = {
  background: "var(--bg-card)",
  border: "1px solid var(--border-color)",
  borderRadius: "1rem",
  padding: "1.5rem",
} as const;

const accent1 = "#818cf8";  // indigo
const accent2 = "#2dd4bf";  // teal
const negative = "#2dd4bf";
const positive = "#fb7185";

/* ════════════════════════════════════════════════════════════════════════ */
/*  KNN CANVAS                                                            */
/* ════════════════════════════════════════════════════════════════════════ */
function KnnCanvas({ t }: { t: typeof TRANSLATIONS.en }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const points = useMemo(() => loadRealPoints(), []);
  const [k, setK] = useState(5);
  const [query, setQuery] = useState<{ x: number; y: number } | null>(null);

  const redraw = useCallback(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    const dpr = typeof window !== "undefined" ? Math.min(2, window.devicePixelRatio || 1) : 1;
    cvs.width = CW * dpr;
    cvs.height = CH * dpr;
    cvs.style.width = "100%";
    cvs.style.height = "auto";
    ctx.scale(dpr, dpr);

    // bg
    ctx.clearRect(0, 0, CW, CH);

    // grid
    ctx.strokeStyle = "rgba(128,128,128,0.2)";
    ctx.lineWidth = 1;
    for (let g = 0; g <= CW; g += 40) { ctx.beginPath(); ctx.moveTo(g, 0); ctx.lineTo(g, CH); ctx.stroke(); }
    for (let g = 0; g <= CH; g += 40) { ctx.beginPath(); ctx.moveTo(0, g); ctx.lineTo(CW, g); ctx.stroke(); }

    // axis labels
    ctx.font = "11px ui-monospace, monospace";
    ctx.fillStyle = "rgba(128,128,128,0.8)";
    ctx.fillText("PC1 →", CW - 50, CH - 8);
    ctx.save(); ctx.translate(12, 50); ctx.rotate(-Math.PI / 2); ctx.fillText("PC2 →", 0, 0); ctx.restore();

    // neighbor lines
    let neighbors: Pt[] = [];
    if (query) {
      neighbors = knnVote(query.x, query.y, points, k).neighbors;
      ctx.strokeStyle = "rgba(129, 140, 248, 0.35)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      for (const n of neighbors) {
        ctx.beginPath(); ctx.moveTo(query.x, query.y); ctx.lineTo(n.x, n.y); ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // dots
    for (const p of points) {
      const isNeighbor = neighbors.includes(p);
      ctx.beginPath();
      ctx.arc(p.x, p.y, isNeighbor ? 6.5 : 4.5, 0, Math.PI * 2);
      ctx.fillStyle = p.cls === 0 ? (isNeighbor ? "#5eead4" : "#2dd4bf80") : (isNeighbor ? "#fda4af" : "#fb718580");
      ctx.fill();
      if (isNeighbor) {
        ctx.strokeStyle = p.cls === 0 ? "#2dd4bf" : "#fb7185";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // query point
    if (query) {
      const { cls } = knnVote(query.x, query.y, points, k);
      // glow
      const grd = ctx.createRadialGradient(query.x, query.y, 0, query.x, query.y, 22);
      grd.addColorStop(0, cls === 0 ? "rgba(45,212,191,0.25)" : "rgba(251,113,133,0.25)");
      grd.addColorStop(1, "transparent");
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(query.x, query.y, 22, 0, Math.PI * 2); ctx.fill();
      // crosshair
      ctx.strokeStyle = "rgba(128,128,128,0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(query.x, query.y, 8, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(query.x - 12, query.y); ctx.lineTo(query.x + 12, query.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(query.x, query.y - 12); ctx.lineTo(query.x, query.y + 12); ctx.stroke();
    }
  }, [points, query, k]);

  useEffect(() => { redraw(); }, [redraw]);

  const onCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const rect = cvs.getBoundingClientRect();
    const x = clamp(((e.clientX - rect.left) / rect.width) * CW, 10, CW - 10);
    const y = clamp(((e.clientY - rect.top) / rect.height) * CH, 10, CH - 10);
    setQuery({ x, y });
  };

  const pred = query ? knnVote(query.x, query.y, points, k).cls : null;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>k =</span>
        {[3, 5, 7, 11].map((kv) => (
          <button key={kv} type="button" onClick={() => setK(kv)} style={{
            padding: "0.3rem 0.65rem", borderRadius: "0.4rem", border: "none",
            fontSize: "0.78rem", fontWeight: 700, cursor: "pointer",
            background: k === kv ? `linear-gradient(135deg, ${accent1}, ${accent2})` : "var(--bg-card-hover)",
            color: k === kv ? "var(--text-primary)" : "var(--text-muted)",
            transition: "all 0.15s",
          }}>{kv}</button>
        ))}
        {query && (
          <button type="button" onClick={() => setQuery(null)} style={{
            marginLeft: "auto", padding: "0.3rem 0.65rem", borderRadius: "0.4rem",
            border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-muted)",
            fontSize: "0.75rem", cursor: "pointer",
          }}>{t.clear}</button>
        )}
      </div>
      <canvas
        ref={canvasRef} onClick={onCanvasClick} width={CW} height={CH}
        style={{
          display: "block", borderRadius: "0.75rem", border: "1px solid var(--border-color)",
          cursor: "crosshair", width: "100%", aspectRatio: `${CW}/${CH}`,
          background: "var(--bg-secondary)"
        }}
        aria-label="k-NN PCA demo"
      />
      <div style={{ marginTop: "0.75rem", minHeight: "1.3rem", fontSize: "0.85rem" }}>
        {pred !== null ? (
          <span>
            {t.prediction}{" "}
            <strong style={{ color: pred === 0 ? negative : positive }}>
              {pred === 0 ? t.negative : t.positive}
            </strong>
            <span style={{ color: "var(--text-muted)", marginLeft: "0.5rem" }}>· {k} {t.nn}</span>
          </span>
        ) : (
          <span style={{ color: "var(--border-color-hover)" }}>{t.clickToPlot}</span>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
/*  PREDICTOR                                                             */
/* ════════════════════════════════════════════════════════════════════════ */
function Predictor({ t }: { t: typeof TRANSLATIONS.en }) {
  const [age, setAge] = useState(50);
  const [tsh, setTsh] = useState(2.0);
  const [tt4, setTt4] = useState(109);
  const [t3, setT3] = useState(2.0);

  const { isHypo, probability } = predict(age, tsh, tt4, t3);
  const conf = isHypo ? (1 - probability) * 100 : probability * 100;

  return (
    <div>
      <FeatureSlider label={t.featMeta[0].label} value={age} set={setAge} min={1} max={100} step={1} unit={t.featMeta[0].unit} color={t.featMeta[0].color} />
      <FeatureSlider label={t.featMeta[1].label} value={tsh} set={setTsh} min={0} max={200} step={0.1} unit={t.featMeta[1].unit} color={t.featMeta[1].color} />
      <FeatureSlider label={t.featMeta[2].label} value={tt4} set={setTt4} min={0} max={300} step={1} unit={t.featMeta[2].unit} color={t.featMeta[2].color} />
      <FeatureSlider label={t.featMeta[3].label} value={t3}  set={setT3}  min={0} max={10}  step={0.1} unit={t.featMeta[3].unit} color={t.featMeta[3].color} />

      {/* result */}
      <div style={{
        marginTop: "1.5rem", padding: "1.25rem", borderRadius: "0.75rem",
        background: isHypo
          ? "linear-gradient(135deg, rgba(251,113,133,0.08), rgba(251,113,133,0.03))"
          : "linear-gradient(135deg, rgba(45,212,191,0.08), rgba(45,212,191,0.03))",
        border: `1px solid ${isHypo ? "rgba(251,113,133,0.25)" : "rgba(45,212,191,0.25)"}`,
        transition: "all 0.3s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.3rem",
            background: isHypo ? "rgba(251,113,133,0.15)" : "rgba(45,212,191,0.15)",
          }}>
            {isHypo ? "⚠️" : "✅"}
          </div>
          <div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: isHypo ? positive : negative }}>
              {isHypo ? t.likelyHypo : t.likelyNeg}
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
              {t.confidence.replace("{0}", conf.toFixed(1))}
            </div>
          </div>
        </div>
        {/* confidence bar */}
        <div style={{ marginTop: "0.85rem", height: 6, borderRadius: 3, background: "var(--bg-card-hover)", overflow: "hidden" }}>
          <div style={{
            width: `${conf}%`, height: "100%", borderRadius: 3,
            background: isHypo
              ? "linear-gradient(90deg, #fb7185, #f43f5e)"
              : "linear-gradient(90deg, #2dd4bf, #14b8a6)",
            transition: "width 0.4s ease",
          }} />
        </div>
      </div>
    </div>
  );
}

function FeatureSlider({ label, value, set, min, max, step, unit, color }: {
  label: string; value: number; set: (v: number) => void;
  min: number; max: number; step: number; unit: string; color: string;
}) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
        <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)" }}>{label}</span>
        <span style={{ fontSize: "0.82rem", fontFamily: "ui-monospace, monospace", color }}>
          {value} <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>{unit}</span>
        </span>
      </div>
      <input type="range" value={value}
        onChange={(e) => set(parseFloat(e.target.value))}
        min={min} max={max} step={step}
        style={{ width: "100%", accentColor: color, height: "6px" }}
      />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
/*  FEATURE IMPORTANCE                                                    */
/* ════════════════════════════════════════════════════════════════════════ */
function FeatureImportance({ t }: { t: typeof TRANSLATIONS.en }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      {t.featMeta.map((f, i) => (
        <div key={f.key} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ width: 36, fontSize: "0.78rem", fontWeight: 700, color: f.color, textAlign: "right" }}>{f.label}</span>
          <div style={{ flex: 1, height: 8, borderRadius: 4, background: "var(--bg-card-hover)", overflow: "hidden" }}>
            <div style={{
              width: `${(absCoefs[i] / maxCoef) * 100}%`, height: "100%", borderRadius: 4,
              background: `linear-gradient(90deg, ${f.color}80, ${f.color})`,
              transition: "width 0.5s ease",
            }} />
          </div>
          <span style={{ width: 45, fontSize: "0.7rem", fontFamily: "ui-monospace, monospace", color: "var(--text-muted)", textAlign: "right" }}>
            {absCoefs[i].toFixed(2)}
          </span>
        </div>
      ))}
      <p style={{ margin: "0.25rem 0 0", fontSize: "0.68rem", color: "var(--border-color-hover)" }}>
        {t.featNote}
      </p>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
/*  MAIN EXPORT                                                           */
/* ════════════════════════════════════════════════════════════════════════ */
export default function ApaPracticaDemo({ lang = "en" }: { lang?: Lang }) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const [showNb, setShowNb] = useState(false);
  const [nbFile, setNbFile] = useState(MAIN_NB);

  return (
    <div style={{ fontFamily: "var(--font-sans, 'Inter', sans-serif)", color: "var(--text-primary)" }}>

      {/* ── PIPELINE STRIP ── */}
      <div style={{
        ...card, marginBottom: "1.25rem",
        background: "var(--bg-card)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
          <div style={{
            padding: "0.2rem 0.55rem", borderRadius: "0.35rem", fontSize: "0.65rem", fontWeight: 700,
            letterSpacing: "0.06em", textTransform: "uppercase" as const,
            background: "linear-gradient(135deg, #818cf8, #2dd4bf)", color: "var(--text-primary)",
          }}>{t.mlPipeline}</div>
          <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>{t.course}</span>
          <span style={{ fontSize: "0.82rem", color: "var(--border-color-hover)" }}>·</span>
          <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
            {t.with} <a href="https://github.com/martagranero" target="_blank" rel="noopener noreferrer" style={{ color: accent2, textDecoration: "none" }}>Marta Granero</a>
          </span>
        </div>

        <div style={{
          display: "flex", gap: "0.35rem", overflowX: "auto", paddingBottom: "0.25rem",
        }}>
          {t.pipelineSteps.map((step, i) => (
            <div key={i} style={{
              flex: "1 0 auto", minWidth: 90, padding: "0.65rem 0.75rem",
              background: "var(--bg-secondary)", borderRadius: "0.5rem", border: "1px solid var(--border-color)",
              textAlign: "center",
            }}>
              <div style={{ fontSize: "1.15rem", marginBottom: "0.25rem" }}>{step.icon}</div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-primary)" }}>{step.title}</div>
              <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>{step.desc}</div>
            </div>
          ))}
        </div>

        <div style={{
          display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "1rem",
        }}>
          {t.modelsList.map((m) => (
            <span key={m} style={{
              padding: "0.2rem 0.5rem", borderRadius: "1rem", fontSize: "0.68rem", fontWeight: 600,
              background: "var(--bg-card-hover)", border: "1px solid var(--border-color)", color: "var(--text-secondary)",
            }}>{m}</span>
          ))}
        </div>
      </div>

      {/* ── DUAL INTERACTIVE SECTION ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
        gap: "1.25rem",
        marginBottom: "1.25rem",
      }}>
        {/* Predictor */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
            <div style={{
              width: 30, height: 30, borderRadius: "0.5rem", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: "0.9rem",
              background: "linear-gradient(135deg, rgba(129,140,248,0.15), rgba(45,212,191,0.1))",
            }}>🏥</div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>{t.predictorTitle}</h3>
              <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-muted)" }}>{t.predictorSub}</p>
            </div>
          </div>
          <Predictor t={t} />
        </div>

        {/* k-NN */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
            <div style={{
              width: 30, height: 30, borderRadius: "0.5rem", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: "0.9rem",
              background: "linear-gradient(135deg, rgba(45,212,191,0.15), rgba(129,140,248,0.1))",
            }}>📍</div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>{t.knnTitle}</h3>
              <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-muted)" }}>{t.knnSub}</p>
            </div>
          </div>
          <KnnCanvas t={t} />
        </div>
      </div>

      {/* ── FEATURE IMPORTANCE + LINKS ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
        gap: "1.25rem",
        marginBottom: "1.25rem",
      }}>
        <div style={card}>
          <h4 style={{ margin: "0 0 0.85rem", fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {t.featImp}
          </h4>
          <FeatureImportance t={t} />
        </div>
        <div style={card}>
          <h4 style={{ margin: "0 0 0.85rem", fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {t.dataSummary}
          </h4>
          <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.65 }}>
            <p style={{ margin: "0 0 0.5rem" }}>
              <code style={{ color: "#94a3b8" }}>hypothyroid.arff</code> {t.dataP1a} <strong style={{ color: "var(--text-primary)" }}>binaryClass</strong>{t.dataP1b}
            </p>
            <p style={{ margin: "0 0 0.5rem" }}>
              {t.dataP2a} <strong style={{ color: "var(--text-primary)" }}>{t.nan}</strong>{t.dataP2b}
              <strong style={{ color: "var(--text-primary)" }}>{t.imbalance}</strong>
              {t.dataP2c}
            </p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.85rem" }}>
            <a href={GH} target="_blank" rel="noopener noreferrer" style={{
              display: "inline-flex", alignItems: "center", gap: "0.35rem",
              padding: "0.4rem 0.85rem", borderRadius: "0.5rem", fontSize: "0.78rem", fontWeight: 600,
              background: "linear-gradient(135deg, #818cf8, #2dd4bf)", color: "var(--text-primary)",
              textDecoration: "none",
            }}>{t.ghRepo}</a>
            <a href={`${GH}/blob/main/hypothyroid.arff`} target="_blank" rel="noopener noreferrer" style={{
              display: "inline-flex", alignItems: "center", gap: "0.35rem",
              padding: "0.4rem 0.85rem", borderRadius: "0.5rem", fontSize: "0.78rem", fontWeight: 600,
              background: "var(--bg-card-hover)", border: "1px solid var(--border-color)", color: "var(--text-secondary)",
              textDecoration: "none",
            }}>hypothyroid.arff ↗</a>
          </div>
        </div>
      </div>

      {/* ── NOTEBOOK PREVIEW (collapsible) ── */}
      <div style={card}>
        <div style={{
          display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap",
          cursor: "pointer",
        }} onClick={() => setShowNb(!showNb)}>
          <h4 style={{ margin: 0, fontSize: "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {showNb ? "▾" : "▸"} {t.nbPreview}
          </h4>
          <div style={{ display: "flex", gap: "0.35rem" }}>
            {[
              { file: MAIN_NB, label: t.fullPractica },
              { file: LINEAR_NB, label: t.linModels },
            ].map((nb) => (
              <button key={nb.file} type="button"
                onClick={(e) => { e.stopPropagation(); setNbFile(nb.file); setShowNb(true); }}
                style={{
                  padding: "0.25rem 0.6rem", borderRadius: "0.35rem", border: "none",
                  fontSize: "0.72rem", fontWeight: 600, cursor: "pointer",
                  background: nbFile === nb.file && showNb ? `linear-gradient(135deg, ${accent1}, ${accent2})` : "var(--bg-card-hover)",
                  color: nbFile === nb.file && showNb ? "#fff" : "var(--text-muted)",
                }}>{nb.label}</button>
            ))}
          </div>
          <a href={`${NB}/${nbFile}`} target="_blank" rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{ marginLeft: "auto", fontSize: "0.75rem", color: accent2, textDecoration: "none" }}>
            {t.openNbviewer}
          </a>
        </div>
        {showNb && (
          <div style={{
            marginTop: "1rem", borderRadius: "0.5rem", overflow: "hidden",
            border: "1px solid var(--border-color)", background: "var(--bg-secondary)",
          }}>
            <iframe
              key={nbFile}
              title={`Nbviewer: ${nbFile}`}
              src={`${NB}/${nbFile}`}
              style={{ width: "100%", height: "min(72vh, 760px)", border: "none", display: "block" }}
              loading="lazy"
            />
          </div>
        )}
      </div>

      {/* ── RUN LOCALLY ── */}
      <details style={{ marginTop: "1.25rem" }}>
        <summary style={{
          cursor: "pointer", fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)",
          padding: "0.65rem 1rem", background: "var(--bg-card)", borderRadius: "0.75rem",
          border: "1px solid var(--border-color)", listStyle: "none",
        }}>
          {t.runLocal}
        </summary>
        <pre style={{
          margin: "0.75rem 0 0", padding: "1rem", background: "var(--bg-secondary)",
          border: "1px solid var(--border-color)", borderRadius: "0.5rem",
          fontSize: "0.78rem", fontFamily: "ui-monospace, monospace",
          color: "var(--text-secondary)", lineHeight: 1.6, overflowX: "auto",
        }}>{`git clone ${GH}.git
cd APA_Practica
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
jupyter lab ${MAIN_NB}`}</pre>
      </details>

    </div>
  );
}
