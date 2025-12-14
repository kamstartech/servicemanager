import { servicePubSub, ServiceChannel } from "@/lib/redis/pubsub";
import { balanceSyncService } from "@/lib/services/background/balance-sync";
import { accountDiscoveryService } from "@/lib/services/background/account-discovery";
import { accountEnrichmentService } from "@/lib/services/background/account-enrichment";
import { redisClient } from "@/lib/redis/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  
  // Check if Redis is available
  const isRedisAvailable = redisClient.isConnected();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send initial status immediately
        const initialStatus = {
          balanceSync: {
            ...balanceSyncService.getStatus(),
            intervalMinutes: Math.round(balanceSyncService.getStatus().interval / 1000 / 60),
          },
          accountDiscovery: {
            ...accountDiscoveryService.getStatus(),
            intervalHours: Math.round(accountDiscoveryService.getStatus().interval / 1000 / 60 / 60),
          },
          accountEnrichment: {
            ...accountEnrichmentService.getStatus(),
            intervalHours: Math.round(accountEnrichmentService.getStatus().interval / 1000 / 60 / 60),
          },
        };
        
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(initialStatus)}\n\n`)
        );

        console.log("✅ SSE Client connected");

        // Only subscribe to Redis if available
        if (isRedisAvailable) {
          // Subscribe to all service channels
          await servicePubSub.subscribe(
            [ServiceChannel.ALL_SERVICES],
            (channel, message) => {
              try {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(message)}\n\n`)
                );
              } catch (error) {
                console.error("Failed to send SSE:", error);
              }
            }
          );
        } else {
          console.warn("⚠️ Redis not available, SSE will not receive updates");
        }

        // Keep connection alive with heartbeat
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(": heartbeat\n\n"));
          } catch (error) {
            clearInterval(heartbeat);
          }
        }, 30000); // Every 30 seconds

        // Cleanup on connection close
        request.signal.addEventListener("abort", () => {
          clearInterval(heartbeat);
          controller.close();
          console.log("✅ SSE Client disconnected");
        });
      } catch (error) {
        console.error("❌ SSE Stream error:", error);
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}
