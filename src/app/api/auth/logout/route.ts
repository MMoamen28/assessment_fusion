import { NextResponse } from "next/server";
import { handle } from "@/lib/api/handler";
import { readSessionCookie, clearSessionCookie } from "@/lib/auth/cookie";
import { deleteSession } from "@/lib/auth/session";

export const POST = handle(async () => {
  const token = await readSessionCookie();
  if (token) {
    await deleteSession(token);
  }
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
});
