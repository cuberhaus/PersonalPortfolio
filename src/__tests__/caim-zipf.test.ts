import { describe, it, expect } from 'vitest';
import { fitZipf, countWords } from '../lib/caim/zipf-fit';
import { getCorpusData } from '../lib/caim/zipf-data';

// --- countWords ---

describe('countWords — tokenization', () => {
  it('counts word frequencies correctly', () => {
    const result = countWords('the cat sat the');
    expect(result).toEqual([
      { word: 'the', frequency: 2 },
      { word: 'cat', frequency: 1 },
      { word: 'sat', frequency: 1 },
    ]);
  });

  it('is case-insensitive', () => {
    const result = countWords('Hello HELLO hello');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ word: 'hello', frequency: 3 });
  });

  it('strips punctuation', () => {
    const result = countWords('hello, world! hello.');
    expect(result).toEqual([
      { word: 'hello', frequency: 2 },
      { word: 'world', frequency: 1 },
    ]);
  });

  it('returns empty array for empty input', () => {
    expect(countWords('')).toEqual([]);
  });

  it('returns empty array for whitespace-only input', () => {
    expect(countWords('   \n\t  ')).toEqual([]);
  });

  it('handles single word', () => {
    const result = countWords('hello');
    expect(result).toEqual([{ word: 'hello', frequency: 1 }]);
  });

  it('handles accented characters', () => {
    const result = countWords('café café résumé');
    expect(result[0]).toEqual({ word: 'café', frequency: 2 });
    expect(result[1]).toEqual({ word: 'résumé', frequency: 1 });
  });

  it('sorts by frequency descending then alphabetically', () => {
    const result = countWords('c a b a b c c');
    expect(result[0].word).toBe('c');
    expect(result[1].word).toBe('a');
    expect(result[2].word).toBe('b');
  });
});

// --- fitZipf ---

describe('fitZipf — perfect Zipf distribution', () => {
  it('recovers parameters for a perfect power law', () => {
    // Generate f(rank) = 1000 / rank^1.0 (b=0)
    const freqs = Array.from({ length: 100 }, (_, i) => Math.round(1000 / (i + 1)));
    const result = fitZipf(freqs);
    expect(result.a).toBeGreaterThan(0.8);
    expect(result.a).toBeLessThan(1.2);
    expect(result.rSquared).toBeGreaterThan(0.95);
  });

  it('handles steep Zipf distribution (a ≈ 2)', () => {
    const freqs = Array.from({ length: 100 }, (_, i) => Math.round(50000 / Math.pow(i + 1, 2)));
    const result = fitZipf(freqs);
    expect(result.a).toBeGreaterThan(1.5);
    expect(result.rSquared).toBeGreaterThan(0.9);
  });
});

describe('fitZipf — parameter constraints', () => {
  it('params a and c are positive', () => {
    const freqs = [100, 50, 33, 25, 20, 17, 14, 12, 11, 10];
    const result = fitZipf(freqs);
    expect(result.a).toBeGreaterThan(0);
    expect(result.c).toBeGreaterThan(0);
  });

  it('R² is in [0, 1]', () => {
    const freqs = [100, 50, 33, 25, 20, 17, 14, 12, 11, 10];
    const result = fitZipf(freqs);
    expect(result.rSquared).toBeGreaterThanOrEqual(0);
    expect(result.rSquared).toBeLessThanOrEqual(1);
  });

  it('fitted array has same length as input', () => {
    const freqs = [100, 50, 33, 25, 20];
    const result = fitZipf(freqs);
    expect(result.fitted).toHaveLength(freqs.length);
  });
});

describe('fitZipf — edge cases', () => {
  it('handles single-element input', () => {
    const result = fitZipf([100]);
    expect(result.fitted).toHaveLength(1);
  });

  it('handles two-element input', () => {
    const result = fitZipf([100, 50]);
    expect(result.fitted).toHaveLength(2);
  });

  it('handles uniform frequencies', () => {
    const freqs = Array(50).fill(100);
    const result = fitZipf(freqs);
    expect(result.fitted).toHaveLength(50);
    // R² could be low or 0 for uniform data
    expect(result.rSquared).toBeGreaterThanOrEqual(0);
  });
});

describe('fitZipf — real corpus data', () => {
  for (const corpus of ['novels', 'news', 'abstracts'] as const) {
    it(`fits ${corpus} corpus with R² > 0.8`, () => {
      const data = getCorpusData(corpus);
      const freqs = data.map((d) => d.frequency);
      const result = fitZipf(freqs);
      expect(result.rSquared).toBeGreaterThan(0.8);
      expect(result.a).toBeGreaterThan(0);
      expect(result.c).toBeGreaterThan(0);
    });
  }
});
