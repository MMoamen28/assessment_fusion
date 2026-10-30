import { describe, it, expect, vi } from "vitest";
import { GET as getHealth } from "@/app/api/health/route";
import { prisma } from "@/lib/db";

describe("GET /api/health", () => {
  it("returns 200 { status: 'ok' } when database is reachable", async () => {
    const res = await getHealth();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: "ok" });
  });

  it("returns 503 { status: 'unavailable' } when database query throws", async () => {
    const spy = vi.spyOn(prisma.user, "findFirst").mockRejectedValueOnce(new Error("Connection refused"));

    try {
      const res = await getHealth();
      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body).toEqual({ status: "unavailable" });
    } finally {
      spy.mockRestore();
    }
  });
});
