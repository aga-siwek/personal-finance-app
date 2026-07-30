import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/utils";
import reducer, { fetchTransactions } from "@/features/transactions/transactionsSlice";
import TransactionsList from "@/features/transactions/components/TransactionsList";
import Pagination from "@/features/transactions/components/Pagination";
import type { TransactionDTO } from "@/types/api";

const tx = (over: Partial<TransactionDTO>): TransactionDTO => ({
  id: 1,
  category_id: 11,
  recipient_name: "Emma Richardson",
  amount: 7550,
  transaction_date: "2024-08-19",
  source: "manual",
  created_at: "2024-08-19T00:00:00",
  ...over,
});

const base = { items: [], page: 1, per_page: 10, total: 0, loading: false, error: null };

describe("transactionsSlice", () => {
  it("stores results and pagination on fulfilled", () => {
    const state = reducer(base, {
      type: fetchTransactions.fulfilled.type,
      payload: { transactions: [tx({})], page: 2, per_page: 10, total: 15 },
    });
    expect(state.items).toHaveLength(1);
    expect(state.page).toBe(2);
    expect(state.total).toBe(15);
  });

  it("records an error on rejected", () => {
    const state = reducer({ ...base, loading: true }, {
      type: fetchTransactions.rejected.type,
      payload: "Nope",
    });
    expect(state.error).toBe("Nope");
  });
});

describe("TransactionsList", () => {
  const categoryNames = { 11: "Entertainment", 14: "Dining Out" };

  it("renders rows with category name and signed amounts", () => {
    renderWithProviders(
      <TransactionsList
        transactions={[
          tx({ id: 1, recipient_name: "Emma Richardson", amount: 7550, category_id: 11 }),
          tx({ id: 2, recipient_name: "Savory Bites Bistro", amount: -5550, category_id: 14 }),
        ]}
        categoryNames={categoryNames}
      />,
    );
    // Names appear twice (table + card layouts both render); use getAllByText.
    expect(screen.getAllByText("Emma Richardson").length).toBeGreaterThan(0);
    expect(screen.getAllByText("+$75.50").length).toBeGreaterThan(0);
    expect(screen.getAllByText("-$55.50").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Dining Out").length).toBeGreaterThan(0);
  });

  it("shows an empty state when there are no transactions", () => {
    renderWithProviders(<TransactionsList transactions={[]} categoryNames={{}} />);
    expect(screen.getByText("No transactions found.")).toBeInTheDocument();
  });
});

describe("Pagination", () => {
  it("renders nothing for a single page", () => {
    const { container } = renderWithProviders(
      <Pagination page={1} totalPages={1} onPageChange={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("calls onPageChange when a page is clicked", async () => {
    const onPageChange = vi.fn();
    renderWithProviders(
      <Pagination page={1} totalPages={3} onPageChange={onPageChange} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "2" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("disables Prev on the first page", () => {
    renderWithProviders(
      <Pagination page={1} totalPages={3} onPageChange={() => {}} />,
    );
    expect(screen.getByRole("button", { name: /Prev/i })).toBeDisabled();
  });
});
