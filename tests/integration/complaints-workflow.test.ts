import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, createUser, createComplaint } from "../helpers/db";
import { prisma } from "@/lib/db";
import { changeStatus } from "@/lib/services/complaints";
import {
  ConflictError,
  ForbiddenError,
  InvalidTransitionError,
} from "@/lib/errors";

describe("Complaints Workflow Integration", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("succeeds for allowed transitions and writes STATUS_CHANGED activity with from/to", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const agent = await createUser({ role: "AGENT" });

    const complaint = await createComplaint({
      status: "IN_REVIEW",
      assigneeId: agent.id,
      version: 0,
    });

    await changeStatus(
      { id: agent.id, email: agent.email, name: agent.name, role: agent.role },
      complaint.id,
      { status: "RESOLVED", expectedVersion: 0, note: "Resolved successfully" },
    );

    let updated = await prisma.complaint.findUnique({ where: { id: complaint.id } });
    expect(updated?.status).toBe("RESOLVED");
    expect(updated?.version).toBe(1);

    await changeStatus(
      { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
      complaint.id,
      { status: "CLOSED", expectedVersion: 1 },
    );

    updated = await prisma.complaint.findUnique({ where: { id: complaint.id } });
    expect(updated?.status).toBe("CLOSED");
    expect(updated?.version).toBe(2);

    const activities = await prisma.activity.findMany({
      where: { complaintId: complaint.id },
      orderBy: { createdAt: "asc" },
    });

    expect(activities).toHaveLength(2);
    expect(activities[0].action).toBe("STATUS_CHANGED");
    expect(activities[0].metadata).toEqual({
      from: "IN_REVIEW",
      to: "RESOLVED",
      note: "Resolved successfully",
    });

    expect(activities[1].action).toBe("STATUS_CHANGED");
    expect(activities[1].metadata).toEqual({ from: "RESOLVED", to: "CLOSED" });
  });

  it("throws InvalidTransitionError on illegal transition and leaves complaint and activities unchanged", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const complaint = await createComplaint({
      status: "OPEN",
      assigneeId: null,
      version: 0,
    });

    await expect(
      changeStatus(
        { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
        complaint.id,
        { status: "RESOLVED", expectedVersion: 0 },
      ),
    ).rejects.toThrow(InvalidTransitionError);

    const inDb = await prisma.complaint.findUnique({ where: { id: complaint.id } });
    expect(inDb?.status).toBe("OPEN");
    expect(inDb?.version).toBe(0);

    const activities = await prisma.activity.findMany({ where: { complaintId: complaint.id } });
    expect(activities).toHaveLength(0);
  });

  it("throws ConflictError on stale expectedVersion and changes nothing", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const agent = await createUser({ role: "AGENT" });

    const complaint = await createComplaint({
      status: "IN_REVIEW",
      assigneeId: agent.id,
      version: 2,
    });

    await expect(
      changeStatus(
        { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
        complaint.id,
        { status: "RESOLVED", expectedVersion: 1 },
      ),
    ).rejects.toThrow(ConflictError);

    const inDb = await prisma.complaint.findUnique({ where: { id: complaint.id } });
    expect(inDb?.status).toBe("IN_REVIEW");
    expect(inDb?.version).toBe(2);

    const activities = await prisma.activity.findMany({ where: { complaintId: complaint.id } });
    expect(activities).toHaveLength(0);
  });

  it("ensures exactly one wins between two concurrent changeStatus calls with identical expectedVersion", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const agent = await createUser({ role: "AGENT" });

    const complaint = await createComplaint({
      status: "IN_REVIEW",
      assigneeId: agent.id,
      version: 1,
    });

    const results = await Promise.allSettled([
      changeStatus(
        { id: agent.id, email: agent.email, name: agent.name, role: agent.role },
        complaint.id,
        { status: "RESOLVED", expectedVersion: 1 },
      ),
      changeStatus(
        { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
        complaint.id,
        { status: "RESOLVED", expectedVersion: 1 },
      ),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(ConflictError);

    const inDb = await prisma.complaint.findUnique({ where: { id: complaint.id } });
    expect(inDb?.version).toBe(2);

    const activities = await prisma.activity.findMany({ where: { complaintId: complaint.id } });
    expect(activities).toHaveLength(1);
  });

  it("enforces role permissions: non-assignee forbidden, admin allowed, only admin can reopen", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const assignee = await createUser({ role: "AGENT" });
    const otherAgent = await createUser({ role: "AGENT" });

    const complaint = await createComplaint({
      status: "IN_REVIEW",
      assigneeId: assignee.id,
      version: 0,
    });

    await expect(
      changeStatus(
        { id: otherAgent.id, email: otherAgent.email, name: otherAgent.name, role: otherAgent.role },
        complaint.id,
        { status: "RESOLVED", expectedVersion: 0 },
      ),
    ).rejects.toThrow(ForbiddenError);

    await changeStatus(
      { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
      complaint.id,
      { status: "RESOLVED", expectedVersion: 0 },
    );

    const resolvedComplaint = await prisma.complaint.findUnique({ where: { id: complaint.id } });
    expect(resolvedComplaint?.status).toBe("RESOLVED");
    expect(resolvedComplaint?.version).toBe(1);

    await expect(
      changeStatus(
        { id: assignee.id, email: assignee.email, name: assignee.name, role: assignee.role },
        complaint.id,
        { status: "IN_REVIEW", expectedVersion: 1 },
      ),
    ).rejects.toThrow(ForbiddenError);

    await changeStatus(
      { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
      complaint.id,
      { status: "IN_REVIEW", expectedVersion: 1 },
    );

    const reopened = await prisma.complaint.findUnique({ where: { id: complaint.id } });
    expect(reopened?.status).toBe("IN_REVIEW");
    expect(reopened?.version).toBe(2);
  });

  it("rolls back complaint change when activity write fails inside transaction", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const complaint = await createComplaint({
      status: "IN_REVIEW",
      assigneeId: admin.id,
      version: 0,
    });

    const nonExistentActor = {
      id: "c000000000000000000000000",
      email: "ghost@example.com",
      name: "Ghost Actor",
      role: admin.role,
    };

    await expect(
      changeStatus(nonExistentActor, complaint.id, {
        status: "RESOLVED",
        expectedVersion: 0,
      }),
    ).rejects.toThrow();

    const inDb = await prisma.complaint.findUnique({ where: { id: complaint.id } });
    expect(inDb?.status).toBe("IN_REVIEW");
    expect(inDb?.version).toBe(0);

    const activities = await prisma.activity.findMany({ where: { complaintId: complaint.id } });
    expect(activities).toHaveLength(0);
  });
});
