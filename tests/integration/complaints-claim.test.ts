import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, createUser, createComplaint } from "../helpers/db";
import { prisma } from "@/lib/db";
import { claimComplaint } from "@/lib/services/complaints";
import { ConflictError, NotFoundError } from "@/lib/errors";

describe("Claim Complaint Integration & Concurrency", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("handles concurrent claims with exactly one winner across 10 agents, repeated 5 times", async () => {
    const agents = await Promise.all(
      Array.from({ length: 10 }).map((_, i) =>
        createUser({
          email: `agent_${i}_${Date.now()}@example.com`,
          name: `Agent ${i}`,
        }),
      ),
    );

    for (let iteration = 0; iteration < 5; iteration++) {
      const complaint = await createComplaint({
        status: "OPEN",
        assigneeId: null,
        version: 0,
      });

      const results = await Promise.allSettled(
        agents.map((agent) =>
          claimComplaint(
            { id: agent.id, email: agent.email, name: agent.name, role: agent.role },
            complaint.id,
          ),
        ),
      );

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(9);

      for (const rej of rejected) {
        expect((rej as PromiseRejectedResult).reason).toBeInstanceOf(ConflictError);
      }

      const winnerIndex = results.findIndex((r) => r.status === "fulfilled");
      const winner = agents[winnerIndex];

      const inDb = await prisma.complaint.findUnique({
        where: { id: complaint.id },
      });

      expect(inDb).not.toBeNull();
      expect(inDb?.assigneeId).toBe(winner.id);
      expect(inDb?.status).toBe("IN_REVIEW");
      expect(inDb?.version).toBe(1);

      const activities = await prisma.activity.findMany({
        where: { complaintId: complaint.id },
        orderBy: { createdAt: "asc" },
      });

      expect(activities).toHaveLength(2);

      const claimedActivity = activities.find((a) => a.action === "CLAIMED");
      const statusActivity = activities.find((a) => a.action === "STATUS_CHANGED");

      expect(claimedActivity).toBeDefined();
      expect(claimedActivity?.actorId).toBe(winner.id);
      expect(claimedActivity?.metadata).toEqual({ assigneeId: winner.id });

      expect(statusActivity).toBeDefined();
      expect(statusActivity?.actorId).toBe(winner.id);
      expect(statusActivity?.metadata).toEqual({ from: "OPEN", to: "IN_REVIEW" });
    }
  });

  it("throws ConflictError when claiming an already assigned complaint", async () => {
    const agent1 = await createUser();
    const agent2 = await createUser();

    const complaint = await createComplaint({
      status: "IN_REVIEW",
      assigneeId: agent1.id,
      version: 1,
    });

    await expect(
      claimComplaint(
        { id: agent2.id, email: agent2.email, name: agent2.name, role: agent2.role },
        complaint.id,
      ),
    ).rejects.toThrow(ConflictError);
  });

  it("throws NotFoundError when claiming a missing id", async () => {
    const agent = await createUser();

    await expect(
      claimComplaint(
        { id: agent.id, email: agent.email, name: agent.name, role: agent.role },
        "nonexistent-complaint-id",
      ),
    ).rejects.toThrow(NotFoundError);
  });
});
