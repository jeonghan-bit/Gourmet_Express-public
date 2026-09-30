export const MAX_OPTION_NAME_LENGTH = 200;
export const MAX_OPTION_ITEMS_PER_REQUEST = 200;
export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeOptionPrice(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const normalized = String(value).trim();
  const parsed = Number(normalized);
  return normalized && Number.isFinite(parsed) && parsed >= 0 && parsed <= 100_000
    ? normalized
    : null;
}

export function parseOptionItemInput(body: Record<string, unknown>) {
  const label = typeof body.label === "string" ? body.label.trim() : "";
  const additionalPrice = normalizeOptionPrice(body.additionalPrice ?? 0);

  if (!label || label.length > MAX_OPTION_NAME_LENGTH) {
    return {
      error: "Label is required and must not exceed 200 characters",
    } as const;
  }
  if (additionalPrice === null) {
    return {
      error: "Additional price must be between 0 and 100000",
    } as const;
  }

  return { label, additionalPrice } as const;
}
