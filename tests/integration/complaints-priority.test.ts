import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, createUser, createComplaint } from "../helpers/db";
import { prisma } from "@/lib/db";
import { changePriority } from "@/lib/services/complaints";
import { ForbiddenError, ConflictError, ValidationError } from "@/lib/errors";

describe("Complaints Priority Integration", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("assignee can change priority, version is incremented, and PRIORITY_CHANGED activity is written with metadata", async () => {
    const agent = await createUser({
      name: "Agent One",
      email: "agent1@example.com",
      role: "AGENT",
    });

    const complaint = await createComplaint({
      title: "Priority Test Ticket",
      assigneeId: agent.id,
      priority: "MEDIUM",
      status: "OPEN",
      version: 0,
    });

    const result = await changePriority(
      agent,
      complaint.id,
      { priority: "HIGH", expectedVersion: 0 },
    );

    expect(result).toEqual({ success: true });

    const updated = await prisma.complaint.findUnique({
      where: { id: complaint.id },
    });

    expect(updated?.priority).toBe("HIGH");
    expect(updated?.version).toBe(1);

    const activities = await prisma.activity.findMany({
      where: { complaintId: complaint.id, action: "PRIORITY_CHANGED" },
    });

    expect(activities).toHaveLength(1);
    expect(activities[0].actorId).toBe(agent.id);
    expect(activities[0].metadata).toEqual({
      from: "MEDIUM",
      to: "HIGH",
    });
  });

  it("another agent cannot change priority and receives ForbiddenError", async () => {
    const assignee = await createUser({
      name: "Assignee Agent",
      email: "assignee@example.com",
      role: "AGENT",
    });

    const otherAgent = await createUser({
      name: "Other Agent",
      email: "other@example.com",
      role: "AGENT",
    });

    const complaint = await createComplaint({
      title: "Forbidden Priority Ticket",
      assigneeId: assignee.id,
      priority: "LOW",
      status: "IN_REVIEW",
      version: 0,
    });

    await expect(
      changePriority(otherAgent, complaint.id, { priority: "HIGH", expectedVersion: 0 }),
    ).rejects.toThrow(ForbiddenError);

    // Complaint priority remains unchanged
    const unchanged = await prisma.complaint.findUnique({
      where: { id: complaint.id },
    });
    expect(unchanged?.priority).toBe("LOW");
    expect(unchanged?.version).toBe(0);
  });

  it("admin can change priority even when complaint is unassigned", async () => {
    const admin = await createUser({
      name: "Super Admin",
      email: "admin@example.com",
      role: "ADMIN",
    });

    const complaint = await createComplaint({
      title: "Unassigned Complaint",
      assigneeId: null,
      priority: "LOW",
      status: "OPEN",
      version: 0,
    });

    const result = await changePriority(
      admin,
      complaint.id,
      { priority: "HIGH", expectedVersion: 0 },
    );

    expect(result).toEqual({ success: true });

    const updated = await prisma.complaint.findUnique({
      where: { id: complaint.id },
    });
    expect(updated?.priority).toBe("HIGH");
    expect(updated?.version).toBe(1);

    const activities = await prisma.activity.findMany({
      where: { complaintId: complaint.id, action: "PRIORITY_CHANGED" },
    });
    expect(activities).toHaveLength(1);
    expect(activities[0].actorId).toBe(admin.id);
  });

  it("terminal complaint cannot be changed by agent or admin (ForbiddenError)", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const agent = await createUser({ role: "AGENT" });

    const closedComplaint = await createComplaint({
      status: "CLOSED",
      assigneeId: agent.id,
      priority: "LOW",
      version: 0,
    });

    const rejectedComplaint = await createComplaint({
      status: "REJECTED",
      assigneeId: agent.id,
      priority: "LOW",
      version: 0,
    });

    // Admin forbidden on terminal
    await expect(
      changePriority(admin, closedComplaint.id, { priority: "HIGH", expectedVersion: 0 }),
    ).rejects.toThrow(ForbiddenError);

    // Agent forbidden on terminal
    await expect(
      changePriority(agent, rejectedComplaint.id, { priority: "HIGH", expectedVersion: 0 }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("stale expectedVersion is rejected with ConflictError", async () => {
    const agent = await createUser({ role: "AGENT" });
    const complaint = await createComplaint({
      assigneeId: agent.id,
      priority: "LOW",
      status: "OPEN",
      version: 2,
    });

    await expect(
      changePriority(agent, complaint.id, { priority: "HIGH", expectedVersion: 1 }),
    ).rejects.toThrow(ConflictError);

    // DB state is preserved
    const unchanged = await prisma.complaint.findUnique({
      where: { id: complaint.id },
    });
    expect(unchanged?.priority).toBe("LOW");
    expect(unchanged?.version).toBe(2);
  });

  it("rejects transition to the same priority with ValidationError", async () => {
    const agent = await createUser({ role: "AGENT" });
    const complaint = await createComplaint({
      assigneeId: agent.id,
      priority: "MEDIUM",
      status: "OPEN",
      version: 0,
    });

    await expect(
      changePriority(agent, complaint.id, { priority: "MEDIUM", expectedVersion: 0 }),
    ).rejects.toThrow(ValidationError);
  });
});
