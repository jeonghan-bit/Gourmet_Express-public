import { type NextRequest, NextResponse } from "next/server";
import { db, orders, users } from "@/lib/db";
import { insertUserSchema } from "@/lib/schemas";
import { and, asc, desc, eq, gt, ilike, or, sql, type SQL } from "drizzle-orm";
import { requireAdmin } from "@/lib/adminAuth";
import { verifyDeliveryAddressIntegrity } from "@/lib/deliveryAddress.server";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };
const PAGE_SIZES = new Set([15, 25, 50, 100]);

const getBoundedInteger = (
  value: string | null,
  fallback: number,
  minimum: number,
  maximum: number
) => {
  const parsed = Number(value);
  return Number.isInteger(parsed)
    ? Math.min(maximum, Math.max(minimum, parsed))
    : fallback;
};

export async function GET(request: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;

  try {
    const params = request.nextUrl.searchParams;
    const view = params.get("view") === "search" ? "search" : "list";
    const query = params.get("q")?.trim().slice(0, 100) ?? "";
    const requestedLimit = getBoundedInteger(params.get("limit"), 15, 1, 100);
    const limit = view === "search"
      ? Math.min(requestedLimit, 20)
      : PAGE_SIZES.has(requestedLimit)
        ? requestedLimit
        : 15;
    const offset = getBoundedInteger(params.get("offset"), 0, 0, 1_000_000);

    const orderAggregates = db
      .select({
        userId: orders.userId,
        totalOrders: sql<number>`cast(count(*) as integer)`.as("total_orders"),
        lastOrderAt: sql<Date | null>`max(${orders.createdAt})`.as("last_order_at"),
        noShowOrders: sql<number>`cast(count(*) filter (
          where lower(${orders.reasonForCancel}) = 'no show'
        ) as integer)`.as("no_show_orders"),
      })
      .from(orders)
      .groupBy(orders.userId)
      .as("order_aggregates");

    const userConditions: SQL[] = [];
    const aggregateConditions: SQL[] = [];
    if (query) {
      const pattern = `%${query}%`;
      const queryConditions = [
        ilike(users.name, pattern),
        ilike(users.email, pattern),
        ilike(users.phoneNumber, pattern),
      ];
      if (view === "search") {
        queryConditions.push(
          sql`${users.deliveryAddressDetails}->>'formattedAddress' ilike ${pattern}`
        );
      }
      userConditions.push(or(...queryConditions)!);
    }

    if (view === "list") {
      const status = params.get("status") ?? "all";
      if (status === "active") {
        userConditions.push(and(eq(users.role, "customer"), eq(users.status, "active"))!);
      } else if (status === "inactive") {
        userConditions.push(and(eq(users.role, "customer"), eq(users.status, "inactive"))!);
      } else if (status === "admin") {
        userConditions.push(eq(users.role, "admin"));
      }

      if (params.get("repeated") === "1") {
        const threshold = getBoundedInteger(
          params.get("repeatedOrdersAbove"),
          1,
          0,
          1_000_000
        );
        aggregateConditions.push(
          gt(sql<number>`coalesce(${orderAggregates.totalOrders}, 0)`, threshold)
        );
      }
      if (params.get("newCustomers") === "1") {
        aggregateConditions.push(sql`coalesce(${orderAggregates.totalOrders}, 0) = 0`);
      }
      if (params.get("hasEmail") === "1") {
        userConditions.push(sql`nullif(trim(${users.email}), '') is not null`);
      }
      if (params.get("noShow") === "1") {
        aggregateConditions.push(sql`coalesce(${orderAggregates.noShowOrders}, 0) > 0`);
      }
    }

    const conditions = [...userConditions, ...aggregateConditions];
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const userWhere = userConditions.length > 0 ? and(...userConditions) : undefined;
    const sort = params.get("sort") ?? "recentOrders";
    const orderBy = view === "search" || sort === "phoneNumber"
      ? [asc(users.phoneNumber), asc(users.id)]
      : sort === "recentlyJoined"
        ? [desc(users.createdAt), desc(users.id)]
        : [
            sql`${orderAggregates.lastOrderAt} desc nulls last`,
            desc(users.createdAt),
            desc(users.id),
          ];

    const commonQuery = db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phoneNumber: users.phoneNumber,
        smsAgreement: users.smsAgreement,
        role: users.role,
        allergyInfo: users.allergyInfo,
        notes: users.notes,
        status: users.status,
        createdAt: users.createdAt,
        totalOrders: sql<number>`coalesce(${orderAggregates.totalOrders}, 0)`,
        lastOrderAt: orderAggregates.lastOrderAt,
        noShowOrders: sql<number>`coalesce(${orderAggregates.noShowOrders}, 0)`,
      })
      .from(users)
      .leftJoin(orderAggregates, eq(orderAggregates.userId, users.id))
      .where(where)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset);

    const countQuery = aggregateConditions.length > 0
      ? db
          .select({ count: sql<number>`cast(count(*) as integer)` })
          .from(users)
          .leftJoin(orderAggregates, eq(orderAggregates.userId, users.id))
          .where(where)
      : db
          .select({ count: sql<number>`cast(count(*) as integer)` })
          .from(users)
          .where(userWhere);

    const [allUsers, [countResult]] = await Promise.all([
      view === "search"
        ? db
            .select({
              id: users.id,
              name: users.name,
              email: users.email,
              phoneNumber: users.phoneNumber,
              smsAgreement: users.smsAgreement,
              allergyInfo: users.allergyInfo,
              deliveryAddressDetails: users.deliveryAddressDetails,
              notes: users.notes,
              status: users.status,
            })
            .from(users)
            .where(where)
            .orderBy(...orderBy)
            .limit(limit)
            .offset(offset)
        : commonQuery,
      countQuery,
    ]);

    return NextResponse.json(
      {
        users: allUsers,
        totalUsers: countResult?.count ?? 0,
        limit,
        offset,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { message: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const { response } = await requireAdmin();
  if (response) return response;

  try {
    const { name, email, phoneNumber, deliveryAddressDetails, allergyInfo, notes, is_verified } =
      await request.json();
      if (!phoneNumber) {
        return NextResponse.json(
          { error: "Phone number is required" },
          { status: 400 }
        );
      }
  
      let digitsOnly = phoneNumber.replace(/\D/g, "");
      if (digitsOnly.length === 11 && digitsOnly.startsWith("1")) {
        digitsOnly = digitsOnly.slice(1); // → "4165551234"
      }
      if (digitsOnly.length !== 10) {
        return NextResponse.json(
          { error: "Invalid phone number" },
          { status: 400 }
        );
      }
    const validationResult = insertUserSchema.safeParse({
      name,
      email,
      phoneNumber: digitsOnly,
      deliveryAddressDetails,
      allergyInfo,
      notes,
      isVerified: is_verified,
      role: "customer",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.message },
        { status: 400 }
      );
    }
    const newUser = validationResult.data;
    if (newUser.deliveryAddressDetails) {
      const verified = verifyDeliveryAddressIntegrity(
        newUser.deliveryAddressDetails
      );
      if (!verified.success) {
        return NextResponse.json({ error: verified.error }, { status: 400 });
      }
    }
    const createdUser = await db
      .insert(users)
      .values(newUser)
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        phoneNumber: users.phoneNumber,
        smsAgreement: users.smsAgreement,
        allergyInfo: users.allergyInfo,
        deliveryAddressDetails: users.deliveryAddressDetails,
        notes: users.notes,
        status: users.status,
      });

    return NextResponse.json(
      { success: true, user: createdUser[0] },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error("Phone verification error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
