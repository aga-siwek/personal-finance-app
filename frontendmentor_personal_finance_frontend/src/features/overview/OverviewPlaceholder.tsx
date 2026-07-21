import { useAppDispatch, useAppSelector } from "@/app/store";
import { fetchLogout } from "@/features/auth/authSlice";
import { Button } from "@/components/ui/button";

/**
 * Temporary authenticated landing used to verify the auth flow end-to-end
 * (login → session persists → logout). Replaced by the real app shell +
 * Overview in the next component.
 */
function OverviewPlaceholder() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-xs font-bold tracking-widest text-beige-500 uppercase">
        Overview (placeholder)
      </p>
      <h1 className="text-3xl font-bold text-grey-900">
        Logged in as {user?.name ?? "…"}
      </h1>
      <p className="text-grey-500">{user?.email}</p>
      <Button
        type="button"
        variant="outline"
        onClick={() => dispatch(fetchLogout())}
      >
        Log out
      </Button>
    </div>
  );
}

export default OverviewPlaceholder;
