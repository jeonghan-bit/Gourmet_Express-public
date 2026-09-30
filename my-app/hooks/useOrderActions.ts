"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { toast } from "sonner";
import type { OrdersResponse, SelectOrderWithUser } from "@/lib/types";
import { STORE_CONFIG } from "@/lib/storeConfig";

export async function fetchOrdersByUserId(
  userId: number,
  page = 1,
  limit = 15
): Promise<OrdersResponse<SelectOrderWithUser>> {
  const params = new URLSearchParams({
    userId: String(userId),
    view: "history",
    page: String(page),
    limit: String(limit),
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const res = await fetch(`/api/orders?${params.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch orders by user ID");
  return res.json();
}

export function useOrderActions() {
  const queryClient = useQueryClient();
  const orderIdempotencyKey = useRef<string | null>(null);
  const refreshOrderViews = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["orders"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboardSummary"] }),
      queryClient.invalidateQueries({ queryKey: ["pendingOrdersMonitor"] }),
    ]);
  };

  const getOrderDetails = (order: SelectOrderWithUser) =>
    typeof order.orderDetails === "string"
      ? JSON.parse(order.orderDetails)
      : order.orderDetails ?? {};

  const getItemsSubtotal = (orderDetails: any) => {
    const items = Array.isArray(orderDetails?.items) ? orderDetails.items : [];
    const rawSubtotal = items.reduce(
      (sum: number, item: any) =>
        sum +
        (Number(item.price) + Number(item.additionalPrice || 0)) *
          item.quantity,
      0
    );

    return Math.round(rawSubtotal * 100) / 100;
  };

  const getOrderTotalWithDeliveryCharge = (
    orderDetails: any,
    deliveryCharge: number
  ) => {
    const subtotal = getItemsSubtotal(orderDetails);
    const taxableSubtotal = subtotal + deliveryCharge;
    const tax = Math.round(taxableSubtotal * 0.13 * 100) / 100;

    return taxableSubtotal + tax;
  };

  const submitOrder = useMutation({
    mutationFn: async (orderData: any) => {
      orderIdempotencyKey.current ??= crypto.randomUUID();
      const res = await fetch("/api/submit-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": orderIdempotencyKey.current,
        },
        body: JSON.stringify(orderData),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to submit order");
      }

      const data = await res.json();
      return data;
    },
    onSuccess: (data) => {
      orderIdempotencyKey.current = null;
      void refreshOrderViews();
      queryClient.invalidateQueries({ queryKey: ["user", "profile"] }); // Refresh user profile
      toast.success(`Order #${data.orderNumber} submitted successfully!`);
    },
    onError: (error) => {
      console.error("Order submission failed:", error);
      toast.error("Failed to submit order. Please try again.");
    },
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({
      orderId,
      nextStatus,
      reason,
    }: {
      orderId: number;
      nextStatus: string;
      reason?: string;
    }) => {
      const res = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: orderId,
          status: nextStatus,
          reasonForCancel: reason,
        }),
      });
      if (!res.ok) throw new Error("Failed to update order status");
      return { orderId, nextStatus, reason };
    },
    onMutate: async ({ orderId, nextStatus }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["orders"] });

      // Snapshot previous value
      const previousOrders = queryClient.getQueryData(["orders"]);

      // Optimistically update the cache
      queryClient.setQueryData(["orders"], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          orders: old.orders.map((order: SelectOrderWithUser) =>
            order.id === orderId ? { ...order, status: nextStatus } : order
          ),
        };
      });

      // Return context with snapshot
      return { previousOrders };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousOrders) {
        queryClient.setQueryData(["orders"], context.previousOrders);
      }
      toast.error("Failed to update order status");
    },
    onSettled: async () => {
      // Refetch after mutation
      await refreshOrderViews();
    },
  });

  const deleteOrder = useMutation({
    mutationFn: async (orderId: number) => {
      const res = await fetch("/api/orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId }),
      });
      if (!res.ok) throw new Error("Failed to delete order");
    },
    onSettled: async () => {
      await refreshOrderViews();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["users"] }),
        queryClient.invalidateQueries({ queryKey: ["user"] }),
      ]);
    },
  });

  const sendOrderSMS = useMutation({
    mutationFn: async ({
      customerId,
      body,
    }: {
      customerId: number;
      body: string;
    }) => {
      const res = await fetch("/api/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, body }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to send SMS");
      }
      return Boolean((await res.json()).sent);
    },
  });

  const updateOrderDetails = useMutation({
    mutationFn: async ({
      orderId,
      updatedDetails,
      order,
      orderUpdates,
      notifyCustomer,
      priceChanged,
    }: {
      orderId: number;
      updatedDetails: Record<string, any>;
      order?: SelectOrderWithUser;
      notifyCustomer?: boolean;
      priceChanged?: boolean;
      orderUpdates?: {
        fulfillmentType?: "pickup" | "delivery" | "dineIn";
        fulfillmentTimingType?: "ASAP" | "SCHEDULED";
        scheduledTime?: string;
        recalculateTotal?: boolean;
      };
    }) => {
      const res = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: orderId,
          orderDetails: updatedDetails,
          ...orderUpdates,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Failed to update order details");
      }
      return data;
    },
    onSuccess: (data, variables) => {
      void refreshOrderViews();
      toast.success(`Order #${variables.orderId} updated successfully`);

      if (
        variables.notifyCustomer &&
        variables.order?.user?.id
      ) {
        const priceContext = variables.priceChanged
          ? `\n\nYour new total is $${Number(data?.totalAmount).toFixed(2)}.`
          : "";
        sendOrderSMS.mutate(
          {
            customerId: variables.order.user.id,
            body: `Gourmet Express: Hi ${
              variables.order.user?.name || "Customer"
            }, your order #${
              variables.order.id
            } has been updated by our staff.${priceContext}\n\nView your order details here:\nhttps://gourmet-express-kipling.com/orders-history`,
          },
          {
            onSuccess: (sent) =>
              sent
                ? toast.success(
                    `Order #${variables.orderId} updated and customer notified`
                  )
                : toast.info(
                    `Order #${variables.orderId} updated without an SMS because the customer has notifications disabled`
                  ),
            onError: () =>
              toast.error(
                `Order #${variables.orderId} was saved, but the SMS failed to send`
              ),
          }
        );
      }
    },
    onError: (error) => {
      console.error("Failed to update order details:", error);
      toast.error(error.message || "Failed to update order details");
    },
  });

  const updateDeliveryCharge = useMutation({
    mutationFn: async ({
      order,
      deliveryCharge,
    }: {
      order: SelectOrderWithUser;
      deliveryCharge: number;
    }) => {
      const orderDetails = getOrderDetails(order) ?? {};
      const updatedDetails = {
        ...orderDetails,
        deliveryCharge,
      };
      const totalAmount = getOrderTotalWithDeliveryCharge(
        updatedDetails,
        deliveryCharge
      ).toFixed(2);

      const res = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: order.id,
          orderDetails: updatedDetails,
          totalAmount,
        }),
      });

      if (!res.ok) throw new Error("Failed to update delivery charge");
      return { orderId: order.id, deliveryCharge, totalAmount, updatedDetails };
    },
    onSuccess: () => {
      void refreshOrderViews();
    },
    onError: (error) => {
      console.error("Failed to update delivery charge:", error);
      toast.error("Failed to update delivery charge");
    },
  });

  const updateOrderTime = useMutation({
    mutationFn: async ({
      orderId,
      minutes,
    }: {
      orderId: number;
      minutes: number;
    }) => {
      const res = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: orderId,
          status: "confirmed",
          estimatedTime: minutes,
        }),
      });
      if (!res.ok) throw new Error("Failed to update scheduled time");
      return { orderId, minutes };
    },
    onMutate: async ({ orderId, minutes }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["orders"] });

      // Snapshot previous value
      const previousOrders = queryClient.getQueryData(["orders"]);

      // Optimistically update the cache
      queryClient.setQueryData(["orders"], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          orders: old.orders.map((order: SelectOrderWithUser) =>
            order.id === orderId
              ? { ...order, status: "confirmed", estimatedTime: minutes }
              : order
          ),
        };
      });

      return { previousOrders };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousOrders) {
        queryClient.setQueryData(["orders"], context.previousOrders);
      }
      toast.error("Failed to update order time");
    },
    onSettled: async () => {
      await refreshOrderViews();
    },
  });

  const confirmOrderWithPrepTime = async (
    order: SelectOrderWithUser,
    minutes: number,
    onComplete?: () => void
  ) => {
    try {
      const customerId = order.user?.id;
      if (!customerId) {
        throw new Error("No customer available for SMS");
      }
      // Calculate the actual ready time
      const readyTime = new Date();
      readyTime.setMinutes(readyTime.getMinutes() + minutes);
      const readyTimeString = readyTime.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: STORE_CONFIG.timeZone,
      });

      const isDelivery = order.fulfillmentType === "delivery";
      const actionText = isDelivery ? "delivered" : "ready for pickup";

      await sendOrderSMS.mutateAsync({
        customerId,
        body: `${STORE_CONFIG.name}: Hi ${
          order.user?.name || "Customer"
        }, your order #${
          order.id
        } has been confirmed and will be ${actionText} in approximately ${minutes} minutes (around ${readyTimeString}).\nView your order details here:\n${STORE_CONFIG.websiteUrl}/orders-history
        \n\nIf you wish to cancel or modify your order, please contact us at ${STORE_CONFIG.phone.display}.`,
      });
      await updateOrderTime.mutateAsync({ orderId: order.id, minutes });
      toast.success(
        `Order #${order.id} confirmed with ${minutes} minute preparation time`
      );
      onComplete?.();
      return true;
    } catch (error) {
      console.error("Failed to confirm order:", error);
      toast.error("Failed to confirm order");
      onComplete?.();
      return false;
    }
  };


  const confirmScheduledOrder = async (
    order: SelectOrderWithUser,
    scheduledTime: Date,
    onComplete?: () => void
  ) => {
    try {
      const customerId = order.user?.id;
      if (!customerId) {
        throw new Error("No customer available for SMS");
      }
      const isDelivery = order.fulfillmentType === "delivery";
      const actionText = isDelivery ? "delivery" : "pickup";
      const scheduledTimeString = scheduledTime.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: STORE_CONFIG.timeZone,
      });

      await sendOrderSMS.mutateAsync({
        customerId,
        body: `${STORE_CONFIG.name}: Hi ${
          order.user?.name || "Customer"
        }, your order #${
          order.id
        } is scheduled for ${actionText} at ${scheduledTimeString}.

View your order details here:
${STORE_CONFIG.websiteUrl}/orders-history
\n\nIf you wish to cancel or modify your order, please contact us at ${STORE_CONFIG.phone.display}.`,
      });
      await updateOrderStatus.mutateAsync({
        orderId: order.id,
        nextStatus: "confirmed",
      });
      toast.success(`Order #${order.id} confirmed for scheduled ${actionText}`);
      onComplete?.();
      return true;
    } catch (error) {
      console.error("Failed to confirm order:", error);
      toast.error("Failed to confirm order");
      onComplete?.();
      return false;
    }
  };

  const cancelOrder = async (
    order: SelectOrderWithUser,
    reason: string,
    onComplete?: () => void
  ) => {
    try {
      const normalizedReason = reason.trim().toLowerCase();
      const shouldSendSms = normalizedReason !== "no show";
      const smsReason =
        normalizedReason === "too far"
          ? "Order location is too far from store"
          : reason;

      if (shouldSendSms) {
        const customerId = order.user?.id;
        if (!customerId) {
          throw new Error("No customer available for SMS");
        }
        await sendOrderSMS.mutateAsync({
          customerId,
          body: `Gourmet Express: Hi ${
            order.user?.name || "Customer"
          }, your order #${order.id} is canceled. Reason: ${smsReason}`,
        });
      }

      await updateOrderStatus.mutateAsync({
        orderId: order.id,
        nextStatus: "canceled",
        reason: reason,
      });
      onComplete?.();
    } catch (error) {
      console.error("Failed to cancel order:", error);
      toast.error("Failed to cancel order");
      onComplete?.();
    }
  };

  return {
    updateOrderStatus,
    deleteOrder,
    sendOrderSMS,
    updateOrderDetails,
    updateDeliveryCharge,
    confirmOrderWithPrepTime,
    cancelOrder,
    confirmScheduledOrder,
    submitOrder,
  };
}
