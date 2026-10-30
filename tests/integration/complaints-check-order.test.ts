import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, createUser, createComplaint } from "../helpers/db";
import { assignComplaint, changeStatus, changePriority } from "@/lib/services/complaints";
import { ForbiddenError, ConflictError, InvalidTransitionError } from "@/lib/errors";

describe("Complaints Check Order Integration", () => {
  beforeEach(async () => {
    await resetDb();
  });

  describe("assignComplaint check order", () => {
    it("(a) unauthorized actor + stale version => ForbiddenError, not ConflictError", async () => {
      const agent = await createUser({ role: "AGENT" });
      const targetAgent = await createUser({ role: "AGENT" });
      const complaint = await createComplaint({
        status: "OPEN",
        version: 1,
      });

      await expect(
        assignComplaint(
          { id: agent.id, email: agent.email, name: agent.name, role: agent.role },
          complaint.id,
          targetAgent.id,
          999, // Stale version
        ),
      ).rejects.toThrow(ForbiddenError);
    });

    it("(b) authorized actor + stale version => ConflictError", async () => {
      const admin = await createUser({ role: "ADMIN" });
      const targetAgent = await createUser({ role: "AGENT" });
      const complaint = await createComplaint({
        status: "OPEN",
        version: 1,
      });

      await expect(
        assignComplaint(
          { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
          complaint.id,
          targetAgent.id,
          999, // Stale version
        ),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("changeStatus check order", () => {
    it("(a) unauthorized actor + stale version => ForbiddenError, not ConflictError", async () => {
      const assignee = await createUser({ role: "AGENT" });
      const nonAssignee = await createUser({ role: "AGENT" });
      const complaint = await createComplaint({
        status: "IN_REVIEW",
        assigneeId: assignee.id,
        version: 2,
      });

      await expect(
        changeStatus(
          { id: nonAssignee.id, email: nonAssignee.email, name: nonAssignee.name, role: nonAssignee.role },
          complaint.id,
          { status: "RESOLVED", expectedVersion: 999 }, // Stale version
        ),
      ).rejects.toThrow(ForbiddenError);
    });

    it("(b) authorized actor + stale version => ConflictError", async () => {
      const assignee = await createUser({ role: "AGENT" });
      const complaint = await createComplaint({
        status: "IN_REVIEW",
        assigneeId: assignee.id,
        version: 2,
      });

      await expect(
        changeStatus(
          { id: assignee.id, email: assignee.email, name: assignee.name, role: assignee.role },
          complaint.id,
          { status: "RESOLVED", expectedVersion: 999 }, // Stale version
        ),
      ).rejects.toThrow(ConflictError);
    });

    it("(c) authorized + current version + invalid transition => InvalidTransitionError", async () => {
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
          { status: "RESOLVED", expectedVersion: 0 }, // Current version, but OPEN -> RESOLVED is invalid
        ),
      ).rejects.toThrow(InvalidTransitionError);
    });
  });

  describe("changePriority check order", () => {
    it("(a) unauthorized actor + stale version => ForbiddenError, not ConflictError", async () => {
      const assignee = await createUser({ role: "AGENT" });
      const nonAssignee = await createUser({ role: "AGENT" });
      const complaint = await createComplaint({
        status: "IN_REVIEW",
        priority: "LOW",
        assigneeId: assignee.id,
        version: 1,
      });

      await expect(
        changePriority(
          { id: nonAssignee.id, email: nonAssignee.email, name: nonAssignee.name, role: nonAssignee.role },
          complaint.id,
          { priority: "HIGH", expectedVersion: 999 }, // Stale version
        ),
      ).rejects.toThrow(ForbiddenError);
    });

    it("(b) authorized actor + stale version => ConflictError", async () => {
      const assignee = await createUser({ role: "AGENT" });
      const complaint = await createComplaint({
        status: "IN_REVIEW",
        priority: "LOW",
        assigneeId: assignee.id,
        version: 1,
      });

      await expect(
        changePriority(
          { id: assignee.id, email: assignee.email, name: assignee.name, role: assignee.role },
          complaint.id,
          { priority: "HIGH", expectedVersion: 999 }, // Stale version
        ),
      ).rejects.toThrow(ConflictError);
    });
  });
});
