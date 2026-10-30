import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, createUser, createComplaint as createDbComplaint } from "../helpers/db";
import { prisma } from "@/lib/db";
import { createComplaint } from "@/lib/services/complaints";
import { getPublicComplaint, lookupPublicToken } from "@/lib/services/public";
import { NotFoundError } from "@/lib/errors";

describe("Public Complaint & Lookup Integration", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("creates complaint with valid reference, publicToken, CREATED activity, and null actor", async () => {
    const result = await createComplaint({
      title: "Broken Streetlight",
      description: "Streetlight has been flickering for three days continuously",
      category: "Service",
      submitterName: "John Citizen",
      submitterEmail: "john.citizen@example.com",
    });

    expect(result.reference).toMatch(/^CMP-[A-Z2-9]{6}$/);
    expect(result.publicToken).toBeTruthy();

    const inDb = await prisma.complaint.findUnique({
      where: { reference: result.reference },
    });

    expect(inDb).not.toBeNull();
    expect(inDb?.status).toBe("OPEN");
    expect(inDb?.priority).toBe("MEDIUM");
    expect(inDb?.version).toBe(0);
    expect(inDb?.assigneeId).toBeNull();

    const activities = await prisma.activity.findMany({
      where: { complaintId: inDb!.id },
    });

    expect(activities).toHaveLength(1);
    expect(activities[0].action).toBe("CREATED");
    expect(activities[0].actorId).toBeNull();
  });

  it("whitelists public DTO and excludes all submitter, assignee, internal, and actor info", async () => {
    const sensitiveName = "Sensitive Submitter Name";
    const sensitiveEmail = "sensitive.submitter@classified.org";
    const staffName = "Top Secret Agent Bob";
    const internalSecret = "Internal secret investigation findings 999";
    const publicCommentBody = "We have dispatched a repair team to your location.";

    const staff = await createUser({
      name: staffName,
      email: "staff.bob@example.com",
    });

    const complaint = await createDbComplaint({
      title: "Public Water Leak Title",
      description: "Public description of the burst water pipe on Main St",
      category: "Utilities",
      submitterName: sensitiveName,
      submitterEmail: sensitiveEmail,
      assigneeId: staff.id,
      version: 3,
    });

    await prisma.comment.create({
      data: {
        complaintId: complaint.id,
        authorId: staff.id,
        body: internalSecret,
        isInternal: true,
      },
    });

    await prisma.comment.create({
      data: {
        complaintId: complaint.id,
        authorId: staff.id,
        body: publicCommentBody,
        isInternal: false,
      },
    });

    await prisma.activity.create({
      data: {
        complaintId: complaint.id,
        actorId: null,
        action: "CREATED",
      },
    });

    await prisma.activity.create({
      data: {
        complaintId: complaint.id,
        actorId: staff.id,
        action: "STATUS_CHANGED",
        metadata: { from: "OPEN", to: "IN_REVIEW" },
      },
    });

    const dto = await getPublicComplaint(complaint.publicToken);
    const json = JSON.stringify(dto);

    expect(json).not.toContain(sensitiveName);
    expect(json).not.toContain(sensitiveEmail);
    expect(json).not.toContain(staffName);
    expect(json).not.toContain(internalSecret);
    expect(json).not.toContain("passwordHash");
    expect(json).not.toContain(complaint.id);
    expect(json).not.toContain(staff.id);
    expect(json).not.toContain('"version"');
    expect(json).not.toContain('"assignee"');
    expect(json).not.toContain('"assigneeId"');

    expect(dto.comments).toHaveLength(1);
    expect(dto.comments[0].body).toBe(publicCommentBody);
    expect(dto.comments[0].authorRole).toBe("Support team");

    expect(dto.timeline).toHaveLength(2);
    expect(dto.timeline[0].status).toBe("OPEN");
    expect(dto.timeline[1].status).toBe("IN_REVIEW");
  });

  it("throws NotFoundError on unknown publicToken", async () => {
    await expect(getPublicComplaint("non-existent-public-token")).rejects.toThrow(NotFoundError);
  });

  it("looks up publicToken case-insensitively, and returns identical errors on invalid input", async () => {
    const complaint = await createDbComplaint({
      submitterEmail: "citizen@example.com",
    });

    const success = await lookupPublicToken(
      complaint.reference.toLowerCase(),
      "CITIZEN@EXAMPLE.COM",
    );
    expect(success.publicToken).toBe(complaint.publicToken);

    let wrongEmailError: NotFoundError | undefined;
    try {
      await lookupPublicToken(complaint.reference, "wrong@example.com");
    } catch (err) {
      wrongEmailError = err as NotFoundError;
    }

    let wrongRefError: NotFoundError | undefined;
    try {
      await lookupPublicToken("CMP-999999", complaint.submitterEmail);
    } catch (err) {
      wrongRefError = err as NotFoundError;
    }

    expect(wrongEmailError).toBeInstanceOf(NotFoundError);
    expect(wrongRefError).toBeInstanceOf(NotFoundError);
    expect(wrongEmailError?.message).toBe(wrongRefError?.message);
  });
});
