import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "@/lib/api/axios";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  clearTokens,
  getAccessToken,
  setTokens,
} from "@/lib/api/tokens";
import type {
  LoginRequest,
  LoginResponse,
  SignupRequest,
  User,
  UserResponse,
} from "@/features/auth/types";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  /** True while restoring a session from a stored token on app load. */
  sessionLoading: boolean;
  loginLoading: boolean;
  loginError: string | null;
  signupLoading: boolean;
  signupError: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  // If a token is already stored, we'll try to restore the session on load.
  sessionLoading: Boolean(getAccessToken()),
  loginLoading: false,
  loginError: null,
  signupLoading: false,
  signupError: null,
};

export const fetchLogin = createAsyncThunk<
  LoginResponse,
  LoginRequest,
  { rejectValue: string }
>("auth/login", async (credentials, { rejectWithValue }) => {
  try {
    const response = await api.post<LoginResponse>("/auth/login", credentials);
    setTokens(response.data.access_token, response.data.refresh_token);
    return response.data;
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, "Invalid email or password."));
  }
});

export const fetchSignup = createAsyncThunk<
  User,
  SignupRequest,
  { rejectValue: string }
>("auth/signup", async (payload, { rejectWithValue }) => {
  try {
    const response = await api.post<UserResponse>("/auth/signup", payload);
    return response.data.user;
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, "Could not create account."));
  }
});

export const fetchLogout = createAsyncThunk("auth/logout", async () => {
  // Best effort: revoke the token server-side, but always clear locally.
  try {
    await api.post("/auth/logout");
  } catch {
    // ignore — logging out must never fail from the user's perspective
  }
  clearTokens();
});

export const fetchCurrentUser = createAsyncThunk<
  User,
  void,
  { rejectValue: string }
>("auth/currentUser", async (_, { rejectWithValue }) => {
  try {
    const response = await api.get<UserResponse>("/users/me");
    return response.data.user;
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err));
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearAuthErrors: (state) => {
      state.loginError = null;
      state.signupError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(fetchLogin.pending, (state) => {
        state.loginLoading = true;
        state.loginError = null;
      })
      .addCase(fetchLogin.fulfilled, (state, action) => {
        state.loginLoading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(fetchLogin.rejected, (state, action) => {
        state.loginLoading = false;
        state.loginError = action.payload ?? "Invalid email or password.";
      })
      // Signup (does not authenticate — user logs in separately)
      .addCase(fetchSignup.pending, (state) => {
        state.signupLoading = true;
        state.signupError = null;
      })
      .addCase(fetchSignup.fulfilled, (state) => {
        state.signupLoading = false;
      })
      .addCase(fetchSignup.rejected, (state, action) => {
        state.signupLoading = false;
        state.signupError = action.payload ?? "Could not create account.";
      })
      // Logout
      .addCase(fetchLogout.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
      })
      // Session restore
      .addCase(fetchCurrentUser.pending, (state) => {
        state.sessionLoading = true;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.sessionLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.sessionLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        clearTokens();
      });
  },
});

export const { clearAuthErrors } = authSlice.actions;
export default authSlice.reducer;
