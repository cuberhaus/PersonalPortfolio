import { useState, useRef, useEffect, useCallback } from "react";
import {
  initWorker,
  runWorkerPipeline,
  type ImageBuffer,
  type WorkerPipelineResult,
} from "../../lib/opencv-loader";

import { TRANSLATIONS, type DemoTranslations } from "../../i18n/demos/spmatriculas-demo";
import { useDemoLifecycle, useDebug } from "../../lib/useDebug";

type Lang = "en" | "es" | "ca";

const SAMPLES = [
  { file: "DSCN0408.jpg", plate: "zmz9157" },
  { file: "DSCN0412.jpg", plate: "yep7236" },
  { file: "DSCN0415.jpg", plate: "yhe2993" },
  { file: "IMG_0378.jpg", plate: "zme8325" },
  { file: "IMG_0380.jpg", plate: "zkk8153" },
  { file: "IMG_0384.jpg", plate: "iea5511" },
  { file: "IMG_0392.jpg", plate: "zza9341" },
  { file: "IMG_0414.jpg", plate: "izi2154" },
];

const FONT_PATH = "demos/matriculas/Greek-License-Plate-Font-2004.jpg";

type Status = "idle" | "processing" | "done" | "error";

const s = {
  wrapper: {
    fontFamily: "var(--font-sans, 'Inter', sans-serif)",
    color: "var(--text-primary)",
  },
  card: {
    background: "var(--bg-card)",
    border: "1px solid var(--border-color)",
    borderRadius: "0.75rem",
    padding: "1.5rem",
    marginBottom: "1.5rem",
  },
  h3: {
    fontSize: "1.1rem",
    fontWeight: 600,
    marginBottom: "1rem",
    color: "var(--text-primary)",
  } as React.CSSProperties,
  sampleGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
    gap: "0.75rem",
    marginBottom: "1rem",
  },
  sampleThumb: (selected: boolean) =>
    ({
      width: "100%",
      aspectRatio: "4/3",
      objectFit: "cover",
      borderRadius: "0.5rem",
      border: selected ? "2px solid var(--accent-start)" : "2px solid var(--border-color)",
      cursor: "pointer",
      transition: "border-color 0.2s, transform 0.2s",
      transform: selected ? "scale(1.03)" : "none",
    }) as React.CSSProperties,
  uploadBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    padding: "0.6rem 1.2rem",
    background: "linear-gradient(135deg, var(--accent-start), var(--accent-end))",
    color: "var(--text-primary)",
    border: "none",
    borderRadius: "0.5rem",
    fontSize: "0.85rem",
    fontWeight: 600,
    cursor: "pointer",
  } as React.CSSProperties,
  runBtn: {
    padding: "0.6rem 1.5rem",
    background: "linear-gradient(135deg, var(--accent-start), var(--accent-end))",
    color: "var(--text-primary)",
    border: "none",
    borderRadius: "0.5rem",
    fontSize: "0.9rem",
    fontWeight: 600,
    cursor: "pointer",
    marginTop: "0.75rem",
  } as React.CSSProperties,
  disabledBtn: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  stageRow: {
    display: "flex",
    gap: "0.75rem",
    overflowX: "auto",
    padding: "0.5rem 0",
  } as React.CSSProperties,
  stageImg: {
    maxHeight: "160px",
    borderRadius: "0.5rem",
    border: "1px solid var(--border-color)",
  },
  stageLabel: {
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
    marginTop: "0.3rem",
    textAlign: "center" as const,
  },
  resultBox: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    padding: "1rem 1.5rem",
    background: "var(--bg-secondary)",
    border: "1px solid var(--accent-start)",
    borderRadius: "0.75rem",
    marginBottom: "1rem",
  },
  plateText: {
    fontFamily: "monospace",
    fontSize: "2rem",
    fontWeight: 700,
    letterSpacing: "0.15em",
    color: "var(--accent-start)",
    textTransform: "uppercase" as const,
  },
  truthText: {
    fontFamily: "monospace",
    fontSize: "1rem",
    color: "var(--text-secondary)",
  },
  charRow: {
    display: "flex",
    gap: "0.35rem",
    alignItems: "center",
    flexWrap: "wrap" as const,
  },
  charImg: {
    height: "40px",
    borderRadius: "0.25rem",
    border: "1px solid var(--border-color)",
    background: "#000",
  },
  progressOuter: {
    width: "100%",
    height: "8px",
    background: "var(--border-color)",
    borderRadius: "4px",
    overflow: "hidden",
    marginTop: "0.5rem",
  },
  progressInner: (pct: number) =>
    ({
      height: "100%",
      width: `${pct}%`,
      background: "linear-gradient(90deg, var(--accent-start), var(--accent-end))",
      borderRadius: "4px",
      transition: "width 0.3s ease",
    }) as React.CSSProperties,
  loadingCard: {
    background: "var(--bg-card)",
    border: "1px solid var(--border-color)",
    borderRadius: "0.75rem",
    padding: "1.25rem 1.5rem",
    marginBottom: "1.5rem",
  },
  loadingHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "0.25rem",
    fontSize: "0.85rem",
  } as React.CSSProperties,
  processingDots: {
    display: "inline-flex",
    gap: "4px",
    alignItems: "center",
    marginLeft: "0.5rem",
  },
  infoCard: {
    background: "color-mix(in srgb, var(--accent-start) 8%, transparent)",
    border: "1px solid color-mix(in srgb, var(--accent-start) 20%, transparent)",
    borderRadius: "0.75rem",
    padding: "1.25rem",
    marginBottom: "1.5rem",
    fontSize: "0.85rem",
    lineHeight: 1.7,
    color: "var(--text-secondary)",
  },
  stageHeader: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "var(--text-secondary)",
    marginBottom: "0.5rem",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  } as React.CSSProperties,
  stepNum: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "22px",
    height: "22px",
    borderRadius: "50%",
    background: "var(--accent-start)",
    color: "var(--text-primary)",
    fontSize: "0.7rem",
    fontWeight: 700,
  },
};

