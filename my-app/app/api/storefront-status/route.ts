import { NextResponse } from "next/server";
import { db, storeControls, storeHours } from "@/lib/db";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    const [hours, controlRows] = await Promise.all([
      db.select().from(storeHours).orderBy(storeHours.dayOfWeek),
      db
        .select({
          isClosed: storeControls.isClosed,
          closureMessage: storeControls.closureMessage,
          isMaintenanceActive: storeControls.isMaintenanceActive,
        })
        .from(storeControls)
        .limit(1),
    ]);

    const controls = controlRows[0];

    return NextResponse.json(
      {
        storeHours: hours,
        maintenanceMode: {
          isActive: controls?.isMaintenanceActive === true,
        },
        temporaryClosure: {
          isActive: controls?.isClosed === true,
          message: controls?.closureMessage ?? null,
        },
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error("Failed to fetch storefront status:", error);
    return NextResponse.json(
      { error: "Failed to fetch storefront status" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
