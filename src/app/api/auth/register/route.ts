import { NextResponse } from "next/server";
import { handle } from "@/lib/api/handler";
import { parseBody } from "@/lib/api/request";
import { registerSchema } from "@/lib/validation/auth";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { setSessionCookie } from "@/lib/auth/cookie";
import { createRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/api/client-ip";
import { RateLimitError, ConflictError } from "@/lib/errors";
import { prisma } from "@/lib/db";

export const registerIpLimiter = createRateLimiter({ limit: 15, windowMs: 15 * 60 * 1000 });

export const POST = handle(async (req) => {
  const ip = getClientIp(req);

  const ipCheck = registerIpLimiter.check(ip);
  if (!ipCheck.ok) {
    throw new RateLimitError(ipCheck.retryAfterSeconds);
  }

  const { name, email, password } = await parseBody(registerSchema, req);
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (existing) {
    throw new ConflictError("An account with this email address already exists");
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: "CUSTOMER",
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  const { token, expiresAt } = await createSession(user.id);
  await setSessionCookie(token, expiresAt);

  return NextResponse.json({ user }, { status: 201 });
});
