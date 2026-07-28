/**
 * The single source of the backend base URL for the whole app.
 * Change it here (or via the VITE_API_URL env var) — never inline a URL
 * anywhere else. Defaults to the local Flask dev server on 127.0.0.1:5000.
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "http://127.0.0.1:5000";
