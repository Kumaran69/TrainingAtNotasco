// For local development this points at your local backend.
// When deploying, change this to your deployed backend's URL,
// e.g. 'https://your-app.onrender.com'
const API_URL = 'https://trainingatnotasco-1.onrender.com'

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
  start: (name) => request('/api/start', { method: 'POST', body: JSON.stringify({ name }) }),
  getSession: (sessionId) => request(`/api/session/${sessionId}`),
  chat: (sessionId, message) =>
    request('/api/chat', { method: 'POST', body: JSON.stringify({ session_id: sessionId, message }) }),
  getMessages: (sessionId) => request(`/api/messages/${sessionId}`),
  getTasks: (sessionId) => request(`/api/tasks/${sessionId}`),
  getStats: (sessionId) => request(`/api/stats/${sessionId}`),
}

export { API_URL }
