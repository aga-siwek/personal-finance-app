import { createBrowserRouter, Navigate } from "react-router";
import ProtectedRoute from "@/components/routing/ProtectedRoute";
import PublicRoute from "@/components/routing/PublicRoute";
import ScreenPlaceholder from "@/components/routing/ScreenPlaceholder";
import AppShell from "@/components/layout/AppShell";
import Login from "@/features/auth/Login";
import SignUp from "@/features/auth/SignUp";
import OverviewPage from "@/features/overview/OverviewPage";

/**
 * App routes. Public auth screens live under PublicRoute; the authenticated
 * area lives under ProtectedRoute → AppShell (the nav layout). `/` is the
 * Overview; the other four render placeholders until their real screens are
 * built in later components.
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
          {
            path: "/transactions",
            element: <ScreenPlaceholder title="Transactions" />,
          },
          { path: "/budgets", element: <ScreenPlaceholder title="Budgets" /> },
          { path: "/pots", element: <ScreenPlaceholder title="Pots" /> },
          {
            path: "/recurring-bills",
            element: <ScreenPlaceholder title="Recurring Bills" />,
          },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
