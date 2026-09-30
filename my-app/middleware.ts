import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  // Only run this middleware for /admin routes
  if (req.nextUrl.pathname.startsWith("/admin")) {
    // Retrieve the token; ensure NEXTAUTH_SECRET is set in your env
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    
    // If there's no token or the role is not "admin", redirect to home
    if (!token || token.role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/admin/:path*",
};
