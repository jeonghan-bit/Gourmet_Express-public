import { NextRequest, NextResponse } from "next/server";
import { db, storeHours } from "@/lib/db";
import { eq } from "drizzle-orm";
import { insertStoreHoursSchema, updateStoreHoursSchema } from "@/lib/schemas";
import { requireAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

// GET - Fetch all store hours
export async function GET() {
  try {
    const hours = await db.select().from(storeHours).orderBy(storeHours.dayOfWeek);
    return NextResponse.json(hours, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error fetching store hours:", error);
    return NextResponse.json(
      { error: "Failed to fetch store hours" },
      { status: 500 }
    );
  }
}

// POST - Create or update store hours
export async function POST(request: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;

  try {
    const body = await request.json().catch(() => null);
    const validation = insertStoreHoursSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message },
        { status: 400 }
      );
    }
    const validatedData = validation.data;

    // Check if hours for this day already exist
    const existing = await db
      .select()
      .from(storeHours)
      .where(eq(storeHours.dayOfWeek, validatedData.dayOfWeek))
      .limit(1);

    if (existing.length > 0) {
      // Update existing
      const updated = await db
        .update(storeHours)
        .set({
          openTime: validatedData.openTime,
          closeTime: validatedData.closeTime,
          isOpen: validatedData.isOpen ?? true,
          updatedAt: new Date(),
        })
        .where(eq(storeHours.dayOfWeek, validatedData.dayOfWeek))
        .returning();

      return NextResponse.json(updated[0]);
    } else {
      // Create new
      const created = await db
        .insert(storeHours)
        .values({
          dayOfWeek: validatedData.dayOfWeek,
          openTime: validatedData.openTime,
          closeTime: validatedData.closeTime,
          isOpen: validatedData.isOpen ?? true,
        })
        .returning();

      return NextResponse.json(created[0]);
    }
  } catch (error) {
    console.error("Error updating store hours:", error);
    return NextResponse.json(
      { error: "Failed to update store hours" },
      { status: 500 }
    );
  }
}

// PUT - Update specific store hours
export async function PUT(request: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;

  try {
    const body = await request.json().catch(() => null);
    const validation = updateStoreHoursSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message },
        { status: 400 }
      );
    }
    const validatedData = validation.data;

    if (!validatedData.dayOfWeek) {
      return NextResponse.json(
        { error: "Day of week is required" },
        { status: 400 }
      );
    }

    const updated = await db
      .update(storeHours)
      .set({
        openTime: validatedData.openTime,
        closeTime: validatedData.closeTime,
        isOpen: validatedData.isOpen,
        updatedAt: new Date(),
      })
      .where(eq(storeHours.dayOfWeek, validatedData.dayOfWeek))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: "Store hours not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error("Error updating store hours:", error);
    return NextResponse.json(
      { error: "Failed to update store hours" },
      { status: 500 }
    );
  }
} 
