"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type StakeConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  stakeLabel: string;
  warnings?: string[];
  confirmLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
};

export function StakeConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  stakeLabel,
  warnings = [],
  confirmLabel = "Confirm and send",
  pending,
  onConfirm,
}: StakeConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="brand-card max-w-md border-2">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="soft-tile px-4 py-3">
            <p className="text-xs tracking-wide text-muted-foreground uppercase">Amount</p>
            <p className="mt-1 font-display text-2xl font-bold text-amber">{stakeLabel}</p>
          </div>
          {warnings.length > 0 && (
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {warnings.map((w) => (
                <li key={w} className="flex gap-2">
                  <span className="text-amber">•</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant="gradient" onClick={onConfirm} disabled={pending}>
            {pending ? "Submitting…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
