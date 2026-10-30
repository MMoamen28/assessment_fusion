import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, RateLimitError } from "@/lib/errors";

type RouteHandler<Ctx> = (req: Request, ctx: Ctx) => Promise<Response>;

function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: unknown,
  headers?: HeadersInit,
) {
  return NextResponse.json(
    { error: { code, message, details: details ?? null } },
    { status, headers },
  );
}

export function handle<Ctx = unknown>(fn: RouteHandler<Ctx>): RouteHandler<Ctx> {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      if (err instanceof RateLimitError) {
        const retryAfter =
          typeof err.details === "object" && err.details && "retryAfterSeconds" in err.details
            ? String((err.details as { retryAfterSeconds: number }).retryAfterSeconds)
            : "60";
        return errorResponse(
          err.status,
          err.code,
          err.message,
          err.details,
          { "Retry-After": retryAfter },
        );
      }
      if (err instanceof AppError) {
        return errorResponse(err.status, err.code, err.message, err.details);
      }
      if (err instanceof ZodError) {
        const details = err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
        return errorResponse(400, "VALIDATION_ERROR", "Invalid input", details);
      }
      console.error("Unhandled error:", err);
      return errorResponse(500, "INTERNAL_ERROR", "Something went wrong");
    }
  };
}
