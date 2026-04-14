/**
 * Zipf curve fitting and word-count utilities.
 * Port of CAIM/web/backend/zipf.py to TypeScript (no scipy needed).
 */

export interface ZipfFitResult {
  /** Fitted values at each rank */
  fitted: number[];
  /** Zipf exponent */
  a: number;
  /** Offset parameter */
  b: number;
  /** Scale parameter */
  c: number;
  /** Coefficient of determination */
  rSquared: number;
}

export interface WordCount {
  word: string;
  frequency: number;
}

/**
 * Zipf function: f(rank) = c / (rank + b)^a
 */
function zipfFunc(rank: number, a: number, b: number, c: number): number {
  return c / Math.pow(rank + b, a);
}

/**
 * Fit Zipf parameters to observed frequency data using log-transformed
 * linear regression for a,c and grid search for b.
 *
 * For the model f(r) = c / (r + b)^a, taking logs:
 *   log(f) = log(c) - a * log(r + b)
 * This is linear in log(c) and a for a given b.
 */
export function fitZipf(frequencies: number[]): ZipfFitResult {
  const n = frequencies.length;
  if (n < 2) {
    return { fitted: [...frequencies], a: 1, b: 0, c: frequencies[0] ?? 1, rSquared: 0 };
  }

  const ranks = new Float64Array(n);
  for (let i = 0; i < n; i++) ranks[i] = i + 1;

  const logFreq = new Float64Array(n);
  for (let i = 0; i < n; i++) logFreq[i] = Math.log(Math.max(frequencies[i], 1));

  let bestA = 1, bestB = 0, bestC = frequencies[0], bestRSq = -Infinity;

  // Grid search over b, linear regression for a and log(c)
  const bCandidates = [0, 0.5, 1, 1.5, 2, 3, 5, 10, 20, 50];
  for (const b of bCandidates) {
    const logRanks = new Float64Array(n);
    for (let i = 0; i < n; i++) logRanks[i] = Math.log(ranks[i] + b);

    // Linear regression: logFreq = intercept - slope * logRanks
    let sumX = 0, sumY = 0, sumXX = 0, sumXY = 0;
    for (let i = 0; i < n; i++) {
      sumX += logRanks[i];
      sumY += logFreq[i];
      sumXX += logRanks[i] * logRanks[i];
      sumXY += logRanks[i] * logFreq[i];
    }
    const denom = n * sumXX - sumX * sumX;
    if (Math.abs(denom) < 1e-15) continue;

    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;

    const a = -slope;
    const c = Math.exp(intercept);
    if (a < 0.1 || c < 0) continue;

    // Compute R²
    const fitted = new Float64Array(n);
    let ssRes = 0, ssTot = 0;
    const meanFreq = frequencies.reduce((s, v) => s + v, 0) / n;
    for (let i = 0; i < n; i++) {
      fitted[i] = zipfFunc(ranks[i], a, b, c);
      ssRes += (frequencies[i] - fitted[i]) ** 2;
      ssTot += (frequencies[i] - meanFreq) ** 2;
    }
    const rSq = ssTot > 0 ? 1 - ssRes / ssTot : 0;

    if (rSq > bestRSq) {
      bestA = a;
      bestB = b;
      bestC = c;
      bestRSq = rSq;
    }
  }

  // Refine b with finer grid around best
  const fineMin = Math.max(0, bestB - 5);
  const fineMax = bestB + 5;
  for (let b = fineMin; b <= fineMax; b += 0.25) {
    const logRanks = new Float64Array(n);
    for (let i = 0; i < n; i++) logRanks[i] = Math.log(ranks[i] + b);

    let sumX = 0, sumY = 0, sumXX = 0, sumXY = 0;
    for (let i = 0; i < n; i++) {
      sumX += logRanks[i];
      sumY += logFreq[i];
      sumXX += logRanks[i] * logRanks[i];
      sumXY += logRanks[i] * logFreq[i];
    }
    const denom = n * sumXX - sumX * sumX;
    if (Math.abs(denom) < 1e-15) continue;

    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;

    const a = -slope;
    const c = Math.exp(intercept);
    if (a < 0.1 || c < 0) continue;

    let ssRes = 0, ssTot = 0;
    const meanFreq = frequencies.reduce((s, v) => s + v, 0) / n;
    for (let i = 0; i < n; i++) {
      const f = zipfFunc(ranks[i], a, b, c);
      ssRes += (frequencies[i] - f) ** 2;
      ssTot += (frequencies[i] - meanFreq) ** 2;
    }
    const rSq = ssTot > 0 ? 1 - ssRes / ssTot : 0;

    if (rSq > bestRSq) {
      bestA = a;
      bestB = b;
      bestC = c;
      bestRSq = rSq;
    }
  }

  const fitted: number[] = [];
  for (let i = 0; i < n; i++) {
    fitted.push(zipfFunc(ranks[i], bestA, bestB, bestC));
  }

  return {
    fitted,
    a: Math.round(bestA * 10000) / 10000,
    b: Math.round(bestB * 10000) / 10000,
    c: Math.round(bestC * 10000) / 10000,
    rSquared: Math.round(Math.max(0, Math.min(1, bestRSq)) * 1000000) / 1000000,
  };
}

/**
 * Tokenize text into word-frequency pairs, sorted descending by frequency.
 */
export function countWords(text: string): WordCount[] {
  const tokens = text.toLowerCase().match(/[a-zA-Z\u00C0-\u024F]+/g);
  if (!tokens || tokens.length === 0) return [];

  const counts = new Map<string, number>();
  for (const t of tokens) {
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([word, frequency]) => ({ word, frequency }))
    .sort((a, b) => b.frequency - a.frequency || a.word.localeCompare(b.word));
}
