import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/app/store";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import ConfirmDeleteDialog from "@/components/common/ConfirmDeleteDialog";
import { fetchCategories } from "@/features/categories/categoriesSlice";
import {
  deleteTransaction,
  fetchTransactions,
  type TransactionSort,
} from "@/features/transactions/transactionsSlice";
import TransactionsFilters from "@/features/transactions/components/TransactionsFilters";
import TransactionsList from "@/features/transactions/components/TransactionsList";
import Pagination from "@/features/transactions/components/Pagination";
import TransactionFormDialog from "@/features/transactions/components/TransactionFormDialog";
import type { TransactionDTO } from "@/types/api";

/**
 * Transactions screen (`/transactions`). Search (debounced), sort, and category
 * filter drive a paginated server query; changing any filter resets to page 1.
 */
function TransactionsPage() {
  const dispatch = useAppDispatch();
  const { items, page, per_page, total, loading, error } = useAppSelector(
    (state) => state.transactions,
  );
  const categories = useAppSelector((state) => state.categories.items);
  const categoryNames = useAppSelector((state) => state.categories.namesById);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState<TransactionSort>("latest");
  const [category, setCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<TransactionDTO | null>(null);
  const [deleting, setDeleting] = useState<TransactionDTO | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  const defaultCategoryId = categories.find((c) => c.name === "General")?.id;
  const refresh = () => setRefreshToken((n) => n + 1);

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    const result = await dispatch(deleteTransaction(deleting.id));
    setDeletingBusy(false);
    if (deleteTransaction.rejected.match(result)) {
      toast.error(result.payload ?? "Could not delete transaction.");
      return;
    }
    toast.success("Transaction deleted.");
    setDeleting(null);
    refresh();
  };

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  // Debounce the search input.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(id);
  }, [search]);

  // Reset to the first page whenever a filter changes.
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, sort, category]);

  useEffect(() => {
    dispatch(
      fetchTransactions({
        page: currentPage,
        per_page: 10,
        search: debouncedSearch,
        sort,
        category_id: category === "all" ? "all" : Number(category),
      }),
    );
  }, [dispatch, currentPage, debouncedSearch, sort, category, refreshToken]);

  const totalPages = Math.ceil(total / per_page);

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[2rem] font-bold text-grey-900">Transactions</h1>
        <Button onClick={() => setAddOpen(true)}>+ Add Transaction</Button>
      </div>

      <div className="mt-8 rounded-xl bg-card p-6 md:p-8">
        <TransactionsFilters
          search={search}
          onSearchChange={setSearch}
          sort={sort}
          onSortChange={setSort}
          category={category}
          onCategoryChange={setCategory}
          categories={categories}
        />

        <div className="mt-6">
          {loading && items.length === 0 ? (
            <div className="flex justify-center py-10" role="status" aria-label="Loading transactions">
              <Spinner className="size-8 text-grey-500" />
            </div>
          ) : error ? (
            <p role="alert" className="py-10 text-center text-sm text-destructive">
              {error}
            </p>
          ) : (
            <>
              <TransactionsList
                transactions={items}
                categoryNames={categoryNames}
                onEdit={(tx) => setEditing(tx)}
                onDelete={(tx) => setDeleting(tx)}
              />
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </div>
      </div>

      <TransactionFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        mode="add"
        categories={categories}
        defaultCategoryId={defaultCategoryId}
        onSaved={() => {
          setCurrentPage(1);
          refresh();
        }}
      />

      <TransactionFormDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        mode="edit"
        transaction={editing ?? undefined}
        categories={categories}
        onSaved={refresh}
      />

      <ConfirmDeleteDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete '${deleting?.recipient_name ?? ""}'?`}
        description="Are you sure you want to delete this transaction? This action cannot be reversed."
        onConfirm={confirmDelete}
        loading={deletingBusy}
      />
    </div>
  );
}

export default TransactionsPage;
