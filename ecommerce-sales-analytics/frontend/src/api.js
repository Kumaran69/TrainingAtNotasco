// For local development this points at your local backend.
// When deploying (see README.md "Deploying to a live URL"), change this
// to your deployed backend's URL, e.g. 'https://your-app.onrender.com'
const API_URL = 'https://trainingatnotasco.onrender.com'

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(data?.detail || `Request failed (${res.status})`)
  }
  return data
}

export const api = {
  listOrders: () => request('/orders'),
  addOrder: (order) => request('/orders', { method: 'POST', body: JSON.stringify(order) }),
  updateOrder: (orderId, fields) =>
    request(`/orders/${orderId}`, { method: 'PUT', body: JSON.stringify(fields) }),
  deleteOrder: (orderId) => request(`/orders/${orderId}`, { method: 'DELETE' }),
  report: () => request('/analytics/report'),
  categorySales: () => request('/analytics/category-sales'),
  segmentation: () => request('/analytics/segmentation'),
}

export { API_URL }
