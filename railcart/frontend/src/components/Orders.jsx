import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function Orders({ notify }) {
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    api.getOrderHistory()
      .then(setOrders)
      .catch((err) => notify(err.message, "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="orders">
      <h3 className="section-title">Order history</h3>
      {orders === null && <p className="muted">Loading orders\u2026</p>}
      {orders !== null && orders.length === 0 && (
        <p className="muted">No orders yet. Anything you check out will show up here.</p>
      )}
      {orders?.map((order) => (
        <div className="order-card" key={order.order_id}>
          <div className="order-card__head">
            <span className="order-card__id">{order.order_id}</span>
            <span className="order-card__total">\u20B9{order.total.toFixed(2)}</span>
          </div>
          <ul className="order-card__lines">
            {order.lines.map((line) => (
              <li key={line.product_id}>
                {line.quantity} \u00d7 {line.name}
                <span className="muted"> &mdash; \u20B9{line.line_total.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
