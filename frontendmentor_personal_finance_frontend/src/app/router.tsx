import { createBrowserRouter, Navigate } from "react-router";
import ProtectedRoute from "@/components/routing/ProtectedRoute";
import PublicRoute from "@/components/routing/PublicRoute";
import Login from "@/features/auth/Login";
import SignUp from "@/features/auth/SignUp";
import OverviewPlaceholder from "@/features/overview/OverviewPlaceholder";

/**
 * App routes. Public auth screens live under PublicRoute; everything else is
 * behind ProtectedRoute. The protected `/` currently renders a placeholder —
 * later stages add the app-shell child routes (transactions, budgets, pots,
 * recurring-bills).
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
    children: [{ path: "/", element: <OverviewPlaceholder /> }],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
