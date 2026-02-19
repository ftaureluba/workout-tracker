/**
 * In-memory sliding-window rate limiter.
 *
 * Keyed by an arbitrary string (typically the client IP).
 * Not suitable for multi-process deployments — use Redis in that case.
 */

interface RateLimitEntry {
    timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Periodic cleanup every 5 minutes to avoid unbounded memory growth
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

let cleanupScheduled = false;

function scheduleCleanup(windowMs: number) {
    if (cleanupScheduled) return;
    cleanupScheduled = true;
    setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of store) {
            entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
            if (entry.timestamps.length === 0) {
                store.delete(key);
            }
        }
    }, CLEANUP_INTERVAL_MS);
}

interface RateLimitOptions {
    /** Maximum number of requests allowed in the window. Default: 10 */
    limit?: number;
    /** Window size in milliseconds. Default: 60_000 (1 minute) */
    windowMs?: number;
}

interface RateLimitResult {
    success: boolean;
    remaining: number;
}

export function rateLimit(
    key: string,
    options?: RateLimitOptions
): RateLimitResult {
    const limit = options?.limit ?? 10;
    const windowMs = options?.windowMs ?? 60_000;

    scheduleCleanup(windowMs);

    const now = Date.now();
    let entry = store.get(key);

    if (!entry) {
        entry = { timestamps: [] };
        store.set(key, entry);
    }

    // Remove timestamps outside the current window
    entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

    if (entry.timestamps.length >= limit) {
        return { success: false, remaining: 0 };
    }

    entry.timestamps.push(now);
    return { success: true, remaining: limit - entry.timestamps.length };
}
