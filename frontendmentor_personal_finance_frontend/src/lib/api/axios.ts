import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { API_BASE_URL } from "@/lib/api/config";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
} from "@/lib/api/tokens";

/** Shared axios instance — every thunk/request goes through this. */
export const api = axios.create({
  baseURL: API_BASE_URL,
});

/** Attach the current access token to every outgoing request. */
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Called when the refresh flow fails (or there's no refresh token): drop the
 * session and bounce to the login screen. Uses a hard redirect rather than
 * the router so it works from outside React (interceptor context).
 */
function forceLogout(): void {
  clearTokens();
  if (window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

// Ensure only one refresh request is in flight; queued requests await it.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error("No refresh token");
  }
  // Use a bare axios call so this request doesn't re-enter the interceptors.
  const response = await axios.post<{ access_token: string }>(
    `${API_BASE_URL}/auth/refresh`,
    null,
    { headers: { Authorization: `Bearer ${refreshToken}` } },
  );
  const newAccessToken = response.data.access_token;
  setAccessToken(newAccessToken);
  return newAccessToken;
}

/**
 * On a 401, try to refresh the access token once and replay the original
 * request. If refresh fails, force a logout. Requests to the auth endpoints
 * themselves are never retried (a bad login must surface its own 401).
 */
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (AxiosRequestConfig & { _retry?: boolean })
      | undefined;

    const status = error.response?.status;
    const url = originalRequest?.url ?? "";
    const isAuthRoute = url.includes("/auth/");

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthRoute
    ) {
      originalRequest._retry = true;
      try {
        refreshPromise = refreshPromise ?? refreshAccessToken();
        const newAccessToken = await refreshPromise;
        refreshPromise = null;
        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${newAccessToken}`,
        };
        return api(originalRequest);
      } catch (refreshError) {
        refreshPromise = null;
        forceLogout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);
