import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireAuthenticatedUser } from "@/lib/adminAuth";
import {
  CartValidationError,
  hydrateCartWithCurrentPrices,
} from "@/lib/cartPricing.server";
import { db, orders } from "@/lib/db";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };
const MAX_NOTE_LENGTH = 500;

function parseOrderDetails(value: unknown): Record<string, any> {
  if (typeof value !== "string") {
    return value && typeof value === "object"
      ? (value as Record<string, any>)
      : {};
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthenticatedUser();
  if (auth.response) return auth.response;

  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
  }

  const [order] = await db
    .select({ orderDetails: orders.orderDetails })
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, auth.user.id)))
    .limit(1);

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const orderDetails = parseOrderDetails(order.orderDetails);
  const items = Array.isArray(orderDetails.items) ? orderDetails.items : [];

  try {
    const cart = await hydrateCartWithCurrentPrices(items, {
      omitAdminOrderOverrides: true,
    });
    const additionalNote =
      typeof orderDetails.additionalNote === "string"
        ? orderDetails.additionalNote.slice(0, MAX_NOTE_LENGTH)
        : "";

    return NextResponse.json(
      { cart, additionalNote },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    if (error instanceof CartValidationError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    console.error(`Failed to prepare reorder for order ${orderId}:`, error);
    return NextResponse.json(
      { error: "Unable to prepare this reorder. Please try again." },
      { status: 500 }
    );
  }
}
