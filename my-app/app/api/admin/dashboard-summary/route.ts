import { NextRequest, NextResponse } from "next/server";
import { getOrders } from "@/lib/orders";
import { requireAdmin } from "@/lib/adminAuth";
import { getNextTorontoDayStart, getTorontoTodayStart } from "@/lib/dateFilters";
import { db, orders } from "@/lib/db";
import { and, gte, lt, sql } from "drizzle-orm";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const customer = searchParams.get("customer") || undefined;
  const phone = searchParams.get("phone") || undefined;
  const sortBy =
    (searchParams.get("sortBy") as "createdAt" | "totalAmount") || undefined;
  const sortOrder =
    (searchParams.get("sortOrder") as "asc" | "desc") || undefined;
  const fulfillmentType = searchParams.get("fulfillmentType") || undefined;
  const fulfillmentTimingType =
    searchParams.get("fulfillmentTimingType") || undefined;
  const todayStart = getTorontoTodayStart();
  const tomorrowStart = getNextTorontoDayStart(todayStart);

  if (
    (status && !["pending", "confirmed", "ready", "completed", "canceled"].includes(status)) ||
    (sortBy && !["createdAt", "totalAmount"].includes(sortBy)) ||
    (sortOrder && !["asc", "desc"].includes(sortOrder)) ||
    (fulfillmentType && !["pickup", "delivery", "dineIn"].includes(fulfillmentType)) ||
    (fulfillmentTimingType && !["ASAP", "SCHEDULED"].includes(fulfillmentTimingType))
  ) {
    return NextResponse.json({ error: "Invalid dashboard filters" }, { status: 400 });
  }

  try {
    const [ordersData, [metrics]] = await Promise.all([
      getOrders({
        status,
        customer: customer || phone,
        startDate: todayStart,
        endDate: todayStart,
        sortBy,
        sortOrder,
        fulfillmentType,
        fulfillmentTimingType,
        paginate: false,
      }),
      db
        .select({
          todayOrders: sql<number>`cast(count(*) as integer)`,
          todayRevenue: sql<string>`coalesce(sum(${orders.totalAmount}) filter (
            where ${orders.status} = 'completed'
          ), 0)`,
          scheduledOrders: sql<number>`cast(count(*) filter (
            where ${orders.fulfillmentTimingType} = 'SCHEDULED'
          ) as integer)`,
          pendingOrders: sql<number>`cast(count(*) filter (
            where ${orders.status} = 'pending'
          ) as integer)`,
        })
        .from(orders)
        .where(
          and(
            gte(orders.createdAt, todayStart),
            lt(orders.createdAt, tomorrowStart)
          )
        ),
    ]);

    return NextResponse.json(
      {
        todayOrders: metrics.todayOrders,
        todayRevenue: Number(metrics.todayRevenue),
        scheduledOrders: metrics.scheduledOrders,
        pendingOrders: metrics.pendingOrders,
        orders: ordersData.orders,
        totalOrders: ordersData.totalOrders,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard summary" },
      { status: 500 }
    );
  }
}
