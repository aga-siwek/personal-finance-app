import { useEffect } from "react";
import { RouterProvider } from "react-router";
import { router } from "@/app/router";
import { useAppDispatch, useAppSelector } from "@/app/store";
import { fetchCurrentUser } from "@/features/auth/authSlice";
import { getAccessToken } from "@/lib/api/tokens";
import { Spinner } from "@/components/ui/spinner";

function App() {
  const dispatch = useAppDispatch();
  const sessionLoading = useAppSelector((state) => state.auth.sessionLoading);

  // Restore the session on load if a token is already stored.
  useEffect(() => {
    if (getAccessToken()) {
      dispatch(fetchCurrentUser());
    }
  }, [dispatch]);

  if (sessionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-8 text-grey-500" />
      </div>
    );
  }

  return <RouterProvider router={router} />;
}

export default App;
