import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  createTransaction,
  updateTransaction,
} from "@/features/transactions/transactionsSlice";
import type { CategoryDTO, TransactionDTO } from "@/types/api";

const schema = z.object({
  name: z
    .string()
    .min(1, "Enter a transaction name.")
    .max(255, "Keep it under 255 characters."),
  type: z.enum(["expense", "income"]),
  amount: z
    .string()
    .min(1, "Enter an amount.")
    .refine((v) => Number(v) > 0, "Amount must be greater than 0."),
  categoryId: z.string().min(1, "Choose a category."),
  date: z.string().min(1, "Choose a date."),
});

type FormValues = z.infer<typeof schema>;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Add/Edit transaction modal. The Expense/Income toggle sets the sign of the
 * amount (the API stores a single signed integer-cents value); dollars entered
 * are converted to cents. In edit mode the fields prefill from the existing
 * transaction (sign → type, absolute value → amount) and submit sends a PUT.
 * On success the parent refreshes the list.
 */
function TransactionFormDialog({
  open,
  onOpenChange,
  mode,
  transaction,
  categories,
  defaultCategoryId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  transaction?: TransactionDTO;
  categories: CategoryDTO[];
  defaultCategoryId?: number;
  onSaved: () => void;
}) {
  const dispatch = useAppDispatch();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      type: "expense",
      amount: "",
      categoryId: "",
      date: today(),
    },
  });

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && transaction) {
      reset({
        name: transaction.recipient_name,
        type: transaction.amount < 0 ? "expense" : "income",
        amount: (Math.abs(transaction.amount) / 100).toString(),
        categoryId: String(transaction.category_id),
        date: (transaction.transaction_date ?? today()).slice(0, 10),
      });
    } else {
      reset({
        name: "",
        type: "expense",
        amount: "",
        categoryId: defaultCategoryId ? String(defaultCategoryId) : "",
        date: today(),
      });
    }
  }, [open, mode, transaction, defaultCategoryId, reset]);

  const onSubmit = async (values: FormValues) => {
    const cents = Math.round(Number(values.amount) * 100);
    const signed = values.type === "expense" ? -cents : cents;
    const input = {
      recipient_name: values.name,
      amount: signed,
      category_id: Number(values.categoryId),
      transaction_date: values.date,
    };
    const result =
      mode === "edit" && transaction
        ? await dispatch(updateTransaction({ id: transaction.id, ...input }))
        : await dispatch(createTransaction(input));
    if (
      createTransaction.rejected.match(result) ||
      updateTransaction.rejected.match(result)
    ) {
      toast.error(result.payload ?? "Something went wrong.");
      return;
    }
    toast.success(mode === "edit" ? "Transaction updated." : "Transaction added.");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Edit Transaction" : "Add New Transaction"}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Update the details of this transaction."
              : "Track a new transaction. Choose “Expense” or “Income” to record either type."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="tx-name">Transaction Name</Label>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <Input id="tx-name" placeholder="e.g. Coffee Shop" maxLength={255} {...field} />
              )}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <Label id="tx-type-label">Transaction Type</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <div
                  role="radiogroup"
                  aria-labelledby="tx-type-label"
                  className="grid grid-cols-2 gap-1 rounded-lg border border-beige-500 p-1"
                >
                  {(["expense", "income"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={field.value === t}
                      onClick={() => field.onChange(t)}
                      className={cn(
                        "h-10 rounded-md text-sm font-bold capitalize transition-colors",
                        field.value === t
                          ? "bg-grey-900 text-white"
                          : "text-grey-900 hover:bg-beige-100",
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="tx-amount">Amount</Label>
            <div className="relative">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-grey-500"
              >
                $
              </span>
              <Controller
                name="amount"
                control={control}
                render={({ field }) => (
                  <Input
                    id="tx-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    className="pl-8"
                    {...field}
                  />
                )}
              />
            </div>
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="tx-category">Category</Label>
            <Controller
              name="categoryId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="tx-category" className="w-full">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.categoryId && (
              <p className="text-xs text-destructive">{errors.categoryId.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="tx-date">Date</Label>
            <Controller
              name="date"
              control={control}
              render={({ field }) => (
                <Input id="tx-date" type="date" max={today()} {...field} />
              )}
            />
            {errors.date && (
              <p className="text-xs text-destructive">{errors.date.message}</p>
            )}
          </div>

          <Button type="submit" disabled={isSubmitting} className="h-13 w-full">
            {isSubmitting ? (
              <Spinner />
            ) : mode === "edit" ? (
              "Save Changes"
            ) : (
              "Add Transaction"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default TransactionFormDialog;
