import { NextResponse } from "next/server";
import { handle } from "@/lib/api/handler";
import { parseQuery, parseBody } from "@/lib/api/request";
import { requireStaff } from "@/lib/auth/current-user";
import { listQuerySchema, createStaffComplaintSchema } from "@/lib/validation/complaint";
import { listComplaints, createComplaint } from "@/lib/services/complaints";

export const GET = handle(async (req) => {
  const actor = await requireStaff();
  const query = parseQuery(listQuerySchema, req);
  const result = await listComplaints(query, actor);
  return NextResponse.json(result);
});

export const POST = handle(async (req) => {
  const actor = await requireStaff();
  const input = await parseBody(createStaffComplaintSchema, req);
  const result = await createComplaint({ input, actor, channel: "staff" });
  return NextResponse.json(result, { status: 201 });
});
