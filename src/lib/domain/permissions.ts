import type { Role, Status } from "@prisma/client";
import { isTerminal } from "./workflow";

export interface Actor { id: string; role: Role }
export interface ComplaintState { status: Status; assigneeId: string | null }

const isAdmin = (a: Actor) => a.role === "ADMIN";

export function canClaim(_actor: Actor, c: ComplaintState): boolean {
  return c.status === "OPEN" && c.assigneeId === null;
}

export function canAssign(actor: Actor, c: ComplaintState): boolean {
  return isAdmin(actor) && !isTerminal(c.status);
}

export function canChangeStatus(actor: Actor, c: ComplaintState, to: Status): boolean {
  if (isTerminal(c.status)) return false;
  if (c.status === "RESOLVED" && to === "IN_REVIEW") return isAdmin(actor);
  if (isAdmin(actor)) return true;
  return c.assigneeId === actor.id;
}

export function canChangePriority(actor: Actor, c: ComplaintState): boolean {
  if (isTerminal(c.status)) return false;
  if (isAdmin(actor)) return true;
  return c.assigneeId === actor.id;
}

export function canComment(_actor: Actor, c: ComplaintState): boolean {
  return c.status !== "CLOSED";
}

