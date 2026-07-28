import { useAppDispatch, useAppSelector } from "@/app/store";
import { fetchLogout } from "@/features/auth/authSlice";
import { Button } from "@/components/ui/button";

/**
 * Temporary Overview screen: proves the auth + shell wiring end-to-end
 * (who's logged in, plus a logout while the design has no dedicated place for
 * it). Replaced by the real Overview in its own component.
 */
function OverviewPlaceholder() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  return (
    <div>
      <h1 className="text-[2rem] font-bold text-grey-900">Overview</h1>
      <p className="mt-4 text-grey-500">
        Logged in as{" "}
        <span className="font-bold text-grey-900">{user?.name ?? "…"}</span>
        {user?.email ? ` (${user.email})` : ""}
      </p>
      <Button
        type="button"
        variant="outline"
        className="mt-6"
        onClick={() => dispatch(fetchLogout())}
      >
        Log out
      </Button>
    </div>
  );
}

export default OverviewPlaceholder;
