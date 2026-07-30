import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/utils";
import reducer, { fetchPots } from "@/features/pots/potsSlice";
import PotCard from "@/features/pots/components/PotCard";
import PotMoneyDialog from "@/features/pots/components/PotMoneyDialog";
import type { PotDTO } from "@/types/api";

const pot = (over: Partial<PotDTO>): PotDTO => ({
  id: 1,
  name: "Savings",
  target_amount: 200000,
  total_saved: 15900,
  theme: "#277c78",
  created_at: "",
  updated_at: "",
  ...over,
});

const base = { items: [], loading: false, error: null };

describe("potsSlice", () => {
  it("stores pots on fulfilled", () => {
    const state = reducer(base, { type: fetchPots.fulfilled.type, payload: [pot({})] });
    expect(state.items).toHaveLength(1);
  });
});

describe("PotCard", () => {
  it("renders total saved, percentage and target", () => {
    renderWithProviders(
      <PotCard
        pot={pot({ total_saved: 15900, target_amount: 200000 })}
        onEdit={() => {}}
        onDelete={() => {}}
        onAddMoney={() => {}}
        onWithdraw={() => {}}
      />,
    );
    expect(screen.getByText("$159.00")).toBeInTheDocument();
    expect(screen.getByText("7.95%")).toBeInTheDocument();
    expect(screen.getByText("Target of $2,000")).toBeInTheDocument();
  });

  it("fires the add-money handler", async () => {
    const onAddMoney = vi.fn();
    renderWithProviders(
      <PotCard
        pot={pot({})}
        onEdit={() => {}}
        onDelete={() => {}}
        onAddMoney={onAddMoney}
        onWithdraw={() => {}}
      />,
    );
    screen.getByRole("button", { name: "+ Add Money" }).click();
    expect(onAddMoney).toHaveBeenCalled();
  });
});

describe("PotMoneyDialog", () => {
  it("previews the new total for an addition", () => {
    renderWithProviders(
      <PotMoneyDialog
        open
        onOpenChange={() => {}}
        pot={pot({ total_saved: 15900, target_amount: 200000 })}
        operation="add"
      />,
    );
    // With an empty input the preview shows the current total.
    expect(screen.getByText("$159.00")).toBeInTheDocument();
    expect(screen.getByText("Amount to Add")).toBeInTheDocument();
  });
});
