import { readSessionCookie } from "./cookie";
import { getSessionUser, type SessionUser } from "./session";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";

export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = await readSessionCookie();
  if (!token) {
    return null;
  }
  return getSessionUser(token);
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthorizedError();
  }
  return user;
}

export async function requireStaff(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role === "CUSTOMER") {
    throw new ForbiddenError("Staff access required");
  }
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new ForbiddenError();
  }
  return user;
}
