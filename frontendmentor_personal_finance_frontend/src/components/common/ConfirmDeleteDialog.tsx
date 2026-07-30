import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

/**
 * Reusable "are you sure?" delete confirmation (budgets, pots). Radix/shadcn
 * traps focus and restores it to the trigger on close.
 */
function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Yes, Confirm Deletion",
  onConfirm,
  loading = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  loading?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Button
            type="button"
            variant="destructive"
            className="h-13 w-full"
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? <Spinner /> : confirmLabel}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-13 w-full"
            disabled={loading}
            onClick={() => onOpenChange(false)}
          >
            No, Go Back
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ConfirmDeleteDialog;
