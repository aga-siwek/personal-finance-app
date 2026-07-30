import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/app/store";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import ConfirmDeleteDialog from "@/components/common/ConfirmDeleteDialog";
import { deletePot, fetchPots } from "@/features/pots/potsSlice";
import PotCard from "@/features/pots/components/PotCard";
import PotFormDialog from "@/features/pots/components/PotFormDialog";
import PotMoneyDialog from "@/features/pots/components/PotMoneyDialog";
import type { PotDTO } from "@/types/api";

function PotsPage() {
  const dispatch = useAppDispatch();
  const { items, loading, error } = useAppSelector((state) => state.pots);

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<PotDTO | null>(null);
  const [deleting, setDeleting] = useState<PotDTO | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [money, setMoney] = useState<{ pot: PotDTO; op: "add" | "withdraw" } | null>(
    null,
  );

  useEffect(() => {
    dispatch(fetchPots());
  }, [dispatch]);

  const usedThemes = items.map((p) => p.theme);

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    const result = await dispatch(deletePot(deleting.id));
    setDeletingBusy(false);
    if (deletePot.rejected.match(result)) {
      toast.error(result.payload ?? "Could not delete pot.");
      return;
    }
    toast.success("Pot deleted.");
    setDeleting(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[2rem] font-bold text-grey-900">Pots</h1>
        <Button onClick={() => setAddOpen(true)}>+ Add New Pot</Button>
      </div>

      {loading && items.length === 0 ? (
        <div className="mt-20 flex justify-center" role="status" aria-label="Loading pots">
          <Spinner className="size-8 text-grey-500" />
        </div>
      ) : error && items.length === 0 ? (
        <p role="alert" className="mt-8 text-sm text-destructive">
          {error}
        </p>
      ) : items.length === 0 ? (
        <p className="mt-8 text-sm text-grey-500">
          No pots yet. Add one to start saving toward a goal.
        </p>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {items.map((pot) => (
            <PotCard
              key={pot.id}
              pot={pot}
              onEdit={() => setEditing(pot)}
              onDelete={() => setDeleting(pot)}
              onAddMoney={() => setMoney({ pot, op: "add" })}
              onWithdraw={() => setMoney({ pot, op: "withdraw" })}
            />
          ))}
        </div>
      )}

      <PotFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        mode="add"
        usedThemes={usedThemes}
      />

      <PotFormDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        mode="edit"
        pot={editing ?? undefined}
        usedThemes={usedThemes}
      />

      <PotMoneyDialog
        open={money !== null}
        onOpenChange={(open) => !open && setMoney(null)}
        pot={money?.pot}
        operation={money?.op ?? "add"}
      />

      <ConfirmDeleteDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete '${deleting?.name ?? ""}'?`}
        description="Are you sure you want to delete this pot? This action cannot be reversed and all the data inside it will be removed forever."
        onConfirm={confirmDelete}
        loading={deletingBusy}
      />
    </div>
  );
}

export default PotsPage;
