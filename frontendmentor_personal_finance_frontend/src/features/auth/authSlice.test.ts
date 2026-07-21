import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { AxiosError, type AxiosResponse } from "axios";
import authReducer, {
  clearAuthErrors,
  fetchCurrentUser,
  fetchLogin,
  fetchLogout,
  fetchSignup,
} from "@/features/auth/authSlice";
import { api } from "@/lib/api/axios";

vi.mock("@/lib/api/axios", () => ({
  api: { post: vi.fn(), get: vi.fn() },
}));

const mockedApi = api as unknown as { post: Mock; get: Mock };

const user = {
  id: 1,
  name: "Test User",
  email: "test@example.com",
  timezone: "UTC",
  is_admin: false,
  created_at: "2026-07-14T11:23:25.688519",
  updated_at: "2026-07-14T11:23:25.688523",
};

function makeStore() {
  return configureStore({ reducer: { auth: authReducer } });
}

/** Build a rejected value that looks like a real backend AxiosError. */
function axiosErrorWith(status: number, data: unknown) {
  return new AxiosError(
    "Request failed",
    "ERR_BAD_REQUEST",
    undefined,
    undefined,
    { status, data } as AxiosResponse,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("authSlice", () => {
  it("starts unauthenticated with no stored token", () => {
    const { auth } = makeStore().getState();
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.user).toBeNull();
    expect(auth.sessionLoading).toBe(false);
  });

  it("clearAuthErrors resets login and signup errors", () => {
    const store = makeStore();
    // seed errors via rejected reducers is overkill; dispatch the action on a
    // manually-set state instead by reducing directly.
    const next = authReducer(
      {
        user: null,
        isAuthenticated: false,
        sessionLoading: false,
        loginLoading: false,
        loginError: "bad",
        signupLoading: false,
        signupError: "dupe",
      },
      clearAuthErrors(),
    );
    expect(next.loginError).toBeNull();
    expect(next.signupError).toBeNull();
    // store unused beyond type-check
    expect(store.getState().auth).toBeDefined();
  });

  describe("fetchLogin", () => {
    it("stores user + tokens and authenticates on success", async () => {
      mockedApi.post.mockResolvedValueOnce({
        data: {
          access_token: "access-123",
          refresh_token: "refresh-456",
          user,
        },
      });
      const store = makeStore();
      await store.dispatch(fetchLogin({ email: user.email, password: "pw" }));

      const { auth } = store.getState();
      expect(auth.isAuthenticated).toBe(true);
      expect(auth.user).toEqual(user);
      expect(auth.loginLoading).toBe(false);
      expect(auth.loginError).toBeNull();
      expect(localStorage.getItem("pf_access_token")).toBe("access-123");
      expect(localStorage.getItem("pf_refresh_token")).toBe("refresh-456");
    });

    it("surfaces the backend message on bad credentials (401)", async () => {
      mockedApi.post.mockRejectedValueOnce(
        axiosErrorWith(401, { error: "Invalid email or password" }),
      );
      const store = makeStore();
      await store.dispatch(fetchLogin({ email: user.email, password: "x" }));

      const { auth } = store.getState();
      expect(auth.isAuthenticated).toBe(false);
      expect(auth.loginError).toBe("Invalid email or password");
      expect(localStorage.getItem("pf_access_token")).toBeNull();
    });
  });

  describe("fetchSignup", () => {
    it("succeeds without authenticating (login is a separate step)", async () => {
      mockedApi.post.mockResolvedValueOnce({ data: { user } });
      const store = makeStore();
      await store.dispatch(
        fetchSignup({ name: user.name, email: user.email, password: "password1" }),
      );

      const { auth } = store.getState();
      expect(auth.signupLoading).toBe(false);
      expect(auth.signupError).toBeNull();
      expect(auth.isAuthenticated).toBe(false);
      expect(localStorage.getItem("pf_access_token")).toBeNull();
    });

    it("surfaces the duplicate-email message (409)", async () => {
      mockedApi.post.mockRejectedValueOnce(
        axiosErrorWith(409, { error: "Email is already registered" }),
      );
      const store = makeStore();
      await store.dispatch(
        fetchSignup({ name: user.name, email: user.email, password: "password1" }),
      );

      expect(store.getState().auth.signupError).toBe(
        "Email is already registered",
      );
    });
  });

  describe("fetchCurrentUser", () => {
    it("restores the session on success", async () => {
      mockedApi.get.mockResolvedValueOnce({ data: { user } });
      const store = makeStore();
      await store.dispatch(fetchCurrentUser());

      const { auth } = store.getState();
      expect(auth.isAuthenticated).toBe(true);
      expect(auth.user).toEqual(user);
      expect(auth.sessionLoading).toBe(false);
    });

    it("clears tokens and stays unauthenticated on failure", async () => {
      localStorage.setItem("pf_access_token", "stale");
      localStorage.setItem("pf_refresh_token", "stale");
      mockedApi.get.mockRejectedValueOnce(
        axiosErrorWith(401, { error: "Authentication required" }),
      );
      const store = makeStore();
      await store.dispatch(fetchCurrentUser());

      const { auth } = store.getState();
      expect(auth.isAuthenticated).toBe(false);
      expect(auth.sessionLoading).toBe(false);
      expect(localStorage.getItem("pf_access_token")).toBeNull();
    });
  });

  describe("fetchLogout", () => {
    it("clears session even if the API call fails", async () => {
      localStorage.setItem("pf_access_token", "a");
      localStorage.setItem("pf_refresh_token", "r");
      mockedApi.post.mockRejectedValueOnce(new Error("network"));
      const store = makeStore();
      // put the store in an authenticated-looking state first
      mockedApi.get.mockResolvedValueOnce({ data: { user } });
      await store.dispatch(fetchCurrentUser());

      await store.dispatch(fetchLogout());

      const { auth } = store.getState();
      expect(auth.isAuthenticated).toBe(false);
      expect(auth.user).toBeNull();
      expect(localStorage.getItem("pf_access_token")).toBeNull();
    });
  });
});
