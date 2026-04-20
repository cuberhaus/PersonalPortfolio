import { useState, useCallback, useRef, useEffect } from "react";
import {
  MOCK_CATEGORIES,
  MOCK_PRODUCTS,
  type Category,
  type Product,
} from "../../data/tenda-mock";

type View = "home" | "category" | "product" | "cart" | "checkout";
import { TRANSLATIONS, type DemoTranslations } from "../../i18n/demos/tenda-demo";
import MockBanner from "./MockBanner";

type Lang = "en" | "es" | "ca";

const styles = {
  wrapper: {
    fontFamily: "var(--font-sans, 'Inter', sans-serif)",
    color: "var(--text-primary)",
    minHeight: "500px",
  },
  nav: {
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    padding: "0.75rem 1rem",
    background: "var(--bg-card)",
    border: "1px solid var(--border-color)",
    borderRadius: "0.75rem",
    marginBottom: "1.5rem",
    flexWrap: "wrap" as const,
    gap: "0.5rem",
  },
  navTitle: { fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" },
  navLinks: { display: "flex" as const, gap: "0.75rem", alignItems: "center" as const },
  link: {
    color: "var(--text-secondary)",
    fontSize: "0.85rem",
    cursor: "pointer",
    textDecoration: "none",
    padding: "0.35rem 0.5rem",
    borderRadius: "0.35rem",
    transition: "all 0.15s",
  },
  linkHover: { color: "var(--accent-start)" },
  cartBadge: {
    background: "linear-gradient(135deg, var(--accent-start), var(--accent-end))",
    color: "var(--text-primary)",
    fontSize: "0.7rem",
    padding: "0.15rem 0.45rem",
    borderRadius: "999px",
    marginLeft: "0.25rem",
  },
  card: {
    background: "var(--bg-card)",
    border: "1px solid var(--border-color)",
    borderRadius: "0.75rem",
    padding: "1.25rem",
    transition: "all 0.2s",
  },
  grid: {
    display: "grid" as const,
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: "1rem",
  },
  productCard: {
    background: "var(--bg-card)",
    border: "1px solid var(--border-color)",
    borderRadius: "0.75rem",
    overflow: "hidden" as const,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  productImg: {
    width: "100%",
    aspectRatio: "1",
    background: "var(--bg-secondary)",
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    color: "var(--text-muted)",
    fontSize: "2rem",
  },
  productInfo: { padding: "1rem" },
  productName: { fontWeight: 600, marginBottom: "0.35rem", fontSize: "0.95rem" },
  productPrice: { color: "var(--accent-end)", fontWeight: 600, fontSize: "1rem" },
  input: {
    background: "var(--bg-secondary)",
    border: "1px solid var(--border-color)",
    borderRadius: "0.5rem",
    padding: "0.5rem 0.75rem",
    color: "var(--text-primary)",
    fontSize: "0.9rem",
    width: "100%",
    outline: "none",
  },
  button: {
    padding: "0.5rem 1.25rem",
    borderRadius: "0.5rem",
    border: "none",
    fontWeight: 600,
    fontSize: "0.85rem",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  primaryBtn: {
    background: "linear-gradient(135deg, var(--accent-start), var(--accent-end))",
    color: "var(--text-primary)",
  },
  secondaryBtn: { background: "var(--border-color)", color: "var(--text-secondary)" },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "0.9rem",
  },
  th: {
    padding: "0.75rem",
    borderBottom: "1px solid var(--border-color)",
    color: "var(--text-secondary)",
    fontWeight: 500,
    textAlign: "left" as const,
  },
  td: {
    padding: "0.75rem",
    borderBottom: "1px solid var(--bg-card-hover)",
    color: "var(--text-primary)",
  },
  emptyState: {
    textAlign: "center" as const,
    padding: "3rem 2rem",
    color: "var(--text-muted)",
  },
} as const;

const ProductIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 01-8 0" />
  </svg>
);

export default function TendaDemo({ lang = "en" }: { lang?: Lang }) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const [view, setView] = useState<View>("home");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [checkoutForm, setCheckoutForm] = useState({ name: "", email: "", address: "", userType: "guest" as "guest" | "registered", password: "" });
  const [orderPlaced, setOrderPlaced] = useState(false);
  const orderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (orderTimeoutRef.current) clearTimeout(orderTimeoutRef.current);
    };
  }, []);

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  const goHome = useCallback(() => {
    setView("home");
    setSelectedCategoryId(null);
    setSelectedProductId(null);
  }, []);

  const openCategory = useCallback((cat: Category) => {
    setSelectedCategoryId(cat.id);
    setView("category");
  }, []);

  const openProduct = useCallback((p: Product) => {
    setSelectedProductId(p.id);
    setView("product");
  }, []);

  const addToCart = useCallback((productId: number, qty: number = 1) => {
    setCart((prev) => ({ ...prev, [productId]: (prev[productId] ?? 0) + qty }));
  }, []);

  const updateCartQty = useCallback((productId: number, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
    } else {
      setCart((prev) => ({ ...prev, [productId]: qty }));
    }
  }, []);

  const removeFromCart = useCallback((productId: number) => {
    setCart((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  }, []);

  const placeOrder = useCallback(() => {
    setOrderPlaced(true);
    setCart({});
    orderTimeoutRef.current = setTimeout(() => {
      setOrderPlaced(false);
      setView("home");
      setCheckoutForm({ name: "", email: "", address: "", userType: "guest", password: "" });
    }, 2500);
  }, []);

  const category = selectedCategoryId ? MOCK_CATEGORIES.find((c) => c.id === selectedCategoryId) : null;
  const product = selectedProductId ? MOCK_PRODUCTS.find((p) => p.id === selectedProductId) : null;
  const categoryProducts = selectedCategoryId ? MOCK_PRODUCTS.filter((p) => p.categoryId === selectedCategoryId) : [];

  const cartItems = Object.entries(cart)
    .map(([id, qty]) => ({ product: MOCK_PRODUCTS.find((p) => p.id === Number(id))!, qty }))
    .filter((x) => x.product);
  const cartTotal = cartItems.reduce((sum, { product, qty }) => sum + product.price * qty, 0);

  return (
    <div style={styles.wrapper}>
      <MockBanner>
        {t.mockBanner}
      </MockBanner>

      {/* Nav */}
      <nav style={styles.nav}>
        <span style={styles.navTitle} onClick={goHome} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && goHome()}>
          {t.storeName}
        </span>
        <div style={styles.navLinks}>
          <span
            style={styles.link}
            onClick={goHome}
            onMouseOver={(e) => (e.currentTarget.style.color = "var(--accent-start)")}
            onMouseOut={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
          >
            {t.home}
          </span>
          {MOCK_CATEGORIES.map((c) => (
            <span
              key={c.id}
              style={styles.link}
              onClick={() => openCategory(c)}
              onMouseOver={(e) => (e.currentTarget.style.color = "var(--accent-start)")}
              onMouseOut={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
            >
              {c.name}
            </span>
          ))}
          <span
            style={styles.link}
            onClick={() => setView("cart")}
            onMouseOver={(e) => (e.currentTarget.style.color = "var(--accent-start)")}
            onMouseOut={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
          >
            {t.cart} {cartCount > 0 && <span style={styles.cartBadge}>{cartCount}</span>}
          </span>
        </div>
      </nav>

      {/* Home: categories */}
      {view === "home" && (
        <div>
          <h2 style={{ marginBottom: "1rem", fontSize: "1.25rem" }}>{t.welcome}</h2>
          <div style={styles.grid}>
            {MOCK_CATEGORIES.map((c) => {
              return (
                <div
                  key={c.id}
                  style={{ ...styles.card, cursor: "pointer" }}
                  onClick={() => openCategory(c)}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = "var(--accent-start)";
                    e.currentTarget.style.background = "var(--bg-card-hover)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-color)";
                    e.currentTarget.style.background = "var(--bg-card)";
                  }}
                >
                  <div style={styles.productImg}>
                    <ProductIcon />
                  </div>
                  <h3 style={{ ...styles.productName, marginTop: "0.75rem", textAlign: "center" as const }}>{c.name}</h3>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Category: products */}
      {view === "category" && category && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <button style={{ ...styles.button, ...styles.secondaryBtn, padding: "0.35rem 0.75rem" }} onClick={goHome}>
              {t.backHome}
            </button>
            <h2 style={{ margin: 0, fontSize: "1.25rem" }}>{category.name}</h2>
          </div>
          <div style={styles.grid}>
            {categoryProducts.map((p) => (
              <div
                key={p.id}
                style={styles.productCard}
                onClick={() => openProduct(p)}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent-start)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-color)";
                  e.currentTarget.style.transform = "none";
                }}
              >
                <div style={styles.productImg}>
                  <ProductIcon />
                </div>
                <div style={styles.productInfo}>
                  <div style={styles.productName}>{p.name}</div>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0.35rem 0", lineHeight: 1.4 }}>
                    {p.description.slice(0, 50)}...
                  </p>
                  <div style={styles.productPrice}>{p.price.toFixed(2)} €</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Product detail */}
      {view === "product" && product && (
        <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
          <button style={{ ...styles.button, ...styles.secondaryBtn, alignSelf: "flex-start" }} onClick={() => setView("category")}>
            {t.back}
          </button>
          <div style={{ flex: "1", minWidth: "280px" }}>
            <div style={{ ...styles.card, display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
              <div style={{ ...styles.productImg, width: "200px", height: "200px", flexShrink: 0 }}>
                <ProductIcon />
              </div>
              <div style={{ flex: 1, minWidth: "200px" }}>
                <h2 style={{ marginBottom: "0.5rem" }}>{product.name}</h2>
                <p style={{ color: "var(--text-secondary)", marginBottom: "1rem", lineHeight: 1.6 }}>{product.description}</p>
                <p style={{ marginBottom: "0.5rem" }}>{t.price} <strong style={{ color: "var(--accent-end)" }}>{product.price.toFixed(2)} €</strong></p>
                <p style={{ marginBottom: "1rem", fontSize: "0.9rem", color: "var(--text-muted)" }}>{t.stock} {product.stock}</p>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <input
                    type="number"
                    id="qty"
                    min={1}
                    max={product.stock}
                    defaultValue={1}
                    style={{ ...styles.input, width: "70px" }}
                  />
                  <button
                    style={{ ...styles.button, ...styles.primaryBtn }}
                    onClick={() => {
                      const qty = Math.min(Math.max(1, Number((document.getElementById("qty") as HTMLInputElement)?.value) || 1), product.stock);
                      addToCart(product.id, qty);
                    }}
                  >
                    {t.addToCart}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart */}
      {view === "cart" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ margin: 0, fontSize: "1.25rem" }}>{t.yourCart}</h2>
            <button style={{ ...styles.button, ...styles.secondaryBtn }} onClick={goHome}>
              {t.continueShopping}
            </button>
          </div>
          {cartItems.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={{ marginBottom: "1rem" }}>{t.emptyCart}</p>
              <button style={{ ...styles.button, ...styles.primaryBtn }} onClick={goHome}>
                {t.goToStore}
              </button>
            </div>
          ) : (
            <>
              <div style={{ ...styles.card, overflowX: "auto" }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>{t.product}</th>
                      <th style={styles.th}>{t.quantity}</th>
                      <th style={styles.th}>{t.price}</th>
                      <th style={styles.th}>{t.total}</th>
                      <th style={styles.th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cartItems.map(({ product: p, qty }) => (
                      <tr key={p.id}>
                        <td style={styles.td}>{p.name}</td>
                        <td style={styles.td}>
                          <input
                            type="number"
                            min={1}
                            max={p.stock}
                            value={qty}
                            style={{ ...styles.input, width: "60px", padding: "0.25rem" }}
                            onChange={(e) => updateCartQty(p.id, Math.max(0, Number(e.target.value) || 0))}
                          />
                        </td>
                        <td style={styles.td}>{p.price.toFixed(2)} €</td>
                        <td style={styles.td}>{(p.price * qty).toFixed(2)} €</td>
                        <td style={styles.td}>
                          <button
                            style={{ ...styles.button, background: "color-mix(in srgb, var(--accent-end) 10%, transparent)", color: "var(--accent-end)", padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}
                            onClick={() => removeFromCart(p.id)}
                          >
                            {t.remove}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tr>
                    <td colSpan={3} style={{ ...styles.td, textAlign: "right" as const, fontWeight: 600 }}>
                      {t.totalLabel}
                    </td>
                    <td style={{ ...styles.td, fontWeight: 600, color: "var(--accent-end)" }}>{cartTotal.toFixed(2)} €</td>
                    <td style={styles.td}></td>
                  </tr>
                </table>
              </div>
              <button
                style={{ ...styles.button, ...styles.primaryBtn, marginTop: "1rem" }}
                onClick={() => setView("checkout")}
              >
                {t.goToCheckout}
              </button>
            </>
          )}
        </div>
      )}

      {/* Checkout */}
      {view === "checkout" && (
        <div>
          {orderPlaced ? (
            <div style={{ ...styles.card, textAlign: "center" as const, padding: "3rem" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✓</div>
              <h3 style={{ marginBottom: "0.5rem", color: "var(--accent-start)" }}>{t.orderReceived}</h3>
              <p style={{ color: "var(--text-secondary)" }}>{t.simNote}</p>
            </div>
          ) : (
            <>
              <button style={{ ...styles.button, ...styles.secondaryBtn, marginBottom: "1rem" }} onClick={() => setView("cart")}>
                {t.backToCart}
              </button>
              <div style={styles.card}>
                <h2 style={{ marginBottom: "1rem", fontSize: "1.25rem" }}>{t.checkout}</h2>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    <input
                      type="radio"
                      name="userType"
                      checked={checkoutForm.userType === "registered"}
                      onChange={() => setCheckoutForm((f) => ({ ...f, userType: "registered" as const }))}
                      style={{ marginRight: "0.5rem" }}
                    />
                    {t.registeredUser}
                  </label>
                  <label style={{ display: "block", marginBottom: "0.75rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    <input
                      type="radio"
                      name="userType"
                      checked={checkoutForm.userType === "guest"}
                      onChange={() => setCheckoutForm((f) => ({ ...f, userType: "guest" as const }))}
                      style={{ marginRight: "0.5rem" }}
                    />
                    {t.guest}
                  </label>
                </div>
                <div style={{ display: "grid", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>{t.fullName}</label>
                    <input
                      style={styles.input}
                      placeholder={t.namePlaceholder}
                      value={checkoutForm.name}
                      onChange={(e) => setCheckoutForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>{t.email}</label>
                    <input
                      type="email"
                      style={styles.input}
                      placeholder={t.emailPlaceholder}
                      value={checkoutForm.email}
                      onChange={(e) => setCheckoutForm((f) => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>{t.address}</label>
                    <input
                      style={styles.input}
                      placeholder={t.addressPlaceholder}
                      value={checkoutForm.address}
                      onChange={(e) => setCheckoutForm((f) => ({ ...f, address: e.target.value }))}
                    />
                  </div>
                  {checkoutForm.userType === "registered" && (
                    <div>
                      <label style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>{t.password}</label>
                      <input
                        type="password"
                        style={styles.input}
                        placeholder={t.passwordPlaceholder}
                        value={checkoutForm.password}
                        onChange={(e) => setCheckoutForm((f) => ({ ...f, password: e.target.value }))}
                      />
                    </div>
                  )}
                </div>
                <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}>
                  <p style={{ marginBottom: "0.5rem", color: "var(--text-secondary)" }}>{t.totalLabel} <strong style={{ color: "var(--accent-end)" }}>{cartTotal.toFixed(2)} €</strong></p>
                  <button style={{ ...styles.button, ...styles.primaryBtn }} onClick={placeOrder}>
                    {t.confirmOrder}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
