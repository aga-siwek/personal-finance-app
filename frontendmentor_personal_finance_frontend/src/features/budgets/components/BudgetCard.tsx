import { useEffect } from "react";
import { Link } from "react-router";
import { MoreHorizontal } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/app/store";
import Avatar from "@/components/common/Avatar";
import { CaretRightIcon } from "@/components/icons/ui-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fetchBudgetSpending } from "@/features/budgets/budgetsSlice";
import { formatCurrency, formatDate } from "@/lib/format";
import type { BudgetSummaryDTO } from "@/types/api";

/** One budget: limit, progress bar, spent/remaining, and its three latest
 * transactions. */
function BudgetCard({
  budget,
  categoryName,
  onEdit,
  onDelete,
}: {
  budget: BudgetSummaryDTO;
  categoryName: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const dispatch = useAppDispatch();
  const latest = useAppSelector(
    (state) => state.budgets.latestByCategory[budget.category_id],
  );

  useEffect(() => {
    dispatch(fetchBudgetSpending(budget.category_id));
  }, [dispatch, budget.category_id]);

  const spentPct = Math.min(
    100,
    budget.max_spend > 0 ? (budget.spent / budget.max_spend) * 100 : 0,
  );
  const remaining = Math.max(0, budget.remaining);

  return (
    <section className="rounded-xl bg-card p-6 md:p-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="size-4 rounded-full"
            style={{ backgroundColor: budget.theme }}
          />
          <h2 className="text-xl font-bold text-grey-900">{categoryName}</h2>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`${categoryName} budget options`}
            className="rounded-full p-1 text-grey-300 transition-colors hover:text-grey-900"
          >
            <MoreHorizontal className="size-5" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onEdit}>Edit Budget</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              Delete Budget
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="mt-5 text-sm text-grey-500">
        Maximum of {formatCurrency(budget.max_spend)}
      </p>

      <div className="mt-4 h-8 rounded bg-beige-100 p-1">
        <div
          className="h-full rounded"
          style={{ width: `${spentPct}%`, backgroundColor: budget.theme }}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="flex gap-4">
          <span
            aria-hidden="true"
            className="w-1 shrink-0 rounded-full"
            style={{ backgroundColor: budget.theme }}
          />
          <div className="flex flex-col gap-1">
            <span className="text-xs text-grey-500">Spent</span>
            <span className="text-sm font-bold text-grey-900">
              {formatCurrency(budget.spent)}
            </span>
          </div>
        </div>
        <div className="flex gap-4">
          <span
            aria-hidden="true"
            className="w-1 shrink-0 rounded-full bg-beige-100"
          />
          <div className="flex flex-col gap-1">
            <span className="text-xs text-grey-500">Remaining</span>
            <span className="text-sm font-bold text-grey-900">
              {formatCurrency(remaining)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-xl bg-beige-100 p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-grey-900">Latest Spending</h3>
          <Link
            to="/transactions"
            className="flex items-center gap-3 text-sm text-grey-500 transition-colors hover:text-grey-900"
          >
            See All
            <CaretRightIcon aria-hidden="true" className="h-3 w-auto" />
          </Link>
        </div>
        {latest && latest.length > 0 ? (
          <ul className="mt-4 flex flex-col">
            {latest.map((tx, i) => (
              <li
                key={tx.id}
                className={`flex items-center justify-between gap-3 py-3 ${i > 0 ? "border-t border-grey-500/15" : "pt-0"}`}
              >
                <div className="flex items-center gap-3">
                  <Avatar name={tx.recipient_name} className="size-8 text-[0.625rem]" />
                  <span className="text-xs font-bold text-grey-900">
                    {tx.recipient_name}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-grey-900">
                    {formatCurrency(tx.amount, { signed: true })}
                  </p>
                  <p className="mt-1 text-[0.6875rem] text-grey-500">
                    {formatDate(tx.transaction_date ?? tx.created_at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-xs text-grey-500">No spending in this category yet.</p>
        )}
      </div>
    </section>
  );
}

export default BudgetCard;
