// This is a mock implementation. In a real application, you would connect to your database.

import { db, orders, users } from "@/lib/db";
import { eq, and, gte, lt, desc, asc, or, isNotNull } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { ilike } from "drizzle-orm";
import type { OrderListItem, SelectOrderWithUser } from "@/lib/types";
import { getNextTorontoDayStart, getTorontoTodayStart } from "@/lib/dateFilters";

export type OrdersQueryParams = {
  status?: string;
  startDate?: Date;
  userId?: number;
  customer?: string;
  endDate?: Date;
  sortBy?: "createdAt" | "totalAmount";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
  fulfillmentType?: string;
  fulfillmentTimingType?: string;
  includeDetails?: boolean;
  paginate?: boolean;
};

export const orderWithUserColumns = {
  id: orders.id,
  userId: orders.userId,
  orderDetails: orders.orderDetails,
  createdAt: orders.createdAt,
  updatedAt: orders.updatedAt,
  totalAmount: orders.totalAmount,
  status: orders.status,
  fulfillmentType: orders.fulfillmentType,
  fulfillmentTimingType: orders.fulfillmentTimingType,
  scheduledTime: orders.scheduledTime,
  reasonForCancel: orders.reasonForCancel,
  user: {
    id: users.id,
    name: users.name,
    email: users.email,
    phoneNumber: users.phoneNumber,
    smsAgreement: users.smsAgreement,
    role: users.role,
    isVerified: users.isVerified,
    allergyInfo: users.allergyInfo,
    deliveryAddressDetails: users.deliveryAddressDetails,
    notes: users.notes,
    status: users.status,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
  },
};

// Mock data

// Get today's metrics
export async function getTodayMetrics() {
  // Start of today at midnight in America/Toronto timezone, converted to UTC
  const today = getTorontoTodayStart();
  const tomorrow = getNextTorontoDayStart(today);

  // 1) Count of today's orders
  const todayOrders = await db
    .select({ count: sql<number>`count(*)` })
    .from(orders)
    .where(and(gte(orders.createdAt, today), lt(orders.createdAt, tomorrow)))
    .then((result) => Number(result[0].count));

  // 2) Sum of today's revenue (total_amount)
  const revenueRes = await db
    .select({ total: sql<string>`sum(total_amount)` }) // still returns string|null
    .from(orders)
    .where(
      and(
        gte(orders.createdAt, today),
        lt(orders.createdAt, tomorrow),
        eq(orders.status, "completed") // only include completed orders
      )
    );

  const rawTotal = revenueRes[0].total;
  const todayRevenue = rawTotal !== null ? Number(rawTotal) : 0;

  return {
    todayOrders,
    todayRevenue,
  };
}

