"use client";
import { useSearchParams } from "next/navigation";
import { OrderTabs } from "../components/order-tabs";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Suspense, useEffect, useState } from "react";
import LoadingAnimation from "@/components/LoadingAnimation";
import { ADMIN_SEARCH_EVENT } from "../search";

const PAGE_SIZE_OPTIONS = [15, 25, 50, 100];

// API fetch function
const fetchOrders = async (
  params: Record<string, string | number | boolean | undefined>
) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, value.toString());
    }
  });
  const response = await fetch(`/api/orders?${searchParams.toString()}`);
  if (!response.ok) throw new Error("Failed to fetch orders");
  return response.json();
};

export default function OrdersPage() {
  return (
    <Suspense fallback={<LoadingAnimation className="h-screen" />}>
      <OrdersPageContent />
    </Suspense>
  );
}

function OrdersPageContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? "all";
  const startDate = searchParams.get("startDate") ?? "";
  const endDate = searchParams.get("endDate") ?? "";
  const sortBy = searchParams.get("sortBy") ?? "createdAt";
  const sortOrder = searchParams.get("sortOrder") ?? "desc";
  const [customer, setCustomer] = useState("");
  const [debouncedCustomer, setDebouncedCustomer] = useState("");
  const offset = Number(searchParams.get("offset") ?? "0");
  const requestedPageSize = Number(searchParams.get("pageSize") ?? "15");
  const pageSize = PAGE_SIZE_OPTIONS.includes(requestedPageSize)
    ? requestedPageSize
    : 15;
  const currentPage = Math.floor(offset / pageSize) + 1;
  const apiParams = {
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    sortBy:
      sortBy === "createdAt"
        ? "createdAt"
        : sortBy === "total"
        ? "totalAmount"
        : "createdAt",
    sortOrder: sortOrder === "asc" || sortOrder === "desc" ? sortOrder : "desc",
    status: status === "all" ? undefined : status,
    fulfillmentType: searchParams.get("fulfillmentType") || undefined,
    fulfillmentTimingType:
      searchParams.get("fulfillmentTimingType") || undefined,
    customer: debouncedCustomer || undefined,
    page: currentPage,
    limit: pageSize,
  };

  const {
    data: ordersData = { orders: [], totalOrders: 0 },
    isLoading: isLoadingOrders,
  } = useQuery({
    queryKey: ["orders", apiParams],
    queryFn: () => fetchOrders(apiParams),
    placeholderData: keepPreviousData,
    staleTime: 10 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { orders, totalOrders } = ordersData;

  useEffect(() => {
    const handleSearchChange = (event: Event) => {
      const { pathname, value } = (event as CustomEvent).detail ?? {};
      if (typeof pathname === "string" && pathname.includes("/admin/orders")) {
        setCustomer(typeof value === "string" ? value : "");
      }
    };

    window.addEventListener(ADMIN_SEARCH_EVENT, handleSearchChange);
    return () =>
      window.removeEventListener(ADMIN_SEARCH_EVENT, handleSearchChange);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedCustomer(customer.trim());
      const params = new URLSearchParams(window.location.search);
      params.set("offset", "0");
      params.set("page", "1");
      window.history.pushState(null, "", `/admin/orders?${params.toString()}`);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [customer]);

  if (isLoadingOrders) {
    return <LoadingAnimation className="h-screen" />;
  }

  return (
    <div className="mx-auto w-full max-w-full overflow-hidden p-2 sm:p-6">
      <Card className="w-full overflow-hidden">
        <CardContent className="space-y-4 p-4 sm:space-y-6 sm:p-6">
          <OrderTabs
            orders={orders}
            totalOrders={totalOrders}
            currentPage={currentPage}
            offset={offset}
            ordersPerPage={pageSize}
            status={status}
          />
        </CardContent>
      </Card>
    </div>
  );
}
