import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Sidebar from "@/components/layout/Sidebar";
import BottomNav from "@/components/layout/BottomNav";
import { navItems } from "@/components/layout/navItems";
import { renderWithProviders } from "@/test/utils";

const labels = navItems.map((i) => i.label);
const expectedHrefs: Record<string, string> = {
  Overview: "/",
  Transactions: "/transactions",
  Budgets: "/budgets",
  Pots: "/pots",
  "Recurring Bills": "/recurring-bills",
};

describe("Sidebar", () => {
  it("renders all five nav links with correct hrefs", () => {
    renderWithProviders(<Sidebar />, { route: "/" });
    for (const label of labels) {
      const link = screen.getByRole("link", { name: label });
      expect(link).toHaveAttribute("href", expectedHrefs[label]);
    }
  });

  it("marks the current route active (aria-current)", () => {
    renderWithProviders(<Sidebar />, { route: "/transactions" });
    expect(
      screen.getByRole("link", { name: "Transactions" }),
    ).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Overview" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("collapses when Minimize Menu is clicked, hiding labels", async () => {
    const userAction = userEvent.setup();
    const { store } = renderWithProviders(<Sidebar />, { route: "/" });

    expect(screen.getByText("Overview")).toBeInTheDocument();
    await userAction.click(screen.getByRole("button", { name: "Minimize Menu" }));

    expect(store.getState().ui.sidebarCollapsed).toBe(true);
    expect(screen.queryByText("Overview")).not.toBeInTheDocument();
  });
});

describe("BottomNav", () => {
  it("renders all five nav links with correct hrefs", () => {
    renderWithProviders(<BottomNav />, { route: "/" });
    for (const label of labels) {
      const link = screen.getByRole("link", { name: label });
      expect(link).toHaveAttribute("href", expectedHrefs[label]);
    }
  });

  it("marks the current route active (aria-current)", () => {
    renderWithProviders(<BottomNav />, { route: "/pots" });
    expect(screen.getByRole("link", { name: "Pots" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
