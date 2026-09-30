"use client";

import { useState, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { CancelOrderDialog } from "./components/cancel-order-dialog";
import { EditOrderDialog } from "./components/edit-order-dialog";
import {
  // Calendar,
  ChevronLeft,
  ChevronRight,
  // Clock,
  // MoreHorizontal,
  CircleX,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OrderListItem, SelectOrderWithUser } from "@/lib/types";
import { OrderDetails } from "./order-details";
import { toast } from "sonner";
import { PrepareTimeDialog } from "./components/prepare-time-dialog";
import { DeliveryChargeDialog } from "./components/delivery-charge-dialog";
import { DeleteConfirmationDialog } from "./orders/delete-confirmation-dialog";
import { useOrderActions } from "@/hooks/useOrderActions";
import { formatDate } from "@/lib/formatDate";
import { getStatusBadge } from "@/lib/getStatusBadge";

interface OrdersTableProps {
  orders: OrderListItem[];
  totalOrders: number;
  currentPage: number;
  offset: number;
  ordersPerPage?: number;
  showPagination?: boolean;
  status?: string;
  isDashboardTable?: boolean;
}

const PAGE_SIZE_OPTIONS = [15, 25, 50, 100];
const SCHEDULED_ALERT_TICK_MS = 60 * 1000;

const getOrderStatusLabel = (order: OrderListItem | SelectOrderWithUser) => {
  if (order.status !== "ready") return order.status;
  return order.fulfillmentType === "delivery"
    ? "delivering"
    : "ready for pickup";
};

export function OrdersTable({
  orders,
  totalOrders,
  currentPage,
  offset,
  ordersPerPage = 15,
  showPagination = true,
  status = "all",
  isDashboardTable = false,
}: OrdersTableProps) {
  const {
    updateOrderStatus,
    sendOrderSMS,
    confirmScheduledOrder,
    confirmOrderWithPrepTime,
    cancelOrder,
    updateDeliveryCharge,
  } = useOrderActions();

  const [viewingOrder, setViewingOrder] = useState<SelectOrderWithUser | null>(
    null
  );
  const [preparingOrder, setPreparingOrder] =
    useState<SelectOrderWithUser | null>(null);
  const [deliveryChargeOrder, setDeliveryChargeOrder] =
    useState<SelectOrderWithUser | null>(null);
  const [cancelingOrder, setCancelingOrder] =
    useState<SelectOrderWithUser | null>(null);
  const [statusChangeOrder, setStatusChangeOrder] =
    useState<SelectOrderWithUser | null>(null);
  const [editingOrder, setEditingOrder] = useState<SelectOrderWithUser | null>(
    null
  );
  const [orderPickupByCustomer, setOrderPickupByCustomer] =
    useState<SelectOrderWithUser | null>(null);
  const [scheduledOrder, setScheduledOrder] =
    useState<SelectOrderWithUser | null>(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [loadingOrderId, setLoadingOrderId] = useState<number | null>(null);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const startIndex = orders.length > 0 ? offset + 1 : 0;
  const effectiveOrdersPerPage = PAGE_SIZE_OPTIONS.includes(ordersPerPage)
    ? ordersPerPage
    : 15;
  const endIndex = Math.min(offset + effectiveOrdersPerPage, totalOrders);
  const currentPageOrders = orders;

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, SCHEDULED_ALERT_TICK_MS);

    return () => window.clearInterval(intervalId);
  }, []);

  const getScheduleLabel = (order: OrderListItem | SelectOrderWithUser) =>
    order.fulfillmentType === "delivery" ? "delivery" : "pickup";

  const getScheduledConfirmationDescription = (
    order: SelectOrderWithUser | null
  ) => {
    if (!order) return "";

    const scheduleLabel = getScheduleLabel(order);
    return `The order #${order.id} is scheduled for ${scheduleLabel} at ${formatDate(
      new Date(order.scheduledTime || "")
    )}. Customer will be notified via SMS. Please make sure the order is ready for ${scheduleLabel} by the scheduled time.`;
  };

  function prevPage() {
    const newOffset = Math.max(0, offset - effectiveOrdersPerPage);
    const newPage = Math.floor(newOffset / effectiveOrdersPerPage) + 1;

    const params = new URLSearchParams(searchParams.toString());
    params.set("offset", newOffset.toString());
    params.set("page", newPage.toString());

    window.history.pushState(null, "", `${pathname}?${params.toString()}`);
  }

  function nextPage() {
    const newOffset = offset + effectiveOrdersPerPage;
    const newPage = Math.floor(newOffset / effectiveOrdersPerPage) + 1;

    const params = new URLSearchParams(searchParams.toString());
    params.set("offset", newOffset.toString());
    params.set("page", newPage.toString());

    window.history.pushState(null, "", `${pathname}?${params.toString()}`);
  }

  function updateOrdersPerPage(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pageSize", value);
    params.set("offset", "0");
    params.set("page", "1");

    window.history.pushState(null, "", `${pathname}?${params.toString()}`);
  }

  // Pending order detection is now handled by PendingOrdersMonitor in the layout

  const continuePendingStatusChange = (order: SelectOrderWithUser) => {
    if (order.fulfillmentTimingType === "ASAP") {
      setPreparingOrder(order);
    } else if (order.fulfillmentTimingType === "SCHEDULED") {
      setScheduledOrder(order);
    }
  };

  const loadOrderDetails = async (orderId: number) => {
    setLoadingOrderId(orderId);
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Failed to fetch order details");
      return (await response.json()) as SelectOrderWithUser;
    } catch (error) {
      toast.error("Failed to load order details");
      throw error;
    } finally {
      setLoadingOrderId(null);
    }
  };

  const openOrderWithDetails = async (
    orderId: number,
    setter: (order: SelectOrderWithUser) => void
  ) => {
    try {
      setter(await loadOrderDetails(orderId));
    } catch {
      // The loader already reports a user-facing error.
    }
  };

  const handleStatusChange = async (orderId: number, currentStatus: string) => {
    let order: SelectOrderWithUser;
    try {
      order = await loadOrderDetails(orderId);
    } catch {
      return;
    }

    // If changing from pending to confirmed, show prepare time dialog
    if (currentStatus === "pending") {
      if (order.fulfillmentType === "delivery") {
        setDeliveryChargeOrder(order);
        return;
      }

      continuePendingStatusChange(order);
      return;
    }

    // If changing from confirmed, show confirmation dialog
    else if (currentStatus === "confirmed") {
      setStatusChangeOrder(order);
      return;
    } else if (currentStatus === "ready") {
      setOrderPickupByCustomer(order);
      return;
    } else {
      toast.error("Invalid status change");
    }
  };
  const handleConfirmScheduledOrder = async (order: SelectOrderWithUser) => {
    confirmScheduledOrder(order, new Date(order.scheduledTime || ""), () =>
      setScheduledOrder(null)
    );
  };
  const handleOrderPickupByCustomer = async (order: SelectOrderWithUser) => {
    try {
      await updateOrderStatus.mutateAsync({
        orderId: order.id,
        nextStatus: "completed",
      });
      setOrderPickupByCustomer(null);
    } catch (error) {
      toast.error("Failed to update order status");
    }
  };
  const handleStatusChangeConfirm = async (order: SelectOrderWithUser) => {
    const nextStatus = "ready";
    const displayStatus = order.fulfillmentType === "delivery" ? "delivering" : "ready for pickup";
    try {
      const customerId = order.user?.id;
      if (!customerId) {
        toast.error("No customer available for notification");
        return;
      }

      const message = `Gourmet Express: Hi ${
        order.user?.name || "Customer"
      }, your order #${
        order.id
      } is now "${displayStatus}".\n\nView your order details here:\nhttps://gourmet-express-kipling.com/orders-history`;

      // Send SMS first
      await sendOrderSMS.mutateAsync({ customerId, body: message });

      // Only update order status if SMS was successful
      await updateOrderStatus.mutateAsync({
        orderId: order.id,
        nextStatus: nextStatus,
      });

      setStatusChangeOrder(null);
    } catch (error) {
      console.error("Failed to update order status:", error);
      toast.error("Failed to update order status - customer was not notified");
    }
  };

  const handlePrepareTimeSubmit = (
    order: SelectOrderWithUser,
    minutes: number
  ) => {
    confirmOrderWithPrepTime(order, minutes, () => setPreparingOrder(null));
  };

  const handleDeliveryChargeSubmit = async (
    order: SelectOrderWithUser,
    deliveryCharge: number
  ) => {
    try {
      await updateDeliveryCharge.mutateAsync({ order, deliveryCharge });
      setDeliveryChargeOrder(null);
      continuePendingStatusChange(order);
    } catch (error) {
      console.error("Failed to set delivery charge:", error);
    }
  };

  const handleCancelOrder = (order: SelectOrderWithUser, reason: string) => {
    cancelOrder(order, reason, () => setCancelingOrder(null));
  };

  // Time until an active order is considered at risk of being late.
  const getScheduledAlertThreshold = (order: OrderListItem | SelectOrderWithUser) =>
    order.fulfillmentType === "delivery" ? 30 : 10;

  // Active orders stay yellow until they become due soon or late, then turn red.
  // Completed and canceled orders have no highlight.
  const getRowStyling = (order: OrderListItem | SelectOrderWithUser) => {
    if (order.status === "completed" || order.status === "canceled") {
      return "";
    }

    if (order.status === "confirmed" && order.scheduledTime) {
      const scheduledTime = new Date(order.scheduledTime);
      const minutesDiff = Math.floor(
        (scheduledTime.getTime() - currentTime) / (1000 * 60)
      );

      if (minutesDiff <= getScheduledAlertThreshold(order)) {
        return "bg-red-50 border-l-4 border-l-red-500 hover:bg-red-100";
      }
    }

    return "bg-yellow-50 border-l-4 border-l-yellow-500 hover:bg-yellow-100";
  };

  // Function to get urgency indicator for status column
  const getUrgencyIndicator = (order: OrderListItem | SelectOrderWithUser) => {
    if (order.status !== "confirmed" || !order.scheduledTime) {
      return null;
    }

    const now = new Date(currentTime);
    const scheduledTime = new Date(order.scheduledTime);
    const timeDiff = scheduledTime.getTime() - now.getTime();
    const minutesDiff = Math.floor(timeDiff / (1000 * 60));

    if (minutesDiff <= getScheduledAlertThreshold(order)) {
      return "AT RISK";
    }

    return null;
  };

  // Function to get order number styling with urgency indicator
  const getOrderNumberDisplay = (order: OrderListItem | SelectOrderWithUser) => {
    const urgency = getUrgencyIndicator(order);

    if (urgency === "AT RISK") {
      return (
        <div className="flex items-center gap-2">
          <span className="font-medium">{order.id}</span>
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
        </div>
      );
    }

    return <span className="font-medium">{order.id}</span>;
  };

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle>
          {isDashboardTable ? "Today's Orders" : "Orders"}
        </CardTitle>
        <CardDescription>
          {isDashboardTable
            ? "Manage and track today's customer orders."
            : "Manage and track customer orders."}
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
        {/* Edit Order Dialog */}
        <EditOrderDialog
          open={!!editingOrder}
          setOpen={(open) => {
            if (!open) setEditingOrder(null);
          }}
          order={editingOrder}
        />
        {/* Detail modal */}
        <Dialog
          open={!!viewingOrder}
          onOpenChange={() => setViewingOrder(null)}
        >
          <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] overflow-y-auto p-4 sm:max-w-4xl sm:p-6 [&>button]:h-12 [&>button]:w-12">
            {viewingOrder && (
              <>
                <DialogHeader className="pr-8 text-left">
                  <DialogTitle className="text-lg sm:text-xl">
                    Order #{viewingOrder.id}
                  </DialogTitle>
                  <DialogDescription>
                    View customer, item, payment, and fulfillment details for this order.
                  </DialogDescription>
                </DialogHeader>
                <OrderDetails order={viewingOrder} />
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Prepare time dialog */}
        {deliveryChargeOrder && (
          <DeliveryChargeDialog
            order={deliveryChargeOrder}
            onSubmit={(deliveryCharge) =>
              handleDeliveryChargeSubmit(deliveryChargeOrder, deliveryCharge)
            }
            onClose={() => setDeliveryChargeOrder(null)}
          />
        )}

        {preparingOrder && (
          <PrepareTimeDialog
            order={preparingOrder}
            onSubmit={(minutes) =>
              handlePrepareTimeSubmit(preparingOrder, minutes)
            }
            onClose={() => setPreparingOrder(null)}
          />
        )}

        <DeleteConfirmationDialog
          open={!!scheduledOrder}
          setOpen={(open) => {
            if (!open) setScheduledOrder(null);
          }}
          onConfirm={() =>
            scheduledOrder && handleConfirmScheduledOrder(scheduledOrder)
          }
          title="Scheduled Order Confirmation"
          description={getScheduledConfirmationDescription(scheduledOrder)}
        />
        {/* Order Pickup By Customer Dialog */}

        <DeleteConfirmationDialog
          open={!!orderPickupByCustomer}
          setOpen={(open) => {
            if (!open) setOrderPickupByCustomer(null);
          }}
          onConfirm={() =>
            orderPickupByCustomer &&
            handleOrderPickupByCustomer(orderPickupByCustomer)
          }
          title={orderPickupByCustomer?.fulfillmentType === "delivery" ? "Order Delivered" : "Order Pickup By Customer"}
          description={
            orderPickupByCustomer?.fulfillmentType === "delivery"
              ? `Are you sure the order #${orderPickupByCustomer?.id} has been delivered to the customer?`
              : `Are you sure the order #${orderPickupByCustomer?.id} already picked up by the customer?`
          }
        />
        <CancelOrderDialog
          open={!!cancelingOrder}
          setOpen={(open) => {
            if (!open) setCancelingOrder(null);
          }}
          onConfirm={(reason) =>
            cancelingOrder && handleCancelOrder(cancelingOrder, reason)
          }
          order={cancelingOrder}
        />

        {/* Status Change Confirmation Dialog */}
        <DeleteConfirmationDialog
          open={!!statusChangeOrder}
          setOpen={(open) => {
            if (!open) setStatusChangeOrder(null);
          }}
          onConfirm={() =>
            statusChangeOrder && handleStatusChangeConfirm(statusChangeOrder)
          }
          title="Change Order Status"
          description={
            statusChangeOrder?.fulfillmentType === "delivery"
              ? `Are you sure the order #${statusChangeOrder?.id} is out for delivery? This will notify the customer.`
              : `Are you sure the order #${statusChangeOrder?.id} is ready? This will notify the customer.`
          }
        />

        <div className="min-w-0 space-y-3 sm:hidden">
          {orders.length === 0 ? (
            <div className="rounded-md border py-6 text-center text-sm text-muted-foreground">
              No orders found
            </div>
          ) : (
            currentPageOrders.map((order) => {
              const isFinal =
                order.status === "completed" || order.status === "canceled";
              return (
                <div
                  key={order.id}
                  aria-busy={loadingOrderId === order.id}
                  className={`min-w-0 overflow-hidden rounded-md border bg-card p-3 ${getRowStyling(
                    order
                  )}`}
                  onClick={() =>
                    void openOrderWithDetails(order.id, setViewingOrder)
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {getOrderNumberDisplay(order)}
                        <span className="text-xs text-muted-foreground">
                          Order
                        </span>
                      </div>
                      <div className="mt-1 truncate font-medium">
                        {order.user?.name || "Unknown"}
                      </div>
                    </div>
                    {isFinal ? (
                      <div className="flex h-12 w-40 shrink-0 items-center justify-center">
                        <Badge
                          variant="outline"
                          className={`${getStatusBadge(
                            order.status
                          )} w-32 justify-center capitalize`}
                        >
                          {getOrderStatusLabel(order)}
                        </Badge>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        className="h-12 w-40 shrink-0 p-0 active:scale-95"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleStatusChange(order.id, order.status);
                        }}
                      >
                        <Badge
                          variant="outline"
                          className={`${getStatusBadge(
                            order.status
                          )} w-32 justify-center capitalize`}
                        >
                          {getOrderStatusLabel(order)}
                        </Badge>
                        <span className="sr-only">Change status</span>
                      </Button>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">Total</div>
                      <div className="font-medium">
                        ${Number.parseFloat(order.totalAmount).toFixed(2)}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">Type</div>
                      <div className="truncate capitalize">
                        {order.fulfillmentType}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">
                        Timing
                      </div>
                      <div className="truncate">
                        {order.fulfillmentTimingType}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">
                        Scheduled
                      </div>
                      <div className="truncate">
                        {order.scheduledTime
                          ? formatDate(new Date(order.scheduledTime))
                          : "Not scheduled"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 border-t pt-3">
                    <div className="min-w-0 truncate text-xs text-muted-foreground">
                      {formatDate(new Date(order.createdAt))}
                    </div>
                    {!isFinal && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-12 w-12 active:scale-95"
                          onClick={(event) => {
                            event.stopPropagation();
                            void openOrderWithDetails(
                              order.id,
                              setEditingOrder
                            );
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Edit order</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-12 w-12 text-destructive hover:text-destructive-foreground active:scale-95"
                          onClick={(event) => {
                            event.stopPropagation();
                            void openOrderWithDetails(
                              order.id,
                              setCancelingOrder
                            );
                          }}
                        >
                          <CircleX className="h-4 w-4" />
                          <span className="sr-only">Cancel order</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="hidden sm:block">
          <Table className="table-fixed [&_td]:px-2 [&_td]:text-center [&_th]:px-2 [&_th]:text-center">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[5%]">Order #</TableHead>
                <TableHead className="w-[12%]">Customer Name</TableHead>
                <TableHead className="w-[16%]">Activity</TableHead>
                <TableHead className="w-[8%]">Total</TableHead>
                <TableHead className="w-[10%]">Order Type</TableHead>
                <TableHead className="w-[11%]">Timing Type</TableHead>
                <TableHead className="w-[17%]">
                  Scheduled Time / ETA
                </TableHead>
                <TableHead className="w-[13%]">Status</TableHead>
                <TableHead className="w-[8%]">Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-6 text-center">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                currentPageOrders.map((order) => {
                  const isFinal =
                    order.status === "completed" || order.status === "canceled";
                  return (
                    <TableRow
                      key={order.id}
                      aria-busy={loadingOrderId === order.id}
                      className={`cursor-pointer hover:bg-muted/50 ${getRowStyling(
                        order
                      )}`}
                      onClick={() =>
                        void openOrderWithDetails(order.id, setViewingOrder)
                      }
                    >
                      <TableCell className="font-medium">
                        {getOrderNumberDisplay(order)}
                      </TableCell>
                      <TableCell className="break-words font-medium">
                        {order.user?.name || "Unknown"}
                      </TableCell>
                      <TableCell className="break-words text-sm">
                        <div>
                          <span className="text-muted-foreground">Created:</span>{" "}
                          {formatDate(new Date(order.createdAt))}
                        </div>
                        <div className="mt-1">
                          <span className="text-muted-foreground">Updated:</span>{" "}
                          {formatDate(new Date(order.updatedAt))}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        ${Number.parseFloat(order.totalAmount).toFixed(2)}
                      </TableCell>
                      <TableCell className="capitalize">
                        {order.fulfillmentType}
                      </TableCell>
                      <TableCell>{order.fulfillmentTimingType}</TableCell>
                      <TableCell className="break-words">
                        {order.scheduledTime
                          ? formatDate(new Date(order.scheduledTime))
                          : "Not scheduled"}
                      </TableCell>
                      <TableCell className="text-center">
                        {isFinal ? (
                          <div className="flex h-12 w-full items-center justify-center">
                            <Badge
                              variant="outline"
                              className={`${getStatusBadge(
                                order.status
                              )} w-full max-w-32 justify-center text-center capitalize`}
                            >
                              {getOrderStatusLabel(order)}
                            </Badge>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            className="h-12 w-full p-0 active:scale-95"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleStatusChange(order.id, order.status);
                            }}
                          >
                            <Badge
                              variant="outline"
                              className={`${getStatusBadge(
                                order.status
                              )} w-full max-w-32 justify-center text-center capitalize`}
                            >
                              {getOrderStatusLabel(order)}
                            </Badge>
                            <span className="sr-only">Change status</span>
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        {!isFinal && (
                          <div className="flex flex-wrap justify-center gap-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-12 w-12 active:scale-95"
                              onClick={(event) => {
                                event.stopPropagation();
                                void openOrderWithDetails(
                                  order.id,
                                  setEditingOrder
                                );
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit order</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-12 w-12 text-destructive hover:text-destructive-foreground active:scale-95"
                              onClick={(event) => {
                                event.stopPropagation();
                                void openOrderWithDetails(
                                  order.id,
                                  setCancelingOrder
                                );
                              }}
                            >
                              <CircleX className="h-4 w-4" />
                              <span className="sr-only">Cancel order</span>
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      {showPagination && (
        <CardFooter className="p-4 pt-0 sm:p-6 sm:pt-0">
          <div className="flex w-full flex-col gap-3 sm:mt-4 sm:flex-row sm:items-center sm:justify-between sm:px-4">
            <div className="text-sm text-muted-foreground">
              Showing{" "}
              <strong>
                {startIndex}-{endIndex}
              </strong>{" "}
              of <strong>{totalOrders}</strong> orders
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rows</span>
                <Select
                  value={effectiveOrdersPerPage.toString()}
                  onValueChange={updateOrdersPerPage}
                >
                  <SelectTrigger className="h-12 w-[82px]">
                    <SelectValue placeholder="Rows" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((value) => (
                      <SelectItem key={value} value={value.toString()}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={prevPage}
                size="sm"
                variant="ghost"
                className="h-12"
                disabled={offset === 0}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Prev
              </Button>
              <Button
                onClick={nextPage}
                size="sm"
                variant="ghost"
                className="h-12"
                disabled={offset + effectiveOrdersPerPage >= totalOrders}
              >
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
