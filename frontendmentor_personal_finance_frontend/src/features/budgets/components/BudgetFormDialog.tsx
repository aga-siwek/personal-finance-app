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
import ThemeSelect from "@/components/common/ThemeSelect";
import { createBudget, updateBudget } from "@/features/budgets/budgetsSlice";
import type { BudgetSummaryDTO, CategoryDTO } from "@/types/api";

const schema = z.object({
  categoryId: z.string().min(1, "Please choose a category."),
  maxSpend: z
    .string()
    .min(1, "Enter a maximum spend.")
    .refine((v) => Number(v) > 0, "Maximum spend must be greater than 0."),
  theme: z.string().min(1, "Please choose a theme."),
});

type FormValues = z.infer<typeof schema>;

/** Add/Edit budget modal. In edit mode the category is fixed (it defines the
 * budget's identity); dollars entered are converted to integer cents. */
function BudgetFormDialog({
  open,
  onOpenChange,
  mode,
  budget,
  availableCategories,
  categoryName,
  usedThemes,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  budget?: BudgetSummaryDTO;
  availableCategories: CategoryDTO[];
  categoryName?: string;
  usedThemes: string[];
}) {
  const dispatch = useAppDispatch();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { categoryId: "", maxSpend: "", theme: "" },
  });

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && budget) {
      reset({
        categoryId: String(budget.category_id),
        maxSpend: (budget.max_spend / 100).toString(),
        theme: budget.theme,
      });
    } else {
      reset({ categoryId: "", maxSpend: "", theme: "" });
    }
  }, [open, mode, budget, reset]);

  const onSubmit = async (values: FormValues) => {
    const maxSpendCents = Math.round(Number(values.maxSpend) * 100);
    const result =
      mode === "edit" && budget
        ? await dispatch(
            updateBudget({
              id: budget.id,
              max_spend: maxSpendCents,
              theme: values.theme,
            }),
          )
        : await dispatch(
            createBudget({
              category_id: Number(values.categoryId),
              max_spend: maxSpendCents,
              theme: values.theme,
            }),
          );
    if (
      createBudget.rejected.match(result) ||
      updateBudget.rejected.match(result)
    ) {
      toast.error(result.payload ?? "Something went wrong.");
      return;
    }
    toast.success(mode === "edit" ? "Budget updated." : "Budget created.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Edit Budget" : "Add New Budget"}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "As your budgets change, feel free to update your spending limits."
              : "Choose a category to set a spending budget. These categories can help you monitor spending."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="budget-category">Budget Category</Label>
            {mode === "edit" ? (
              <Input id="budget-category" value={categoryName ?? ""} disabled />
            ) : (
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="budget-category" className="w-full">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCategories.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
            {errors.categoryId && (
              <p className="text-xs text-destructive">{errors.categoryId.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="budget-max">Maximum Spend</Label>
            <Controller
              name="maxSpend"
              control={control}
              render={({ field }) => (
                <Input
                  id="budget-max"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 2000"
                  {...field}
                />
              )}
            />
            {errors.maxSpend && (
              <p className="text-xs text-destructive">{errors.maxSpend.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="budget-theme">Theme</Label>
            <Controller
              name="theme"
              control={control}
              render={({ field }) => (
                <ThemeSelect
                  id="budget-theme"
                  value={field.value}
                  onChange={field.onChange}
                  usedThemes={usedThemes}
                  currentValue={budget?.theme}
                />
              )}
            />
            {errors.theme && (
              <p className="text-xs text-destructive">{errors.theme.message}</p>
            )}
          </div>

          <Button type="submit" disabled={isSubmitting} className="h-13 w-full">
            {isSubmitting ? (
              <Spinner />
            ) : mode === "edit" ? (
              "Save Changes"
            ) : (
              "Add Budget"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default BudgetFormDialog;
