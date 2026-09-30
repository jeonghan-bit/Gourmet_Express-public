"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronDown, ChevronUp, Loader2, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/formatDate";
import { getStatusBadge } from "@/lib/getStatusBadge";
import { saveReorderForCheckout } from "@/lib/checkoutStorage";
import { normalizeProductDisplayName } from "@/lib/utils";
import { isAdminRemoveOption } from "@/lib/adminCustomOption";

const ORDER_ITEM_IMAGE_FALLBACK = "/cuisine1_photo.webp";

function getOptionPriceTotal(selectedItemPrices?: unknown[]) {
  if (!Array.isArray(selectedItemPrices)) return 0;

  return selectedItemPrices.reduce<number>(
    (sum, price) => sum + Number(price || 0),
    0
  );
}

function OrderItemImage({ src, alt }: { src?: string | null; alt: string }) {
  const [imageSrc, setImageSrc] = useState(src || ORDER_ITEM_IMAGE_FALLBACK);

  useEffect(() => {
    setImageSrc(src || ORDER_ITEM_IMAGE_FALLBACK);
  }, [src]);

  return (
    <Image
      src={imageSrc}
      alt={alt}
      fill
      className="object-cover"
      onError={() => setImageSrc(ORDER_ITEM_IMAGE_FALLBACK)}
    />
  );
}

