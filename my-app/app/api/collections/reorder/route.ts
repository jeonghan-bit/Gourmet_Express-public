// app/api/collections/reorder/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db, collections } from "@/lib/db";
import { eq, inArray, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/adminAuth";
import { invalidatePublicMenu } from "@/lib/publicMenu";

export async function PUT(request: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;

  try {
    // 1) Parse & validate payload
    const body: Array<{ id: number; order: number }> = await request.json();
    if (!Array.isArray(body) || body.length === 0 || body.length > 100) {
      return NextResponse.json(
        { error: "Expected 1 to 100 {id, order} items." },
        { status: 400 }
      );
    }
    for (const item of body) {
      if (
        !Number.isInteger(item.id) ||
        item.id <= 0 ||
        !Number.isInteger(item.order) ||
        item.order < 0
      ) {
        return NextResponse.json(
          { error: "Each item must have numeric 'id' and 'order'." },
          { status: 400 }
        );
      }
    }
    if (new Set(body.map((item) => item.id)).size !== body.length) {
      return NextResponse.json(
        { error: "Collection IDs must be unique." },
        { status: 400 }
      );
    }

    // 2) Load the statuses for this slice, ensure same-group
    const ids = body.map((i) => i.id);
    const statuses = await db
      .select({ id: collections.id, status: collections.status })
      .from(collections)
      .where(inArray(collections.id, ids));

    if (statuses.length !== ids.length) {
      return NextResponse.json(
        { error: "Some collections not found." },
        { status: 404 }
      );
    }
    const group = statuses[0].status;
    if (!statuses.every((r) => r.status === group)) {
      return NextResponse.json(
        { error: "Can only reorder within the same status group." },
        { status: 400 }
      );
    }

    // 3) Compute the “start” index for this group
    //    active group starts at 1; inactive group starts after activeCount
    let offset = 0;
    if (group === "inactive") {
      const [{ cnt: activeCount }] = await db
        .select({ cnt: sql`COUNT(*)` })
        .from(collections)
        .where(eq(collections.status, "active"));
      offset = Number(activeCount);
    }

    // 4) In a transaction, move them out of the way then back into place
    await db.transaction(async (tx) => {
      // 4a) push into negative space relative to offset
      for (const { id, order } of body) {
        await tx
          .update(collections)
          .set({ order: -(offset + order) })
          .where(eq(collections.id, id));
      }
      // 4b) re-assign final global positions
      for (const { id, order } of body) {
        await tx
          .update(collections)
          .set({ order: offset + order })
          .where(eq(collections.id, id));
      }
    });

    // 5) Always return 200 on success
    invalidatePublicMenu();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error reordering collections:", err);
    return NextResponse.json(
      { error: "Failed to reorder collections", details: String(err) },
      { status: 500 }
    );
  }
}
