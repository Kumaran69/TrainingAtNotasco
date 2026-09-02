import { useEffect, useState } from 'react'
import { api, API_URL } from './api.js'

const SEGMENT_COLORS = {
  Platinum: '#5b4fe9',
  Gold: '#f5a623',
  Silver: '#8a93a6',
  Bronze: '#c98a5a',
}

const CATEGORY_COLORS = ['#5b4fe9', '#0fa36b', '#f5a623', '#f2545b', '#2fb3c9', '#a45de2']

function currency(n) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n ?? 0)
}

function MetricCard({ label, value, sub, accent }) {
  return (
    <div className="metric-card">
      <span className="metric-card__label">{label}</span>
      <span className="metric-card__value" style={accent ? { color: accent } : undefined}>
        {value}
      </span>
      {sub && <span className="metric-card__sub">{sub}</span>}
    </div>
  )
}

function OrderForm({ initial, onCancel, onSubmit, submitLabel }) {
  const [form, setForm] = useState(
    initial ?? { order_id: '', customer: '', product: '', category: '', price: '', quantity: '' }
  )
  const [error, setError] = useState(null)
  const isEdit = Boolean(initial)

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    try {
      if (isEdit) {
        await onSubmit({
          customer: form.customer,
          product: form.product,
          category: form.category,
          price: parseFloat(form.price),
          quantity: parseInt(form.quantity, 10),
        })
      } else {
        await onSubmit({
          order_id: form.order_id.trim(),
          customer: form.customer,
          product: form.product,
          category: form.category,
          price: parseFloat(form.price),
          quantity: parseInt(form.quantity, 10),
        })
      }
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <form className="order-form" onSubmit={handleSubmit}>
      <div className="order-form__grid">
        {!isEdit && (
          <label>
            <span>Order ID</span>
            <input value={form.order_id} onChange={(e) => set('order_id', e.target.value)} required />
          </label>
        )}
        <label>
          <span>Customer</span>
          <input value={form.customer} onChange={(e) => set('customer', e.target.value)} required />
        </label>
        <label>
          <span>Product</span>
          <input value={form.product} onChange={(e) => set('product', e.target.value)} required />
        </label>
        <label>
          <span>Category</span>
          <input value={form.category} onChange={(e) => set('category', e.target.value)} required />
        </label>
        <label>
          <span>Price</span>
          <input type="number" min="0" step="0.01" value={form.price} onChange={(e) => set('price', e.target.value)} required />
        </label>
        <label>
          <span>Quantity</span>
          <input type="number" min="1" step="1" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} required />
        </label>
      </div>
      {error && <p className="order-form__error">{error}</p>}
      <div className="order-form__actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn--primary">{submitLabel}</button>
      </div>
    </form>
  )
}