function PulsingDots() {
  return (
    <span style={s.processingDots}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--accent-start)",
            animation: `pulse-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`@keyframes pulse-dot { 0%,80%,100% { opacity: 0.3; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1.2); } }`}</style>
    </span>
  );
}

function bufferToDataURL(buf: ImageBuffer): string {
  const canvas = document.createElement("canvas");
  canvas.width = buf.width;
  canvas.height = buf.height;
  const ctx = canvas.getContext("2d")!;
  ctx.putImageData(new ImageData(new Uint8ClampedArray(buf.data), buf.width, buf.height), 0, 0);
  return canvas.toDataURL();
}

function StageVis({ items }: { items: ImageBuffer[] }) {
  if (!items.length) return null;
  return (
    <div style={{ marginBottom: "1rem" }}>
      <div style={s.stageRow}>
        {items.map((item, i) => (
          <div key={i} style={{ flexShrink: 0 }}>
            <img src={bufferToDataURL(item)} style={s.stageImg} alt="" />
            <div style={s.stageLabel}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SPMatriculasDemo({ lang = "en" }: { lang?: Lang }) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  useDemoLifecycle('demo:matriculas', { lang });
  const log = useDebug('demo:matriculas');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedGT, setSelectedGT] = useState<string>("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<WorkerPipelineResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rawBase = (typeof import.meta !== "undefined" && (import.meta as any).env?.BASE_URL) || "/";
  const basePath = rawBase.endsWith("/") ? rawBase : rawBase + "/";

  useEffect(() => {
    initWorker().catch(() => { setError('Failed to initialize worker'); });
  }, []);

  const selectSample = useCallback((sample: (typeof SAMPLES)[number]) => {
    log.info('sample', { file: sample.file, plate: sample.plate });
    const path = `${basePath}demos/matriculas/samples/${sample.file}`;
    setSelectedImage(path);
    setSelectedGT(sample.plate);
    setResult(null);
  }, [basePath, log]);

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    log.info('upload', { name: file.name, size: file.size });
    const url = URL.createObjectURL(file);
    setSelectedImage(url);
    setSelectedGT("");
    setResult(null);
  }, [log]);

  const run = useCallback(async () => {
    if (!selectedImage) return;
    log.info('run', { hasGT: !!selectedGT });
    setError("");
    setResult(null);
    setStatus("processing");

    try {
      await initWorker();
      const fontPath = `${basePath}${FONT_PATH}`;
      const res = await runWorkerPipeline(selectedImage, fontPath);
      setResult(res);
      setStatus("done");
      log.info('ocr-done', { plate: res?.plate, gt: selectedGT, match: res?.plate === selectedGT });
    } catch (err: any) {
      setError(err.message || "Unknown error");
      setStatus("error");
      log.error('ocr-failed', { err: String(err) });
    }
  }, [selectedImage, basePath, selectedGT, log]);

  return (
    <div style={s.wrapper}>
      <div style={s.infoCard}>
        <strong>{t.howItWorks}</strong>{t.howDesc1}
        <strong>{t.howDesc2}</strong>{t.howDesc3}
        <strong>{t.howDesc4}</strong>{t.howDesc5}
        <strong>{t.howDesc6}</strong>{t.howDesc7}
      </div>

      <div style={s.card}>
        <h3 style={s.h3}>{t.selectImage}</h3>
        <div style={s.sampleGrid}>
          {SAMPLES.map((sample) => {
            const path = `${basePath}demos/matriculas/samples/${sample.file}`;
            return (
              <img
                key={sample.file}
                src={path}
                alt={sample.plate}
                style={s.sampleThumb(selectedImage === path)}
                onClick={() => selectSample(sample)}
                loading="lazy"
              />
            );
          })}
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          <button style={s.uploadBtn} onClick={() => fileInputRef.current?.click()}>
            {t.uploadOwn}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleUpload}
          />
          <button
            style={{
              ...s.runBtn,
              marginTop: 0,
              ...(!selectedImage || status === "processing" ? s.disabledBtn : {}),
            }}
            disabled={!selectedImage || status === "processing"}
            onClick={run}
          >
            {status === "processing" ? t.detecting : t.detectPlate}
          </button>
        </div>
      </div>

      {status === "processing" && (
        <div style={s.loadingCard}>
          <div style={{ ...s.loadingHeader, justifyContent: "flex-start" }}>
            <span style={{ color: "var(--text-primary)" }}>
              {t.analyzing}
              <PulsingDots />
            </span>
          </div>
          <div style={s.progressOuter}>
            <div
              style={{
                height: "100%",
                background: "linear-gradient(90deg, var(--accent-start), var(--accent-end))",
                borderRadius: "4px",
                animation: "indeterminate 1.5s ease-in-out infinite",
              }}
            />
          </div>
          <style>{`@keyframes indeterminate { 0% { width: 0%; margin-left: 0; } 50% { width: 60%; margin-left: 20%; } 100% { width: 0%; margin-left: 100%; } }`}</style>
        </div>
      )}
      {status === "error" && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            fontSize: "0.85rem",
            background: "var(--bg-secondary)",
            color: "var(--accent-end)",
          }}
        >
          {t.error} {error}
        </div>
      )}

      {result && (
        <>
          <div style={s.resultBox}>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                {t.detectedPlate}
              </div>
              <div style={s.plateText}>{result.plateText}</div>
            </div>
            {selectedGT && (
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                  {t.groundTruth}
                </div>
                <div style={s.truthText}>{selectedGT.toUpperCase()}</div>
                {result.plateText.toLowerCase() === selectedGT.toLowerCase() ? (
                  <span style={{ color: "var(--accent-start)", fontSize: "0.8rem" }}>{t.match}</span>
                ) : (
                  <span style={{ color: "var(--accent-end)", fontSize: "0.8rem" }}>{t.mismatch}</span>
                )}
              </div>
            )}
          </div>

          <div style={s.card}>
            <div style={s.stageHeader}>
              <span style={s.stepNum}>1</span> {t.stage1}
            </div>
            <StageVis items={result.stage1} />
          </div>

          {result.stage2.length > 0 && (
            <div style={s.card}>
              <div style={s.stageHeader}>
                <span style={s.stepNum}>2</span> {t.stage2}
              </div>
              <StageVis items={result.stage2} />
            </div>
          )}

          {result.charImages.length > 0 && (
            <div style={s.card}>
              <div style={s.stageHeader}>
                <span style={s.stepNum}>3</span> {t.stage3}
              </div>
              <div style={s.charRow}>
                {result.charImages.map((buf, i) => (
                  <div key={i} style={{ textAlign: "center" }}>
                    <img src={bufferToDataURL(buf)} style={s.charImg} alt="" />
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: "1rem",
                        fontWeight: 700,
                        color: "var(--accent-start)",
                        marginTop: "0.25rem",
                      }}
                    >
                      {result.plateText[i] || "?"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
