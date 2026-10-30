import { NextResponse } from "next/server";
import { handle } from "@/lib/api/handler";
import { parseBody } from "@/lib/api/request";
import { createComplaintSchema } from "@/lib/validation/complaint";
import { createComplaint } from "@/lib/services/complaints";
import { createRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/api/client-ip";
import { RateLimitError } from "@/lib/errors";

export const publicSubmitLimiter = createRateLimiter({ limit: 5, windowMs: 60 * 60 * 1000 });

export const POST = handle(async (req) => {
  const ip = getClientIp(req);
  const ipCheck = publicSubmitLimiter.check(ip);
  if (!ipCheck.ok) {
    throw new RateLimitError(ipCheck.retryAfterSeconds);
  }

  const input = await parseBody(createComplaintSchema, req);
  const result = await createComplaint(input);
  return NextResponse.json(result, { status: 201 });
});
