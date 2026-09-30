import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rateLimit";
import { STORE_CONFIG } from "@/lib/storeConfig";

const SESSION_TOKEN = /^[A-Za-z0-9_-]{1,100}$/;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rateLimit = consumeRateLimit(
    `address-autocomplete:${session.user.id}`,
    120,
    60_000
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many address searches. Please try again shortly." },
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
  const input = typeof body?.input === "string" ? body.input.trim() : "";
  const sessionToken =
    typeof body?.sessionToken === "string" ? body.sessionToken : undefined;

  if (sessionToken && !SESSION_TOKEN.test(sessionToken)) {
    return NextResponse.json({ error: "Invalid session token" }, { status: 400 });
  }

  if (input.length < 3 || input.length > 200) {
    return NextResponse.json({ suggestions: [] });
  }

  let response: Response;
  try {
    const upstreamController = new AbortController();
    const abortUpstream = () => upstreamController.abort();
    const timeoutId = setTimeout(abortUpstream, 8_000);
    if (request.signal.aborted) {
      abortUpstream();
    } else {
      request.signal.addEventListener("abort", abortUpstream, { once: true });
    }

    try {
      response = await fetch(
        "https://places.googleapis.com/v1/places:autocomplete",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask":
              "suggestions.placePrediction.place,suggestions.placePrediction.text.text",
          },
          body: JSON.stringify({
            input,
            sessionToken,
            includedRegionCodes: ["ca"],
            locationBias: {
              circle: {
                center: STORE_CONFIG.address.location,
                radius: STORE_CONFIG.autocompleteBiasRadiusMetres,
              },
            },
          }),
          cache: "no-store",
          signal: upstreamController.signal,
        }
      );
    } finally {
      clearTimeout(timeoutId);
      request.signal.removeEventListener("abort", abortUpstream);
    }
  } catch (error) {
    if (request.signal.aborted) {
      return new Response(null, { status: 499 });
    }
    console.error("Google address autocomplete request failed", error);
    return NextResponse.json(
      { error: "Address search is temporarily unavailable" },
      { status: 504 }
    );
  }

  if (!response.ok) {
    const googleError = await response.text();
    console.error(
      "Google address autocomplete failed",
      response.status,
      googleError
    );
    return NextResponse.json(
      { error: "Address search is temporarily unavailable" },
      { status: 502 }
    );
  }

  const data = await response.json();
  const suggestions = (data.suggestions ?? [])
    .map((suggestion: any) => {
      const prediction = suggestion.placePrediction;
      const resourceName = prediction?.place;
      if (!resourceName || !prediction?.text?.text) return null;

      return {
        placeId: String(resourceName).replace(/^places\//, ""),
        text: String(prediction.text.text),
      };
    })
    .filter(Boolean)
    .slice(0, 5);

  return NextResponse.json({ suggestions });
}
