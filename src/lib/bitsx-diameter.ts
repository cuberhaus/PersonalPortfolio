export interface DiameterZone {
  label: string;
  color: string;
  detail: string;
}

export interface DiameterLabels {
  typical: { label: string; detail: string };
  followup: { label: string; detail: string };
  concern: { label: string; detail: string };
}

export function diameterZone(mm: number, labels: DiameterLabels): DiameterZone {
  if (mm < 30)
    return { label: labels.typical.label, color: "#22c55e", detail: labels.typical.detail };
  if (mm < 45)
    return { label: labels.followup.label, color: "#eab308", detail: labels.followup.detail };
  return { label: labels.concern.label, color: "#ef4444", detail: labels.concern.detail };
}

export function sliderPosition(mm: number, min = 18, max = 65): number {
  return ((mm - min) / (max - min)) * 100;
}
