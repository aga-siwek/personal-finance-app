import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Login from "@/features/auth/Login";
import { api } from "@/lib/api/axios";
import { renderWithProviders } from "@/test/utils";

vi.mock("@/lib/api/axios", () => ({
  api: { post: vi.fn(), get: vi.fn() },
}));

const mockedApi = api as unknown as { post: Mock; get: Mock };

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("Login", () => {
  it("renders the heading and fields", () => {
    renderWithProviders(<Login />, { route: "/login" });
    expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("shows validation errors when submitting empty", async () => {
    const userAction = userEvent.setup();
    renderWithProviders(<Login />, { route: "/login" });

    await userAction.click(screen.getByRole("button", { name: "Login" }));

    expect(await screen.findByText("Email is required.")).toBeInTheDocument();
    expect(screen.getByText("Password is required.")).toBeInTheDocument();
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it("toggles password visibility", async () => {
    const userAction = userEvent.setup();
    renderWithProviders(<Login />, { route: "/login" });

    const passwordField = screen.getByLabelText("Password");
    expect(passwordField).toHaveAttribute("type", "password");

    await userAction.click(
      screen.getByRole("button", { name: "Show password" }),
    );
    expect(passwordField).toHaveAttribute("type", "text");

    await userAction.click(
      screen.getByRole("button", { name: "Hide password" }),
    );
    expect(passwordField).toHaveAttribute("type", "password");
  });

  it("dispatches login with the entered credentials", async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: {
        access_token: "a",
        refresh_token: "r",
        user: {
          id: 1,
          name: "Test User",
          email: "test@example.com",
          timezone: "UTC",
          is_admin: false,
          created_at: "",
          updated_at: "",
        },
      },
    });
    const userAction = userEvent.setup();
    renderWithProviders(<Login />, { route: "/login" });

    await userAction.type(screen.getByLabelText("Email"), "test@example.com");
    await userAction.type(screen.getByLabelText("Password"), "password1");
    await userAction.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith("/auth/login", {
        email: "test@example.com",
        password: "password1",
      });
    });
  });

  it("shows a server error when login fails", async () => {
    const { AxiosError } = await import("axios");
    mockedApi.post.mockRejectedValueOnce(
      new AxiosError("fail", "ERR_BAD_REQUEST", undefined, undefined, {
        status: 401,
        data: { error: "Invalid email or password" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any),
    );
    const userAction = userEvent.setup();
    renderWithProviders(<Login />, { route: "/login" });

    await userAction.type(screen.getByLabelText("Email"), "test@example.com");
    await userAction.type(screen.getByLabelText("Password"), "wrongpass");
    await userAction.click(screen.getByRole("button", { name: "Login" }));

    expect(
      await screen.findByText("Invalid email or password"),
    ).toBeInTheDocument();
  });
});
