"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ListFilter, Plus } from "lucide-react";
import { CustomerTable } from "./customer-table";
import { AddCustomerDialog } from "./dialogs/add-customer-dialog";
import { useSearchParams } from "next/navigation";
import LoadingAnimation from "@/components/LoadingAnimation";
import { useCustomers } from "@/hooks/useUserActions";
import { StatusFilter } from "@/components/ui/status-filter";
import { ADMIN_SEARCH_EVENT } from "../search";

type CustomerSort = "recentOrders" | "recentlyJoined" | "phoneNumber";

const CUSTOMER_SORTS: CustomerSort[] = [
  "recentOrders",
  "recentlyJoined",
  "phoneNumber",
];

const CUSTOMER_STATUSES = ["all", "active", "inactive", "admin"];

const getBooleanParam = (
  searchParams: ReturnType<typeof useSearchParams>,
  key: string
) => searchParams.get(key) === "1";

// Component that uses useSearchParams
function CustomersContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [viewOptionsOpen, setViewOptionsOpen] = useState(false);
  const offset = Number(searchParams.get("offset") ?? 0);
  const requestedPageSize = Number(searchParams.get("pageSize") ?? 15);
  const pageSize = [15, 25, 50, 100].includes(requestedPageSize)
    ? requestedPageSize
    : 15;
  const statusParam = searchParams.get("status") ?? "all";
  const statusFilter = CUSTOMER_STATUSES.includes(statusParam)
    ? statusParam
    : "all";
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const sortParam = searchParams.get("sort");
  const sortBy: CustomerSort =
    sortParam && CUSTOMER_SORTS.includes(sortParam as CustomerSort)
      ? (sortParam as CustomerSort)
      : "recentOrders";
  const showRepeatedCustomers = getBooleanParam(searchParams, "repeated");
  const repeatedOrderAmount = searchParams.get("repeatedOrdersAbove") ?? "1";
  const showNewCustomers = getBooleanParam(searchParams, "newCustomers");
  const showCustomersWithEmail = getBooleanParam(searchParams, "hasEmail");
  const showNoShowCustomers = getBooleanParam(searchParams, "noShow");
  const [draftSortBy, setDraftSortBy] = useState<CustomerSort>(sortBy);
  const [draftRepeatedCustomers, setDraftRepeatedCustomers] = useState(
    showRepeatedCustomers
  );
  const [draftRepeatedOrderAmount, setDraftRepeatedOrderAmount] =
    useState(repeatedOrderAmount);
  const [draftNewCustomers, setDraftNewCustomers] = useState(showNewCustomers);
  const [draftCustomersWithEmail, setDraftCustomersWithEmail] = useState(
    showCustomersWithEmail
  );
  const [draftNoShowCustomers, setDraftNoShowCustomers] =
    useState(showNoShowCustomers);

  useEffect(() => {
    setDraftSortBy(sortBy);
    setDraftRepeatedCustomers(showRepeatedCustomers);
    setDraftRepeatedOrderAmount(repeatedOrderAmount);
    setDraftNewCustomers(showNewCustomers);
    setDraftCustomersWithEmail(showCustomersWithEmail);
    setDraftNoShowCustomers(showNoShowCustomers);
  }, [
    repeatedOrderAmount,
    showCustomersWithEmail,
    showNewCustomers,
    showNoShowCustomers,
    showRepeatedCustomers,
    sortBy,
  ]);
  useEffect(() => {
    const handleSearchChange = (event: Event) => {
      const { pathname, value } = (event as CustomEvent).detail ?? {};
      if (
        typeof pathname === "string" &&
        pathname.includes("/admin/customers")
      ) {
        setQuery(typeof value === "string" ? value.toLowerCase() : "");
        const params = new URLSearchParams(window.location.search);
        params.set("offset", "0");
        params.set("page", "1");
        window.history.pushState(
          null,
          "",
          `/admin/customers?${params.toString()}`
        );
      }
    };

    window.addEventListener(ADMIN_SEARCH_EVENT, handleSearchChange);
    return () =>
      window.removeEventListener(ADMIN_SEARCH_EVENT, handleSearchChange);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(query), 250);
    return () => window.clearTimeout(timeout);
  }, [query]);

  const updateCustomerParams = (
    updates: Record<string, string | number | boolean | null | undefined>
  ) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === false) {
        params.delete(key);
      } else if (value === true) {
        params.set(key, "1");
      } else {
        params.set(key, String(value));
      }
    });

    params.set("offset", "0");
    params.set("page", "1");
    window.history.pushState(null, "", `/admin/customers?${params.toString()}`);
  };

  const applyViewOptions = () => {
    updateCustomerParams({
      sort: draftSortBy === "recentOrders" ? null : draftSortBy,
      repeated: draftRepeatedCustomers,
      repeatedOrdersAbove: draftRepeatedCustomers
        ? draftRepeatedOrderAmount
        : null,
      newCustomers: draftNewCustomers,
      hasEmail: draftCustomersWithEmail,
      noShow: draftNoShowCustomers,
    });
    setViewOptionsOpen(false);
  };

  const clearViewOptions = () => {
    setDraftSortBy("recentOrders");
    setDraftRepeatedCustomers(false);
    setDraftRepeatedOrderAmount("1");
    setDraftNewCustomers(false);
    setDraftCustomersWithEmail(false);
    setDraftNoShowCustomers(false);
    updateCustomerParams({
      sort: null,
      repeated: false,
      repeatedOrdersAbove: null,
      newCustomers: false,
      hasEmail: false,
      noShow: false,
    });
    setViewOptionsOpen(false);
  };

  const repeatedOrderThreshold = Math.max(
    0,
    Number.parseInt(repeatedOrderAmount, 10) || 0
  );
  const draftRepeatedOrderThreshold = Math.max(
    0,
    Number.parseInt(draftRepeatedOrderAmount, 10) || 0
  );
  const hasDraftViewOptions =
    draftSortBy !== "recentOrders" ||
    draftRepeatedCustomers ||
    draftNewCustomers ||
    draftCustomersWithEmail ||
    draftNoShowCustomers;
  const viewOptionsChanged =
    draftSortBy !== sortBy ||
    draftRepeatedCustomers !== showRepeatedCustomers ||
    (draftRepeatedCustomers &&
      draftRepeatedOrderThreshold !== repeatedOrderThreshold) ||
    draftNewCustomers !== showNewCustomers ||
    draftCustomersWithEmail !== showCustomersWithEmail ||
    draftNoShowCustomers !== showNoShowCustomers;
  const { data, isLoading, error } = useCustomers({
    q: debouncedQuery,
    offset,
    limit: pageSize,
    status: statusFilter,
    sort: sortBy,
    repeated: showRepeatedCustomers,
    repeatedOrdersAbove: repeatedOrderThreshold,
    newCustomers: showNewCustomers,
    hasEmail: showCustomersWithEmail,
    noShow: showNoShowCustomers,
  });
  const customers = data?.users ?? [];
  const totalCustomers = data?.totalUsers ?? 0;
  const activeViewOptionCount =
    (sortBy !== "recentOrders" ? 1 : 0) +
    (showRepeatedCustomers ? 1 : 0) +
    (showNewCustomers ? 1 : 0) +
    (showCustomersWithEmail ? 1 : 0) +
    (showNoShowCustomers ? 1 : 0);

  const statusOptions = [
    { value: "all", label: "All" },
    { value: "active", label: "Active Customers" },
    { value: "inactive", label: "Inactive Customers" },
    { value: "admin", label: "Admins" },
  ];

  if (isLoading) {
    return <LoadingAnimation className="h-screen" />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-500">
          Error: {error.message}
          <Button className="ml-4" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-full overflow-hidden px-2 py-4 sm:container sm:py-6">
      <div className="mb-4 flex items-center justify-between sm:mb-6">
        <h1 className="text-3xl font-bold sm:text-3xl">Customers</h1>
        <div className="flex space-x-2">
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="min-h-12"
          >
            <Plus className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">Add Customer</span>
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle>Customer Management</CardTitle>
          <CardDescription className="line-clamp-2">
            View and manage your customers, add admin notes, and assign tags.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex-1">
              <StatusFilter
                currentStatus={statusFilter}
                statusOptions={statusOptions}
                onStatusChange={(nextStatus) =>
                  updateCustomerParams({
                    status: nextStatus === "all" ? null : nextStatus,
                  })
                }
              />
            </div>
            <Popover
              open={viewOptionsOpen}
              onOpenChange={(open) => {
                setViewOptionsOpen(open);
                setDraftSortBy(sortBy);
                setDraftRepeatedCustomers(showRepeatedCustomers);
                setDraftRepeatedOrderAmount(repeatedOrderAmount);
                setDraftNewCustomers(showNewCustomers);
                setDraftCustomersWithEmail(showCustomersWithEmail);
                setDraftNoShowCustomers(showNoShowCustomers);
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-12 w-full lg:w-auto"
                >
                  <ListFilter className="h-4 w-4" />
                  View Options
                  {activeViewOptionCount > 0 && (
                    <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground">
                      {activeViewOptionCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[320px] space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Sort by</Label>
                  <Select
                    value={draftSortBy}
                    onValueChange={(value) =>
                      setDraftSortBy(value as CustomerSort)
                    }
                  >
                    <SelectTrigger className="h-12 w-full">
                      <SelectValue placeholder="Sort customers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recentOrders">
                        Recently ordered customers
                      </SelectItem>
                      <SelectItem value="recentlyJoined">
                        Recently joined customers
                      </SelectItem>
                      <SelectItem value="phoneNumber">Phone number</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-medium">Filter by</div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="repeated-customers"
                      checked={draftRepeatedCustomers}
                      onCheckedChange={(checked) =>
                        setDraftRepeatedCustomers(Boolean(checked))
                      }
                    />
                    <Label htmlFor="repeated-customers" className="text-sm">
                      Repeated customers
                    </Label>
                  </div>
                  <div className="flex items-center gap-2 pl-6">
                    <span className="text-sm text-muted-foreground">
                      Order count &gt;
                    </span>
                    <Input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={draftRepeatedOrderAmount}
                      onChange={(event) =>
                        setDraftRepeatedOrderAmount(event.target.value)
                      }
                      disabled={!draftRepeatedCustomers}
                      className="h-12 w-20"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="new-customers"
                      checked={draftNewCustomers}
                      onCheckedChange={(checked) =>
                        setDraftNewCustomers(Boolean(checked))
                      }
                    />
                    <Label htmlFor="new-customers" className="text-sm">
                      Never ordered customers
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="has-email"
                      checked={draftCustomersWithEmail}
                      onCheckedChange={(checked) =>
                        setDraftCustomersWithEmail(Boolean(checked))
                      }
                    />
                    <Label htmlFor="has-email" className="text-sm">
                      Has email
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="no-show-customers"
                      checked={draftNoShowCustomers}
                      onCheckedChange={(checked) =>
                        setDraftNoShowCustomers(Boolean(checked))
                      }
                    />
                    <Label htmlFor="no-show-customers" className="text-sm">
                      Cancellation reason: No show
                    </Label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-12 flex-1"
                    onClick={clearViewOptions}
                    disabled={
                      activeViewOptionCount === 0 && !hasDraftViewOptions
                    }
                  >
                    Clear
                  </Button>
                  <Button
                    type="button"
                    className="min-h-12 flex-1"
                    onClick={applyViewOptions}
                    disabled={!viewOptionsChanged}
                  >
                    Apply
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <CustomerTable
            customers={customers}
            offset={offset}
            totalCustomers={totalCustomers}
          />
        </CardContent>
      </Card>

      <AddCustomerDialog open={isAddDialogOpen} setOpen={setIsAddDialogOpen} />
    </div>
  );
}

// Main page component with Suspense boundary
export default function CustomersPage() {
  return (
    <Suspense fallback={<LoadingAnimation className="h-screen" />}>
      <CustomersContent />
    </Suspense>
  );
}
