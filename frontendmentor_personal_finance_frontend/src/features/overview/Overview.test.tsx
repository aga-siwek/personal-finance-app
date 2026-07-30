import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import type { OverviewResponse, TransactionDTO } from "@/types/api";
import SummaryCards from "@/features/overview/components/SummaryCards";
import PotsSummaryCard from "@/features/overview/components/PotsSummaryCard";
import TransactionsSummaryCard from "@/features/overview/components/TransactionsSummaryCard";
import BudgetsSummaryCard from "@/features/overview/components/BudgetsSummaryCard";
import RecurringBillsSummaryCard from "@/features/overview/components/RecurringBillsSummaryCard";
import OverviewPage from "@/features/overview/OverviewPage";

// Hoisted so the mock replaces the shared axios instance before the slices
// (imported transitively via renderWithProviders) capture it.
const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));
vi.mock("@/lib/api/axios", () => ({
  api: { get: mockGet, post: vi.fn() },
}));

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

const overview: OverviewResponse = {
  balance: 375640,
  income: 539100,
  expenses: 131560,
  pots: {
    total_count: 4,
    total_saved: 31900,
    top: [
      { id: 1, name: "Savings", target_amount: 200000, total_saved: 15900, theme: "#277c78", created_at: "", updated_at: "" },
      { id: 2, name: "Gift", target_amount: 60000, total_saved: 4000, theme: "#82c9d7", created_at: "", updated_at: "" },
    ],
  },
  budgets: {
    total_count: 2,
    top: [
      { id: 1, category_id: 14, max_spend: 7500, theme: "#f2cdac", spent: 8050, remaining: -550, created_at: "", updated_at: "" },
      { id: 2, category_id: 12, max_spend: 75000, theme: "#82c9d7", spent: 46500, remaining: 28500, created_at: "", updated_at: "" },
    ],
    unbudgeted: [{ category_id: 13, spent: 4500 }],
  },
  latest_transactions: [
    tx({ id: 1, recipient_name: "Emma Richardson", amount: 7550 }),
    tx({ id: 2, recipient_name: "Savory Bites Bistro", amount: -5550 }),
  ],
  recurring_bills: { paid: 2, due_soon: 1, upcoming: 3 },
};

const categoryNames = { 12: "Bills", 13: "Groceries", 14: "Dining Out" };

describe("SummaryCards", () => {
  it("renders the three headline figures", () => {
    renderWithProviders(
      <SummaryCards balance={375640} income={539100} expenses={131560} />,
    );
    expect(screen.getByText("$3,756.40")).toBeInTheDocument();
    expect(screen.getByText("$5,391.00")).toBeInTheDocument();
    expect(screen.getByText("$1,315.60")).toBeInTheDocument();
  });
});

describe("PotsSummaryCard", () => {
  it("renders total saved (no decimals) and pot names", () => {
    renderWithProviders(<PotsSummaryCard pots={overview.pots} />);
    expect(screen.getByText("$319")).toBeInTheDocument();
    expect(screen.getByText("Savings")).toBeInTheDocument();
    expect(screen.getByText("$159")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /See Details/i })).toHaveAttribute(
      "href",
      "/pots",
    );
  });
});

describe("TransactionsSummaryCard", () => {
  it("renders signed amounts and links to /transactions", () => {
    renderWithProviders(
      <TransactionsSummaryCard transactions={overview.latest_transactions} />,
    );
    expect(screen.getByText("+$75.50")).toBeInTheDocument();
    expect(screen.getByText("-$55.50")).toBeInTheDocument();
    expect(screen.getByText("Emma Richardson")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View All/i })).toHaveAttribute(
      "href",
      "/transactions",
    );
  });
});

describe("BudgetsSummaryCard", () => {
  it("renders total spent/limit and category legend names", () => {
    renderWithProviders(
      <BudgetsSummaryCard budgets={overview.budgets} categoryNames={categoryNames} />,
    );
    // spent 8050 + 46500 = 54550 -> $546 ; limit 7500 + 75000 = 82500 -> $825
    expect(screen.getByText("$546")).toBeInTheDocument();
    expect(screen.getByText(/of \$825 limit/)).toBeInTheDocument();
    expect(screen.getByText("Dining Out")).toBeInTheDocument();
    expect(screen.getByText("$75.00")).toBeInTheDocument();
  });

  it("lists categories with spending but no budget, tagged 'No budget'", () => {
    renderWithProviders(
      <BudgetsSummaryCard budgets={overview.budgets} categoryNames={categoryNames} />,
    );
    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("No budget")).toBeInTheDocument();
    expect(screen.getByText("$45.00")).toBeInTheDocument();
  });
});

describe("RecurringBillsSummaryCard", () => {
  it("renders per-status bill counts", () => {
    renderWithProviders(
      <RecurringBillsSummaryCard recurringBills={overview.recurring_bills} />,
    );
    expect(screen.getByText("Paid Bills")).toBeInTheDocument();
    expect(screen.getByText("2 bills")).toBeInTheDocument();
    expect(screen.getByText("1 bill")).toBeInTheDocument();
    expect(screen.getByText("3 bills")).toBeInTheDocument();
  });
});

describe("OverviewPage", () => {
  it("fetches and renders the dashboard", async () => {
    mockGet.mockImplementation((url: string) =>
      url === "/overview"
        ? Promise.resolve({ data: overview })
        : Promise.resolve({
            data: { categories: [{ id: 14, name: "Dining Out" }] },
          }),
    );
    renderWithProviders(<OverviewPage />);
    expect(await screen.findByText("$3,756.40")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Overview" }),
    ).toBeInTheDocument();
  });
});
