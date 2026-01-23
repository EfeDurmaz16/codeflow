"use client";

import { Header } from "@/components/layout/header";
import { TaskKanban } from "@/components/tasks/task-kanban";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, List, RefreshCw } from "lucide-react";
import type { Task, TaskStatus } from "@/types";

// Mock data
const mockTasks: Task[] = [
  {
    id: "task-1",
    title: "Implement user authentication",
    description: "Add JWT-based authentication to the API with refresh tokens and session management",
    status: "running",
    priority: "high",
    assignedAgentId: "2",
    assignmentMethod: "manual",
    subtasks: [],
    dependencies: [],
    files: ["src/auth/"],
    startedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
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
  {
    id: "task-3",
    title: "Add unit tests for API endpoints",
    description: "Write comprehensive tests for all REST API routes using Jest",
    status: "assigned",
    priority: "normal",
    assignedAgentId: "1",
    assignmentMethod: "capability-based",
    subtasks: [],
    dependencies: [],
    files: ["tests/"],
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "task-4",
    title: "Update documentation",
    description: "Update API documentation with new endpoints and examples",
    status: "queued",
    priority: "low",
    subtasks: [],
    dependencies: ["task-3"],
    files: ["docs/"],
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "task-5",
    title: "Implement caching layer",
    description: "Add Redis caching for frequently accessed data",
    status: "completed",
    priority: "high",
    assignedAgentId: "1",
    subtasks: [],
    dependencies: [],
    files: ["src/cache/"],
    output: "Successfully implemented Redis caching with TTL support",
    startedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    completedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "task-6",
    title: "Fix memory leak in worker",
    description: "Investigate and fix memory leak in background job processor",
    status: "failed",
    priority: "critical",
    assignedAgentId: "6",
    subtasks: [],
    dependencies: [],
    files: ["src/workers/"],
    errorMessage: "Agent connection lost during execution",
    startedAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export default function TasksPage() {
  // Group tasks by status
  const tasksByStatus: Record<TaskStatus, Task[]> = {
    queued: mockTasks.filter((t) => t.status === "queued"),
    assigned: mockTasks.filter((t) => t.status === "assigned"),
    running: mockTasks.filter((t) => t.status === "running"),
    completed: mockTasks.filter((t) => t.status === "completed"),
    failed: mockTasks.filter((t) => t.status === "failed"),
  };

  const handleCreateTask = (task: {
    title: string;
    description: string;
    priority: string;
  }) => {
    console.log("Create task:", task);
  };

  return (
    <div className="flex flex-col">
      <Header
        title="Tasks"
        description="Manage and track tasks across all agents"
      />

      <div className="flex-1 p-6">
        <div className="mb-6 flex items-center justify-between">
          <Tabs defaultValue="kanban" className="w-auto">
            <TabsList>
              <TabsTrigger value="kanban">
                <LayoutGrid className="mr-2 h-4 w-4" />
                Kanban
              </TabsTrigger>
              <TabsTrigger value="list">
                <List className="mr-2 h-4 w-4" />
                List
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <CreateTaskDialog onSubmit={handleCreateTask} />
          </div>
        </div>

        <TaskKanban tasks={tasksByStatus} />
      </div>
    </div>
  );
}
