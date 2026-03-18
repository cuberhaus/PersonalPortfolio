import { useState, useRef, useMemo, useEffect, useCallback } from "react";

export type Tab = "overview" | "predictor" | "playground" | "preview" | "data" | "models" | "run";

function clamp(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x));
}

const CW = 400;
const CH = 260;

type Pt = { x: number; y: number; cls: 0 | 1 };

import pcaPointsData from "../../data/pca_points.json";
import modelWeights from "../../data/model_weights.json";

function loadRealPoints(): Pt[] {
  return pcaPointsData.map((p) => ({
    x: 14 + p.x * (CW - 28),
    y: 14 + p.y * (CH - 28),
    cls: p.cls as 0 | 1,
  }));
}

function dist2(ax: number, ay: number, bx: number, by: number) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function knnVote(px: number, py: number, points: Pt[], k: number): { cls: 0 | 1; neighbors: Pt[] } {
  const sorted = [...points].sort((a, b) => dist2(px, py, a.x, a.y) - dist2(px, py, b.x, b.y));
  const neighbors = sorted.slice(0, k);
  let c0 = 0;
  let c1 = 0;
  for (const n of neighbors) {
    if (n.cls === 0) c0++;
    else c1++;
  }
  let cls: 0 | 1;
  if (c1 > c0) cls = 1;
  else if (c0 > c1) cls = 0;
  else cls = neighbors[0].cls;
  return { cls, neighbors };
}

const GH = "https://github.com/cuberhaus/APA_Practica";
const NB = "https://nbviewer.org/github/cuberhaus/APA_Practica/blob/main";

const NOTEBOOKS = [
  {
    id: "main",
    label: "Full practica",
    file: "PracticaAPA-Hipotiroidismo-PolCasacubertaMartaGranero.ipynb",
    ghPath: `${GH}/blob/main/PracticaAPA-Hipotiroidismo-PolCasacubertaMartaGranero.ipynb`,
  },
  {
    id: "linear",
    label: "Linear models",
    file: "PracticaAPA-Hipotiroidismo-ModelsLineals.ipynb",
    ghPath: `${GH}/blob/main/PracticaAPA-Hipotiroidismo-ModelsLineals.ipynb`,
  },
] as const;

const QUICK_LINKS = [
  { label: "Repo root", href: GH },
  { label: "hypothyroid.arff", href: `${GH}/blob/main/hypothyroid.arff` },
  { label: "requirements.txt", href: `${GH}/blob/main/requirements.txt` },
  { label: "PracticaHipotiroidismo/", href: `${GH}/tree/main/PracticaHipotiroidismo` },
];

const s = {
  wrapper: { fontFamily: "var(--font-sans, 'Inter', sans-serif)", color: "#e4e4e7", minHeight: "420px" },
  tabs: {
    display: "flex" as const,
    gap: "0.25rem",
    padding: "0.75rem 1rem",
    background: "#16161f",
    borderRadius: "0.75rem",
    marginBottom: "1.25rem",
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
    background: "transparent",
    color: "#71717a",
  },
  tabActive: { background: "linear-gradient(135deg, #0d9488, #6366f1)", color: "#fff" },
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
  link: { color: "#2dd4bf", textDecoration: "none" },
  btnPrimary: {
    display: "inline-flex" as const,
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    padding: "0.65rem 1.15rem",
    borderRadius: "0.5rem",
    border: "none",
    fontWeight: 600,
    fontSize: "0.85rem",
    cursor: "pointer",
    background: "linear-gradient(135deg, #0d9488, #6366f1)",
    color: "#fff",
    textDecoration: "none",
  },
  btnGhost: {
    display: "inline-flex" as const,
    alignItems: "center",
    justifyContent: "center",
    padding: "0.6rem 1rem",
    borderRadius: "0.5rem",
    border: "1px solid #3f3f46",
    fontWeight: 600,
    fontSize: "0.8rem",
    cursor: "pointer",
    background: "#1c1c24",
    color: "#d4d4d8",
    textDecoration: "none",
  },
} as const;

