const BASE = import.meta.env.VITE_API_BASE_URL;
const API_KEY_STORAGE = "railcart_api_key";
const TOKEN_STORAGE = "railcart_token";

/** API key: authenticates the calling application (see Settings tab). */
export function getApiKey() {
  return localStorage.getItem(API_KEY_STORAGE) || "";
}
export function setApiKey(key) {
  if (key) localStorage.setItem(API_KEY_STORAGE, key);
  else localStorage.removeItem(API_KEY_STORAGE);
}

/** JWT token: authenticates the individual logged-in user. */
export function getToken() {
  return localStorage.getItem(TOKEN_STORAGE) || "";
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_STORAGE, token);
  else localStorage.removeItem(TOKEN_STORAGE);
}

/**
 * Thin fetch wrapper. Attaches both the API key (app-level) and the
 * bearer token (user-level) automatically. Throws an Error whose
 * message is the backend's `detail` string, with the HTTP status
 * attached, so callers can special-case 401 (e.g. force logout).
 */
async function request(path, options = {}) {
  const apiKey = getApiKey();
  const token = getToken();

  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { "X-API-Key": apiKey } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.detail || "Something went wrong. Please try again.");
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  // Health
  getHealth: () => request("/health"),

  // Auth
  signup: (name, email, password) =>
    request("/auth/signup", { method: "POST", body: JSON.stringify({ name, email, password }) }),
  login: (email, password) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => request("/auth/me"),

  // Shop
  getProducts: ({ search, category, limit, skip } = {}) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    if (limit) params.set("limit", limit);
    if (skip) params.set("skip", skip);
    const qs = params.toString();
    return request(`/products${qs ? `?${qs}` : ""}`);
  },
  getCart: () => request("/cart"),
  addToCart: (productId, quantity) =>
    request("/cart/add", { method: "POST", body: JSON.stringify({ product_id: productId, quantity }) }),
  removeFromCart: (productId, quantity) =>
    request("/cart/remove", { method: "POST", body: JSON.stringify({ product_id: productId, quantity }) }),
  checkout: (amountPaid) =>
    request("/checkout", { method: "POST", body: JSON.stringify({ amount_paid: amountPaid }) }),
  getOrderHistory: () => request("/orders"),

  // Booking
  getSeatAvailability: () => request("/seats"),
  bookTicket: (passengerName, destination, seatType) =>
    request("/booking/book", {
      method: "POST",
      body: JSON.stringify({ passenger_name: passengerName, destination, seat_type: seatType }),
    }),
  cancelTicket: (ticketId) =>
    request("/booking/cancel", { method: "POST", body: JSON.stringify({ ticket_id: ticketId }) }),
  listTickets: () => request("/booking/tickets"),
};
