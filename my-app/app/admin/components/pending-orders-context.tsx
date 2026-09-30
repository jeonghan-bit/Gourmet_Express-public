import React, { createContext, useContext, useState } from "react";
import type { SelectOrderWithUser } from "@/lib/types";
import { PendingOrderDialog } from "./pending-order-dialog";

interface PendingOrdersContextType {
  addPendingOrder: (order: SelectOrderWithUser) => void;
  isPendingOrdersPaused: boolean;
  setPendingOrdersPaused: (paused: boolean) => void;
}

const PendingOrdersContext = createContext<
  PendingOrdersContextType | undefined
>(undefined);

export function PendingOrdersProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pendingOrders, setPendingOrders] = useState<SelectOrderWithUser[]>([]);
  const [isPendingOrdersPaused, setPendingOrdersPaused] = useState(false);

  const addPendingOrder = (order: SelectOrderWithUser) => {
    setPendingOrders((current) =>
      current.some((pendingOrder) => pendingOrder.id === order.id)
        ? current
        : [...current, order]
    );
  };

  const handleClose = (orderId: number) => {
    setPendingOrders((prev) => prev.filter((order) => order.id !== orderId));
  };

  return (
    <PendingOrdersContext.Provider
      value={{
        addPendingOrder,
        isPendingOrdersPaused,
        setPendingOrdersPaused,
      }}
    >
      {children}
      {!isPendingOrdersPaused &&
        pendingOrders.map((order) => (
          <PendingOrderDialog
            key={order.id}
            order={order}
            onClose={() => handleClose(order.id)}
          />
        ))}
    </PendingOrdersContext.Provider>
  );
}

export function usePendingOrders() {
  const context = useContext(PendingOrdersContext);
  if (context === undefined) {
    throw new Error(
      "usePendingOrders must be used within a PendingOrdersProvider"
    );
  }
  return context;
}
