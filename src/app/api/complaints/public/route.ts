import { NextResponse } from "next/server";
import { handle } from "@/lib/api/handler";
import { parseBody } from "@/lib/api/request";
import { createComplaintSchema } from "@/lib/validation/complaint";
import { createComplaint } from "@/lib/services/complaints";

export const POST = handle(async (req) => {
  const input = await parseBody(createComplaintSchema, req);
  const result = await createComplaint(input);
  return NextResponse.json(result, { status: 201 });
});
