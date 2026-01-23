// CodeFlow Type Definitions

export type AgentType =
  | "cursor"
  | "windsurf"
  | "claude_code"
  | "codex"
  | "gemini"
  | "aider"
  | "custom";

export type AgentStatus = "online" | "offline" | "busy" | "error";

export type TaskStatus =
  | "queued"
  | "assigned"
  | "running"
  | "completed"
  | "failed";

export type TaskPriority = "critical" | "high" | "normal" | "low";

export type WorkflowStatus = "active" | "paused" | "draft";

export type WorkflowNodeType =
  | "start"
  | "end"
  | "task"
  | "condition"
  | "parallel"
  | "join";

export interface AgentMetrics {
  cpu: number;
  memory: number;
  tokensUsed: number;
  cost: number;
  latencyMs: number;
}

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  endpoint: string;
  capabilities: string[];
  currentTaskId?: string;
  metrics: AgentMetrics;
  lastPingAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedAgentId?: string;
  assignmentMethod?: string;
  workflowId?: string;
  workflowNodeId?: string;
  parentTaskId?: string;
  subtasks: string[];
  dependencies: string[];
  files: string[];
  output?: string;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  label: string;
  taskTemplate?: Partial<Task>;
  condition?: string;
  position: { x: number; y: number };
  connections: string[];
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  status: WorkflowStatus;
  graph: WorkflowNode[];
  triggers: string[];
  category?: string;
  isTemplate: boolean;
  lastRunAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentLog {
  id: string;
  agentId: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface TaskLog {
  id: string;
  taskId: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface Setting {
  id: string;
  key: string;
  value: string;
  encrypted: boolean;
}

// WebSocket message types
export type WSMessageType =
  | "agent:status"
  | "agent:metrics"
  | "agent:log"
  | "task:status"
  | "task:log"
  | "workflow:status"
  | "ping"
  | "pong";

export interface WSMessage {
  type: WSMessageType;
  payload: unknown;
  timestamp: string;
}
