import { NextResponse } from "next/server";
import { handle } from "@/lib/api/handler";
import { getPublicComplaint } from "@/lib/services/public";

interface RouteContext {
  params: Promise<{ token: string }>;
}

export const GET = handle<RouteContext>(async (_req, ctx) => {
  const { token } = await ctx.params;
  const result = await getPublicComplaint(token);
  return NextResponse.json(result);
});
