// In dev, Vite proxies /api to localhost:5000 (see vite.config.js), so
// VITE_API_BASE_URL is left unset and BASE just becomes "/api".
// In production (Netlify), set VITE_API_BASE_URL to your deployed backend's
// origin, e.g. https://course-recommender-api.onrender.com — no trailing
// slash, no /api suffix, that's appended here.
const BASE = `${import.meta.env.VITE_API_BASE_URL || ""}/api`;

async function request(path, options) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return data;
}

export const api = {
  health: () => request("/health"),
  courses: () => request("/courses"),
  users: () => request("/users"),
  createUser: (user_id, interests) =>
    request("/users", {
      method: "POST",
      body: JSON.stringify({ user_id, interests }),
    }),
  deleteUser: (userId) => request(`/users/${userId}`, { method: "DELETE" }),
  recommend: (userId, topN = 3) => request(`/recommend/${userId}?top_n=${topN}`),
  compare: (userA, userB) => request(`/compare/${userA}/${userB}`),
};
