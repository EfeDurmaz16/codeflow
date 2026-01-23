"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import type { Task, TaskStatus, TaskPriority } from "@/types";
import { Bot } from "lucide-react";

interface TaskKanbanProps {
  tasks: Record<TaskStatus, Task[]>;
}

const statusLabels: Record<TaskStatus, string> = {
  queued: "Queued",
  assigned: "Assigned",
  running: "Running",
  completed: "Completed",
  failed: "Failed",
};

const statusColors: Record<TaskStatus, string> = {
  queued: "border-zinc-700",
  assigned: "border-blue-700",
  running: "border-yellow-700",
  completed: "border-green-700",
  failed: "border-red-700",
};

const priorityColors: Record<TaskPriority, string> = {
  critical: "bg-red-500 text-white",
  high: "bg-yellow-500 text-black",
  normal: "bg-primary text-white",
  low: "bg-zinc-700 text-zinc-300",
};

interface TaskCardProps {
  task: Task;
}

function TaskCard({ task }: TaskCardProps) {
  return (
    <Link href={`/tasks/${task.id}`}>
      <Card className="cursor-pointer transition-colors hover:bg-accent/50">
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <h4 className="line-clamp-2 text-sm font-medium">{task.title}</h4>
            <Badge
              className={cn("shrink-0 text-[10px]", priorityColors[task.priority])}
            >
              {task.priority}
            </Badge>
          </div>

          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
            {task.description}
          </p>

          <div className="mt-3 flex items-center justify-between">
            {task.assignedAgentId ? (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Bot className="h-3 w-3" />
                <span>Assigned</span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">Unassigned</span>
            )}
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function TaskKanban({ tasks }: TaskKanbanProps) {
  const columns: TaskStatus[] = ["queued", "assigned", "running", "completed", "failed"];

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((status) => (
        <div
          key={status}
          className={cn(
            "flex w-80 shrink-0 flex-col rounded-lg border-t-2 bg-card",
            statusColors[status]
          )}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{statusLabels[status]}</h3>
              <Badge variant="secondary" className="text-xs">
                {tasks[status]?.length || 0}
              </Badge>
            </div>
          </div>

          <ScrollArea className="flex-1 p-2">
            <div className="space-y-2">
              {tasks[status]?.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No tasks
                </p>
              ) : (
                tasks[status]?.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      ))}
    </div>
  );
}
