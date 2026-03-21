import { useState, useCallback } from "react";
import {
  MOCK_CATEGORIES,
  MOCK_PRODUCTS,
  type Category,
  type Product,
} from "../../data/tenda-mock";

type View = "home" | "category" | "product" | "cart" | "checkout";

const styles = {
  wrapper: {
    fontFamily: "var(--font-sans, 'Inter', sans-serif)",
    color: "#e4e4e7",
    minHeight: "500px",
  },
  nav: {
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    padding: "0.75rem 1rem",
    background: "#16161f",
    border: "1px solid #27272a",
    borderRadius: "0.75rem",
    marginBottom: "1.5rem",
    flexWrap: "wrap" as const,
    gap: "0.5rem",
  },
  navTitle: { fontSize: "1rem", fontWeight: 700, color: "#e4e4e7" },
  navLinks: { display: "flex" as const, gap: "0.75rem", alignItems: "center" as const },
  link: {
    color: "#a1a1aa",
    fontSize: "0.85rem",
    cursor: "pointer",
    textDecoration: "none",
    padding: "0.35rem 0.5rem",
    borderRadius: "0.35rem",
    transition: "all 0.15s",
  },
  linkHover: { color: "#6366f1" },
  cartBadge: {
    background: "linear-gradient(135deg, #6366f1, #a855f7)",
    color: "var(--text-primary)",
    fontSize: "0.7rem",
    padding: "0.15rem 0.45rem",
    borderRadius: "999px",
    marginLeft: "0.25rem",
  },
  card: {
    background: "#16161f",
    border: "1px solid #27272a",
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
    background: "#16161f",
    border: "1px solid #27272a",
    borderRadius: "0.75rem",
    overflow: "hidden" as const,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  productImg: {
    width: "100%",
    aspectRatio: "1",
    background: "linear-gradient(135deg, #1e1e2e 0%, #27272a 100%)",
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    color: "#4b5563",
    fontSize: "2rem",
  },
  productInfo: { padding: "1rem" },
  productName: { fontWeight: 600, marginBottom: "0.35rem", fontSize: "0.95rem" },
  productPrice: { color: "#a855f7", fontWeight: 600, fontSize: "1rem" },
  input: {
    background: "#12121a",
    border: "1px solid #27272a",
    borderRadius: "0.5rem",
    padding: "0.5rem 0.75rem",
    color: "#e4e4e7",
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
    background: "linear-gradient(135deg, #6366f1, #a855f7)",
    color: "var(--text-primary)",
  },
  secondaryBtn: { background: "#27272a", color: "#a1a1aa" },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "0.9rem",
  },
  th: {
    padding: "0.75rem",
    borderBottom: "1px solid #27272a",
    color: "#a1a1aa",
    fontWeight: 500,
    textAlign: "left" as const,
  },
  td: {
    padding: "0.75rem",
    borderBottom: "1px solid #1c1c28",
    color: "#e4e4e7",
  },
  emptyState: {
    textAlign: "center" as const,
    padding: "3rem 2rem",
    color: "#71717a",
  },
  mockBanner: {
    background: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.08))",
    border: "1px solid rgba(99,102,241,0.3)",
    borderRadius: "0.5rem",
    padding: "0.5rem 1rem",
    fontSize: "0.75rem",
    color: "#a1a1aa",
    marginBottom: "1rem",
    textAlign: "center" as const,
  },
} as const;

const ProductIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 01-8 0" />
  </svg>
);

