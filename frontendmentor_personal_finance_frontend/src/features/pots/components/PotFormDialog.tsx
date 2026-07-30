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
import ThemeSelect from "@/components/common/ThemeSelect";
import { createPot, updatePot } from "@/features/pots/potsSlice";
import type { PotDTO } from "@/types/api";

const schema = z.object({
  name: z.string().min(1, "Enter a pot name.").max(30, "Keep it under 30 characters."),
  target: z
    .string()
    .min(1, "Enter a target.")
    .refine((v) => Number(v) > 0, "Target must be greater than 0."),
  theme: z.string().min(1, "Please choose a theme."),
});

type FormValues = z.infer<typeof schema>;

/** Add/Edit pot modal. Dollars entered are converted to integer cents. */
function PotFormDialog({
  open,
  onOpenChange,
  mode,
  pot,
  usedThemes,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  pot?: PotDTO;
  usedThemes: string[];
}) {
  const dispatch = useAppDispatch();
  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", target: "", theme: "" },
  });

  const nameValue = watch("name");

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && pot) {
      reset({
        name: pot.name,
        target: (pot.target_amount / 100).toString(),
        theme: pot.theme,
      });
    } else {
      reset({ name: "", target: "", theme: "" });
    }
  }, [open, mode, pot, reset]);

  const onSubmit = async (values: FormValues) => {
    const target_amount = Math.round(Number(values.target) * 100);
    const input = { name: values.name, target_amount, theme: values.theme };
    const result =
      mode === "edit" && pot
        ? await dispatch(updatePot({ id: pot.id, ...input }))
        : await dispatch(createPot(input));
    if (createPot.rejected.match(result) || updatePot.rejected.match(result)) {
      toast.error(result.payload ?? "Something went wrong.");
      return;
    }
    toast.success(mode === "edit" ? "Pot updated." : "Pot created.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit Pot" : "Add New Pot"}</DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "If your saving targets change, feel free to update your pots."
              : "Create a pot to set savings targets. These can help keep you on track as you save for special purchases."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="pot-name">Pot Name</Label>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <Input id="pot-name" placeholder="e.g. Rainy Days" maxLength={30} {...field} />
              )}
            />
            <div className="flex justify-between">
              {errors.name ? (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              ) : (
                <span />
              )}
              <p className="text-xs text-grey-500">
                {30 - (nameValue?.length ?? 0)} characters left
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="pot-target">Target</Label>
            <Controller
              name="target"
              control={control}
              render={({ field }) => (
                <Input
                  id="pot-target"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 2000"
                  {...field}
                />
              )}
            />
            {errors.target && (
              <p className="text-xs text-destructive">{errors.target.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="pot-theme">Theme</Label>
            <Controller
              name="theme"
              control={control}
              render={({ field }) => (
                <ThemeSelect
                  id="pot-theme"
                  value={field.value}
                  onChange={field.onChange}
                  usedThemes={usedThemes}
                  currentValue={pot?.theme}
                />
              )}
            />
            {errors.theme && (
              <p className="text-xs text-destructive">{errors.theme.message}</p>
            )}
          </div>

          <Button type="submit" disabled={isSubmitting} className="h-13 w-full">
            {isSubmitting ? <Spinner /> : mode === "edit" ? "Save Changes" : "Add Pot"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default PotFormDialog;
