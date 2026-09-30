import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = Number(session.user.id);

    const [user] = await db
      .select({
        userId: users.id,
        name: users.name,
        phoneNumber: users.phoneNumber,
        smsAgreement: users.smsAgreement,
        email: users.email,
        allergyInfo: users.allergyInfo,
        deliveryAddressDetails: users.deliveryAddressDetails,
        isVerified: users.isVerified,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, userId));
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      return NextResponse.json(
        { user },
        { headers: NO_STORE_HEADERS }
      );
  } catch (error) {
    console.error("Customer info error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
