"use client";

import { useState } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { EditCustomerDialog } from "./dialogs/edit-customer-dialog";
import { useRouter, useSearchParams } from "next/navigation";
import { useUserActions } from "@/hooks/useUserActions";
import { DeleteConfirmationDialog } from "../orders/delete-confirmation-dialog";
import { formatCanadianPhoneNumber } from "@/lib/utils";
import { formatDateOnly } from "@/lib/formatDate";

interface CustomerRowProps {
  customer: any;
  // onAddMemo: (phoneNumber: string, memo: string) => void;
  // onUpdateTags: (phoneNumber: string, tags: string[]) => void;
  //   onDeleteCustomer: (phoneNumber: string) => void;
}

export function CustomerRow({
  customer,
}: // onAddMemo,
// onUpdateTags,
// onDeleteCustomer,
CustomerRowProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { updateUserStatus } = useUserActions();
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<
    "active" | "inactive" | null
  >(null);

  const handleRowClick = () => {
    const queryString = searchParams.toString();
    router.push(
      `/admin/customers/${customer.id}/orders-history${
        queryString ? `?${queryString}` : ""
      }`
    );
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditDialogOpen(true);
  };

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

  async function handleStatusClick(e: React.MouseEvent) {
    e.stopPropagation();
    const newStatus = customer.status === "active" ? "inactive" : "active";
    setPendingStatus(newStatus as "active" | "inactive");
    setShowStatusDialog(true);
  }

  const confirmStatusToggle = async () => {
    if (pendingStatus) {
      await updateUserStatus.mutate({ id: customer.id, status: pendingStatus });
    }
    setShowStatusDialog(false);
    setPendingStatus(null);
  };

  return (
    <>
      <TableRow
        className="hover:bg-muted/50 cursor-pointer"
        onClick={handleRowClick}
      >
        <TableCell>
          <div className="font-medium">{customer.name}</div>
        </TableCell>
        <TableCell>
          <div>{formatCanadianPhoneNumber(customer.phoneNumber)}</div>
          <div className="text-sm text-muted-foreground">
            {customer.email || ""}
          </div>
        </TableCell>
        <TableCell>
          <div className="font-medium">{customer.role}</div>
        </TableCell>
        <TableCell>
          <Button
            type="button"
            variant="ghost"
            className="h-12 w-32 p-0 active:scale-95"
            onClick={handleStatusClick}
          >
            <Badge
              variant="outline"
              className={`w-24 justify-center capitalize ${getStatusColor(
                customer.status
              )}`}
            >
              {customer.status}
            </Badge>
          </Button>
        </TableCell>
        <TableCell>
          <div className="font-medium">
            {formatDateOnly(new Date(customer.createdAt))}
          </div>
        </TableCell>
        <TableCell>
          <div className="max-w-[200px]">
            {customer.allergyInfo ? (
              <div className="text-sm">{customer.allergyInfo}</div>
            ) : (
              <span className="text-sm text-muted-foreground">
                No allergies
              </span>
            )}
          </div>
        </TableCell>
        <TableCell>
          <div className="max-w-[200px]">
            {customer.notes ? (
              <div className="text-sm">{customer.notes}</div>
            ) : (
              <span className="text-sm text-muted-foreground">
                No admin notes
              </span>
            )}
          </div>
        </TableCell>
        <TableCell className="w-[96px] whitespace-nowrap text-right">
          <div className="text-sm font-medium">{customer.totalOrders ?? 0}</div>
        </TableCell>
        <TableCell className="text-right">
          <Button
            variant="ghost"
            size="sm"
            className="h-12 w-12"
            onClick={handleEditClick}
            aria-label={`Edit customer ${customer.name}`}
          >
            <Edit className="h-4 w-4" />
          </Button>
        </TableCell>
      </TableRow>
      <EditCustomerDialog
        open={isEditDialogOpen}
        setOpen={setIsEditDialogOpen}
        customer={customer}
      />
      <DeleteConfirmationDialog
        open={showStatusDialog}
        setOpen={setShowStatusDialog}
        onConfirm={confirmStatusToggle}
        title={`${customer.status === "active" ? "Disable" : "Enable"} User`}
        description={`Are you sure you want to ${
          customer.status === "active" ? "disable" : "enable"
        } "${customer.name}"? This will ${
          customer.status === "active" ? "prevent" : "allow"
        } this user from accessing the system.`}
      />
    </>
  );
}
