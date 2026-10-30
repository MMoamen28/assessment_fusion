import { prisma } from "@/lib/db";
import { eventBus, ListenerLimitError } from "@/lib/realtime/bus";
import { createRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/api/client-ip";

export const publicStreamLimiter = createRateLimiter({ limit: 30, windowMs: 15 * 60 * 1000 });

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function GET(req: Request, ctx: RouteContext) {
  const ip = getClientIp(req);
  const ipCheck = publicStreamLimiter.check(ip);
  if (!ipCheck.ok) {
    return new Response(
      JSON.stringify({
        error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later." },
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(ipCheck.retryAfterSeconds),
        },
      },
    );
  }

  const { token } = await ctx.params;
  const complaint = await prisma.complaint.findUnique({
    where: { publicToken: token },
    select: { id: true },
  });

  if (!complaint) {
    return new Response(
      JSON.stringify({ error: { code: "NOT_FOUND", message: "Complaint not found" } }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  if (eventBus.listenerCount() >= 200) {
    return new Response(
      JSON.stringify({
        error: { code: "SERVICE_UNAVAILABLE", message: "Maximum realtime event listeners exceeded" },
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  let unsubscribe: (() => void) | null = null;
  let pingTimer: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode("event: ready\ndata: {}\n\n"));

      try {
        unsubscribe = eventBus.subscribe(
          { complaintId: complaint.id, publicVisibleOnly: true },
          () => {
            try {
              controller.enqueue(
                encoder.encode(`event: message\ndata: ${JSON.stringify({ type: "changed" })}\n\n`),
              );
            } catch {
              // controller closed
            }
          },
        );
      } catch (err) {
        if (err instanceof ListenerLimitError) {
          controller.error(err);
          return;
        }
        controller.error(err);
        return;
      }

      pingTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          // controller closed
        }
      }, 25000);
    },
    cancel() {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      if (pingTimer) {
        clearInterval(pingTimer);
        pingTimer = null;
      }
    },
  });

  req.signal.addEventListener("abort", () => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