export default function TendaDemo() {
  const [view, setView] = useState<View>("home");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [checkoutForm, setCheckoutForm] = useState({ name: "", email: "", address: "", userType: "guest" as "guest" | "registered", password: "" });
  const [orderPlaced, setOrderPlaced] = useState(false);

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
    setTimeout(() => {
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
      <div style={styles.mockBanner}>
        This is a mock demo — no real orders or payments. Browse, add to cart, and try the checkout flow.
      </div>

      {/* Nav */}
      <nav style={styles.nav}>
        <span style={styles.navTitle} onClick={goHome} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && goHome()}>
          Tenda Online
        </span>
        <div style={styles.navLinks}>
          <span
            style={styles.link}
            onClick={goHome}
            onMouseOver={(e) => (e.currentTarget.style.color = "#6366f1")}
            onMouseOut={(e) => (e.currentTarget.style.color = "#a1a1aa")}
          >
            Inici
          </span>
          {MOCK_CATEGORIES.map((c) => (
            <span
              key={c.id}
              style={styles.link}
              onClick={() => openCategory(c)}
              onMouseOver={(e) => (e.currentTarget.style.color = "#6366f1")}
              onMouseOut={(e) => (e.currentTarget.style.color = "#a1a1aa")}
            >
              {c.name}
            </span>
          ))}
          <span
            style={styles.link}
            onClick={() => setView("cart")}
            onMouseOver={(e) => (e.currentTarget.style.color = "#6366f1")}
            onMouseOut={(e) => (e.currentTarget.style.color = "#a1a1aa")}
          >
            Cistella {cartCount > 0 && <span style={styles.cartBadge}>{cartCount}</span>}
          </span>
        </div>
      </nav>

      {/* Home: categories */}
      {view === "home" && (
        <div>
          <h2 style={{ marginBottom: "1rem", fontSize: "1.25rem" }}>Benvinguts a la nostra botiga online de roba</h2>
          <div style={styles.grid}>
            {MOCK_CATEGORIES.map((c) => {
              const firstProduct = MOCK_PRODUCTS.find((p) => p.categoryId === c.id);
              return (
                <div
                  key={c.id}
                  style={{ ...styles.card, cursor: "pointer" }}
                  onClick={() => openCategory(c)}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = "#6366f1";
                    e.currentTarget.style.background = "#1c1c28";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = "#27272a";
                    e.currentTarget.style.background = "#16161f";
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
              ← Inici
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
                  e.currentTarget.style.borderColor = "#6366f1";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = "#27272a";
                  e.currentTarget.style.transform = "none";
                }}
              >
                <div style={styles.productImg}>
                  <ProductIcon />
                </div>
                <div style={styles.productInfo}>
                  <div style={styles.productName}>{p.name}</div>
                  <p style={{ fontSize: "0.8rem", color: "#71717a", margin: "0.35rem 0", lineHeight: 1.4 }}>
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
            ← Tornar
          </button>
          <div style={{ flex: "1", minWidth: "280px" }}>
            <div style={{ ...styles.card, display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
              <div style={{ ...styles.productImg, width: "200px", height: "200px", flexShrink: 0 }}>
                <ProductIcon />
              </div>
              <div style={{ flex: 1, minWidth: "200px" }}>
                <h2 style={{ marginBottom: "0.5rem" }}>{product.name}</h2>
                <p style={{ color: "#a1a1aa", marginBottom: "1rem", lineHeight: 1.6 }}>{product.description}</p>
                <p style={{ marginBottom: "0.5rem" }}>Preu: <strong style={{ color: "#a855f7" }}>{product.price.toFixed(2)} €</strong></p>
                <p style={{ marginBottom: "1rem", fontSize: "0.9rem", color: "#71717a" }}>Stock: {product.stock}</p>
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
                    Afegir a la cistella
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
            <h2 style={{ margin: 0, fontSize: "1.25rem" }}>La teva cistella</h2>
            <button style={{ ...styles.button, ...styles.secondaryBtn }} onClick={goHome}>
              Continuar comprant
            </button>
          </div>
          {cartItems.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={{ marginBottom: "1rem" }}>La cistella està buida.</p>
              <button style={{ ...styles.button, ...styles.primaryBtn }} onClick={goHome}>
                Anar a la botiga
              </button>
            </div>
          ) : (
            <>
              <div style={{ ...styles.card, overflowX: "auto" }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Producte</th>
                      <th style={styles.th}>Quantitat</th>
                      <th style={styles.th}>Preu</th>
                      <th style={styles.th}>Total</th>
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
                            style={{ ...styles.button, background: "#371520", color: "#f87171", padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}
                            onClick={() => removeFromCart(p.id)}
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tr>
                    <td colSpan={3} style={{ ...styles.td, textAlign: "right" as const, fontWeight: 600 }}>
                      Total:
                    </td>
                    <td style={{ ...styles.td, fontWeight: 600, color: "#a855f7" }}>{cartTotal.toFixed(2)} €</td>
                    <td style={styles.td}></td>
                  </tr>
                </table>
              </div>
              <button
                style={{ ...styles.button, ...styles.primaryBtn, marginTop: "1rem" }}
                onClick={() => setView("checkout")}
              >
                Anar al pagament
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
              <h3 style={{ marginBottom: "0.5rem", color: "#4ade80" }}>Comanda rebuda!</h3>
              <p style={{ color: "#a1a1aa" }}>Això és només una simulació. Cap comanda real s'ha enviat.</p>
            </div>
          ) : (
            <>
              <button style={{ ...styles.button, ...styles.secondaryBtn, marginBottom: "1rem" }} onClick={() => setView("cart")}>
                ← Tornar a la cistella
              </button>
              <div style={styles.card}>
                <h2 style={{ marginBottom: "1rem", fontSize: "1.25rem" }}>Checkout</h2>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.85rem", color: "#a1a1aa" }}>
                    <input
                      type="radio"
                      name="userType"
                      checked={checkoutForm.userType === "registered"}
                      onChange={() => setCheckoutForm((f) => ({ ...f, userType: "registered" as const }))}
                      style={{ marginRight: "0.5rem" }}
                    />
                    Usuari registrat
                  </label>
                  <label style={{ display: "block", marginBottom: "0.75rem", fontSize: "0.85rem", color: "#a1a1aa" }}>
                    <input
                      type="radio"
                      name="userType"
                      checked={checkoutForm.userType === "guest"}
                      onChange={() => setCheckoutForm((f) => ({ ...f, userType: "guest" as const }))}
                      style={{ marginRight: "0.5rem" }}
                    />
                    Convidat
                  </label>
                </div>
                <div style={{ display: "grid", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.85rem", color: "#a1a1aa" }}>Nom complet</label>
                    <input
                      style={styles.input}
                      placeholder="El teu nom"
                      value={checkoutForm.name}
                      onChange={(e) => setCheckoutForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.85rem", color: "#a1a1aa" }}>Correu electrònic</label>
                    <input
                      type="email"
                      style={styles.input}
                      placeholder="email@exemple.cat"
                      value={checkoutForm.email}
                      onChange={(e) => setCheckoutForm((f) => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.85rem", color: "#a1a1aa" }}>Adreça d'enviament</label>
                    <input
                      style={styles.input}
                      placeholder="Carrer, número, ciutat, CP"
                      value={checkoutForm.address}
                      onChange={(e) => setCheckoutForm((f) => ({ ...f, address: e.target.value }))}
                    />
                  </div>
                  {checkoutForm.userType === "registered" && (
                    <div>
                      <label style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.85rem", color: "#a1a1aa" }}>Contrasenya</label>
                      <input
                        type="password"
                        style={styles.input}
                        placeholder="La teva contrasenya"
                        value={checkoutForm.password}
                        onChange={(e) => setCheckoutForm((f) => ({ ...f, password: e.target.value }))}
                      />
                    </div>
                  )}
                </div>
                <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid #27272a" }}>
                  <p style={{ marginBottom: "0.5rem", color: "#a1a1aa" }}>Total: <strong style={{ color: "#a855f7" }}>{cartTotal.toFixed(2)} €</strong></p>
                  <button style={{ ...styles.button, ...styles.primaryBtn }} onClick={placeOrder}>
                    Confirmar comanda
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
