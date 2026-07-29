import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The three headline figures: Current Balance (dark card), Income, Expenses
 * (light cards). Stacked on mobile, a 3-up row from md.
 */
function SummaryCards({
  balance,
  income,
  expenses,
}: {
  balance: number;
  income: number;
  expenses: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-6">
      <SummaryCard label="Current Balance" amount={balance} dark />
      <SummaryCard label="Income" amount={income} />
      <SummaryCard label="Expenses" amount={expenses} />
    </div>
  );
}

function SummaryCard({
  label,
  amount,
  dark = false,
}: {
  label: string;
  amount: number;
  dark?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl p-6",
        dark ? "bg-grey-900 text-white" : "bg-card text-grey-900",
      )}
    >
      <p className={cn("text-sm", dark ? "text-white/80" : "text-grey-500")}>
        {label}
      </p>
      <p className="mt-3 text-[2rem] font-bold">{formatCurrency(amount)}</p>
    </div>
  );
}

export default SummaryCards;
