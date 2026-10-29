import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, createUser, createComplaint } from "../helpers/db";
import { prisma } from "@/lib/db";
import { addComment } from "@/lib/services/comments";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

describe("Comments Integration", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("allows staff to add internal and public comments without bumping complaint version", async () => {
    const staff = await createUser({ role: "AGENT" });
    const complaint = await createComplaint({
      status: "IN_REVIEW",
      assigneeId: staff.id,
      version: 0,
    });

    const internalComment = await addComment(
      { id: staff.id, email: staff.email, name: staff.name, role: staff.role },
      complaint.id,
      { body: "Internal inspection notes for the crew", internal: true },
    );

    expect(internalComment.id).toBeTruthy();
    expect(internalComment.isInternal).toBe(true);
    expect(internalComment.authorId).toBe(staff.id);

    let updated = await prisma.complaint.findUnique({ where: { id: complaint.id } });
    expect(updated?.version).toBe(0);

    const publicComment = await addComment(
      { id: staff.id, email: staff.email, name: staff.name, role: staff.role },
      complaint.id,
      { body: "Your issue is being resolved today.", internal: false },
    );

    expect(publicComment.id).toBeTruthy();
    expect(publicComment.isInternal).toBe(false);
    expect(publicComment.authorId).toBe(staff.id);

    updated = await prisma.complaint.findUnique({ where: { id: complaint.id } });
    expect(updated?.version).toBe(0);

    const activities = await prisma.activity.findMany({
      where: { complaintId: complaint.id },
      orderBy: { createdAt: "asc" },
    });

    expect(activities).toHaveLength(2);
    expect(activities[0].action).toBe("COMMENTED");
    expect(activities[0].actorId).toBe(staff.id);
    expect(activities[0].metadata).toEqual({ internal: true });

    expect(activities[1].action).toBe("COMMENTED");
    expect(activities[1].actorId).toBe(staff.id);
    expect(activities[1].metadata).toEqual({ internal: false });
  });

  it("throws ForbiddenError when commenting on CLOSED complaint", async () => {
    const staff = await createUser({ role: "ADMIN" });
    const complaint = await createComplaint({
      status: "CLOSED",
      assigneeId: staff.id,
      version: 2,
    });

    await expect(
      addComment(
        { id: staff.id, email: staff.email, name: staff.name, role: staff.role },
        complaint.id,
        { body: "Attempt to comment on closed complaint", internal: true },
      ),
    ).rejects.toThrow(ForbiddenError);

    const comments = await prisma.comment.findMany({ where: { complaintId: complaint.id } });
    expect(comments).toHaveLength(0);

    const activities = await prisma.activity.findMany({ where: { complaintId: complaint.id } });
    expect(activities).toHaveLength(0);
  });

  it("throws NotFoundError when commenting on missing complaint", async () => {
    const staff = await createUser();

    await expect(
      addComment(
        { id: staff.id, email: staff.email, name: staff.name, role: staff.role },
        "non-existent-complaint-id",
        { body: "Comment text", internal: true },
      ),
    ).rejects.toThrow(NotFoundError);
  });
});
