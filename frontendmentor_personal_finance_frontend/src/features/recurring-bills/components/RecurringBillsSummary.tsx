import { RecurringBillsIcon } from "@/components/icons/nav-icons";
import { formatCurrency } from "@/lib/format";
import type { RecurringBillDTO } from "@/types/api";

/**
 * Left column: the dark "Total Bills" card and the "Summary" breakdown.
 * Counts/sums are derived from the fetched list (the API returns each bill's
 * amount + status, but no pre-summed totals). "Total Upcoming" is every
 * not-yet-paid bill; "Due Soon" is the subset of those close to their due
 * date.
 */
function RecurringBillsSummary({ bills }: { bills: RecurringBillDTO[] }) {
  const total = bills.reduce((sum, b) => sum + b.amount, 0);
  const paid = bills.filter((b) => b.status === "paid");
  const upcoming = bills.filter((b) => b.status !== "paid");
  const dueSoon = bills.filter((b) => b.status === "due_soon");

  const sum = (list: RecurringBillDTO[]) =>
    list.reduce((acc, b) => acc + b.amount, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl bg-grey-900 p-6 text-white">
        <RecurringBillsIcon aria-hidden="true" className="h-7 w-auto" />
        <p className="mt-8 text-sm text-white/80">Total Bills</p>
        <p className="mt-2 text-[2rem] font-bold">{formatCurrency(total)}</p>
      </div>

      <div className="rounded-xl bg-card p-6">
        <h2 className="text-base font-bold text-grey-900">Summary</h2>
        <dl className="mt-5 flex flex-col">
          <SummaryRow label="Paid Bills" count={paid.length} amount={sum(paid)} />
          <SummaryRow
            label="Total Upcoming"
            count={upcoming.length}
            amount={sum(upcoming)}
          />
          <SummaryRow
            label="Due Soon"
            count={dueSoon.length}
            amount={sum(dueSoon)}
            danger
          />
        </dl>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  count,
  amount,
  danger = false,
}: {
  label: string;
  count: number;
  amount: number;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-grey-500/15 py-4 last:border-0 last:pb-0 first:pt-0">
      <dt className={`text-xs ${danger ? "text-red" : "text-grey-500"}`}>
        {label}
      </dt>
      <dd className={`text-xs font-bold ${danger ? "text-red" : "text-grey-900"}`}>
        {count} ({formatCurrency(amount)})
      </dd>
    </div>
  );
}

export default RecurringBillsSummary;
