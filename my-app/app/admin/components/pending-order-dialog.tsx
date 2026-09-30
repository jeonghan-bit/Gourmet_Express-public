"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OrderDetails } from "../order-details";
import { PrepareTimeDialog } from "./prepare-time-dialog";
import { DeliveryChargeDialog } from "./delivery-charge-dialog";
import { DeleteConfirmationDialog } from "../orders/delete-confirmation-dialog";
import type { SelectOrderWithUser } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useOrderActions } from "@/hooks/useOrderActions";
import { formatDate } from "@/lib/formatDate";

interface PendingOrderDialogProps {
  order: SelectOrderWithUser;
  onClose: () => void;
}

export function PendingOrderDialog({
  order,
  onClose,
}: PendingOrderDialogProps) {
  const {
    confirmOrderWithPrepTime,
    confirmScheduledOrder,
    updateDeliveryCharge,
  } = useOrderActions();
  const [showPrepareTimeDialog, setShowPrepareTimeDialog] = useState(false);
  const [showDeliveryChargeDialog, setShowDeliveryChargeDialog] =
    useState(false);
  const [showScheduledConfirmation, setShowScheduledConfirmation] =
    useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(order);
  const displayedOrder = isConfirmed
    ? { ...currentOrder, status: "confirmed" as const }
    : currentOrder;
  const scheduleLabel =
    order.fulfillmentType === "delivery" ? "delivery" : "pickup";
  const scheduledConfirmationDescription = `The order #${order.id} is scheduled for ${scheduleLabel} at ${formatDate(
    new Date(order.scheduledTime || "")
  )}. Customer will be notified via SMS. Please make sure the order is ready for ${scheduleLabel} by the scheduled time.`;

  const continueConfirmFlow = () => {
    // Check order type and handle accordingly (same logic as OrdersTable)
    if (order.fulfillmentTimingType === "ASAP") {
      setShowPrepareTimeDialog(true);
    } else if (order.fulfillmentTimingType === "SCHEDULED") {
      setShowScheduledConfirmation(true);
    }
  };

  const handleInitialConfirm = async () => {
    setIsConfirming(true);
    try {
      if (order.fulfillmentType === "delivery") {
        setShowDeliveryChargeDialog(true);
      } else {
        continueConfirmFlow();
      }
    } catch (error) {
      console.error("Failed to confirm order:", error);
      setIsConfirming(false);
    }
  };

  const handleDeliveryChargeSubmit = async (deliveryCharge: number) => {
    try {
      const { updatedDetails, totalAmount } =
        await updateDeliveryCharge.mutateAsync({ order, deliveryCharge });
      setCurrentOrder({ ...order, orderDetails: updatedDetails, totalAmount });
      setShowDeliveryChargeDialog(false);
      continueConfirmFlow();
    } catch (error) {
      console.error("Failed to set delivery charge:", error);
      setIsConfirming(false);
    }
  };

  const handlePrepareTimeSubmit = async (minutes: number) => {
    const confirmed = await confirmOrderWithPrepTime(order, minutes);
    setShowPrepareTimeDialog(false);
    setIsConfirming(false);
    if (confirmed) setIsConfirmed(true);
  };

  const handleScheduledOrderConfirm = async () => {
    const confirmed = await confirmScheduledOrder(
      order,
      new Date(order.scheduledTime || "")
    );
    setShowScheduledConfirmation(false);
    setIsConfirming(false);
    if (confirmed) setIsConfirmed(true);
  };

  // Show scheduled order confirmation dialog
  if (showScheduledConfirmation) {
    return (
      <DeleteConfirmationDialog
        open={true}
        setOpen={(open) => {
          if (!open) {
            setShowScheduledConfirmation(false);
            setIsConfirming(false);
          }
        }}
        onConfirm={handleScheduledOrderConfirm}
        title="Scheduled Order Confirmation"
        description={scheduledConfirmationDescription}
      />
    );
  }

  if (showDeliveryChargeDialog) {
    return (
      <DeliveryChargeDialog
        order={order}
        onSubmit={handleDeliveryChargeSubmit}
        onClose={() => {
          setShowDeliveryChargeDialog(false);
          setIsConfirming(false);
        }}
      />
    );
  }

  if (showPrepareTimeDialog) {
    return (
      <PrepareTimeDialog
        order={order}
        onSubmit={handlePrepareTimeSubmit}
        onClose={() => {
          setShowPrepareTimeDialog(false);
          setIsConfirming(false);
        }}
      />
    );
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] overflow-y-auto p-4 sm:max-w-4xl sm:p-6 [&>button]:h-12 [&>button]:w-12">
        <DialogHeader className="space-y-1 text-left">
          <DialogTitle className="text-lg sm:text-xl">
            {isConfirmed ? "Confirmed" : "New Pending"} Order #{order.id}
          </DialogTitle>
          <DialogDescription>
            {isConfirmed
              ? "This order is confirmed. Close this dialog when you are finished reviewing it."
              : "Review order details and confirm to start preparation"}
          </DialogDescription>
        </DialogHeader>
        <OrderDetails order={displayedOrder} />

        <div className="mt-4 flex justify-end sm:mt-6">
          <Button
            onClick={handleInitialConfirm}
            className="min-h-12 w-full sm:w-auto"
            disabled={isConfirming || isConfirmed}
          >
            {isConfirmed
              ? "Order Confirmed"
              : isConfirming
                ? "Confirming..."
                : "Confirm Order"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
