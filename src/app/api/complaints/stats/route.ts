import { NextResponse } from "next/server";
import { handle } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/current-user";
import { getStats } from "@/lib/services/complaints";

export const GET = handle(async () => {
  await requireUser();
  const stats = await getStats();
  return NextResponse.json(stats);
});
