import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import type { SelectOrderWithUser } from "@/lib/types";
import { getStatusBadge } from "@/lib/getStatusBadge";
import { formatDate } from "@/lib/formatDate";
import {
  cn,
  formatCanadianPhoneNumber,
  normalizeProductDisplayName,
} from "@/lib/utils";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useState } from "react";
import PrintPreviewDialog from "@/components/PrintPreviewDialog";

interface OrderDetailsProps {
  order: SelectOrderWithUser;
}

const ORDER_ITEM_IMAGE_FALLBACK = "/cuisine1_photo.webp";

function OrderItemImage({
  src,
  alt,
  size,
}: {
  src?: string | null;
  alt: string;
  size: number;
}) {
  const [imageSrc, setImageSrc] = useState(src || ORDER_ITEM_IMAGE_FALLBACK);

  useEffect(() => {
    setImageSrc(src || ORDER_ITEM_IMAGE_FALLBACK);
  }, [src]);

  return (
    <div
      className="relative flex-shrink-0 overflow-hidden rounded-md"
      style={{ height: size, width: size }}
    >
      <Image
        src={imageSrc}
        alt={alt}
        fill
        className="object-cover"
        sizes={`${size}px`}
        onError={() => setImageSrc(ORDER_ITEM_IMAGE_FALLBACK)}
      />
    </div>
  );
}

