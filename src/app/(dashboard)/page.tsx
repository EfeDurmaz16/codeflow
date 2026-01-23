"use client";

import { Header } from "@/components/layout/header";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { AgentCard } from "@/components/dashboard/agent-card";
import { ActiveTasks } from "@/components/dashboard/active-tasks";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import type { Agent, Task } from "@/types";

// Mock data for demonstration
const mockAgents: Agent[] = [
  {
    id: "1",
    name: "Claude-Code-1",
    type: "claude_code",
    status: "online",
    endpoint: "http://localhost:3001",
    capabilities: ["TypeScript", "React", "Node.js", "Python"],
    metrics: { cpu: 45, memory: 62, tokensUsed: 125000, cost: 12.5, latencyMs: 120 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Cursor-Agent",
    type: "cursor",
    status: "busy",
    endpoint: "http://localhost:3002",
    capabilities: ["JavaScript", "Vue", "CSS"],
    currentTaskId: "task-1",
    metrics: { cpu: 78, memory: 45, tokensUsed: 89000, cost: 8.9, latencyMs: 85 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "3",
    name: "Windsurf-Pro",
    type: "windsurf",
    status: "online",
    endpoint: "http://localhost:3003",
    capabilities: ["Go", "Rust", "Docker"],
    metrics: { cpu: 23, memory: 31, tokensUsed: 45000, cost: 4.5, latencyMs: 95 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "4",
    name: "Codex-Worker",
    type: "codex",
    status: "offline",
    endpoint: "http://localhost:3004",
    capabilities: ["Python", "ML", "Data Science"],
    metrics: { cpu: 0, memory: 0, tokensUsed: 0, cost: 0, latencyMs: 0 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "5",
    name: "Gemini-CLI",
    type: "gemini",
    status: "online",
    endpoint: "http://localhost:3005",
    capabilities: ["Java", "Kotlin", "Android"],
    metrics: { cpu: 34, memory: 28, tokensUsed: 67000, cost: 6.7, latencyMs: 110 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "6",
    name: "Aider-Local",
    type: "aider",
    status: "error",
    endpoint: "http://localhost:3006",
    capabilities: ["Shell", "Bash", "Linux"],
    metrics: { cpu: 0, memory: 0, tokensUsed: 12000, cost: 1.2, latencyMs: 0 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockTasks: Task[] = [
  {
    id: "task-1",
    title: "Implement user authentication",
    description: "Add JWT-based authentication to the API",
    status: "running",
    priority: "high",
    assignedAgentId: "2",
    subtasks: [],
    dependencies: [],
    files: ["src/auth/"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "task-2",
    title: "Fix database connection pooling",
    description: "Resolve connection timeout issues",
    status: "queued",
    priority: "critical",
    subtasks: [],
    dependencies: [],
    files: ["src/db/"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "task-3",
    title: "Add unit tests for API endpoints",
    description: "Write comprehensive tests for all routes",
    status: "assigned",
    priority: "normal",
    assignedAgentId: "1",
    subtasks: [],
    dependencies: [],
    files: ["tests/"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockActivities = [
  {
    id: "1",
    type: "task_completed" as const,
    message: "Claude-Code-1 completed 'Setup project structure'",
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: "2",
    type: "agent_online" as const,
    message: "Gemini-CLI came online",
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    id: "3",
    type: "workflow_started" as const,
    message: "Started 'Full-Stack Dev' workflow",
    timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
  },
  {
    id: "4",
    type: "task_failed" as const,
    message: "Aider-Local failed 'Database migration'",
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: "5",
    type: "agent_offline" as const,
    message: "Codex-Worker went offline",
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
];

export default function DashboardPage() {
  const stats = {
    totalAgents: mockAgents.length,
    onlineAgents: mockAgents.filter((a) => a.status === "online" || a.status === "busy").length,
    totalTasks: mockTasks.length,
    runningTasks: mockTasks.filter((t) => t.status === "running").length,
    activeWorkflows: 2,
    totalCost: mockAgents.reduce((sum, a) => sum + a.metrics.cost, 0),
  };

  return (
    <div className="flex flex-col">
      <Header
        title="Dashboard"
        description="Monitor and orchestrate your AI coding agents"
      />

      <div className="flex-1 space-y-6 p-6">
        <StatsCards stats={stats} />

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Agents</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Agent
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {mockAgents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <ActiveTasks tasks={mockTasks} />
          <RecentActivity activities={mockActivities} />
        </div>
      </div>
    </div>
  );
}
