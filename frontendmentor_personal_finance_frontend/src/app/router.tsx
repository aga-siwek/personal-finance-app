import { createBrowserRouter, Navigate } from "react-router";
import ProtectedRoute from "@/components/routing/ProtectedRoute";
import PublicRoute from "@/components/routing/PublicRoute";
import AppShell from "@/components/layout/AppShell";
import Login from "@/features/auth/Login";
import SignUp from "@/features/auth/SignUp";
import OverviewPage from "@/features/overview/OverviewPage";
import TransactionsPage from "@/features/transactions/TransactionsPage";
import BudgetsPage from "@/features/budgets/BudgetsPage";
import PotsPage from "@/features/pots/PotsPage";
import RecurringBillsPage from "@/features/recurring-bills/RecurringBillsPage";

/**
 * App routes. Public auth screens live under PublicRoute; the authenticated
 * area lives under ProtectedRoute → AppShell (the nav layout).
 */
export const router = createBrowserRouter([
  {
    element: <PublicRoute />,
    children: [
      { path: "/login", element: <Login /> },
      { path: "/signup", element: <SignUp /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: "/", element: <OverviewPage /> },
          { path: "/transactions", element: <TransactionsPage /> },
          { path: "/budgets", element: <BudgetsPage /> },
          { path: "/pots", element: <PotsPage /> },
          { path: "/recurring-bills", element: <RecurringBillsPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
