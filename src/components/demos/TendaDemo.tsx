import { useState, useCallback } from "react";
import {
  MOCK_CATEGORIES,
  MOCK_PRODUCTS,
  type Category,
  type Product,
} from "../../data/tenda-mock";

type View = "home" | "category" | "product" | "cart" | "checkout";
type Lang = "en" | "es" | "ca";

const TRANSLATIONS = {
  en: {
    mockBanner: "This is a mock demo \u2014 no real orders or payments. Browse, add to cart, and try the checkout flow.",
    storeName: "Tenda Online",
    home: "Home",
    cart: "Cart",
    welcome: "Welcome to our online clothing store",
    backHome: "\u2190 Home",
    back: "\u2190 Back",
    price: "Price:",
    stock: "Stock:",
    addToCart: "Add to cart",
    yourCart: "Your cart",
    continueShopping: "Continue shopping",
    emptyCart: "Your cart is empty.",
    goToStore: "Go to store",
    product: "Product",
    quantity: "Quantity",
    total: "Total",
    remove: "Remove",
    totalLabel: "Total:",
    goToCheckout: "Go to checkout",
    orderReceived: "Order received!",
    simNote: "This is just a simulation. No real order has been placed.",
    backToCart: "\u2190 Back to cart",
    checkout: "Checkout",
    registeredUser: "Registered user",
    guest: "Guest",
    fullName: "Full name",
    namePlaceholder: "Your name",
    email: "Email address",
    emailPlaceholder: "email@example.com",
    address: "Shipping address",
    addressPlaceholder: "Street, number, city, ZIP",
    password: "Password",
    passwordPlaceholder: "Your password",
    confirmOrder: "Place order"
  },
  es: {
    mockBanner: "Esta es una demo simulada \u2014 no hay pedidos ni pagos reales. Explora, a\u00f1ade al carrito y prueba el flujo de pago.",
    storeName: "Tienda Online",
    home: "Inicio",
    cart: "Carrito",
    welcome: "Bienvenidos a nuestra tienda de ropa online",
    backHome: "\u2190 Inicio",
    back: "\u2190 Volver",
    price: "Precio:",
    stock: "Stock:",
    addToCart: "A\u00f1adir al carrito",
    yourCart: "Tu carrito",
    continueShopping: "Seguir comprando",
    emptyCart: "El carrito est\u00e1 vac\u00edo.",
    goToStore: "Ir a la tienda",
    product: "Producto",
    quantity: "Cantidad",
    total: "Total",
    remove: "Eliminar",
    totalLabel: "Total:",
    goToCheckout: "Ir a pagar",
    orderReceived: "\u00a1Pedido recibido!",
    simNote: "Esto es solo una simulaci\u00f3n. No se ha realizado ning\u00fan pedido real.",
    backToCart: "\u2190 Volver al carrito",
    checkout: "Pago",
    registeredUser: "Usuario registrado",
    guest: "Invitado",
    fullName: "Nombre completo",
    namePlaceholder: "Tu nombre",
    email: "Correo electr\u00f3nico",
    emailPlaceholder: "email@ejemplo.com",
    address: "Direcci\u00f3n de env\u00edo",
    addressPlaceholder: "Calle, n\u00famero, ciudad, CP",
    password: "Contrase\u00f1a",
    passwordPlaceholder: "Tu contrase\u00f1a",
    confirmOrder: "Confirmar pedido"
  },
  ca: {
    mockBanner: "Aquesta \u00e9s una demo simulada \u2014 no hi ha comandes ni pagaments reals. Explora, afegeix al carret i prova el flux de pagament.",
    storeName: "Botiga Online",
    home: "Inici",
    cart: "Carret",
    welcome: "Benvinguts a la nostra botiga online de roba",
    backHome: "\u2190 Inici",
    back: "\u2190 Tornar",
    price: "Preu:",
    stock: "Stock:",
    addToCart: "Afegir a la cistella",
    yourCart: "La teva cistella",
    continueShopping: "Continuar comprant",
    emptyCart: "La cistella est\u00e0 buida.",
    goToStore: "Anar a la botiga",
    product: "Producte",
    quantity: "Quantitat",
    total: "Total",
    remove: "Eliminar",
    totalLabel: "Total:",
    goToCheckout: "Anar al pagament",
    orderReceived: "Comanda rebuda!",
    simNote: "Aix\u00f2 \u00e9s nom\u00e9s una simulaci\u00f3. Cap comanda real s'ha enviat.",
    backToCart: "\u2190 Tornar a la cistella",
    checkout: "Checkout",
    registeredUser: "Usuari registrat",
    guest: "Convidat",
    fullName: "Nom complet",
    namePlaceholder: "El teu nom",
    email: "Correu electr\u00f2nic",
    emailPlaceholder: "email@exemple.cat",
    address: "Adre\u00e7a d'enviament",
    addressPlaceholder: "Carrer, n\u00famero, ciutat, CP",
    password: "Contrasenya",
    passwordPlaceholder: "La teva contrasenya",
    confirmOrder: "Confirmar comanda"
  }
};

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
    background: "linear-gradient(135deg, #1e1e2e 0%, var(--border-color) 100%)",
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
    background: "linear-gradient(135deg, #6366f1, #a855f7)",
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
  mockBanner: {
    background: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.08))",
    border: "1px solid rgba(99,102,241,0.3)",
    borderRadius: "0.5rem",
    padding: "0.5rem 1rem",
    fontSize: "0.75rem",
    color: "var(--text-secondary)",
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

export default function TendaDemo({ lang = "en" }: { lang?: Lang }) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
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
        {t.mockBanner}
      </div>

      {/* Nav */}
      <nav style={styles.nav}>
        <span style={styles.navTitle} onClick={goHome} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && goHome()}>
          {t.storeName}
        </span>
        <div style={styles.navLinks}>
          <span
            style={styles.link}
            onClick={goHome}
            onMouseOver={(e) => (e.currentTarget.style.color = "#6366f1")}
            onMouseOut={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
          >
            {t.home}
          </span>
          {MOCK_CATEGORIES.map((c) => (
            <span
              key={c.id}
              style={styles.link}
              onClick={() => openCategory(c)}
              onMouseOver={(e) => (e.currentTarget.style.color = "#6366f1")}
              onMouseOut={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
            >
              {c.name}
            </span>
          ))}
          <span
            style={styles.link}
            onClick={() => setView("cart")}
            onMouseOver={(e) => (e.currentTarget.style.color = "#6366f1")}
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
                    e.currentTarget.style.borderColor = "#6366f1";
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
                  e.currentTarget.style.borderColor = "#6366f1";
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
                <p style={{ marginBottom: "0.5rem" }}>{t.price} <strong style={{ color: "#a855f7" }}>{product.price.toFixed(2)} €</strong></p>
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
                            style={{ ...styles.button, background: "#371520", color: "#f87171", padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}
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
                    <td style={{ ...styles.td, fontWeight: 600, color: "#a855f7" }}>{cartTotal.toFixed(2)} €</td>
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
              <h3 style={{ marginBottom: "0.5rem", color: "#4ade80" }}>{t.orderReceived}</h3>
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
                  <p style={{ marginBottom: "0.5rem", color: "var(--text-secondary)" }}>{t.totalLabel} <strong style={{ color: "#a855f7" }}>{cartTotal.toFixed(2)} €</strong></p>
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
