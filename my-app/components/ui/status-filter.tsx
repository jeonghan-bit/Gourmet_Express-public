"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams, usePathname } from "next/navigation";

interface StatusFilterProps {
  currentStatus: string;
  statusOptions: { value: string; label: string }[];
  paramName?: string;
  onStatusChange?: (status: string) => void;
}

export function StatusFilter({
  currentStatus,
  statusOptions,
  paramName = "status",
  onStatusChange,
}: StatusFilterProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateStatus = (newStatus: string) => {
    if (newStatus === currentStatus) return;

    if (onStatusChange) {
      onStatusChange(newStatus);
      return;
    }

    const params = new URLSearchParams(searchParams.toString());

    if (newStatus === "all") {
      params.delete(paramName);
    } else {
      params.set(paramName, newStatus);
    }

    // Reset pagination when changing status
    params.set("offset", "0");
    params.set("page", "1");

    const queryString = params.toString();
    window.history.pushState(
      null,
      "",
      queryString ? `${pathname}?${queryString}` : pathname
    );
  };

  return (
    <Tabs value={currentStatus} className="w-full min-w-0">
      <div className="-mx-1 overflow-x-auto px-1 pb-1 sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0">
        <TabsList
          className="inline-flex h-auto min-w-max gap-1 sm:grid sm:w-full sm:min-w-0 sm:gap-0"
          style={{ gridTemplateColumns: `repeat(${statusOptions.length}, 1fr)` }}
        >
          {statusOptions.map((option) => (
            <TabsTrigger
              key={option.value}
              value={option.value}
              onClick={() => updateStatus(option.value)}
              className="min-h-12 whitespace-nowrap px-4 py-2 text-sm sm:flex-1"
            >
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
    </Tabs>
  );
}
