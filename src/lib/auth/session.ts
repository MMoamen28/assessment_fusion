import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import type { Role } from "@prisma/client";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_HOURS * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      id: hashToken(token),
      userId,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function getSessionUser(token: string): Promise<SessionUser | null> {
  const hashedId = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { id: hashedId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: hashedId } }).catch(() => null);
    return null;
  }

  return session.user;
}

export async function deleteSession(token: string): Promise<void> {
  const hashedId = hashToken(token);
  await prisma.session.deleteMany({
    where: { id: hashedId },
  });
}
