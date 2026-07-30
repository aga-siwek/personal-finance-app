import { CircleAlert, CircleCheck } from "lucide-react";
import Avatar from "@/components/common/Avatar";
import { SearchIcon } from "@/components/icons/ui-icons";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, ordinal } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RecurringBillSort } from "@/features/recurring-bills/recurringBillsSlice";
import type { RecurringBillDTO } from "@/types/api";

const SORT_OPTIONS: { value: RecurringBillSort; label: string }[] = [
  { value: "latest", label: "Latest" },
  { value: "oldest", label: "Oldest" },
  { value: "name_asc", label: "A to Z" },
  { value: "name_desc", label: "Z to A" },
  { value: "amount_desc", label: "Highest" },
  { value: "amount_asc", label: "Lowest" },
];

function StatusIcon({ status }: { status: RecurringBillDTO["status"] }) {
  if (status === "paid")
    return <CircleCheck className="size-4 text-green" aria-label="Paid" />;
  if (status === "due_soon")
    return <CircleAlert className="size-4 text-red" aria-label="Due soon" />;
  return null;
}

function DueDate({ bill }: { bill: RecurringBillDTO }) {
  return (
    <span
      className={cn(
        "flex items-center gap-2 text-xs",
        bill.status === "paid" ? "text-green" : "text-grey-500",
      )}
    >
      Monthly - {ordinal(bill.due_day)}
      <StatusIcon status={bill.status} />
    </span>
  );
}

function RecurringBillsTable({
  bills,
  search,
  onSearchChange,
  sort,
  onSortChange,
}: {
  bills: RecurringBillDTO[];
  search: string;
  onSearchChange: (value: string) => void;
  sort: RecurringBillSort;
  onSortChange: (value: RecurringBillSort) => void;
}) {
  const amountClass = (bill: RecurringBillDTO) =>
    cn("font-bold", bill.status === "due_soon" ? "text-red" : "text-grey-900");

  return (
    <div className="rounded-xl bg-card p-6 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <label htmlFor="bill-search" className="sr-only">
            Search bills
          </label>
          <Input
            id="bill-search"
            type="search"
            placeholder="Search bills"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pr-10"
          />
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-4 h-4 w-auto -translate-y-1/2 text-grey-900"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden shrink-0 text-sm text-grey-500 sm:inline">
            Sort by
          </span>
          <Select value={sort} onValueChange={(v) => onSortChange(v as RecurringBillSort)}>
            <SelectTrigger aria-label="Sort by" className="min-w-[7rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {bills.length === 0 ? (
        <p className="py-10 text-center text-sm text-grey-500">No recurring bills found.</p>
      ) : (
        <>
          {/* Table (md+) */}
          <table className="mt-6 hidden w-full border-collapse md:table">
            <thead>
              <tr className="border-b border-grey-100 text-left text-xs text-grey-500">
                <th className="px-2 pb-3 font-normal">Bill Title</th>
                <th className="px-2 pb-3 font-normal">Due Date</th>
                <th className="px-2 pb-3 text-right font-normal">Amount</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((bill) => (
                <tr key={bill.id} className="border-b border-grey-100 last:border-0">
                  <td className="px-2 py-4">
                    <div className="flex items-center gap-4">
                      <Avatar name={bill.title} />
                      <span className="text-sm font-bold text-grey-900">
                        {bill.title}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-4">
                    <DueDate bill={bill} />
                  </td>
                  <td className={cn("px-2 py-4 text-right text-sm", amountClass(bill))}>
                    {formatCurrency(bill.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Cards (< md) */}
          <ul className="mt-6 flex flex-col md:hidden">
            {bills.map((bill) => (
              <li
                key={bill.id}
                className="flex items-center justify-between gap-3 border-b border-grey-100 py-4 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={bill.title} />
                  <span className="text-sm font-bold text-grey-900">{bill.title}</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={cn("text-sm", amountClass(bill))}>
                    {formatCurrency(bill.amount)}
                  </span>
                  <DueDate bill={bill} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default RecurringBillsTable;
