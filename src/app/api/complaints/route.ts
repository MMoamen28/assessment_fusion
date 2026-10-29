import { NextResponse } from "next/server";
import { handle } from "@/lib/api/handler";
import { parseQuery } from "@/lib/api/request";
import { requireUser } from "@/lib/auth/current-user";
import { listQuerySchema } from "@/lib/validation/complaint";
import { listComplaints } from "@/lib/services/complaints";

export const GET = handle(async (req) => {
  const actor = await requireUser();
  const query = parseQuery(listQuerySchema, req);
  const result = await listComplaints(query, actor);
  return NextResponse.json(result);
});
