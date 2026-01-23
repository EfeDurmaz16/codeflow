"use client";

import { useEffect } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import { useAgentsStore } from "@/stores/agents";
import { useTasksStore } from "@/stores/tasks";
import type {
  AgentStatusEvent,
  AgentMetricsEvent,
  AgentLogEvent,
  TaskEvent,
} from "@/lib/websocket";

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const { subscribe } = useWebSocket({ autoConnect: true });

  const updateAgentStatus = useAgentsStore((state) => state.updateAgentStatus);
  const updateAgentMetrics = useAgentsStore((state) => state.updateAgentMetrics);
  const addAgentLog = useAgentsStore((state) => state.addAgentLog);

  const updateTask = useTasksStore((state) => state.updateTask);

  useEffect(() => {
    // Agent status updates
    const unsubStatus = subscribe<AgentStatusEvent>("agent:status", (event) => {
      const { agentId, status } = event.payload;
      updateAgentStatus(agentId, status);
    });

    // Agent metrics updates
    const unsubMetrics = subscribe<AgentMetricsEvent>("agent:metrics", (event) => {
      const { agentId, metrics } = event.payload;
      updateAgentMetrics(agentId, metrics);
    });

    // Agent log updates
    const unsubLogs = subscribe<AgentLogEvent>("agent:log", (event) => {
      const { agentId, log } = event.payload;
      addAgentLog(agentId, { ...log, agentId });
    });

    // Task updates
    const unsubTaskCreated = subscribe<TaskEvent>("task:created", (event) => {
      // Could trigger a refetch or add to store
      console.log("[WebSocket] Task created:", event.payload.taskId);
    });

    const unsubTaskUpdated = subscribe<TaskEvent>("task:updated", (event) => {
      const { taskId, status, assignedAgentId } = event.payload;
      updateTask(taskId, {
        status: status as "queued" | "assigned" | "running" | "completed" | "failed",
        assignedAgentId,
      });
    });

    const unsubTaskCompleted = subscribe<TaskEvent>("task:completed", (event) => {
      const { taskId } = event.payload;
      updateTask(taskId, { status: "completed" });
    });

    const unsubTaskFailed = subscribe<TaskEvent>("task:failed", (event) => {
      const { taskId } = event.payload;
      updateTask(taskId, { status: "failed" });
    });

    // Cleanup
    return () => {
      unsubStatus();
      unsubMetrics();
      unsubLogs();
      unsubTaskCreated();
      unsubTaskUpdated();
      unsubTaskCompleted();
      unsubTaskFailed();
    };
  }, [subscribe, updateAgentStatus, updateAgentMetrics, addAgentLog, updateTask]);

  return <>{children}</>;
}
