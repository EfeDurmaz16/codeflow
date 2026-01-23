import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { Workflow, WorkflowNode } from "@/types";

interface WorkflowsState {
  workflows: Workflow[];
  selectedWorkflowId: string | null;
  editingWorkflow: Workflow | null;
  isLoading: boolean;
  error: string | null;

  // DAG Editor state
  selectedNodeId: string | null;
  isDragging: boolean;

  // Actions
  setWorkflows: (workflows: Workflow[]) => void;
  addWorkflow: (workflow: Workflow) => void;
  updateWorkflow: (id: string, updates: Partial<Workflow>) => void;
  removeWorkflow: (id: string) => void;
  setSelectedWorkflow: (id: string | null) => void;
  setEditingWorkflow: (workflow: Workflow | null) => void;

  // DAG Editor actions
  addNode: (node: WorkflowNode) => void;
  updateNode: (nodeId: string, updates: Partial<WorkflowNode>) => void;
  removeNode: (nodeId: string) => void;
  connectNodes: (sourceId: string, targetId: string) => void;
  disconnectNodes: (sourceId: string, targetId: string) => void;
  setSelectedNode: (nodeId: string | null) => void;
  setIsDragging: (isDragging: boolean) => void;
  updateNodePosition: (
    nodeId: string,
    position: { x: number; y: number }
  ) => void;

  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useWorkflowsStore = create<WorkflowsState>()(
  subscribeWithSelector((set) => ({
    workflows: [],
    selectedWorkflowId: null,
    editingWorkflow: null,
    isLoading: false,
    error: null,
    selectedNodeId: null,
    isDragging: false,

    setWorkflows: (workflows) => set({ workflows }),

    addWorkflow: (workflow) =>
      set((state) => ({
        workflows: [...state.workflows, workflow],
      })),

    updateWorkflow: (id, updates) =>
      set((state) => ({
        workflows: state.workflows.map((wf) =>
          wf.id === id ? { ...wf, ...updates } : wf
        ),
        editingWorkflow:
          state.editingWorkflow?.id === id
            ? { ...state.editingWorkflow, ...updates }
            : state.editingWorkflow,
      })),

    removeWorkflow: (id) =>
      set((state) => ({
        workflows: state.workflows.filter((wf) => wf.id !== id),
        selectedWorkflowId:
          state.selectedWorkflowId === id ? null : state.selectedWorkflowId,
        editingWorkflow:
          state.editingWorkflow?.id === id ? null : state.editingWorkflow,
      })),

    setSelectedWorkflow: (id) => set({ selectedWorkflowId: id }),

    setEditingWorkflow: (workflow) => set({ editingWorkflow: workflow }),

    addNode: (node) =>
      set((state) => {
        if (!state.editingWorkflow) return state;
        return {
          editingWorkflow: {
            ...state.editingWorkflow,
            graph: [...state.editingWorkflow.graph, node],
          },
        };
      }),

    updateNode: (nodeId, updates) =>
      set((state) => {
        if (!state.editingWorkflow) return state;
        return {
          editingWorkflow: {
            ...state.editingWorkflow,
            graph: state.editingWorkflow.graph.map((node) =>
              node.id === nodeId ? { ...node, ...updates } : node
            ),
          },
        };
      }),

    removeNode: (nodeId) =>
      set((state) => {
        if (!state.editingWorkflow) return state;
        // Remove the node and any connections to/from it
        const updatedGraph = state.editingWorkflow.graph
          .filter((node) => node.id !== nodeId)
          .map((node) => ({
            ...node,
            connections: node.connections.filter((id) => id !== nodeId),
          }));
        return {
          editingWorkflow: {
            ...state.editingWorkflow,
            graph: updatedGraph,
          },
          selectedNodeId:
            state.selectedNodeId === nodeId ? null : state.selectedNodeId,
        };
      }),

    connectNodes: (sourceId, targetId) =>
      set((state) => {
        if (!state.editingWorkflow) return state;
        return {
          editingWorkflow: {
            ...state.editingWorkflow,
            graph: state.editingWorkflow.graph.map((node) =>
              node.id === sourceId
                ? {
                    ...node,
                    connections: [...new Set([...node.connections, targetId])],
                  }
                : node
            ),
          },
        };
      }),

    disconnectNodes: (sourceId, targetId) =>
      set((state) => {
        if (!state.editingWorkflow) return state;
        return {
          editingWorkflow: {
            ...state.editingWorkflow,
            graph: state.editingWorkflow.graph.map((node) =>
              node.id === sourceId
                ? {
                    ...node,
                    connections: node.connections.filter(
                      (id) => id !== targetId
                    ),
                  }
                : node
            ),
          },
        };
      }),

    setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId }),

    setIsDragging: (isDragging) => set({ isDragging }),

    updateNodePosition: (nodeId, position) =>
      set((state) => {
        if (!state.editingWorkflow) return state;
        return {
          editingWorkflow: {
            ...state.editingWorkflow,
            graph: state.editingWorkflow.graph.map((node) =>
              node.id === nodeId ? { ...node, position } : node
            ),
          },
        };
      }),

    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
  }))
);

// Selectors
export const selectWorkflowById = (id: string) => (state: WorkflowsState) =>
  state.workflows.find((wf) => wf.id === id);

export const selectTemplates = (state: WorkflowsState) =>
  state.workflows.filter((wf) => wf.isTemplate);

export const selectActiveWorkflows = (state: WorkflowsState) =>
  state.workflows.filter((wf) => wf.status === "active");

export const selectWorkflowsByCategory =
  (category: string) => (state: WorkflowsState) =>
    state.workflows.filter((wf) => wf.category === category);
