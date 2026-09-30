// app/api/orders/route.ts
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { db, orders, productOptions, users } from "@/lib/db";
import { updateOrderSchema } from "@/lib/schemas";
import { validateVerifiedDeliveryAddress } from "@/lib/deliveryAddress.server";
import { eq, inArray, sql } from "drizzle-orm";
import { getOrders } from "@/lib/orders";
import { requireAdmin, requireAuthenticatedUser } from "@/lib/adminAuth";
import { parseTorontoDateFilter } from "@/lib/dateFilters";
import {
  isAdminRemoveOption,
  normalizeAdminCustomOptions,
} from "@/lib/adminCustomOption";

const HST_RATE = 0.13;
const DELIVERY_MINIMUM_SUBTOTAL = 30;
const roundMoney = (value: number) => Math.round(value * 100) / 100;
const NO_STORE_HEADERS = { "Cache-Control": "no-store" };
const ORDER_STATUSES = new Set([
  "pending",
  "confirmed",
  "ready",
  "completed",
  "canceled",
]);
const FULFILLMENT_TYPES = new Set(["pickup", "delivery", "dineIn"]);
const TIMING_TYPES = new Set(["ASAP", "SCHEDULED"]);

function calculateItemOptionPrice(item: any) {
  if (Array.isArray(item?.selectedOptions)) {
    return item.selectedOptions.reduce((optionTotal: number, option: any) => {
      const prices = Array.isArray(option?.selectedItemPrices)
        ? option.selectedItemPrices
        : [];
      return (
        optionTotal +
        prices.reduce((priceTotal: number, value: unknown) => {
          const parsedPrice = Number(value);
          if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
            throw new Error(
              `Invalid option price for ${item?.name || "an order item"}.`
            );
          }
          return priceTotal + parsedPrice;
        }, 0)
      );
    }, 0);
  }

  const additionalPrice = Number(item?.additionalPrice || 0);
  if (!Number.isFinite(additionalPrice) || additionalPrice < 0) {
    throw new Error(
      `Invalid option price for ${item?.name || "an order item"}.`
    );
  }
  return additionalPrice;
}

function calculateItemsSubtotal(items: any[]) {
  const subtotal = items.reduce((sum, item) => {
    const price = Number(item?.price);
    const quantity = Number(item?.quantity);
    if (!Number.isFinite(price) || price < 0) {
      throw new Error(`Invalid price for ${item?.name || "an order item"}.`);
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error(`Invalid quantity for ${item?.name || "an order item"}.`);
    }

    const optionPrice = calculateItemOptionPrice(item);

    return sum + (price + optionPrice) * quantity;
  }, 0);

  return roundMoney(subtotal);
}

async function validateAdminRemoveOptions(items: any[]) {
  const requestedRemovals = items.flatMap((item) =>
    Array.isArray(item?.selectedOptions)
      ? item.selectedOptions
          .filter(isAdminRemoveOption)
          .map((option: any) => ({
            productId: Number(item.id),
            productName: item.name || "This product",
            optionTypeId: option.optionTypeId,
          }))
      : []
  );
  if (requestedRemovals.length === 0) return;

  const productIds = Array.from(
    new Set(requestedRemovals.map((option) => option.productId))
  );
  if (!productIds.every((id) => Number.isInteger(id) && id > 0)) {
    throw new Error("Remove option references an invalid product.");
  }

  const assignedOptions = await db
    .select({
      productId: productOptions.productId,
      optionTypeId: productOptions.optionId,
    })
    .from(productOptions)
    .where(inArray(productOptions.productId, productIds));
  const assignments = new Set(
    assignedOptions.map(
      (option) => `${option.productId}:${option.optionTypeId}`
    )
  );

  requestedRemovals.forEach((option) => {
    if (!assignments.has(`${option.productId}:${option.optionTypeId}`)) {
      throw new Error(
        `${option.productName}'s Remove option no longer matches its current menu options.`
      );
    }
  });
}

function parsePositiveIntParam(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : NaN;
}

