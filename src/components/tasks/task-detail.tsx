"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ListTodo,
  Bot,
  Clock,
  Play,
  Pause,
  RotateCcw,
  GitBranch,
  FileText,
} from "lucide-react";
import type { Task, TaskLog, TaskStatus, TaskPriority, Agent } from "@/types";

interface TaskDetailProps {
  task: Task;
  logs?: TaskLog[];
  agents?: Agent[];
  subtasks?: Task[];
  dependencies?: Task[];
}

const statusColors: Record<TaskStatus, string> = {
  queued: "bg-zinc-500",
  assigned: "bg-blue-500",
  running: "bg-yellow-500",
  completed: "bg-green-500",
  failed: "bg-red-500",
};

const priorityColors: Record<TaskPriority, string> = {
  critical: "bg-red-500 text-white",
  high: "bg-yellow-500 text-black",
  normal: "bg-primary text-white",
  low: "bg-zinc-700 text-zinc-300",
};

const logLevelColors: Record<string, string> = {
  info: "text-blue-400",
  warn: "text-yellow-400",
  error: "text-red-400",
  debug: "text-zinc-400",
};

export function TaskDetail({
  task,
  logs = [],
  agents = [],
  subtasks = [],
  dependencies = [],
}: TaskDetailProps) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
            <ListTodo className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold">{task.title}</h1>
              <Badge className={cn(priorityColors[task.priority])}>
                {task.priority}
              </Badge>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "h-2 w-2 rounded-full",
                    statusColors[task.status]
                  )}
                />
                <span className="text-sm capitalize text-muted-foreground">
                  {task.status}
                </span>
              </div>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Created{" "}
              {formatDistanceToNow(new Date(task.createdAt), {
                addSuffix: true,
              })}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {task.status === "running" ? (
            <Button variant="outline" size="sm">
              <Pause className="mr-2 h-4 w-4" />
              Pause
            </Button>
          ) : task.status === "queued" || task.status === "assigned" ? (
            <Button size="sm">
              <Play className="mr-2 h-4 w-4" />
              Start
            </Button>
          ) : task.status === "failed" ? (
            <Button variant="outline" size="sm">
              <RotateCcw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          ) : null}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <Bot className="h-4 w-4" />
              Assigned Agent
            </CardTitle>
          </CardHeader>
          <CardContent>
            {task.assignedAgentId ? (
              <div>
                <p className="font-medium">Agent assigned</p>
                <p className="text-xs text-muted-foreground capitalize">
                  via {task.assignmentMethod || "manual"}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-muted-foreground">Not assigned</p>
                <Select>
                  <SelectTrigger className="mt-2 h-8">
                    <SelectValue placeholder="Assign agent..." />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            {task.startedAt ? (
              <div>
                <p className="font-medium">
                  {task.completedAt
                    ? formatDistanceToNow(new Date(task.completedAt), {
                        addSuffix: false,
                      })
                    : "In progress"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Started{" "}
                  {formatDistanceToNow(new Date(task.startedAt), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">Not started</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <GitBranch className="h-4 w-4" />
              Dependencies
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dependencies.length > 0 ? (
              <div>
                <p className="font-medium">{dependencies.length} tasks</p>
                <p className="text-xs text-muted-foreground">
                  {dependencies.filter((d) => d.status === "completed").length}{" "}
                  completed
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">No dependencies</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="subtasks">Subtasks</TabsTrigger>
          <TabsTrigger value="output">Output</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{task.description}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Files</CardTitle>
              </CardHeader>
              <CardContent>
                {task.files.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No files associated</p>
                ) : (
                  <div className="space-y-2">
                    {task.files.map((file) => (
                      <div
                        key={file}
                        className="flex items-center gap-2 rounded-md bg-muted px-3 py-2"
                      >
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono text-sm">{file}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Task Logs</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                {logs.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">
                    No logs available
                  </p>
                ) : (
                  <div className="font-mono text-xs">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className="flex gap-3 border-b border-border px-4 py-2 last:border-0"
                      >
                        <span className="text-muted-foreground">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </span>
                        <span
                          className={cn(
                            "uppercase",
                            logLevelColors[log.level]
                          )}
                        >
                          [{log.level}]
                        </span>
                        <span className="flex-1">{log.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subtasks" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Subtasks</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {subtasks.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  No subtasks
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {subtasks.map((subtask) => (
                    <div
                      key={subtask.id}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div>
                        <p className="font-medium">{subtask.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {subtask.status}
                        </p>
                      </div>
                      <Badge
                        variant={
                          subtask.status === "completed"
                            ? "default"
                            : subtask.status === "failed"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {subtask.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="output" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Task Output</CardTitle>
            </CardHeader>
            <CardContent>
              {task.output ? (
                <pre className="whitespace-pre-wrap rounded-md bg-muted p-4 font-mono text-sm">
                  {task.output}
                </pre>
              ) : task.errorMessage ? (
                <div className="rounded-md bg-red-500/10 p-4">
                  <p className="font-medium text-red-500">Error</p>
                  <pre className="mt-2 whitespace-pre-wrap font-mono text-sm text-red-400">
                    {task.errorMessage}
                  </pre>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No output yet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
