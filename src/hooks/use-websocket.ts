"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import {
  getWebSocketClient,
  type WebSocketEvent,
  type WebSocketEventType,
} from "@/lib/websocket";

interface UseWebSocketOptions {
  autoConnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { autoConnect = true } = options;
  const clientRef = useRef(getWebSocketClient());
  const cleanupFunctionsRef = useRef<(() => void)[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const client = clientRef.current;

    if (autoConnect) {
      client.connect();
    }

    // Update connection status periodically
    const checkConnection = () => {
      setIsConnected(client.isConnected);
    };
    checkConnection();
    const interval = setInterval(checkConnection, 1000);

    return () => {
      clearInterval(interval);
      // Clean up all subscriptions on unmount
      cleanupFunctionsRef.current.forEach((cleanup) => cleanup());
      cleanupFunctionsRef.current = [];
    };
  }, [autoConnect]);

  const subscribe = useCallback(
    <T = unknown>(
      type: WebSocketEventType,
      handler: (event: WebSocketEvent<T>) => void
    ) => {
      const unsubscribe = clientRef.current.on(type, handler);
      cleanupFunctionsRef.current.push(unsubscribe);
      return unsubscribe;
    },
    []
  );

  const subscribeAll = useCallback(
    (handler: (event: WebSocketEvent) => void) => {
      const unsubscribe = clientRef.current.onAny(handler);
      cleanupFunctionsRef.current.push(unsubscribe);
      return unsubscribe;
    },
    []
  );

  const send = useCallback((event: WebSocketEvent) => {
    clientRef.current.send(event);
  }, []);

  const connect = useCallback(() => {
    clientRef.current.connect();
  }, []);

  const disconnect = useCallback(() => {
    clientRef.current.disconnect();
  }, []);

  return {
    subscribe,
    subscribeAll,
    send,
    connect,
    disconnect,
    isConnected,
  };
}
