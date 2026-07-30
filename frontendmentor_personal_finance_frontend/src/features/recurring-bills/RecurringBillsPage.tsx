import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/app/store";
import { Spinner } from "@/components/ui/spinner";
import {
  fetchRecurringBills,
  type RecurringBillSort,
} from "@/features/recurring-bills/recurringBillsSlice";
import RecurringBillsSummary from "@/features/recurring-bills/components/RecurringBillsSummary";
import RecurringBillsTable from "@/features/recurring-bills/components/RecurringBillsTable";

/**
 * Recurring Bills screen (`/recurring-bills`). A total + status summary on the
 * left; a searchable, sortable list on the right. Search is debounced.
 */
function RecurringBillsPage() {
  const dispatch = useAppDispatch();
  const { items, loading, error } = useAppSelector((state) => state.recurringBills);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState<RecurringBillSort>("latest");

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    dispatch(fetchRecurringBills({ search: debouncedSearch, sort }));
  }, [dispatch, debouncedSearch, sort]);

  return (
    <div>
      <h1 className="text-[2rem] font-bold text-grey-900">Recurring Bills</h1>

      {loading && items.length === 0 ? (
        <div className="mt-20 flex justify-center" role="status" aria-label="Loading recurring bills">
          <Spinner className="size-8 text-grey-500" />
        </div>
      ) : error && items.length === 0 ? (
        <p role="alert" className="mt-8 text-sm text-destructive">
          {error}
        </p>
      ) : (
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,337px)_1fr]">
          <RecurringBillsSummary bills={items} />
          <RecurringBillsTable
            bills={items}
            search={search}
            onSearchChange={setSearch}
            sort={sort}
            onSortChange={setSort}
          />
        </div>
      )}
    </div>
  );
}

export default RecurringBillsPage;
