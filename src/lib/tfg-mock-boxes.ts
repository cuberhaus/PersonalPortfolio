export interface MockBox {
  x: number;
  y: number;
  w: number;
  h: number;
  score: number;
  label: string;
}

export const MOCK_BOXES: MockBox[] = [
  { x: 35, y: 30, w: 22, h: 25, score: 0.94, label: "polyp" },
  { x: 62, y: 55, w: 15, h: 18, score: 0.71, label: "polyp" },
];

export function filterByConfidence(
  boxes: MockBox[],
  threshold: number,
): MockBox[] {
  return boxes.filter((b) => b.score >= threshold);
}

export function barWidth(val: number, maxVal: number): number {
  return (val / maxVal) * 100;
}
