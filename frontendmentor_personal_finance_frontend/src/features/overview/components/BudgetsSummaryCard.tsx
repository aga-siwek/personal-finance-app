import DonutChart from "@/components/charts/DonutChart";
import { formatCurrency } from "@/lib/format";
import type { OverviewResponse } from "@/types/api";
import SectionCard from "./SectionCard";

/**
 * Budgets summary: a donut whose segments are each budget's limit (max_spend),
 * coloured by theme, with total spent / total limit in the centre; and a
 * legend of category name + limit. Categories that have spending but no budget
 * are listed too, tagged "No budget" (they carry no limit, so they're excluded
 * from the donut). Category names come from the categories slice. "See
 * Details" → /budgets.
 */
function BudgetsSummaryCard({
  budgets,
  categoryNames,
}: {
  budgets: OverviewResponse["budgets"];
  categoryNames: Record<number, string>;
}) {
  const shown = budgets.top.slice(0, 4);
  const unbudgeted = budgets.unbudgeted ?? [];
  const totalSpent = shown.reduce((sum, b) => sum + b.spent, 0);
  const totalLimit = shown.reduce((sum, b) => sum + b.max_spend, 0);
  const segments = shown.map((b) => ({ value: b.max_spend, color: b.theme }));

  const hasContent = shown.length > 0 || unbudgeted.length > 0;

  const legend = (
    <ul className="grid w-full grid-cols-2 gap-4 sm:grid-cols-1">
      {shown.map((b) => (
        <li key={`b-${b.id}`} className="flex gap-3">
          <span
            aria-hidden="true"
            className="w-1 shrink-0 rounded-full"
            style={{ backgroundColor: b.theme }}
          />
          <div className="flex flex-col">
            <span className="text-xs text-grey-500">
              {categoryNames[b.category_id] ?? "Uncategorised"}
            </span>
            <span className="text-sm font-bold text-grey-900">
              {formatCurrency(b.max_spend)}
            </span>
          </div>
        </li>
      ))}
      {unbudgeted.map((u) => (
        <li key={`u-${u.category_id}`} className="flex gap-3">
          <span
            aria-hidden="true"
            className="w-1 shrink-0 rounded-full bg-grey-300"
          />
          <div className="flex flex-col">
            <span className="flex items-center gap-2 text-xs text-grey-500">
              {categoryNames[u.category_id] ?? "Uncategorised"}
              <span className="rounded bg-grey-100 px-1.5 py-0.5 text-[0.625rem] font-bold text-grey-500">
                No budget
              </span>
            </span>
            <span className="text-sm font-bold text-grey-900">
              {formatCurrency(u.spent)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );

  return (
    <SectionCard title="Budgets" action={{ label: "See Details", to: "/budgets" }}>
      {!hasContent ? (
        <p className="mt-5 text-sm text-grey-500">
          No budgets yet — create one to track your spending.
        </p>
      ) : shown.length > 0 ? (
        <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-8">
          <DonutChart segments={segments} size={240} thickness={30}>
            <span className="text-[2rem] font-bold text-grey-900">
              {formatCurrency(totalSpent, { decimals: 0 })}
            </span>
            <span className="mt-1 text-xs text-grey-500">
              of {formatCurrency(totalLimit, { decimals: 0 })} limit
            </span>
          </DonutChart>
          <div className="w-full sm:w-[160px]">{legend}</div>
        </div>
      ) : (
        // Spending exists, but no budgets yet — show the list without a donut.
        <div className="mt-5">{legend}</div>
      )}
    </SectionCard>
  );
}

export default BudgetsSummaryCard;
