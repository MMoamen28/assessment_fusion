import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(): Promise<NextResponse> {
  try {
    await prisma.user.findFirst({ select: { id: true } });
    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch {
    return NextResponse.json({ status: "unavailable" }, { status: 503 });
  }
}
