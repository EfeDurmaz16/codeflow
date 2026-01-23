import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { Agent, AgentLog, AgentMetrics, AgentStatus } from "@/types";

interface AgentsState {
  agents: Agent[];
  selectedAgentId: string | null;
  logs: Record<string, AgentLog[]>;
  isLoading: boolean;
  error: string | null;

  // Actions
  setAgents: (agents: Agent[]) => void;
  addAgent: (agent: Agent) => void;
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  removeAgent: (id: string) => void;
  setSelectedAgent: (id: string | null) => void;
  updateAgentStatus: (id: string, status: AgentStatus) => void;
  updateAgentMetrics: (id: string, metrics: AgentMetrics) => void;
  addAgentLog: (agentId: string, log: AgentLog) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAgentsStore = create<AgentsState>()(
  subscribeWithSelector((set) => ({
    agents: [],
    selectedAgentId: null,
    logs: {},
    isLoading: false,
    error: null,

    setAgents: (agents) => set({ agents }),

    addAgent: (agent) =>
      set((state) => ({
        agents: [...state.agents, agent],
      })),

    updateAgent: (id, updates) =>
      set((state) => ({
        agents: state.agents.map((agent) =>
          agent.id === id ? { ...agent, ...updates } : agent
        ),
      })),

    removeAgent: (id) =>
      set((state) => ({
        agents: state.agents.filter((agent) => agent.id !== id),
        selectedAgentId:
          state.selectedAgentId === id ? null : state.selectedAgentId,
      })),

    setSelectedAgent: (id) => set({ selectedAgentId: id }),

    updateAgentStatus: (id, status) =>
      set((state) => ({
        agents: state.agents.map((agent) =>
          agent.id === id ? { ...agent, status } : agent
        ),
      })),

    updateAgentMetrics: (id, metrics) =>
      set((state) => ({
        agents: state.agents.map((agent) =>
          agent.id === id ? { ...agent, metrics } : agent
        ),
      })),

    addAgentLog: (agentId, log) =>
      set((state) => {
        const currentLogs = state.logs[agentId] || [];
        // Keep only last 1000 logs per agent
        const newLogs = [...currentLogs, log].slice(-1000);
        return {
          logs: {
            ...state.logs,
            [agentId]: newLogs,
          },
        };
      }),

    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
  }))
);

// Selectors
export const selectOnlineAgents = (state: AgentsState) =>
  state.agents.filter((a) => a.status === "online");

export const selectBusyAgents = (state: AgentsState) =>
  state.agents.filter((a) => a.status === "busy");

export const selectAgentById = (id: string) => (state: AgentsState) =>
  state.agents.find((a) => a.id === id);

export const selectAgentsByType =
  (type: Agent["type"]) => (state: AgentsState) =>
    state.agents.filter((a) => a.type === type);
