import type { Role, Status } from "@prisma/client";
import { isTerminal } from "./workflow";

export interface Actor { id: string; role: Role }
export interface ComplaintState { status: Status; assigneeId: string | null }

export const isStaff = (a: Actor) => a.role === "ADMIN" || a.role === "AGENT";
export const isAdmin = (a: Actor) => a.role === "ADMIN";

export function canClaim(actor: Actor, c: ComplaintState): boolean {
  return isStaff(actor) && c.status === "OPEN" && c.assigneeId === null;
}

export function canAssign(actor: Actor, c: ComplaintState): boolean {
  return isAdmin(actor) && !isTerminal(c.status);
}

export function canChangeStatus(actor: Actor, c: ComplaintState, to: Status): boolean {
  if (!isStaff(actor)) return false;
  if (isTerminal(c.status)) return false;
  if (c.status === "RESOLVED" && to === "IN_REVIEW") return isAdmin(actor);
  if (isAdmin(actor)) return true;
  return c.assigneeId === actor.id;
}

export function canChangePriority(actor: Actor, c: ComplaintState): boolean {
  if (!isStaff(actor)) return false;
  if (isTerminal(c.status)) return false;
  if (isAdmin(actor)) return true;
  return c.assigneeId === actor.id;
}

export function canComment(actor: Actor, c: ComplaintState): boolean {
  return isStaff(actor) && c.status !== "CLOSED";
}