export async function PUT(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;

  const body = await req.json();
  const { id } = body;

  // Basic validation
  if (typeof id !== "number") {
    return NextResponse.json(
      { error: "Invalid or missing order ID" },
      { status: 400 }
    );
  }
  const updatePayload: Partial<typeof orders.$inferInsert> = {};
  let recalculatedTotalAmount: string | undefined;
  if (body.status !== undefined) updatePayload.status = body.status;
  if (body.scheduledTime !== undefined) {
    const scheduledTime = new Date(body.scheduledTime);
    if (Number.isNaN(scheduledTime.getTime())) {
      return NextResponse.json(
        { error: "Invalid scheduled time" },
        { status: 400 }
      );
    }
    updatePayload.scheduledTime = scheduledTime;
  }
  if (body.orderDetails !== undefined)
    updatePayload.orderDetails = body.orderDetails;
  if (body.reasonForCancel !== undefined)
    updatePayload.reasonForCancel = body.reasonForCancel;
  if (body.fulfillmentType !== undefined)
    updatePayload.fulfillmentType = body.fulfillmentType;
  if (body.fulfillmentTimingType !== undefined)
    updatePayload.fulfillmentTimingType = body.fulfillmentTimingType;
  if (body.totalAmount !== undefined)
    updatePayload.totalAmount = body.totalAmount;
  
  // Handle estimatedTime - calculate scheduledTime based on current time + estimated minutes
  if (body.estimatedTime !== undefined && typeof body.estimatedTime === "number" && body.estimatedTime >= 0) {
    const scheduledTime = new Date(Date.now() + body.estimatedTime * 60000);
    updatePayload.scheduledTime = scheduledTime;
  }
  
  updatePayload.updatedAt = new Date();
  const validationResult = updateOrderSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json(
      {
        error:
          validationResult.error.issues[0]?.message ||
          "The order update contains invalid information.",
      },
      { status: 400 }
    );
  }

  if (body.recalculateTotal === true) {
    const orderDetails = body.orderDetails;
    const items = Array.isArray(orderDetails?.items) ? orderDetails.items : [];
    if (items.length === 0) {
      return NextResponse.json(
        { error: "Please add at least one order item." },
        { status: 400 }
      );
    }

    try {
      const normalizedItems = items.map((item: any) => {
        const selectedOptions = Array.isArray(item?.selectedOptions)
          ? normalizeAdminCustomOptions(item.selectedOptions)
          : item?.selectedOptions;
        const normalizedItem = { ...item, selectedOptions };
        return {
          ...normalizedItem,
          additionalPrice: calculateItemOptionPrice(normalizedItem),
        };
      });
      await validateAdminRemoveOptions(normalizedItems);
      const itemsSubtotal = calculateItemsSubtotal(normalizedItems);
      const isDelivery = body.fulfillmentType === "delivery";
      const deliveryCharge = isDelivery
        ? roundMoney(Number(orderDetails.deliveryCharge))
        : 0;

      if (
        isDelivery &&
        (!Number.isFinite(deliveryCharge) || deliveryCharge < 0)
      ) {
        return NextResponse.json(
          { error: "Delivery fee must be a valid amount of $0 or more." },
          { status: 400 }
        );
      }
      const parsedDeliveryAddress = isDelivery
        ? validateVerifiedDeliveryAddress(orderDetails.deliveryAddressDetails)
        : null;
      if (isDelivery && !parsedDeliveryAddress?.success) {
        return NextResponse.json(
          { error: "A verified delivery address is required for delivery orders." },
          { status: 400 }
        );
      }
      const verifiedDeliveryAddress =
        parsedDeliveryAddress?.success ? parsedDeliveryAddress.data : null;
      if (isDelivery && itemsSubtotal < DELIVERY_MINIMUM_SUBTOTAL) {
        return NextResponse.json(
          {
            error: `Delivery orders must be at least $${DELIVERY_MINIMUM_SUBTOTAL.toFixed(
              2
            )} before tax.`,
          },
          { status: 400 }
        );
      }

      const taxableSubtotal = itemsSubtotal + deliveryCharge;
      const tax = roundMoney(taxableSubtotal * HST_RATE);
      recalculatedTotalAmount = roundMoney(taxableSubtotal + tax).toFixed(2);
      updatePayload.totalAmount = recalculatedTotalAmount;
      updatePayload.orderDetails = {
        ...orderDetails,
        items: normalizedItems,
        deliveryCharge,
        deliveryAddress: isDelivery
          ? verifiedDeliveryAddress!.formattedAddress
          : null,
        deliveryAddressDetails: isDelivery
          ? verifiedDeliveryAddress
          : null,
      };
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Unable to calculate the order total.",
        },
        { status: 400 }
      );
    }
  }

  const isNoShowCancellation =
    body.status === "canceled" &&
    typeof body.reasonForCancel === "string" &&
    body.reasonForCancel.trim().toLowerCase() === "no show";

  await db.transaction(async (tx) => {
    const [updatedOrder] = await tx
      .update(orders)
      .set(updatePayload)
      .where(eq(orders.id, id))
      .returning({ userId: orders.userId });

    if (isNoShowCancellation && updatedOrder) {
      await tx
        .update(users)
        .set({
          notes: sql<string>`case
            when ${users.notes} is null or btrim(${users.notes}) = ''
              then 'Warning: No Show'
            when position('Warning: No Show' in ${users.notes}) > 0
              then ${users.notes}
            else ${users.notes} || ' / Warning: No Show'
          end`,
        })
        .where(eq(users.id, updatedOrder.userId));
    }
  });

  return NextResponse.json({
    success: true,
    ...(recalculatedTotalAmount
      ? { totalAmount: recalculatedTotalAmount }
      : {}),
  });
}

