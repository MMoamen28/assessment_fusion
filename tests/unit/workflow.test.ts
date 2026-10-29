import { describe, it, expect } from "vitest";
import type { Status } from "@prisma/client";
import { checkTransition } from "@/lib/domain/workflow";

describe("Workflow checkTransition", () => {
  const allowedTransitions: [Status, Status][] = [
    ["OPEN", "IN_REVIEW"],
    ["OPEN", "REJECTED"],
    ["IN_REVIEW", "RESOLVED"],
    ["IN_REVIEW", "REJECTED"],
    ["RESOLVED", "CLOSED"],
    ["RESOLVED", "IN_REVIEW"],
  ];

  it.each(allowedTransitions)(
    "allows transition from %s to %s when hasAssignee is true",
    (from, to) => {
      const result = checkTransition(from, to, { hasAssignee: true });
      expect(result.ok).toBe(true);
    },
  );

  const forbiddenTransitions: [Status, Status][] = [
    ["OPEN", "RESOLVED"],
    ["OPEN", "CLOSED"],
    ["IN_REVIEW", "OPEN"],
    ["IN_REVIEW", "CLOSED"],
    ["CLOSED", "IN_REVIEW"],
    ["CLOSED", "OPEN"],
    ["REJECTED", "IN_REVIEW"],
    ["REJECTED", "OPEN"],
  ];

  it.each(forbiddenTransitions)(
    "forbids transition from %s to %s",
    (from, to) => {
      const result = checkTransition(from, to, { hasAssignee: true });
      expect(result.ok).toBe(false);
    },
  );

  it("forbids no-op transition OPEN -> OPEN", () => {
    const result = checkTransition("OPEN", "OPEN", { hasAssignee: true });
    expect(result.ok).toBe(false);
  });

  it("forbids transition OPEN -> IN_REVIEW when hasAssignee is false", () => {
    const result = checkTransition("OPEN", "IN_REVIEW", { hasAssignee: false });
    expect(result.ok).toBe(false);
  });
});
