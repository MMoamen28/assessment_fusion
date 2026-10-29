import { NextResponse } from "next/server";
import { handle } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/current-user";

export const GET = handle(async () => {
  const user = await requireUser();
  return NextResponse.json({ user });
});
