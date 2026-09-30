// pages/api/send-sms.ts
import { NextResponse } from "next/server";
import Twilio from "twilio";
import { requireAdmin } from "@/lib/adminAuth";
import { consumeRateLimit } from "@/lib/rateLimit";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { normalizeCanadianPhoneNumber } from "@/lib/utils";

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const fromNumber = process.env.TWILIO_PHONE_NUMBER!;
const client = Twilio(accountSid, authToken);

const MAX_REQUEST_BYTES = 4 * 1024;
const MAX_SMS_CHARACTERS = 480;
const MAX_RECIPIENT_CHARACTERS = 20;
const E164_PHONE_NUMBER = /^\+[1-9]\d{1,14}$/;

function errorResponse(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status });
}

async function readLimitedRequestBody(request: Request) {
  if (!request.body) return "";

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let byteLength = 0;
  let body = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    byteLength += value.byteLength;
    if (byteLength > MAX_REQUEST_BYTES) {
      await reader.cancel();
      return null;
    }
    body += decoder.decode(value, { stream: true });
  }

  return body + decoder.decode();
}

export async function POST(request: Request) {
  const { response, user } = await requireAdmin();
  if (response) return response;

  try {
    const declaredLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
      return errorResponse("SMS request body must not exceed 4 KB", 413);
    }

    const rawBody = await readLimitedRequestBody(request);
    if (rawBody === null) {
      return errorResponse("SMS request body must not exceed 4 KB", 413);
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return errorResponse("Request body must be valid JSON", 400);
    }

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return errorResponse("Request body must be a JSON object", 400);
    }

    const { customerId, body } = payload as {
      customerId?: unknown;
      body?: unknown;
    };

    if (
      typeof customerId !== "number" ||
      !Number.isInteger(customerId) ||
      customerId <= 0 ||
      typeof body !== "string" ||
      !body
    ) {
      return errorResponse("Customer ID and message body are required", 400);
    }

    if (Array.from(body).length > MAX_SMS_CHARACTERS) {
      return errorResponse(
        "SMS message body must not exceed 480 characters",
        400
      );
    }

    const [customer] = await db
      .select({
        phoneNumber: users.phoneNumber,
        smsAgreement: users.smsAgreement,
      })
      .from(users)
      .where(eq(users.id, customerId))
      .limit(1);

    if (!customer?.smsAgreement) {
      return NextResponse.json({ success: true, sent: false });
    }

    const canadianPhone = normalizeCanadianPhoneNumber(customer.phoneNumber);
    const to = canadianPhone ? `+1${canadianPhone}` : customer.phoneNumber;
    if (
      !to ||
      to.length > MAX_RECIPIENT_CHARACTERS ||
      !E164_PHONE_NUMBER.test(to)
    ) {
      return errorResponse("Customer has no valid SMS phone number", 400);
    }

    const adminLimit = consumeRateLimit(`sms-admin:${user!.id}`, 60, 60_000);
    const recipientLimit = consumeRateLimit(`sms-recipient:${to}`, 10, 60_000);
    const retryAfterSeconds = Math.max(
      adminLimit.retryAfterSeconds,
      recipientLimit.retryAfterSeconds
    );
    if (!adminLimit.allowed || !recipientLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many SMS requests. Please try again shortly.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSeconds) },
        }
      );
    }

    await client.messages.create({ from: fromNumber, to, body });
    return NextResponse.json({ success: true, sent: true });
  } catch (err) {
    console.error("Twilio error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to send SMS" },
      { status: 500 }
    );
  }
}
