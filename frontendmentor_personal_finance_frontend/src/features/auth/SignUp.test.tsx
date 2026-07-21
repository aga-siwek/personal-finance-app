import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SignUp from "@/features/auth/SignUp";
import { api } from "@/lib/api/axios";
import { toast } from "sonner";
import { renderWithProviders } from "@/test/utils";

vi.mock("@/lib/api/axios", () => ({
  api: { post: vi.fn(), get: vi.fn() },
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockedApi = api as unknown as { post: Mock; get: Mock };
const mockedToast = vi.mocked(toast);

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("SignUp", () => {
  it("renders the heading, fields and password hint", () => {
    renderWithProviders(<SignUp />, { route: "/signup" });
    expect(screen.getByRole("heading", { name: "Sign Up" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Create Password")).toBeInTheDocument();
    expect(
      screen.getByText("Passwords must be at least 8 characters"),
    ).toBeInTheDocument();
  });

  it("rejects a password shorter than 8 characters", async () => {
    const userAction = userEvent.setup();
    renderWithProviders(<SignUp />, { route: "/signup" });

    await userAction.type(screen.getByLabelText("Name"), "Test User");
    await userAction.type(screen.getByLabelText("Email"), "test@example.com");
    await userAction.type(screen.getByLabelText("Create Password"), "short");
    await userAction.click(
      screen.getByRole("button", { name: "Create Account" }),
    );

    expect(
      await screen.findByText("Passwords must be at least 8 characters."),
    ).toBeInTheDocument();
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it("submits valid data and toasts on success", async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: {
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
    renderWithProviders(<SignUp />, { route: "/signup" });

    await userAction.type(screen.getByLabelText("Name"), "Test User");
    await userAction.type(screen.getByLabelText("Email"), "test@example.com");
    await userAction.type(
      screen.getByLabelText("Create Password"),
      "password1",
    );
    await userAction.click(
      screen.getByRole("button", { name: "Create Account" }),
    );

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith("/auth/signup", {
        name: "Test User",
        email: "test@example.com",
        password: "password1",
      });
    });
    expect(mockedToast.success).toHaveBeenCalled();
  });

  it("shows a server error when the email is taken", async () => {
    const { AxiosError } = await import("axios");
    mockedApi.post.mockRejectedValueOnce(
      new AxiosError("fail", "ERR_BAD_REQUEST", undefined, undefined, {
        status: 409,
        data: { error: "Email is already registered" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any),
    );
    const userAction = userEvent.setup();
    renderWithProviders(<SignUp />, { route: "/signup" });

    await userAction.type(screen.getByLabelText("Name"), "Test User");
    await userAction.type(screen.getByLabelText("Email"), "taken@example.com");
    await userAction.type(
      screen.getByLabelText("Create Password"),
      "password1",
    );
    await userAction.click(
      screen.getByRole("button", { name: "Create Account" }),
    );

    expect(
      await screen.findByText("Email is already registered"),
    ).toBeInTheDocument();
  });
});
