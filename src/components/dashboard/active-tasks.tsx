"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Task, TaskPriority } from "@/types";

interface ActiveTasksProps {
  tasks: Task[];
}

const priorityColors: Record<TaskPriority, string> = {
  critical: "bg-red-500 text-white",
  high: "bg-yellow-500 text-black",
  normal: "bg-primary text-white",
  low: "bg-zinc-700 text-zinc-300",
};

export function ActiveTasks({ tasks }: ActiveTasksProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
        <Link
          href="/tasks"
          className="text-xs text-primary hover:underline"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          <div className="space-y-0">
            {tasks.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                No active tasks
              </p>
            ) : (
              tasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="flex items-center justify-between border-b border-border px-6 py-3 transition-colors hover:bg-accent/50 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {task.status}
                      {task.assignedAgentId && " • Assigned"}
                    </p>
                  </div>
                  <Badge
                    className={cn(
                      "ml-2 shrink-0",
                      priorityColors[task.priority]
                    )}
                  >
                    {task.priority}
                  </Badge>
                </Link>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
