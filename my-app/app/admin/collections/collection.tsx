"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { DeleteConfirmationDialog } from "../orders/delete-confirmation-dialog";
import { useState } from "react";
import type { SelectCollection } from "@/lib/types";

interface CollectionProps {
  collection: SelectCollection;
  displayOrder: number;
  onEditClick: () => void;
  onStatusToggle: () => void;
}

export function Collection({
  collection,
  displayOrder,
  onEditClick,
  onStatusToggle,
}: CollectionProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: collection.id });
  const [showStatusDialog, setShowStatusDialog] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
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

  const handleStatusToggle = () => {
    setShowStatusDialog(true);
  };

  const confirmStatusToggle = () => {
    onStatusToggle();
    setShowStatusDialog(false);
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className="grid grid-cols-12 gap-4 items-center py-3 px-4 bg-white border rounded-md mb-2 hover:bg-muted/50 transition-colors cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <div className="col-span-1 flex items-center">
          <div className="text-muted-foreground text-sm font-medium">
            {displayOrder}
          </div>
        </div>

        <div className="col-span-6 font-medium">{collection.name}</div>

        <div className="col-span-3">
          <Button
            type="button"
            variant="ghost"
            className="h-12 w-32 p-0 active:scale-95"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={handleStatusToggle}
          >
            <Badge
              variant="outline"
              className={`w-24 justify-center capitalize ${getStatusColor(
                collection.status
              )}`}
            >
              {collection.status}
            </Badge>
          </Button>
        </div>

        <div
          className="col-span-2 flex justify-end"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Button
            size="icon"
            variant="outline"
            className="h-12 w-12"
            onClick={onEditClick}
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit collection</span>
          </Button>
        </div>
      </div>

      <DeleteConfirmationDialog
        open={showStatusDialog}
        setOpen={setShowStatusDialog}
        onConfirm={confirmStatusToggle}
        title={`${
          collection.status === "active" ? "Disable" : "Enable"
        } Collection`}
        description={`Are you sure you want to ${
          collection.status === "active" ? "disable" : "enable"
        } "${collection.name}"? This will ${
          collection.status === "active" ? "hide" : "show"
        } all menu items in this collection for customers.`}
      />
    </>
  );
}
