import { z } from "zod";
import { router, publicProcedure } from "../trpc";

// Validation schemas
const AgentTypeSchema = z.enum([
  "cursor",
  "windsurf",
  "claude_code",
  "codex",
  "gemini",
  "aider",
  "custom",
]);

const AgentStatusSchema = z.enum(["online", "offline", "busy", "error"]);

const CreateAgentSchema = z.object({
  name: z.string().min(1).max(100),
  type: AgentTypeSchema,
  endpoint: z.string().url(),
  apiKey: z.string().optional(),
  capabilities: z.array(z.string()).default([]),
});

const UpdateAgentSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  type: AgentTypeSchema.optional(),
  status: AgentStatusSchema.optional(),
  endpoint: z.string().url().optional(),
  apiKey: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
});

const UpdateMetricsSchema = z.object({
  id: z.string(),
  cpuUsage: z.number().min(0).max(100).optional(),
  memoryUsage: z.number().min(0).max(100).optional(),
  tokensUsed: z.number().int().min(0).optional(),
  totalCost: z.number().min(0).optional(),
  latencyMs: z.number().int().min(0).optional(),
});

export const agentsRouter = router({
  // List all agents
  list: publicProcedure
    .input(
      z
        .object({
          status: AgentStatusSchema.optional(),
          type: AgentTypeSchema.optional(),
          limit: z.number().int().min(1).max(100).default(50),
          offset: z.number().int().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const { status, type, limit = 50, offset = 0 } = input || {};

      const where = {
        ...(status && { status }),
        ...(type && { type }),
      };

      const [agents, total] = await Promise.all([
        ctx.prisma.agent.findMany({
          where,
          take: limit,
          skip: offset,
          orderBy: { createdAt: "desc" },
          include: {
            currentTask: {
              select: { id: true, title: true, status: true },
            },
          },
        }),
        ctx.prisma.agent.count({ where }),
      ]);

      return { agents, total };
    }),

  // Get single agent by ID
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const agent = await ctx.prisma.agent.findUnique({
        where: { id: input.id },
        include: {
          currentTask: true,
          assignedTasks: {
            take: 10,
            orderBy: { createdAt: "desc" },
          },
          logs: {
            take: 100,
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!agent) {
        throw new Error("Agent not found");
      }

      return agent;
    }),

  // Create new agent
  create: publicProcedure
    .input(CreateAgentSchema)
    .mutation(async ({ ctx, input }) => {
      const agent = await ctx.prisma.agent.create({
        data: {
          name: input.name,
          type: input.type,
          endpoint: input.endpoint,
          apiKey: input.apiKey,
          capabilities: input.capabilities,
          status: "offline",
        },
      });

      return agent;
    }),

  // Update agent
  update: publicProcedure
    .input(UpdateAgentSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const agent = await ctx.prisma.agent.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });

      return agent;
    }),

  // Delete agent
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.agent.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Ping agent (check health)
  ping: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const agent = await ctx.prisma.agent.findUnique({
        where: { id: input.id },
      });

      if (!agent) {
        throw new Error("Agent not found");
      }

      // In production, this would actually ping the agent endpoint
      // For now, we'll simulate a ping response
      const startTime = Date.now();

      try {
        // Simulated ping - in real implementation, call agent.endpoint
        const latency = Date.now() - startTime;

        await ctx.prisma.agent.update({
          where: { id: input.id },
          data: {
            status: "online",
            latencyMs: latency,
            lastPingAt: new Date(),
          },
        });

        return { status: "online", latency };
      } catch {
        await ctx.prisma.agent.update({
          where: { id: input.id },
          data: {
            status: "error",
            lastPingAt: new Date(),
          },
        });

        return { status: "error", latency: 0 };
      }
    }),

  // Update agent metrics
  updateMetrics: publicProcedure
    .input(UpdateMetricsSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...metrics } = input;

      const agent = await ctx.prisma.agent.update({
        where: { id },
        data: metrics,
      });

      return agent;
    }),

  // Get agent logs
  getLogs: publicProcedure
    .input(
      z.object({
        agentId: z.string(),
        level: z.enum(["info", "warn", "error", "debug"]).optional(),
        limit: z.number().int().min(1).max(500).default(100),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const { agentId, level, limit, offset } = input;

      const where = {
        agentId,
        ...(level && { level }),
      };

      const [logs, total] = await Promise.all([
        ctx.prisma.agentLog.findMany({
          where,
          take: limit,
          skip: offset,
          orderBy: { createdAt: "desc" },
        }),
        ctx.prisma.agentLog.count({ where }),
      ]);

      return { logs, total };
    }),

  // Add agent log
  addLog: publicProcedure
    .input(
      z.object({
        agentId: z.string(),
        level: z.enum(["info", "warn", "error", "debug"]),
        message: z.string(),
        metadata: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const log = await ctx.prisma.agentLog.create({
        data: {
          agentId: input.agentId,
          level: input.level,
          message: input.message,
          metadata: input.metadata ?? undefined,
        },
      });

      return log;
    }),
});
