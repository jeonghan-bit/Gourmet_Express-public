"use client";

import { useState } from "react";
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
import type { SelectOrderWithUser } from "@/lib/types";

interface PrepareTimeDialogProps {
  order: SelectOrderWithUser;
  onSubmit: (minutes: number) => void;
  onClose: () => void;
}

export function PrepareTimeDialog({
  order,
  onSubmit,
  onClose,
}: PrepareTimeDialogProps) {
  const [minutes, setMinutes] = useState<number | "">("");

  const handleSubmit = () => {
    if (typeof minutes === "number" && minutes > 0) {
      onSubmit(minutes);
    }
  };

  const quickTimes =
    order.fulfillmentType === "delivery"
      ? [45, 50, 55, 60, 75]
      : [15, 20, 25, 30, 45];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-1rem)] max-w-md overflow-y-auto p-4 sm:p-6 [&>button]:h-12 [&>button]:w-12">
        <DialogHeader className="text-left">
          <DialogTitle className="text-lg sm:text-xl">
            Set Preparation Time
          </DialogTitle>
          <DialogDescription>
            Set the estimated preparation time for this order
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            How long will it take to prepare order #{order.id}?
          </p>

          <div>
            <Label htmlFor="minutes">Estimated time (minutes)</Label>
            <Input
              id="minutes"
              type="number"
              value={minutes}
              onChange={(e) =>
                setMinutes(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              min="1"
              max="120"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-sm text-gray-600">Quick select:</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {quickTimes.map((time) => (
                <Button
                  key={time}
                  variant={minutes === time ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMinutes(time)}
                  className="min-h-12"
                >
                  {time}m
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onClose} className="min-h-12">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={typeof minutes !== "number" || minutes <= 0}
              className="min-h-12"
            >
              Set Time & Notify Customer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
