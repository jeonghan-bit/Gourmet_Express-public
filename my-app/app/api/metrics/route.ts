import { NextResponse } from "next/server";
import { getTodayMetrics, getScheduledOrdersMetrics } from "@/lib/orders";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET(request: Request) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  try {
    if (type === "today") {
      const metrics = await getTodayMetrics();
      return NextResponse.json(metrics);
    } else if (type === "scheduled") {
      const metrics = await getScheduledOrdersMetrics();
      return NextResponse.json(metrics);
    } else {
      return NextResponse.json(
        { error: "Invalid metrics type" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error fetching metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 }
    );
  }
}
