/**
 * JWT storage. The backend issues a short-lived access token (~15 min) and a
 * long-lived refresh token (~30 days); both are kept in localStorage so the
 * session survives a page reload. The axios layer attaches the access token
 * and silently renews it via the refresh token (see ./axios.ts).
 */
const ACCESS_TOKEN_KEY = "pf_access_token";
const REFRESH_TOKEN_KEY = "pf_refresh_token";

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function setAccessToken(accessToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}
