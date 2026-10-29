import { hashSync } from "bcryptjs";
import { prisma } from "@/lib/db";
import { verifyPassword } from "./password";
import { UnauthorizedError } from "@/lib/errors";
import type { Role } from "@prisma/client";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

const DUMMY_HASH = hashSync("dummy-password-timing-defense", 10);

export async function authenticate(email: string, password: string): Promise<AuthUser> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  const hashToCompare = user ? user.passwordHash : DUMMY_HASH;
  const isMatch = await verifyPassword(password, hashToCompare);

  if (!user || !isMatch) {
    throw new UnauthorizedError("Invalid email or password");
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}
