import { describe, it, expect } from 'vitest';
import { computeMandelbrot, jacobiStep, initHeatGrid, computePi } from '../lib/par-kernels';

describe('computeMandelbrot', () => {
  it('returns correct dimensions', () => {
    const pixels = computeMandelbrot(10, 10, 100, 0, 0, 2);
    expect(pixels.length).toBe(100);
  });

  it('center of set reaches maxIter', () => {
    // (0, 0) is inside the Mandelbrot set → should reach maxIter
    const pixels = computeMandelbrot(1, 1, 256, 0, 0, 0.001);
    expect(pixels[0]).toBe(256);
  });

  it('far-away point diverges quickly', () => {
    // (10, 10) is far outside → should diverge in very few iterations
    const pixels = computeMandelbrot(1, 1, 1000, 10, 10, 0.001);
    expect(pixels[0]).toBeLessThan(5);
  });

  it('all pixels are positive', () => {
    const pixels = computeMandelbrot(50, 50, 64, -0.5, 0, 1.5);
    for (let i = 0; i < pixels.length; i++) {
      expect(pixels[i]).toBeGreaterThan(0);
    }
  });
});

describe('jacobiStep', () => {
  it('returns residual > 0 for first step with nonzero boundary', () => {
    const u = initHeatGrid(8, 8);
    const { residual } = jacobiStep(u, 8, 8);
    expect(residual).toBeGreaterThan(0);
  });

  it('residual decreases monotonically over several steps', () => {
    let u = initHeatGrid(16, 16);
    const residuals: number[] = [];
    for (let i = 0; i < 20; i++) {
      const result = jacobiStep(u, 16, 16);
      residuals.push(result.residual);
      u = result.unew;
    }
    // After a few initial steps, residual should be decreasing
    for (let i = 2; i < residuals.length; i++) {
      expect(residuals[i]).toBeLessThanOrEqual(residuals[i - 1] * 1.01); // small tolerance
    }
  });

  it('preserves boundary conditions', () => {
    const u = initHeatGrid(8, 8);
    const { unew } = jacobiStep(u, 8, 8);
    // Top row should still be 1.0
    for (let j = 0; j < 8; j++) {
      expect(unew[j]).toBe(1.0);
    }
    // Bottom row should still be 0.0
    for (let j = 0; j < 8; j++) {
      expect(unew[7 * 8 + j]).toBe(0.0);
    }
  });

  it('returns zero residual on uniform grid', () => {
    const u = new Float64Array(16); // all zeros, 4x4
    const { residual } = jacobiStep(u, 4, 4);
    expect(residual).toBe(0);
  });
});

describe('initHeatGrid', () => {
  it('has correct dimensions', () => {
    const u = initHeatGrid(10, 10);
    expect(u.length).toBe(100);
  });

  it('top row is 1.0, rest is 0.0', () => {
    const u = initHeatGrid(5, 5);
    for (let j = 0; j < 5; j++) {
      expect(u[j]).toBe(1.0);
    }
    for (let i = 5; i < 25; i++) {
      expect(u[i]).toBe(0.0);
    }
  });
});

describe('computePi', () => {
  it('converges to pi within 1e-4 for 100000 steps', () => {
    const pi = computePi(100000);
    expect(Math.abs(pi - Math.PI)).toBeLessThan(1e-4);
  });

  it('converges to pi within 1e-6 for 10000000 steps', () => {
    const pi = computePi(10000000);
    expect(Math.abs(pi - Math.PI)).toBeLessThan(1e-6);
  });

  it('accuracy improves with more steps', () => {
    const err1 = Math.abs(computePi(1000) - Math.PI);
    const err2 = Math.abs(computePi(100000) - Math.PI);
    expect(err2).toBeLessThan(err1);
  });

  it('returns a positive number', () => {
    expect(computePi(10)).toBeGreaterThan(0);
  });
});