export function OrderDetails({ order }: OrderDetailsProps) {
  const router = useRouter();
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [showCashDialog, setShowCashDialog] = useState(false);
  const [applyCashDiscount, setApplyCashDiscount] = useState(false);

  // Parse the order details JSON
  const orderDetails =
    typeof order.orderDetails === "string"
      ? JSON.parse(order.orderDetails)
      : order.orderDetails;

  const handleCheckOrderHistory = () => {
    if (order.user?.id) {
      router.push(`/admin/customers/${order.user.id}/orders-history`);
    }
  };

  /* Cash discount popup disabled.
  const itemsList = Array.isArray(orderDetails?.items)
    ? orderDetails.items
    : [];

  const rawSubtotal = itemsList.reduce(
    (sum: number, item: any) =>
      sum + (item.price + (item.additionalPrice || 0)) * item.quantity,
    0
  );

  const subtotal = Math.round(rawSubtotal * 100) / 100;
  const isCashDiscountAvailable = subtotal > 40;
  */

  const handlePrintClick = () => {
    /* Cash discount popup disabled.
    if (isCashDiscountAvailable) {
      setShowCashDialog(true);
    } else {
      setApplyCashDiscount(false);
      setShowPrintDialog(true);
    }
    */
    setApplyCashDiscount(false);
    setShowPrintDialog(true);
  };

  const handleCashConfirm = (payingCash: boolean) => {
    setApplyCashDiscount(payingCash);
    setShowCashDialog(false);
    setShowPrintDialog(true);
  };

  // Extract delivery address
  const deliveryAddress = orderDetails?.deliveryAddress || null;
  const deliveryAddressDetails = orderDetails?.deliveryAddressDetails || null;
  const additionalNote = orderDetails?.additionalNote || null;
  const allergyInfo = orderDetails?.allergyInfo || order.user?.allergyInfo;
  const deliveryCharge =
    order.fulfillmentType === "delivery"
      ? Number(orderDetails?.deliveryCharge || 0)
      : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Order Info + Customer Info */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Order Information Card */}
        <Card className="overflow-hidden">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex flex-wrap items-center gap-2 text-base sm:text-lg">
                  Order #{order.id}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrintClick}
                    className="min-h-12 flex items-center gap-1"
                  >
                    <Printer className="h-4 w-4" />
                    Print
                  </Button>
                </CardTitle>
                <CardDescription>
                  Basic details about this order
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-0 text-sm sm:p-6 sm:pt-0 sm:text-base">
            <div className="flex justify-between gap-3">
              <span className="font-medium">Order ID:</span>
              <span>{order.id}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="font-medium">Created At:</span>
              <span className="min-w-0 text-right">
                {formatDate(new Date(order.createdAt))}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="font-medium">Updated At:</span>
              <span className="min-w-0 text-right">
                {formatDate(new Date(order.updatedAt))}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="font-medium">Order Type:</span>
              <span
                className={cn(
                  "capitalize",
                  order.fulfillmentType !== "dineIn" &&
                    "font-semibold text-red-600"
                )}
              >
                {order.fulfillmentType}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="font-medium">Timing Type:</span>
              <span>{order.fulfillmentTimingType}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="font-medium">Scheduled Time / ETA:</span>
              <span className="min-w-0 text-right">
                {order.scheduledTime
                  ? formatDate(new Date(order.scheduledTime))
                  : "Not scheduled"}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="font-medium">Status:</span>
              <Badge variant="outline" className={getStatusBadge(order.status)}>
                {order.status === "ready" &&
                order.fulfillmentType === "delivery"
                  ? "delivering"
                  : order.status === "ready" &&
                    order.fulfillmentType === "pickup"
                  ? "ready for pickup"
                  : order.status}
              </Badge>
            </div>
            {order.status === "canceled" && order.reasonForCancel && (
              <div className="flex justify-between mt-2">
                <span className="font-medium">Cancel Reason:</span>
                <span className="text-muted-foreground">
                  {order.reasonForCancel}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Information Card */}
        <Card className="overflow-hidden">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">
              Customer Information
            </CardTitle>
            <CardDescription
              className="cursor-pointer hover:text-primary hover:underline"
              onClick={handleCheckOrderHistory}
            >
              Check Order History
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-0 text-sm sm:p-6 sm:pt-0 sm:text-base">
            <div className="flex justify-between gap-3">
              <span className="font-medium">Name:</span>
              <span className="min-w-0 text-right">{order.user?.name}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="font-medium">Phone Number:</span>
              <span className="min-w-0 text-right">
                {formatCanadianPhoneNumber(order.user?.phoneNumber)}
              </span>
            </div>
            {deliveryAddress && order.fulfillmentType === "delivery" && (
              <div className="flex justify-between items-start gap-3">
                <span className="font-medium">Delivery Address:</span>
                <span className="min-w-0 text-right font-semibold text-red-600">
                  {deliveryAddress}
                </span>
              </div>
            )}
            {deliveryAddressDetails?.addressType === "building" && (
              <>
                <div className="flex justify-between items-start gap-3">
                  <span className="font-medium">Apartment/Unit:</span>
                  <span className="min-w-0 text-right font-semibold text-red-600">
                    {deliveryAddressDetails.unitNumber}
                  </span>
                </div>
                <div className="flex justify-between items-start gap-3">
                  <span className="font-medium">Building Access:</span>
                  <span className="min-w-0 text-right font-semibold text-red-600">
                    {deliveryAddressDetails.accessMethod === "buzzer"
                      ? `Buzzer ${deliveryAddressDetails.buzzerCode}`
                      : deliveryAddressDetails.accessMethod === "call_on_arrival"
                        ? "Call on arrival"
                        : "No buzzer required"}
                  </span>
                </div>
              </>
            )}
            {deliveryAddressDetails?.deliveryInstructions && (
              <div className="flex justify-between items-start gap-3">
                <span className="font-medium">Delivery Instructions:</span>
                <span className="min-w-0 text-right text-red-600">
                  {deliveryAddressDetails.deliveryInstructions}
                </span>
              </div>
            )}
            {allergyInfo && (
              <div className="flex justify-between items-start">
                <span className="font-medium">Allergy Information:</span>
                <span className="text-right text-red-600">
                  {allergyInfo}
                </span>
              </div>
            )}
            {additionalNote && (
              <div className="flex justify-between items-start gap-3">
                <span className="font-medium">Additional Note:</span>
                <span className="min-w-0 text-right text-red-600">
                  {additionalNote}
                </span>
              </div>
            )}
            {order.user?.notes && (
              <div className="flex justify-between items-start">
                <span className="font-medium">Admin Notes:</span>
                <span className="text-right text-muted-foreground">
                  {order.user?.notes}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Items Table */}
      <Card className="overflow-hidden">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Order Items</CardTitle>
          <CardDescription>Items included in this order</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          {(() => {
            // Define the shape of each item
            interface OrderItem {
              id: string;
              name: string;
              price: number;
              quantity: number;
              specialRequest: string | null;
              selectedOptions?: any[];
              additionalPrice?: number;
              optionType?: any[];
              image?: string;
            }

            // Cast & guard the parsed items array
            const itemsList: OrderItem[] = Array.isArray(orderDetails?.items)
              ? (orderDetails.items as OrderItem[])
              : [];

            // Compute a typed subtotal
            const subtotal: number = itemsList.reduce(
              (sum: number, item: OrderItem) =>
                sum +
                (item.price + (item.additionalPrice || 0)) * item.quantity,
              0
            );

            return (
              <>
                <div className="space-y-3 sm:hidden">
                  {itemsList.map((item: OrderItem, idx: number) => {
                    const selectedOptionsToDisplay = (
                      item.selectedOptions || []
                    ).filter(
                      (option) =>
                        option.selectedItems?.length > 0 ||
                        option.selectedItemLabels?.length > 0
                    );
                    const itemTotal =
                      (item.price + (item.additionalPrice || 0)) *
                      item.quantity;

                    return (
                      <div key={idx} className="rounded-md border p-3">
                        <div className="flex gap-3">
                          <div className="flex h-14 w-10 flex-shrink-0 flex-col items-center justify-center rounded-md bg-muted text-center">
                            <span className="text-[10px] uppercase text-muted-foreground">
                              Qty
                            </span>
                            <span className="font-semibold">
                              {item.quantity}
                            </span>
                          </div>
                          <OrderItemImage
                            src={item.image}
                            alt={item.name}
                            size={56}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-bold leading-snug">
                              {normalizeProductDisplayName(item.name)}
                            </div>
                            {item.specialRequest && (
                              <div className="mt-1 text-sm text-red-500">
                                Special Request: {item.specialRequest}
                              </div>
                            )}
                          </div>
                        </div>

                        {selectedOptionsToDisplay.length > 0 && (
                          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                            {selectedOptionsToDisplay.map(
                              (option, optionIdx) => {
                                const optionAdditionalPrice =
                                  option.selectedItemPrices?.reduce(
                                    (sum: number, price: string) =>
                                      sum + parseFloat(price),
                                    0
                                  ) || 0;
                                const hasAdditionalPrice =
                                  optionAdditionalPrice !== 0;

                                return (
                                  <div key={optionIdx}>
                                    <div>{option.optionType}:</div>
                                    <div
                                      className={`font-medium ${
                                        hasAdditionalPrice
                                          ? "text-primary"
                                          : "text-foreground"
                                      }`}
                                    >
                                      {option.selectedItemLabels?.join(", ")}
                                      {hasAdditionalPrice && (
                                        <span className="ml-1 font-normal text-muted-foreground">
                                          (+${optionAdditionalPrice.toFixed(2)})
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              }
                            )}
                          </div>
                        )}

                        <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3 text-sm">
                          <div>
                            <div className="text-xs text-muted-foreground">
                              Price
                            </div>
                            <div className="font-medium">
                              ${item.price.toFixed(2)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">
                              Total
                            </div>
                            <div className="font-medium">
                              ${itemTotal.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="hidden overflow-x-auto sm:block">
                  <Table className="min-w-[640px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead>Item Name</TableHead>
                        <TableHead className="text-right">Base Price</TableHead>
                        <TableHead className="text-right">Options</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemsList.map((item: OrderItem, idx: number) => {
                        const selectedOptionsToDisplay = (
                          item.selectedOptions || []
                        ).filter(
                          (option) =>
                            option.selectedItems?.length > 0 ||
                            option.selectedItemLabels?.length > 0
                        );
                        const itemTotal =
                          (item.price + (item.additionalPrice || 0)) *
                          item.quantity;
                        return (
                          <TableRow key={idx}>
                            <TableCell className="text-right">
                              {item.quantity}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <OrderItemImage
                                  src={item.image}
                                  alt={item.name}
                                  size={48}
                                />
                                <div>
                                  <div className="font-bold">
                                    {normalizeProductDisplayName(item.name)}
                                  </div>
                                  {item.specialRequest && (
                                    <div className="mt-1 text-sm text-red-500">
                                      Special Request: {item.specialRequest}
                                    </div>
                                  )}
                                  {selectedOptionsToDisplay.length > 0 && (
                                    <div className="mt-1 text-sm text-muted-foreground">
                                      {selectedOptionsToDisplay.map(
                                        (option, optionIdx) => {
                                          const optionAdditionalPrice =
                                            option.selectedItemPrices?.reduce(
                                              (sum: number, price: string) =>
                                                sum + parseFloat(price),
                                              0
                                            ) || 0;
                                          const hasAdditionalPrice =
                                            optionAdditionalPrice !== 0;

                                          return (
                                            <div
                                              key={optionIdx}
                                              className="ml-2 space-y-1"
                                            >
                                              <div className="text-sm text-muted-foreground">
                                                • {option.optionType}:
                                              </div>
                                              <div className="pl-4 text-left">
                                                <span
                                                  className={`text-sm font-medium ${
                                                    hasAdditionalPrice
                                                      ? "text-primary"
                                                      : "text-foreground"
                                                  }`}
                                                >
                                                  {option.selectedItemLabels?.join(
                                                    ", "
                                                  )}
                                                  {hasAdditionalPrice && (
                                                    <span className="ml-1 font-normal text-muted-foreground">
                                                      (+$
                                                      {optionAdditionalPrice.toFixed(
                                                        2
                                                      )}
                                                      )
                                                    </span>
                                                  )}
                                                </span>
                                              </div>
                                            </div>
                                          );
                                        }
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              ${item.price.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.additionalPrice &&
                              item.additionalPrice > 0 ? (
                                <span className="text-primary">
                                  +${item.additionalPrice.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              ${itemTotal.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Summary block */}
                <div className="mt-4 space-y-2">
                  {(() => {
                    const roundedSubtotal = Math.round(subtotal * 100) / 100; // Round subtotal to 2 decimals
                    const taxableSubtotal = roundedSubtotal + deliveryCharge;
                    const tax = Math.round(taxableSubtotal * 0.13 * 100) / 100;
                    const total = taxableSubtotal + tax;

                    return (
                      <>
                        <div className="flex justify-between">
                          <span>Subtotal</span>
                          <span>${roundedSubtotal.toFixed(2)}</span>
                        </div>
                        {deliveryCharge > 0 && (
                          <div className="flex justify-between">
                            <span>Delivery Charge</span>
                            <span>${deliveryCharge.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Tax</span>
                          <span>${tax.toFixed(2)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold">
                          <span>Total</span>
                          <span>${total.toFixed(2)}</span>
                        </div>

                        {/* Cash Discount Section - Only show if subtotal > $40
                        {roundedSubtotal > 40 && (
                          <>
                            <Separator />
                            <div className="bg-green-50 p-3 rounded-md border border-green-200">
                              <div className="flex justify-between text-green-700 font-medium">
                                <span>Paying Cash (10% off):</span>
                                <span>${(total * 0.9).toFixed(2)}</span>
                              </div>
                              <div className="text-xs text-green-600 mt-1">
                                Save ${(total * 0.1).toFixed(2)} with cash
                                payment
                              </div>
                            </div>
                          </>
                        )}
                        */}
                      </>
                    );
                  })()}
                </div>
              </>
            );
          })()}
        </CardContent>
      </Card>

      {/* Cash Discount Dialog */}
      <AlertDialog open={showCashDialog} onOpenChange={setShowCashDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Payment Method</AlertDialogTitle>
            <AlertDialogDescription>
              This order qualifies for a 10% cash discount. Is the customer
              paying with cash?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="min-h-12"
              onClick={() => handleCashConfirm(false)}
            >
              No, other payment
            </AlertDialogCancel>
            <AlertDialogAction
              className="min-h-12"
              onClick={() => handleCashConfirm(true)}
            >
              Yes, paying cash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Print Preview Dialog */}
      <PrintPreviewDialog
        open={showPrintDialog}
        onClose={() => setShowPrintDialog(false)}
        order={order}
        applyCashDiscount={applyCashDiscount}
      />
    </div>
  );
}
