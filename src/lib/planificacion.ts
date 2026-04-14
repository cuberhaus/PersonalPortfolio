export const CITY_COLORS = [
  "var(--accent-start)",
  "var(--accent-end)",
  "#22c55e",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
];

export function cityColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return CITY_COLORS[Math.abs(h) % CITY_COLORS.length];
}

export interface MockPlanStep {
  action: string;
  from: string;
  to: string;
  flight: string;
  hotel: string;
  days: number;
  interest: number;
}

export const MOCK_PLAN: MockPlanStep[] = [
  { action: "(anadir_ciudad cg1 c1 vg1 h1 dias4)", from: "cg1", to: "c1", flight: "vg1", hotel: "h1", days: 4, interest: 1 },
  { action: "(anadir_ciudad c1 c2 v1 h2 dias4)", from: "c1", to: "c2", flight: "v1", hotel: "h2", days: 4, interest: 2 },
  { action: "(anadir_ciudad c2 c3 v2 h3 dias2)", from: "c2", to: "c3", flight: "v2", hotel: "h3", days: 2, interest: 3 },
];

export function planTotalDays(plan: MockPlanStep[]): number {
  return plan.reduce((sum, s) => sum + s.days, 0);
}

export function planTotalInterest(plan: MockPlanStep[]): number {
  return plan.reduce((sum, s) => sum + s.interest, 0);
}

export function planRoute(plan: MockPlanStep[]): string[] {
  if (plan.length === 0) return [];
  const route = [plan[0].from];
  for (const step of plan) route.push(step.to);
  return route;
}
