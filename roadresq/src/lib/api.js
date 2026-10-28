// VITE_API_URL can be absolute (https://api.example.com/api — Vercel → Render)
// or relative ("/api" — behind the Nginx proxy in Docker). Same-origin is the default.
export const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/**
 * The Socket.IO server lives on the same origin as the REST API, just
 * without the "/api" path. Works for both absolute and relative URLs.
 */
export function getSocketUrl() {
  if (/^https?:\/\//i.test(BASE_URL)) return new URL(BASE_URL).origin;
  return window.location.origin;
}

export const TOKEN_KEY = "roadresq_token";

/**
 * Thin wrapper around fetch for talking to the RoadResQ backend
 * (Experiments 4–8). Attaches the JWT from localStorage automatically
 * and throws a normal Error with the server's message on failure, so
 * callers can just try/catch. `meta` returns pagination alongside data.
 */
async function request(path, { method = "GET", body, auth = true, meta = false } = {}) {
  const headers = { "Content-Type": "application/json" };

  if (auth) {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(`Could not reach the API at ${BASE_URL}. Is the backend running?`);
  }

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(json.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }

  return meta ? json : json.data;
}

export const api = {
  register: (payload) => request("/auth/register", { method: "POST", body: payload, auth: false }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload, auth: false }),
  me: () => request("/auth/me"),

  listVehicles: () => request("/vehicles"),
  addVehicle: (payload) => request("/vehicles", { method: "POST", body: payload }),
  removeVehicle: (id) => request(`/vehicles/${id}`, { method: "DELETE" }),

  createRequest: (payload) => request("/requests", { method: "POST", body: payload }),
  listRequests: (query = "") => request(`/requests${query}`),
  listRequestsPage: (query = "") => request(`/requests${query}`, { meta: true }),
  getRequest: (id) => request(`/requests/${id}`),
  updateRequestStatus: (id, status) =>
    request(`/requests/${id}/status`, { method: "PATCH", body: { status } }),
  declineRequest: (id) => request(`/requests/${id}/decline`, { method: "PATCH" }),
  cancelRequest: (id) => request(`/requests/${id}/cancel`, { method: "PATCH" }),
  rateRequest: (id, rating, review) =>
    request(`/requests/${id}/rate`, { method: "PATCH", body: { rating, review: review || undefined } }),
  listMessages: (id) => request(`/requests/${id}/messages`),

  nearbyMechanics: (problemType, lat, lng) =>
    request(`/mechanics/nearby?problemType=${problemType}&lat=${lat}&lng=${lng}`),
  setAvailability: (payload) =>
    request("/mechanics/availability", { method: "PATCH", body: payload }),

  adminStats: () => request("/admin/stats"),
  adminUsers: (query = "") => request(`/admin/users${query}`, { meta: true }),
};

export default api;
