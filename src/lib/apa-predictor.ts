import modelWeights from "../data/model_weights.json";

export interface Pt {
  x: number;
  y: number;
  cls: 0 | 1;
}

export function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

export function dist2(ax: number, ay: number, bx: number, by: number): number {
  return (ax - bx) ** 2 + (ay - by) ** 2;
}

export function knnVote(
  px: number,
  py: number,
  points: Pt[],
  k: number,
): { cls: 0 | 1; neighbors: Pt[] } {
  const sorted = [...points].sort(
    (a, b) => dist2(px, py, a.x, a.y) - dist2(px, py, b.x, b.y),
  );
  const neighbors = sorted.slice(0, k);
  let c0 = 0,
    c1 = 0;
  for (const n of neighbors) n.cls === 0 ? c0++ : c1++;
  const cls: 0 | 1 = c1 > c0 ? 1 : c0 > c1 ? 0 : neighbors[0].cls;
  return { cls, neighbors };
}

export function predict(
  age: number,
  tsh: number,
  tt4: number,
  t3: number,
): { isHypo: boolean; probability: number; z: number } {
  const vals = [age, tsh, tt4, t3];
  let z = modelWeights.intercept;
  for (let i = 0; i < 4; i++) {
    z +=
      ((vals[i] - modelWeights.scaler_mean[i]) / modelWeights.scaler_scale[i]) *
      modelWeights.coef[i];
  }
  const prob = 1 / (1 + Math.exp(-z));
  return { isHypo: z < 0, probability: prob, z };
}

export const absCoefs = modelWeights.coef.map(Math.abs);
export const maxCoef = Math.max(...absCoefs);