export default function App() {
  const [orders, setOrders] = useState([])
  const [report, setReport] = useState(null)
  const [categorySales, setCategorySales] = useState({})
  const [segmentation, setSegmentation] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState(null)

  async function loadAll() {
    setError(null)
    try {
      const [o, r, c, s] = await Promise.all([
        api.listOrders(), api.report(), api.categorySales(), api.segmentation(),
      ])
      setOrders(o)
      setReport(r)
      setCategorySales(c)
      setSegmentation(s)
    } catch (err) {
      setError(
        err.message.includes('fetch')
          ? 'Could not reach the API. Is the FastAPI backend running on port 8000?'
          : err.message
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  async function handleAdd(order) {
    await api.addOrder(order)
    setShowAddForm(false)
    await loadAll()
  }

  async function handleUpdate(orderId, fields) {
    await api.updateOrder(orderId, fields)
    setEditingId(null)
    await loadAll()
  }

  async function handleDelete(orderId) {
    if (!window.confirm(`Delete order ${orderId}?`)) return
    await api.deleteOrder(orderId)
    await loadAll()
  }

  const maxCategoryValue = Math.max(1, ...Object.values(categorySales))

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <div>
          <h1>Sales Analytics</h1>
          <p className="dashboard__sub">Live order data from the FastAPI backend</p>
        </div>
        <button className="btn btn--primary" onClick={() => setShowAddForm((s) => !s)}>
          {showAddForm ? 'Close' : '+ New Order'}
        </button>
      </header>

      {error && <div className="banner banner--error">{error}</div>}

      {report && (
        <section className="metrics">
          <MetricCard label="Total Orders" value={report.total_orders} />
          <MetricCard label="Total Revenue" value={`₹${currency(report.total_revenue)}`} accent="#0fa36b" />
          <MetricCard
            label="Highest-Value Order"
            value={report.highest_value_order ? `₹${currency(report.highest_value_order.total)}` : '—'}
            sub={report.highest_value_order ? `${report.highest_value_order.order_id} · ${report.highest_value_order.product}` : ''}
          />
          <MetricCard
            label="Best-Selling Product"
            value={report.best_selling_product ? report.best_selling_product.product : '—'}
            sub={report.best_selling_product ? `${report.best_selling_product.quantity} units` : ''}
          />
          <MetricCard label="Average Order Value" value={`₹${currency(report.average_order_value)}`} />
        </section>
      )}

      {showAddForm && (
        <section className="panel">
          <h2 className="panel__title">Add New Order</h2>
          <OrderForm onCancel={() => setShowAddForm(false)} onSubmit={handleAdd} submitLabel="Add Order" />
        </section>
      )}

      <div className="dashboard__body">
        <section className="panel panel--orders">
          <h2 className="panel__title">Orders {loading && <span className="muted">(loading…)</span>}</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th><th>Customer</th><th>Product</th><th>Category</th>
                  <th>Price</th><th>Qty</th><th>Total</th><th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  editingId === o.order_id ? (
                    <tr key={o.order_id} className="row--editing">
                      <td colSpan={8}>
                        <OrderForm
                          initial={o}
                          submitLabel="Save"
                          onCancel={() => setEditingId(null)}
                          onSubmit={(fields) => handleUpdate(o.order_id, fields)}
                        />
                      </td>
                    </tr>
                  ) : (
                    <tr key={o.order_id}>
                      <td className="mono" data-label="Order ID">{o.order_id}</td>
                      <td data-label="Customer">{o.customer}</td>
                      <td data-label="Product">{o.product}</td>
                      <td data-label="Category"><span className="tag">{o.category}</span></td>
                      <td className="mono" data-label="Price">₹{currency(o.price)}</td>
                      <td className="mono" data-label="Qty">{o.quantity}</td>
                      <td className="mono strong" data-label="Total">₹{currency(o.total)}</td>
                      <td className="row-actions" data-label="">
                        <button className="icon-btn" title="Edit" onClick={() => setEditingId(o.order_id)}>✎</button>
                        <button className="icon-btn icon-btn--danger" title="Delete" onClick={() => handleDelete(o.order_id)}>🗑</button>
                      </td>
                    </tr>
                  )
                ))}
                {orders.length === 0 && !loading && (
                  <tr><td colSpan={8} className="muted" style={{ padding: '20px', textAlign: 'center' }}>No orders yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="dashboard__side">
          <section className="panel">
            <h2 className="panel__title">Category-Wise Sales</h2>
            <div className="bars">
              {Object.entries(categorySales).map(([cat, val], i) => (
                <div className="bar-row" key={cat}>
                  <span className="bar-row__label">{cat}</span>
                  <div className="bar-row__track">
                    <div
                      className="bar-row__fill"
                      style={{
                        width: `${(val / maxCategoryValue) * 100}%`,
                        background: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                      }}
                    />
                  </div>
                  <span className="bar-row__value">₹{currency(val)}</span>
                </div>
              ))}
              {Object.keys(categorySales).length === 0 && <p className="muted">No data yet.</p>}
            </div>
          </section>

          <section className="panel">
            <h2 className="panel__title">Customer Segmentation</h2>
            <ul className="segment-list">
              {segmentation
                .slice()
                .sort((a, b) => b.spending - a.spending)
                .map((s) => (
                  <li key={s.customer} className="segment-row">
                    <span className="segment-row__name">{s.customer}</span>
                    <span className="segment-row__spend mono">₹{currency(s.spending)}</span>
                    <span
                      className="segment-badge"
                      style={{ background: `${SEGMENT_COLORS[s.segment]}22`, color: SEGMENT_COLORS[s.segment] }}
                    >
                      {s.segment}
                    </span>
                  </li>
                ))}
              {segmentation.length === 0 && <p className="muted">No data yet.</p>}
            </ul>
          </section>
        </aside>
      </div>

      <footer className="dashboard__footer">
        <span>E-Commerce Sales Analytics · FastAPI + React</span>
        <span>API: {API_URL}</span>
      </footer>
    </div>
  )
}
