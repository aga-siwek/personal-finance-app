import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import reducer, {
  fetchBudgets,
  fetchBudgetSpending,
} from "@/features/budgets/budgetsSlice";
import BudgetsChartCard from "@/features/budgets/components/BudgetsChartCard";
import BudgetCard from "@/features/budgets/components/BudgetCard";
import type { BudgetSummaryDTO } from "@/types/api";

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn(() => Promise.resolve({ data: { transactions: [] } })) }));
vi.mock("@/lib/api/axios", () => ({
  api: { get: mockGet, post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const budget = (over: Partial<BudgetSummaryDTO>): BudgetSummaryDTO => ({
  id: 1,
  category_id: 11,
  max_spend: 5000,
  theme: "#277c78",
  spent: 3000,
  remaining: 2000,
  created_at: "",
  updated_at: "",
  ...over,
});

const base = { items: [], latestByCategory: {}, loading: false, error: null };

describe("budgetsSlice", () => {
  it("stores budgets on fulfilled", () => {
    const state = reducer(base, {
      type: fetchBudgets.fulfilled.type,
      payload: [budget({})],
    });
    expect(state.items).toHaveLength(1);
  });

  it("stores latest spending keyed by category", () => {
    const state = reducer(base, {
      type: fetchBudgetSpending.fulfilled.type,
      payload: { categoryId: 11, transactions: [{ id: 9 }] },
    });
    expect(state.latestByCategory[11]).toHaveLength(1);
  });
});

describe("BudgetsChartCard", () => {
  it("renders total spent/limit and spending summary", () => {
    renderWithProviders(
      <BudgetsChartCard
        budgets={[
          budget({ id: 1, category_id: 11, spent: 3000, max_spend: 5000 }),
          budget({ id: 2, category_id: 12, spent: 46500, max_spend: 75000 }),
        ]}
        categoryNames={{ 11: "Entertainment", 12: "Bills" }}
      />,
    );
    // total spent 3000 + 46500 = 49500 -> $495 ; limit 80000 -> $800
    expect(screen.getByText("$495")).toBeInTheDocument();
    expect(screen.getByText(/of \$800 limit/)).toBeInTheDocument();
    expect(screen.getByText("Spending Summary")).toBeInTheDocument();
    expect(screen.getByText("Entertainment")).toBeInTheDocument();
  });
});

describe("BudgetCard", () => {
  it("renders limit, spent and remaining", () => {
    renderWithProviders(
      <BudgetCard
        budget={budget({ max_spend: 5000, spent: 1500, remaining: 3500 })}
        categoryName="Entertainment"
        onEdit={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByText("Maximum of $50.00")).toBeInTheDocument();
    expect(screen.getByText("$15.00")).toBeInTheDocument();
    expect(screen.getByText("$35.00")).toBeInTheDocument();
  });
});
