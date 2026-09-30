"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { EditProductDialog } from "@/components/edit-product-dialog";
import { useState } from "react";
import logo from "@/public/logo.webp";
import { SelectProductWithCollection } from "@/lib/types";
import { useProductActions } from "@/hooks/useProductActions";
import { DeleteConfirmationDialog } from "./orders/delete-confirmation-dialog";
import { Button } from "@/components/ui/button";

export function Product({ product }: { product: SelectProductWithCollection }) {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const { editProduct } = useProductActions();

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

  async function toggleStatus(e: React.MouseEvent) {
    e.stopPropagation(); // Prevent opening edit dialog
    setShowStatusDialog(true);
  }

  const confirmStatusToggle = async () => {
    const newStatus = product.status === "active" ? "inactive" : "active";
    try {
      await editProduct.mutateAsync({
        productId: product.id,
        data: {
          status: newStatus,
        },
      });
      setShowStatusDialog(false);
    } catch (error) {
      console.error("Error updating product status:", error);
    }
  };

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/50"
        onClick={() => setEditModalOpen(true)}
      >
        <TableCell className="hidden sm:table-cell">
          <Image
            alt="Product image"
            className="aspect-square rounded-md object-cover"
            height="64"
            src={product.image_url || logo}
            width="64"
          />
        </TableCell>
        <TableCell className="font-medium">{product.name}</TableCell>
        <TableCell>
          <Button
            type="button"
            variant="ghost"
            className="h-12 w-32 p-0 active:scale-95"
            onClick={toggleStatus}
          >
            <Badge
              variant="outline"
              className={`w-24 justify-center capitalize ${getStatusColor(
                product.status
              )}`}
            >
              {product.status}
            </Badge>
          </Button>
        </TableCell>
        <TableCell className="hidden md:table-cell">{`$${product.price}`}</TableCell>
        <TableCell className="hidden md:table-cell">
          {product.collection?.name || "Uncategorized"}
        </TableCell>
      </TableRow>

      {editModalOpen && (
        <EditProductDialog
          open={editModalOpen}
          setOpen={setEditModalOpen}
          existingProduct={product}
        />
      )}

      <DeleteConfirmationDialog
        open={showStatusDialog}
        setOpen={setShowStatusDialog}
        onConfirm={confirmStatusToggle}
        title={`${product.status === "active" ? "Hide" : "Show"} Menu Item`}
        description={`Are you sure you want to ${product.status === "active" ? "hide" : "show"} "${product.name}"? This menu item will be ${product.status === "active" ? "hidden from" : "visible to"} customers.`}
      />
    </>
  );
}
