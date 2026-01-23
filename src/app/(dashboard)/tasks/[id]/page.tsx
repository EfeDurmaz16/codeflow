"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { TaskDetail } from "@/components/tasks/task-detail";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import type { Task, TaskLog, Agent } from "@/types";

// Mock data
const mockTasks: Record<string, Task> = {
  "task-1": {
    id: "task-1",
    title: "Implement user authentication",
    description:
      "Add JWT-based authentication to the API with refresh tokens and session management.\n\nRequirements:\n- Implement login endpoint with email/password\n- Add JWT token generation with configurable expiry\n- Implement refresh token rotation\n- Add logout endpoint to invalidate tokens\n- Secure routes with authentication middleware",
    status: "running",
    priority: "high",
    assignedAgentId: "2",
    assignmentMethod: "manual",
    subtasks: ["subtask-1", "subtask-2"],
    dependencies: [],
    files: ["src/auth/", "src/middleware/auth.ts", "src/routes/auth.ts"],
    startedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  "task-2": {
    id: "task-2",
    title: "Fix database connection pooling",
    description: "Resolve connection timeout issues in the PostgreSQL connection pool",
    status: "queued",
    priority: "critical",
    subtasks: [],
    dependencies: [],
    files: ["src/db/"],
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

const mockLogs: TaskLog[] = [
  {
    id: "log-1",
    taskId: "task-1",
    level: "info",
    message: "Starting task execution",
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: "log-2",
    taskId: "task-1",
    level: "info",
    message: "Reading existing auth files",
    createdAt: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
  },
  {
    id: "log-3",
    taskId: "task-1",
    level: "debug",
    message: "Analyzing project structure for auth implementation",
    createdAt: new Date(Date.now() - 1000 * 60 * 13).toISOString(),
  },
  {
    id: "log-4",
    taskId: "task-1",
    level: "info",
    message: "Creating JWT utility functions",
    createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  },
  {
    id: "log-5",
    taskId: "task-1",
    level: "info",
    message: "Implementing login endpoint",
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: "log-6",
    taskId: "task-1",
    level: "warn",
    message: "Found existing auth middleware - will need to integrate",
    createdAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
  },
];

const mockAgents: Agent[] = [
  {
    id: "1",
    name: "Claude-Code-1",
    type: "claude_code",
    status: "online",
    endpoint: "http://localhost:3001",
    capabilities: ["TypeScript", "React"],
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
    capabilities: ["JavaScript", "Vue"],
    currentTaskId: "task-1",
    metrics: { cpu: 78, memory: 45, tokensUsed: 89000, cost: 8.9, latencyMs: 85 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockSubtasks: Task[] = [
  {
    id: "subtask-1",
    title: "Create JWT utilities",
    description: "Implement JWT signing and verification",
    status: "completed",
    priority: "high",
    parentTaskId: "task-1",
    subtasks: [],
    dependencies: [],
    files: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "subtask-2",
    title: "Implement auth middleware",
    description: "Create Express middleware for JWT validation",
    status: "running",
    priority: "high",
    parentTaskId: "task-1",
    subtasks: [],
    dependencies: [],
    files: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export default function TaskDetailPage() {
  const params = useParams();
  const taskId = params.id as string;

  const task = mockTasks[taskId];

  if (!task) {
    return (
      <div className="flex flex-col">
        <Header title="Task Not Found" />
        <div className="flex flex-1 flex-col items-center justify-center p-6">
          <p className="text-muted-foreground">
            The requested task could not be found.
          </p>
          <Button asChild className="mt-4">
            <Link href="/tasks">Back to Tasks</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header title="Task Details" />
      <div className="flex-1 p-6">
        <div className="mb-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/tasks">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Tasks
            </Link>
          </Button>
        </div>
        <TaskDetail
          task={task}
          logs={mockLogs}
          agents={mockAgents}
          subtasks={mockSubtasks}
        />
      </div>
    </div>
  );
}
