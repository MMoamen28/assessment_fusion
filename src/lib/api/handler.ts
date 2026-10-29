import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors";

type RouteHandler<Ctx> = (req: Request, ctx: Ctx) => Promise<Response>;

function errorResponse(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export function handle<Ctx = unknown>(fn: RouteHandler<Ctx>): RouteHandler<Ctx> {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
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
