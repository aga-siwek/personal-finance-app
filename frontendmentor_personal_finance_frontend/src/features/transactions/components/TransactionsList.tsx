import Avatar from "@/components/common/Avatar";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TransactionDTO } from "@/types/api";

/**
 * Transaction list — a table from md up (Recipient/Sender · Category · Date ·
 * Amount) and stacked cards below md. Income/expense is signalled by the
 * amount's sign and colour together.
 */
function TransactionsList({
  transactions,
  categoryNames,
}: {
  transactions: TransactionDTO[];
  categoryNames: Record<number, string>;
}) {
  if (transactions.length === 0) {
    return <p className="py-10 text-center text-sm text-grey-500">No transactions found.</p>;
  }

  const amountClass = (amount: number) =>
    cn("font-bold", amount >= 0 ? "text-green" : "text-grey-900");

  return (
    <>
      {/* Table (md+) */}
      <table className="hidden w-full border-collapse md:table">
        <thead>
          <tr className="border-b border-grey-100 text-left text-xs text-grey-500">
            <th className="px-2 pb-3 font-normal">Recipient / Sender</th>
            <th className="px-2 pb-3 font-normal">Category</th>
            <th className="px-2 pb-3 font-normal">Transaction Date</th>
            <th className="px-2 pb-3 text-right font-normal">Amount</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.id} className="border-b border-grey-100 last:border-0">
              <td className="px-2 py-4">
                <div className="flex items-center gap-4">
                  <Avatar name={tx.recipient_name} />
                  <span className="text-sm font-bold text-grey-900">
                    {tx.recipient_name}
                  </span>
                </div>
              </td>
              <td className="px-2 py-4 text-sm text-grey-500">
                {categoryNames[tx.category_id] ?? "—"}
              </td>
              <td className="px-2 py-4 text-sm text-grey-500">
                {formatDate(tx.transaction_date ?? tx.created_at)}
              </td>
              <td className={cn("px-2 py-4 text-right text-sm", amountClass(tx.amount))}>
                {formatCurrency(tx.amount, { signed: true })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Cards (< md) */}
      <ul className="flex flex-col md:hidden">
        {transactions.map((tx) => (
          <li
            key={tx.id}
            className="flex items-center justify-between gap-4 border-b border-grey-100 py-4 last:border-0"
          >
            <div className="flex items-center gap-3">
              <Avatar name={tx.recipient_name} />
              <div className="flex flex-col gap-1">
                <span className="text-sm font-bold text-grey-900">
                  {tx.recipient_name}
                </span>
                <span className="text-xs text-grey-500">
                  {categoryNames[tx.category_id] ?? "—"}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={cn("text-sm", amountClass(tx.amount))}>
                {formatCurrency(tx.amount, { signed: true })}
              </span>
              <span className="text-xs text-grey-500">
                {formatDate(tx.transaction_date ?? tx.created_at)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

export default TransactionsList;
