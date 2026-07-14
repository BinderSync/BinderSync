/**
 * Minimal in-memory sliding-window rate limiter.
 *
 * Good enough for basic abuse protection at launch scale; note the window is
 * per server instance (Vercel may run several), so treat limits as
 * approximate. Swap for a shared store (Upstash Redis) if this ever matters.
 */
const buckets = new Map<string, number[]>();

const MAX_BUCKETS = 10_000;

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;

  // Opportunistic cleanup so the map can't grow without bound.
  if (buckets.size > MAX_BUCKETS) {
    for (const [k, hits] of buckets) {
      if (hits.length === 0 || hits[hits.length - 1] < cutoff) buckets.delete(k);
    }
  }

  const hits = (buckets.get(key) ?? []).filter((t) => t >= cutoff);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  return true;
}

export function clientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