export function OrderCard({
  order,
  isAdminView = false,
}: {
  order: any;
  isAdminView?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const router = useRouter();

  const orderDetails =
    typeof order.orderDetails === "string"
      ? JSON.parse(order.orderDetails)
      : order.orderDetails;
  const orderItems = Array.isArray(orderDetails?.items)
    ? orderDetails.items
    : [];
  const deliveryCharge =
    order.fulfillmentType === "delivery"
      ? Number(orderDetails?.deliveryCharge || 0)
      : 0;
  const itemsSubtotal = Math.round(
    orderItems.reduce(
      (sum: number, item: any) =>
        sum + (Number(item.price) + Number(item.additionalPrice || 0)) * item.quantity,
      0
    ) * 100
  ) / 100;
  const taxableSubtotal = itemsSubtotal + deliveryCharge;
  const taxAmount = Math.round(taxableSubtotal * 0.13 * 100) / 100;
  const calculatedTotal = taxableSubtotal + taxAmount;

  const displayedItems = expanded ? orderItems : orderItems.slice(0, 2);
  const hasMoreItems = orderItems.length > 2;
  const additionalNote = orderDetails?.additionalNote || null;

  const handleReorder = async () => {
    setIsReordering(true);
    try {
      const response = await fetch(`/api/orders/${order.id}/reorder`, {
        method: "POST",
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "Unable to reorder these items.");
      }
      if (!Array.isArray(data?.cart)) {
        throw new Error("The reordered cart could not be loaded.");
      }

      saveReorderForCheckout(
        data.cart,
        typeof data.additionalNote === "string" ? data.additionalNote : ""
      );
      router.push("/checkout");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to reorder these items."
      );
      setIsReordering(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col">
              <div className="flex flex-wrap items-center gap-y-2">
                <span className="text-lg font-semibold">Order #{order.id}</span>
                <Badge className={`ml-3 ${getStatusBadge(order.status)}`}>
                  {order.status === "ready" &&
                  order.fulfillmentType === "delivery"
                    ? "delivering"
                    : order.status === "ready" &&
                      order.fulfillmentType === "pickup"
                    ? "ready for pickup"
                    : order.status}
                </Badge>
                {order.status !== "pending" && order.status !== "canceled" && (
                  <span className="ml-4 text-sm text-muted-foreground">
                    {order.fulfillmentTimingType === "SCHEDULED" &&
                    order.scheduledTime
                      ? `Scheduled for ${formatDate(
                          new Date(order.scheduledTime)
                        )}`
                      : order.fulfillmentTimingType === "SCHEDULED"
                      ? "Scheduled order"
                      : "ASAP order"}
                  </span>
                )}
                <Badge
                  className={`ml-2 ${
                    order.fulfillmentType === "delivery"
                      ? "bg-teal-100 text-teal-800 hover:bg-teal-200"
                      : "bg-orange-100 text-orange-800 hover:bg-orange-200"
                  }`}
                >
                  {order.fulfillmentType}
                </Badge>
              </div>
              {isAdminView &&
                order.status === "canceled" &&
                order.reasonForCancel && (
                  <div className="mt-1 text-sm">
                    <span className="text-muted-foreground">
                      Cancellation Reason:{" "}
                    </span>
                    <span>{order.reasonForCancel}</span>
                  </div>
                )}
              <span className="text-sm text-muted-foreground mt-1">
                {formatDate(new Date(order.createdAt))}
              </span>
            </div>
            {!isAdminView && (
              <Button
                type="button"
                size="sm"
                onClick={handleReorder}
                disabled={isReordering || orderItems.length === 0}
                className="shrink-0"
              >
                {isReordering ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="mr-2 h-4 w-4" />
                )}
                {isReordering ? "Loading" : "Reorder"}
              </Button>
            )}
          </div>

          {additionalNote && (
            <div className="mb-4 text-sm text-foreground">
              <span className="font-medium text-red-600">
                Additional Note:
              </span>{" "}
              <span className="font-medium text-red-600">{additionalNote}</span>
            </div>
          )}

          <div className="space-y-4">
            {displayedItems.map((item: any, index: number) => {
              const baseItemTotal = Number(item.price) * item.quantity;
              const optionItemTotal =
                Number(item.additionalPrice || 0) * item.quantity;
              return (
                <div
                  key={`${order.id}-${item.id}-${index}`}
                  className="flex items-start"
                >
                  <div className="h-16 w-16 relative rounded-md overflow-hidden mr-4 bg-muted flex-shrink-0">
                    <OrderItemImage src={item.image} alt={item.name} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">
                          {normalizeProductDisplayName(item.name)}
                        </div>
                        {item.specialRequest && (
                          <div className="text-sm text-red-500 mt-1">
                            Special Request: {item.specialRequest}
                          </div>
                        )}
                        {item.selectedOptions &&
                          item.selectedOptions.length > 0 && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {item.selectedOptions
                                .filter(
                                  (option: any) =>
                                    !isAdminRemoveOption(option)
                                )
                                .map(
                                  (option: any, optionIdx: number) => {
                                    const optionPriceTotal =
                                      getOptionPriceTotal(
                                        option.selectedItemPrices
                                      );

                                    return (
                                      <div key={optionIdx} className="ml-2">
                                        • {option.optionType}:{" "}
                                        {option.selectedItemLabels?.join(", ")}
                                        {optionPriceTotal > 0 && (
                                          <span className="text-primary ml-1">
                                            (+${optionPriceTotal.toFixed(2)})
                                          </span>
                                        )}
                                      </div>
                                    );
                                  }
                                )}
                            </div>
                          )}
                        <div className="text-sm text-muted-foreground mt-1">
                          Qty: {item.quantity}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="font-medium">
                          ${baseItemTotal.toFixed(2)}
                        </div>
                        {optionItemTotal > 0 && (
                          <div className="text-xs text-primary">
                            +${optionItemTotal.toFixed(2)} options
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {!expanded && hasMoreItems && (
              <div className="text-sm text-muted-foreground">
                + {orderItems.length - 2} more item
                {orderItems.length - 2 > 1 ? "s" : ""}
              </div>
            )}
          </div>

          {expanded && (
            <div className="mt-6 space-y-4">
              <Separator />
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Base Items</span>
                  <span>
                    $
                    {orderItems
                      .reduce(
                        (sum: number, item: any) =>
                          sum + item.price * item.quantity,
                        0
                      )
                      .toFixed(2)}
                  </span>
                </div>
                {orderItems.some(
                  (item: any) =>
                    item.additionalPrice && item.additionalPrice > 0
                ) && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Options</span>
                    <span className="text-primary">
                      +$
                      {orderItems
                        .reduce(
                          (sum: number, item: any) =>
                            sum + (item.additionalPrice || 0) * item.quantity,
                          0
                        )
                        .toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${itemsSubtotal.toFixed(2)}</span>
                </div>
                {deliveryCharge > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Delivery Charge
                    </span>
                    <span>${deliveryCharge.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax (13%)</span>
                  <span>${taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span>${calculatedTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex justify-between p-4 bg-muted/50 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="text-muted-foreground"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-1" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-1" />
              Show Details
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
