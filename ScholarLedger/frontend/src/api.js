const BASE = import.meta.env.VITE_API_BASE_URL || "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = Array.isArray(data.detail)
      ? data.detail.map((d) => d.msg).join(", ")
      : data.detail || "Something went wrong. Please try again.";
    throw new Error(message);
  }
  return data;
}

export const api = {
  getDashboard: () => request("/dashboard"),

  // Expenses
  getExpenses: (category) =>
    request(`/expenses${category ? `?category=${encodeURIComponent(category)}` : ""}`),
  addExpense: (category, amount, date) =>
    request("/expenses", { method: "POST", body: JSON.stringify({ category, amount, date }) }),
  getExpenseSummary: () => request("/expenses/summary"),

  // Quiz scores
  getScores: () => request("/scores"),
  addScore: (name, subject, score) =>
    request("/scores", { method: "POST", body: JSON.stringify({ name, subject, score }) }),
  searchScores: (name) => request(`/scores/search?name=${encodeURIComponent(name)}`),
  getScoreSummary: () => request("/scores/summary"),
};
