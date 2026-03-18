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
    worker = new Worker(new URL("./plate-worker.ts", import.meta.url));
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

function loadImageData(src: string): Promise<{ data: Uint8ClampedArray; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const id = ctx.getImageData(0, 0, c.width, c.height);
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
    w.postMessage({ type: "process", image, font });
  });
}
