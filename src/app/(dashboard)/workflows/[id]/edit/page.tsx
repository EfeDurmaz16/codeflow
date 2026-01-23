"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { WorkflowEditor } from "@/components/workflows/workflow-editor";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import type { Workflow } from "@/types";

// Mock data
const mockWorkflows: Record<string, Workflow> = {
  "wf-1": {
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
  new: {
    id: "new",
    name: "New Workflow",
    description: "",
    status: "draft",
    graph: [
      {
        id: "start",
        type: "start",
        label: "Start",
        position: { x: 250, y: 50 },
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
    isTemplate: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

export default function WorkflowEditPage() {
  const params = useParams();
  const workflowId = params.id as string;

  const workflow = mockWorkflows[workflowId] || mockWorkflows["new"];

  const handleSave = (updatedWorkflow: Workflow) => {
    console.log("Save workflow:", updatedWorkflow);
  };

  const handleRun = () => {
    console.log("Run workflow:", workflow.id);
  };

  return (
    <div className="flex flex-col">
      <Header
        title={workflowId === "new" ? "Create Workflow" : "Edit Workflow"}
        description={workflow.name}
      />
      <div className="flex-1 p-6">
        <div className="mb-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/workflows">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Workflows
            </Link>
          </Button>
        </div>
        <WorkflowEditor
          workflow={workflow}
          onSave={handleSave}
          onRun={handleRun}
        />
      </div>
    </div>
  );
}
