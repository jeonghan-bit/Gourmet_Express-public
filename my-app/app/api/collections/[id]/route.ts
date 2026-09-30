// app/api/collections/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db, collections, products } from "@/lib/db";
import { updateCollectionSchema } from "@/lib/schemas";
import { eq, gt, and, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/adminAuth";
import { invalidatePublicMenu } from "@/lib/publicMenu";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdmin();
  if (response) return response;

  try {
    const { id } = await params;
    const collectionId = Number(id);
    if (!Number.isInteger(collectionId) || collectionId <= 0) {
      return NextResponse.json({ error: "Invalid collection ID" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const validation = updateCollectionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.message },
        { status: 400 }
      );
    }
    const { name, status, order } = validation.data;
    if (name === undefined && status === undefined && order === undefined) {
      return NextResponse.json(
        { error: "No collection updates provided" },
        { status: 400 }
      );
    }

    // ── 1) Special logic when deactivating ────────────────────────────────────
    if (status === "inactive") {
      const resultDeactivate = await db.transaction(async (tx) => {
        const origRows = await tx
          .select({ order: collections.order })
          .from(collections)
          .where(eq(collections.id, collectionId));
        if (origRows.length === 0) return null;
        const origOrder = origRows[0].order;

        const deactivatePayload: Partial<typeof collections.$inferInsert> = {
          status: "inactive",
          order: 0,
        };
        if (name !== undefined) deactivatePayload.name = name;
        await tx
          .update(collections)
          .set(deactivatePayload)
          .where(eq(collections.id, collectionId));
        await tx
          .update(collections)
          .set({ order: sql`${collections.order} - 1` })
          .where(gt(collections.order, origOrder));

        const maxRows = await tx
          .select({ maxOrder: sql`MAX(${collections.order})` })
          .from(collections);
        const finalOrder = Number(maxRows[0]?.maxOrder ?? 0) + 1;
        const [updated] = await tx
          .update(collections)
          .set({ order: finalOrder })
          .where(eq(collections.id, collectionId))
          .returning();
        await tx
          .update(products)
          .set({ status: "inactive" })
          .where(eq(products.collection_id, collectionId));
        return updated ?? null;
      });

      if (!resultDeactivate) {
        return NextResponse.json(
          { error: "Collection not found" },
          { status: 404 }
        );
      }

      invalidatePublicMenu();
      return NextResponse.json(resultDeactivate);
    }

    // ── 2) Special logic when activating ──────────────────────────────────────
    if (status === "active") {
      const resultActivate = await db.transaction(async (tx) => {
        const activeCountRows = await tx
          .select({ count: sql`COUNT(*)` })
          .from(collections)
          .where(eq(collections.status, "active"));
        const activeCount = Number(activeCountRows[0]?.count ?? 0);

        const activatePayload: Partial<typeof collections.$inferInsert> = {
          status: "active",
          order: 0,
        };
        if (name !== undefined) activatePayload.name = name;
        const activated = await tx
          .update(collections)
          .set(activatePayload)
          .where(eq(collections.id, collectionId))
          .returning({ id: collections.id });
        if (activated.length === 0) return null;

        await tx
          .update(collections)
          .set({ order: sql`${collections.order} + 1` })
          .where(
            and(
              eq(collections.status, "inactive"),
              gt(collections.order, activeCount)
            )
          );
        const [updated] = await tx
          .update(collections)
          .set({ order: activeCount + 1 })
          .where(eq(collections.id, collectionId))
          .returning();
        await tx
          .update(products)
          .set({ status: "active" })
          .where(eq(products.collection_id, collectionId));
        return updated ?? null;
      });

      if (!resultActivate) {
        return NextResponse.json(
          { error: "Collection not found" },
          { status: 404 }
        );
      }

      invalidatePublicMenu();
      return NextResponse.json(resultActivate);
    }

    // ── 3) Normal update path (name, manual order, or other status changes) ──
    const updates: Partial<typeof collections.$inferInsert> = {};
    if (name !== undefined) updates.name = name;
    if (status !== undefined) updates.status = status;
    if (order !== undefined) updates.order = order;

    const updatedRows = await db
      .update(collections)
      .set(updates)
      .where(eq(collections.id, collectionId))
      .returning();
    const updated = updatedRows[0] ?? null;

    if (status !== undefined) {
      // Cascade any status change to products
      await db
        .update(products)
        .set({ status })
        .where(eq(products.collection_id, collectionId));
    }

    invalidatePublicMenu();
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating collection:", error);
    return NextResponse.json(
      { error: "Error updating collection" },
      { status: 500 }
    );
  }
}
