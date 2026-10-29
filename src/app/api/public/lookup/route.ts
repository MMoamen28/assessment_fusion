import { NextResponse } from "next/server";
import { handle } from "@/lib/api/handler";
import { parseBody } from "@/lib/api/request";
import { lookupSchema } from "@/lib/validation/complaint";
import { lookupPublicToken } from "@/lib/services/public";

export const POST = handle(async (req) => {
  const input = await parseBody(lookupSchema, req);
  const result = await lookupPublicToken(input.reference, input.email);
  return NextResponse.json(result);
});
