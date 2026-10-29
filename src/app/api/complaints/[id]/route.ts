import { NextResponse } from "next/server";
import { handle } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/current-user";
import { validateComplaintId } from "@/lib/validation/complaint";
import { getComplaintDetail } from "@/lib/services/complaints";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const GET = handle<RouteContext>(async (_req, ctx) => {
  await requireUser();
  const { id } = await ctx.params;
  const validatedId = validateComplaintId(id);
  const result = await getComplaintDetail(validatedId);
  return NextResponse.json(result);
});
