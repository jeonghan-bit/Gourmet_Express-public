type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const globalForRateLimit = globalThis as unknown as {
  gourmetExpressRateLimits?: Map<string, RateLimitEntry>;
};

const entries =
  globalForRateLimit.gourmetExpressRateLimits ?? new Map<string, RateLimitEntry>();
globalForRateLimit.gourmetExpressRateLimits = entries;

export function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const current = entries.get(key);

  if (!current || current.resetAt <= now) {
    entries.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;

  // Bound memory in long-running processes. Expired entries are safe to drop.
  if (entries.size > 10_000) {
    entries.forEach((entry, entryKey) => {
      if (entry.resetAt <= now) entries.delete(entryKey);
    });
  }

  return { allowed: true, retryAfterSeconds: 0 };
}
