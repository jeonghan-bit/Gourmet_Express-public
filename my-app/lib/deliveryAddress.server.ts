import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { deliveryAddressSchema } from "@/lib/schemas";
import type { DeliveryAddressDetails } from "@/lib/types";

type VerifiedAddressResult =
  | { success: true; data: DeliveryAddressDetails }
  | { success: false; error: string };

const getSecret = () => process.env.NEXTAUTH_SECRET || "";

const getSignedPayload = (
  address: Pick<
    DeliveryAddressDetails,
    | "formattedAddress"
    | "placeId"
    | "latitude"
    | "longitude"
    | "postalCode"
  >
) =>
  JSON.stringify([
    address.formattedAddress,
    address.placeId,
    address.latitude,
    address.longitude,
    address.postalCode,
  ]);

export function signDeliveryAddress(
  address: Omit<DeliveryAddressDetails, "verificationToken">
) {
  const secret = getSecret();
  if (!secret) throw new Error("NEXTAUTH_SECRET is not configured");
  return createHmac("sha256", secret)
    .update(getSignedPayload(address))
    .digest("base64url");
}

export function validateVerifiedDeliveryAddress(
  value: unknown
): VerifiedAddressResult {
  const parsed = deliveryAddressSchema.safeParse(value);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || "Invalid delivery address",
    };
  }

  return verifyDeliveryAddressIntegrity(parsed.data);
}

export function verifyDeliveryAddressIntegrity(
  address: DeliveryAddressDetails
): VerifiedAddressResult {

  let expected: string;
  try {
    expected = signDeliveryAddress(address);
  } catch {
    return { success: false, error: "Address verification is not configured" };
  }

  const providedBuffer = Buffer.from(address.verificationToken);
  const expectedBuffer = Buffer.from(expected);
  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return { success: false, error: "Please select the delivery address again" };
  }

  return { success: true, data: address };
}
