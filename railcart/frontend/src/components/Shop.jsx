import { useEffect, useState, useCallback } from "react";
import { api } from "../api.js";

export default function Shop({ notify }) {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({ lines: [], total: 0 });
  const [amountPaid, setAmountPaid] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const refreshProducts = useCallback(async () => {
    const list = await api.getProducts({
      search: search || undefined,
      category: category !== "all" ? category : undefined,
    });
    setProducts(list);
  }, [search, category]);

  async function refreshCart() {
    setCart(await api.getCart());
  }

  useEffect(() => {
    Promise.all([refreshProducts(), refreshCart()]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { refreshProducts(); }, 250); // debounce search typing
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category]);

  async function handleAdd(productId) {
    try {
      await api.addToCart(productId, 1);
      await Promise.all([refreshProducts(), refreshCart()]);
    } catch (err) {
      notify(err.message, "error");
    }
  }

  async function handleRemove(productId) {
    try {
      await api.removeFromCart(productId, 1);
      await Promise.all([refreshProducts(), refreshCart()]);
    } catch (err) {
      notify(err.message, "error");
    }
  }

  async function handleCheckout() {
    const paid = parseFloat(amountPaid);
    if (Number.isNaN(paid)) {
      notify("Enter a valid payment amount.", "error");
      return;
    }
    try {
      const order = await api.checkout(paid);
      notify(
        `Order ${order.order_id} placed. Change due: \u20B9${order.change.toFixed(2)}`,
        "success"
      );
      setAmountPaid("");
      await refreshCart();
    } catch (err) {
      notify(err.message, "error");
    }
  }

  const categories = ["all", ...new Set(products.map((p) => p.category))];
  const grouped = category === "all"
    ? [...new Set(products.map((p) => p.category))]
    : [category];

  return (
    <div className="shop">
      <div className="shop__grid-wrap">
        <div className="shop__toolbar">
          <label className="field field--inline">
            <span className="visually-hidden">Search essentials</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search essentials\u2026"
            />
          </label>
          <div className="chip-row" role="tablist" aria-label="Filter by category">
            {categories.map((c) => (
              <button
                key={c}
                className={`chip ${category === c ? "chip--active" : ""}`}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {loading && <p className="muted">Loading essentials\u2026</p>}
        {!loading && products.length === 0 && (
          <p className="muted">No products match your search.</p>
        )}

        {grouped.map((cat) => (
          <section key={cat} className="shop__category">
            <h3 className="shop__category-title">{cat}</h3>
            <div className="product-grid">
              {products
                .filter((p) => p.category === cat)
                .map((p) => (
                  <div className="product-card" key={p.id}>
                    <span className="product-card__emoji" aria-hidden="true">{p.emoji}</span>
                    <div className="product-card__name">{p.name}</div>
                    <div className="product-card__price">\u20B9{p.price}</div>
                    <div className="product-card__stock">
                      {p.stock > 0 ? `${p.stock} in stock` : "Sold out"}
                    </div>
                    <button
                      className="btn btn--small"
                      disabled={p.stock <= 0}
                      onClick={() => handleAdd(p.id)}
                    >
                      Add to cart
                    </button>
                  </div>
                ))}
            </div>
          </section>
        ))}
      </div>

      <aside className="cart-panel">
        <h3 className="cart-panel__title">Your cart</h3>
        <div className="ticket-perforation" aria-hidden="true" />
        {cart.lines.length === 0 ? (
          <p className="muted">Nothing added yet.</p>
        ) : (
          <ul className="cart-lines">
            {cart.lines.map((line) => (
              <li key={line.product_id} className="cart-line">
                <div>
                  <div className="cart-line__name">{line.name}</div>
                  <div className="cart-line__meta">
                    {line.quantity} \u00d7 \u20B9{line.price}
                  </div>
                </div>
                <div className="cart-line__right">
                  <span>\u20B9{line.line_total.toFixed(2)}</span>
                  <button
                    className="btn btn--ghost btn--tiny"
                    onClick={() => handleRemove(line.product_id)}
                    aria-label={`Remove one ${line.name}`}
                  >
                    \u2212
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="ticket-perforation" aria-hidden="true" />
        <div className="cart-total">
          <span>Total</span>
          <strong>\u20B9{cart.total.toFixed(2)}</strong>
        </div>

        <label className="field">
          <span>Amount paid</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amountPaid}
            onChange={(e) => setAmountPaid(e.target.value)}
            placeholder="0.00"
          />
        </label>
        <button
          className="btn btn--primary btn--full"
          disabled={cart.lines.length === 0}
          onClick={handleCheckout}
        >
          Checkout
        </button>
      </aside>
    </div>
  );
}
