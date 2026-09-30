"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CustomerRow } from "./customer-row";
// import { CustomerCard } from "./customer-card";
import { ChevronLeft, ChevronRight, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { formatCanadianPhoneNumber } from "@/lib/utils";
import { formatDateOnly } from "@/lib/formatDate";
import { EditCustomerDialog } from "./dialogs/edit-customer-dialog";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZE_OPTIONS = [15, 25, 50, 100];

interface CustomerTableProps {
  customers: any[];
  offset: number;
  totalCustomers: number;
}

export function CustomerTable({
  customers,
  offset,
  totalCustomers,
}: CustomerTableProps) {
  let router = useRouter();
  const searchParams = useSearchParams();
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
  const requestedPageSize = Number(searchParams.get("pageSize") ?? "15");
  const customersPerPage = PAGE_SIZE_OPTIONS.includes(requestedPageSize)
    ? requestedPageSize
    : 15;
  const startIndex = customers.length > 0 ? offset + 1 : 0;
  const endIndex = Math.min(offset + customersPerPage, totalCustomers);
  // The API already returns exactly one page.
  const currentPageCustomers = customers;
  const customerListQuery = searchParams.toString();

  const getCustomerHistoryHref = (customerId: number | string) =>
    `/admin/customers/${customerId}/orders-history${
      customerListQuery ? `?${customerListQuery}` : ""
    }`;

  function prevPage() {
    const newOffset = Math.max(0, offset - customersPerPage);
    const params = new URLSearchParams(searchParams.toString());
    params.set("offset", newOffset.toString());
    window.history.pushState(null, "", `/admin/customers?${params.toString()}`);
  }

  function nextPage() {
    const newOffset = offset + customersPerPage;
    const params = new URLSearchParams(searchParams.toString());
    params.set("offset", newOffset.toString());
    window.history.pushState(null, "", `/admin/customers?${params.toString()}`);
  }

  function updateCustomersPerPage(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pageSize", value);
    params.set("offset", "0");
    params.set("page", "1");
    window.history.pushState(null, "", `/admin/customers?${params.toString()}`);
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case "inactive":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      default:
        return "bg-blue-100 text-blue-800 hover:bg-blue-200";
    }
  };

  return (
    <>
      {/* Table for desktop */}
      <div className="hidden rounded-md border sm:block">
        <Table className="hidden sm:table">
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Allergy</TableHead>
              <TableHead>Admin Notes</TableHead>
              <TableHead className="w-[96px] whitespace-nowrap text-right">
                Total Orders
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center py-6 text-muted-foreground"
                >
                  No customers found
                </TableCell>
              </TableRow>
            ) : (
              currentPageCustomers.map((customer, index) => (
                <CustomerRow
                  key={`${customer.phoneNumber || ""}-${
                    customer.user?.id || ""
                  }-${index}`}
                  customer={customer}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Text summary + Pagination (Desktop) */}
      <div className="hidden sm:flex justify-between items-center mt-4 px-4">
        <div className="text-sm text-muted-foreground">
          Showing{" "}
          <strong>
            {startIndex}-{endIndex}
          </strong>{" "}
          of <strong>{totalCustomers}</strong> customers
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows</span>
            <Select
              value={customersPerPage.toString()}
              onValueChange={updateCustomersPerPage}
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
            disabled={offset === 0}
            className="min-h-12"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Prev
          </Button>
          <Button
            onClick={nextPage}
            size="sm"
            variant="ghost"
            disabled={offset + customersPerPage >= totalCustomers}
            className="min-h-12"
          >
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Cards for mobile */}
      <div className="space-y-3 sm:hidden">
        {customers.length === 0 ? (
          <div className="rounded-md border py-6 text-center text-sm text-muted-foreground">
            No customers found
          </div>
        ) : (
          currentPageCustomers.map((customer, index) => (
            <div
              key={`${customer.phoneNumber || ""}-${
                customer.id || ""
              }-${index}`}
              className="rounded-md border p-3"
              onClick={() =>
                router.push(getCustomerHistoryHref(customer.id))
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{customer.name}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {formatCanadianPhoneNumber(customer.phoneNumber)}
                  </div>
                  {customer.email && (
                    <div className="truncate text-sm text-muted-foreground">
                      {customer.email}
                    </div>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className={`shrink-0 capitalize ${getStatusColor(
                    customer.status
                  )}`}
                >
                  {customer.status}
                </Badge>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Role</div>
                  <div className="capitalize">{customer.role}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Orders</div>
                  <div className="font-medium">{customer.totalOrders ?? 0}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Joined</div>
                  <div>{formatDateOnly(new Date(customer.createdAt))}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Last order</div>
                  <div>
                    {customer.lastOrderAt
                      ? formatDateOnly(new Date(customer.lastOrderAt))
                      : "None"}
                  </div>
                </div>
              </div>

              {(customer.allergyInfo || customer.notes) && (
                <div className="mt-3 space-y-1 border-t pt-3 text-sm">
                  {customer.allergyInfo && (
                    <div className="line-clamp-2">
                      <span className="text-muted-foreground">Allergy: </span>
                      {customer.allergyInfo}
                    </div>
                  )}
                  {customer.notes && (
                    <div className="line-clamp-2">
                      <span className="text-muted-foreground">
                        Admin Notes:{" "}
                      </span>
                      {customer.notes}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-3 flex items-center justify-between border-t pt-3">
                <div className="text-xs text-muted-foreground">
                  Tap for order history
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12"
                  onClick={(event) => {
                    event.stopPropagation();
                    setEditingCustomer(customer);
                  }}
                >
                  <Edit className="h-4 w-4" />
                  <span className="sr-only">Edit customer</span>
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination for mobile */}
      <div className="mt-4 flex flex-col items-center space-y-2 sm:hidden">
        <div className="text-sm text-muted-foreground">
          Showing{" "}
          <strong>
            {startIndex}-{endIndex}
          </strong>{" "}
          of <strong>{totalCustomers}</strong> customers
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows</span>
            <Select
              value={customersPerPage.toString()}
              onValueChange={updateCustomersPerPage}
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
            disabled={offset === 0}
            className="min-h-12"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Prev
          </Button>
          <Button
            onClick={nextPage}
            size="sm"
            variant="ghost"
            disabled={offset + customersPerPage >= totalCustomers}
            className="min-h-12"
          >
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      <EditCustomerDialog
        open={!!editingCustomer}
        setOpen={(open) => {
          if (!open) setEditingCustomer(null);
        }}
        customer={editingCustomer}
      />
    </>
  );
}
