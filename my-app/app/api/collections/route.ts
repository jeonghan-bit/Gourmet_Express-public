import { NextRequest, NextResponse } from "next/server";
import { db, collections } from "@/lib/db"; // or your actual path
import { insertCollectionSchema } from "@/lib/schemas";
import { eq, sql, and } from "drizzle-orm";
import { requireAdmin } from "@/lib/adminAuth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPublicMenu, invalidatePublicMenu } from "@/lib/publicMenu";

// GET /api/collections
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === "admin";
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    if (!isAdmin) {
      const publicMenu = await getPublicMenu();
      return NextResponse.json(publicMenu.collections);
    }

    const conditions = [];
    if (status && status !== "all") {
      conditions.push(eq(collections.status, status as "active" | "inactive"));
    }

    const query = db.select().from(collections);
    if (conditions.length > 0) {
      query.where(and(...conditions));
    }
    const allCollections = await query.orderBy(collections.order);

    return NextResponse.json(allCollections);
  } catch (error) {
    console.error("Error fetching collections:", error);
    return NextResponse.json(
      { error: "Error fetching collections" },
      { status: 500 }
    );
  }
}

// POST /api/collections
export async function POST(request: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;

  try {
    const body = await request.json();

    const { name, status } = body;

    // Calculate the correct order based on status
    let newOrder: number;
    if (status === "active") {
      // For active collections, place after the last active collection
      const result = await db
        .select({ maxOrder: sql<number>`max("order")` })
        .from(collections)
        .where(eq(collections.status, "active"));
      const currentMaxActiveOrder = result[0]?.maxOrder || 0;
      newOrder = currentMaxActiveOrder + 1;
    } else {
      // For inactive collections, place after all collections
      const result = await db
        .select({ maxOrder: sql<number>`max("order")` })
        .from(collections);
      const currentMaxOrder = result[0]?.maxOrder || 0;
      newOrder = currentMaxOrder + 1;
    }

    const validationResult = insertCollectionSchema.safeParse({
      name,
      status,
      order: newOrder,
    });
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.message },
        { status: 400 }
      );
    }
    const [newCollection] = await db
      .insert(collections)
      .values({ name, status, order: newOrder })
      .returning();

    invalidatePublicMenu();

    return NextResponse.json(newCollection, { status: 201 });
  } catch (error) {
    console.error("Error in API POST:", error);
    return NextResponse.json(
      { error: "Error creating collection" },
      { status: 500 }
    );
  }
}
