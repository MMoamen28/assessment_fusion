import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, createUser, createComplaint } from "../helpers/db";
import { prisma } from "@/lib/db";
import { addComplainantComment, getPublicComplaint } from "@/lib/services/public";
import { NotFoundError, ConflictError } from "@/lib/errors";
import { ZodError } from "zod";

describe("Complainant Reply Integration", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("creates comment with authorId null and isInternal false, writes COMMENTED activity, leaves version unchanged", async () => {
    const complaint = await createComplaint({
      status: "IN_REVIEW",
      version: 2,
    });

    const reply = await addComplainantComment(
      complaint.publicToken,
      "Here is the additional information you requested.",
    );

    expect(reply.body).toBe("Here is the additional information you requested.");
    expect(reply.authorRole).toBe("Complainant");

    // Verify comment row in DB
    const comments = await prisma.comment.findMany({
      where: { complaintId: complaint.id },
    });
    expect(comments).toHaveLength(1);
    expect(comments[0].authorId).toBeNull();
    expect(comments[0].isInternal).toBe(false);
    expect(comments[0].body).toBe("Here is the additional information you requested.");

    // Verify complaint version is unchanged
    const inDb = await prisma.complaint.findUnique({ where: { id: complaint.id } });
    expect(inDb?.version).toBe(2);

    // Verify activity row in DB
    const activities = await prisma.activity.findMany({
      where: { complaintId: complaint.id, action: "COMMENTED" },
    });
    expect(activities).toHaveLength(1);
    expect(activities[0].actorId).toBeNull();
    expect(activities[0].metadata).toEqual({ internal: false, by: "complainant" });
  });

  it("throws NotFoundError on unknown publicToken", async () => {
    await expect(
      addComplainantComment("non-existent-token", "Hello"),
    ).rejects.toThrow(NotFoundError);
  });

  it("blocks replies on CLOSED complaints with ConflictError", async () => {
    const complaint = await createComplaint({
      status: "CLOSED",
      version: 3,
    });

    await expect(
      addComplainantComment(complaint.publicToken, "Trying to reply to closed"),
    ).rejects.toThrow(ConflictError);
    await expect(
      addComplainantComment(complaint.publicToken, "Trying to reply to closed"),
    ).rejects.toThrow("This complaint is closed and no longer accepts replies");
  });

  it("blocks replies on REJECTED complaints with ConflictError", async () => {
    const complaint = await createComplaint({
      status: "REJECTED",
      version: 1,
    });

    await expect(
      addComplainantComment(complaint.publicToken, "Trying to reply to rejected"),
    ).rejects.toThrow(ConflictError);
    await expect(
      addComplainantComment(complaint.publicToken, "Trying to reply to rejected"),
    ).rejects.toThrow("This complaint is closed and no longer accepts replies");
  });

  it("rejects empty body and body exceeding 2000 characters", async () => {
    const complaint = await createComplaint({ status: "IN_REVIEW" });

    // Empty or whitespace-only body
    await expect(
      addComplainantComment(complaint.publicToken, ""),
    ).rejects.toThrow(ZodError);

    await expect(
      addComplainantComment(complaint.publicToken, "   "),
    ).rejects.toThrow(ZodError);

    // 2001 chars body
    const tooLong = "a".repeat(2001);
    await expect(
      addComplainantComment(complaint.publicToken, tooLong),
    ).rejects.toThrow(ZodError);
  });

  it("public DTO labels reply as 'Complainant', staff comment as 'Support team', and hides internal comment", async () => {
    const staff = await createUser({ role: "AGENT" });
    const complaint = await createComplaint({ status: "IN_REVIEW" });

    // 1. Staff internal comment
    await prisma.comment.create({
      data: {
        complaintId: complaint.id,
        authorId: staff.id,
        body: "Staff internal note",
        isInternal: true,
      },
    });

    // 2. Staff public comment
    await prisma.comment.create({
      data: {
        complaintId: complaint.id,
        authorId: staff.id,
        body: "Staff public response",
        isInternal: false,
      },
    });

    // 3. Complainant reply
    await addComplainantComment(complaint.publicToken, "Complainant follow up");

    const dto = await getPublicComplaint(complaint.publicToken);

    // Only 2 public comments should be in DTO
    expect(dto.comments).toHaveLength(2);

    expect(dto.comments[0].body).toBe("Staff public response");
    expect(dto.comments[0].authorRole).toBe("Support team");

    expect(dto.comments[1].body).toBe("Complainant follow up");
    expect(dto.comments[1].authorRole).toBe("Complainant");

    // Internal comment must not be exposed
    const allBodies = dto.comments.map((c) => c.body);
    expect(allBodies).not.toContain("Staff internal note");
  });
});
