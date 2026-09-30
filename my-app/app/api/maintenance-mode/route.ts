import { NextRequest, NextResponse } from "next/server";
import { db, storeControls } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

// GET - Fetch maintenance mode status
export async function GET() {
  try {
    const result = await db
      .select({ isActive: storeControls.isMaintenanceActive })
      .from(storeControls)
      .limit(1);

    // If no record exists, return default (false)
    if (result.length === 0) {
      return NextResponse.json(
        { isActive: false },
        { headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(
      { isActive: result[0].isActive },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error("Error fetching maintenance mode:", error);
    return NextResponse.json(
      { error: "Failed to fetch maintenance mode" },
      { status: 500 }
    );
  }
}

// PUT - Update maintenance mode status
export async function PUT(request: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;

  try {
    const body = await request.json();
    const { isActive } = body;

    if (typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "isActive must be a boolean" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .insert(storeControls)
      .values({ id: 1, isMaintenanceActive: isActive })
      .onConflictDoUpdate({
        target: storeControls.id,
        set: { isMaintenanceActive: isActive, updatedAt: new Date() },
      })
      .returning({ isActive: storeControls.isMaintenanceActive });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating maintenance mode:", error);
    return NextResponse.json(
      { error: "Failed to update maintenance mode" },
      { status: 500 }
    );
  }
}
