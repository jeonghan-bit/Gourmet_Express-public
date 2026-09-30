import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function requireAuthenticatedUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      session: null,
      user: null,
      response: NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      ),
    };
  }

  const userId = Number(session.user.id);
  if (!Number.isInteger(userId)) {
    return {
      session: null,
      user: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 403 }),
    };
  }

  const [currentUser] = await db
    .select({ id: users.id, role: users.role, status: users.status })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!currentUser || currentUser.status !== "active") {
    return {
      session: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 403 }),
      user: null,
    };
  }

  return { session, response: null, user: currentUser };
}

export async function requireAdmin() {
  const auth = await requireAuthenticatedUser();
  if (auth.response) return auth;

  if (auth.session.user.role !== "admin" || auth.user.role !== "admin") {
    return {
      session: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 403 }),
      user: null,
    };
  }

  return auth;
}
