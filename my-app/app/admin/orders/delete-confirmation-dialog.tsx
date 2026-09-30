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

interface DeleteConfirmationDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
}

export function DeleteConfirmationDialog({
  open,
  setOpen,
  onConfirm,
  title,
  description,
}: DeleteConfirmationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-1rem)] overflow-y-auto p-4 sm:p-6 [&>button]:h-12 [&>button]:w-12">
        <DialogHeader className="text-left">
          <DialogTitle className="text-lg sm:text-xl">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => setOpen(false)} className="min-h-12">
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} className="min-h-12">
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
