import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import reducer, {
  fetchRecurringBills,
} from "@/features/recurring-bills/recurringBillsSlice";
import RecurringBillsSummary from "@/features/recurring-bills/components/RecurringBillsSummary";
import RecurringBillsTable from "@/features/recurring-bills/components/RecurringBillsTable";
import { ordinal } from "@/lib/format";
import type { RecurringBillDTO } from "@/types/api";

const bill = (over: Partial<RecurringBillDTO>): RecurringBillDTO => ({
  id: 1,
  title: "Spark Electric Solutions",
  category_id: 12,
  amount: 10000,
  due_day: 2,
  status: "upcoming",
  created_at: "",
  updated_at: "",
  ...over,
});

describe("ordinal", () => {
  it("adds the right suffix", () => {
    expect(ordinal(1)).toBe("1st");
    expect(ordinal(2)).toBe("2nd");
    expect(ordinal(3)).toBe("3rd");
    expect(ordinal(11)).toBe("11th");
    expect(ordinal(21)).toBe("21st");
    expect(ordinal(30)).toBe("30th");
  });
});

describe("recurringBillsSlice", () => {
  it("stores bills on fulfilled", () => {
    const state = reducer(
      { items: [], loading: false, error: null },
      { type: fetchRecurringBills.fulfilled.type, payload: [bill({})] },
    );
    expect(state.items).toHaveLength(1);
  });
});

describe("RecurringBillsSummary", () => {
  it("splits paid / total upcoming / due soon with counts and sums", () => {
    renderWithProviders(
      <RecurringBillsSummary
        bills={[
          bill({ id: 1, amount: 19000, status: "paid" }),
          bill({ id: 2, amount: 13500, status: "upcoming" }),
          bill({ id: 3, amount: 5998, status: "due_soon" }),
        ]}
      />,
    );
    // Total = 19000 + 13500 + 5998 = 38498 -> $384.98
    expect(screen.getByText("$384.98")).toBeInTheDocument();
    expect(screen.getByText("Paid Bills")).toBeInTheDocument();
    // Total Upcoming = not paid = 13500 + 5998 = 19498 -> "2 ($194.98)"
    expect(screen.getByText("2 ($194.98)")).toBeInTheDocument();
    // Due Soon = 5998 -> "1 ($59.98)"
    expect(screen.getByText("1 ($59.98)")).toBeInTheDocument();
  });
});

describe("RecurringBillsTable", () => {
  it("renders bills with monthly due dates and amounts", () => {
    renderWithProviders(
      <RecurringBillsTable
        bills={[bill({ due_day: 2, amount: 10000, status: "paid" })]}
        search=""
        onSearchChange={() => {}}
        sort="latest"
        onSortChange={() => {}}
      />,
    );
    expect(screen.getAllByText("Spark Electric Solutions").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Monthly - 2nd/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("$100.00").length).toBeGreaterThan(0);
  });

  it("shows an empty state when there are no bills", () => {
    renderWithProviders(
      <RecurringBillsTable
        bills={[]}
        search=""
        onSearchChange={() => {}}
        sort="latest"
        onSortChange={() => {}}
      />,
    );
    expect(screen.getByText("No recurring bills found.")).toBeInTheDocument();
  });
});
