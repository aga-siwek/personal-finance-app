import { AxiosError } from "axios";

interface ApiErrorBody {
  error?: string;
  details?: Record<string, string[]>;
}

/**
 * Turn a failed request into a user-facing message. The backend returns
 * `{ error }` for business/auth errors and adds `{ details: {field:[msgs]} }`
 * for validation failures. Field-level validation messages win (most
 * specific), then the top-level `error`, then a generic fallback.
 */
export function getApiErrorMessage(
  err: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as ApiErrorBody | undefined;
    const firstField = data?.details && Object.values(data.details)[0];
    if (firstField && firstField.length > 0) {
      return firstField[0];
    }
    if (data?.error) {
      return data.error;
    }
    if (err.code === "ERR_NETWORK") {
      return "Can't reach the server. Please check your connection and try again.";
    }
  }
  return fallback;
}
