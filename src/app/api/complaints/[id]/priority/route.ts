import { NextResponse } from "next/server";
import { handle } from "@/lib/api/handler";
import { parseBody } from "@/lib/api/request";
import { requireStaff } from "@/lib/auth/current-user";
import { validateComplaintId, changePrioritySchema } from "@/lib/validation/complaint";
import { changePriority } from "@/lib/services/complaints";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export const POST = handle<RouteContext>(async (req, ctx) => {
  const actor = await requireStaff();
  const { id } = await ctx.params;
  const validatedId = validateComplaintId(id);
  const body = await parseBody(changePrioritySchema, req);
  const result = await changePriority(actor, validatedId, body);
  return NextResponse.json(result);
});
