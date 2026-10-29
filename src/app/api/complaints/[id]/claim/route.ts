import { NextResponse } from "next/server";
import { handle } from "@/lib/api/handler";
import { requireUser } from "@/lib/auth/current-user";
import { validateComplaintId } from "@/lib/validation/complaint";
import { claimComplaint } from "@/lib/services/complaints";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const POST = handle<RouteContext>(async (_req, ctx) => {
  const actor = await requireUser();
  const { id } = await ctx.params;
  const validatedId = validateComplaintId(id);
  const result = await claimComplaint(actor, validatedId);
  return NextResponse.json(result);
});
