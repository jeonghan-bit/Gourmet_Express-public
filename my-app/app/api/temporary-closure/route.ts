import { NextRequest, NextResponse } from "next/server";
import { db, storeControls } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { updateTemporaryClosureSchema } from "@/lib/schemas";

export async function PUT(request: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;

  try {
    const validation = updateTemporaryClosureSchema.safeParse(
      await request.json().catch(() => null)
    );
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message ?? "Invalid closure" },
        { status: 400 }
      );
    }

    const { isClosed } = validation.data;
    const closureMessage = isClosed
      ? validation.data.closureMessage!.trim()
      : null;
    const [updated] = await db
      .insert(storeControls)
      .values({ id: 1, isClosed, closureMessage })
      .onConflictDoUpdate({
        target: storeControls.id,
        set: { isClosed, closureMessage, updatedAt: new Date() },
      })
      .returning({
        isClosed: storeControls.isClosed,
        closureMessage: storeControls.closureMessage,
      });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating temporary closure:", error);
    return NextResponse.json(
      { error: "Failed to update temporary closure" },
      { status: 500 }
    );
  }
}
