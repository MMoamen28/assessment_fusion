import { describe, it, expect } from "vitest";
import { createRateLimiter } from "@/lib/rate-limit";

describe("Rate Limiter Unit Tests", () => {
  it("allows up to the limit and blocks the next request", () => {
    let currentTime = 1000;
    const limiter = createRateLimiter({
      limit: 3,
      windowMs: 60000,
      now: () => currentTime,
    });

    expect(limiter.check("ip-1")).toEqual({ ok: true, retryAfterSeconds: 0 });
    expect(limiter.check("ip-1")).toEqual({ ok: true, retryAfterSeconds: 0 });
    expect(limiter.check("ip-1")).toEqual({ ok: true, retryAfterSeconds: 0 });

    const blocked = limiter.check("ip-1");
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(60);
  });

  it("resets after the window has passed", () => {
    let currentTime = 1000;
    const limiter = createRateLimiter({
      limit: 2,
      windowMs: 10000,
      now: () => currentTime,
    });

    expect(limiter.check("user-1").ok).toBe(true);
    expect(limiter.check("user-1").ok).toBe(true);
    expect(limiter.check("user-1").ok).toBe(false);

    // Advance clock past window
    currentTime += 10001;

    expect(limiter.check("user-1")).toEqual({ ok: true, retryAfterSeconds: 0 });
  });

  it("keeps different keys independent", () => {
    let currentTime = 1000;
    const limiter = createRateLimiter({
      limit: 1,
      windowMs: 60000,
      now: () => currentTime,
    });

    expect(limiter.check("key-a").ok).toBe(true);
    expect(limiter.check("key-a").ok).toBe(false);

    // key-b is still allowed
    expect(limiter.check("key-b").ok).toBe(true);
    expect(limiter.check("key-b").ok).toBe(false);
  });

  it("cleans up expired keys so the store does not grow indefinitely", () => {
    let currentTime = 1000;
    const limiter = createRateLimiter({
      limit: 5,
      windowMs: 5000,
      now: () => currentTime,
    });

    limiter.check("old-key-1");
    limiter.check("old-key-2");

    // Advance clock past expiration
    currentTime += 6000;

    // Next check triggers cleanup
    const result = limiter.check("new-key");
    expect(result.ok).toBe(true);

    // Check old key was cleaned up and receives fresh quota
    expect(limiter.check("old-key-1")).toEqual({ ok: true, retryAfterSeconds: 0 });
  });

  it("resets store immediately on reset()", () => {
    let currentTime = 1000;
    const limiter = createRateLimiter({
      limit: 1,
      windowMs: 60000,
      now: () => currentTime,
    });

    expect(limiter.check("key-1").ok).toBe(true);
    expect(limiter.check("key-1").ok).toBe(false);

    limiter.reset();

    expect(limiter.check("key-1").ok).toBe(true);
  });
});
