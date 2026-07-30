import { MoreHorizontal } from "lucide-react";
import Avatar from "@/components/common/Avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TransactionDTO } from "@/types/api";

function RowActions({
  transaction,
  onEdit,
  onDelete,
}: {
  transaction: TransactionDTO;
  onEdit: (tx: TransactionDTO) => void;
  onDelete: (tx: TransactionDTO) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${transaction.recipient_name} transaction options`}
        className="rounded-full p-1 text-grey-300 transition-colors hover:text-grey-900"
      >
        <MoreHorizontal className="size-5" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onEdit(transaction)}>
          Edit Transaction
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={() => onDelete(transaction)}>
          Delete Transaction
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Transaction list — a table from md up (Recipient/Sender · Category · Date ·
 * Amount · actions) and stacked cards below md. Income/expense is signalled by
 * the amount's sign and colour together; each row has an overflow menu to edit
 * or delete.
 */
function TransactionsList({
  transactions,
  categoryNames,
  onEdit,
  onDelete,
}: {
  transactions: TransactionDTO[];
  categoryNames: Record<number, string>;
  onEdit: (tx: TransactionDTO) => void;
  onDelete: (tx: TransactionDTO) => void;
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
            <th className="px-2 pb-3">
              <span className="sr-only">Actions</span>
            </th>
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
              <td className="w-10 px-2 py-4 text-right">
                <RowActions transaction={tx} onEdit={onEdit} onDelete={onDelete} />
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
            className="flex items-center justify-between gap-3 border-b border-grey-100 py-4 last:border-0"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={tx.recipient_name} />
              <div className="flex min-w-0 flex-col gap-1">
                <span className="truncate text-sm font-bold text-grey-900">
                  {tx.recipient_name}
                </span>
                <span className="text-xs text-grey-500">
                  {categoryNames[tx.category_id] ?? "—"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <div className="flex flex-col items-end gap-1">
                <span className={cn("text-sm", amountClass(tx.amount))}>
                  {formatCurrency(tx.amount, { signed: true })}
                </span>
                <span className="text-xs text-grey-500">
                  {formatDate(tx.transaction_date ?? tx.created_at)}
                </span>
              </div>
              <RowActions transaction={tx} onEdit={onEdit} onDelete={onDelete} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

export default TransactionsList;