const MODELS = [
  "Logistic regression, LDA / QDA",
  "Naive Bayes (Gaussian, Bernoulli, …)",
  "k-NN (classification & regression baselines)",
  "Linear / Ridge / Lasso (imputation & helpers)",
  "SVM (LinearSVC, SVC)",
  "MLP (neural nets)",
  "Random Forest",
  "Bayesian hyperparameter search (scikit-optimize)",
  "Calibration: ROC, PR, confusion matrices (Yellowbrick)",
];

function KnnClickPlayground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const points = useMemo(() => loadRealPoints(), []);
  const [k, setK] = useState(5);
  const [query, setQuery] = useState<{ x: number; y: number } | null>(null);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = typeof window !== "undefined" ? Math.min(2, window.devicePixelRatio || 1) : 1;
    canvas.width = CW * dpr;
    canvas.height = CH * dpr;
    canvas.style.width = "100%";
    canvas.style.maxWidth = `${CW}px`;
    canvas.style.height = `${CH}px`;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = "#0c0c12";
    ctx.fillRect(0, 0, CW, CH);
    ctx.strokeStyle = "#1c1c26";
    ctx.lineWidth = 1;
    for (let g = 0; g <= CW; g += 50) {
      ctx.beginPath();
      ctx.moveTo(g, 0);
      ctx.lineTo(g, CH);
      ctx.stroke();
    }
    for (let g = 0; g <= CH; g += 50) {
      ctx.beginPath();
      ctx.moveTo(0, g);
      ctx.lineTo(CW, g);
      ctx.stroke();
    }

    let neighbors: Pt[] = [];
    if (query) {
      neighbors = knnVote(query.x, query.y, points, k).neighbors;
      ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      for (const n of neighbors) {
        ctx.beginPath();
        ctx.moveTo(query.x, query.y);
        ctx.lineTo(n.x, n.y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    for (const p of points) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = p.cls === 0 ? "#2dd4bf" : "#fb7185";
      ctx.fill();
      ctx.strokeStyle = "#0a0a0f";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    if (query) {
      const { cls } = knnVote(query.x, query.y, points, k);
      ctx.fillStyle = cls === 0 ? "rgba(45, 212, 191, 0.2)" : "rgba(251, 113, 133, 0.2)";
      ctx.beginPath();
      ctx.arc(query.x, query.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(query.x, query.y, 7, 0, Math.PI * 2);
      ctx.strokeStyle = "#fafafa";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [points, query, k]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const onCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clamp(((e.clientX - rect.left) / rect.width) * CW, 8, CW - 8);
    const y = clamp(((e.clientY - rect.top) / rect.height) * CH, 8, CH - 8);
    setQuery({ x, y });
  };

  const pred = query ? knnVote(query.x, query.y, points, k).cls : null;

  return (
    <div style={s.card}>
      <h3 style={{ marginTop: 0 }}>k-NN click demo</h3>
      <p style={{ color: "#a1a1aa", fontSize: "0.88rem", lineHeight: 1.55, marginBottom: "1rem" }}>
        In the notebooks, <strong style={{ color: "#e4e4e7" }}>k-NN</strong> votes over <strong style={{ color: "#e4e4e7" }}>many</strong>{" "}
        features after imputation and encoding. Here you see a <strong style={{ color: "#e4e4e7" }}>2D PCA projection</strong>{" "}
        of the <strong style={{ color: "#e4e4e7" }}>actual test set</strong>: <strong style={{ color: "#2dd4bf" }}>N</strong> vs{" "}
        <strong style={{ color: "#fb7185" }}>P</strong> matches <code style={{ color: "#94a3b8" }}>binaryClass</code> in
        the hypothyroid dataset. <strong style={{ color: "#e4e4e7" }}>Click</strong> to classify: the <strong style={{ color: "#e4e4e7" }}>k</strong>{" "}
        nearest dots vote.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "0.5rem", alignItems: "center", marginBottom: "0.75rem" }}>
        <span style={{ fontSize: "0.82rem", color: "#71717a" }}>k =</span>
        {([3, 5, 7, 9] as const).map((kv) => (
          <button
            key={kv}
            type="button"
            onClick={() => setK(kv)}
            style={{
              ...s.tab,
              padding: "0.35rem 0.75rem",
              fontSize: "0.8rem",
              ...(k === kv ? s.tabActive : {}),
            }}
          >
            {kv}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setQuery(null)}
          style={{ ...s.btnGhost, marginLeft: "auto", fontSize: "0.78rem", padding: "0.4rem 0.85rem" }}
        >
          Clear click
        </button>
      </div>
      <canvas
        ref={canvasRef}
        onClick={onCanvasClick}
        width={CW}
        height={CH}
        style={{
          display: "block",
          borderRadius: "0.5rem",
          border: "1px solid #27272a",
          cursor: "crosshair",
          maxWidth: "100%",
        }}
        aria-label="k-NN demo: click to predict N or P from k nearest neighbors"
      />
      <div style={{ marginTop: "0.85rem", minHeight: "1.5rem", fontSize: "0.9rem", color: "#a1a1aa" }}>
        {query ? (
          <>
            Prediction:{" "}
            <strong style={{ color: pred === 0 ? "#2dd4bf" : "#fb7185" }}>{pred === 0 ? "N (negative)" : "P (positive)"}</strong>
            <span style={{ color: "#52525b", marginLeft: "0.5rem" }}>· {k} nearest neighbors</span>
          </>
        ) : (
          <span style={{ color: "#52525b" }}>Click the plot to classify a point.</span>
        )}
      </div>
      <p style={{ margin: "1rem 0 0", fontSize: "0.72rem", color: "#3f3f46", lineHeight: 1.45 }}>
        Points are PCA dimensions 1 & 2 computed from the hypothyroid dataset.
      </p>
    </div>
  );
}

function InteractivePredictor() {
  const [age, setAge] = useState(50);
  const [tsh, setTsh] = useState(2.0);
  const [tt4, setTt4] = useState(100);
  const [t3, setT3] = useState(2.0);

  const features = [age, tsh, tt4, t3];
  let z = modelWeights.intercept;
  for (let i = 0; i < 4; i++) {
    const scaled = (features[i] - modelWeights.scaler_mean[i]) / modelWeights.scaler_scale[i];
    z += scaled * modelWeights.coef[i];
  }
  const prob = 1 / (1 + Math.exp(-z));
  const isHypo = z > 0;

  return (
    <div style={s.card}>
      <h3 style={{ marginTop: 0 }}>Interactive Health Form</h3>
      <p style={{ color: "#a1a1aa", fontSize: "0.88rem", lineHeight: 1.55, marginBottom: "1.5rem" }}>
        Adjust the clinical metrics below. A real Logistic Regression model trained on the actual <code style={{ color: "#94a3b8" }}>hypothyroid.arff</code> dataset runs directly in your browser.
      </p>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <LabelInput label="Age" val={age} setVal={setAge} min={0} max={100} step={1} />
        <LabelInput label="TSH (µU/mL)" val={tsh} setVal={setTsh} min={0} max={250} step={0.1} />
        <LabelInput label="TT4 (nmol/L)" val={tt4} setVal={setTt4} min={0} max={300} step={1} />
        <LabelInput label="T3 (nmol/L)" val={t3} setVal={setT3} min={0} max={10} step={0.1} />
      </div>

      <div style={{ marginTop: "2rem", padding: "1.25rem", borderRadius: "0.5rem", background: isHypo ? "rgba(251, 113, 133, 0.08)" : "rgba(45, 212, 191, 0.08)", border: `1px solid ${isHypo ? "rgba(251, 113, 133, 0.3)" : "rgba(45, 212, 191, 0.3)"}` }}>
        <div style={{ fontSize: "0.85rem", color: "#a1a1aa", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Model Prediction</div>
        <div style={{ fontSize: "1.35rem", fontWeight: 700, color: isHypo ? "#fb7185" : "#2dd4bf" }}>
          {isHypo ? "Positive (Hypothyroidism likely)" : "Negative (Healthy)"}
        </div>
        <div style={{ fontSize: "0.8rem", color: "#71717a", marginTop: "0.4rem" }}>
          Model confidence: {(isHypo ? prob * 100 : (1 - prob) * 100).toFixed(1)}%
        </div>
      </div>
    </div>
  );
}

function LabelInput({ label, val, setVal, min, max, step }: any) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
      <div style={{ width: "100px", fontSize: "0.85rem", fontWeight: 600, color: "#e4e4e7" }}>{label}</div>
      <input type="range" value={val} onChange={(e) => setVal(parseFloat(e.target.value))} min={min} max={max} step={step} style={{ flex: 1, accentColor: "#818cf8" }} />
      <div style={{ width: "50px", fontSize: "0.85rem", color: "#a1a1aa", textAlign: "right", fontFamily: "ui-monospace, monospace" }}>{val}</div>
    </div>
  );
}

export default function ApaPracticaDemo() {
  const [tab, setTab] = useState<Tab>("overview");
  const [previewNb, setPreviewNb] = useState<(typeof NOTEBOOKS)[number]["id"]>("main");

  const activeNotebook = NOTEBOOKS.find((n) => n.id === previewNb) ?? NOTEBOOKS[0];
  const nbviewerUrl = `${NB}/${activeNotebook.file}`;

  return (
    <div style={s.wrapper}>
      <div
        style={{
          ...s.card,
          marginBottom: "1.25rem",
          padding: "1.25rem 1.5rem",
        }}
      >
        <div style={{ fontSize: "0.7rem", color: "#71717a", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>
          View the repo
        </div>
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "0.6rem", marginBottom: "1rem" }}>
          <a href={`${NB}/${NOTEBOOKS[0].file}`} target="_blank" rel="noopener noreferrer" style={s.btnPrimary}>
            Open main notebook (Nbviewer)
          </a>
          <a
            href={`${NB}/${NOTEBOOKS[1].file}`}
            target="_blank"
            rel="noopener noreferrer"
            style={s.btnGhost}
          >
            Linear models (Nbviewer)
          </a>
          <a href={GH} target="_blank" rel="noopener noreferrer" style={s.btnGhost}>
            GitHub repo
          </a>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "0.5rem 1rem", fontSize: "0.8rem" }}>
          {QUICK_LINKS.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" style={s.link}>
              {l.label} ↗
            </a>
          ))}
        </div>
      </div>

      <div style={s.tabs}>
        {(
          [
            ["overview", "Overview"],
            ["predictor", "Interactive form"],
            ["playground", "k-NN demo"],
            ["preview", "Notebook preview"],
            ["data", "Dataset"],
            ["models", "Models"],
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
          <h3 style={{ marginTop: 0 }}>APA course practica (FIB-UPC)</h3>
          <p style={{ color: "#a1a1aa", lineHeight: 1.65 }}>
            End-to-end <strong style={{ color: "#e4e4e7" }}>binary classification</strong> pipeline in Jupyter:
            predict hypothyroidism (<code>binaryClass</code>: P/N) from mixed numeric and categorical clinical features
            (hormones, rates, demographics). Co-authored with Marta Granero i Martí.
          </p>
          <ul style={{ color: "#a1a1aa", lineHeight: 1.75, paddingLeft: "1.25rem" }}>
            <li>ARFF source → pandas, heavy missing data & class imbalance</li>
            <li>EDA, imputation strategies, scaling, train/test splits</li>
            <li>Many sklearn families compared with cross-validation and held-out test</li>
          </ul>
          <p style={{ color: "#71717a", fontSize: "0.85rem", marginBottom: 0 }}>
            Use <strong style={{ color: "#94a3b8" }}>Notebook preview</strong> for the full rendered notebook in-page, or{" "}
            <strong style={{ color: "#94a3b8" }}>Nbviewer</strong> above for a new tab. Try the{" "}
            <strong style={{ color: "#94a3b8" }}>k-NN demo</strong> — same vote rule as in the notebooks, on a synthetic 2D slice (N/P).
          </p>
        </div>
      )}

      {tab === "predictor" && <InteractivePredictor />}

      {tab === "playground" && <KnnClickPlayground />}

      {tab === "preview" && (
        <div style={s.card}>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "0.5rem", alignItems: "center", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.85rem", color: "#a1a1aa", marginRight: "0.5rem" }}>Notebook:</span>
            {NOTEBOOKS.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => setPreviewNb(n.id)}
                style={{
                  ...s.tab,
                  ...(previewNb === n.id ? s.tabActive : {}),
                  padding: "0.35rem 0.85rem",
                  fontSize: "0.8rem",
                }}
              >
                {n.label}
              </button>
            ))}
            <a href={nbviewerUrl} target="_blank" rel="noopener noreferrer" style={{ ...s.link, fontSize: "0.8rem", marginLeft: "auto" }}>
              Open in Nbviewer ↗
            </a>
            <a href={activeNotebook.ghPath} target="_blank" rel="noopener noreferrer" style={{ ...s.link, fontSize: "0.8rem" }}>
              Source on GitHub ↗
            </a>
          </div>
          <p style={{ fontSize: "0.78rem", color: "#52525b", marginBottom: "0.75rem", lineHeight: 1.45 }}>
            Rendered by Jupyter Nbviewer (read-only). First load can take a few seconds.
          </p>
          <div
            style={{
              borderRadius: "0.5rem",
              overflow: "hidden",
              border: "1px solid #27272a",
              background: "#0c0c12",
              minHeight: "min(70vh, 720px)",
            }}
          >
            <iframe
              key={nbviewerUrl}
              title={`Nbviewer: ${activeNotebook.label}`}
              src={nbviewerUrl}
              style={{ width: "100%", height: "min(70vh, 720px)", border: "none", display: "block" }}
              loading="lazy"
            />
          </div>
        </div>
      )}

      {tab === "data" && (
        <div style={s.card}>
          <h3 style={{ marginTop: 0 }}>Hypothyroid dataset</h3>
          <p style={{ color: "#a1a1aa", lineHeight: 1.6 }}>
            <code style={{ color: "#94a3b8" }}>hypothyroid.arff</code> (UCI-style): numeric fields (age, T3, TSH, TT4,
            FTI, T4U, …) and categorical attributes. Response: <strong style={{ color: "#e4e4e7" }}>binaryClass</strong>.
          </p>
          <p style={{ color: "#a1a1aa", lineHeight: 1.6 }}>
            Reported challenges in the practica: many <strong style={{ color: "#e4e4e7" }}>NaN</strong> in key labs,
            dropped all-NaN column (TBG), outliers in age, and <strong style={{ color: "#e4e4e7" }}>imbalanced</strong>{" "}
            boolean features — addressed with imputation, preprocessing, and appropriate metrics (F1, ROC-AUC, etc.).
          </p>
        </div>
      )}

      {tab === "models" && (
        <div style={s.card}>
          <h3 style={{ marginTop: 0 }}>Algorithms explored</h3>
          <ul style={{ color: "#a1a1aa", lineHeight: 1.85, paddingLeft: "1.25rem", margin: 0 }}>
            {MODELS.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      {tab === "run" && (
        <div style={s.card}>
          <h3 style={{ marginTop: 0 }}>Run the notebooks</h3>
          <pre style={s.code}>{`git clone https://github.com/cuberhaus/APA_Practica.git
cd APA_Practica
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
jupyter lab PracticaAPA-Hipotiroidismo-PolCasacubertaMartaGranero.ipynb`}</pre>
          <p style={{ fontSize: "0.8rem", color: "#71717a", marginTop: "1rem", marginBottom: 0 }}>
            Repo also includes linear-model-focused notebooks and <code>PracticaHipotiroidismo/</code> bundle.
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
            Authors
          </div>
          <div style={{ fontSize: "0.9rem", color: "#d4d4d8", marginTop: "0.25rem" }}>
            Pol Casacuberta Gil · Marta Granero i Martí
          </div>
        </div>
        <a href={GH} target="_blank" rel="noopener noreferrer" style={s.link}>
          View on GitHub
        </a>
      </div>
    </div>
  );
}
