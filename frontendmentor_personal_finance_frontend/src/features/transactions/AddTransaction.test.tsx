import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/utils";
import TransactionFormDialog from "@/features/transactions/components/TransactionFormDialog";
import type { CategoryDTO, TransactionDTO } from "@/types/api";

const { mockPost, mockPut } = vi.hoisted(() => ({
  mockPost: vi.fn(() => Promise.resolve({ data: {} })),
  mockPut: vi.fn(() => Promise.resolve({ data: {} })),
}));
vi.mock("@/lib/api/axios", () => ({
  api: {
    post: mockPost,
    put: mockPut,
    delete: vi.fn(() => Promise.resolve({ data: {} })),
    get: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

const categories: CategoryDTO[] = [
  { id: 20, name: "General", created_at: "", updated_at: "" },
  { id: 19, name: "Education", created_at: "", updated_at: "" },
];

beforeEach(() => {
  mockPost.mockClear();
  mockPut.mockClear();
});

function renderAdd() {
  return renderWithProviders(
    <TransactionFormDialog
      open
      onOpenChange={() => {}}
      mode="add"
      categories={categories}
      defaultCategoryId={20}
      onSaved={() => {}}
    />,
  );
}

describe("TransactionFormDialog — add", () => {
  it("posts a negative amount for an expense (the default)", async () => {
    const user = userEvent.setup();
    renderAdd();
    await user.type(screen.getByLabelText("Transaction Name"), "Coffee Shop");
    await user.type(screen.getByLabelText("Amount"), "10");
    await user.click(screen.getByRole("button", { name: "Add Transaction" }));

    await waitFor(() => expect(mockPost).toHaveBeenCalled());
    expect(mockPost).toHaveBeenCalledWith(
      "/transactions",
      expect.objectContaining({ recipient_name: "Coffee Shop", amount: -1000, category_id: 20 }),
    );
  });

  it("posts a positive amount when Income is selected", async () => {
    const user = userEvent.setup();
    renderAdd();
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
    renderAdd();
    await user.type(screen.getByLabelText("Amount"), "10");
    await user.click(screen.getByRole("button", { name: "Add Transaction" }));

    expect(await screen.findByText("Enter a transaction name.")).toBeInTheDocument();
    expect(mockPost).not.toHaveBeenCalled();
  });
});

describe("TransactionFormDialog — edit", () => {
  const transaction: TransactionDTO = {
    id: 7,
    category_id: 20,
    recipient_name: "Old Name",
    amount: -5000, // expense $50
    transaction_date: "2024-08-19",
    source: "manual",
    created_at: "2024-08-19T00:00:00",
    updated_at: null,
  };

  it("prefills from the transaction and PUTs the edited signed amount", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <TransactionFormDialog
        open
        onOpenChange={() => {}}
        mode="edit"
        transaction={transaction}
        categories={categories}
        onSaved={() => {}}
      />,
    );

    // Prefilled name + amount (absolute value of the stored cents).
    expect(screen.getByLabelText("Transaction Name")).toHaveValue("Old Name");
    expect(screen.getByLabelText("Amount")).toHaveValue(50);

    const amount = screen.getByLabelText("Amount");
    await user.clear(amount);
    await user.type(amount, "20");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(mockPut).toHaveBeenCalled());
    expect(mockPut).toHaveBeenCalledWith(
      "/transactions/7",
      expect.objectContaining({ amount: -2000, recipient_name: "Old Name" }),
    );
  });
});
