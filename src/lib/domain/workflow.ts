import type { Status } from "@prisma/client";

export const TRANSITIONS: Record<Status, readonly Status[]> = {
  OPEN: ["IN_REVIEW", "REJECTED"],
  IN_REVIEW: ["RESOLVED", "REJECTED"],
  RESOLVED: ["CLOSED", "IN_REVIEW"],
  CLOSED: [],
  REJECTED: [],
};

export const TERMINAL_STATUSES: readonly Status[] = ["CLOSED", "REJECTED"];

export function isTerminal(status: Status): boolean {
  return TERMINAL_STATUSES.includes(status);
}

export type TransitionCheck = { ok: true } | { ok: false; reason: string };

export function checkTransition(
  from: Status,
  to: Status,
  ctx: { hasAssignee: boolean },
): TransitionCheck {
  if (from === to) return { ok: false, reason: `Complaint is already ${from}` };
  if (!TRANSITIONS[from].includes(to)) {
    return { ok: false, reason: `Cannot move from ${from} to ${to}` };
  }
  if (to === "IN_REVIEW" && !ctx.hasAssignee) {
    return { ok: false, reason: "A complaint must be assigned before it can be reviewed" };
  }
  return { ok: true };
}
