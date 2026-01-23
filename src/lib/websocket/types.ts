// WebSocket event types
export type WebSocketEventType =
  | "agent:status"
  | "agent:metrics"
  | "agent:log"
  | "task:created"
  | "task:updated"
  | "task:completed"
  | "task:failed"
  | "workflow:started"
  | "workflow:completed"
  | "workflow:failed";

export interface WebSocketEvent<T = unknown> {
  type: WebSocketEventType;
  payload: T;
  timestamp: string;
}

export interface AgentStatusEvent {
  agentId: string;
  status: "online" | "offline" | "busy" | "error";
  previousStatus?: string;
}

export interface AgentMetricsEvent {
  agentId: string;
  metrics: {
    cpu: number;
    memory: number;
    tokensUsed: number;
    cost: number;
    latencyMs: number;
  };
}

export interface AgentLogEvent {
  agentId: string;
  log: {
    id: string;
    level: "info" | "warn" | "error" | "debug";
    message: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
  };
}

export interface TaskEvent {
  taskId: string;
  title: string;
  status: string;
  priority?: string;
  assignedAgentId?: string;
}

export interface WorkflowEvent {
  workflowId: string;
  runId: string;
  name: string;
  status: string;
}
