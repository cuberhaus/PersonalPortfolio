import { describe, it, expect } from 'vitest';
import modelResults from '../data/tfg-model-results.json';
import modelWeights from '../data/model_weights.json';
import pcaPoints from '../data/pca_points.json';

// ─── TFG polyp detection — HPO results ──────────────────────────

describe('TFG model results (tfg-model-results.json)', () => {
  it('has at least one result', () => {
    expect(modelResults.length).toBeGreaterThan(0);
  });

  it('IDs are unique', () => {
    const ids = modelResults.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('metrics are in valid ranges [0, 1]', () => {
    for (const r of modelResults) {
      for (const key of ['ap5095', 'ap50', 'ap75', 'ar100', 'f1'] as const) {
        const v = r[key];
        expect(v, `${key} out of range for id ${r.id}`).toBeGreaterThanOrEqual(0);
        expect(v, `${key} out of range for id ${r.id}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('hyperparameters are positive', () => {
    for (const r of modelResults) {
      expect(r.batchSize).toBeGreaterThan(0);
      expect(r.lr).toBeGreaterThan(0);
      expect(r.epochs).toBeGreaterThan(0);
    }
  });

  it('bestEpoch is within epoch range', () => {
    for (const r of modelResults) {
      expect(r.bestEpoch).toBeGreaterThanOrEqual(0);
      expect(r.bestEpoch).toBeLessThan(r.epochs);
    }
  });
});

// ─── APA practica — logistic regression weights ─────────────────

describe('Model weights (model_weights.json)', () => {
  it('has matching array lengths for features/scaler/coef', () => {
    const n = modelWeights.features.length;
    expect(modelWeights.scaler_mean).toHaveLength(n);
    expect(modelWeights.scaler_scale).toHaveLength(n);
    expect(modelWeights.coef).toHaveLength(n);
  });

  it('scaler_scale values are positive (no zero-variance features)', () => {
    for (const s of modelWeights.scaler_scale) {
      expect(s).toBeGreaterThan(0);
    }
  });

  it('feature names are non-empty strings', () => {
    for (const f of modelWeights.features) {
      expect(f.trim().length).toBeGreaterThan(0);
    }
  });
});

// ─── APA practica — PCA-projected test points ───────────────────

describe('PCA points (pca_points.json)', () => {
  it('has a reasonable number of points', () => {
    expect(pcaPoints.length).toBeGreaterThan(10);
  });

  it('every point has x, y, cls fields', () => {
    for (const p of pcaPoints) {
      expect(p).toHaveProperty('x');
      expect(p).toHaveProperty('y');
      expect(p).toHaveProperty('cls');
    }
  });

  it('x and y are in [0, 1] range (normalized)', () => {
    for (const p of pcaPoints) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(1);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(1);
    }
  });

  it('cls is either 0 or 1', () => {
    for (const p of pcaPoints) {
      expect([0, 1]).toContain(p.cls);
    }
  });

  it('has both classes represented', () => {
    const classes = new Set(pcaPoints.map((p) => p.cls));
    expect(classes.size).toBe(2);
  });
});
