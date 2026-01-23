import { create } from "zustand";
import type { WSMessage } from "@/types";

interface WebSocketState {
  socket: WebSocket | null;
  isConnected: boolean;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  messageQueue: WSMessage[];

  // Actions
  connect: (url: string) => void;
  disconnect: () => void;
  send: (message: WSMessage) => void;
  setConnected: (isConnected: boolean) => void;
  addToQueue: (message: WSMessage) => void;
  clearQueue: () => void;
}

export const useWebSocketStore = create<WebSocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  reconnectAttempts: 0,
  maxReconnectAttempts: 5,
  messageQueue: [],

  connect: (url) => {
    const { socket, isConnected, reconnectAttempts, maxReconnectAttempts } =
      get();

    if (socket && isConnected) return;

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        set({ isConnected: true, reconnectAttempts: 0 });
        // Flush message queue
        const { messageQueue, clearQueue } = get();
        messageQueue.forEach((msg) => ws.send(JSON.stringify(msg)));
        clearQueue();
      };

      ws.onclose = () => {
        set({ isConnected: false, socket: null });

        // Auto-reconnect with exponential backoff
        if (reconnectAttempts < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          setTimeout(() => {
            set((state) => ({
              reconnectAttempts: state.reconnectAttempts + 1,
            }));
            get().connect(url);
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          // Handle message - dispatch to appropriate store based on type
          handleWSMessage(message);
        } catch (err) {
          console.error("Failed to parse WebSocket message:", err);
        }
      };

      set({ socket: ws });
    } catch (error) {
      console.error("Failed to connect WebSocket:", error);
    }
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.close();
      set({ socket: null, isConnected: false });
    }
  },

  send: (message) => {
    const { socket, isConnected, addToQueue } = get();
    if (socket && isConnected) {
      socket.send(JSON.stringify(message));
    } else {
      // Queue message for when connection is restored
      addToQueue(message);
    }
  },

  setConnected: (isConnected) => set({ isConnected }),

  addToQueue: (message) =>
    set((state) => ({
      messageQueue: [...state.messageQueue, message].slice(-100), // Keep last 100
    })),

  clearQueue: () => set({ messageQueue: [] }),
}));

// Handle incoming WebSocket messages
function handleWSMessage(message: WSMessage) {
  // Import stores dynamically to avoid circular deps
  // In a real implementation, you'd use a message bus or event emitter
  switch (message.type) {
    case "agent:status":
    case "agent:metrics":
    case "agent:log":
      // Would dispatch to agents store
      break;
    case "task:status":
    case "task:log":
      // Would dispatch to tasks store
      break;
    case "workflow:status":
      // Would dispatch to workflows store
      break;
    case "pong":
      // Handle pong response
      break;
    default:
      console.warn("Unknown message type:", message.type);
  }
}
