import { orderBookManager } from "@/server/orderBookManager";
import { AggregatedOrderBook } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        try {
          controller.enqueue(encoder.encode(payload));
        } catch {
          // stream closed
        }
      };

      const unsubscribe = orderBookManager.subscribe(
        (book: AggregatedOrderBook) => {
          send("orderbook", {
            ...book,
            timestamp: Date.now(),
          });
        }
      );

      const heartbeat = setInterval(() => {
        send("heartbeat", { timestamp: Date.now() });
      }, 15000);

      const cleanup = () => {
        unsubscribe();
        clearInterval(heartbeat);
      };

      // AbortSignal not available on ReadableStream start,
      // but controller.close() will be called when client disconnects
      // We rely on the error handler in send() + periodic check
      const checkAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(":\n\n")); // SSE comment as keepalive
        } catch {
          cleanup();
          clearInterval(checkAlive);
        }
      }, 30000);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
