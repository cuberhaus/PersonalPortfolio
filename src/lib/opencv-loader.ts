// Main-thread API for the plate-detection Web Worker.
// The worker now uses pure JS image processing — no external downloads needed.

export type LoadProgress = {
  phase: "downloading" | "initializing" | "ready";
  percent: number;
  loadedMB?: number;
  totalMB?: number;
};

export interface ImageBuffer {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  label: string;
}

export interface WorkerPipelineResult {
  plateText: string;
  stage1: ImageBuffer[];
  stage2: ImageBuffer[];
  stage3: ImageBuffer[];
  charImages: ImageBuffer[];
}

type ProgressCb = (p: LoadProgress) => void;

let worker: Worker | null = null;
let readyPromise: Promise<void> | null = null;

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./plate-worker.ts", import.meta.url), { type: "module" });
  }
  return worker;
}

export function initWorker(onProgress?: ProgressCb): Promise<void> {
  if (readyPromise) return readyPromise;

  const w = getWorker();
  readyPromise = new Promise<void>((resolve, reject) => {
    const handler = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.type === "progress") {
        onProgress?.(msg as LoadProgress);
      } else if (msg.type === "ready") {
        w.removeEventListener("message", handler);
        resolve();
      } else if (msg.type === "error") {
        w.removeEventListener("message", handler);
        reject(new Error(msg.message));
      }
    };
    w.addEventListener("message", handler);
    w.postMessage({ type: "init" });
  });

  return readyPromise;
}

/** Plate localization only — keeps graph/CC work fast. */
const MAX_DETECT_DIM = 1400;
/** Character segmentation + template matching need sharper plate pixels. */
const MAX_OCR_DIM = 4200;

function needsCrossOrigin(src: string): boolean {
  if (src.startsWith("blob:") || src.startsWith("data:")) return false;
  try {
    const u = new URL(src, typeof window !== "undefined" ? window.location.href : "http://localhost/");
    return u.origin !== window.location.origin;
  } catch {
    return false;
  }
}

type Raster = { data: Uint8ClampedArray; width: number; height: number };

function drawScaled(img: HTMLImageElement, maxDim: number): Raster {
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  const M = Math.max(nw, nh);
  const s = M > maxDim ? maxDim / M : 1;
  const w = Math.round(nw * s);
  const h = Math.round(nh * s);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  const id = ctx.getImageData(0, 0, w, h);
  return { data: id.data, width: id.width, height: id.height };
}

/** One decode, two scales: fast plate find + sharp OCR crop. */
function loadDetectAndOcr(src: string): Promise<{ detect: Raster; ocr: Raster }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (needsCrossOrigin(src)) img.crossOrigin = "anonymous";
    img.onload = () => {
      const detect = drawScaled(img, MAX_DETECT_DIM);
      const ocr = drawScaled(img, MAX_OCR_DIM);
      resolve({ detect, ocr });
    };
    img.onerror = () => reject(new Error(`Failed to load: ${src}`));
    img.src = src;
  });
}

function loadFontRaster(src: string): Promise<Raster> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (needsCrossOrigin(src)) img.crossOrigin = "anonymous";
    img.onload = () => resolve(drawScaled(img, 4096));
    img.onerror = () => reject(new Error(`Failed to load: ${src}`));
    img.src = src;
  });
}

export async function runWorkerPipeline(
  imageSrc: string,
  fontSrc: string
): Promise<WorkerPipelineResult> {
  await initWorker();
  const [{ detect, ocr }, font] = await Promise.all([loadDetectAndOcr(imageSrc), loadFontRaster(fontSrc)]);

  const w = getWorker();
  const payload = {
    type: "process" as const,
    detect: { data: detect.data, width: detect.width, height: detect.height },
    ocr: { data: ocr.data, width: ocr.width, height: ocr.height },
    font: { data: font.data, width: font.width, height: font.height },
  };

  return new Promise((resolve, reject) => {
    const handler = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.type === "result") {
        w.removeEventListener("message", handler);
        resolve(msg as WorkerPipelineResult);
      } else if (msg.type === "error") {
        w.removeEventListener("message", handler);
        reject(new Error(msg.message));
      }
    };
    w.addEventListener("message", handler);
    try {
      w.postMessage(payload, [detect.data.buffer, ocr.data.buffer, font.data.buffer]);
    } catch {
      w.postMessage(payload);
    }
  });
}
