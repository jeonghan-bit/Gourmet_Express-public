import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { db, orders, storeControls, users } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { validateVerifiedDeliveryAddress } from "@/lib/deliveryAddress.server";
import { normalizeCanadianPhoneNumber } from "@/lib/utils";
import {
  CartValidationError,
  hydrateCartWithCurrentPrices,
} from "@/lib/cartPricing.server";
import { STORE_CONFIG } from "@/lib/storeConfig";

const HST_RATE = 0.13;
const DELIVERY_MINIMUM_SUBTOTAL = 30;
const MAX_TEXT_LENGTH = 500;

function normalizeShortText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, MAX_TEXT_LENGTH) : null;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export async function POST(req: Request) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const isAdmin = session.user.role === "admin";
    const idempotencyKeyHeader = req.headers.get("idempotency-key")?.trim();
    const idempotencyKey = idempotencyKeyHeader || null;
    if (
      idempotencyKey !== null &&
      (idempotencyKey.length > 100 ||
        !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(idempotencyKey))
    ) {
      return NextResponse.json(
        { error: "Invalid idempotency key" },
        { status: 400 }
      );
    }

    const [controls] = await db
      .select({
        isClosed: storeControls.isClosed,
        closureMessage: storeControls.closureMessage,
        isMaintenanceActive: storeControls.isMaintenanceActive,
      })
      .from(storeControls)
      .limit(1);

    if (controls?.isClosed) {
      return NextResponse.json(
        { error: controls.closureMessage || "The store is temporarily closed" },
        { status: 503 }
      );
    }

    const isMaintenanceActive = controls?.isMaintenanceActive === true;
    if (isMaintenanceActive && !isAdmin) {
      return NextResponse.json(
        { error: "Online ordering is currently under maintenance" },
        { status: 503 }
      );
    }

    const body = await req.json();

    const {
      userId,
      name,
      phone,
      allergyInfo,
      additionalNote,
      deliveryAddressDetails,
      orderType,
      pickupTime,
      scheduledTime,
      cart,
      total,
      deliveryCharge,
      status,
      estimatedTime,
      source,
    } = body;
    const isAddOrderSource = source === "add_order" && isAdmin;

    // Verify the authenticated user matches the userId in the request
    if (!isAdmin && Number(session.user.id) !== Number(userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (!userId || !Array.isArray(cart) || cart.length === 0 || !orderType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!isAdmin && phone !== undefined) {
      const submittedPhone = normalizeCanadianPhoneNumber(
        typeof phone === "string" ? phone : null
      );
      const verifiedSessionPhone = normalizeCanadianPhoneNumber(
        session.user.phoneNumber
      );
      if (!submittedPhone || submittedPhone !== verifiedSessionPhone) {
        return NextResponse.json(
          { error: "Phone number does not match the verified account" },
          { status: 403 }
        );
      }
    }

    // Validate orderType
    const validOrderTypes = ["pickup", "delivery"];
    if (!validOrderTypes.includes(orderType)) {
      return NextResponse.json(
        { error: "Invalid order type" },
        { status: 400 }
      );
    }

    if (pickupTime !== "asap" && pickupTime !== "scheduled") {
      return NextResponse.json(
        { error: "Invalid fulfillment timing" },
        { status: 400 }
      );
    }

    const parsedDeliveryAddress =
      orderType === "delivery"
        ? validateVerifiedDeliveryAddress(deliveryAddressDetails)
        : null;
    if (orderType === "delivery" && !parsedDeliveryAddress?.success) {
      return NextResponse.json(
        {
          error:
            parsedDeliveryAddress?.error ||
            "A verified delivery address is required",
        },
        { status: 400 }
      );
    }

    // Update user profile if name, phone, allergyInfo, or address is provided
    if (
      !isAddOrderSource &&
      (name ||
        phone ||
        allergyInfo !== undefined ||
        deliveryAddressDetails !== undefined)
    ) {
        const updateData: Partial<typeof users.$inferInsert> = {};
      const normalizedName = normalizeShortText(name);
      const normalizedAllergyInfo = normalizeShortText(allergyInfo);

      if (normalizedName) updateData.name = normalizedName;
      // Customer phone ownership is established by Firebase authentication and
      // cannot be changed through checkout.
      if (allergyInfo !== undefined) updateData.allergyInfo = normalizedAllergyInfo;
      if (parsedDeliveryAddress?.success) {
        updateData.deliveryAddressDetails = parsedDeliveryAddress.data;
      }

      try {
        await db
          .update(users)
          .set(updateData)
          .where(eq(users.id, userId));
      } catch (updateError) {
        console.error("⚠️ Failed to update user profile:", updateError);
        // Don't fail the order if profile update fails - just log it
      }
    }

    let scheduledDateTime: Date | null = null;

    if (pickupTime === "scheduled") {
      if (!scheduledTime || !scheduledTime.trim()) {
        return NextResponse.json(
          { error: "scheduledTime is required when pickupTime is scheduled" },
          { status: 400 }
        );
      }

      const parsedScheduledTime = DateTime.fromISO(scheduledTime, {
        zone: STORE_CONFIG.timeZone,
      });

      if (parsedScheduledTime.isValid) {
        scheduledDateTime = parsedScheduledTime.toUTC().toJSDate();
      } else {
        const fallbackScheduledTime = DateTime.fromFormat(
          `${DateTime.now().setZone(STORE_CONFIG.timeZone).toFormat("yyyy-MM-dd")} ${scheduledTime}`,
          "yyyy-MM-dd HH:mm",
          { zone: STORE_CONFIG.timeZone }
        );
        if (!fallbackScheduledTime.isValid) {
          return NextResponse.json(
            { error: 'Invalid scheduledTime. Expected a valid ISO datetime or "HH:mm" time.' },
            { status: 400 }
          );
        }
        scheduledDateTime = fallbackScheduledTime.toUTC().toJSDate();
      }
    }

    const requestedStatus = status === "confirmed" ? "confirmed" : "pending";
    const orderStatus = isAdmin ? requestedStatus : "pending";
    const estimatedMinutes =
      typeof estimatedTime === "number" && Number.isFinite(estimatedTime)
        ? estimatedTime
        : null;

    if (
      orderStatus === "confirmed" &&
      estimatedMinutes !== null &&
      estimatedMinutes > 0 &&
      pickupTime !== "scheduled"
    ) {
      scheduledDateTime = new Date(Date.now() + estimatedMinutes * 60000);
    }

    const hydratedCart = await hydrateCartWithCurrentPrices(cart, {
      allowInactive: isAdmin,
      allowAdminCustomOptions: isAddOrderSource,
    });
    const calculatedItems = hydratedCart.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      specialRequest: normalizeShortText(item.specialRequest),
      selectedOptions:
        item.selectedOptions.length > 0 ? item.selectedOptions : null,
      additionalPrice: item.additionalPrice,
      optionType: item.selectedOptions.length > 0 ? item.selectedOptions : null,
      image: item.image || null,
    }));

    const subtotal = roundMoney(
      calculatedItems.reduce(
        (sum, item) => sum + (item.price + item.additionalPrice) * item.quantity,
        0
      )
    );

    if (orderType === "delivery" && subtotal < DELIVERY_MINIMUM_SUBTOTAL) {
      return NextResponse.json(
        { error: "Delivery orders must meet the minimum subtotal" },
        { status: 400 }
      );
    }

    const normalizedDeliveryCharge =
      isAdmin &&
      orderType === "delivery" &&
      Number.isFinite(Number(deliveryCharge)) &&
      Number(deliveryCharge) >= 0
        ? roundMoney(Number(deliveryCharge))
        : 0;
    const taxableSubtotal = subtotal + normalizedDeliveryCharge;
    const taxAmount = roundMoney(taxableSubtotal * HST_RATE);
    const calculatedTotal = roundMoney(taxableSubtotal + taxAmount);

    const orderDetails = {
      ...(isAddOrderSource ? { source: "add_order" } : {}),
      deliveryAddress:
        orderType === "delivery" && parsedDeliveryAddress?.success
          ? parsedDeliveryAddress.data.formattedAddress
          : null,
      deliveryAddressDetails:
        orderType === "delivery" && parsedDeliveryAddress?.success
          ? parsedDeliveryAddress.data
          : null,
      deliveryCharge: normalizedDeliveryCharge,
      additionalNote: normalizeShortText(additionalNote),
      allergyInfo: normalizeShortText(allergyInfo),
      estimatedTime:
        orderStatus === "confirmed" &&
        estimatedMinutes !== null &&
        estimatedMinutes > 0
          ? estimatedMinutes
          : null,
      items: calculatedItems,
    };

    const [createdOrder] = await db
      .insert(orders)
      .values({
        userId: Number(userId),
        createdAt: new Date(),
        updatedAt: new Date(),
        totalAmount: String(calculatedTotal),
        status: orderStatus,
        fulfillmentType: orderType,
        fulfillmentTimingType: pickupTime.toUpperCase(),
        scheduledTime: scheduledDateTime,
        orderDetails,
        idempotencyKey,
      })
      .onConflictDoNothing({
        target: [orders.userId, orders.idempotencyKey],
      })
      .returning({ id: orders.id });

    if (!createdOrder && idempotencyKey) {
      const [existingOrder] = await db
        .select({ id: orders.id })
        .from(orders)
        .where(
          and(
            eq(orders.userId, Number(userId)),
            eq(orders.idempotencyKey, idempotencyKey)
          )
        )
        .limit(1);

      if (existingOrder) {
        return NextResponse.json({
          success: true,
          orderNumber: existingOrder.id,
        });
      }
    }

    if (!createdOrder) {
      throw new Error("Order could not be created");
    }

    return NextResponse.json({ success: true, orderNumber: createdOrder.id });
  } catch (err) {
    if (err instanceof CartValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("🔥 Unexpected server error:", err);
    return NextResponse.json(
      { error: "Unexpected error" },
      { status: 500 }
    );
  }
}
