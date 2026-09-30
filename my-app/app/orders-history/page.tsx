"use client";

import { Card, CardContent } from "@/components/ui/card";
import { OrderCard } from "./order-card";
import { useSession } from "next-auth/react";
import { fetchOrdersByUserId } from "@/hooks/useOrderActions";
import { useQuery } from "@tanstack/react-query";
import LoadingAnimation from "@/components/LoadingAnimation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

export default function OrderHistoryPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [page, setPage] = useState(1);
  const {
    data: orders,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["orders", userId, page],
    queryFn: () => fetchOrdersByUserId(Number(userId), page),
    enabled: !!userId,
  });

  const sortedOrders = [...(orders?.orders || [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  if (isLoading) {
    return <LoadingAnimation className="h-screen" />;
  }

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Order History</h1>
          <p className="text-muted-foreground mt-1">
            View and track all your orders
          </p>
        </div>
      </div>
      {sortedOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <p className="text-muted-foreground text-center">
              You have no orders yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}

      {(orders?.totalPages ?? 0) > 1 && (
        <div className="mt-6 flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            Page {page} of {orders?.totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= (orders?.totalPages ?? 0)}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Grey dash line separator */}
      <div className="flex items-center justify-center my-6">
        <div className="text-gray-400 text-sm">
          ----- End of Order History -----
        </div>
      </div>
    </div>
  );
}