// Get orders with filtering, sorting and pagination
export async function getOrders(params: OrdersQueryParams = {}) {
  const {
    status,
    startDate,
    endDate,
    userId,
    customer,
    sortBy = "createdAt",
    sortOrder = "desc",
    page = 1,
    limit = 15,
    fulfillmentType,
    fulfillmentTimingType,
    includeDetails = false,
    paginate = true,
  } = params;

  const requestedLimit = Number.isFinite(limit) ? limit : 15;
  const ITEMS_PER_PAGE = Math.min(Math.max(requestedLimit, 1), 100);
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const offset = (safePage - 1) * ITEMS_PER_PAGE;

  // 1) Build filters
  const conditions: any[] = [];
  if (status) conditions.push(eq(orders.status, status as any));
  if (userId) {
    conditions.push(eq(orders.userId, userId));
  }
  if (fulfillmentType)
    conditions.push(
      eq(
        orders.fulfillmentType,
        fulfillmentType as "pickup" | "delivery" | "dineIn"
      )
    );
  if (fulfillmentTimingType)
    conditions.push(
      eq(
        orders.fulfillmentTimingType,
        fulfillmentTimingType as "ASAP" | "SCHEDULED"
      )
    );
  if (startDate) conditions.push(gte(orders.createdAt, startDate));
  if (endDate) {
    const endPlusOne = getNextTorontoDayStart(endDate);
    conditions.push(lt(orders.createdAt, endPlusOne));
  }
  if (customer) {
    // Search through customer name, phone number, email, and order number
    // Use the joined users table for customer information
    const customerNum = Number(customer);
    const isValidOrderId =
      !isNaN(customerNum) && customerNum > 0 && customerNum <= 2147483647; // PostgreSQL integer max value
    const phoneDigits = customer.replace(/\D/g, "");

    conditions.push(
      or(
        ilike(users.name, `%${customer}%`),
        and(
          isNotNull(users.phoneNumber),
          or(
            eq(users.phoneNumber, customer),
            ...(phoneDigits
              ? [ilike(users.phoneNumber, `%${phoneDigits}%`)]
              : [])
          )
        ),
        ilike(users.email, `%${customer}%`),
        ...(isValidOrderId ? [eq(orders.id, customerNum)] : [])
      )
    );
  }

  const [totalResult] = await db
    .select({
      count: sql<number>`count(*)`,
      totalAmount: sql<string>`coalesce(sum(${orders.totalAmount}), 0)`,
    })
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id))
    .where(conditions.length ? and(...conditions) : undefined);
  const totalOrders = Number(totalResult.count);

  // Check if customer search is an exact order ID match for prioritization
  const customerNum = Number(customer);
  const isExactOrderIdMatch =
    customer &&
    !isNaN(customerNum) &&
    customerNum > 0 &&
    customerNum <= 2147483647;

  const orderBy = [
    ...(isExactOrderIdMatch
      ? [
          desc(
            sql`CASE WHEN ${orders.id} = ${customerNum} THEN 1 ELSE 0 END`
          ),
        ]
      : []),
    sortBy === "createdAt"
      ? sortOrder === "desc"
        ? desc(orders.createdAt)
        : asc(orders.createdAt)
      : sortOrder === "desc"
      ? desc(orders.totalAmount)
      : asc(orders.totalAmount),
    sortOrder === "desc" ? desc(orders.id) : asc(orders.id),
  ];

  let rows: Array<SelectOrderWithUser | OrderListItem>;
  if (includeDetails) {
    const query = db
      .select(orderWithUserColumns)
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(...orderBy);
    rows = paginate
      ? await query.limit(ITEMS_PER_PAGE).offset(offset)
      : await query;
  } else {
    const query = db
      .select({
        id: orders.id,
        userId: orders.userId,
        orderDetails: sql<null>`null`,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        totalAmount: orders.totalAmount,
        status: orders.status,
        fulfillmentType: orders.fulfillmentType,
        fulfillmentTimingType: orders.fulfillmentTimingType,
        scheduledTime: orders.scheduledTime,
        reasonForCancel: sql<null>`null`,
        user: {
          id: users.id,
          name: users.name,
          phoneNumber: sql<null>`null`,
        },
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(...orderBy);
    rows = paginate
      ? await query.limit(ITEMS_PER_PAGE).offset(offset)
      : await query;
  }

  return {
    orders: rows,
    totalOrders,
    totalAmount: Number(totalResult.totalAmount),
    page: paginate ? safePage : 1,
    limit: paginate ? ITEMS_PER_PAGE : totalOrders,
    totalPages: paginate ? Math.ceil(totalOrders / ITEMS_PER_PAGE) : 1,
  };
}
export async function updateOrderDetails(
  orderId: number,
  newDetails: Record<string, any>
) {
  // Serialize the object into a JSON string if needed
  const serialized = JSON.stringify(newDetails);

  // Update the orderDetails and updatedAt 
  await db
    .update(orders)
    .set({
      orderDetails: serialized,
      updatedAt: new Date(), // update timestamp
    })
    .where(eq(orders.id, orderId));

  return { success: true };
}
// Update order status
export async function updateOrderStatus(
  orderId: number,
  newStatus: string,
  estimatedTime?: number
) {
  let scheduledTime: Date | null = null;
  if (typeof estimatedTime === "number" && estimatedTime >= 0) {
    scheduledTime = new Date(Date.now() + estimatedTime * 60000);
  }
  await db
    .update(orders)
    .set({
      status: newStatus as any,
      updatedAt: new Date(), // ← refresh updatedAt manually
      ...(scheduledTime ? { scheduledTime } : {}),
    })
    .where(eq(orders.id, orderId));

  return { success: true };
}

// Get metrics for ASAP vs scheduled orders
export async function getScheduledOrdersMetrics() {
  const today = getTorontoTodayStart();
  const tomorrow = getNextTorontoDayStart(today);
  const scheduledOrders = await db
    .select({ count: sql<number>`count(*)` })
    .from(orders)
    .where(
      and(
        eq(orders.fulfillmentTimingType, "SCHEDULED"),
        gte(orders.createdAt, today),
        lt(orders.createdAt, tomorrow)
      )
    )
    .then((result) => Number(result[0].count));

  return {
    // asapOrders,
    scheduledOrders,
  };
}
