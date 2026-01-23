"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { AgentDetail } from "@/components/agents/agent-detail";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import type { Agent, AgentLog, Task } from "@/types";

// Mock data
const mockAgents: Record<string, Agent> = {
  "1": {
    id: "1",
    name: "Claude-Code-1",
    type: "claude_code",
    status: "online",
    endpoint: "http://localhost:3001",
    capabilities: ["TypeScript", "React", "Node.js", "Python", "PostgreSQL", "Docker"],
    metrics: { cpu: 45, memory: 62, tokensUsed: 125000, cost: 12.5, latencyMs: 120 },
    lastPingAt: new Date(Date.now() - 1000 * 30).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  "2": {
    id: "2",
    name: "Cursor-Agent",
    type: "cursor",
    status: "busy",
    endpoint: "http://localhost:3002",
    capabilities: ["JavaScript", "Vue", "CSS"],
    currentTaskId: "task-1",
    metrics: { cpu: 78, memory: 45, tokensUsed: 89000, cost: 8.9, latencyMs: 85 },
    lastPingAt: new Date(Date.now() - 1000 * 15).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

const mockLogs: AgentLog[] = [
  {
    id: "log-1",
    agentId: "1",
    level: "info",
    message: "Connected to endpoint successfully",
    createdAt: new Date(Date.now() - 1000 * 60).toISOString(),
  },
  {
    id: "log-2",
    agentId: "1",
    level: "info",
    message: "Starting task: Implement user authentication",
    createdAt: new Date(Date.now() - 1000 * 120).toISOString(),
  },
  {
    id: "log-3",
    agentId: "1",
    level: "debug",
    message: "Reading file: src/auth/middleware.ts",
    createdAt: new Date(Date.now() - 1000 * 180).toISOString(),
  },
  {
    id: "log-4",
    agentId: "1",
    level: "warn",
    message: "High memory usage detected: 85%",
    createdAt: new Date(Date.now() - 1000 * 300).toISOString(),
  },
  {
    id: "log-5",
    agentId: "1",
    level: "info",
    message: "Task completed successfully",
    createdAt: new Date(Date.now() - 1000 * 400).toISOString(),
  },
];

const mockTasks: Task[] = [
  {
    id: "task-1",
    title: "Implement user authentication",
    description: "Add JWT-based authentication",
    status: "completed",
    priority: "high",
    assignedAgentId: "1",
    subtasks: [],
    dependencies: [],
    files: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "task-2",
    title: "Fix database connection",
    description: "Resolve timeout issues",
    status: "completed",
    priority: "critical",
    assignedAgentId: "1",
    subtasks: [],
    dependencies: [],
    files: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "task-3",
    title: "Add API documentation",
    description: "Generate OpenAPI specs",
    status: "completed",
    priority: "normal",
    assignedAgentId: "1",
    subtasks: [],
    dependencies: [],
    files: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export default function AgentDetailPage() {
  const params = useParams();
  const agentId = params.id as string;

  const agent = mockAgents[agentId];

  if (!agent) {
    return (
      <div className="flex flex-col">
        <Header title="Agent Not Found" />
        <div className="flex flex-1 flex-col items-center justify-center p-6">
          <p className="text-muted-foreground">
            The requested agent could not be found.
          </p>
          <Button asChild className="mt-4">
            <Link href="/agents">Back to Agents</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header title="Agent Details" />
      <div className="flex-1 p-6">
        <div className="mb-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/agents">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Agents
            </Link>
          </Button>
        </div>
        <AgentDetail agent={agent} logs={mockLogs} tasks={mockTasks} />
      </div>
    </div>
  );
}
