import Avatar from "@/components/common/Avatar";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TransactionDTO } from "@/types/api";
import SectionCard from "./SectionCard";

/**
 * Transactions summary: the five most recent transactions. Each row shows the
 * recipient/sender (initials avatar + name) and the signed amount + date. The
 * sign (+/-) and colour together convey income vs expense — colour is never
 * the only signal. "View All" → /transactions.
 */
function TransactionsSummaryCard({
  transactions,
}: {
  transactions: TransactionDTO[];
}) {
  return (
    <SectionCard
      title="Transactions"
      action={{ label: "View All", to: "/transactions" }}
    >
      {transactions.length > 0 ? (
        <ul className="mt-6 flex flex-col">
          {transactions.map((tx, i) => {
            const isIncome = tx.amount >= 0;
            return (
              <li
                key={tx.id}
                className={cn(
                  "flex items-center justify-between gap-4 py-4",
                  i > 0 && "border-t border-grey-100",
                  i === 0 && "pt-0",
                )}
              >
                <div className="flex items-center gap-4">
                  <Avatar name={tx.recipient_name} />
                  <span className="text-sm font-bold text-grey-900">
                    {tx.recipient_name}
                  </span>
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      "text-sm font-bold",
                      isIncome ? "text-green" : "text-grey-900",
                    )}
                  >
                    {formatCurrency(tx.amount, { signed: true })}
                  </p>
                  <p className="mt-1 text-xs text-grey-500">
                    {formatDate(tx.transaction_date ?? tx.created_at)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-6 text-sm text-grey-500">No transactions yet.</p>
      )}
    </SectionCard>
  );
}

export default TransactionsSummaryCard;
