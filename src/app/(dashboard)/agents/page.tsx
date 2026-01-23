"use client";

import { Header } from "@/components/layout/header";
import { AgentList } from "@/components/agents/agent-list";
import type { Agent } from "@/types";

// Mock data
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

export default function AgentsPage() {
  const handleDelete = (id: string) => {
    console.log("Delete agent:", id);
  };

  const handleEdit = (agent: Agent) => {
    console.log("Edit agent:", agent);
  };

  return (
    <div className="flex flex-col">
      <Header
        title="Agents"
        description="Manage and monitor your AI coding agents"
      />
      <div className="flex-1 p-6">
        <AgentList
          agents={mockAgents}
          onDelete={handleDelete}
          onEdit={handleEdit}
        />
      </div>
    </div>
  );
}
