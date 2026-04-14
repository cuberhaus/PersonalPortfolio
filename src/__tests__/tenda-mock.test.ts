import { describe, it, expect } from 'vitest';
import { MOCK_CATEGORIES, MOCK_PRODUCTS } from '../data/tenda-mock';

describe('Tenda mock data', () => {
  it('every product references a valid category', () => {
    const catIds = new Set(MOCK_CATEGORIES.map((c) => c.id));
    for (const p of MOCK_PRODUCTS) {
      expect(catIds, `product "${p.name}" has invalid categoryId ${p.categoryId}`).toContain(p.categoryId);
    }
  });

  it('product IDs are unique', () => {
    const ids = MOCK_PRODUCTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('category IDs are unique', () => {
    const ids = MOCK_CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every product has a positive price and non-negative stock', () => {
    for (const p of MOCK_PRODUCTS) {
      expect(p.price).toBeGreaterThan(0);
      expect(p.stock).toBeGreaterThanOrEqual(0);
    }
  });

  it('every category has at least one product', () => {
    for (const cat of MOCK_CATEGORIES) {
      const products = MOCK_PRODUCTS.filter((p) => p.categoryId === cat.id);
      expect(products.length, `category "${cat.name}" has no products`).toBeGreaterThan(0);
    }
  });

  it('every product has a non-empty name and description', () => {
    for (const p of MOCK_PRODUCTS) {
      expect(p.name.trim().length).toBeGreaterThan(0);
      expect(p.description.trim().length).toBeGreaterThan(0);
    }
  });
});
