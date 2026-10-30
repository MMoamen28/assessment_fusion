import { getCurrentUser } from "@/lib/auth/current-user";
import { eventBus, ListenerLimitError } from "@/lib/realtime/bus";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const actor = await getCurrentUser();
  if (!actor) {
    return new Response(
      JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } }),
      {
        status: 401,
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

  const url = new URL(req.url);
  const complaintId = url.searchParams.get("complaintId") || undefined;

  let unsubscribe: (() => void) | null = null;
  let pingTimer: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode("event: ready\ndata: {}\n\n"));

      try {
        unsubscribe = eventBus.subscribe(
          complaintId ? { complaintId } : undefined,
          (event) => {
            try {
              controller.enqueue(
                encoder.encode(`event: message\ndata: ${JSON.stringify(event)}\n\n`),
              );
            } catch {
              // stream closed
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
          // stream closed
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
