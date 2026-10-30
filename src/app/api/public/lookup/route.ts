import { NextResponse } from "next/server";
import { handle } from "@/lib/api/handler";
import { parseBody } from "@/lib/api/request";
import { lookupSchema } from "@/lib/validation/complaint";
import { lookupPublicToken } from "@/lib/services/public";
import { createRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/api/client-ip";
import { RateLimitError } from "@/lib/errors";

export const lookupLimiter = createRateLimiter({ limit: 10, windowMs: 15 * 60 * 1000 });

export const POST = handle(async (req) => {
  const ip = getClientIp(req);
  const ipCheck = lookupLimiter.check(ip);
  if (!ipCheck.ok) {
    throw new RateLimitError(ipCheck.retryAfterSeconds);
  }

  const input = await parseBody(lookupSchema, req);
  const result = await lookupPublicToken(input.reference, input.email);
  return NextResponse.json(result);
});
