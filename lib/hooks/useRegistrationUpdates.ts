import { useEffect, useRef, useState } from 'react';
import { RegistrationStatus } from '@prisma/client';

export interface RegistrationUpdate {
  registrationId: number;
  status: RegistrationStatus;
  timestamp: number;
  stage?: string;
  message?: string;
  details?: {
    updatedFields?: string[];
    accountsFound?: number;
    existingUserId?: number;
    error?: string;
  };
  processLog?: Array<{
    stage: string;
    status: string;
    timestamp: string;
    duration?: number;
    details?: string;
    error?: string;
  }>;
}

interface UseRegistrationUpdatesOptions {
  registrationId?: number;
  onUpdate?: (update: RegistrationUpdate) => void;
  onConnected?: () => void;
  onError?: (error: Event) => void;
  autoConnect?: boolean;
}

export function useRegistrationUpdates(options: UseRegistrationUpdatesOptions = {}) {
  const {
    registrationId,
    onUpdate,
    onConnected,
    onError,
    autoConnect = true,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [latestUpdate, setLatestUpdate] = useState<RegistrationUpdate | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = () => {
    if (eventSourceRef.current) {
      return; // Already connected
    }

    const url = registrationId
      ? `/api/registrations/updates/stream?registrationId=${registrationId}`
      : '/api/registrations/updates/stream';

    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      console.log('✅ SSE connected to registration updates');
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'connected') {
          onConnected?.();
        } else if (message.type === 'update') {
          const update = message.data as RegistrationUpdate;
          setLatestUpdate(update);
          onUpdate?.(update);
        } else if (message.type === 'ping') {
          // Keep-alive ping, no action needed
        }
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('❌ SSE error:', error);
      setIsConnected(false);
      onError?.(error);
      
      // Auto-reconnect after 5 seconds
      eventSource.close();
      eventSourceRef.current = null;
      
      setTimeout(() => {
        if (autoConnect) {
          connect();
        }
      }, 5000);
    };

    eventSourceRef.current = eventSource;
  };

  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
      console.log('✅ SSE disconnected from registration updates');
    }
  };

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [registrationId, autoConnect]);

  return {
    isConnected,
    latestUpdate,
    connect,
    disconnect,
  };
}
