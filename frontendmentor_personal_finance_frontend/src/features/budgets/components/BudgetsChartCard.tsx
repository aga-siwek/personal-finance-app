import DonutChart from "@/components/charts/DonutChart";
import { formatCurrency } from "@/lib/format";
import type { BudgetSummaryDTO } from "@/types/api";

/** The budgets overview card: a donut of total spent vs. total limit plus a
 * "Spending Summary" list (spent of limit per category). */
function BudgetsChartCard({
  budgets,
  categoryNames,
}: {
  budgets: BudgetSummaryDTO[];
  categoryNames: Record<number, string>;
}) {
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const totalLimit = budgets.reduce((sum, b) => sum + b.max_spend, 0);
  const segments = budgets.map((b) => ({ value: b.max_spend, color: b.theme }));

  return (
    <section className="flex flex-col items-center rounded-xl bg-card p-6 md:p-8">
      <DonutChart segments={segments} size={240} thickness={30}>
        <span className="text-[2rem] font-bold text-grey-900">
          {formatCurrency(totalSpent, { decimals: 0 })}
        </span>
        <span className="mt-1 text-xs text-grey-500">
          of {formatCurrency(totalLimit, { decimals: 0 })} limit
        </span>
      </DonutChart>

      <div className="mt-8 w-full">
        <h2 className="text-xl font-bold text-grey-900">Spending Summary</h2>
        <ul className="mt-6 flex flex-col">
          {budgets.map((b, i) => (
            <li
              key={b.id}
              className={`flex items-center gap-4 py-4 ${i > 0 ? "border-t border-grey-500/15" : "pt-0"}`}
            >
              <span
                aria-hidden="true"
                className="h-5 w-1 shrink-0 rounded-full"
                style={{ backgroundColor: b.theme }}
              />
              <span className="flex-1 text-sm text-grey-500">
                {categoryNames[b.category_id] ?? "—"}
              </span>
              <span className="text-base font-bold text-grey-900">
                {formatCurrency(b.spent)}
              </span>
              <span className="text-xs text-grey-500">
                of {formatCurrency(b.max_spend)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default BudgetsChartCard;
