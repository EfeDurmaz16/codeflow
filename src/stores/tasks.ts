import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { Task, TaskLog, TaskStatus, TaskPriority } from "@/types";

interface TasksState {
  tasks: Task[];
  selectedTaskId: string | null;
  logs: Record<string, TaskLog[]>;
  isLoading: boolean;
  error: string | null;

  // View state
  viewMode: "kanban" | "list";
  filters: {
    status?: TaskStatus[];
    priority?: TaskPriority[];
    assignedAgentId?: string;
  };

  // Actions
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  removeTask: (id: string) => void;
  setSelectedTask: (id: string | null) => void;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
  assignTask: (taskId: string, agentId: string, method: string) => void;
  addTaskLog: (taskId: string, log: TaskLog) => void;
  setViewMode: (mode: "kanban" | "list") => void;
  setFilters: (filters: TasksState["filters"]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useTasksStore = create<TasksState>()(
  subscribeWithSelector((set) => ({
    tasks: [],
    selectedTaskId: null,
    logs: {},
    isLoading: false,
    error: null,
    viewMode: "kanban",
    filters: {},

    setTasks: (tasks) => set({ tasks }),

    addTask: (task) =>
      set((state) => ({
        tasks: [...state.tasks, task],
      })),

    updateTask: (id, updates) =>
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === id ? { ...task, ...updates } : task
        ),
      })),

    removeTask: (id) =>
      set((state) => ({
        tasks: state.tasks.filter((task) => task.id !== id),
        selectedTaskId:
          state.selectedTaskId === id ? null : state.selectedTaskId,
      })),

    setSelectedTask: (id) => set({ selectedTaskId: id }),

    updateTaskStatus: (id, status) =>
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === id
            ? {
                ...task,
                status,
                startedAt:
                  status === "running" && !task.startedAt
                    ? new Date().toISOString()
                    : task.startedAt,
                completedAt:
                  status === "completed" || status === "failed"
                    ? new Date().toISOString()
                    : task.completedAt,
              }
            : task
        ),
      })),

    assignTask: (taskId, agentId, method) =>
      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                assignedAgentId: agentId,
                assignmentMethod: method,
                status: "assigned" as TaskStatus,
              }
            : task
        ),
      })),

    addTaskLog: (taskId, log) =>
      set((state) => {
        const currentLogs = state.logs[taskId] || [];
        const newLogs = [...currentLogs, log].slice(-1000);
        return {
          logs: {
            ...state.logs,
            [taskId]: newLogs,
          },
        };
      }),

    setViewMode: (viewMode) => set({ viewMode }),
    setFilters: (filters) => set({ filters }),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
  }))
);

// Selectors
export const selectTasksByStatus =
  (status: TaskStatus) => (state: TasksState) =>
    state.tasks.filter((t) => t.status === status);

export const selectTaskById = (id: string) => (state: TasksState) =>
  state.tasks.find((t) => t.id === id);

export const selectTasksByAgent = (agentId: string) => (state: TasksState) =>
  state.tasks.filter((t) => t.assignedAgentId === agentId);

export const selectFilteredTasks = (state: TasksState) => {
  let filtered = state.tasks;
  const { status, priority, assignedAgentId } = state.filters;

  if (status?.length) {
    filtered = filtered.filter((t) => status.includes(t.status));
  }
  if (priority?.length) {
    filtered = filtered.filter((t) => priority.includes(t.priority));
  }
  if (assignedAgentId) {
    filtered = filtered.filter((t) => t.assignedAgentId === assignedAgentId);
  }

  return filtered;
};
