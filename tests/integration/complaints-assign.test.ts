import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, createUser, createComplaint } from "../helpers/db";
import { prisma } from "@/lib/db";
import { assignComplaint } from "@/lib/services/complaints";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

describe("Complaints Assign Integration", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("forbids AGENT from assigning and allows ADMIN", async () => {
    const agent = await createUser({ role: "AGENT" });
    const admin = await createUser({ role: "ADMIN" });
    const assignee = await createUser({ role: "AGENT" });

    const complaint = await createComplaint({
      status: "OPEN",
      assigneeId: null,
      version: 0,
    });

    await expect(
      assignComplaint(
        { id: agent.id, email: agent.email, name: agent.name, role: agent.role },
        complaint.id,
        assignee.id,
        0,
      ),
    ).rejects.toThrow(ForbiddenError);

    await assignComplaint(
      { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
      complaint.id,
      assignee.id,
      0,
    );

    const updated = await prisma.complaint.findUnique({ where: { id: complaint.id } });
    expect(updated?.assigneeId).toBe(assignee.id);
  });

  it("moves an OPEN complaint to IN_REVIEW and writes both ASSIGNED and STATUS_CHANGED activities", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const assignee = await createUser({ role: "AGENT" });

    const complaint = await createComplaint({
      status: "OPEN",
      assigneeId: null,
      version: 0,
    });

    await assignComplaint(
      { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
      complaint.id,
      assignee.id,
      0,
    );

    const updated = await prisma.complaint.findUnique({ where: { id: complaint.id } });
    expect(updated?.status).toBe("IN_REVIEW");
    expect(updated?.assigneeId).toBe(assignee.id);
    expect(updated?.version).toBe(1);

    const activities = await prisma.activity.findMany({
      where: { complaintId: complaint.id },
      orderBy: { createdAt: "asc" },
    });

    expect(activities).toHaveLength(2);
    expect(activities[0].action).toBe("ASSIGNED");
    expect(activities[0].metadata).toEqual({ from: null, to: assignee.id });

    expect(activities[1].action).toBe("STATUS_CHANGED");
    expect(activities[1].metadata).toEqual({ from: "OPEN", to: "IN_REVIEW" });
  });

  it("logs ASSIGNED with from/to when reassigning an in-progress complaint", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const agent1 = await createUser({ role: "AGENT" });
    const agent2 = await createUser({ role: "AGENT" });

    const complaint = await createComplaint({
      status: "IN_REVIEW",
      assigneeId: agent1.id,
      version: 1,
    });

    await assignComplaint(
      { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
      complaint.id,
      agent2.id,
      1,
    );

    const updated = await prisma.complaint.findUnique({ where: { id: complaint.id } });
    expect(updated?.assigneeId).toBe(agent2.id);
    expect(updated?.version).toBe(2);

    const activities = await prisma.activity.findMany({
      where: { complaintId: complaint.id },
      orderBy: { createdAt: "asc" },
    });

    expect(activities).toHaveLength(1);
    expect(activities[0].action).toBe("ASSIGNED");
    expect(activities[0].metadata).toEqual({ from: agent1.id, to: agent2.id });
  });

  it("throws NotFoundError when assignee does not exist", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const complaint = await createComplaint({
      status: "OPEN",
      assigneeId: null,
      version: 0,
    });

    await expect(
      assignComplaint(
        { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
        complaint.id,
        "non-existent-user-id",
      0,
      ),
    ).rejects.toThrow(NotFoundError);
  });

  it("forbids assigning a terminal complaint", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const agent = await createUser({ role: "AGENT" });

    const closed = await createComplaint({
      status: "CLOSED",
      assigneeId: agent.id,
      version: 1,
    });

    await expect(
      assignComplaint(
        { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
        closed.id,
        agent.id,
        1,
      ),
    ).rejects.toThrow(ForbiddenError);

    const rejected = await createComplaint({
      status: "REJECTED",
      assigneeId: null,
      version: 1,
    });

    await expect(
      assignComplaint(
        { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
        rejected.id,
        agent.id,
        1,
      ),
    ).rejects.toThrow(ForbiddenError);
  });
});
