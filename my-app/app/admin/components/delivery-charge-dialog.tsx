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

interface DeliveryChargeDialogProps {
  order: SelectOrderWithUser;
  onSubmit: (charge: number) => void;
  onClose: () => void;
}

const DELIVERY_CHARGE_OPTIONS = [3, 4, 5];

export function DeliveryChargeDialog({
  order,
  onSubmit,
  onClose,
}: DeliveryChargeDialogProps) {
  const orderDetails =
    typeof order.orderDetails === "string"
      ? JSON.parse(order.orderDetails)
      : order.orderDetails;
  const currentCharge = Number(orderDetails?.deliveryCharge ?? 0);
  const [showCustomAmount, setShowCustomAmount] = useState(
    currentCharge > 0 && !DELIVERY_CHARGE_OPTIONS.includes(currentCharge)
  );
  const [customAmount, setCustomAmount] = useState(
    currentCharge > 0 && !DELIVERY_CHARGE_OPTIONS.includes(currentCharge)
      ? currentCharge.toString()
      : ""
  );

  const parsedCustomAmount = Number(customAmount);
  const isCustomAmountValid =
    customAmount.trim() !== "" &&
    Number.isFinite(parsedCustomAmount) &&
    parsedCustomAmount >= 0;

  const handleCustomSubmit = () => {
    if (!isCustomAmountValid) return;
    onSubmit(Math.round(parsedCustomAmount * 100) / 100);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-1rem)] max-w-md overflow-y-auto p-4 sm:p-6 [&>button]:h-12 [&>button]:w-12">
        <DialogHeader className="text-left">
          <DialogTitle className="text-lg sm:text-xl">
            Set Delivery Charge
          </DialogTitle>
          <DialogDescription>
            Choose a standard delivery charge or enter a custom amount.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground">
              Delivery charge
            </Label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {DELIVERY_CHARGE_OPTIONS.map((charge) => (
                <Button
                  key={charge}
                  type="button"
                  variant={currentCharge === charge ? "default" : "outline"}
                  onClick={() => onSubmit(charge)}
                  className="min-h-12"
                >
                  ${charge}
                </Button>
              ))}
              <Button
                type="button"
                variant={showCustomAmount ? "default" : "outline"}
                onClick={() => setShowCustomAmount((current) => !current)}
                className="min-h-12"
              >
                Custom
              </Button>
            </div>
          </div>

          {showCustomAmount && (
            <div>
              <Label htmlFor="custom-delivery-charge">
                Custom delivery charge
              </Label>
              <div className="mt-2 flex gap-2">
                <Input
                  id="custom-delivery-charge"
                  type="number"
                  min="3"
                  step="0.5"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={customAmount}
                  onChange={(event) => setCustomAmount(event.target.value)}
                />
                <Button
                  type="button"
                  onClick={handleCustomSubmit}
                  disabled={!isCustomAmountValid}
                  className="min-h-12"
                >
                  Set
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={onClose} className="min-h-12">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