export async function DELETE(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;

  const body = await req.json();
  const { id } = body;

  if (typeof id !== "number") {
    return NextResponse.json(
      { error: "Invalid or missing order ID" },
      { status: 400 }
    );
  }

  await db.delete(orders).where(eq(orders.id, id));

  return NextResponse.json({ success: true });
}

export async function GET(req: NextRequest) {
  const auth = await requireAuthenticatedUser();
  if (auth.response) return auth.response;

  const { searchParams } = new URL(req.url);
  const isAdmin =
    auth.user.role === "admin" && auth.session.user.role === "admin";
  const view = searchParams.get("view") ?? "list";
  if (!["list", "monitor", "history"].includes(view)) {
    return NextResponse.json({ error: "Invalid order view" }, { status: 400 });
  }
  if (view === "monitor" && !isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const status = searchParams.get("status") || undefined;
  if (status && !ORDER_STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid order status" }, { status: 400 });
  }
  const userIdRaw = searchParams.get("userId");
  const requestedUserId = parsePositiveIntParam(userIdRaw);
  if (userIdRaw && Number.isNaN(requestedUserId)) {
    return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
  }

  const userId = isAdmin ? requestedUserId : auth.user.id;

  const customer = searchParams.get("customer")?.trim().slice(0, 100) || undefined;
  const startDateRaw = searchParams.get("startDate");
  const endDateRaw = searchParams.get("endDate");
  const startDate = parseTorontoDateFilter(startDateRaw);
  const endDate = parseTorontoDateFilter(endDateRaw);
  if ((startDateRaw && !startDate) || (endDateRaw && !endDate)) {
    return NextResponse.json({ error: "Invalid date filter" }, { status: 400 });
  }
  if (startDate && endDate && startDate > endDate) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }
  const sortByRaw = searchParams.get("sortBy") ?? "createdAt";
  const sortOrderRaw = searchParams.get("sortOrder") ?? "desc";
  if (!["createdAt", "totalAmount"].includes(sortByRaw)) {
    return NextResponse.json({ error: "Invalid sort field" }, { status: 400 });
  }
  if (!["asc", "desc"].includes(sortOrderRaw)) {
    return NextResponse.json({ error: "Invalid sort order" }, { status: 400 });
  }
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "15");
  if (!Number.isInteger(page) || page <= 0) {
    return NextResponse.json({ error: "Invalid page" }, { status: 400 });
  }
  if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
    return NextResponse.json({ error: "Invalid limit" }, { status: 400 });
  }
  const fulfillmentType = searchParams.get("fulfillmentType") || undefined;
  const fulfillmentTimingType =
    searchParams.get("fulfillmentTimingType") || undefined;
  if (fulfillmentType && !FULFILLMENT_TYPES.has(fulfillmentType)) {
    return NextResponse.json({ error: "Invalid fulfillment type" }, { status: 400 });
  }
  if (fulfillmentTimingType && !TIMING_TYPES.has(fulfillmentTimingType)) {
    return NextResponse.json({ error: "Invalid timing type" }, { status: 400 });
  }

  try {
    const ordersList = await getOrders({
      status,
      userId,
      customer,
      startDate,
      endDate,
      sortBy: sortByRaw as "createdAt" | "totalAmount",
      sortOrder: sortOrderRaw as "asc" | "desc",
      page,
      limit,
      fulfillmentType,
      fulfillmentTimingType,
      includeDetails: view === "monitor" || view === "history" || !isAdmin,
    });
    return NextResponse.json(ordersList, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
