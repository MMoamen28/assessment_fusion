import type { Role, Status } from "@prisma/client";
import { isTerminal } from "./workflow";

export interface Actor { id: string; role: Role }
export interface ComplaintState { status: Status; assigneeId: string | null }

const isAdmin = (a: Actor) => a.role === "ADMIN";

/** Any staff member may claim, but only an open, unassigned complaint. */
export function canClaim(_actor: Actor, c: ComplaintState): boolean {
  return c.status === "OPEN" && c.assigneeId === null;
}

/** Only admins assign/reassign, and never on a finished complaint. */
export function canAssign(actor: Actor, c: ComplaintState): boolean {
  return isAdmin(actor) && !isTerminal(c.status);
}

/** Assignee or admin may change status. Reopening (RESOLVED -> IN_REVIEW) is admin-only. */
export function canChangeStatus(actor: Actor, c: ComplaintState, to: Status): boolean {
  if (isTerminal(c.status)) return false;
  if (c.status === "RESOLVED" && to === "IN_REVIEW") return isAdmin(actor);
  if (isAdmin(actor)) return true;
  return c.assigneeId === actor.id;
}

/** Any staff member can comment unless the complaint is CLOSED. */
export function canComment(_actor: Actor, c: ComplaintState): boolean {
  return c.status !== "CLOSED";
}
