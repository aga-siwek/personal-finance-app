import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/format";
import type { PotDTO } from "@/types/api";

/** One savings pot: total saved, progress toward target, and add/withdraw. */
function PotCard({
  pot,
  onEdit,
  onDelete,
  onAddMoney,
  onWithdraw,
}: {
  pot: PotDTO;
  onEdit: () => void;
  onDelete: () => void;
  onAddMoney: () => void;
  onWithdraw: () => void;
}) {
  const pct =
    pot.target_amount > 0
      ? Math.min(100, (pot.total_saved / pot.target_amount) * 100)
      : 0;

  return (
    <section className="rounded-xl bg-card p-6 md:p-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="size-4 rounded-full"
            style={{ backgroundColor: pot.theme }}
          />
          <h2 className="text-xl font-bold text-grey-900">{pot.name}</h2>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`${pot.name} pot options`}
            className="rounded-full p-1 text-grey-300 transition-colors hover:text-grey-900"
          >
            <MoreHorizontal className="size-5" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onEdit}>Edit Pot</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              Delete Pot
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <span className="text-sm text-grey-500">Total Saved</span>
        <span className="text-[2rem] font-bold text-grey-900">
          {formatCurrency(pot.total_saved)}
        </span>
      </div>

      <div className="mt-4 h-2 rounded bg-beige-100">
        <div
          className="h-full rounded"
          style={{ width: `${pct}%`, backgroundColor: pot.theme }}
        />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="font-bold text-grey-500">{pct.toFixed(2)}%</span>
        <span className="text-grey-500">
          Target of {formatCurrency(pot.target_amount, { decimals: 0 })}
        </span>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={onAddMoney}
          className="h-14 rounded-lg bg-beige-100 text-sm font-bold text-grey-900 transition-colors hover:bg-beige-100/70 hover:ring-1 hover:ring-beige-500"
        >
          + Add Money
        </button>
        <button
          type="button"
          onClick={onWithdraw}
          className="h-14 rounded-lg bg-beige-100 text-sm font-bold text-grey-900 transition-colors hover:bg-beige-100/70 hover:ring-1 hover:ring-beige-500"
        >
          Withdraw
        </button>
      </div>
    </section>
  );
}

export default PotCard;
