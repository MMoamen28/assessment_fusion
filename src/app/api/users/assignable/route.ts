import { NextResponse } from "next/server";
import { handle } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth/current-user";
import { getAssignableUsers } from "@/lib/services/complaints";

export const GET = handle(async () => {
  await requireAdmin();
  const users = await getAssignableUsers();
  return NextResponse.json(users);
});
