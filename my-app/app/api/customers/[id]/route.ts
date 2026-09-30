// app/api/customer-info/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { db, users } from "@/lib/db";
import { updateUserSchema } from "@/lib/schemas";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/adminAuth";
import { verifyDeliveryAddressIntegrity } from "@/lib/deliveryAddress.server";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest, context: any) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { params } = context;
  try {
    const resolvedParams = await params;
    const userId = Number(resolvedParams.id);
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // Get user information
    const [user] = await db
      .select({
        userId: users.id,
        name: users.name,
        phoneNumber: users.phoneNumber,
        smsAgreement: users.smsAgreement,
        email: users.email,
        allergyInfo: users.allergyInfo,
        address: users.address,
        deliveryAddressDetails: users.deliveryAddressDetails,
        notes: users.notes,
        status: users.status,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        id: user.userId,
        name: user.name,
        phoneNumber: user.phoneNumber,
        smsAgreement: user.smsAgreement,
        email: user.email,
        allergyInfo: user.allergyInfo,
        address: user.address,
        deliveryAddressDetails: user.deliveryAddressDetails,
        notes: user.notes,
        status: user.status,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error("Customer info error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;

  try {
    const data = await req.json();
    const { id } = data;

    // Basic validation
    if (typeof id !== "number") {
      return NextResponse.json(
        { error: "Invalid or missing user ID" },
        { status: 400 }
      );
    }
    const userId = id;

    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }
    const validationResult = updateUserSchema.safeParse(data);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.message },
        { status: 400 }
      );
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
    if (updates.phoneNumber !== undefined) {
      allowedFields.phoneNumber = updates.phoneNumber;
    }
    if (updates.smsAgreement !== undefined) {
      allowedFields.smsAgreement = updates.smsAgreement;
    }
    if (updates.deliveryAddressDetails !== undefined) {
      allowedFields.deliveryAddressDetails = updates.deliveryAddressDetails;
    }
    if (updates.notes !== undefined) allowedFields.notes = updates.notes;
    if (updates.name !== undefined) allowedFields.name = updates.name;
    if (updates.allergyInfo !== undefined) {
      allowedFields.allergyInfo = updates.allergyInfo;
    }
    if (updates.status !== undefined) allowedFields.status = updates.status;

    const [updated] = await db
      .update(users)
      .set(allowedFields)
      .where(eq(users.id, userId))
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

    return NextResponse.json(updated, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("Customer info update error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
