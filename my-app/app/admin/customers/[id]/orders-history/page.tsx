"use client";

import { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OrderCard } from "@/app/orders-history/order-card";
import LoadingAnimation from "@/components/LoadingAnimation";
import { useCustomerDetails } from "@/hooks/useUserActions";
import { formatCanadianPhoneNumber } from "@/lib/utils";
import { EditCustomerDialog } from "../../dialogs/edit-customer-dialog";
import { useQuery } from "@tanstack/react-query";
import type { OrdersResponse, SelectOrderWithUser } from "@/lib/types";

const HISTORY_PAGE_SIZE = 15;

export default function CustomerOrdersHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const customerId = Number(params.id);
  const { data: customer, isLoading, error } = useCustomerDetails(customerId);
  const {
    data: ordersData = {
      orders: [],
      totalOrders: 0,
      totalAmount: 0,
      page: 1,
      limit: HISTORY_PAGE_SIZE,
      totalPages: 0,
    },
    isLoading: isLoadingOrders,
    error: ordersError,
  } = useQuery<OrdersResponse<SelectOrderWithUser>>({
    queryKey: ["orders", "customer-history", customerId, historyPage],
    queryFn: async () => {
      const query = new URLSearchParams({
        userId: String(customerId),
        view: "history",
        page: String(historyPage),
        limit: String(HISTORY_PAGE_SIZE),
        sortBy: "createdAt",
        sortOrder: "desc",
      });
      const response = await fetch(`/api/orders?${query.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Failed to fetch order history");
      return response.json();
    },
    enabled: Number.isInteger(customerId) && customerId > 0,
  });
  const customerListQuery = searchParams.toString();
  const customerListHref = `/admin/customers${
    customerListQuery ? `?${customerListQuery}` : ""
  }`;

  if (isLoading || isLoadingOrders) {
    return <LoadingAnimation className="h-screen" />;
  }


  if (error || ordersError) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-lg text-red-500 mb-4">
              Error: {(error || ordersError)?.message}
            </div>
            <Button
              onClick={() => router.push(customerListHref)}
              className="min-h-12"
            >
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-lg text-muted-foreground mb-4">Customer not found</div>
            <Button
              onClick={() => router.push(customerListHref)}
              className="min-h-12"
            >
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const totalSpent = ordersData.totalAmount ?? 0;
  const displayText = (value?: string | null) => value?.trim() || "";
  const firstAvailableText = (...values: Array<string | null | undefined>) =>
    values.find((value) => value?.trim())?.trim() || "";
  const deliveryAddress = firstAvailableText(
    customer.deliveryAddressDetails?.formattedAddress,
    customer.address
  );
  const customerDetails = [
    { label: "Name", value: displayText(customer.name) },
    {
      label: "Phone Number",
      value: customer.phoneNumber
        ? formatCanadianPhoneNumber(customer.phoneNumber)
        : "",
    },
    { label: "Email", value: displayText(customer.email) },
    { label: "Delivery Address", value: deliveryAddress },
    { label: "Allergy Info", value: displayText(customer.allergyInfo) },
    { label: "Admin Notes", value: displayText(customer.notes) },
    { label: "Total Orders", value: ordersData.totalOrders },
    { label: "Total Spent", value: `$${totalSpent.toFixed(2)}` },
  ];

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(customerListHref)}
          className="min-h-12 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Customers
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Customer Information</CardTitle>
            <CardDescription>Details for {customer.name}</CardDescription>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsEditDialogOpen(true)}
            className="h-12 w-12 shrink-0"
          >
            <Edit className="h-4 w-4" />
            <span className="sr-only">Edit customer</span>
          </Button>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
            {customerDetails.map((detail) => (
              <div key={detail.label} className="min-w-0">
                <dt className="text-sm font-medium text-muted-foreground">
                  {detail.label}
                </dt>
                <dd className="mt-1 break-words text-sm">{detail.value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Order History</h2>
          <span className="text-sm text-muted-foreground">
            {ordersData.totalOrders} order{ordersData.totalOrders !== 1 ? 's' : ''}
          </span>
        </div>

        {ordersData.orders.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-muted-foreground">No orders found for this customer</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {ordersData.orders.map((order) => (
              <OrderCard key={order.id} order={order} isAdminView />
            ))}
            {ordersData.totalPages > 1 && (
              <div className="flex items-center justify-between gap-3 pt-2">
                <div className="text-sm text-muted-foreground">
                  Page {historyPage} of {ordersData.totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={historyPage <= 1}
                    onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}
                    className="min-h-12"
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={historyPage >= ordersData.totalPages}
                    onClick={() => setHistoryPage((page) => page + 1)}
                    className="min-h-12"
                  >
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <EditCustomerDialog
        open={isEditDialogOpen}
        setOpen={setIsEditDialogOpen}
        customer={customer}
      />
    </div>
  );
} 
