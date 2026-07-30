import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/utils";
import AddTransactionDialog from "@/features/transactions/components/AddTransactionDialog";
import type { CategoryDTO } from "@/types/api";

const { mockPost } = vi.hoisted(() => ({
  mockPost: vi.fn(() => Promise.resolve({ data: {} })),
}));
vi.mock("@/lib/api/axios", () => ({
  api: { post: mockPost, get: vi.fn(() => Promise.resolve({ data: {} })) },
}));

const categories: CategoryDTO[] = [
  { id: 20, name: "General", created_at: "", updated_at: "" },
  { id: 19, name: "Education", created_at: "", updated_at: "" },
];

beforeEach(() => mockPost.mockClear());

function renderDialog() {
  return renderWithProviders(
    <AddTransactionDialog
      open
      onOpenChange={() => {}}
      categories={categories}
      defaultCategoryId={20}
      onCreated={() => {}}
    />,
  );
}

describe("AddTransactionDialog", () => {
  it("posts a negative amount for an expense (the default)", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.type(screen.getByLabelText("Transaction Name"), "Coffee Shop");
    await user.type(screen.getByLabelText("Amount"), "10");
    await user.click(screen.getByRole("button", { name: "Add Transaction" }));

    await waitFor(() => expect(mockPost).toHaveBeenCalled());
    expect(mockPost).toHaveBeenCalledWith(
      "/transactions",
      expect.objectContaining({
        recipient_name: "Coffee Shop",
        amount: -1000,
        category_id: 20,
      }),
    );
  });

  it("posts a positive amount when Income is selected", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.type(screen.getByLabelText("Transaction Name"), "Salary");
    await user.type(screen.getByLabelText("Amount"), "25");
    await user.click(screen.getByRole("radio", { name: "income" }));
    await user.click(screen.getByRole("button", { name: "Add Transaction" }));

    await waitFor(() => expect(mockPost).toHaveBeenCalled());
    expect(mockPost).toHaveBeenCalledWith(
      "/transactions",
      expect.objectContaining({ amount: 2500 }),
    );
  });

  it("blocks submit and shows an error when the name is empty", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.type(screen.getByLabelText("Amount"), "10");
    await user.click(screen.getByRole("button", { name: "Add Transaction" }));

    expect(await screen.findByText("Enter a transaction name.")).toBeInTheDocument();
    expect(mockPost).not.toHaveBeenCalled();
  });
});
