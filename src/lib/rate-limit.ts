export interface RateLimiterOptions {
  limit: number;
  windowMs: number;
  now?: () => number;
}

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

interface WindowEntry {
  count: number;
  resetAt: number;
}

export interface RateLimiter {
  check(key: string): RateLimitResult;
  reset(): void;
}

export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const { limit, windowMs, now = Date.now } = options;
  const store = new Map<string, WindowEntry>();

  const cleanup = (currentTime: number) => {
    for (const [k, entry] of store.entries()) {
      if (entry.resetAt <= currentTime) {
        store.delete(k);
      }
    }
  };

  return {
    check(key: string): RateLimitResult {
      const currentTime = now();
      cleanup(currentTime);

      let entry = store.get(key);
      if (!entry || entry.resetAt <= currentTime) {
        entry = { count: 0, resetAt: currentTime + windowMs };
        store.set(key, entry);
      }

      if (entry.count >= limit) {
        const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - currentTime) / 1000));
        return { ok: false, retryAfterSeconds };
      }

      entry.count += 1;
      return { ok: true, retryAfterSeconds: 0 };
    },

    reset(): void {
      store.clear();
    },
  };
}
