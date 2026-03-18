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

/** Max dimension before sending to worker (matches plate pipeline; avoids huge postMessage in dev). */
const MAX_PIPELINE_DIM = 1400;

function needsCrossOrigin(src: string): boolean {
  if (src.startsWith("blob:") || src.startsWith("data:")) return false;
  try {
    const u = new URL(src, typeof window !== "undefined" ? window.location.href : "http://localhost/");
    return u.origin !== window.location.origin;
  } catch {
    return false;
  }
}

function loadImageData(src: string): Promise<{ data: Uint8ClampedArray; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (needsCrossOrigin(src)) img.crossOrigin = "anonymous";
    img.onload = () => {
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      const M = Math.max(w, h);
      if (M > MAX_PIPELINE_DIM) {
        const s = MAX_PIPELINE_DIM / M;
        w = Math.round(w * s);
        h = Math.round(h * s);
      }
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      const id = ctx.getImageData(0, 0, w, h);
      resolve({ data: id.data, width: id.width, height: id.height });
    };
    img.onerror = () => reject(new Error(`Failed to load: ${src}`));
    img.src = src;
  });
}

export async function runWorkerPipeline(
  imageSrc: string,
  fontSrc: string
): Promise<WorkerPipelineResult> {
  await initWorker();
  const [image, font] = await Promise.all([loadImageData(imageSrc), loadImageData(fontSrc)]);

  const w = getWorker();
  const payload = {
    type: "process" as const,
    image: { data: image.data, width: image.width, height: image.height },
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
      w.postMessage(payload, [image.data.buffer, font.data.buffer]);
    } catch {
      w.postMessage(payload);
    }
  });
}
