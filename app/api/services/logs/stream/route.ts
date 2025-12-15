import { NextRequest } from "next/server";
import { spawn } from "child_process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  // Create a readable stream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      console.log(`📡 Logs subscriber connected`);

      // Send initial connection message
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ log: "✅ Connected to logs stream\n", timestamp: new Date().toISOString() })}\n\n`
        )
      );

      // Spawn docker compose logs process
      const dockerLogs = spawn("docker", [
        "compose",
        "logs",
        "-f",
        "--tail=50",
        "adminpanel"
      ], {
        cwd: process.cwd(),
      });

      // Handle stdout
      dockerLogs.stdout.on("data", (data) => {
        try {
          const logLines = data.toString().split('\n').filter((line: string) => line.trim());
          logLines.forEach((line: string) => {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ log: line, timestamp: new Date().toISOString() })}\n\n`
              )
            );
          });
        } catch (error) {
          console.error("Error processing log data:", error);
        }
      });

      // Handle stderr
      dockerLogs.stderr.on("data", (data) => {
        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ log: `[ERROR] ${data.toString()}`, timestamp: new Date().toISOString() })}\n\n`
            )
          );
        } catch (error) {
          console.error("Error processing error data:", error);
        }
      });

      // Handle process errors
      dockerLogs.on("error", (error) => {
        console.error("Docker logs process error:", error);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ log: `[ERROR] Failed to start docker logs: ${error.message}`, timestamp: new Date().toISOString() })}\n\n`
          )
        );
      });

      // Keep-alive ping every 30 seconds
      const keepAliveInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        } catch (error) {
          clearInterval(keepAliveInterval);
        }
      }, 30000);

      // Cleanup on close
      request.signal.addEventListener("abort", () => {
        clearInterval(keepAliveInterval);
        dockerLogs.kill();
        console.log(`📡 Logs subscriber disconnected`);
        try {
          controller.close();
        } catch (error) {
          // Already closed
        }
      });

      // Handle docker process exit
      dockerLogs.on("close", () => {
        clearInterval(keepAliveInterval);
        try {
          controller.close();
        } catch (error) {
          // Already closed
        }
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
