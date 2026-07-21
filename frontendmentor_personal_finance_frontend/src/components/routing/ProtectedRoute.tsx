import { Navigate, Outlet } from "react-router";
import { useAppSelector } from "@/app/store";

/** Guards the authenticated area against unauthenticated users. */
function ProtectedRoute() {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

export default ProtectedRoute;
