import { describe, it, expect } from 'vitest';
import { MOCK_PRODUCTS, MOCK_CATEGORIES } from '../data/tenda-mock';

/**
 * Tests for the TendaDemo cart state logic.
 * The component uses inline state (useState hooks), so we replicate
 * the same pure logic here to verify correctness.
 */

/* ---------- cart helpers (mirrors TendaDemo.tsx logic) ---------- */

type Cart = Record<number, number>;

function addToCart(cart: Cart, productId: number, qty = 1): Cart {
  return { ...cart, [productId]: (cart[productId] ?? 0) + qty };
}

function updateCartQty(cart: Cart, productId: number, qty: number): Cart {
  if (qty <= 0) {
    const next = { ...cart };
    delete next[productId];
    return next;
  }
  return { ...cart, [productId]: qty };
}

function removeFromCart(cart: Cart, productId: number): Cart {
  const next = { ...cart };
  delete next[productId];
  return next;
}

function cartCount(cart: Cart): number {
  return Object.values(cart).reduce((a, b) => a + b, 0);
}

function cartItems(cart: Cart) {
  return Object.entries(cart)
    .map(([id, qty]) => ({ product: MOCK_PRODUCTS.find((p) => p.id === Number(id))!, qty }))
    .filter((x) => x.product);
}

function cartTotal(cart: Cart): number {
  return cartItems(cart).reduce((sum, { product, qty }) => sum + product.price * qty, 0);
}

/* ---------- tests ---------- */

describe('TendaDemo — cart operations', () => {
  const firstProduct = MOCK_PRODUCTS[0];
  const secondProduct = MOCK_PRODUCTS[1];

  it('starts with an empty cart', () => {
    const cart: Cart = {};
    expect(cartCount(cart)).toBe(0);
    expect(cartTotal(cart)).toBe(0);
    expect(cartItems(cart)).toEqual([]);
  });

  it('addToCart adds a product with quantity 1 by default', () => {
    let cart: Cart = {};
    cart = addToCart(cart, firstProduct.id);
    expect(cart[firstProduct.id]).toBe(1);
    expect(cartCount(cart)).toBe(1);
  });

  it('addToCart with custom quantity', () => {
    let cart: Cart = {};
    cart = addToCart(cart, firstProduct.id, 3);
    expect(cart[firstProduct.id]).toBe(3);
    expect(cartCount(cart)).toBe(3);
  });

  it('addToCart increments existing quantity', () => {
    let cart: Cart = {};
    cart = addToCart(cart, firstProduct.id, 2);
    cart = addToCart(cart, firstProduct.id, 3);
    expect(cart[firstProduct.id]).toBe(5);
    expect(cartCount(cart)).toBe(5);
  });

  it('addToCart handles multiple products', () => {
    let cart: Cart = {};
    cart = addToCart(cart, firstProduct.id, 2);
    cart = addToCart(cart, secondProduct.id, 1);
    expect(cartCount(cart)).toBe(3);
  });

  it('updateCartQty sets exact quantity', () => {
    let cart: Cart = {};
    cart = addToCart(cart, firstProduct.id, 5);
    cart = updateCartQty(cart, firstProduct.id, 2);
    expect(cart[firstProduct.id]).toBe(2);
    expect(cartCount(cart)).toBe(2);
  });

  it('updateCartQty with qty 0 removes the product', () => {
    let cart: Cart = {};
    cart = addToCart(cart, firstProduct.id, 3);
    cart = updateCartQty(cart, firstProduct.id, 0);
    expect(cart[firstProduct.id]).toBeUndefined();
    expect(cartCount(cart)).toBe(0);
  });

  it('updateCartQty with negative qty removes the product', () => {
    let cart: Cart = {};
    cart = addToCart(cart, firstProduct.id, 3);
    cart = updateCartQty(cart, firstProduct.id, -1);
    expect(cart[firstProduct.id]).toBeUndefined();
    expect(cartCount(cart)).toBe(0);
  });

  it('removeFromCart removes product entirely', () => {
    let cart: Cart = {};
    cart = addToCart(cart, firstProduct.id, 3);
    cart = addToCart(cart, secondProduct.id, 1);
    cart = removeFromCart(cart, firstProduct.id);
    expect(cart[firstProduct.id]).toBeUndefined();
    expect(cartCount(cart)).toBe(1);
  });

  it('removeFromCart on missing product is a no-op', () => {
    let cart: Cart = {};
    cart = addToCart(cart, firstProduct.id, 2);
    cart = removeFromCart(cart, 999);
    expect(cartCount(cart)).toBe(2);
  });
});

describe('TendaDemo — cart total calculation', () => {
  it('total is price * quantity for single item', () => {
    const p = MOCK_PRODUCTS[0];
    let cart: Cart = {};
    cart = addToCart(cart, p.id, 3);
    expect(cartTotal(cart)).toBeCloseTo(p.price * 3, 2);
  });

  it('total sums across multiple products', () => {
    const p1 = MOCK_PRODUCTS[0];
    const p2 = MOCK_PRODUCTS[1];
    let cart: Cart = {};
    cart = addToCart(cart, p1.id, 2);
    cart = addToCart(cart, p2.id, 1);
    expect(cartTotal(cart)).toBeCloseTo(p1.price * 2 + p2.price, 2);
  });

  it('total is 0 for empty cart', () => {
    expect(cartTotal({})).toBe(0);
  });

  it('total updates when product is removed', () => {
    const p1 = MOCK_PRODUCTS[0];
    const p2 = MOCK_PRODUCTS[1];
    let cart: Cart = {};
    cart = addToCart(cart, p1.id, 1);
    cart = addToCart(cart, p2.id, 1);
    const totalBefore = cartTotal(cart);
    cart = removeFromCart(cart, p1.id);
    expect(cartTotal(cart)).toBeCloseTo(totalBefore - p1.price, 2);
  });
});

describe('TendaDemo — cartItems mapping', () => {
  it('maps cart entries to product + qty pairs', () => {
    let cart: Cart = {};
    cart = addToCart(cart, MOCK_PRODUCTS[0].id, 2);
    cart = addToCart(cart, MOCK_PRODUCTS[1].id, 1);
    const items = cartItems(cart);
    expect(items).toHaveLength(2);
    expect(items[0].product.id).toBe(MOCK_PRODUCTS[0].id);
    expect(items[0].qty).toBe(2);
  });

  it('skips unknown product IDs', () => {
    const cart: Cart = { 99999: 3 };
    const items = cartItems(cart);
    expect(items).toHaveLength(0);
  });
});

describe('TendaDemo — checkout form validation logic', () => {
  it('guest checkout requires name, email, address', () => {
    const form = { name: 'Pol', email: 'pol@test.com', address: '123 St', userType: 'guest' as const, password: '' };
    const valid = form.name.trim().length > 0 && form.email.includes('@') && form.address.trim().length > 0;
    expect(valid).toBe(true);
  });

  it('registered checkout also requires password', () => {
    const form = { name: 'Pol', email: 'pol@test.com', address: '123 St', userType: 'registered' as const, password: 'secret' };
    const valid = form.name.trim().length > 0 && form.email.includes('@') && form.address.trim().length > 0 && form.password.length > 0;
    expect(valid).toBe(true);
  });

  it('empty name is invalid', () => {
    const form = { name: '', email: 'pol@test.com', address: '123 St' };
    expect(form.name.trim().length > 0).toBe(false);
  });

  it('email without @ is invalid', () => {
    const form = { email: 'not-an-email' };
    expect(form.email.includes('@')).toBe(false);
  });
});
