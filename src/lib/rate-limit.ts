// Lightweight in-memory rate limiter.
//
// This is a single-process, in-memory sliding-window-ish limiter backed by a
// plain Map. It resets on server restart and does NOT scale across multiple
// server instances/processes (no shared state, e.g. Redis). That's an
// acceptable tradeoff for this app's current scale, but if this is ever
// deployed behind multiple concurrent server instances, this should be
// replaced with a shared store (Redis, Durable Objects, etc.).

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

// Lazily purge expired entries so the map doesn't grow without bound.
// Runs at most once every PURGE_INTERVAL_MS, triggered by incoming checks.
const PURGE_INTERVAL_MS = 5 * 60 * 1000;
let lastPurgeAt = 0;

function purgeExpired(now: number): void {
  if (now - lastPurgeAt < PURGE_INTERVAL_MS) return;
  lastPurgeAt = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export type RateLimitOptions = {
  /** Maximum number of allowed attempts within the window. */
  max: number;
  /** Length of the sliding window, in milliseconds. */
  windowMs: number;
};

/**
 * Checks (and records) an attempt for `key` against a fixed-window rate
 * limit. Returns `true` if the attempt is allowed, `false` if the caller has
 * exceeded `opts.max` attempts within the last `opts.windowMs` milliseconds.
 */
export function checkRateLimit(key: string, opts: RateLimitOptions): boolean {
  const now = Date.now();
  purgeExpired(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return true;
  }

  if (existing.count >= opts.max) {
    return false;
  }

  existing.count += 1;
  return true;
}
