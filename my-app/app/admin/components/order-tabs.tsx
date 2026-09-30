"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { OrderListItem } from "@/lib/types";
import { CalendarDays, Filter } from "lucide-react";
import { OrdersTable } from "../orders-table";
import { useSearchParams, usePathname } from "next/navigation";
import { DateTime } from "luxon";

interface OrderTabsProps {
  orders: OrderListItem[];
  totalOrders: number;
  currentPage: number;
  offset: number;
  ordersPerPage?: number;
  status: string;
  showPagination?: boolean;
  showDateFilter?: boolean;
  isDashboardTable?: boolean;
}

const tabStatuses = [
  "all",
  "pending",
  "confirmed",
  "ready",
  "completed",
  "canceled",
] as const;

const parseDateValue = (value: string) => {
  if (!value) return undefined;

  const date = DateTime.fromISO(value);
  return date.isValid ? date.toJSDate() : undefined;
};

function DatePickerField({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedDate = parseDateValue(value);

  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={`min-h-12 w-full justify-start px-2 text-left text-xs font-normal ${
              selectedDate ? "" : "text-muted-foreground"
            }`}
          >
            <CalendarDays className="mr-1.5 h-3.5 w-3.5 shrink-0" />
            <span className="whitespace-nowrap">
              {selectedDate
                ? DateTime.fromJSDate(selectedDate).toFormat("yyyy/MM/dd")
                : "Choose date"}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (!date) return;
              onChange(DateTime.fromJSDate(date).toFormat("yyyy-MM-dd"));
              setOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function OrderTabs({
  orders,
  totalOrders,
  currentPage,
  offset,
  ordersPerPage = 15,
  status,
  showPagination = true,
  showDateFilter = true,
  isDashboardTable = false,
}: OrderTabsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fulfillmentTypeParam = searchParams.get("fulfillmentType") || "all";
  const fulfillmentTimingTypeParam =
    searchParams.get("fulfillmentTimingType") || "all";
  const statusParam = searchParams.get("status") || status;

  const currentStatus = tabStatuses.includes(
    statusParam as (typeof tabStatuses)[number]
  )
    ? statusParam
    : "all";
  const currentStartDate = searchParams.get("startDate") || "";
  const currentEndDate = searchParams.get("endDate") || "";
  const [startDateDraft, setStartDateDraft] = useState(currentStartDate);
  const [endDateDraft, setEndDateDraft] = useState(currentEndDate);
  const activeFilterCount =
    (fulfillmentTypeParam !== "all" ? 1 : 0) +
    (fulfillmentTimingTypeParam !== "all" ? 1 : 0) +
    (showDateFilter && currentStartDate ? 1 : 0) +
    (showDateFilter && currentEndDate ? 1 : 0);

  useEffect(() => {
    setStartDateDraft(currentStartDate);
  }, [currentStartDate]);

  useEffect(() => {
    setEndDateDraft(currentEndDate);
  }, [currentEndDate]);

  const updateUrl = (params: URLSearchParams) => {
    const queryString = params.toString();
    window.history.pushState(
      null,
      "",
      queryString ? `${pathname}?${queryString}` : pathname
    );
  };

  const handleTabChange = (tabValue: string) => {
    if (tabValue === currentStatus) return;

    const params = new URLSearchParams(window.location.search);
    if (tabValue === "all") {
      params.delete("status");
    } else {
      params.set("status", tabValue);
    }
    params.set("offset", "0");
    params.set("page", "1");
    updateUrl(params);
  };

  const updateOrderFilter = (
    paramName: "fulfillmentType" | "fulfillmentTimingType",
    value: string
  ) => {
    const currentValue =
      paramName === "fulfillmentType"
        ? fulfillmentTypeParam
        : fulfillmentTimingTypeParam;
    if (value === currentValue) return;

    const params = new URLSearchParams(window.location.search);

    if (value === "all") {
      params.delete(paramName);
    } else {
      params.set(paramName, value);
    }

    params.set("offset", "0");
    params.set("page", "1");
    updateUrl(params);
  };

  const applyDateFilters = () => {
    const params = new URLSearchParams(window.location.search);

    if (startDateDraft) {
      params.set("startDate", startDateDraft);
    } else {
      params.delete("startDate");
    }

    if (endDateDraft) {
      params.set("endDate", endDateDraft);
    } else {
      params.delete("endDate");
    }

    params.set("offset", "0");
    params.set("page", "1");
    updateUrl(params);
  };

  const clearDateFilters = () => {
    const params = new URLSearchParams(window.location.search);
    params.delete("startDate");
    params.delete("endDate");
    params.set("offset", "0");
    params.set("page", "1");
    updateUrl(params);
  };

  return (
    <Tabs
      value={currentStatus}
      onValueChange={handleTabChange}
      className="min-w-0"
    >
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:gap-4">
        <div className="-mx-1 overflow-x-auto px-1 pb-1 sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0">
          <TabsList className="inline-flex h-auto min-w-max gap-1 sm:gap-0">
            {tabStatuses.map((tabValue) => (
              <TabsTrigger
                className="min-h-12 whitespace-nowrap px-4 py-2 text-sm"
                key={tabValue}
                value={tabValue}
              >
                {tabValue === "all"
                  ? "All Orders"
                  : tabValue === "ready"
                  ? "Ready for pickup/ Delivering"
                  : tabValue.charAt(0).toUpperCase() + tabValue.slice(1)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="h-12 w-full sm:ml-auto sm:w-auto"
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[280px] space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Order Type</div>
              <Select
                value={fulfillmentTypeParam}
                onValueChange={(value) =>
                  updateOrderFilter("fulfillmentType", value)
                }
              >
                <SelectTrigger className="min-h-12 w-full">
                  <SelectValue placeholder="Select order type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Order Types</SelectItem>
                  <SelectItem value="pickup">Pickup</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Order Timing</div>
              <Select
                value={fulfillmentTimingTypeParam}
                onValueChange={(value) =>
                  updateOrderFilter("fulfillmentTimingType", value)
                }
              >
                <SelectTrigger className="min-h-12 w-full">
                  <SelectValue placeholder="Select order timing" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Timings</SelectItem>
                  <SelectItem value="ASAP">ASAP</SelectItem>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {showDateFilter && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">Date</div>
                  {(currentStartDate || currentEndDate) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="min-h-12 px-2 text-xs"
                      onClick={clearDateFilters}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <DatePickerField
                    label="From"
                    value={startDateDraft}
                    onChange={setStartDateDraft}
                  />
                  <DatePickerField
                    label="To"
                    value={endDateDraft}
                    onChange={setEndDateDraft}
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="min-h-12 w-full"
                  onClick={applyDateFilters}
                  disabled={
                    startDateDraft === currentStartDate &&
                    endDateDraft === currentEndDate
                  }
                >
                  Apply Date
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      <TabsContent
        key={currentStatus}
        value={currentStatus}
        className="mt-4"
      >
        <OrdersTable
          orders={orders}
          totalOrders={totalOrders}
          currentPage={currentPage}
          offset={offset}
          ordersPerPage={ordersPerPage}
          showPagination={showPagination}
          status={currentStatus}
          isDashboardTable={isDashboardTable}
        />
      </TabsContent>
    </Tabs>
  );
}
