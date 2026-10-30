import { NextResponse } from "next/server";
import { handle } from "@/lib/api/handler";
import { parseBody } from "@/lib/api/request";
import { loginSchema } from "@/lib/validation/auth";
import { authenticate } from "@/lib/auth/authenticate";
import { createSession } from "@/lib/auth/session";
import { setSessionCookie } from "@/lib/auth/cookie";
import { createRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/api/client-ip";
import { RateLimitError } from "@/lib/errors";

export const loginIpLimiter = createRateLimiter({ limit: 40, windowMs: 15 * 60 * 1000 });
export const loginIpEmailLimiter = createRateLimiter({ limit: 10, windowMs: 15 * 60 * 1000 });

export const POST = handle(async (req) => {
  const ip = getClientIp(req);

  const ipCheck = loginIpLimiter.check(ip);
  if (!ipCheck.ok) {
    throw new RateLimitError(ipCheck.retryAfterSeconds);
  }

  const { email, password } = await parseBody(loginSchema, req);

  const emailCheck = loginIpEmailLimiter.check(`${ip}:${email.trim().toLowerCase()}`);
  if (!emailCheck.ok) {
    throw new RateLimitError(emailCheck.retryAfterSeconds);
  }

  const user = await authenticate(email, password);
  const { token, expiresAt } = await createSession(user.id);
  await setSessionCookie(token, expiresAt);
  return NextResponse.json({ user });
});
