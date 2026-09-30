import { NextResponse } from "next/server";
import { getPublicMenu } from "@/lib/publicMenu";

const PUBLIC_MENU_HEADERS = {
  "Cache-Control": "public, max-age=60, s-maxage=3600, stale-while-revalidate=86400",
};

export async function GET() {
  try {
    const menu = await getPublicMenu();
    return NextResponse.json(menu, { headers: PUBLIC_MENU_HEADERS });
  } catch (error) {
    console.error("Failed to fetch public menu:", error);
    return NextResponse.json(
      { error: "Failed to fetch menu" },
      { status: 500 }
    );
  }
}
