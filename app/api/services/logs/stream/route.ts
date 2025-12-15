import { NextRequest } from "next/server";
import { logsPubSub, LogsChannel, type ServiceLogEvent } from "@/lib/redis/logs-pubsub";
import { redisClient } from "@/lib/redis/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  const service = request.nextUrl.searchParams.get("service") || "all";
  const isRedisAvailable = redisClient.isConnected();

  // Create a readable stream for Server-Sent Events
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ log: "✅ Connected to logs stream", timestamp: new Date().toISOString() })}\n\n`
        )
      );

      if (!isRedisAvailable) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ log: "[ERROR] Redis not available", timestamp: new Date().toISOString() })}\n\n`
          )
        );
        controller.close();
        return;
      }

      const subscriber = logsPubSub.createSubscriber();
      if (!subscriber) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ log: "[ERROR] Failed to create Redis subscriber", timestamp: new Date().toISOString() })}\n\n`
          )
        );
        controller.close();
        return;
      }

      const channel = service === "all" ? LogsChannel.ALL : logsPubSub.serviceChannel(service);

      const onMessage = (_channel: string, raw: string) => {
        try {
          if (controller.desiredSize === null) return;

          const evt = JSON.parse(raw) as ServiceLogEvent;
          const line = `[${new Date(evt.timestamp).toISOString()}] [${evt.service}] [${evt.level.toUpperCase()}] ${evt.message}`;

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ log: line, timestamp: new Date().toISOString(), event: evt })}\n\n`
            )
          );
        } catch {
          if (controller.desiredSize === null) return;
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ log: "[WARN] Failed to parse log event", timestamp: new Date().toISOString() })}\n\n`
            )
          );
        }
      };

      subscriber.on("message", onMessage);
      await subscriber.subscribe(channel);

      const keepAliveInterval = setInterval(() => {
        try {
          if (controller.desiredSize !== null) {
            controller.enqueue(encoder.encode(": keep-alive\n\n"));
          } else {
            clearInterval(keepAliveInterval);
          }
        } catch {
          clearInterval(keepAliveInterval);
        }
      }, 30000);

      request.signal.addEventListener("abort", async () => {
        clearInterval(keepAliveInterval);
        try {
          subscriber.off("message", onMessage);
          await subscriber.unsubscribe(channel);
        } catch {}
        try {
          await subscriber.quit();
        } catch {}
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}
