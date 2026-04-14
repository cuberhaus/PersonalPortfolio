import { describe, it, expect } from 'vitest';
import { diameterZone, sliderPosition, type DiameterLabels } from '../lib/bitsx-diameter';

const labels: DiameterLabels = {
  typical: { label: "Typical", detail: "detail-typical" },
  followup: { label: "Follow-up", detail: "detail-followup" },
  concern: { label: "Concern", detail: "detail-concern" },
};

describe('BitsXLaMarato — diameter zone classification', () => {
  it('< 30mm → typical (green)', () => {
    const z = diameterZone(20, labels);
    expect(z.label).toBe("Typical");
    expect(z.color).toBe("#22c55e");
  });

  it('29.9mm → still typical', () => {
    expect(diameterZone(29.9, labels).label).toBe("Typical");
  });

  it('30mm → follow-up (yellow)', () => {
    const z = diameterZone(30, labels);
    expect(z.label).toBe("Follow-up");
    expect(z.color).toBe("#eab308");
  });

  it('44mm → still follow-up', () => {
    expect(diameterZone(44, labels).label).toBe("Follow-up");
  });

  it('45mm → concern (red)', () => {
    const z = diameterZone(45, labels);
    expect(z.label).toBe("Concern");
    expect(z.color).toBe("#ef4444");
  });

  it('65mm → concern', () => {
    expect(diameterZone(65, labels).label).toBe("Concern");
  });

  it('0mm → typical', () => {
    expect(diameterZone(0, labels).label).toBe("Typical");
  });

  it('detail text is forwarded from labels', () => {
    expect(diameterZone(50, labels).detail).toBe("detail-concern");
  });
});

describe('BitsXLaMarato — slider position', () => {
  it('minimum value → 0%', () => {
    expect(sliderPosition(18)).toBeCloseTo(0);
  });

  it('maximum value → 100%', () => {
    expect(sliderPosition(65)).toBeCloseTo(100);
  });

  it('midpoint is ~50%', () => {
    const mid = (18 + 65) / 2;
    expect(sliderPosition(mid)).toBeCloseTo(50, 0);
  });

  it('custom range works', () => {
    expect(sliderPosition(50, 0, 100)).toBeCloseTo(50);
  });
});
