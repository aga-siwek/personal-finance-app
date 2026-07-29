import DonutChart from "@/components/charts/DonutChart";
import { formatCurrency } from "@/lib/format";
import type { OverviewResponse } from "@/types/api";
import SectionCard from "./SectionCard";

/**
 * Budgets summary: a donut whose segments are each budget's limit (max_spend),
 * coloured by theme, with total spent / total limit in the centre; and a
 * legend of category name + limit. Category names come from the categories
 * slice (the budget payload carries only `category_id`). "See Details" →
 * /budgets.
 */
function BudgetsSummaryCard({
  budgets,
  categoryNames,
}: {
  budgets: OverviewResponse["budgets"];
  categoryNames: Record<number, string>;
}) {
  const shown = budgets.top.slice(0, 4);
  const totalSpent = shown.reduce((sum, b) => sum + b.spent, 0);
  const totalLimit = shown.reduce((sum, b) => sum + b.max_spend, 0);
  const segments = shown.map((b) => ({ value: b.max_spend, color: b.theme }));

  return (
    <SectionCard title="Budgets" action={{ label: "See Details", to: "/budgets" }}>
      {shown.length > 0 ? (
        <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-8">
          <DonutChart segments={segments} size={240} thickness={30}>
            <span className="text-[2rem] font-bold text-grey-900">
              {formatCurrency(totalSpent, { decimals: 0 })}
            </span>
            <span className="mt-1 text-xs text-grey-500">
              of {formatCurrency(totalLimit, { decimals: 0 })} limit
            </span>
          </DonutChart>

          <ul className="grid w-full grid-cols-2 gap-4 sm:w-[140px] sm:grid-cols-1">
            {shown.map((b) => (
              <li key={b.id} className="flex gap-3">
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
          </ul>
        </div>
      ) : (
        <p className="mt-5 text-sm text-grey-500">
          No budgets yet — create one to track your spending.
        </p>
      )}
    </SectionCard>
  );
}

export default BudgetsSummaryCard;
