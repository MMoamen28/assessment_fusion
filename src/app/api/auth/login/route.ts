import { NextResponse } from "next/server";
import { handle } from "@/lib/api/handler";
import { parseBody } from "@/lib/api/request";
import { loginSchema } from "@/lib/validation/auth";
import { authenticate } from "@/lib/auth/authenticate";
import { createSession } from "@/lib/auth/session";
import { setSessionCookie } from "@/lib/auth/cookie";

export const POST = handle(async (req) => {
  const { email, password } = await parseBody(loginSchema, req);
  const user = await authenticate(email, password);
  const { token, expiresAt } = await createSession(user.id);
  await setSessionCookie(token, expiresAt);
  return NextResponse.json({ user });
});
