"use client";

import { useCallback, useState } from "react";
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  Panel,
  NodeTypes,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Save,
  Trash2,
  Square,
  GitBranch,
  Layers,
  Merge,
} from "lucide-react";
import type { Workflow, WorkflowNode, WorkflowNodeType } from "@/types";

interface WorkflowEditorProps {
  workflow: Workflow;
  onSave?: (workflow: Workflow) => void;
  onRun?: () => void;
}

// Custom node components
function StartNode({ data }: { data: { label: string } }) {
  return (
    <div className="rounded-full bg-green-500/20 border-2 border-green-500 px-4 py-2">
      <Handle type="source" position={Position.Bottom} />
      <span className="text-sm font-medium text-green-500">{data.label}</span>
    </div>
  );
}

function EndNode({ data }: { data: { label: string } }) {
  return (
    <div className="rounded-full bg-red-500/20 border-2 border-red-500 px-4 py-2">
      <Handle type="target" position={Position.Top} />
      <span className="text-sm font-medium text-red-500">{data.label}</span>
    </div>
  );
}

function TaskNode({
  data,
  selected,
}: {
  data: { label: string };
  selected: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border-2 bg-card px-4 py-3 min-w-[150px]",
        selected ? "border-primary" : "border-border"
      )}
    >
      <Handle type="target" position={Position.Top} />
      <div className="flex items-center gap-2">
        <Square className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">{data.label}</span>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

function ConditionNode({
  data,
  selected,
}: {
  data: { label: string };
  selected: boolean;
}) {
  return (
    <div
      className={cn(
        "rotate-45 rounded border-2 bg-card p-2",
        selected ? "border-primary" : "border-yellow-500"
      )}
    >
      <Handle type="target" position={Position.Top} className="-rotate-45" />
      <div className="-rotate-45 px-2 py-1">
        <span className="text-sm font-medium text-yellow-500">{data.label}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="-rotate-45" />
      <Handle type="source" position={Position.Right} id="false" className="-rotate-45" />
    </div>
  );
}

function ParallelNode({
  data,
  selected,
}: {
  data: { label: string };
  selected: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border-2 border-dashed bg-card px-4 py-3",
        selected ? "border-primary" : "border-purple-500"
      )}
    >
      <Handle type="target" position={Position.Top} />
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-purple-500" />
        <span className="text-sm font-medium">{data.label}</span>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

function JoinNode({
  data,
  selected,
}: {
  data: { label: string };
  selected: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border-2 bg-card px-4 py-3",
        selected ? "border-primary" : "border-blue-500"
      )}
    >
      <Handle type="target" position={Position.Top} />
      <div className="flex items-center gap-2">
        <Merge className="h-4 w-4 text-blue-500" />
        <span className="text-sm font-medium">{data.label}</span>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  start: StartNode,
  end: EndNode,
  task: TaskNode,
  condition: ConditionNode,
  parallel: ParallelNode,
  join: JoinNode,
};

// Convert workflow graph to ReactFlow format
function workflowToReactFlow(workflow: Workflow): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = workflow.graph.map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: { label: node.label },
  }));

  const edges: Edge[] = [];
  workflow.graph.forEach((node) => {
    node.connections.forEach((targetId) => {
      edges.push({
        id: `${node.id}-${targetId}`,
        source: node.id,
        target: targetId,
        type: "smoothstep",
        style: { stroke: "#404040" },
      });
    });
  });

  return { nodes, edges };
}

export function WorkflowEditor({ workflow, onSave, onRun }: WorkflowEditorProps) {
  const { nodes: initialNodes, edges: initialEdges } = workflowToReactFlow(workflow);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [workflowName, setWorkflowName] = useState(workflow.name);

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) =>
        addEdge(
          { ...connection, type: "smoothstep", style: { stroke: "#404040" } },
          eds
        )
      ),
    [setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const addNode = (type: WorkflowNodeType) => {
    const newNode: Node = {
      id: `node-${Date.now()}`,
      type,
      position: { x: 250, y: 250 },
      data: {
        label:
          type === "start"
            ? "Start"
            : type === "end"
            ? "End"
            : type === "task"
            ? "New Task"
            : type === "condition"
            ? "Condition"
            : type === "parallel"
            ? "Parallel"
            : "Join",
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const deleteSelectedNode = () => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) =>
      eds.filter(
        (e) => e.source !== selectedNode.id && e.target !== selectedNode.id
      )
    );
    setSelectedNode(null);
  };

  const handleSave = () => {
    // Convert back to workflow format
    const graph: WorkflowNode[] = nodes.map((node) => {
      const outgoingEdges = edges.filter((e) => e.source === node.id);
      return {
        id: node.id,
        type: node.type as WorkflowNodeType,
        label: node.data.label,
        position: node.position,
        connections: outgoingEdges.map((e) => e.target),
      };
    });

    onSave?.({
      ...workflow,
      name: workflowName,
      graph,
    });
  };

  return (
    <div className="flex h-[calc(100vh-200px)] gap-4">
      {/* Canvas */}
      <div className="flex-1 rounded-lg border bg-[#0A0A0A]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="#262626"
          />
          <Controls className="!bg-card !border-border" />

          <Panel position="top-left" className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => addNode("task")}>
              <Square className="mr-2 h-3 w-3" />
              Task
            </Button>
            <Button size="sm" variant="outline" onClick={() => addNode("condition")}>
              <GitBranch className="mr-2 h-3 w-3" />
              Condition
            </Button>
            <Button size="sm" variant="outline" onClick={() => addNode("parallel")}>
              <Layers className="mr-2 h-3 w-3" />
              Parallel
            </Button>
            <Button size="sm" variant="outline" onClick={() => addNode("join")}>
              <Merge className="mr-2 h-3 w-3" />
              Join
            </Button>
          </Panel>

          <Panel position="top-right" className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleSave}>
              <Save className="mr-2 h-3 w-3" />
              Save
            </Button>
            <Button size="sm" onClick={onRun}>
              <Play className="mr-2 h-3 w-3" />
              Run
            </Button>
          </Panel>
        </ReactFlow>
      </div>

      {/* Properties Panel */}
      <Card className="w-80 shrink-0">
        <CardHeader>
          <CardTitle className="text-sm">Properties</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Workflow Name</Label>
            <Input
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
            />
          </div>

          {selectedNode ? (
            <>
              <div className="space-y-2">
                <Label>Node Type</Label>
                <Badge variant="secondary">{selectedNode.type}</Badge>
              </div>

              <div className="space-y-2">
                <Label>Label</Label>
                <Input
                  value={selectedNode.data.label}
                  onChange={(e) => {
                    setNodes((nds) =>
                      nds.map((n) =>
                        n.id === selectedNode.id
                          ? { ...n, data: { ...n.data, label: e.target.value } }
                          : n
                      )
                    );
                    setSelectedNode({
                      ...selectedNode,
                      data: { ...selectedNode.data, label: e.target.value },
                    });
                  }}
                />
              </div>

              {selectedNode.type !== "start" && selectedNode.type !== "end" && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={deleteSelectedNode}
                  className="w-full"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Node
                </Button>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a node to edit its properties
            </p>
          )}

          <div className="border-t pt-4">
            <h4 className="mb-2 text-sm font-medium">Workflow Info</h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>{nodes.length} nodes</p>
              <p>{edges.length} connections</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
