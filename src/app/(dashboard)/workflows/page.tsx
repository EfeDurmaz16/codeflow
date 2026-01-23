"use client";

import { Header } from "@/components/layout/header";
import { WorkflowList } from "@/components/workflows/workflow-list";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, BookTemplate, GitBranch } from "lucide-react";
import Link from "next/link";
import type { Workflow } from "@/types";

// Mock data
const mockWorkflows: Workflow[] = [
  {
    id: "wf-1",
    name: "Full-Stack Feature Development",
    description:
      "Complete workflow for implementing new features with frontend, backend, and tests",
    status: "active",
    graph: [
      {
        id: "start",
        type: "start",
        label: "Start",
        position: { x: 250, y: 0 },
        connections: ["analyze"],
      },
      {
        id: "analyze",
        type: "task",
        label: "Analyze Requirements",
        position: { x: 250, y: 100 },
        connections: ["parallel"],
      },
      {
        id: "parallel",
        type: "parallel",
        label: "Parallel Dev",
        position: { x: 250, y: 200 },
        connections: ["frontend", "backend"],
      },
      {
        id: "frontend",
        type: "task",
        label: "Frontend Implementation",
        position: { x: 100, y: 300 },
        connections: ["join"],
      },
      {
        id: "backend",
        type: "task",
        label: "Backend Implementation",
        position: { x: 400, y: 300 },
        connections: ["join"],
      },
      {
        id: "join",
        type: "join",
        label: "Join",
        position: { x: 250, y: 400 },
        connections: ["test"],
      },
      {
        id: "test",
        type: "task",
        label: "Write Tests",
        position: { x: 250, y: 500 },
        connections: ["end"],
      },
      {
        id: "end",
        type: "end",
        label: "End",
        position: { x: 250, y: 600 },
        connections: [],
      },
    ],
    triggers: ["manual"],
    category: "full-stack-dev",
    isTemplate: false,
    lastRunAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "wf-2",
    name: "Bug Fix Pipeline",
    description: "Systematic workflow for investigating and fixing bugs",
    status: "active",
    graph: [
      {
        id: "start",
        type: "start",
        label: "Start",
        position: { x: 250, y: 0 },
        connections: ["investigate"],
      },
      {
        id: "investigate",
        type: "task",
        label: "Investigate Issue",
        position: { x: 250, y: 100 },
        connections: ["fix"],
      },
      {
        id: "fix",
        type: "task",
        label: "Implement Fix",
        position: { x: 250, y: 200 },
        connections: ["test"],
      },
      {
        id: "test",
        type: "task",
        label: "Test Fix",
        position: { x: 250, y: 300 },
        connections: ["end"],
      },
      {
        id: "end",
        type: "end",
        label: "End",
        position: { x: 250, y: 400 },
        connections: [],
      },
    ],
    triggers: ["manual", "webhook"],
    category: "bug-fix",
    isTemplate: false,
    lastRunAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "wf-3",
    name: "Code Review Workflow",
    description: "Automated code review with multiple agents",
    status: "paused",
    graph: [
      {
        id: "start",
        type: "start",
        label: "Start",
        position: { x: 250, y: 0 },
        connections: ["review"],
      },
      {
        id: "review",
        type: "task",
        label: "Code Review",
        position: { x: 250, y: 100 },
        connections: ["end"],
      },
      {
        id: "end",
        type: "end",
        label: "End",
        position: { x: 250, y: 200 },
        connections: [],
      },
    ],
    triggers: ["webhook"],
    category: "code-review",
    isTemplate: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "wf-4",
    name: "Documentation Generator",
    description: "Auto-generate documentation from code",
    status: "draft",
    graph: [
      {
        id: "start",
        type: "start",
        label: "Start",
        position: { x: 250, y: 0 },
        connections: ["scan"],
      },
      {
        id: "scan",
        type: "task",
        label: "Scan Codebase",
        position: { x: 250, y: 100 },
        connections: ["generate"],
      },
      {
        id: "generate",
        type: "task",
        label: "Generate Docs",
        position: { x: 250, y: 200 },
        connections: ["end"],
      },
      {
        id: "end",
        type: "end",
        label: "End",
        position: { x: 250, y: 300 },
        connections: [],
      },
    ],
    triggers: ["manual"],
    category: "docs",
    isTemplate: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export default function WorkflowsPage() {
  const workflows = mockWorkflows.filter((w) => !w.isTemplate);
  const templates = mockWorkflows.filter((w) => w.isTemplate);

  const handleRun = (id: string) => {
    console.log("Run workflow:", id);
  };

  const handleDelete = (id: string) => {
    console.log("Delete workflow:", id);
  };

  const handleClone = (workflow: Workflow) => {
    console.log("Clone workflow:", workflow);
  };

  return (
    <div className="flex flex-col">
      <Header
        title="Workflows"
        description="Create and manage multi-agent workflows"
      />

      <div className="flex-1 p-6">
        <div className="mb-6 flex items-center justify-between">
          <Tabs defaultValue="workflows" className="w-auto">
            <TabsList>
              <TabsTrigger value="workflows">
                <GitBranch className="mr-2 h-4 w-4" />
                Workflows ({workflows.length})
              </TabsTrigger>
              <TabsTrigger value="templates">
                <BookTemplate className="mr-2 h-4 w-4" />
                Templates ({templates.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button asChild>
            <Link href="/workflows/new/edit">
              <Plus className="mr-2 h-4 w-4" />
              Create Workflow
            </Link>
          </Button>
        </div>

        <Tabs defaultValue="workflows">
          <TabsContent value="workflows" className="mt-0">
            {workflows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <GitBranch className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">No workflows yet</p>
                <Button asChild className="mt-4">
                  <Link href="/workflows/new/edit">
                    <Plus className="mr-2 h-4 w-4" />
                    Create your first workflow
                  </Link>
                </Button>
              </div>
            ) : (
              <WorkflowList
                workflows={workflows}
                onRun={handleRun}
                onDelete={handleDelete}
                onClone={handleClone}
              />
            )}
          </TabsContent>

          <TabsContent value="templates" className="mt-0">
            {templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <BookTemplate className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-muted-foreground">No templates available</p>
              </div>
            ) : (
              <WorkflowList
                workflows={templates}
                onClone={handleClone}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
