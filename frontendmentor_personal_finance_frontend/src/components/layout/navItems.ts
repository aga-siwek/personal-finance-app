import type { ComponentType, SVGProps } from "react";
import {
  BudgetsIcon,
  OverviewIcon,
  PotsIcon,
  RecurringBillsIcon,
  TransactionsIcon,
} from "@/components/icons/nav-icons";

export interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

/**
 * Single source of the primary navigation entries, shared by the desktop
 * Sidebar and the mobile/tablet BottomNav so the two never drift. Icons are
 * the official Frontend Mentor nav SVGs, inlined as `currentColor` components
 * (see `@/components/icons/nav-icons`) so the active/hover colour states work.
 * `to: "/"` uses `end` matching in the NavLinks so it isn't marked active on
 * child routes.
 */
export const navItems: NavItem[] = [
  { to: "/", label: "Overview", icon: OverviewIcon },
  { to: "/transactions", label: "Transactions", icon: TransactionsIcon },
  { to: "/budgets", label: "Budgets", icon: BudgetsIcon },
  { to: "/pots", label: "Pots", icon: PotsIcon },
  { to: "/recurring-bills", label: "Recurring Bills", icon: RecurringBillsIcon },
];
