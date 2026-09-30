import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { SelectOrderWithUser } from "@/lib/types";

interface CancelOrderDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  order: SelectOrderWithUser | null;
}

export function CancelOrderDialog({
  open,
  setOpen,
  onConfirm,
  order,
}: CancelOrderDialogProps) {
  const [reason, setReason] = useState("");
  const [selectedReason, setSelectedReason] = useState("");

  const quickReasons = [
    "Duplicated order",
    "Customer Cancel",
    "No show",
    "Too far",
    "Others",
  ];

  useEffect(() => {
    if (!open) {
      setReason("");
      setSelectedReason("");
    }
  }, [open]);

  const handleConfirm = () => {
    onConfirm(selectedReason === "Others" ? reason : selectedReason);
    setReason("");
    setSelectedReason("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto [&>button]:h-12 [&>button]:w-12">
        <DialogHeader>
          <DialogTitle>Cancel Order #{order?.id}</DialogTitle>
          <DialogDescription>
            Please provide a reason for canceling this order.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Reason for Cancellation</Label>
            <div className="grid grid-cols-2 gap-2">
              {quickReasons.map((quickReason) => (
                <Button
                  key={quickReason}
                  type="button"
                  variant={
                    selectedReason === quickReason ? "default" : "outline"
                  }
                  onClick={() => {
                    setSelectedReason(quickReason);
                    if (quickReason !== "Others") {
                      setReason("");
                    }
                  }}
                  className="min-h-12"
                >
                  {quickReason}
                </Button>
              ))}
            </div>
          </div>

          {selectedReason === "Others" && (
            <div className="space-y-2">
              <Label htmlFor="reason">Other Reason</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter the reason for cancellation..."
                rows={4}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="min-h-12"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!selectedReason || (selectedReason === "Others" && !reason.trim())}
            className="min-h-12"
          >
            Confirm Cancellation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
