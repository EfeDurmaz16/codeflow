"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Wifi, WifiOff } from "lucide-react";
import { getWebSocketClient } from "@/lib/websocket";

export function ConnectionStatus() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const client = getWebSocketClient();

    // Check connection status periodically
    const checkConnection = () => {
      setIsConnected(client.isConnected);
    };

    // Check immediately and then every second
    checkConnection();
    const interval = setInterval(checkConnection, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium",
          isConnected
            ? "bg-green-500/10 text-green-500"
            : "bg-zinc-500/10 text-zinc-400"
        )}
      >
        {isConnected ? (
          <>
            <Wifi className="h-3 w-3" />
            <span>Live</span>
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3" />
            <span>Offline</span>
          </>
        )}
      </div>
    </div>
  );
}
