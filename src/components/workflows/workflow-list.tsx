"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GitBranch, Play, Pencil, Copy, Trash2, MoreHorizontal } from "lucide-react";
import type { Workflow, WorkflowStatus } from "@/types";

interface WorkflowListProps {
  workflows: Workflow[];
  onRun?: (id: string) => void;
  onDelete?: (id: string) => void;
  onClone?: (workflow: Workflow) => void;
}

const statusColors: Record<WorkflowStatus, string> = {
  active: "bg-green-500",
  paused: "bg-yellow-500",
  draft: "bg-zinc-500",
};

const categoryLabels: Record<string, string> = {
  "full-stack-dev": "Full-Stack Dev",
  "bug-fix": "Bug Fix",
  "code-review": "Code Review",
  docs: "Documentation",
};

export function WorkflowList({
  workflows,
  onRun,
  onDelete,
  onClone,
}: WorkflowListProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {workflows.map((workflow) => (
        <Card key={workflow.id} className="relative">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <GitBranch className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <Link href={`/workflows/${workflow.id}/edit`}>
                    <CardTitle className="text-sm font-medium hover:underline">
                      {workflow.name}
                    </CardTitle>
                  </Link>
                  <div className="mt-1 flex items-center gap-2">
                    <div
                      className={cn(
                        "h-2 w-2 rounded-full",
                        statusColors[workflow.status]
                      )}
                    />
                    <span className="text-xs capitalize text-muted-foreground">
                      {workflow.status}
                    </span>
                  </div>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/workflows/${workflow.id}/edit`}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onClone?.(workflow)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Clone
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete?.(workflow.id)}
                    className="text-red-500"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>

          <CardContent>
            {workflow.description && (
              <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                {workflow.description}
              </p>
            )}

            <div className="flex flex-wrap gap-1.5">
              {workflow.category && (
                <Badge variant="secondary" className="text-[10px]">
                  {categoryLabels[workflow.category] || workflow.category}
                </Badge>
              )}
              {workflow.isTemplate && (
                <Badge variant="outline" className="text-[10px]">
                  Template
                </Badge>
              )}
              <Badge variant="secondary" className="text-[10px]">
                {workflow.graph.length} nodes
              </Badge>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {workflow.lastRunAt
                  ? `Last run ${formatDistanceToNow(new Date(workflow.lastRunAt), {
                      addSuffix: true,
                    })}`
                  : "Never run"}
              </span>

              {workflow.status === "active" ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRun?.(workflow.id)}
                >
                  <Play className="mr-2 h-3 w-3" />
                  Run
                </Button>
              ) : workflow.status === "draft" ? (
                <Button size="sm" asChild>
                  <Link href={`/workflows/${workflow.id}/edit`}>
                    <Pencil className="mr-2 h-3 w-3" />
                    Edit
                  </Link>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
