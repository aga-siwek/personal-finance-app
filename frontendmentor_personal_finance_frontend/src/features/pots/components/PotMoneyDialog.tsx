import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAppDispatch } from "@/app/store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { changePotMoney } from "@/features/pots/potsSlice";
import { formatCurrency } from "@/lib/format";
import type { PotDTO } from "@/types/api";

/** Add-to / withdraw-from a pot, with a live preview of the resulting total on
 * a two-tone progress bar. */
function PotMoneyDialog({
  open,
  onOpenChange,
  pot,
  operation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pot?: PotDTO;
  operation: "add" | "withdraw";
}) {
  const dispatch = useAppDispatch();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setAmount("");
  }, [open]);

  if (!pot) return null;

  const isAdd = operation === "add";
  const target = pot.target_amount;
  const current = pot.total_saved;
  const amountCents = Math.max(0, Math.round((Number(amount) || 0) * 100));
  const newTotal = isAdd
    ? current + amountCents
    : Math.max(0, current - amountCents);

  const pct = (cents: number) =>
    target > 0 ? Math.min(100, (cents / target) * 100) : 0;

  // Two-tone bar: the unchanged portion plus the highlighted delta.
  const basePct = pct(Math.min(current, newTotal));
  const deltaPct = Math.max(0, pct(Math.max(current, newTotal)) - basePct);
  const newPct = target > 0 ? ((newTotal / target) * 100).toFixed(2) : "0";

  const confirm = async () => {
    if (amountCents <= 0) {
      toast.error("Enter an amount greater than 0.");
      return;
    }
    setBusy(true);
    const result = await dispatch(
      changePotMoney({ id: pot.id, amount: amountCents, operation }),
    );
    setBusy(false);
    if (changePotMoney.rejected.match(result)) {
      toast.error(result.payload ?? "Something went wrong.");
      return;
    }
    toast.success(isAdd ? "Money added to pot." : "Money withdrawn from pot.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isAdd ? "Add to" : "Withdraw from"} ‘{pot.name}’
          </DialogTitle>
          <DialogDescription>
            {isAdd
              ? "Add money to this pot to keep it separate from your main balance."
              : "Withdraw from your pot to put money back in your main balance."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-grey-500">New Amount</span>
            <span className="text-[2rem] font-bold text-grey-900">
              {formatCurrency(newTotal)}
            </span>
          </div>

          <div className="flex h-2 overflow-hidden rounded bg-beige-100">
            <div
              className="h-full rounded-l"
              style={{
                width: `${basePct}%`,
                backgroundColor: isAdd ? pot.theme : pot.theme,
              }}
            />
            <div
              className="h-full"
              style={{
                width: `${deltaPct}%`,
                backgroundColor: isAdd ? "var(--green)" : "var(--red)",
              }}
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span
              className="font-bold"
              style={{ color: isAdd ? "var(--green)" : "var(--red)" }}
            >
              {newPct}%
            </span>
            <span className="text-grey-500">
              Target of {formatCurrency(target, { decimals: 0 })}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="pot-amount">
              Amount to {isAdd ? "Add" : "Withdraw"}
            </Label>
            <Input
              id="pot-amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <Button
            type="button"
            className="h-13 w-full"
            disabled={busy}
            onClick={confirm}
          >
            {busy ? (
              <Spinner />
            ) : isAdd ? (
              "Confirm Addition"
            ) : (
              "Confirm Withdrawal"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PotMoneyDialog;
