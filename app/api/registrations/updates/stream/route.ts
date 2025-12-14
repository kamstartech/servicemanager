import { NextRequest } from 'next/server';
import { registrationPubSub } from '@/lib/redis/registration-pubsub';

/**
 * GET /api/registrations/updates/stream
 * Server-Sent Events endpoint for real-time registration updates
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const registrationId = searchParams.get('registrationId');

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection message
      const message = `data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`;
      controller.enqueue(encoder.encode(message));

      // Subscribe to Redis updates
      await registrationPubSub.subscribe((update) => {
        // Filter by registration ID if specified
        if (registrationId && update.registrationId !== parseInt(registrationId)) {
          return;
        }

        // Send update to client
        const data = `data: ${JSON.stringify({ type: 'update', data: update })}\n\n`;
        try {
          controller.enqueue(encoder.encode(data));
        } catch (error) {
          console.error('Failed to send SSE update:', error);
        }
      });

      // Keep-alive ping every 30 seconds
      const keepAlive = setInterval(() => {
        try {
          const ping = `data: ${JSON.stringify({ type: 'ping', timestamp: Date.now() })}\n\n`;
          controller.enqueue(encoder.encode(ping));
        } catch (error) {
          clearInterval(keepAlive);
        }
      }, 30000);

      // Cleanup on connection close
      request.signal.addEventListener('abort', async () => {
        clearInterval(keepAlive);
        await registrationPubSub.unsubscribe();
        controller.close();
      });
    },
  });

  // Return SSE response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
