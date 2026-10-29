import { NextResponse } from "next/server";
import { handle } from "@/lib/api/handler";
import { parseBody } from "@/lib/api/request";
import { requireUser } from "@/lib/auth/current-user";
import { validateComplaintId, assignSchema } from "@/lib/validation/complaint";
import { assignComplaint } from "@/lib/services/complaints";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const POST = handle<RouteContext>(async (req, ctx) => {
  const actor = await requireUser();
  const { id } = await ctx.params;
  const validatedId = validateComplaintId(id);
  const body = await parseBody(assignSchema, req);
  const result = await assignComplaint(actor, validatedId, body.assigneeId, body.expectedVersion);
  return NextResponse.json(result);
});
