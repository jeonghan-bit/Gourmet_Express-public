"use client";

import {
  DollarSign,
  Package,
  Clock as ClockIcon,
  Calendar as CalendarIcon,
  Plus,
} from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useOrderActions } from "@/hooks/useOrderActions";
import { Suspense, useMemo, useState } from "react";
import type { OrderListItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { OrderTabs } from "./components/order-tabs";
import { AddOrderDialog } from "./orders/add-order-dialog";
import LoadingAnimation from "@/components/LoadingAnimation";
import { toast } from "sonner";
import { STORE_CONFIG } from "@/lib/storeConfig";
import { useSearchParams } from "next/navigation";

type DashboardSummary = {
  todayOrders: number;
  todayRevenue: number;
  scheduledOrders: number;
  pendingOrders: number;
  orders: OrderListItem[];
  totalOrders: number;
};

const fetchDashboardSummary = async (): Promise<DashboardSummary> => {
  const res = await fetch("/api/admin/dashboard-summary");
  if (!res.ok) throw new Error("Failed to fetch dashboard summary");
  return res.json();
};

export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingAnimation className="h-screen" />}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  // State for dialogs
  const [addOrderOpen, setAddOrderOpen] = useState(false);
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status");
  const status = [
    "pending",
    "confirmed",
    "ready",
    "completed",
    "canceled",
  ].includes(statusParam ?? "")
    ? statusParam!
    : "all";
  const fulfillmentTypeParam = searchParams.get("fulfillmentType");
  const fulfillmentType = ["pickup", "delivery", "dineIn"].includes(
    fulfillmentTypeParam ?? ""
  )
    ? fulfillmentTypeParam!
    : "all";
  const fulfillmentTimingTypeParam = searchParams.get("fulfillmentTimingType");
  const fulfillmentTimingType = ["ASAP", "SCHEDULED"].includes(
    fulfillmentTimingTypeParam ?? ""
  )
    ? fulfillmentTimingTypeParam!
    : "all";

  // Hooks
  const { sendOrderSMS, submitOrder } = useOrderActions();

  const {
    data: dashboardSummary = {
      todayOrders: 0,
      todayRevenue: 0,
      scheduledOrders: 0,
      pendingOrders: 0,
      orders: [],
      totalOrders: 0,
    },
    isLoading: isLoadingDashboardSummary,
  } = useQuery<DashboardSummary>({
    queryKey: ["dashboardSummary"],
    queryFn: fetchDashboardSummary,
    staleTime: 10 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const {
    orders: allOrders,
    todayOrders,
    todayRevenue,
    scheduledOrders,
    pendingOrders,
  } = dashboardSummary;
  const orders = useMemo(
    () =>
      allOrders.filter(
        (order) =>
          (status === "all" || order.status === status) &&
          (fulfillmentType === "all" ||
            order.fulfillmentType === fulfillmentType) &&
          (fulfillmentTimingType === "all" ||
            order.fulfillmentTimingType === fulfillmentTimingType)
      ),
    [allOrders, fulfillmentTimingType, fulfillmentType, status]
  );
  const totalOrders = orders.length;

  // Handlers for dialogs
  const handleSaveOrder = async (orderData: any) => {
    try {
      const createdOrder = await submitOrder.mutateAsync(orderData);

      if (
        orderData.source === "add_order" &&
        orderData.status === "confirmed" &&
        Number.isFinite(Number(orderData.estimatedTime)) &&
        Number(orderData.estimatedTime) > 0 &&
        orderData.userId
      ) {
        try {
          const minutes = Number(orderData.estimatedTime);
          const readyTime = new Date();
          readyTime.setMinutes(readyTime.getMinutes() + minutes);
          const readyTimeString = readyTime.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
            timeZone: STORE_CONFIG.timeZone,
          });
          const actionText =
            orderData.orderType === "delivery"
              ? "delivered"
              : "ready for pickup";

          await sendOrderSMS.mutateAsync({
            customerId: orderData.userId,
            body: `${STORE_CONFIG.name}: Hi ${
              orderData.customerName || "Customer"
            }, your order #${
              createdOrder.orderNumber
            } has been confirmed and will be ${actionText} in approximately ${minutes} minutes (around ${readyTimeString}).\nView your order details here:\n${
              STORE_CONFIG.websiteUrl
            }/orders-history\n\nIf you wish to cancel or modify your order, please contact us at ${
              STORE_CONFIG.phone.display
            }.`,
          });
        } catch (smsError) {
          console.error("Failed to send Add Order confirmation SMS:", smsError);
          toast.error("Order created, but failed to send customer SMS.");
        }
      }
    } catch (error) {
      console.error("Error creating order:", error);
      throw error;
    }
  };

  if (isLoadingDashboardSummary) {
    return <LoadingAnimation className="h-screen" />;
  }

  return (
    <div className="flex w-full max-w-full flex-col gap-4 overflow-hidden p-2 sm:p-4 lg:p-6">
      {/* Title and Add Order Button */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold tracking-tight sm:text-3xl">
          Dashboard
        </h1>
        <Button
          className="h-12 w-full px-5 sm:w-auto"
          onClick={() => setAddOrderOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Order
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-2 md:gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 sm:p-4 sm:pb-2">
            <CardTitle className="min-w-0 truncate text-[11px] font-medium sm:text-sm">
              Today&apos;s Orders
            </CardTitle>
            <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
            <div className="text-xl font-bold sm:text-2xl">{todayOrders}</div>
            <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
              Orders placed today
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 sm:p-4 sm:pb-2">
            <CardTitle className="min-w-0 truncate text-[11px] font-medium sm:text-sm">
              Today&apos;s Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 shrink-0 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
            <div className="text-xl font-bold sm:text-2xl">
              ${todayRevenue.toFixed(2)}
            </div>
            <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
              Revenue generated today
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 sm:p-4 sm:pb-2">
            <CardTitle className="min-w-0 truncate text-[11px] font-medium sm:text-sm">
              Pending Orders
            </CardTitle>
            <ClockIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
            <div className="text-xl font-bold sm:text-2xl">{pendingOrders}</div>
            <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
              Waiting to be confirmed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 sm:p-4 sm:pb-2">
            <CardTitle className="min-w-0 truncate text-[11px] font-medium sm:text-sm">
              Scheduled Orders
            </CardTitle>
            <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
            <div className="text-xl font-bold sm:text-2xl">
              {scheduledOrders}
            </div>
            <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
              Orders scheduled for later
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters + Table */}
      <div className="mt-2 sm:mt-4">
        {/* <Tabs defaultValue={status}>
          <TabsList className="grid grid-cols-2 gap-2 sm:grid-cols-none sm:flex sm:space-x-2 sm:gap-0 mb-2 sm:mb-0">
            {Object.keys(tabStatuses).map((tv) => (
              <TabsTrigger
                className="sm:px-4 px-1 sm:py-2 py-1 sm:text-base text-sm"
                key={tv}
                value={tv}
              >
                {tv.charAt(0).toUpperCase() + tv.slice(1)}
              </TabsTrigger>
            ))}
          </TabsList>
          {Object.entries(tabStatuses).map(([tv, sts]) => (
            <TabsContent key={tv} value={tv} className="mt-4">
              <OrdersTable
                orders={orders}
                // {
                //   tv === "scheduled"
                //     ? orders.filter((o) => o.fulfillmentType === "scheduled")
                //     : sts
                //     ? orders.filter((o) => sts.includes(o.status))
                //     : orders
                // }
                totalOrders={totalOrders}
                currentPage={currentPage}
                offset={offset}
                ordersPerPage={15}
              />
            </TabsContent>
          ))}
        </Tabs> */}
        <OrderTabs
          orders={orders}
          totalOrders={totalOrders}
          currentPage={1}
          offset={0}
          status={status}
          showPagination={false}
          showDateFilter={false}
          isDashboardTable
        />
        {/* Dialogs */}
        <AddOrderDialog
          open={addOrderOpen}
          setOpen={setAddOrderOpen}
          onSave={handleSaveOrder}
        />
      </div>
    </div>
  );
}
