import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { signDeliveryAddress } from "@/lib/deliveryAddress.server";
import { consumeRateLimit } from "@/lib/rateLimit";

const SESSION_TOKEN = /^[A-Za-z0-9_-]{1,100}$/;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rateLimit = consumeRateLimit(
    `address-details:${session.user.id}`,
    30,
    60_000
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many address lookups. Please try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      }
    );
  }

  const apiKey = process.env.GOOGLE_PLACES_API;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Address search is not configured" },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => null);
  const placeId = typeof body?.placeId === "string" ? body.placeId.trim() : "";
  const sessionToken =
    typeof body?.sessionToken === "string" ? body.sessionToken : undefined;

  if (sessionToken && !SESSION_TOKEN.test(sessionToken)) {
    return NextResponse.json({ error: "Invalid session token" }, { status: 400 });
  }

  if (!placeId || placeId.length > 500 || !/^[A-Za-z0-9_-]+$/.test(placeId)) {
    return NextResponse.json({ error: "Invalid place" }, { status: 400 });
  }

  const url = new URL(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`
  );
  if (sessionToken) url.searchParams.set("sessionToken", sessionToken);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "id,formattedAddress,addressComponents,location",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
  } catch (error) {
    console.error("Google place details request failed", error);
    return NextResponse.json(
      { error: "Unable to verify that address" },
      { status: 504 }
    );
  }

  if (!response.ok) {
    const googleError = await response.text();
    console.error("Google place details failed", response.status, googleError);
    return NextResponse.json(
      { error: "Unable to verify that address" },
      { status: 502 }
    );
  }

  const place = await response.json();
  const postalCode = (place.addressComponents ?? []).find((component: any) =>
    component.types?.includes("postal_code")
  )?.longText;

  if (
    !place.formattedAddress ||
    !place.location ||
    typeof place.location.latitude !== "number" ||
    typeof place.location.longitude !== "number" ||
    !postalCode
  ) {
    return NextResponse.json(
      { error: "Please choose a complete address with a postal code" },
      { status: 422 }
    );
  }

  const address = {
    formattedAddress: place.formattedAddress,
    placeId: place.id || placeId,
    latitude: place.location.latitude,
    longitude: place.location.longitude,
    postalCode,
    addressType: "house" as const,
  };

  return NextResponse.json({
    address: {
      ...address,
      verificationToken: signDeliveryAddress(address),
    },
  });
}
