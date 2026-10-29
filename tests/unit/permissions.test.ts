import { describe, it, expect } from "vitest";
import {
  canClaim,
  canAssign,
  canChangeStatus,
  canComment,
  type Actor,
  type ComplaintState,
} from "@/lib/domain/permissions";

describe("Permissions", () => {
  const admin: Actor = { id: "admin1", role: "ADMIN" };
  const agentA: Actor = { id: "agentA", role: "AGENT" };
  const agentB: Actor = { id: "agentB", role: "AGENT" };

  describe("canClaim", () => {
    it("returns true for OPEN and unassigned complaint", () => {
      const complaint: ComplaintState = { status: "OPEN", assigneeId: null };
      expect(canClaim(agentA, complaint)).toBe(true);
      expect(canClaim(admin, complaint)).toBe(true);
    });

    it("returns false if complaint is already assigned", () => {
      const complaint: ComplaintState = { status: "OPEN", assigneeId: agentB.id };
      expect(canClaim(agentA, complaint)).toBe(false);
      expect(canClaim(admin, complaint)).toBe(false);
    });

    it("returns false if status is not OPEN", () => {
      const inReview: ComplaintState = { status: "IN_REVIEW", assigneeId: null };
      const resolved: ComplaintState = { status: "RESOLVED", assigneeId: null };
      const closed: ComplaintState = { status: "CLOSED", assigneeId: null };
      const rejected: ComplaintState = { status: "REJECTED", assigneeId: null };

      expect(canClaim(agentA, inReview)).toBe(false);
      expect(canClaim(agentA, resolved)).toBe(false);
      expect(canClaim(agentA, closed)).toBe(false);
      expect(canClaim(agentA, rejected)).toBe(false);
    });
  });

  describe("canAssign", () => {
    it("returns true for admin on OPEN", () => {
      const complaint: ComplaintState = { status: "OPEN", assigneeId: null };
      expect(canAssign(admin, complaint)).toBe(true);
    });

    it("returns false for agent", () => {
      const complaint: ComplaintState = { status: "OPEN", assigneeId: null };
      expect(canAssign(agentA, complaint)).toBe(false);
      expect(canAssign(agentB, complaint)).toBe(false);
    });

    it("returns false for admin on CLOSED", () => {
      const complaint: ComplaintState = { status: "CLOSED", assigneeId: agentA.id };
      expect(canAssign(admin, complaint)).toBe(false);
    });
  });

  describe("canChangeStatus", () => {
    it("returns true for assignee", () => {
      const complaint: ComplaintState = { status: "IN_REVIEW", assigneeId: agentA.id };
      expect(canChangeStatus(agentA, complaint, "RESOLVED")).toBe(true);
    });

    it("returns false for other agent", () => {
      const complaint: ComplaintState = { status: "IN_REVIEW", assigneeId: agentA.id };
      expect(canChangeStatus(agentB, complaint, "RESOLVED")).toBe(false);
    });

    it("returns true for admin on non-terminal status", () => {
      const complaint: ComplaintState = { status: "IN_REVIEW", assigneeId: agentA.id };
      expect(canChangeStatus(admin, complaint, "RESOLVED")).toBe(true);
    });

    it("allows reopen (RESOLVED -> IN_REVIEW) for admin but forbids for assignee agent", () => {
      const complaint: ComplaintState = { status: "RESOLVED", assigneeId: agentA.id };
      expect(canChangeStatus(admin, complaint, "IN_REVIEW")).toBe(true);
      expect(canChangeStatus(agentA, complaint, "IN_REVIEW")).toBe(false);
    });

    it("returns false for everything on CLOSED", () => {
      const complaint: ComplaintState = { status: "CLOSED", assigneeId: agentA.id };
      expect(canChangeStatus(admin, complaint, "OPEN")).toBe(false);
      expect(canChangeStatus(admin, complaint, "IN_REVIEW")).toBe(false);
      expect(canChangeStatus(agentA, complaint, "OPEN")).toBe(false);
      expect(canChangeStatus(agentA, complaint, "IN_REVIEW")).toBe(false);
    });
  });

  describe("canComment", () => {
    it("returns true for IN_REVIEW", () => {
      const complaint: ComplaintState = { status: "IN_REVIEW", assigneeId: agentA.id };
      expect(canComment(agentA, complaint)).toBe(true);
      expect(canComment(agentB, complaint)).toBe(true);
      expect(canComment(admin, complaint)).toBe(true);
    });

    it("returns false for CLOSED", () => {
      const complaint: ComplaintState = { status: "CLOSED", assigneeId: agentA.id };
      expect(canComment(agentA, complaint)).toBe(false);
      expect(canComment(agentB, complaint)).toBe(false);
      expect(canComment(admin, complaint)).toBe(false);
    });
  });
});
