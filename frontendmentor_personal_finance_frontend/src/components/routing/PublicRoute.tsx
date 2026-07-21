import { Navigate, Outlet } from "react-router";
import { useAppSelector } from "@/app/store";

/** Keeps already-authenticated users out of the login/signup screens. */
function PublicRoute() {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  return isAuthenticated ? <Navigate to="/" replace /> : <Outlet />;
}

export default PublicRoute;
