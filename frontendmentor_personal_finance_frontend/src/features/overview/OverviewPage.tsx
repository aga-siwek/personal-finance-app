import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/app/store";
import { Spinner } from "@/components/ui/spinner";
import { fetchOverview } from "@/features/overview/overviewSlice";
import { fetchCategories } from "@/features/categories/categoriesSlice";
import SummaryCards from "@/features/overview/components/SummaryCards";
import PotsSummaryCard from "@/features/overview/components/PotsSummaryCard";
import TransactionsSummaryCard from "@/features/overview/components/TransactionsSummaryCard";
import BudgetsSummaryCard from "@/features/overview/components/BudgetsSummaryCard";
import RecurringBillsSummaryCard from "@/features/overview/components/RecurringBillsSummaryCard";

/**
 * The Overview dashboard (`/`). One aggregated `GET /overview` fetch feeds
 * every card; categories are fetched alongside for the budgets legend's names.
 * Mobile/tablet stack in one column; from lg the content splits into two
 * columns (Pots + Transactions | Budgets + Recurring Bills).
 */
function OverviewPage() {
  const dispatch = useAppDispatch();
  const { data, loading, error } = useAppSelector((state) => state.overview);
  const categoryNames = useAppSelector((state) => state.categories.namesById);

  useEffect(() => {
    dispatch(fetchOverview());
    dispatch(fetchCategories());
  }, [dispatch]);

  return (
    <div>
      <h1 className="text-[2rem] font-bold text-grey-900">Overview</h1>

      {loading && !data && (
        <div className="mt-20 flex justify-center" role="status" aria-label="Loading overview">
          <Spinner className="size-8 text-grey-500" />
        </div>
      )}

      {error && !data && (
        <p role="alert" className="mt-8 text-sm text-destructive">
          {error}
        </p>
      )}

      {data && (
        <>
          <div className="mt-8">
            <SummaryCards
              balance={data.balance}
              income={data.income}
              expenses={data.expenses}
            />
          </div>

          <div className="mt-6 grid items-start gap-4 md:gap-6 lg:grid-cols-[7fr_5fr]">
            <div className="flex flex-col gap-4 md:gap-6">
              <PotsSummaryCard pots={data.pots} />
              <TransactionsSummaryCard transactions={data.latest_transactions} />
            </div>
            <div className="flex flex-col gap-4 md:gap-6">
              <BudgetsSummaryCard
                budgets={data.budgets}
                categoryNames={categoryNames}
              />
              <RecurringBillsSummaryCard recurringBills={data.recurring_bills} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default OverviewPage;
