/** The authenticated user, as returned by the backend under a `user` key. */
export interface User {
  id: number;
  name: string;
  email: string;
  timezone: string;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
}

/** `POST /auth/login` response. */
export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

/** `POST /auth/signup` and `GET /users/me` response. */
export interface UserResponse {
  user: User;
}
