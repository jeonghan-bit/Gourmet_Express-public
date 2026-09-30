import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // wherever you export your NextAuth config
import { users, db } from "@/lib/db";
import { updatePersonalUserSchema } from "@/lib/schemas";
import { eq } from "drizzle-orm";
import { verifyDeliveryAddressIntegrity } from "@/lib/deliveryAddress.server";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const data = await request.json();

    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }
    const validationResult = updatePersonalUserSchema.safeParse(data);
    if (!validationResult.success) {
      return NextResponse.json({ error: validationResult.error.message }, { status: 400 });
    }
    const updates = validationResult.data;
    if (updates.deliveryAddressDetails) {
      const verified = verifyDeliveryAddressIntegrity(
        updates.deliveryAddressDetails
      );
      if (!verified.success) {
        return NextResponse.json({ error: verified.error }, { status: 400 });
      }
    }
    const allowedFields: Partial<typeof users.$inferInsert> = {};
    if (updates.email !== undefined) allowedFields.email = updates.email;
    if (updates.name !== undefined) allowedFields.name = updates.name;
    if (updates.allergyInfo !== undefined) {
      allowedFields.allergyInfo = updates.allergyInfo;
    }
    if (updates.smsAgreement !== undefined) {
      allowedFields.smsAgreement = updates.smsAgreement;
    }
    if (updates.deliveryAddressDetails !== undefined) {
      allowedFields.deliveryAddressDetails = updates.deliveryAddressDetails;
    }
    allowedFields.updatedAt = new Date().toISOString();

    const [updated] = await db
      .update(users)
      .set(allowedFields)
      .where(eq(users.id, userId))
      .returning();

    return NextResponse.json(updated, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("Customer info update error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
