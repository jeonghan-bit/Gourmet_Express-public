import "server-only";
import { type NextRequest, NextResponse } from "next/server";
import { db, orders, users } from "@/lib/db";
import { requireAuthenticatedUser } from "@/lib/adminAuth";
import { orderWithUserColumns } from "@/lib/orders";
import { and, eq } from "drizzle-orm";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET(
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

  const isAdmin = auth.user.role === "admin" && auth.session.user.role === "admin";
  const [order] = await db
    .select(orderWithUserColumns)
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id))
    .where(
      isAdmin
        ? eq(orders.id, orderId)
        : and(eq(orders.id, orderId), eq(orders.userId, auth.user.id))
    )
    .limit(1);

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json(order, { headers: NO_STORE_HEADERS });
}
