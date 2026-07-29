import { describe, it, expect } from "vitest";
import reducer, { fetchOverview } from "@/features/overview/overviewSlice";
import type { OverviewResponse } from "@/types/api";

const emptyState = { data: null, loading: false, error: null };

const sample: OverviewResponse = {
  balance: 375640,
  income: 539100,
  expenses: 131560,
  pots: { total_count: 0, total_saved: 0, top: [] },
  budgets: { total_count: 0, top: [] },
  latest_transactions: [],
  recurring_bills: { paid: 0, due_soon: 0, upcoming: 0 },
};

describe("overviewSlice", () => {
  it("sets loading on pending", () => {
    const state = reducer(emptyState, { type: fetchOverview.pending.type });
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
  });

  it("stores data on fulfilled", () => {
    const state = reducer(
      { ...emptyState, loading: true },
      { type: fetchOverview.fulfilled.type, payload: sample },
    );
    expect(state.loading).toBe(false);
    expect(state.data).toEqual(sample);
  });

  it("stores the error message on rejected", () => {
    const state = reducer(
      { ...emptyState, loading: true },
      { type: fetchOverview.rejected.type, payload: "Boom" },
    );
    expect(state.loading).toBe(false);
    expect(state.error).toBe("Boom");
  });
});
