import { NextResponse } from "next/server";
import { z } from "zod";
import { handle } from "@/lib/api/handler";
import { parseBody } from "@/lib/api/request";
import { addCommentSchema } from "@/lib/validation/complaint";
import { addComplainantComment } from "@/lib/services/public";
import { createRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/api/client-ip";
import { RateLimitError } from "@/lib/errors";

export const replyLimiter = createRateLimiter({ limit: 10, windowMs: 60 * 60 * 1000 });

const replySchema = z.object({
  body: addCommentSchema.shape.body,
});

interface RouteContext {
  params: Promise<{ token: string }>;
}

export const POST = handle<RouteContext>(async (req, ctx) => {
  const { token } = await ctx.params;
  const ip = getClientIp(req);

  const ipCheck = replyLimiter.check(`${token}:${ip}`);
  if (!ipCheck.ok) {
    throw new RateLimitError(ipCheck.retryAfterSeconds);
  }

  const { body } = await parseBody(replySchema, req);
  const result = await addComplainantComment(token, body);
  return NextResponse.json(result, { status: 201 });
});
