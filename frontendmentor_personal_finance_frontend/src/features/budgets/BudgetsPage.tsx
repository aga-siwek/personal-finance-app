import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/app/store";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import ConfirmDeleteDialog from "@/components/common/ConfirmDeleteDialog";
import { fetchCategories } from "@/features/categories/categoriesSlice";
import {
  deleteBudget,
  fetchBudgets,
} from "@/features/budgets/budgetsSlice";
import BudgetsChartCard from "@/features/budgets/components/BudgetsChartCard";
import BudgetCard from "@/features/budgets/components/BudgetCard";
import BudgetFormDialog from "@/features/budgets/components/BudgetFormDialog";
import type { BudgetSummaryDTO } from "@/types/api";

function BudgetsPage() {
  const dispatch = useAppDispatch();
  const { items, loading, error } = useAppSelector((state) => state.budgets);
  const categories = useAppSelector((state) => state.categories.items);
  const categoryNames = useAppSelector((state) => state.categories.namesById);

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetSummaryDTO | null>(null);
  const [deleting, setDeleting] = useState<BudgetSummaryDTO | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  useEffect(() => {
    dispatch(fetchBudgets());
    dispatch(fetchCategories());
  }, [dispatch]);

  const usedThemes = items.map((b) => b.theme);
  const budgetedCategoryIds = new Set(items.map((b) => b.category_id));
  const availableCategories = categories.filter(
    (c) => !budgetedCategoryIds.has(c.id),
  );

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    const result = await dispatch(deleteBudget(deleting.id));
    setDeletingBusy(false);
    if (deleteBudget.rejected.match(result)) {
      toast.error(result.payload ?? "Could not delete budget.");
      return;
    }
    toast.success("Budget deleted.");
    setDeleting(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[2rem] font-bold text-grey-900">Budgets</h1>
        <Button onClick={() => setAddOpen(true)}>+ Add New Budget</Button>
      </div>

      {loading && items.length === 0 ? (
        <div className="mt-20 flex justify-center" role="status" aria-label="Loading budgets">
          <Spinner className="size-8 text-grey-500" />
        </div>
      ) : error && items.length === 0 ? (
        <p role="alert" className="mt-8 text-sm text-destructive">
          {error}
        </p>
      ) : items.length === 0 ? (
        <p className="mt-8 text-sm text-grey-500">
          No budgets yet. Add one to start tracking your spending by category.
        </p>
      ) : (
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,428px)_1fr]">
          <BudgetsChartCard budgets={items} categoryNames={categoryNames} />
          <div className="flex flex-col gap-6">
            {items.map((budget) => (
              <BudgetCard
                key={budget.id}
                budget={budget}
                categoryName={categoryNames[budget.category_id] ?? "—"}
                onEdit={() => setEditing(budget)}
                onDelete={() => setDeleting(budget)}
              />
            ))}
          </div>
        </div>
      )}

      <BudgetFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        mode="add"
        availableCategories={availableCategories}
        usedThemes={usedThemes}
      />

      <BudgetFormDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        mode="edit"
        budget={editing ?? undefined}
        categoryName={editing ? categoryNames[editing.category_id] : undefined}
        availableCategories={availableCategories}
        usedThemes={usedThemes}
      />

      <ConfirmDeleteDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete '${deleting ? categoryNames[deleting.category_id] : ""}'?`}
        description="Are you sure you want to delete this budget? This action cannot be reversed and all the data inside it will be removed forever."
        onConfirm={confirmDelete}
        loading={deletingBusy}
      />
    </div>
  );
}

export default BudgetsPage;
